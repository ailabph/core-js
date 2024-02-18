import {argv} from "process";
import {config} from "./config";
import {tools} from "./tools";
import {eth_receipt_logs} from "./build/eth_receipt_logs";
import {TIME_FORMATS, time_helper} from "./time_helper";
import {assert} from "./assert";
import {SwapLog, web3_log_decoder} from "./web3_log_decoder";
import {eth_worker} from "./eth_worker";
import {user} from "./build/user";
import {eth_contract_events} from "./build/eth_contract_events";
import {eth_receipt_logs_tools, SwapTradeInfo} from "./eth_receipt_logs_tools";
import {eth_config} from "./eth_config";
import {web3_pair_price_tools} from "./web3_pair_price_tools";
import {PAIR_INFO, TRADE_TYPE} from "./eth_worker_trade";
import {eth_price_track_details_tools} from "./eth_price_track_details_tools";
import {eth_price_track_header_tools} from "./eth_price_track_header_tools";
import {web3_abi_decoder} from "./web3_abi_decoder";
import {connection} from "./connection";
import {worker_events_trade_tools} from "./worker_events_trade_tools";
import {generic_data} from "./build/generic_data";
import {eth_transaction} from "./build/eth_transaction";
import {eth_transaction_tools} from "./eth_transaction_tools";


//region TYPES
type SWAP_SUMMARY={
    type:TRADE_TYPE
    txn_caller:string,
    from:SwapTradeInfo,
    to:SwapTradeInfo,
    tax_amount:string,
    tax_percentage:number,
    bnb_usd:string,
    bnb_price:string,
    usd_price:string,
    bnb_value:string,
    usd_value:string,
}
export {SWAP_SUMMARY};
//endregion TYPES

