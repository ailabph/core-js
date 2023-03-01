"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_block = void 0;
const process_1 = require("process");
const connection_1 = require("./connection");
const web3_rpc_web3_1 = require("./web3_rpc_web3");
const tools_1 = require("./tools");
const config_1 = require("./config");
const worker_blocks_tools_1 = require("./worker_blocks_tools");
const eth_worker_1 = require("./eth_worker");
const eth_receipt_logs_tools_1 = require("./eth_receipt_logs_tools");
class worker_block {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`worker_block|${method}|${msg}`);
            if (end)
                console.log(`worker_block|${method}|${tools_1.tools.LINE}`);
        }
    }
    //region CONFIG
    static getBatch() {
        return 2;
    }
    static getHeightAllowance() {
        return 8;
    }
    static init() {
        if (typeof this.limiterInfo === "undefined") {
            this.limiterInfo = tools_1.tools.createLimiter(25, tools_1.RATE_LIMIT_INTERVAL.SECOND);
        }
    }
    //endregion
    static async run(token_specific = true) {
        const method = "run";
        this.init();
        await connection_1.connection.startTransaction();
        const startTime = tools_1.tools.getCurrentTimeStamp();
        try {
            // from = get latest block on db
            // to = from + batch
            const latestDbBlock = await eth_worker_1.eth_worker.getLatestBlock();
            const latestBlockWeb3 = await eth_worker_1.eth_worker.getLatestBlockWeb3();
            const adjustedLatestBlockOnChain = latestBlockWeb3 - this.getHeightAllowance();
            const fromBlock = latestDbBlock + 1;
            let toBlock = fromBlock + this.getBatch();
            toBlock = toBlock > adjustedLatestBlockOnChain ? adjustedLatestBlockOnChain : toBlock;
            this.blocksToProcess = toBlock - fromBlock;
            let currentBatch = this.blocksToProcess;
            this.log(`process block from ${fromBlock} to ${toBlock} blocks to process ${this.blocksToProcess}`, method, false, true);
            for (let blockNum = fromBlock; blockNum < toBlock; blockNum++) {
                await tools_1.tools.useCallLimiter(this.limiterInfo);
                this.log(`...retrieving block info ${blockNum}`, method, false, true);
                this.getBlockSingleFlight(blockNum).then(async (blockInfo) => {
                    --this.blocksToProcess;
                    this.log(`...${this.blocksToProcess}/${currentBatch} block ${blockInfo.result.block.number} txns ${blockInfo.result.block.transactions.length} receipts ${blockInfo.result.receipts ? blockInfo.result.receipts.length : 0} ${blockInfo.result.block.timestamp}`, method, false, true);
                    for (const transaction of blockInfo.result.block.transactions) {
                        this.log(`......${transaction.hash} ${transaction.value} ${transaction.blockNumber} ${transaction.transactionIndex}`, method);
                    }
                    if (blockInfo.result.receipts) {
                        const web3Logs = worker_blocks_tools_1.worker_blocks_tools.getLogsArray(blockInfo.result.receipts);
                        await eth_receipt_logs_tools_1.eth_receipt_logs_tools.analyzeLogsInvolvement(web3Logs);
                    }
                    await eth_worker_1.eth_worker.getBlockByNumber(blockNum);
                    if (this.blocksToProcess === 0) {
                        await connection_1.connection.commit();
                        const endTime = tools_1.tools.getCurrentTimeStamp();
                        const diff = endTime - startTime;
                        const minutes = Math.floor(diff / 60);
                        const minutesInSeconds = minutes * 60;
                        const seconds = diff - minutesInSeconds;
                        const blocksPerMinute = 20;
                        const blocksPerHour = 1200;
                        let processBlocksPerHour = blocksPerHour / currentBatch;
                        processBlocksPerHour = processBlocksPerHour * diff;
                        processBlocksPerHour = (processBlocksPerHour / 60).toFixed(2);
                        const blocksPerDay = 28800;
                        let processBlocksPerDay = blocksPerDay / currentBatch;
                        processBlocksPerDay = processBlocksPerDay * diff;
                        processBlocksPerDay = (processBlocksPerDay / 60).toFixed(2);
                        console.log(`run time ${minutes} minutes ${seconds} seconds to process ${currentBatch} blocks`);
                        console.log(`estimated ${processBlocksPerHour} minutes to process 1 hour worth of blocks (${blocksPerHour})`);
                        console.log(`estimated ${processBlocksPerDay} minutes to process 1 day worth of blocks (${blocksPerDay})`);
                        const used = process.memoryUsage().heapUsed / 1024 / 1024;
                        console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
                        await this.restartWorker();
                    }
                });
            }
        }
        catch (e) {
            console.log(e);
            await connection_1.connection.rollback();
        }
    }
    static async restartWorker() {
        const method = "restartWorker";
        if (tools_1.tools.lesserThan(worker_block.blocksToProcess, 0)) {
            throw new Error(`${method} unexpected worker_block.blocksToProcess ${worker_block.blocksToProcess} < 0`);
        }
        if (worker_block.blocksToProcess === 0) {
            this.log(`committing and restarting worker...`, method);
            await tools_1.tools.sleep(1000);
            setImmediate(() => {
                worker_block.run().finally();
            });
        }
        else {
            this.log(`not time to restart worker, ${this.blocksToProcess} blocks remaining to be processed`, method);
        }
    }
    static async getBlockSingleFlight(blockNumber) {
        const method = "getBlockSingleFlight";
        const blockNumberAsHex = tools_1.tools.convertNumberToHex(blockNumber);
        this.log(`retrieving single flight block of ${blockNumber} as ${blockNumberAsHex}`, method);
        const response = await (new Promise((resolve, reject) => {
            web3_rpc_web3_1.web3_rpc_web3.getWeb3Provider().send({ jsonrpc: "2.0", method: "qn_getBlockWithReceipts", params: [blockNumberAsHex] }, (error, result) => {
                if (error) {
                    reject(error);
                }
                if (result) {
                    resolve(result);
                }
            });
        }));
        const decodedResponse = worker_blocks_tools_1.worker_blocks_tools.getSingleFlightBlockResult(response);
        if (decodedResponse) {
            return decodedResponse;
        }
        const decodedError = worker_blocks_tools_1.worker_blocks_tools.getSingleFlightError(response);
        if (decodedError) {
            this.log(`...response for blockNum ${blockNumber}`, method);
            this.log(`...error ${decodedError.code} ${decodedError.msg}, retrying...`, method);
            await tools_1.tools.sleep(250);
            return this.getBlockSingleFlight(blockNumber);
        }
        else {
            this.log(`unexpected return from rpc, retrying...`, method);
            await tools_1.tools.sleep(250);
            return this.getBlockSingleFlight(blockNumber);
        }
    }
}
exports.worker_block = worker_block;
//endregion CONFIG
//region INIT
worker_block.blocksToProcess = 0;
if (process_1.argv.includes("run_worker_block")) {
    console.log(`running worker to process blocks`);
    worker_block.run().finally();
}
//# sourceMappingURL=worker_block.js.map