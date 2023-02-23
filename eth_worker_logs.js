"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_worker_logs = void 0;
const assert_1 = require("./assert");
const config_1 = require("./config");
const connection_1 = require("./connection");
const eth_receipt_logs_tools_1 = require("./eth_receipt_logs_tools");
const eth_worker_1 = require("./eth_worker");
const tools_1 = require("./tools");
const eth_transaction_known_1 = require("./build/eth_transaction_known");
const process_1 = require("process");
const blocksToProcess = getBlocksToProcess();
const blockConfirmation = 8;
const updatedWaitTimeSeconds = 2;
let totalErrors = 0;
let lastBlockProcessed = 0;
let latestBlock = 0;
let adjustedToBlock = 0;
class eth_worker_logs {
    static async run() {
        // check if known has records tim_processed = null
        await connection_1.connection.startTransaction();
        const startTime = tools_1.tools.getCurrentTimeStamp();
        let logsFound = 0;
        try {
            const unprocessedKnownTransactions = new eth_transaction_known_1.eth_transaction_known();
            await unprocessedKnownTransactions.list(" WHERE time_processed IS NULL ", {}, " ORDER BY blockNo ASC LIMIT 1");
            if (unprocessedKnownTransactions.count() > 0) {
                for (const known of unprocessedKnownTransactions._dataList) {
                    if (!(known.blockNo ?? 0 > 0)) {
                        const web3Transaction = await eth_worker_1.eth_worker.getTxnByHashWeb3(known.hash ?? "");
                        known.blockNo = web3Transaction.blockNumber;
                        await known.save();
                    }
                    const fromBlock = assert_1.assert.isNumber(known.blockNo, "blockNo", 0) - 1;
                    const toBlock = assert_1.assert.isNumber(known.blockNo, "blockNo", 0);
                    console.log(`processing known transactions for block:${known.blockNo} range from ${fromBlock} to ${toBlock}`);
                    const logs = await eth_worker_1.eth_worker.getLogsBetweenBlockNumbersViaRpc(fromBlock, toBlock);
                    await eth_receipt_logs_tools_1.eth_receipt_logs_tools.analyzeLogsInvolvement(logs);
                    known.time_processed = tools_1.tools.getCurrentTimeStamp();
                    await known.save();
                }
            }
            else {
                if (lastBlockProcessed === 0) {
                    lastBlockProcessed = await eth_worker_1.eth_worker.getLatestBlock();
                }
                latestBlock = await eth_worker_1.eth_worker.getLatestBlockWeb3();
                adjustedToBlock = latestBlock - blockConfirmation;
                let from_block = 0;
                let to_block = 0;
                if (lastBlockProcessed === adjustedToBlock) {
                    from_block = lastBlockProcessed;
                    to_block = lastBlockProcessed;
                }
                else {
                    from_block = lastBlockProcessed + 1;
                    to_block = from_block + blocksToProcess;
                    to_block = to_block > adjustedToBlock ? adjustedToBlock : to_block;
                }
                const height = latestBlock - from_block;
                console.log(`processing from last block Processed ${from_block} to ${to_block} height:${height}`);
                const logs = await eth_worker_1.eth_worker.getLogsBetweenBlockNumbersViaRpc(from_block, to_block);
                logsFound = logs.length;
                if (logs.length > 0) {
                    await eth_receipt_logs_tools_1.eth_receipt_logs_tools.analyzeLogsInvolvement(logs);
                    lastBlockProcessed = logs[logs.length - 1].blockNumber;
                }
                console.log(`processed blocks from ${from_block} to ${to_block} height:${height}`);
            }
            await connection_1.connection.commit();
            const endTime = tools_1.tools.getCurrentTimeStamp();
            const diff = endTime - startTime;
            const minutes = Math.floor(diff / 60);
            const minutesInSeconds = minutes * 60;
            const seconds = diff - minutesInSeconds;
            const blocksPerMinute = 20;
            const blocksPerHour = 1200;
            let processBlocksPerHour = blocksPerHour / blocksToProcess;
            processBlocksPerHour = processBlocksPerHour * diff;
            processBlocksPerHour = (processBlocksPerHour / 60).toFixed(2);
            const blocksPerDay = 28800;
            let processBlocksPerDay = blocksPerDay / blocksToProcess;
            processBlocksPerDay = processBlocksPerDay * diff;
            processBlocksPerDay = (processBlocksPerDay / 60).toFixed(2);
            console.log(`run time ${minutes} minutes ${seconds} seconds to process ${blocksToProcess} blocks`);
            console.log(`estimated ${processBlocksPerHour} minutes to process 1 hour worth of blocks (${blocksPerHour})`);
            console.log(`estimated ${processBlocksPerDay} minutes to process 1 day worth of blocks (${blocksPerDay})`);
            const used = process.memoryUsage().heapUsed / 1024 / 1024;
            console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
            console.log(`total errors:${totalErrors}`);
            if (unprocessedKnownTransactions.count() === 0 && lastBlockProcessed === adjustedToBlock) {
                console.log(`latest block reached, waiting ${updatedWaitTimeSeconds} seconds`);
                await tools_1.tools.sleep(updatedWaitTimeSeconds * 1000);
            }
            setImmediate(() => {
                eth_worker_logs.run();
            });
        }
        catch (e) {
            await connection_1.connection.rollback();
            totalErrors++;
            console.log(e);
            console.log(`rolled back changes on db. waiting ${updatedWaitTimeSeconds} seconds before trying again....`);
            await tools_1.tools.sleep(updatedWaitTimeSeconds * 1000);
            setImmediate(() => {
                eth_worker_logs.run();
            });
        }
    }
}
exports.eth_worker_logs = eth_worker_logs;
function getBlocksToProcess() {
    const config_blocksToProcess = config_1.config.getCustomOption("BLOCKS_TO_PROCESS");
    console.log(config_blocksToProcess);
    if (tools_1.tools.isNumeric(config_blocksToProcess)) {
        return assert_1.assert.positiveInt(config_blocksToProcess);
    }
    return 150;
}
if (process_1.argv.includes("run_eth_worker_logs")) {
    console.log(`running worker to process logs. batch limit ${blocksToProcess}`);
    eth_worker_logs.run().finally();
}
//# sourceMappingURL=eth_worker_logs.js.map