export class worker_events_trade{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`worker_events_trade|${method}|${msg}`);
            if(end) console.log(`worker_events_trade|${method}|${tools.LINE}`);
        }
    }

    //region SETTINGS
    private static currentTransactionHash:string = "";
    private static currentBlockNumber:number = 0;
    private static currentLogIndex:number = 0;
    private static currentDbLogId:number = 0;
    private static lastProcessedTransactionHash:string = "";
    private static lastProcessedBlockNumber:number = 0;
    private static lastProcessedLogIndex:number = 0;
    private static lastProcessedDbLogId:number = 0;

    private static resetPointers(){
        this.lastProcessedTransactionHash = "";
        this.lastProcessedBlockNumber = 0;
        this.lastProcessedLogIndex = 0;
        this.lastProcessedDbLogId = 0;
    }
    private static retryDelayMultiplier:number = 0;
    private static getStartingDelayInSeconds():number{
        let delay = 10;
        const delayOverride = config.getCustomOption("worker_events_trade_retry_delay",false);
        if(typeof delayOverride === "number") {
            delay = assert.positiveInt(delayOverride, `getStartingDelayInSeconds|delayOverride`);
        }
        return delay;
    }
    private static getBatch():number{
        let batch = 10;
        const batchOverride = config.getCustomOption("worker_events_trade_batch",false);
        if(typeof batchOverride === "number"){
            batch = assert.positiveInt(batchOverride,"getBatch|batchOverride");
        }
        return batch;
    }
    //endregion SETTINGS
    public static async run(){
        const method = "run";
        await connection.startTransaction();
        try{
            const dexLogs = new eth_receipt_logs();
            await dexLogs.list(
                " WHERE blockNumber>=:blockNumber AND time_processed_price>:zero AND has_token_dex=:y AND time_processed_events IS NULL ",
                {blockNumber:this.lastProcessedBlockNumber,zero:0,y:"y"},
                ` ORDER BY blockNumber ASC, logIndex ASC LIMIT ${this.getBatch()} `);
            if(dexLogs.count() > 0){
                this.log(`${dexLogs.count()} dex logs to process`,method,false,true);
            }
            const dexLogsCount = dexLogs.count();
            let count = 0;
            for(const log of dexLogs._dataList as eth_receipt_logs[]){

                this.currentTransactionHash = assert.stringNotEmpty(log.transactionHash,`${method} log.transactionHash to this.lastTransactionHash`);
                this.currentLogIndex = assert.naturalNumber(log.logIndex,`${method}|log.logIndex to this.lastLogIndex`);
                this.currentDbLogId = assert.positiveInt(log.id,`${method}|log.id to this.lastDbLogId`);
                this.currentBlockNumber = assert.positiveInt(log.blockNumber,`${method}|log.blockNumber to this.lastBlockNumber`);

                count++;
                const timeLog = time_helper.getAsFormat(assert.positiveNumber(log.blockTime),TIME_FORMATS.ISO);
                const web3Log = eth_worker.convertDbLogToWeb3Log(log);
                const swapLog = await web3_log_decoder.getSwapLog(web3Log);
                if(swapLog){
                    const pairInfo = await web3_pair_price_tools.getPairInfo(swapLog.ContractInfo.address);
                    this.log(`${count}/${dexLogsCount}|${timeLog}| ${log.transactionHash}`,method,false,true);
                    this.log(`${count}/${dexLogsCount}|${timeLog}|---- sender: ${swapLog.sender} | to: ${swapLog.to}`,method,false,true);
                    const member = new user();
                    member.walletAddress = swapLog.to;
                    await member.fetch();
                    if(member.recordExists()){
                        this.log(`${count}/${dexLogsCount}|${timeLog}|---- to member ${member.username}`,method,false,true);
                    }
                    // const checkEvent = new eth_contract_events();
                    // checkEvent.txn_hash = log.transactionHash;
                    // await checkEvent.fetch();
                    // if(checkEvent.recordExists()){
                    //     this.log(`${count}/${dexLogsCount}|${timeLog}|---- on db events as ${checkEvent.type} from ${checkEvent.fromAmount}${checkEvent.fromSymbol} to ${checkEvent.toAmountGross}${checkEvent.toSymbol}`,method,false,true);
                    // }
                    // else{
                    //     this.log(`${count}/${dexLogsCount}|${timeLog}|---- not on db`,method,false,true);
                    // }
                    const swapSummary = await this.getSwapSummary(log,eth_config.getTokenContract(),swapLog,pairInfo);
                    this.log(`${count}/${dexLogsCount}|${timeLog}|---- TRADE TYPE:${swapSummary.type.toUpperCase()}`,method,false,true);
                    this.log(`${count}/${dexLogsCount}|${timeLog}|---- FROM: gross ${swapSummary.from.swapAmount} net ${swapSummary.from.transferAmount} ${swapSummary.from.contractInfo.symbol}`,method,false,true);
                    this.log(`${count}/${dexLogsCount}|${timeLog}|---- TO: gross ${swapSummary.to.swapAmount} net ${swapSummary.to.transferAmount} ${swapSummary.to.contractInfo.symbol}`,method,false,true);
                    this.log(`${count}/${dexLogsCount}|${timeLog}|---- TAX: ${swapSummary.tax_amount} ${swapSummary.tax_percentage}%`,method,false,true);
                    this.log(`${count}/${dexLogsCount}|${timeLog}|---- BNB PRICE: ${swapSummary.bnb_price} VALUE ${swapSummary.bnb_value}`,method,false,true);
                    this.log(`${count}/${dexLogsCount}|${timeLog}|---- USD PRICE: ${swapSummary.usd_price} VALUE ${swapSummary.usd_value}`,method,false,true);
                    this.log(`${count}/${dexLogsCount}|${timeLog}|---- BNB_USD: ${swapSummary.bnb_usd}`,method,false,true);

                    const transaction = await eth_worker.getDbTxnByHash(assert.stringNotEmpty(log.transactionHash));
                    const decoded_abi = await web3_abi_decoder.decodeAbiObject(transaction.input);
                    let txn_method = "unknown";
                    if(decoded_abi){
                        txn_method = decoded_abi.abi.name;
                        this.log(`${count}/${dexLogsCount}|${timeLog}|---- TXN METHOD:${txn_method}`,method,false,true);
                    }

                    const check = new eth_contract_events();
                    await check.list(" WHERE txn_hash=:hash AND logIndex=:logIndex ",{hash:log.transactionHash,logIndex:log.logIndex});
                    if(check.count() > 0){
                        this.log(`${count}/${dexLogsCount}|${timeLog}|---- already on db, skipping...`,method,false,true);
                        continue;
                    }

                    const newEvent = new eth_contract_events();
                    newEvent.txn_hash = assert.stringNotEmpty(log.transactionHash,"log.transactionHash");
                    newEvent.blockNumber = assert.positiveNumber(log.blockNumber,"log.blockNumber");
                    newEvent.logIndex = assert.positiveNumber(log.logIndex,"log.logIndex");
                    newEvent.pair_contract = assert.stringNotEmpty(log.address,"log.address");
                    newEvent.block_time = assert.positiveInt(log.blockTime,"log.blockTime");
                    newEvent.type = swapSummary.type;
                    newEvent.tag = "trade";
                    newEvent.method = txn_method;
                    newEvent.log_method = swapLog.method_name;
                    newEvent.fromAddress = swapLog.sender;
                    newEvent.fromContract = swapSummary.from.contractInfo.address;
                    newEvent.fromSymbol = swapSummary.from.contractInfo.symbol;
                    newEvent.fromDecimal = assert.naturalNumber(swapSummary.from.contractInfo.decimals,`${method}|swapSummary.from.contractInfo.decimals`);
                    newEvent.fromAmountGross = swapSummary.from.swapAmount;
                    newEvent.fromAmount = swapSummary.from.transferAmount;
                    newEvent.toAddress = swapLog.to;
                    newEvent.toContract = swapSummary.to.contractInfo.address;
                    newEvent.toSymbol = swapSummary.to.contractInfo.symbol;
                    newEvent.toDecimal = assert.naturalNumber( swapSummary.to.contractInfo.decimals,`${method}|swapSummary.to.contractInfo.decimals`);
                    newEvent.toAmountGross = swapSummary.to.swapAmount;
                    newEvent.toAmount = swapSummary.to.transferAmount;
                    newEvent.tax_amount = swapSummary.tax_amount;
                    newEvent.tax_percentage = assert.isNumeric<number>(swapSummary.tax_percentage,"swapSummary.tax_percentage");
                    newEvent.bnb_usd = swapSummary.bnb_usd;
                    newEvent.token_bnb = swapSummary.bnb_price;
                    newEvent.token_bnb_value = swapSummary.bnb_value;
                    newEvent.token_usd = swapSummary.usd_price;
                    newEvent.token_usd_value = swapSummary.usd_value;
                    this.log(`${count}/${dexLogsCount}|${timeLog}|---- added on db`,method,false,true);
                    await newEvent.save();
                }
                log.time_processed_events = tools.getCurrentTimeStamp();
                await log.save();
                this.log('',method,true,false);
            }
            await connection.commit();
            this.lastProcessedTransactionHash = this.currentTransactionHash;
            this.lastProcessedBlockNumber = this.currentBlockNumber;
            this.lastProcessedLogIndex = this.currentLogIndex;
            this.lastProcessedDbLogId = this.currentDbLogId;
            this.retryDelayMultiplier = 0;
            await tools.sleep(50);
            setImmediate(()=>{
                worker_events_trade.run().finally();
            });
        }catch (e){
            await connection.rollback();
            this.log(`ERROR`,method,false,true);
            this.log(`current hash ${this.currentTransactionHash} logIndex ${this.currentLogIndex}`,method,false,true);
            if(e instanceof Error) this.log(e.message,method,false,true);
            else console.log(e);

            this.retryDelayMultiplier++;
            if(this.retryDelayMultiplier < 5){
                const retryInSeconds = this.getStartingDelayInSeconds() * this.retryDelayMultiplier;
                this.log(`retrying in ${retryInSeconds} seconds...`,method,true,true);
                setTimeout(()=>{
                    this.resetPointers();
                    worker_events_trade.run();
                },retryInSeconds * 1000);
            }
            else{
                this.log(`max retry reached, setting this log for retry later`,method,false,true);
                // retrieve the log record
                const log = new eth_receipt_logs();
                log.transactionHash = this.currentTransactionHash;
                log.logIndex = this.currentLogIndex;
                await log.fetch();
                if(log.isNew()) throw new Error(`log not found on db with hash ${this.currentTransactionHash} logIndex ${this.currentLogIndex}`);

                if(typeof log.time_processed_events === "number" && log.time_processed_events > 0){
                    throw new Error(`log already processed with hash ${this.currentTransactionHash} logIndex ${this.currentLogIndex}`);
                }

                // set time_processed_events to current time
                log.time_processed_events = tools.getCurrentTimeStamp();
                await log.save();
                this.log(`-- saved eth_receive_log(${log.id})`,method,false,true);

                // create a new record on generic_data
                const retry = new generic_data();
                retry.tag = "retry_worker_events_trade_"+log.id;
                retry.value = log.transactionHash;
                retry.time_updated  = tools.getCurrentTimeStamp();
                await retry.save();
                this.log(`-- saved retry record in generic_data(${retry.id})`,method,true,true);

                this.lastProcessedTransactionHash = this.currentTransactionHash;
                this.lastProcessedBlockNumber = this.currentBlockNumber;
                this.lastProcessedLogIndex = this.currentLogIndex;
                this.lastProcessedDbLogId = this.currentDbLogId;
                this.retryDelayMultiplier = 0;

                await tools.sleep(50);
                setImmediate(()=>{
                    worker_events_trade.run().finally();
                });
            }
        }
    }

    public static async getSwapSummary(db_log:eth_receipt_logs,target_token:string,swapLog?:SwapLog,pairInfo?:PAIR_INFO):Promise<SWAP_SUMMARY>{
        const method = "getSwapSummary";
        assert.recordExist(db_log,`${method} db_log`);
        target_token = assert.stringNotEmpty(target_token,`${method} target_token`);
        if(!swapLog) swapLog = await web3_log_decoder.getSwapLog(eth_worker.convertDbLogToWeb3Log(db_log)) as SwapLog;
        if(!pairInfo) pairInfo = await web3_pair_price_tools.getPairInfo(swapLog.ContractInfo.address);
        const tokenInfo = await eth_receipt_logs_tools.getContractInfoFromPair(pairInfo,target_token);
        const otherTokenInfo = await eth_receipt_logs_tools.getOppositeContractPairOf(pairInfo,target_token);
        const type = await eth_receipt_logs_tools.getTradeTypeOfSwap(swapLog,target_token);
        assert.stringNotEmpty(db_log.transactionHash,`${method} db_log.transactionHash`);
        const txn_source = await eth_transaction_tools.get(db_log.transactionHash??"");
        const swapSummary:SWAP_SUMMARY = {
            bnb_usd: "0",
            bnb_price: "0", bnb_value: "0", usd_price: "0", usd_value: "0",
            from: eth_receipt_logs_tools.getDefaultSwapTradeInfo(),
            to: eth_receipt_logs_tools.getDefaultSwapTradeInfo(),
            type: type,
            tax_amount:"0",
            tax_percentage:0,
            txn_caller: txn_source.fromAddress??''
        };
        if(type === TRADE_TYPE.BUY){
            swapSummary.from = otherTokenInfo;
            swapSummary.to = tokenInfo;
        }
        else if(type === TRADE_TYPE.SELL){
            swapSummary.from = tokenInfo;
            swapSummary.to = otherTokenInfo;
        }
        else{
            throw new worker_events_trade_error(`trade type not yet set for log ${db_log.transactionHash} ${db_log.logIndex}`);
        }
        swapSummary.from.transferAmount = await eth_receipt_logs_tools.getTotalTransferOfSwap(db_log,swapSummary.from.contractInfo.address);
        swapSummary.from.swapAmount = await eth_receipt_logs_tools.getTotalSwapInOf(swapLog,swapSummary.from.contractInfo.address);
        if(tools.toBn(swapSummary.from.transferAmount).comparedTo(tools.toBn("0")) === 0){
            swapSummary.from.transferAmount = swapSummary.from.swapAmount;
        }
        swapSummary.to.transferAmount = await eth_receipt_logs_tools.getTotalTransferOfSwap(db_log,swapSummary.to.contractInfo.address);
        swapSummary.to.swapAmount = await eth_receipt_logs_tools.getTotalSwapOutOf(swapLog,swapSummary.to.contractInfo.address);

        // assert.positiveNumber(swapSummary.from.transferAmount,`swapSummary.from.transferAmount ${db_log.transactionHash} ${db_log.logIndex}`);
        assert.positiveNumber(swapSummary.from.swapAmount,"swapSummary.from.swapAmount");
        assert.positiveNumber(swapSummary.to.transferAmount,"swapSummary.to.transferAmount");
        assert.positiveNumber(swapSummary.to.swapAmount,"swapSummary.to.swapAmount");

        // TAX
        const gross = type === TRADE_TYPE.BUY ? swapSummary.to.swapAmount : swapSummary.from.swapAmount;
        const net = type === TRADE_TYPE.BUY ? swapSummary.to.transferAmount : swapSummary.from.transferAmount;
        const grossNetInfo = tools.getGrossNetInfo(gross,net,`${method} type:${type} gross ${gross} net ${net}`);
        swapSummary.tax_amount = grossNetInfo.diff
        swapSummary.tax_percentage = grossNetInfo.percentage;
        if(swapSummary.tax_percentage >= 0.4) throw new worker_events_trade_error(`unexpected tax amount >= 0.4 on txn ${db_log.transactionHash} logIndex ${db_log.logIndex} gross ${grossNetInfo.gross} net ${grossNetInfo.net}`);

        //PRICE
        const amount_for_value = type === TRADE_TYPE.BUY ? tokenInfo.transferAmount : tokenInfo.swapAmount;
        swapSummary.bnb_usd = await eth_price_track_details_tools.getBnbUsdPrice(db_log);
        if(otherTokenInfo.contractInfo.address.toLowerCase() === eth_config.getBusdContract().toLowerCase()){
            swapSummary.usd_price = tools.divide(otherTokenInfo.swapAmount,amount_for_value);
            swapSummary.usd_value = otherTokenInfo.swapAmount;
            swapSummary.bnb_price = worker_events_trade_tools.calculateBnbPerTokenFromSwap(amount_for_value, otherTokenInfo.swapAmount, swapSummary.bnb_usd);
            swapSummary.bnb_value = tools.multiply(swapSummary.bnb_price,amount_for_value);
        }
        else if(otherTokenInfo.contractInfo.address.toLowerCase() === eth_config.getEthContract().toLowerCase()){
            swapSummary.bnb_price = tools.divide(otherTokenInfo.swapAmount,amount_for_value);
            swapSummary.bnb_value = otherTokenInfo.swapAmount;
            swapSummary.usd_price = worker_events_trade_tools.calculateBusdPerTokenFromSwap(amount_for_value, otherTokenInfo.swapAmount, swapSummary.bnb_usd);
            swapSummary.usd_value = tools.multiply(swapSummary.usd_price,amount_for_value);
        }
        else{
            swapSummary.bnb_price = await eth_price_track_details_tools.getBnbTokenPrice(db_log,tokenInfo.contractInfo);
            swapSummary.bnb_value = await eth_price_track_details_tools.getBnbTokenValue(db_log,tokenInfo.contractInfo,amount_for_value);
            swapSummary.usd_price = await eth_price_track_details_tools.getBnbUsdValue(db_log,swapSummary.bnb_price);
            swapSummary.usd_value = tools.toBn(swapSummary.usd_price).multipliedBy(tools.toBn(amount_for_value)).toFixed(eth_config.getBusdDecimal());
        }

        return swapSummary;
    }

    public static async setTxnCallerJob(): Promise<void>{
        const method = "setTxnCallerJob";
        this.log(`setting txn_caller in eth_contract_events that are null...`,method,false,true);
        const events = new eth_contract_events();
        await events.list(" WERE  txn_caller=:empty OR txn_caller IS NULL " ,{empty:""});
        this.log(`found ${events.count()} events to process`,method,false,true);
        let count = 0, total = events.count();
        for(const event of events._dataList as eth_contract_events[]){
            count++;
            const txn_source = await eth_transaction_tools.get(event.txn_hash??"");
            event.txn_caller = txn_source.fromAddress??'';
            await event.save();
            this.log(`${count}/${total}|${event.txn_hash} updated`,method,false,true);
        }
    }
}

class worker_events_trade_error extends Error{
    constructor(m:string) {
        super(m);
    }
}

if(argv.includes("run_worker_events_trade")){
    console.log(`running worker to track trade events`);
    worker_events_trade.run().finally();
}

if(argv.includes("run_setTxnCallerJob")){
    console.log(`running function setTxnCallerJob`);
    worker_events_trade.setTxnCallerJob().finally();
}
