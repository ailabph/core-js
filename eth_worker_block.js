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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_worker_block = void 0;
const ailab_core_1 = require("./ailab-core");
const eth_block_1 = require("./build/eth_block");
const promises_1 = __importDefault(require("fs/promises"));
class eth_worker_block {
    static run() {
        var _a, e_1, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            if (!eth_worker_block.hasRun) {
                eth_worker_block.hasRun = true;
                console.log(`running block worker on env:${ailab_core_1.config.getEnv()} rpc:${ailab_core_1.eth_config.getRPCUrl()}`);
            }
            yield ailab_core_1.connection.startTransaction();
            try {
                // check if db empty, check for import csv
                let latestBlock = new eth_block_1.eth_block();
                yield latestBlock.list(" WHERE 1 ", {}, " ORDER BY blockNumber DESC LIMIT 1 ");
                if (latestBlock.count() === 0) {
                    // check import csv
                    console.log(`no block records found on db, checking if import.csv exists`);
                    if (!ailab_core_1.assert.fileExists("./import.csv", false)) {
                        console.log(`no import.csv file found`);
                    }
                    else {
                        const file = yield promises_1.default.open('./import.csv', 'r');
                        let blockNoIndex = -1, firstLine = true;
                        try {
                            // loop csv per line
                            for (var _d = true, _e = __asyncValues(file.readLines()), _f; _f = yield _e.next(), _a = _f.done, !_a;) {
                                _c = _f.value;
                                _d = false;
                                try {
                                    const line = _c;
                                    let newLine = line.replace(/(,)(?=(?:[^"]|"[^"]*")*$)/g, "|");
                                    newLine = newLine.replace(/"/g, "");
                                    newLine = newLine.replace(/,/g, "");
                                    const parts = newLine.split("|");
                                    // retrieve index for blockNo or blockNumber, throw error if not found
                                    if (firstLine) {
                                        for (let index1 = 0; index1 < parts.length; index1++) {
                                            const col_value = parts[index1].toLowerCase();
                                            if (["blockno", "blocknumber", "block_no", "block_number"].includes(col_value)) {
                                                blockNoIndex = index1;
                                            }
                                        }
                                        if (blockNoIndex < 0)
                                            throw new Error(`index for block number info not found`);
                                        if (firstLine)
                                            firstLine = false;
                                        continue;
                                    }
                                    // insert block info
                                    const blockNumber = parseInt(parts[blockNoIndex]);
                                    let newBlock = new eth_block_1.eth_block();
                                    newBlock.blockNumber = blockNumber;
                                    yield newBlock.fetch();
                                    if (newBlock.recordExists()) {
                                        console.log(`block ${blockNumber} already on db, skipping`);
                                        continue;
                                    }
                                    const web3BlockInfo = yield ailab_core_1.eth_worker.getBlockByNumberWeb3(blockNumber);
                                    newBlock.blockNumber = web3BlockInfo.number;
                                    newBlock.blockHash = web3BlockInfo.hash;
                                    newBlock.time_added = typeof web3BlockInfo.timestamp === "string" ? parseInt(web3BlockInfo.timestamp) : web3BlockInfo.timestamp;
                                    yield newBlock.save();
                                    console.log(`added new block:${newBlock.blockNumber} on db`);
                                }
                                finally {
                                    _d = true;
                                }
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                    }
                }
                else {
                    yield latestBlock.list(" WHERE 1 ", {}, " ORDER BY blockNumber DESC LIMIT 1 ");
                    const latest_block_number = yield ailab_core_1.eth_worker.getLatestBlockWeb3();
                    const last_block_number = latestBlock.count() > 0 ? latestBlock.getItem().blockNumber : 0;
                    const diff = latest_block_number - last_block_number;
                    if (diff > 0) {
                        const limit = diff > eth_worker_block.getBatchLimit() ? eth_worker_block.getBatchLimit() : diff;
                        let block_number_to_add = last_block_number;
                        for (let count1 = 0; count1 < limit; count1++, ++block_number_to_add) {
                            let newBlock = new eth_block_1.eth_block();
                            newBlock.blockNumber = block_number_to_add;
                            yield newBlock.fetch();
                            if (newBlock.recordExists()) {
                                // console.log(`block:${block_number_to_add} already on db, skipping...`);
                                continue;
                            }
                            const web3BlockInfo = yield ailab_core_1.eth_worker.getBlockByNumberWeb3(block_number_to_add);
                            newBlock.blockNumber = web3BlockInfo.number;
                            newBlock.blockHash = web3BlockInfo.hash;
                            newBlock.time_added = typeof web3BlockInfo.timestamp === "string" ? parseInt(web3BlockInfo.timestamp) : web3BlockInfo.timestamp;
                            yield newBlock.save();
                            console.log(`added new block:${newBlock.blockNumber} on db`);
                        }
                    }
                }
                yield ailab_core_1.connection.commit();
            }
            catch (e) {
                yield ailab_core_1.connection.rollback();
                console.log(e);
            }
            yield ailab_core_1.tools.sleep(eth_worker_block.waitMs());
            yield eth_worker_block.run();
        });
    }
    static waitMs() {
        const worker_wait_ms = ailab_core_1.config.getCustomOption("worker_wait_ms");
        if (ailab_core_1.tools.isNumeric(worker_wait_ms) && worker_wait_ms > 0) {
            return worker_wait_ms;
        }
        return ailab_core_1.eth_config.default_worker_wait_ms;
    }
    static getBatchLimit() {
        const batch_limit = ailab_core_1.config.getCustomOption("worker_block_batch");
        if (ailab_core_1.tools.isNumeric(batch_limit) && batch_limit > 0) {
            return batch_limit;
        }
        return ailab_core_1.eth_config.default_worker_batch;
    }
}
exports.eth_worker_block = eth_worker_block;
eth_worker_block.hasRun = false;
