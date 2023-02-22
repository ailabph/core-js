"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_worker_token_events = void 0;
const process_1 = require("process");
const assert_1 = require("./assert");
const connection_1 = require("./connection");
const web3_abi_decoder_1 = require("./web3_abi_decoder");
const web3_log_decoder_1 = require("./web3_log_decoder");
const eth_worker_1 = require("./eth_worker");
const eth_worker_trade_1 = require("./eth_worker_trade");
const tools_1 = require("./tools");
const eth_receipt_logs_1 = require("./build/eth_receipt_logs");
const eth_contract_events_1 = require("./build/eth_contract_events");
const batchLimit = 100;
let lastTransactionHash = "", lastLogIndex = 0, lastLogDbId = 0;
class eth_worker_token_events {
    static async run() {
        await connection_1.connection.startTransaction();
        try {
            const unprocessedLogEvents = new eth_receipt_logs_1.eth_receipt_logs();
            await unprocessedLogEvents.list(" WHERE id>:last_id AND time_processed_price>:zero AND time_processed_events IS NULL ", { last_id: lastLogDbId, zero: 0 }, ` ORDER BY blockNumber ASC LIMIT ${batchLimit} `);
            console.log(`${unprocessedLogEvents.count()} logs to process`);
            for (const log of unprocessedLogEvents._dataList) {
                lastLogDbId = assert_1.assert.positiveInt(log.id);
                lastTransactionHash = assert_1.assert.stringNotEmpty(log.transactionHash);
                lastLogIndex = assert_1.assert.positiveInt(log.logIndex);
                const web3Log = eth_worker_1.eth_worker.convertDbLogToWeb3Log(log);
                let decodedLog = false;
                try {
                    decodedLog = await web3_log_decoder_1.web3_log_decoder.decodeLog(web3Log);
                }
                catch (e) {
                    console.log(`unable to decode log_id:${log.id}`);
                    log.decode_failed = "y";
                    await log.save();
                    continue;
                }
                if (!decodedLog)
                    continue;
                //retrieve transaction
                const dbTxn = await eth_worker_1.eth_worker.getDbTxnByHash(assert_1.assert.stringNotEmpty(log.transactionHash));
                if (tools_1.tools.isEmpty(dbTxn.method_name)) {
                    try {
                        const decodedAbi = web3_abi_decoder_1.web3_abi_decoder.decodeAbiObject(dbTxn.input);
                        if (!decodedAbi)
                            throw new Error(`decode failed`);
                        dbTxn.method_name = decodedAbi.abi.name;
                        await dbTxn.save();
                    }
                    catch (e) {
                        console.log(`unable to decode transaction input:${dbTxn.hash}`);
                        dbTxn.method_name = "unknown";
                        await dbTxn.save();
                    }
                }
                log.transaction_method = dbTxn.method_name;
                log.log_method = decodedLog.method_name;
                const newEvent = new eth_contract_events_1.eth_contract_events();
                newEvent.txn_hash = log.transactionHash;
                newEvent.blockNumber = log.blockNumber;
                newEvent.method = log.transaction_method === "unknown" ? log.log_method : log.transaction_method;
                newEvent.fromAddress = dbTxn.fromAddress;
                newEvent.toAddress = dbTxn.toAddress;
                if (decodedLog.method_name.toLowerCase() === "swap") {
                    const swap = await web3_log_decoder_1.web3_log_decoder.getSwapLog(web3Log);
                    if (!swap)
                        throw new Error(`expected swap abi decoded`);
                    const baseQuoteAmountInfo = await eth_worker_trade_1.eth_worker_trade.getBaseQuoteAmount(swap, assert_1.assert.positiveNumber(log.blockTime));
                    const tradePairInfo = await eth_worker_trade_1.eth_worker_trade.getTradeInfo(baseQuoteAmountInfo);
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
            await connection_1.connection.rollback();
            // setImmediate(()=>{
            //     eth_worker_token_events.run();
            // });
        }
        catch (e) {
            await connection_1.connection.rollback();
            console.log(e);
        }
    }
    static async convertSwapLogToContractEvent(swapLog, log) {
        const newEvent = new eth_contract_events_1.eth_contract_events();
        const baseQuoteAmountInfo = await eth_worker_trade_1.eth_worker_trade.getBaseQuoteAmount(swapLog, assert_1.assert.positiveInt(log.blockTime));
        const tradeInfo = await eth_worker_trade_1.eth_worker_trade.getTradeInfo(baseQuoteAmountInfo);
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
exports.eth_worker_token_events = eth_worker_token_events;
if (process_1.argv.includes("run")) {
    console.log(`running worker to process token actions and trade events`);
    eth_worker_token_events.run().finally();
}
//# sourceMappingURL=eth_worker_token_events.js.map