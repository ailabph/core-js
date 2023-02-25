"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_price = void 0;
const process_1 = require("process");
const assert_1 = require("./assert");
const connection_1 = require("./connection");
const eth_config_1 = require("./eth_config");
const tools_1 = require("./tools");
const web3_log_decoder_1 = require("./web3_log_decoder");
const eth_receipt_logs_1 = require("./build/eth_receipt_logs");
const eth_price_track_header_1 = require("./build/eth_price_track_header");
const eth_price_track_details_1 = require("./build/eth_price_track_details");
const web3_pair_price_tools_1 = require("./web3_pair_price_tools");
const eth_price_track_header_tools_1 = require("./eth_price_track_header_tools");
const eth_worker_1 = require("./eth_worker");
const config_1 = require("./config");
class worker_price {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`worker_price|${method}|${msg}`);
            if (end)
                console.log(`worker_price|${method}|${tools_1.tools.LINE}`);
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
        const delayOverride = config_1.config.getCustomOption("worker_price_retry_delay", false);
        if (typeof delayOverride === "number") {
            delay = assert_1.assert.positiveInt(delayOverride, `getStartingDelayInSeconds|delayOverride`);
        }
        return delay;
    }
    static getBatch() {
        let batch = 500;
        const batchOverride = config_1.config.getCustomOption("worker_price_batch", false);
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
            let someLogsAlreadyProcessed = true;
            this.log(`processing logs for its price information`, method, false);
            let latestBlockOnDb = 0;
            const checkLastBlockOnLogs = new eth_receipt_logs_1.eth_receipt_logs();
            await checkLastBlockOnLogs.list(" WHERE 1 ", {}, " ORDER BY blockNumber DESC LIMIT 1 ");
            if (checkLastBlockOnLogs.count() > 0)
                latestBlockOnDb = assert_1.assert.positiveInt(checkLastBlockOnLogs.getItem().blockNumber, `${method} checkLastBlockOnLogs.getItem().blockNumber`);
            if (!(this.lastProcessedBlockNumber > 0)) {
                this.log(`first run detected, retrieving last blockNumber that is processed (heavy query)`, method, false, true);
                let check = new eth_receipt_logs_1.eth_receipt_logs();
                await check.list(" WHERE time_processed_price IS NOT NULL ", {}, " ORDER BY blockNumber DESC, logIndex DESC LIMIT 1 ");
                check = check.getItem();
                if (!check) {
                    this.log(`...no logs found that price has been processed`, method, false, true);
                    someLogsAlreadyProcessed = false;
                }
                else {
                    this.lastProcessedBlockNumber = assert_1.assert.positiveInt(check.blockNumber, `${method} check.blockNumber to this.lastProcessedBlockNumber`);
                    this.log(`...found blockNumber ${check.blockNumber} logIndex ${check.logIndex} dbId ${check.id}`, method, false, true);
                }
            }
            if (!(this.lastProcessedBlockNumber > 0)) {
                this.log(`retrieving first blockNumber in logs (heavy query)`, method, false, true);
                let check = new eth_receipt_logs_1.eth_receipt_logs();
                await check.list(" WHERE time_processed_price IS NULL ", {}, " ORDER BY blockNumber ASC, logIndex ASC LIMIT 1 ");
                check = check.getItem();
                if (!check) {
                    this.log(`...no logs found`, method, false, true);
                }
                else {
                    this.lastProcessedBlockNumber = assert_1.assert.positiveInt(check.blockNumber, `${method} check.blockNumber to this.lastProcessedBlockNumber`);
                    this.log(`...found blockNumber ${check.blockNumber} logIndex ${check.logIndex} dbId ${check.id}`, method, false, true);
                }
            }
            if (!(this.lastProcessedBlockNumber > 0))
                throw new Error(`unable to run worker_price without lastProcessedBlockNumber(${this.lastProcessedBlockNumber})`);
            const blockFrom = this.lastProcessedBlockNumber;
            const blockTo = this.lastProcessedBlockNumber + this.getBatch();
            this.log(`retrieving logs between ${blockFrom} to ${blockTo} with time_processed_price IS NULL`, method, false, true);
            const unProcessedLogs = new eth_receipt_logs_1.eth_receipt_logs();
            let logsWhere = " WHERE blockNumber>=:from AND blockNumber<=:to AND time_processed_price IS NULL ";
            let logsParam = {};
            logsParam["from"] = blockFrom;
            logsParam["to"] = blockTo;
            const logsOrder = ` ORDER BY blockNumber ASC, logIndex ASC `;
            await unProcessedLogs.list(logsWhere, logsParam, logsOrder);
            if (unProcessedLogs.count() === 0) {
                this.log(`...no logs found blockTo ${blockTo} latestBlockOnDb ${latestBlockOnDb}`, method);
                this.currentBlockNumber = blockTo < latestBlockOnDb ? blockTo : latestBlockOnDb;
            }
            this.log(`${unProcessedLogs.count()} unprocessed logs for sync price computation`, method);
            const logCount = unProcessedLogs.count();
            let currentCount = 0;
            for (const log of unProcessedLogs._dataList) {
                currentCount++;
                this.log(`${currentCount}/${logCount}|processing log address ${log.address}`, method);
                this.currentTransactionHash = assert_1.assert.stringNotEmpty(log.transactionHash, `${method} log.transactionHash to this.lastTransactionHash`);
                this.currentLogIndex = assert_1.assert.naturalNumber(log.logIndex, `${method}|log.logIndex to this.lastLogIndex`);
                this.currentDbLogId = assert_1.assert.positiveInt(log.id, `${method}|log.id to this.lastDbLogId`);
                this.currentBlockNumber = assert_1.assert.positiveInt(log.blockNumber, `${method}|log.blockNumber to this.lastBlockNumber`);
                if (typeof log.time_processed_price === "number" && log.time_processed_price > 0) {
                    this.log(`...skipping price already processed in log`, method);
                }
                const web3Log = eth_worker_1.eth_worker.convertDbLogToWeb3Log(log);
                const sync = await web3_log_decoder_1.web3_log_decoder.getSyncLog(web3Log);
                if (sync) {
                    this.log(`sync found, retrieving pair info`, method);
                    const pairHeader = await eth_price_track_header_tools_1.eth_price_track_header_tools.getViaIdOrContract(sync.ContractInfo.address, false);
                    if (!pairHeader) {
                        this.log(`pair contract info cannot be retrieved, skipping...`, method, false, true);
                    }
                    else {
                        const pairInfo = web3_pair_price_tools_1.web3_pair_price_tools.convertDbPairHeaderToPairInfo(pairHeader);
                        this.log(`creating new price detail`, method);
                        const newDetail = new eth_price_track_details_1.eth_price_track_details();
                        newDetail.header_id = tools_1.tools.parseInt({ val: pairHeader.id, name: "pairHeader.id", strict: true });
                        newDetail.reserve0 = sync.reserve0.toString();
                        newDetail.reserve1 = sync.reserve1.toString();
                        newDetail.transactionHash = assert_1.assert.isString({ val: log.transactionHash, prop_name: "log.transactionHash", strict: true });
                        newDetail.logIndex = tools_1.tools.parseInt({ val: log.logIndex, name: "log.logIndex", strict: true });
                        newDetail.blockNumber = tools_1.tools.parseInt({ val: log.blockNumber, name: "log.blockNumber", strict: true });
                        newDetail.blockTime = tools_1.tools.parseInt({ val: log.blockTime, name: "log.blockTime", strict: true });
                        const base_prices_info = await web3_pair_price_tools_1.web3_pair_price_tools.processBasePriceOfPairFromLog(pairHeader.pair_contract, newDetail.transactionHash, newDetail.logIndex, someLogsAlreadyProcessed);
                        if (!base_prices_info)
                            throw new Error(`unable to compute prices`);
                        newDetail.price = "0";
                        if (await web3_pair_price_tools_1.web3_pair_price_tools.pairIsUsd(pairInfo)) {
                            newDetail.price = base_prices_info.usd_price;
                        }
                        else if (await web3_pair_price_tools_1.web3_pair_price_tools.pairIsBnb(pairInfo)) {
                            newDetail.price = base_prices_info.bnb_price;
                        }
                        newDetail.price_bnb = base_prices_info.bnb_price;
                        newDetail.price_usd = base_prices_info.usd_price;
                        assert_1.assert.isNumericString(newDetail.price, `${method} newDetail.price`);
                        assert_1.assert.isNumericString(newDetail.price_bnb, `${method} newDetail.price_bnb`);
                        assert_1.assert.isNumericString(newDetail.price_usd, `${method} newDetail.price_usd`);
                        if (tools_1.tools.toBn(newDetail.price).comparedTo(tools_1.tools.toBn("0")) < 0) {
                            throw new Error(`price <= 0, double check if not error ${log.transactionHash} ${log.logIndex}`);
                        }
                        await newDetail.save();
                        const dateTime = tools_1.tools.getTime(newDetail.blockTime).format();
                        this.log(`${dateTime} |${currentCount}/${logCount}|${eth_price_track_header_tools_1.eth_price_track_header_tools.getPairSymbol(pairHeader)} price ${newDetail.price} bnb ${newDetail.price_bnb} usd ${newDetail.price_usd} at block ${log.blockNumber} log ${log.logIndex}`, method, false, true);
                    }
                }
                else {
                    this.log(`...log is not sync, skipping`, method);
                }
                log.time_processed_price = tools_1.tools.getCurrentTimeStamp();
                await log.save();
                this.log(``, method, true);
            }
            await connection_1.connection.commit();
            this.lastProcessedTransactionHash = this.currentTransactionHash;
            this.lastProcessedBlockNumber = this.currentBlockNumber;
            this.lastProcessedLogIndex = this.currentLogIndex;
            this.lastProcessedDbLogId = this.currentDbLogId;
            const used = process.memoryUsage().heapUsed / 1024 / 1024;
            if (unProcessedLogs.count() > 0)
                this.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`, method, false);
            await tools_1.tools.sleep(10);
            this.retryDelayMultiplier = 0;
            setImmediate(() => {
                worker_price.run();
            });
        }
        catch (e) {
            await connection_1.connection.rollback();
            this.log(`ERROR on TransactionHash ${this.currentTransactionHash} logIndex ${this.currentLogIndex} logDb_id ${this.currentDbLogId}`, method, false, true);
            this.resetPointers();
            if (e instanceof Error)
                this.log(e.message, method, false, true);
            else
                console.log(e);
            this.retryDelayMultiplier++;
            let secondDelay = this.getStartingDelayInSeconds() * this.retryDelayMultiplier;
            this.log(`...retrying after ${secondDelay} seconds`, method, true, true);
            setTimeout(() => {
                worker_price.run();
            }, secondDelay * 1000);
        }
    }
    //region GETTERS PAIR
    static async getPairInfo(pairContract) {
        const pair = new eth_price_track_header_1.eth_price_track_header();
        pair.pair_contract = pairContract;
        await pair.fetch();
        if (pair.isNew())
            throw new Error(`pair contract ${pairContract} not found in db`);
        return pair;
    }
    static async getPairInfoByTokenContracts(token0, token1) {
        const price_track_header = await eth_price_track_header_tools_1.eth_price_track_header_tools.getViaTokenContracts(token0, token1, true);
        if (!price_track_header)
            throw new Error(``);
        return price_track_header;
    }
    static async getPairInfoByPairId(db_id) {
        db_id = assert_1.assert.positiveInt(db_id);
        const pair = new eth_price_track_header_1.eth_price_track_header();
        pair.id = db_id;
        await pair.fetch();
        if (pair.isNew())
            throw new Error(`no pair contract found from db id ${db_id}`);
        return pair;
    }
    static async getPairDetails(id_or_pair_contract, fromTime = 0, limit = 1) {
        let pair = new eth_price_track_header_1.eth_price_track_header();
        if (tools_1.tools.isNumeric(id_or_pair_contract)) {
            pair = await this.getPairInfoByPairId(assert_1.assert.positiveInt(id_or_pair_contract));
        }
        else if (tools_1.tools.isStringAndNotEmpty(id_or_pair_contract)) {
            pair = await this.getPairInfo(assert_1.assert.stringNotEmpty(id_or_pair_contract));
        }
        if (pair.isNew())
            throw new Error(`unable to retrieve pair with argument ${id_or_pair_contract}`);
        let where = " WHERE header_id=:header_id ";
        let param = {};
        param["header_id"] = assert_1.assert.positiveInt(pair.id);
        if (fromTime > 0) {
            where += " AND blockTime<=:blockTime ";
            param["blockTime"] = fromTime;
        }
        const pair_details = new eth_price_track_details_1.eth_price_track_details();
        await pair_details.list(where, param, ` ORDER BY blockTime DESC LIMIT ${limit} `);
        return pair_details;
    }
    //endregion GETTERS PAIR
    //region BNB
    static async getBnbPriceOfToken(token0, timeStamp) {
        let price = "0.0";
        const tokenBnbPair = await this.getPairInfoByTokenContracts(token0, eth_config_1.eth_config.getEthContract());
        const details = await this.getPairDetails(assert_1.assert.positiveInt(tokenBnbPair.id), timeStamp);
        if (details.count() > 0) {
            price = details.getItem().price;
        }
        return price;
    }
    static async getBnbValueOfToken(token0, timeStamp, amount, is_value = false) {
        const method = "getBnbValueOfToken";
        const price = await this.getBnbPriceOfToken(token0, timeStamp);
        if (is_value) {
            const contract = await eth_worker_1.eth_worker.getContractMetaData(token0);
            amount = assert_1.assert.naturalNumber(amount, `${method}|amount`);
            amount = eth_worker_1.eth_worker.convertValueToAmount(amount, contract.decimals);
        }
        return tools_1.tools.toBn(price).multipliedBy(tools_1.tools.toBn(amount)).toFixed(eth_config_1.eth_config.getEthDecimal());
    }
    //endregion BNB
    //region BUSD
    static async getUsdPriceOfToken(token0, timeStamp) {
        let price = "0.0";
        const tokenBnbPair = await this.getPairInfoByTokenContracts(token0, eth_config_1.eth_config.getEthContract());
        const details = await this.getPairDetails(assert_1.assert.positiveInt(tokenBnbPair.id), timeStamp);
        if (details.count() > 0) {
            price = details.getItem().price_usd ?? "0.0";
        }
        return price;
    }
    static async getUsdValueOfToken(token0, timeStamp, amount, is_value = false) {
        const method = "getUsdValueOfToken";
        const price = await this.getUsdPriceOfToken(token0, timeStamp);
        if (is_value) {
            const contract = await eth_worker_1.eth_worker.getContractMetaData(token0);
            amount = assert_1.assert.naturalNumber(amount, `${method}|amount`);
            amount = eth_worker_1.eth_worker.convertValueToAmount(amount, contract.decimals);
        }
        return tools_1.tools.toBn(price).multipliedBy(tools_1.tools.toBn(amount)).toFixed(eth_config_1.eth_config.getBusdDecimal());
    }
}
exports.worker_price = worker_price;
//region CONFIG
worker_price.currentTransactionHash = "";
worker_price.currentBlockNumber = 0;
worker_price.currentLogIndex = 0;
worker_price.currentDbLogId = 0;
worker_price.lastProcessedTransactionHash = "";
worker_price.lastProcessedBlockNumber = 0;
worker_price.lastProcessedLogIndex = 0;
worker_price.lastProcessedDbLogId = 0;
worker_price.retryDelayMultiplier = 0;
if (process_1.argv.includes("run_worker_price")) {
    console.log(`running worker to track and save token prices`);
    worker_price.run().finally();
}
//# sourceMappingURL=worker_price.js.map