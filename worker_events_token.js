"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_events_token = void 0;
const process_1 = require("process");
const config_1 = require("./config");
const tools_1 = require("./tools");
const assert_1 = require("./assert");
const connection_1 = require("./connection");
const eth_receipt_logs_1 = require("./build/eth_receipt_logs");
const time_helper_1 = require("./time_helper");
const eth_worker_1 = require("./eth_worker");
const web3_abi_decoder_1 = require("./web3_abi_decoder");
const web3_log_decoder_1 = require("./web3_log_decoder");
const eth_contract_events_1 = require("./build/eth_contract_events");
const eth_config_1 = require("./eth_config");
const user_1 = require("./build/user");
const eth_price_track_details_tools_1 = require("./eth_price_track_details_tools");
const eth_contract_data_tools_1 = require("./eth_contract_data_tools");
class worker_events_token {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`worker_events_token|${method}|${msg}`);
            if (end)
                console.log(`worker_events_token|${method}|${tools_1.tools.LINE}`);
        }
    }
    static resetPointers() {
        this.lastProcessedTransactionHash = "";
        this.lastProcessedBlockNumber = 0;
        this.lastProcessedLogIndex = 0;
        this.lastProcessedDbLogId = 0;
    }
    static getStartingDelayInSeconds() {
        let delay = 10;
        const delayOverride = config_1.config.getCustomOption("worker_events_token_retry_delay", false);
        if (typeof delayOverride === "number") {
            delay = assert_1.assert.positiveInt(delayOverride, `getStartingDelayInSeconds|delayOverride`);
        }
        return delay;
    }
    static getBatch() {
        let batch = 500;
        const batchOverride = config_1.config.getCustomOption("worker_events_token_batch", false);
        if (typeof batchOverride === "number") {
            batch = assert_1.assert.positiveInt(batchOverride, "getBatch|batchOverride");
        }
        return batch;
    }
    //endregion CONFIG
    static async run() {
        const method = "run";
        await connection_1.connection.startTransaction();
        try {
            const unprocessedTokenEvents = new eth_receipt_logs_1.eth_receipt_logs();
            await unprocessedTokenEvents.list(" WHERE blockNumber>=:blockNumber AND time_processed_price>:zero AND has_token=:y AND  time_processed_events IS NULL ", { blockNumber: this.lastProcessedBlockNumber, zero: 0, y: "y" }, ` ORDER BY blockNumber ASC, logIndex ASC LIMIT ${this.getBatch()} `);
            const total = unprocessedTokenEvents.count();
            let count = 0;
            for (const log of unprocessedTokenEvents._dataList) {
                count++;
                const logFormat = `${count}/${total}|${time_helper_1.time_helper.getAsFormat(assert_1.assert.positiveInt(log.blockTime, "log.blockTime"), time_helper_1.TIME_FORMATS.ISO)}|`;
                this.log(`${logFormat} ${this.currentTransactionHash} ${this.currentLogIndex}`, method, false, true);
                this.currentTransactionHash = assert_1.assert.stringNotEmpty(log.transactionHash, `${method} log.transactionHash to this.lastTransactionHash`);
                this.currentLogIndex = assert_1.assert.naturalNumber(log.logIndex, `${method}|log.logIndex to this.lastLogIndex`);
                this.currentDbLogId = assert_1.assert.positiveInt(log.id, `${method}|log.id to this.lastDbLogId`);
                this.currentBlockNumber = assert_1.assert.positiveInt(log.blockNumber, `${method}|log.blockNumber to this.lastBlockNumber`);
                // check if already on event
                const checkEvent = new eth_contract_events_1.eth_contract_events();
                await checkEvent.list(" WHERE txn_hash=:hash AND logIndex=:logIndex ", { hash: this.currentTransactionHash, logIndex: this.currentLogIndex });
                if (checkEvent.count() > 0) {
                    this.log(`${logFormat}---- already on db, updating log`, method, false, true);
                    log.time_processed_events = tools_1.tools.getCurrentTimeStamp();
                    await log.save();
                }
                // get txn and decode
                const transaction = await eth_worker_1.eth_worker.getDbTxnByHash(this.currentTransactionHash);
                const decodedTransaction = await web3_abi_decoder_1.web3_abi_decoder.decodeAbiObject(transaction.input);
                const txnMethod = decodedTransaction ? decodedTransaction.abi.name : "unknown";
                const transferTransaction = await web3_abi_decoder_1.web3_abi_decoder.getTransferAbi(decodedTransaction);
                // decode log
                const web3Log = eth_worker_1.eth_worker.convertDbLogToWeb3Log(log);
                const decodedLog = await web3_log_decoder_1.web3_log_decoder.decodeLog(web3Log);
                const logMethod = decodedLog.method_name;
                const transferLog = await web3_log_decoder_1.web3_log_decoder.getTransferLog(web3Log);
                const tokenContractInfo = await eth_contract_data_tools_1.eth_contract_data_tools.getContractDynamicStrict(eth_config_1.eth_config.getTokenContract());
                const newEvent = new eth_contract_events_1.eth_contract_events();
                newEvent.txn_hash = log.transactionHash;
                newEvent.blockNumber = log.blockNumber;
                newEvent.block_time = log.blockTime;
                newEvent.logIndex = log.logIndex;
                newEvent.method = txnMethod;
                newEvent.log_method = logMethod;
                if (transferLog) {
                    this.log(`${logFormat}---- transfer detected, setting values`, method, false, true);
                    newEvent.fromContract = tokenContractInfo.address;
                    newEvent.fromSymbol = tokenContractInfo.symbol;
                    newEvent.fromDecimal = assert_1.assert.naturalNumber(tokenContractInfo.decimals, `tokenContractInfo.decimals`);
                    newEvent.toContract = tokenContractInfo.address;
                    newEvent.toSymbol = tokenContractInfo.symbol;
                    newEvent.toDecimal = assert_1.assert.naturalNumber(tokenContractInfo.decimals, `tokenContractInfo.decimals`);
                    newEvent.fromAddress = transferLog.from;
                    newEvent.toAddress = transferLog.to;
                    newEvent.fromAmountGross = eth_worker_1.eth_worker.convertValueToAmount(transferLog.value.toString(), transferLog.ContractInfo.decimals);
                    newEvent.fromAmount = newEvent.fromAmountGross;
                    newEvent.toAmountGross = newEvent.fromAmountGross;
                    newEvent.toAmount = newEvent.fromAmountGross;
                    if (transferTransaction) {
                        this.log(`${logFormat}---- transfer transaction detected, checking if the same sender or receiver`, method, false, true);
                        if (transferTransaction.recipient.toLowerCase() === newEvent.fromAddress.toLowerCase()
                            || transferTransaction.recipient.toLowerCase() === newEvent.toAddress.toLowerCase()) {
                            newEvent.fromAmountGross = eth_worker_1.eth_worker.convertValueToAmount(transferTransaction.amount.toString(), transferLog.ContractInfo.decimals);
                            this.log(`${logFormat}---- setting from amount gross value based on transaction method amount ${newEvent.fromAmountGross}`, method, false, true);
                        }
                    }
                    // Check from User and To User
                    let fromUsername = "";
                    const fromMember = new user_1.user();
                    fromMember.walletAddress = newEvent.fromAddress;
                    await fromMember.fetch();
                    if (fromMember.recordExists()) {
                        fromUsername = fromMember.username;
                    }
                    this.log(`${logFormat}---- FROM AMOUNT GROSS ${newEvent.fromAmountGross} NET ${newEvent.fromAmount} ${fromUsername}`, method, false, true);
                    // Check from User and To User
                    let toUsername = "";
                    const toMember = new user_1.user();
                    toMember.walletAddress = newEvent.toAddress;
                    await toMember.fetch();
                    if (toMember.recordExists()) {
                        toUsername = toMember.username;
                    }
                    this.log(`${logFormat}---- TO AMOUNT GROSS ${newEvent.toAmountGross} NET ${newEvent.toAmount} ${toUsername}`, method, false, true);
                    // TAX
                    const grossNetInfo = tools_1.tools.getGrossNetInfo(newEvent.fromAmountGross, newEvent.toAmount, `${method} newEvent.fromAmountGross newEvent.toAmount`);
                    newEvent.tax_amount = grossNetInfo.diff;
                    newEvent.tax_percentage = grossNetInfo.percentage;
                    if (newEvent.tax_percentage && newEvent.tax_percentage >= 0.4)
                        throw new Error(`unexpected tax >= 0.4`);
                    this.log(`${logFormat}---- TAX AMOUNT ${newEvent.tax_amount} ${newEvent.tax_percentage}%`, method, false, true);
                    // PRICES
                    newEvent.token_bnb = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbTokenPrice(log, tokenContractInfo);
                    newEvent.token_bnb_value = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbTokenValue(log, tokenContractInfo, newEvent.fromAmountGross);
                    newEvent.bnb_usd = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbUsdPrice(log);
                    newEvent.token_usd = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbUsdValue(log, newEvent.token_bnb);
                    newEvent.token_usd_value = tools_1.tools.toBn(newEvent.token_usd).multipliedBy(tools_1.tools.toBn(newEvent.fromAmountGross)).toFixed(eth_config_1.eth_config.getBusdDecimal());
                    this.log(`${logFormat}---- BNB USD ${newEvent.bnb_usd}`, method, false, true);
                    this.log(`${logFormat}---- BNB PRICE ${newEvent.token_bnb} VALUE ${newEvent.token_bnb_value}`, method, false, true);
                    this.log(`${logFormat}---- USD PRICE ${newEvent.token_usd} VALUE ${newEvent.token_usd_value}`, method, false, true);
                    await newEvent.save();
                    this.log(`${logFormat}---- saved with id ${newEvent.id}`, method, false, true);
                }
                else {
                    this.log(`${logFormat}---- not a transfer, saving data to be processed in the future`, method, false, true);
                    newEvent.fromAddress = transaction.fromAddress;
                }
                this.log(`${logFormat}---- txn method ${txnMethod} logMethod ${logMethod}`, method, false, true);
                log.time_processed_events = time_helper_1.time_helper.getCurrentTimeStamp();
                await log.save();
                this.log(`${logFormat}---- db log updated`, method, false, true);
            }
            // process
            await connection_1.connection.commit();
            this.lastProcessedTransactionHash = this.currentTransactionHash;
            this.lastProcessedBlockNumber = this.currentBlockNumber;
            this.lastProcessedLogIndex = this.currentLogIndex;
            this.lastProcessedDbLogId = this.currentDbLogId;
            await tools_1.tools.sleep(50);
            setImmediate(() => {
                worker_events_token.run().finally();
            });
        }
        catch (e) {
            await connection_1.connection.rollback();
            this.log(`ERROR on hash ${this.currentTransactionHash} ${this.currentLogIndex}`, method, false, true);
            console.log(e);
            this.log(`worker stopped`, method, true, true);
        }
    }
}
exports.worker_events_token = worker_events_token;
//region CONFIG
worker_events_token.currentTransactionHash = "";
worker_events_token.currentBlockNumber = 0;
worker_events_token.currentLogIndex = 0;
worker_events_token.currentDbLogId = 0;
worker_events_token.lastProcessedTransactionHash = "";
worker_events_token.lastProcessedBlockNumber = 0;
worker_events_token.lastProcessedLogIndex = 0;
worker_events_token.lastProcessedDbLogId = 0;
worker_events_token.retryDelayMultiplier = 0;
class worker_events_token_error extends Error {
    constructor(message) {
        super(message);
    }
}
if (process_1.argv.includes("run_worker_events_token")) {
    console.log(`running worker to track token events`);
    worker_events_token.run().finally();
}
//# sourceMappingURL=worker_events_token.js.map