import {argv} from "process";
import {assert} from "./assert";
import {connection} from "./connection";
import {web3_abi_decoder} from "./web3_abi_decoder";
import {web3_log_decoder,SwapLog,BaseType} from "./web3_log_decoder";
import {eth_worker} from "./eth_worker";
import {eth_worker_trade} from "./eth_worker_trade";
import {tools} from "./tools";
import {eth_receipt_logs} from "./build/eth_receipt_logs";
import {eth_contract_events} from "./build/eth_contract_events";
import {eth_transaction} from "./build/eth_transaction";
import {worker_price} from "./worker_price";
import base = Mocha.reporters.base;
import {Log} from "web3-core";

const batchLimit = 100;
let lastTransactionHash = "", lastLogIndex = 0, lastLogDbId = 0;
export class eth_worker_token_events{
    public static async run(){
        await connection.startTransaction();
        try{
            const unprocessedLogEvents = new eth_receipt_logs();
            await unprocessedLogEvents.list(
                " WHERE id>:last_id AND time_processed_price>:zero AND time_processed_events IS NULL ",
                {last_id:lastLogDbId,zero:0},` ORDER BY blockNumber ASC LIMIT ${batchLimit} `);
            console.log(`${unprocessedLogEvents.count()} logs to process`);
            for(const log of unprocessedLogEvents._dataList as eth_receipt_logs[]){
                lastLogDbId = assert.positiveInt(log.id);
                lastTransactionHash = assert.stringNotEmpty(log.transactionHash);
                lastLogIndex = assert.positiveInt(log.logIndex);
                const web3Log = eth_worker.convertDbLogToWeb3Log(log);
                let decodedLog:BaseType|boolean = false;
                try{
                    decodedLog = await web3_log_decoder.decodeLog(web3Log);
                }catch (e){
                    console.log(`unable to decode log_id:${log.id}`);
                    log.decode_failed = "y";
                    await log.save();
                    continue;
                }
                if(!decodedLog) continue;

                //retrieve transaction
                const dbTxn = await eth_worker.getDbTxnByHash(assert.stringNotEmpty(log.transactionHash));
                if(tools.isEmpty(dbTxn.method_name)){
                    try{
                        const decodedAbi = web3_abi_decoder.decodeAbiObject(dbTxn.input);
                        if(!decodedAbi) throw new Error(`decode failed`);
                        dbTxn.method_name = decodedAbi.abi.name;
                        await dbTxn.save();
                    }catch (e){
                        console.log(`unable to decode transaction input:${dbTxn.hash}`);
                        dbTxn.method_name = "unknown";
                        await dbTxn.save();
                    }
                }
                log.transaction_method = dbTxn.method_name;
                log.log_method = decodedLog.method_name;

                const newEvent = new eth_contract_events();
                newEvent.txn_hash = log.transactionHash;
                newEvent.blockNumber = log.blockNumber;
                newEvent.method = log.transaction_method === "unknown" ? log.log_method : log.transaction_method;
                newEvent.fromAddress = dbTxn.fromAddress;
                newEvent.toAddress = dbTxn.toAddress;

                if(decodedLog.method_name.toLowerCase() === "swap"){
                    const swap = await web3_log_decoder.getSwapLog(web3Log);
                    if(!swap) throw new Error(`expected swap abi decoded`);
                    const baseQuoteAmountInfo = await eth_worker_trade.getBaseQuoteAmount(swap,assert.positiveNumber(log.blockTime));
                    const tradePairInfo = await eth_worker_trade.getTradeInfo(baseQuoteAmountInfo);
                    newEvent.fromContract = tradePairInfo.from_contract;
                    newEvent.fromDecimal = tradePairInfo.from_decimal;
                    newEvent.fromSymbol = tradePairInfo.from_symbol;
                    newEvent.fromValue = tradePairInfo.from_value;
                    newEvent.fromAmount = tradePairInfo.from_amount;
                    newEvent.toContract = tradePairInfo.to_contract;
                    newEvent.toDecimal = tradePairInfo.to_decimal;
                    newEvent.toSymbol = tradePairInfo.to_symbol;
                    newEvent.toValue = tradePairInfo.to_value;
                    newEvent.toAmount = tradePairInfo.to_amount;
                    newEvent.token_usd_value = tradePairInfo.usd_value;
                }



                // log.time_processed_events = tools.getCurrentTimeStamp();
                // await log.save();
            }
            await connection.rollback();
            // setImmediate(()=>{
            //     eth_worker_token_events.run();
            // });
        }catch (e){
            await connection.rollback();
            console.log(e);
        }
    }

    public static async convertSwapLogToContractEvent(swapLog:SwapLog,log:eth_receipt_logs):Promise<eth_contract_events>{
        const newEvent = new eth_contract_events();
        const baseQuoteAmountInfo = await eth_worker_trade.getBaseQuoteAmount(swapLog,assert.positiveInt(log.blockTime));
        const tradeInfo = await eth_worker_trade.getTradeInfo(baseQuoteAmountInfo);
        newEvent.txn_hash = log.transactionHash;
        newEvent.blockNumber = log.blockNumber;
        newEvent.type = "";
        newEvent.tag = tradeInfo.trade_type;
        newEvent.method = log.transaction_method;
        newEvent.fromAddress = "";
        newEvent.fromContract = tradeInfo.from_contract;
        newEvent.fromSymbol = tradeInfo.from_symbol;
        newEvent.fromDecimal = tradeInfo.from_decimal;
        newEvent.fromValue = tradeInfo.from_value;
        newEvent.fromAmount = tradeInfo.from_amount;
        newEvent.fromAmountGross = tradeInfo.from_amount;
        newEvent.toAddress = "";
        newEvent.toContract = tradeInfo.to_contract;
        newEvent.toSymbol = tradeInfo.to_symbol;
        newEvent.toDecimal = tradeInfo.to_decimal;
        newEvent.toValue = tradeInfo.to_value;
        newEvent.toAmount = tradeInfo.to_amount;
        newEvent.toAmountGross = tradeInfo.to_amount;
        newEvent.tax_amount = null;
        newEvent.tax_percentage = null;
        newEvent.block_time = null;
        newEvent.bnb_involved = null;
        newEvent.bnb_price = null;
        newEvent.token_bnb_price_estimate = null;
        newEvent.time_processed = null;
        newEvent.time_stake_processed = null;
        newEvent.process_tag = null;
        newEvent.total_token_given = null;
        newEvent.total_gas_used = null;
        newEvent.bnb_usd = null;
        newEvent.token_bnb = null;
        newEvent.token_usd = null;
        newEvent.token_bnb_value = null;
        newEvent.token_usd_value = null;
        newEvent.time_strategy_processed = null;
        return newEvent;
    }
}

if(argv.includes("run")){
    console.log(`running worker to process token actions and trade events`);
    eth_worker_token_events.run().finally();
}