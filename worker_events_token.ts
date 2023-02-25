import {argv} from "process";
import {config} from "./config";
import {tools} from "./tools";
import {assert} from "./assert";
import {connection} from "./connection";
import {eth_receipt_logs} from "./build/eth_receipt_logs";
import {TIME_FORMATS, time_helper} from "./time_helper";
import {eth_worker} from "./eth_worker";
import {web3_abi_decoder} from "./web3_abi_decoder";
import {web3_log_decoder} from "./web3_log_decoder";
import {eth_contract_events} from "./build/eth_contract_events";
import { eth_config } from "./eth_config";
import {user} from "./build/user";
import {eth_price_track_details_tools} from "./eth_price_track_details_tools";
import {eth_contract_data_tools} from "./eth_contract_data_tools";

export class worker_events_token{
    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`worker_events_token|${method}|${msg}`);
            if(end) console.log(`worker_events_token|${method}|${tools.LINE}`);
        }
    }

    private static getBatch():number{
        return 250;
    }

    private static last_id:number = 0;
    private static last_hash:string = "";
    private static last_logIndex:number=0;
    public static async run(){
        const method = "run";
        await connection.startTransaction();
        try{
            const unprocessedTokenEvents = new eth_receipt_logs();
            await unprocessedTokenEvents.list(
                " WHERE id>:last_id AND time_processed_price>:zero AND has_token=:y AND  time_processed_events IS NULL ",
                {last_id:this.last_id,zero:0,y:"y"},
                ` ORDER BY blockNumber ASC, logIndex ASC LIMIT ${this.getBatch()} `);
            const total = unprocessedTokenEvents.count();
            let count = 0;

            for(const log of unprocessedTokenEvents._dataList as eth_receipt_logs[]){
                const transactionHash = assert.stringNotEmpty(log.transactionHash,"log.transactionHash");
                this.last_hash = transactionHash;
                const logIndex = assert.positiveInt(log.logIndex,"log.logIndex");
                this.last_logIndex = logIndex;
                count++;
                const logFormat = `${count}/${total}|${time_helper.getAsFormat(assert.positiveInt(log.blockTime,"log.blockTime"),TIME_FORMATS.ISO)}|`;
                this.log(`${logFormat} ${this.last_hash} ${this.last_logIndex}`,method,false,true);

                // check if already on event
                const checkEvent = new eth_contract_events();
                await checkEvent.list(" WHERE txn_hash=:hash AND logIndex=:logIndex ",{hash:transactionHash,logIndex:logIndex});
                if(checkEvent.count() > 0){
                    this.log(`${logFormat}---- already on db, updating log`,method,false,true);
                    log.time_processed_events = tools.getCurrentTimeStamp();
                    await log.save();
                }

                // get txn and decode
                const transaction = await eth_worker.getDbTxnByHash(transactionHash);
                const decodedTransaction = await web3_abi_decoder.decodeAbiObject(transaction.input);
                const txnMethod = decodedTransaction ? decodedTransaction.abi.name : "unknown";
                const transferTransaction = await web3_abi_decoder.getTransferAbi(decodedTransaction);
                // decode log
                const web3Log = eth_worker.convertDbLogToWeb3Log(log);
                const decodedLog = await web3_log_decoder.decodeLog(web3Log);
                const logMethod = decodedLog.method_name;
                const transferLog = await web3_log_decoder.getTransferLog(web3Log);
                const tokenContractInfo = await eth_contract_data_tools.getContractDynamicStrict(eth_config.getTokenContract());

                const newEvent = new eth_contract_events();
                newEvent.txn_hash = transactionHash;
                newEvent.blockNumber = log.blockNumber;
                newEvent.block_time = log.blockTime;
                newEvent.logIndex = log.logIndex;
                newEvent.method = txnMethod;
                newEvent.log_method = logMethod;

                if(transferLog){
                    this.log(`${logFormat}---- transfer detected, setting values`,method,false,true);
                    newEvent.fromContract = tokenContractInfo.address;
                    newEvent.fromSymbol = tokenContractInfo.symbol;
                    newEvent.fromDecimal = assert.naturalNumber(tokenContractInfo.decimals,`tokenContractInfo.decimals`);
                    newEvent.toContract = tokenContractInfo.address;
                    newEvent.toSymbol = tokenContractInfo.symbol;
                    newEvent.toDecimal = assert.naturalNumber(tokenContractInfo.decimals,`tokenContractInfo.decimals`);

                    newEvent.fromAddress = transferLog.from;
                    newEvent.toAddress = transferLog.to;
                    newEvent.fromAmountGross = eth_worker.convertValueToAmount(transferLog.value.toString(),transferLog.ContractInfo.decimals);
                    newEvent.fromAmount = newEvent.fromAmountGross;
                    newEvent.toAmountGross = newEvent.fromAmountGross;
                    newEvent.toAmount = newEvent.fromAmountGross;
                    if(transferTransaction){
                        this.log(`${logFormat}---- transfer transaction detected, checking if the same sender or receiver`,method,false,true);
                        if(
                            transferTransaction.recipient.toLowerCase() === newEvent.fromAddress.toLowerCase()
                            || transferTransaction.recipient.toLowerCase() === newEvent.toAddress.toLowerCase()
                        ){
                            newEvent.fromAmountGross = eth_worker.convertValueToAmount(transferTransaction.amount.toString(),transferLog.ContractInfo.decimals);
                            this.log(`${logFormat}---- setting from amount gross value based on transaction method amount ${newEvent.fromAmountGross}`,method,false,true);
                        }
                    }

                    // Check from User and To User
                    let fromUsername = "";
                    const fromMember = new user();
                    fromMember.walletAddress = newEvent.fromAddress;
                    await fromMember.fetch();
                    if(fromMember.recordExists()){
                        fromUsername = fromMember.username;
                    }
                    this.log(`${logFormat}---- FROM AMOUNT GROSS ${newEvent.fromAmountGross} NET ${newEvent.fromAmount} ${fromUsername}`,method,false,true);
                    
                    // Check from User and To User
                    let toUsername = "";
                    const toMember = new user();
                    toMember.walletAddress = newEvent.toAddress;
                    await toMember.fetch();
                    if(toMember.recordExists()){
                        toUsername = toMember.username;
                    }
                    this.log(`${logFormat}---- TO AMOUNT GROSS ${newEvent.toAmountGross} NET ${newEvent.toAmount} ${toUsername}`,method,false,true);
                    
                    // TAX
                    if(tools.greaterThan(newEvent.fromAmount,newEvent.fromAmountGross)) throw new Error(`unexpected fromAmount(${newEvent.fromAmount}) > fromAmountGross(${newEvent.fromAmountGross})`);
                    if(tools.greaterThan(newEvent.toAmount,newEvent.toAmountGross)) throw new Error(`unexpected toAmount(${newEvent.toAmount}) > toAmountGross(${newEvent.toAmountGross})`);
                    if(tools.greaterThan(newEvent.toAmount,newEvent.fromAmount)) throw new Error(`unexpected toAmount(${newEvent.toAmount}) > fromAmount(${newEvent.fromAmount})`);
                    newEvent.tax_amount = tools.deduct(newEvent.fromAmountGross,newEvent.toAmount,tokenContractInfo.decimals,`fromAmountGross(${newEvent.fromAmountGross}) - toAmount(${newEvent.toAmount}) = tax_amount`);
                    newEvent.tax_percentage = 0;
                    if(tools.greaterThan(newEvent.tax_amount,"0")){
                        const tax_perc = tools.divide(newEvent.tax_amount,newEvent.fromAmountGross,tokenContractInfo.decimals);
                        newEvent.tax_percentage = tools.getNumber(tax_perc,4);
                    }
                    if(newEvent.tax_percentage && newEvent.tax_percentage >= 0.4) throw new Error(`unexpected tax >= 0.4`);
                    this.log(`${logFormat}---- TAX AMOUNT ${newEvent.tax_amount} ${newEvent.tax_percentage}%`,method,false,true);

                    // PRICES
                    newEvent.token_bnb = await eth_price_track_details_tools.getBnbTokenPrice(log,tokenContractInfo);
                    newEvent.token_bnb_value = await eth_price_track_details_tools.getBnbTokenValue(log,tokenContractInfo,newEvent.fromAmountGross);
                    newEvent.bnb_usd = await eth_price_track_details_tools.getBnbUsdPrice(log);
                    newEvent.token_usd = await eth_price_track_details_tools.getBnbUsdValue(log,newEvent.token_bnb);
                    newEvent.token_usd_value = tools.toBn(newEvent.token_usd).multipliedBy(tools.toBn(newEvent.fromAmountGross)).toFixed(eth_config.getBusdDecimal());
                    this.log(`${logFormat}---- BNB USD ${newEvent.bnb_usd}`,method,false,true);
                    this.log(`${logFormat}---- BNB PRICE ${newEvent.token_bnb} VALUE ${newEvent.token_bnb_value}`,method,false,true);
                    this.log(`${logFormat}---- USD PRICE ${newEvent.token_usd} VALUE ${newEvent.token_usd_value}`,method,false,true);

                    await newEvent.save();
                    this.log(`${logFormat}---- saved with id ${newEvent.id}`,method,false,true);
                }
                else{
                    this.log(`${logFormat}---- not a transfer, saving data to be processed in the future`,method,false,true);
                    newEvent.fromAddress = transaction.fromAddress;
                }
                this.log(`${logFormat}---- txn method ${txnMethod} logMethod ${logMethod}`,method,false,true);
                log.time_processed_events = time_helper.getCurrentTimeStamp();
                await log.save();
                this.log(`${logFormat}---- db log updated`,method,false,true);
                this.last_id = assert.positiveInt(log.id,"log.id for last_id");
            }

            // process
            await connection.commit();
            await tools.sleep(50);
            setImmediate(()=>{
                worker_events_token.run();
            });
        }catch (e){
            await connection.rollback();
            this.log(`ERROR on hash ${this.last_hash} ${this.last_logIndex}`,method,false,true);
            console.log(e);
            this.log(`worker stopped`,method,true,true);
        }
    }
}

class worker_events_token_error extends Error{
    constructor(message:string) {
        super(message);
    }
}

if(argv.includes("run_worker_events_token")){
    console.log(`running worker to track token events`);
    worker_events_token.run().finally();
}
