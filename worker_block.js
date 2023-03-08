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
const time_helper_1 = require("./time_helper");
const eth_block_1 = require("./build/eth_block");
const eth_transaction_1 = require("./build/eth_transaction");
const eth_receipt_1 = require("./build/eth_receipt");
const eth_receipt_logs_1 = require("./build/eth_receipt_logs");
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
                        // const web3Logs = worker_blocks_tools.getLogsArray(blockInfo.result.receipts);
                        // await eth_receipt_logs_tools.analyzeLogsInvolvement(web3Logs)
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
                        await worker_block.restartWorker();
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
    //region RPC
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
    static async run2() {
        await connection_1.connection.startTransaction();
        console.time('run2');
        const startBlock = 25285657;
        const limit = worker_block.batchLimit;
        const endBlock = startBlock + limit;
        for (let block = startBlock; block < endBlock; block++) {
            const block_res = await worker_block.getBlockSingleFlight(block);
            if (block_res) {
                console.log(`block ${block} txns ${block_res.result.block.transactions.length}`);
            }
        }
        console.timeEnd('run2');
        await connection_1.connection.rollback();
    }
    static async run3() {
        await connection_1.connection.startTransaction();
        console.time('run2');
        const start = performance.now();
        const startBlock = 25285657;
        const limit = worker_block.batchLimit;
        const endBlock = startBlock + limit;
        worker_block.remaining = limit;
        for (let block = startBlock; block < endBlock; block++) {
            console.log(`retrieving block info ${block}`);
            await tools_1.tools.sleep(10);
            worker_block.getBlockSingleFlight(block).then((block_res) => {
                console.log(`remaining ${--worker_block.remaining} block ${block_res.result.block.number} txns ${block_res.result.block.transactions.length}`);
                const dbBlock = new eth_block_1.eth_block();
                if (typeof block_res.result.block.number === "string") {
                }
                if (worker_block.remaining === 0) {
                    const end = performance.now();
                    const elapsed = (end - start) / 1000;
                    console.timeEnd('run2');
                    const batchPerDay = worker_block.estimatedBlocksPerDay / worker_block.batchLimit;
                    const totalSecPerDay = batchPerDay * elapsed;
                    const totalSecPerMonth = totalSecPerDay * 30;
                    const totalSecPerYear = totalSecPerMonth * 12;
                    console.log(`completed in ${elapsed.toFixed(3)}s Est per month: ${time_helper_1.time_helper.formatSeconds(totalSecPerMonth)} | Est per year: ${time_helper_1.time_helper.formatSeconds(totalSecPerYear)}`);
                }
            });
        }
        await connection_1.connection.rollback();
    }
    static async run4() {
        for (let x = 0; x < 1000; x++) {
            worker_block.testGetBlock().then((block_num) => {
                console.log(block_num);
            });
        }
    }
    static async testGetBlock() {
        // await tools.sleep(3000);
        // return worker_block.getNextBlock();
    }
    static getNextBlock() {
        if (++worker_block.currentBlock < worker_block.stopOnBlock) {
            return worker_block.currentBlock;
        }
        return false;
    }
    static async run5() {
        console.time('run5');
        const start = performance.now();
        let hasEnded = false;
        worker_block.blocksTimeStamp[0] = 0;
        worker_block.currentBlock = 25285657 - 3000;
        const worker_limit = 50;
        // launch workers
        for (let queue_id = 1; queue_id <= worker_limit; queue_id++) {
            await tools_1.tools.sleep(20);
            worker_block.retrieveBlockInfo(queue_id).then(() => {
                if (hasEnded)
                    return;
                if (this.currentBlock >= this.stopOnBlock) {
                    hasEnded = true;
                    const end = performance.now();
                    const elapsed = (end - start) / 1000;
                    console.timeEnd('run5');
                    const batchPerDay = worker_block.estimatedBlocksPerDay / worker_block.blocksProcessed;
                    const totalSecPerDay = batchPerDay * elapsed;
                    const totalSecPerMonth = totalSecPerDay * 30;
                    const totalSecPerYear = totalSecPerMonth * 12;
                    console.log(`${worker_block.blocksProcessed} blocks completed in ${elapsed.toFixed(3)}s Est per month: ${time_helper_1.time_helper.formatSeconds(totalSecPerMonth)} | Est per year: ${time_helper_1.time_helper.formatSeconds(totalSecPerYear)}`);
                }
            });
        }
    }
    static async retrieveBlockInfo(queue_id) {
        const blockToProcess = worker_block.getNextBlock();
        if (blockToProcess) {
            worker_block.blocksProcessed++;
            console.log(`${queue_id} retrieving block ${blockToProcess}`);
            if (typeof worker_block.blocksTimeStamp[blockToProcess] === "number") {
                throw new Error(`clash in block number ${blockToProcess}`);
            }
            worker_block.blocksTimeStamp[blockToProcess] = 0;
            const blockRes = await worker_block.getBlockSingleFlight(blockToProcess);
            worker_block.blocksTimeStamp[blockToProcess] = blockRes.result.block.timestamp;
            await tools_1.tools.sleep(15);
            return worker_block.retrieveBlockInfo(queue_id);
        }
        else {
            // console.log(`${queue_id} done`);
        }
    }
    static async run6() {
        console.time('run6');
        const start = performance.now();
        await connection_1.connection.startTransaction();
        worker_block.blocksProcessed6 = 0;
        worker_block.blockNumberTimestamp6 = {};
        worker_block.latestBlock6 = await eth_worker_1.eth_worker.getLatestBlockWeb3();
        worker_block.currentBlock6 = await eth_worker_1.eth_worker.getLatestBlock();
        let endCount = 0;
        let height = worker_block.latestBlock6 - worker_block.currentBlock6;
        if (height > worker_block.batchLimit6) {
            worker_block.latestBlock6 = worker_block.currentBlock6 + worker_block.batchLimit6;
        }
        height = worker_block.latestBlock6 - worker_block.currentBlock6;
        console.log(`latest block on chain ${worker_block.latestBlock6} | latest block on db ${worker_block.currentBlock6} | height ${height}`);
        try {
            for (let queue_id = 1; queue_id <= worker_block.workerLimit6; queue_id++) {
                await tools_1.tools.sleep(worker_block.workerWaitTimeMs);
                worker_block.retrieveBlockInfo6(queue_id).then(async () => {
                    if (++endCount < worker_block.workerLimit6)
                        return;
                    await connection_1.connection.commit();
                    //region PERFORMANCE INFO
                    const end = performance.now();
                    const elapsed = (end - start) / 1000;
                    console.timeEnd('run6');
                    const batchPerDay = worker_block.estimatedBlocksPerDay / worker_block.blocksProcessed6;
                    const totalSecPerDay = batchPerDay * elapsed;
                    const totalSecPerMonth = totalSecPerDay * 30;
                    const totalSecPerYear = totalSecPerMonth * 12;
                    console.log(`${worker_block.blocksProcessed6} blocks completed in ${elapsed.toFixed(3)}s Est per month: ${time_helper_1.time_helper.formatSeconds(totalSecPerMonth)} | Est per year: ${time_helper_1.time_helper.formatSeconds(totalSecPerYear)}`);
                    //endregion PERFORMANCE INFO
                    await tools_1.tools.sleep(250);
                    setImmediate(() => {
                        return worker_block.run6();
                    });
                });
            }
        }
        catch (e) {
            await connection_1.connection.rollback();
            const errorMsg = e instanceof Error ? e.message : "unknown_error";
            console.log(`ERROR ${errorMsg}`);
        }
    }
    static getNextBlock6() {
        if (++worker_block.currentBlock6 < worker_block.latestBlock6) {
            return worker_block.currentBlock6;
        }
        return false;
    }
    static async retrieveBlockInfo6(queue_id) {
        const blockToProcess = worker_block.getNextBlock6();
        if (blockToProcess) {
            if (typeof worker_block.blockNumberTimestamp6[blockToProcess] === "number") {
                throw new Error(`clash in block number ${blockToProcess}`);
            }
            worker_block.blockNumberTimestamp6[blockToProcess] = 0;
            const blockRes = await worker_block.getBlockSingleFlight(blockToProcess);
            if (blockRes.result.block.number === null) {
                throw new Error(`returned info from rpc has no block number (block to process ${blockToProcess})`);
            }
            // add block
            const newBlock = new eth_block_1.eth_block();
            // newBlock.blockNumber = blockRes.result.block.number;
            // await newBlock.fetch();
            // if(newBlock.recordExists()){
            //     throw new Error(`${blockToProcess} already on db`);
            // }
            newBlock.blockNumber = blockRes.result.block.number;
            newBlock.blockHash = blockRes.result.block.hash;
            newBlock.time_added = blockRes.result.block.timestamp;
            await newBlock.save();
            // add transaction
            for (const transaction of blockRes.result.block.transactions) {
                const newTxn = new eth_transaction_1.eth_transaction();
                // newTxn.hash = transaction.hash;
                // await newTxn.fetch();
                // if(newTxn.recordExists()) throw new Error(`${blockToProcess} ${transaction.hash} already on db`);
                newTxn.hash = transaction.hash;
                newTxn.blockHash = transaction.blockHash;
                newTxn.blockNumber = transaction.blockNumber;
                newTxn.blockTime = blockRes.result.block.timestamp;
                newTxn.fromAddress = transaction.from;
                newTxn.gas = transaction.gas + "";
                newTxn.gasPrice = transaction.gasPrice + "";
                newTxn.input = transaction.input;
                newTxn.nonce = transaction.nonce;
                newTxn.toAddress = transaction.to;
                newTxn.value = transaction.value + "";
                newTxn.type = transaction.type;
                newTxn.chainId = transaction.chainId + "";
                newTxn.v = transaction.v + "";
                newTxn.r = transaction.r;
                newTxn.s = transaction.s;
                await newTxn.save();
            }
            // add receipt
            if (blockRes.result.receipts) {
                for (const receipt of blockRes.result.receipts) {
                    const newReceipt = new eth_receipt_1.eth_receipt();
                    // newReceipt.transactionHash = receipt.transactionHash;
                    // await newReceipt.fetch();
                    // if(newReceipt.recordExists()) throw new Error(`${blockToProcess} ${receipt.transactionHash} receipt already on db`);
                    newReceipt.blockHash = receipt.blockHash;
                    newReceipt.blockNumber = receipt.blockNumber;
                    newReceipt.contractAddress = receipt.contractAddress;
                    newReceipt.cumulativeGasUsed = receipt.cumulativeGasUsed + "";
                    newReceipt.effectiveGasPrice = receipt.effectiveGasPrice + "";
                    newReceipt.fromAddress = receipt.from;
                    newReceipt.gasUsed = receipt.gasUsed + "";
                    newReceipt.logsBloom = receipt.logsBloom;
                    newReceipt.status = receipt.status + "";
                    newReceipt.toAddress = receipt.to;
                    newReceipt.transactionHash = receipt.transactionHash;
                    newReceipt.type = receipt.type;
                    await newReceipt.save();
                    // add logs
                    for (const log of receipt.logs) {
                        const newLog = new eth_receipt_logs_1.eth_receipt_logs();
                        // newLog.transactionHash = log.transactionHash;
                        // newLog.logIndex = log.logIndex;
                        // await newLog.fetch();
                        // if(newLog.recordExists()) throw new Error(`block ${blockToProcess} logIndex ${log.logIndex} log already in db`);
                        newLog.receipt_id = newReceipt.id;
                        newLog.txn_hash = log.transactionHash;
                        newLog.address = log.address;
                        newLog.topics = JSON.stringify(log.topics);
                        newLog.data = log.data;
                        newLog.blockNumber = log.blockNumber;
                        newLog.timestamp = blockRes.result.block.timestamp + "";
                        newLog.transactionHash = log.transactionHash;
                        newLog.transactionIndex = log.transactionIndex;
                        newLog.blockHash = log.blockHash;
                        newLog.logIndex = log.logIndex;
                        newLog.removed = log.removed ? 1 : 0;
                        newLog.blockTime = blockRes.result.block.timestamp;
                        await newLog.save();
                    }
                }
            }
            worker_block.blockNumberTimestamp6[blockToProcess] = blockRes.result.block.timestamp;
            console.log(`${queue_id} | ${++worker_block.blocksProcessed6} | block ${blockRes.result.block.number} ${time_helper_1.time_helper.getAsFormat(blockRes.result.block.timestamp, time_helper_1.TIME_FORMATS.ISO)}`);
            await tools_1.tools.sleep(worker_block.workerWaitTimeMs);
            return worker_block.retrieveBlockInfo6(queue_id);
        }
    }
}
exports.worker_block = worker_block;
//endregion CONFIG
//region INIT
worker_block.blocksToProcess = 0;
//endregion RPC
//region TEST
worker_block.batchLimit = 100;
worker_block.remaining = 0;
worker_block.estimatedBlocksPerDay = 28800;
worker_block.currentBlock = 0;
worker_block.blocksTimeStamp = {};
worker_block.stopOnBlock = 25285657;
worker_block.blocksProcessed = 0;
worker_block.workerWaitTimeMs = 50;
worker_block.blocksProcessed6 = 0;
worker_block.currentBlock6 = 0;
worker_block.latestBlock6 = 0;
worker_block.batchLimit6 = 1000;
worker_block.workerLimit6 = 200;
worker_block.blockNumberTimestamp6 = {};
if (process_1.argv.includes("run_worker_block")) {
    console.log(`running worker to process blocks`);
    worker_block.run().finally();
}
if (process_1.argv.includes("run_worker_block_run2")) {
    console.log(`running worker to process blocks`);
    worker_block.run2().finally();
}
if (process_1.argv.includes("run_worker_block_run3")) {
    console.log(`running worker to process blocks`);
    worker_block.run3().finally();
}
if (process_1.argv.includes("run_worker_block_run4")) {
    console.log(`running worker to process blocks`);
    worker_block.run4().finally();
}
if (process_1.argv.includes("run_worker_block_run5")) {
    console.log(`running worker to process blocks`);
    worker_block.run5().finally();
}
if (process_1.argv.includes("run_worker_block_run6")) {
    console.log(`running worker to process blocks`);
    worker_block.run6().finally();
}
//# sourceMappingURL=worker_block.js.map