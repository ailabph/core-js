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
const eth_block_1 = require("./build/eth_block");
const eth_worker_1 = require("./eth_worker");
const eth_transaction_1 = require("./build/eth_transaction");
const ailab_core_1 = require("./ailab-core");
let batchLimit = 50;
let callLimit = 50;
console.log("running worker to update transactions from blocks");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield ailab_core_1.connection.startTransaction();
        try {
            let avgApiCallPerSec = 0;
            let totalApiCalls = 0;
            let calls = {};
            let blocks = new eth_block_1.eth_block();
            let txnAdded = 0;
            let txnSkipped = 0;
            yield blocks.list(" WHERE time_txn_retrieved IS NULL ", [], " ORDER BY blockNumber ASC LIMIT " + batchLimit);
            if (blocks.count() > 0) {
                let fromBlock = blocks._dataList[0];
                let toBlock = blocks._dataList[blocks.count() - 1];
                console.log(`blocks to process:${blocks.count()} from:${fromBlock.blockNumber} to:${toBlock.blockNumber}`);
                let current_block = new eth_block_1.eth_block();
                while (current_block = blocks.getItem()) {
                    let current_time = ailab_core_1.tools.getCurrentTimeStamp();
                    current_time = "time_" + current_time;
                    if (typeof calls[current_time] === "undefined") {
                        calls[current_time] = 0;
                    }
                    calls[current_time]++;
                    let transactions = yield eth_worker_1.eth_worker.getTxnByBlockNumber(current_block.blockNumber);
                    console.log(`${transactions.transactions.length} transactions found in block:${current_block.blockNumber}`);
                    for (let i = 0; i < transactions.transactions.length; i++) {
                        let t = transactions.transactions[i];
                        let new_t = new eth_transaction_1.eth_transaction();
                        new_t.hash = t.hash;
                        yield new_t.fetch();
                        if (new_t._isNew) {
                            new_t.blockHash = t.blockHash;
                            new_t.blockNumber = t.blockNumber;
                            new_t.fromAddress = t.from;
                            new_t.gas = eth_worker_1.eth_worker.convertValueToAmount(t.gas, 18);
                            new_t.gasPrice = t.gasPrice;
                            new_t.input = t.input;
                            new_t.nonce = t.nonce;
                            new_t.toAddress = t.to;
                            new_t.value = t.value;
                            // new_t.type = t.type;
                            // new_t.chainId = t.chainId;
                            // new_t.v = t.v;
                            // new_t.r = t.r;
                            // new_t.s = t.s;
                            // let start = Date.now();
                            yield new_t.save();
                            // let stop = Date.now();
                            // console.log("db save finished in %s ms",(stop-start));
                            // console.log("...added txn:%s",new_t.hash);
                            txnAdded++;
                        }
                        else {
                            console.log("...skip, record exist for txn:%s", new_t.hash);
                            txnSkipped++;
                        }
                    }
                    current_block.blockHash = transactions.hash;
                    current_block.time_txn_retrieved = ailab_core_1.tools.getCurrentTimeStamp();
                    yield current_block.save();
                    console.log("...updated block info");
                }
            }
            let timeOut = 1000;
            if (avgApiCallPerSec < callLimit) {
                timeOut = 100;
            }
            yield new Promise((r) => { setTimeout(run, timeOut); });
            yield ailab_core_1.connection.commit();
        }
        catch (e) {
            console.log(`ERROR:`);
            console.log(e);
            yield ailab_core_1.connection.rollback();
        }
    });
}
run().finally();
