"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_block = void 0;
const process_1 = require("process");
const web3_rpc_web3_1 = require("./web3_rpc_web3");
const tools_1 = require("./tools");
const config_1 = require("./config");
const worker_blocks_tools_1 = require("./worker_blocks_tools");
const eth_worker_1 = require("./eth_worker");
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
        return 150;
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
        // await connection.startTransaction();
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
                this.getBlockSingleFlight(blockNum).then((blockInfo) => {
                    --this.blocksToProcess;
                    this.log(`...${this.blocksToProcess}/${currentBatch} block ${blockInfo.result.block.number} txns ${blockInfo.result.block.transactions.length} receipts ${blockInfo.result.receipts ? blockInfo.result.receipts.length : 0} ${blockInfo.result.block.timestamp}`, method, false, true);
                    // this.restartWorker();
                });
            }
        }
        catch (e) {
            console.log(e);
        }
        /*
        process:
        blocks
        from = get last block on db + 1
        to = get latest block
        to = to > limit ? limit : to;

        loop from to
            process++
        single flight block
        scan logs

        if process is zero restart
         */
    }
    static async restartWorker() {
        const method = "restartWorker";
        if (tools_1.tools.lesserThan(worker_block.blocksToProcess, 0)) {
            throw new Error(`${method} unexpected worker_block.blocksToProcess ${worker_block.blocksToProcess} < 0`);
        }
        if (worker_block.blocksToProcess === 0) {
            this.log(`restarting worker...`, method);
            await tools_1.tools.sleep(1000);
            setImmediate(() => {
                this.run();
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