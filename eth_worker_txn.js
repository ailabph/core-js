"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_worker_txn = void 0;
const config_1 = require("./config");
const tools_1 = require("./tools");
const eth_config_1 = require("./eth_config");
const connection_1 = require("./connection");
const eth_block_1 = require("./build/eth_block");
const eth_worker_1 = require("./eth_worker");
const eth_transaction_1 = require("./build/eth_transaction");
class eth_worker_txn {
    static run() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!eth_worker_txn.hasRun) {
                eth_worker_txn.hasRun = true;
                console.log(`running txn worker on env:${config_1.config.getEnv()} rpc:${eth_config_1.eth_config.getRPCUrl()}`);
            }
            yield connection_1.connection.startTransaction();
            try {
                let lastBlockProcessed = -1;
                const latestBlock = yield eth_worker_1.eth_worker.getLatestBlock();
                // get unprocessed block
                let unprocessedBlock = new eth_block_1.eth_block();
                yield unprocessedBlock.list(" WHERE time_txn_retrieved IS NULL ", {}, ` ORDER BY blockNumber ASC LIMIT ${eth_worker_txn.getBatchLimit()} `);
                if (unprocessedBlock.count() > 0)
                    console.log(`${unprocessedBlock.count()} blocks to process found`);
                let totalTxnAddedUpdated = 0;
                for (const block of unprocessedBlock._dataList) {
                    if (!(block.time_added > 0))
                        throw new Error(`block time not available`);
                    // console.log(`retrieving transactions of block:${block.blockNumber} from rpc`);
                    const transactions = yield eth_worker_1.eth_worker.getTxnByBlockNumberWeb3(block.blockNumber);
                    // console.log(`${transactions.transactions.length} transactions found`);
                    for (const transaction of transactions.transactions) {
                        const newTxn = new eth_transaction_1.eth_transaction();
                        newTxn.hash = transaction.hash;
                        yield newTxn.fetch();
                        // insert txn if not on db
                        if (newTxn.isNew()) {
                            newTxn.loadValues(transaction, true);
                            newTxn.fromAddress = transaction.from;
                            newTxn.toAddress = transaction.to;
                            newTxn.blockTime = block.time_added;
                            yield newTxn.save();
                        }
                        // tag txn if involved
                        yield eth_worker_1.eth_worker.identifyInvolvement(newTxn);
                        totalTxnAddedUpdated++;
                        // console.log(`${block.blockNumber} ${transaction.hash} updated on db. token_found:${newTxn.token_found === "y"? "yes":"no"} is_swap:${newTxn.is_swap?"yes":"no"} method_name:${newTxn.method_name}`);
                    }
                    block.time_txn_retrieved = tools_1.tools.getCurrentTimeStamp();
                    yield block.save();
                    lastBlockProcessed = block.blockNumber;
                }
                lastBlockProcessed = lastBlockProcessed > 0 ? lastBlockProcessed : latestBlock;
                const height = latestBlock - lastBlockProcessed;
                if (totalTxnAddedUpdated > 0)
                    console.log(`${totalTxnAddedUpdated} transactions processed. last block:${lastBlockProcessed} latest block:${latestBlock} height:${height}`);
                yield connection_1.connection.commit();
            }
            catch (e) {
                yield connection_1.connection.rollback();
                console.log(e);
            }
            yield tools_1.tools.sleep(eth_worker_txn.waitMs());
            yield eth_worker_txn.run();
        });
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
