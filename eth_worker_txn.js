"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_worker_txn = void 0;
const config_1 = require("./config");
const tools_1 = require("./tools");
const eth_config_1 = require("./eth_config");
const connection_1 = require("./connection");
const eth_worker_1 = require("./eth_worker");
const eth_block_1 = require("./build/eth_block");
const eth_transaction_1 = require("./build/eth_transaction");
class eth_worker_txn {
    static async run() {
        if (!eth_worker_txn.hasRun) {
            eth_worker_txn.hasRun = true;
            console.log(`running txn worker on env:${config_1.config.getEnv()} rpc:${eth_config_1.eth_config.getRPCUrl()}`);
        }
        await connection_1.connection.startTransaction();
        try {
            let lastBlockProcessed = -1;
            const latestBlock = await eth_worker_1.eth_worker.getLatestBlock();
            // get unprocessed block
            let unprocessedBlock = new eth_block_1.eth_block();
            await unprocessedBlock.list(" WHERE time_txn_retrieved IS NULL ", {}, ` ORDER BY blockNumber ASC LIMIT ${eth_worker_txn.getBatchLimit()} `);
            if (unprocessedBlock.count() > 0)
                console.log(`${unprocessedBlock.count()} blocks to process found`);
            let totalTxnAddedUpdated = 0;
            for (const block of unprocessedBlock._dataList) {
                if (!(block.time_added > 0))
                    throw new Error(`block time not available`);
                // console.log(`retrieving transactions of block:${block.blockNumber} from rpc`);
                const transactions = await eth_worker_1.eth_worker.getTxnByBlockNumberWeb3(block.blockNumber);
                // console.log(`${transactions.transactions.length} transactions found`);
                for (const transaction of transactions.transactions) {
                    const newTxn = new eth_transaction_1.eth_transaction();
                    newTxn.hash = transaction.hash;
                    await newTxn.fetch();
                    // insert txn if not on db
                    if (newTxn.isNew()) {
                        newTxn.loadValues(transaction, true);
                        newTxn.fromAddress = transaction.from;
                        newTxn.toAddress = transaction.to;
                        newTxn.blockTime = block.time_added;
                        await newTxn.save();
                    }
                    // tag txn if involved
                    await eth_worker_1.eth_worker.identifyInvolvement(newTxn);
                    totalTxnAddedUpdated++;
                    // console.log(`${block.blockNumber} ${transaction.hash} updated on db. token_found:${newTxn.token_found === "y"? "yes":"no"} is_swap:${newTxn.is_swap?"yes":"no"} method_name:${newTxn.method_name}`);
                }
                block.time_txn_retrieved = tools_1.tools.getCurrentTimeStamp();
                await block.save();
                lastBlockProcessed = block.blockNumber;
            }
            lastBlockProcessed = lastBlockProcessed > 0 ? lastBlockProcessed : latestBlock;
            const height = latestBlock - lastBlockProcessed;
            if (totalTxnAddedUpdated > 0)
                console.log(`${totalTxnAddedUpdated} transactions processed. last block:${lastBlockProcessed} latest block:${latestBlock} height:${height}`);
            await connection_1.connection.commit();
        }
        catch (e) {
            await connection_1.connection.rollback();
            console.log(e);
        }
        await tools_1.tools.sleep(eth_worker_txn.waitMs());
        await eth_worker_txn.run();
    }
    static waitMs() {
        const worker_wait_ms = config_1.config.getCustomOption("worker_wait_ms");
        if (tools_1.tools.isNumeric(worker_wait_ms) && worker_wait_ms > 0) {
            return worker_wait_ms;
        }
        return eth_config_1.eth_config.default_worker_wait_ms;
    }
    static getBatchLimit() {
        const batch_limit = config_1.config.getCustomOption("worker_txn_batch");
        if (tools_1.tools.isNumeric(batch_limit) && batch_limit > 0) {
            return batch_limit;
        }
        return eth_config_1.eth_config.default_worker_batch;
    }
}
exports.eth_worker_txn = eth_worker_txn;
eth_worker_txn.hasRun = false;
//# sourceMappingURL=eth_worker_txn.js.map