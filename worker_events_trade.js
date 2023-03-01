"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_events_trade = void 0;
const process_1 = require("process");
const config_1 = require("./config");
const tools_1 = require("./tools");
const eth_receipt_logs_1 = require("./build/eth_receipt_logs");
const time_helper_1 = require("./time_helper");
const assert_1 = require("./assert");
const web3_log_decoder_1 = require("./web3_log_decoder");
const eth_worker_1 = require("./eth_worker");
const user_1 = require("./build/user");
const eth_contract_events_1 = require("./build/eth_contract_events");
const eth_receipt_logs_tools_1 = require("./eth_receipt_logs_tools");
const eth_config_1 = require("./eth_config");
const web3_pair_price_tools_1 = require("./web3_pair_price_tools");
const eth_worker_trade_1 = require("./eth_worker_trade");
const eth_price_track_details_tools_1 = require("./eth_price_track_details_tools");
const web3_abi_decoder_1 = require("./web3_abi_decoder");
const connection_1 = require("./connection");
//endregion TYPES
class worker_events_trade {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`worker_events_trade|${method}|${msg}`);
            if (end)
                console.log(`worker_events_trade|${method}|${tools_1.tools.LINE}`);
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
        const delayOverride = config_1.config.getCustomOption("worker_events_trade_retry_delay", false);
        if (typeof delayOverride === "number") {
            delay = assert_1.assert.positiveInt(delayOverride, `getStartingDelayInSeconds|delayOverride`);
        }
        return delay;
    }
    static getBatch() {
        let batch = 500;
        const batchOverride = config_1.config.getCustomOption("worker_events_trade_batch", false);
        if (typeof batchOverride === "number") {
            batch = assert_1.assert.positiveInt(batchOverride, "getBatch|batchOverride");
        }
        return batch;
    }
    //endregion SETTINGS
    static async run() {
        const method = "run";
        await connection_1.connection.startTransaction();
        try {
            const dexLogs = new eth_receipt_logs_1.eth_receipt_logs();
            await dexLogs.list(" WHERE blockNumber>=:blockNumber AND time_processed_price>:zero AND has_token_dex=:y AND time_processed_events IS NULL ", { blockNumber: this.lastProcessedBlockNumber, zero: 0, y: "y" }, ` ORDER BY blockNumber ASC, logIndex ASC LIMIT ${this.getBatch()} `);
            if (dexLogs.count() > 0) {
                this.log(`${dexLogs.count()} dex logs to process`, method, false, true);
            }
            const dexLogsCount = dexLogs.count();
            let count = 0;
            for (const log of dexLogs._dataList) {
                this.currentTransactionHash = assert_1.assert.stringNotEmpty(log.transactionHash, `${method} log.transactionHash to this.lastTransactionHash`);
                this.currentLogIndex = assert_1.assert.naturalNumber(log.logIndex, `${method}|log.logIndex to this.lastLogIndex`);
                this.currentDbLogId = assert_1.assert.positiveInt(log.id, `${method}|log.id to this.lastDbLogId`);
                this.currentBlockNumber = assert_1.assert.positiveInt(log.blockNumber, `${method}|log.blockNumber to this.lastBlockNumber`);
                count++;
                const timeLog = time_helper_1.time_helper.getAsFormat(assert_1.assert.positiveNumber(log.blockTime), time_helper_1.TIME_FORMATS.ISO);
                const web3Log = eth_worker_1.eth_worker.convertDbLogToWeb3Log(log);
                const swapLog = await web3_log_decoder_1.web3_log_decoder.getSwapLog(web3Log);
                if (swapLog) {
                    const pairInfo = await web3_pair_price_tools_1.web3_pair_price_tools.getPairInfo(swapLog.ContractInfo.address);
                    this.log(`${count}/${dexLogsCount}|${timeLog}| ${log.transactionHash}`, method, false, true);
                    this.log(`${count}/${dexLogsCount}|${timeLog}|---- sender: ${swapLog.sender} | to: ${swapLog.to}`, method, false, true);
                    const member = new user_1.user();
                    member.walletAddress = swapLog.to;
                    await member.fetch();
                    if (member.recordExists()) {
                        this.log(`${count}/${dexLogsCount}|${timeLog}|---- to member ${member.username}`, method, false, true);
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
                    const swapSummary = await this.getSwapSummary(log, eth_config_1.eth_config.getTokenContract(), swapLog, pairInfo);
                    this.log(`${count}/${dexLogsCount}|${timeLog}|---- TRADE TYPE:${swapSummary.type.toUpperCase()}`, method, false, true);
                    this.log(`${count}/${dexLogsCount}|${timeLog}|---- FROM: gross ${swapSummary.from.swapAmount} net ${swapSummary.from.transferAmount} ${swapSummary.from.contractInfo.symbol}`, method, false, true);
                    this.log(`${count}/${dexLogsCount}|${timeLog}|---- TO: gross ${swapSummary.to.swapAmount} net ${swapSummary.to.transferAmount} ${swapSummary.to.contractInfo.symbol}`, method, false, true);
                    this.log(`${count}/${dexLogsCount}|${timeLog}|---- TAX: ${swapSummary.tax_amount} ${swapSummary.tax_percentage}%`, method, false, true);
                    this.log(`${count}/${dexLogsCount}|${timeLog}|---- BNB PRICE: ${swapSummary.bnb_price} VALUE ${swapSummary.bnb_value}`, method, false, true);
                    this.log(`${count}/${dexLogsCount}|${timeLog}|---- USD PRICE: ${swapSummary.usd_price} VALUE ${swapSummary.usd_value}`, method, false, true);
                    this.log(`${count}/${dexLogsCount}|${timeLog}|---- BNB_USD: ${swapSummary.bnb_usd}`, method, false, true);
                    const transaction = await eth_worker_1.eth_worker.getDbTxnByHash(assert_1.assert.stringNotEmpty(log.transactionHash));
                    const decoded_abi = await web3_abi_decoder_1.web3_abi_decoder.decodeAbiObject(transaction.input);
                    let txn_method = "unknown";
                    if (decoded_abi) {
                        txn_method = decoded_abi.abi.name;
                        this.log(`${count}/${dexLogsCount}|${timeLog}|---- TXN METHOD:${txn_method}`, method, false, true);
                    }
                    const check = new eth_contract_events_1.eth_contract_events();
                    await check.list(" WHERE txn_hash=:hash AND logIndex=:logIndex ", { hash: log.transactionHash, logIndex: log.logIndex });
                    if (check.count() > 0) {
                        this.log(`${count}/${dexLogsCount}|${timeLog}|---- already on db, skipping...`, method, false, true);
                        continue;
                    }
                    const newEvent = new eth_contract_events_1.eth_contract_events();
                    newEvent.txn_hash = assert_1.assert.stringNotEmpty(log.transactionHash, "log.transactionHash");
                    newEvent.blockNumber = assert_1.assert.positiveNumber(log.blockNumber, "log.blockNumber");
                    newEvent.logIndex = assert_1.assert.positiveNumber(log.logIndex, "log.logIndex");
                    newEvent.pair_contract = assert_1.assert.stringNotEmpty(log.address, "log.address");
                    newEvent.block_time = assert_1.assert.positiveInt(log.blockTime, "log.blockTime");
                    newEvent.type = swapSummary.type;
                    newEvent.tag = "trade";
                    newEvent.method = txn_method;
                    newEvent.log_method = swapLog.method_name;
                    newEvent.fromAddress = swapLog.sender;
                    newEvent.fromContract = swapSummary.from.contractInfo.address;
                    newEvent.fromSymbol = swapSummary.from.contractInfo.symbol;
                    newEvent.fromDecimal = assert_1.assert.naturalNumber(swapSummary.from.contractInfo.decimals, `${method}|swapSummary.from.contractInfo.decimals`);
                    newEvent.fromAmountGross = swapSummary.from.swapAmount;
                    newEvent.fromAmount = swapSummary.from.transferAmount;
                    newEvent.toAddress = swapLog.to;
                    newEvent.toContract = swapSummary.to.contractInfo.address;
                    newEvent.toSymbol = swapSummary.to.contractInfo.symbol;
                    newEvent.toDecimal = assert_1.assert.naturalNumber(swapSummary.to.contractInfo.decimals, `${method}|swapSummary.to.contractInfo.decimals`);
                    newEvent.toAmountGross = swapSummary.to.swapAmount;
                    newEvent.toAmount = swapSummary.to.transferAmount;
                    newEvent.tax_amount = swapSummary.tax_amount;
                    newEvent.tax_percentage = assert_1.assert.isNumeric(swapSummary.tax_percentage, "swapSummary.tax_percentage");
                    newEvent.bnb_usd = swapSummary.bnb_usd;
                    newEvent.token_bnb = swapSummary.bnb_price;
                    newEvent.token_bnb_value = swapSummary.bnb_value;
                    newEvent.token_usd = swapSummary.usd_price;
                    newEvent.token_usd_value = swapSummary.usd_value;
                    this.log(`${count}/${dexLogsCount}|${timeLog}|---- added on db`, method, false, true);
                    await newEvent.save();
                }
                log.time_processed_events = tools_1.tools.getCurrentTimeStamp();
                await log.save();
                this.log('', method, true, false);
            }
            await connection_1.connection.commit();
            this.lastProcessedTransactionHash = this.currentTransactionHash;
            this.lastProcessedBlockNumber = this.currentBlockNumber;
            this.lastProcessedLogIndex = this.currentLogIndex;
            this.lastProcessedDbLogId = this.currentDbLogId;
            this.retryDelayMultiplier = 0;
            await tools_1.tools.sleep(50);
            setImmediate(() => {
                worker_events_trade.run().finally();
            });
        }
        catch (e) {
            await connection_1.connection.rollback();
            this.log(`ERROR`, method, false, true);
            this.log(`current hash ${this.currentTransactionHash} logIndex ${this.currentLogIndex}`, method, false, true);
            if (e instanceof Error)
                this.log(e.message, method, false, true);
            else
                console.log(e);
            this.retryDelayMultiplier++;
            const retryInSeconds = this.getStartingDelayInSeconds() * this.retryDelayMultiplier;
            this.log(`retrying in ${retryInSeconds} seconds...`, method, true, true);
            setTimeout(() => {
                this.resetPointers();
                worker_events_trade.run();
            }, retryInSeconds * 1000);
        }
    }
    static async getSwapSummary(db_log, target_token, swapLog, pairInfo) {
        const method = "getSwapSummary";
        assert_1.assert.recordExist(db_log, `${method} db_log`);
        target_token = assert_1.assert.stringNotEmpty(target_token, `${method} target_token`);
        if (!swapLog)
            swapLog = await web3_log_decoder_1.web3_log_decoder.getSwapLog(eth_worker_1.eth_worker.convertDbLogToWeb3Log(db_log));
        if (!pairInfo)
            pairInfo = await web3_pair_price_tools_1.web3_pair_price_tools.getPairInfo(swapLog.ContractInfo.address);
        const tokenInfo = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getContractInfoFromPair(pairInfo, target_token);
        const otherTokenInfo = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getOppositeContractPairOf(pairInfo, target_token);
        const type = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getTradeTypeOfSwap(swapLog, target_token);
        const swapSummary = {
            bnb_usd: "0",
            bnb_price: "0", bnb_value: "0", usd_price: "0", usd_value: "0",
            from: eth_receipt_logs_tools_1.eth_receipt_logs_tools.getDefaultSwapTradeInfo(),
            to: eth_receipt_logs_tools_1.eth_receipt_logs_tools.getDefaultSwapTradeInfo(),
            type: type,
            tax_amount: "0",
            tax_percentage: 0
        };
        if (type === eth_worker_trade_1.TRADE_TYPE.BUY) {
            swapSummary.from = otherTokenInfo;
            swapSummary.to = tokenInfo;
        }
        else if (type === eth_worker_trade_1.TRADE_TYPE.SELL) {
            swapSummary.from = tokenInfo;
            swapSummary.to = otherTokenInfo;
        }
        else {
            throw new worker_events_trade_error(`trade type not yet set for log ${db_log.transactionHash} ${db_log.logIndex}`);
        }
        swapSummary.from.transferAmount = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getTotalTransferOfSwap(db_log, swapSummary.from.contractInfo.address);
        swapSummary.from.swapAmount = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getTotalSwapInOf(swapLog, swapSummary.from.contractInfo.address);
        if (tools_1.tools.toBn(swapSummary.from.transferAmount).comparedTo(tools_1.tools.toBn("0")) === 0) {
            swapSummary.from.transferAmount = swapSummary.from.swapAmount;
        }
        swapSummary.to.transferAmount = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getTotalTransferOfSwap(db_log, swapSummary.to.contractInfo.address);
        swapSummary.to.swapAmount = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getTotalSwapOutOf(swapLog, swapSummary.to.contractInfo.address);
        // assert.positiveNumber(swapSummary.from.transferAmount,`swapSummary.from.transferAmount ${db_log.transactionHash} ${db_log.logIndex}`);
        assert_1.assert.positiveNumber(swapSummary.from.swapAmount, "swapSummary.from.swapAmount");
        assert_1.assert.positiveNumber(swapSummary.to.transferAmount, "swapSummary.to.transferAmount");
        assert_1.assert.positiveNumber(swapSummary.to.swapAmount, "swapSummary.to.swapAmount");
        // TAX
        const gross = type === eth_worker_trade_1.TRADE_TYPE.BUY ? swapSummary.to.swapAmount : swapSummary.from.swapAmount;
        const net = type === eth_worker_trade_1.TRADE_TYPE.BUY ? swapSummary.to.transferAmount : swapSummary.from.transferAmount;
        const grossNetInfo = tools_1.tools.getGrossNetInfo(gross, net, `${method} type:${type} gross ${gross} net ${net}`);
        swapSummary.tax_amount = grossNetInfo.diff;
        swapSummary.tax_percentage = grossNetInfo.percentage;
        if (swapSummary.tax_percentage >= 0.4)
            throw new worker_events_trade_error(`unexpected tax amount >= 0.4 on txn ${db_log.transactionHash} logIndex ${db_log.logIndex} gross ${grossNetInfo.gross} net ${grossNetInfo.net}`);
        //PRICE
        const amount_for_value = type === eth_worker_trade_1.TRADE_TYPE.BUY ? tokenInfo.transferAmount : tokenInfo.swapAmount;
        swapSummary.bnb_price = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbTokenPrice(db_log, tokenInfo.contractInfo);
        swapSummary.bnb_value = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbTokenValue(db_log, tokenInfo.contractInfo, amount_for_value);
        swapSummary.bnb_usd = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbUsdPrice(db_log);
        swapSummary.usd_price = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbUsdValue(db_log, swapSummary.bnb_price);
        swapSummary.usd_value = tools_1.tools.toBn(swapSummary.usd_price).multipliedBy(tools_1.tools.toBn(amount_for_value)).toFixed(eth_config_1.eth_config.getBusdDecimal());
        return swapSummary;
    }
}
exports.worker_events_trade = worker_events_trade;
//region SETTINGS
worker_events_trade.currentTransactionHash = "";
worker_events_trade.currentBlockNumber = 0;
worker_events_trade.currentLogIndex = 0;
worker_events_trade.currentDbLogId = 0;
worker_events_trade.lastProcessedTransactionHash = "";
worker_events_trade.lastProcessedBlockNumber = 0;
worker_events_trade.lastProcessedLogIndex = 0;
worker_events_trade.lastProcessedDbLogId = 0;
worker_events_trade.retryDelayMultiplier = 0;
class worker_events_trade_error extends Error {
    constructor(m) {
        super(m);
    }
}
if (process_1.argv.includes("run_worker_events_trade")) {
    console.log(`running worker to track trade events`);
    worker_events_trade.run().finally();
}
//# sourceMappingURL=worker_events_trade.js.map