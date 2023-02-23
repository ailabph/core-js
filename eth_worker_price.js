"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_worker_price = void 0;
const process_1 = require("process");
const assert_1 = require("./assert");
const connection_1 = require("./connection");
const eth_config_1 = require("./eth_config");
const tools_1 = require("./tools");
const web3_log_decoder_1 = require("./web3_log_decoder");
const eth_receipt_logs_1 = require("./build/eth_receipt_logs");
const eth_price_track_header_1 = require("./build/eth_price_track_header");
const eth_price_track_details_1 = require("./build/eth_price_track_details");
const eth_pair_price_tools_1 = require("./eth_pair_price_tools");
const eth_price_track_header_tools_1 = require("./eth_price_track_header_tools");
const eth_worker_1 = require("./eth_worker");
const batchLimit = 1000;
let lastTransactionHash = "", lastLogIndex = 0, lastDbLogId = 0;
class eth_worker_price {
    static async run() {
        await connection_1.connection.startTransaction();
        try {
            const unProcessedLogs = new eth_receipt_logs_1.eth_receipt_logs();
            await unProcessedLogs.list(" WHERE id>:last_id AND time_processed_price IS NULL ", { last_id: lastDbLogId }, ` ORDER BY blockTime ASC LIMIT ${batchLimit} `);
            if (unProcessedLogs.count() > 0)
                console.log(`${unProcessedLogs.count()} unprocessed logs for sync price computation`);
            for (const log of unProcessedLogs._dataList) {
                lastTransactionHash = assert_1.assert.stringNotEmpty(log.transactionHash);
                lastLogIndex = assert_1.assert.positiveInt(log.logIndex);
                lastDbLogId = assert_1.assert.positiveInt(log.id);
                const web3Log = eth_worker_1.eth_worker.convertDbLogToWeb3Log(log);
                const sync = await web3_log_decoder_1.web3_log_decoder.getSyncLog(web3Log);
                if (sync) {
                    // get pair header
                    const pairHeader = new eth_price_track_header_1.eth_price_track_header();
                    pairHeader.pair_contract = sync.ContractInfo.address;
                    await pairHeader.fetch();
                    // if new, create
                    if (pairHeader.isNew()) {
                        pairHeader.token0_contract = await eth_worker_1.eth_worker.getPairContractToken0(sync.ContractInfo.address);
                        const token0Info = await eth_worker_1.eth_worker.getContractMetaData(pairHeader.token0_contract);
                        pairHeader.token0_symbol = token0Info.symbol;
                        pairHeader.token0_decimal = tools_1.tools.parseInt({ val: token0Info.decimals, name: "token0Info.decimals", strict: true });
                        pairHeader.token1_contract = await eth_worker_1.eth_worker.getPairContractToken1(sync.ContractInfo.address);
                        const token1Info = await eth_worker_1.eth_worker.getContractMetaData(pairHeader.token1_contract);
                        pairHeader.token1_symbol = token1Info.symbol;
                        pairHeader.token1_decimal = tools_1.tools.parseInt({ val: token1Info.decimals, name: "token1Info.decimals", strict: true });
                        await pairHeader.save();
                    }
                    // add new detail
                    const newDetail = new eth_price_track_details_1.eth_price_track_details();
                    newDetail.header_id = tools_1.tools.parseInt({ val: pairHeader.id, name: "pairHeader.id", strict: true });
                    newDetail.reserve0 = sync.reserve0.toString();
                    newDetail.reserve1 = sync.reserve1.toString();
                    newDetail.transactionHash = assert_1.assert.isString({ val: log.transactionHash, prop_name: "log.transactionHash", strict: true });
                    newDetail.logIndex = tools_1.tools.parseInt({ val: log.logIndex, name: "log.logIndex", strict: true });
                    newDetail.blockNumber = tools_1.tools.parseInt({ val: log.blockNumber, name: "log.blockNumber", strict: true });
                    newDetail.blockTime = tools_1.tools.parseInt({ val: log.blockTime, name: "log.blockTime", strict: true });
                    newDetail.price = await eth_worker_price.computePriceByReserve(sync);
                    if (pairHeader.token1_contract.toLowerCase() === eth_config_1.eth_config.getEthContract().toLowerCase()) {
                        const bnb_usd_price = await eth_worker_price.getBnbUsdPrice(newDetail.blockTime);
                        newDetail.price_usd = tools_1.tools.toBn(newDetail.price).multipliedBy(tools_1.tools.toBn(bnb_usd_price)).toFixed(18);
                    }
                    if (pairHeader.token1_contract.toLowerCase() === eth_config_1.eth_config.getBusdContract().toLowerCase()) {
                        newDetail.price_usd = newDetail.price;
                    }
                    await newDetail.save();
                    const dateTime = tools_1.tools.getTime(newDetail.blockTime).format();
                    console.log(`${pairHeader.token0_symbol}${pairHeader.token1_symbol} price ${newDetail.price} as of ${dateTime}`);
                }
                log.time_processed_price = tools_1.tools.getCurrentTimeStamp();
                await log.save();
            }
            await connection_1.connection.commit();
            const used = process.memoryUsage().heapUsed / 1024 / 1024;
            if (unProcessedLogs.count() > 0)
                console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
            await tools_1.tools.sleep(100);
            setImmediate(() => {
                eth_worker_price.run();
            });
        }
        catch (e) {
            await connection_1.connection.rollback();
            console.log(e);
            console.log(`last transactionHash ${lastTransactionHash} logIndex ${lastLogIndex} logDb_id ${lastDbLogId}`);
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
        const price = await this.getBnbPriceOfToken(token0, timeStamp);
        if (is_value) {
            const contract = await eth_worker_1.eth_worker.getContractMetaData(token0);
            amount = assert_1.assert.naturalNumber(amount);
            amount = eth_worker_1.eth_worker.convertValueToAmount(amount, contract.decimals);
        }
        return tools_1.tools.toBn(price).multipliedBy(tools_1.tools.toBn(amount)).toFixed(18);
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
        const price = await this.getUsdPriceOfToken(token0, timeStamp);
        if (is_value) {
            const contract = await eth_worker_1.eth_worker.getContractMetaData(token0);
            amount = assert_1.assert.naturalNumber(amount);
            amount = eth_worker_1.eth_worker.convertValueToAmount(amount, contract.decimals);
        }
        return tools_1.tools.toBn(price).multipliedBy(tools_1.tools.toBn(amount)).toFixed(18);
    }
    //endregion BUSD
    static async computePriceByReserve(syncLog) {
        return eth_pair_price_tools_1.eth_pair_price_tools.computePriceByReserve(syncLog);
    }
    static async getBnbUsdPrice(fromTime) {
        const pairHeader = new eth_price_track_header_1.eth_price_track_header();
        pairHeader.pair_contract = eth_config_1.eth_config.getBnbUsdPairContract();
        await pairHeader.fetch();
        if (pairHeader.isNew())
            throw new Error(`unable to retrieve bnbusd pair info`);
        const detail = new eth_price_track_details_1.eth_price_track_details();
        await detail.list(" WHERE header_id=:header_id AND blockTime<=:fromTime ", { header_id: pairHeader.id, fromTime: fromTime }, " ORDER BY blockTime DESC LIMIT 1 ");
        if (detail.count() === 0)
            throw new Error(`unable to retrieve any price for BNBUSD pair on time:${fromTime}`);
        return detail.getItem().price;
    }
}
exports.eth_worker_price = eth_worker_price;
if (process_1.argv.includes("run")) {
    console.log(`running worker to track and save token prices`);
    eth_worker_price.run().finally();
}
//# sourceMappingURL=eth_worker_price.js.map