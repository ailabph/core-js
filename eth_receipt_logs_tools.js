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
exports.eth_receipt_logs_tools = void 0;
const assert_1 = require("./assert");
const eth_receipt_1 = require("./build/eth_receipt");
const eth_worker_1 = require("./eth_worker");
const eth_receipt_logs_1 = require("./build/eth_receipt_logs");
const eth_log_decoder_1 = require("./eth_log_decoder");
const tools_1 = require("./tools");
const eth_config_1 = require("./eth_config");
class eth_receipt_logs_tools {
    static getReceiptLogs(txn_hash) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
        return __awaiter(this, void 0, void 0, function* () {
            assert_1.assert.inTransaction();
            assert_1.assert.notEmpty(txn_hash, "txn_hash");
            let receipt_db = new eth_receipt_1.eth_receipt();
            receipt_db.transactionHash = txn_hash;
            yield receipt_db.fetch();
            if (receipt_db.isNew()) {
                console.log(`hash:${txn_hash} receipt not on db, retrieving in rpc...`);
                const receipt = yield eth_worker_1.eth_worker.getReceiptByTxnHashWeb3(txn_hash);
                receipt_db.blockHash = receipt.blockHash;
                receipt_db.blockNumber = receipt.blockNumber;
                receipt_db.contractAddress = (_a = receipt.contractAddress) !== null && _a !== void 0 ? _a : "";
                receipt_db.cumulativeGasUsed = receipt.cumulativeGasUsed.toString();
                receipt_db.fromAddress = receipt.from;
                receipt_db.gasUsed = receipt.gasUsed.toString();
                receipt_db.logsBloom = receipt.logsBloom;
                receipt_db.status = receipt.status ? "true" : "false";
                receipt_db.toAddress = receipt.to;
                receipt_db.transactionHash = receipt.transactionHash;
                receipt_db.transactionIndex = receipt.transactionIndex;
                yield receipt_db.save();
                let logCheck = new eth_receipt_logs_1.eth_receipt_logs();
                yield logCheck.list(" WHERE receipt_id=:receipt_id ", { receipt_id: receipt_db.id });
                if (logCheck.count() > 0)
                    throw new Error(`logs already set for receipt id:${receipt_db.id} txn_hash:${receipt_db.transactionHash}`);
                for (let i = 0; i < receipt.logs.length; i++) {
                    const log = receipt.logs[i];
                    let logs_db = new eth_receipt_logs_1.eth_receipt_logs();
                    logs_db.receipt_id = receipt_db.id;
                    logs_db.txn_hash = log.transactionHash;
                    logs_db.address = log.address;
                    logs_db.topics = JSON.stringify(log.topics);
                    logs_db.data = log.data;
                    logs_db.blockNumber = log.blockNumber;
                    logs_db.transactionHash = log.transactionHash;
                    logs_db.transactionIndex = log.transactionIndex;
                    logs_db.blockHash = log.blockHash;
                    logs_db.logIndex = log.logIndex;
                    yield logs_db.save();
                }
                return eth_receipt_logs_tools.getReceiptLogs(txn_hash);
            }
            else {
                let receipt = {
                    blockHash: (_b = receipt_db.blockHash) !== null && _b !== void 0 ? _b : "",
                    blockNumber: (_c = receipt_db.blockNumber) !== null && _c !== void 0 ? _c : 0,
                    contractAddress: (_d = receipt_db.contractAddress) !== null && _d !== void 0 ? _d : "",
                    cumulativeGasUsed: parseFloat((_e = receipt_db.cumulativeGasUsed) !== null && _e !== void 0 ? _e : "0"),
                    events: {},
                    from: (_f = receipt_db.fromAddress) !== null && _f !== void 0 ? _f : "",
                    gasUsed: parseFloat((_g = receipt_db.gasUsed) !== null && _g !== void 0 ? _g : "0"),
                    logs: [],
                    logsBloom: (_h = receipt_db.logsBloom) !== null && _h !== void 0 ? _h : "",
                    status: ((_j = receipt_db.status) !== null && _j !== void 0 ? _j : "false") === "true",
                    to: (_k = receipt_db.toAddress) !== null && _k !== void 0 ? _k : "",
                    transactionHash: (_l = receipt_db.transactionHash) !== null && _l !== void 0 ? _l : "",
                    transactionIndex: (_m = receipt_db.transactionIndex) !== null && _m !== void 0 ? _m : 0
                };
                let logs = new eth_receipt_logs_1.eth_receipt_logs();
                yield logs.list(" WHERE receipt_id=:receipt_id ", { receipt_id: receipt_db.id });
                let log = new eth_receipt_logs_1.eth_receipt_logs();
                while (log = logs.getItem()) {
                    let topic_log = {
                        address: (_o = log.address) !== null && _o !== void 0 ? _o : "",
                        blockHash: (_p = log.blockHash) !== null && _p !== void 0 ? _p : "",
                        blockNumber: (_q = log.blockNumber) !== null && _q !== void 0 ? _q : 0,
                        data: (_r = log.data) !== null && _r !== void 0 ? _r : "",
                        logIndex: (_s = log.logIndex) !== null && _s !== void 0 ? _s : 0,
                        topics: JSON.parse((_t = log.topics) !== null && _t !== void 0 ? _t : "[]"),
                        transactionHash: (_u = log.transactionHash) !== null && _u !== void 0 ? _u : "",
                        transactionIndex: (_v = log.transactionIndex) !== null && _v !== void 0 ? _v : 0
                    };
                    receipt.logs.push(topic_log);
                }
                return { receipt: receipt, result: [] };
            }
        });
    }
    static getFirstTopicLog(txn_hash) {
        return __awaiter(this, void 0, void 0, function* () {
            const analyzeLogsResult = typeof txn_hash === "string" ? yield eth_receipt_logs_tools.getReceiptLogs(txn_hash) : txn_hash;
            // if(analyzeLogsResult.receipt.logs.length === 0) throw new Error(`transaction(${txn_hash}) has no log topics`);
            return yield eth_log_decoder_1.eth_log_decoder.decodeLog(analyzeLogsResult.receipt.logs[0]);
        });
    }
    static getLastTopicLog(txn_hash) {
        return __awaiter(this, void 0, void 0, function* () {
            const analyzeLogsResult = typeof txn_hash === "string" ? yield eth_receipt_logs_tools.getReceiptLogs(txn_hash) : txn_hash;
            if (analyzeLogsResult.receipt.logs.length === 0)
                throw new Error(`transaction(${txn_hash}) has no log topics`);
            return yield eth_log_decoder_1.eth_log_decoder.decodeLog(analyzeLogsResult.receipt.logs[analyzeLogsResult.receipt.logs.length - 1]);
        });
    }
    static getFirstLogByMethod(txn_hash, method_name, strict = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const analyzeLogsResult = typeof txn_hash === "string" ? yield eth_receipt_logs_tools.getReceiptLogs(txn_hash) : txn_hash;
            // if(analyzeLogsResult.receipt.logs.length === 0) throw new Error(`transaction(${txn_hash}) has no log topics`);
            for (const log of analyzeLogsResult.receipt.logs) {
                const decodedLog = yield eth_log_decoder_1.eth_log_decoder.decodeLog(log);
                if (decodedLog.method_name.toLowerCase() === method_name.toLowerCase()) {
                    return decodedLog;
                }
            }
            if (strict)
                throw new Error(`hash:${analyzeLogsResult.receipt.transactionHash} unable to find log:${method_name}`);
            return false;
        });
    }
    static getFirstUserTransferInLogs(txn_hash, from) {
        return __awaiter(this, void 0, void 0, function* () {
            const transferLogs = yield eth_receipt_logs_tools.getLogsByMethod(txn_hash, "transfer");
            let to_return;
            for (const transfer of transferLogs) {
                if (from.toLowerCase() === transfer.from.toLowerCase()) {
                    to_return = transfer;
                    break;
                }
            }
            if (typeof to_return === "undefined") {
                throw new Error(`unable to retrieve transfer from:${from}`);
            }
            return to_return;
        });
    }
    static getLastLogByMethod(txn_hash, method_name, strict = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const analyzeLogsResult = typeof txn_hash === "string" ? yield eth_receipt_logs_tools.getReceiptLogs(txn_hash) : txn_hash;
            // if(analyzeLogsResult.receipt.logs.length === 0) throw new Error(`transaction(${txn_hash}) has no log topics`);
            let to_return = false;
            for (const log of analyzeLogsResult.receipt.logs) {
                const decodedLog = yield eth_log_decoder_1.eth_log_decoder.decodeLog(log);
                if (decodedLog.method_name.toLowerCase() === method_name.toLowerCase()) {
                    to_return = decodedLog;
                }
            }
            if (!to_return && strict)
                throw new Error(`hash:${analyzeLogsResult.receipt.transactionHash} unable to find log:${method_name}`);
            return to_return ? to_return : false;
        });
    }
    static getLogsByMethod(txn_hash, method_name, strict = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const analyzeLogsResult = typeof txn_hash === "string" ? yield eth_receipt_logs_tools.getReceiptLogs(txn_hash) : txn_hash;
            if (analyzeLogsResult.receipt.status
                && analyzeLogsResult.receipt.logs.length === 0) {
                const error_msg = `transaction(${txn_hash}) has no log topics`;
                // if(strict) throw new Error(error_msg);
                console.warn(error_msg);
            }
            let collection = [];
            for (const log of analyzeLogsResult.receipt.logs) {
                const decodedLog = yield eth_log_decoder_1.eth_log_decoder.decodeLog(log);
                if (decodedLog.method_name.toLowerCase() === method_name.toLowerCase()) {
                    collection.push(decodedLog);
                }
            }
            if (collection.length === 0 && strict)
                throw new Error(`no logs found for method:${method_name} in hash:${analyzeLogsResult.receipt.transactionHash}`);
            return collection;
        });
    }
    static findValueInLogs(txn_hash, find_value) {
        return __awaiter(this, void 0, void 0, function* () {
            assert_1.assert.notEmpty(find_value);
            const analyzeLogsResult = typeof txn_hash === "string" ? yield eth_receipt_logs_tools.getReceiptLogs(txn_hash) : txn_hash;
            let receipt = yield eth_worker_1.eth_worker.getReceiptByTxnHash(analyzeLogsResult.receipt.transactionHash);
            for (const log of receipt.logs) {
                for (const key in log) {
                    const value = log[key];
                    if (tools_1.tools.stringFoundInStringOrArray(value, find_value)) {
                        return true;
                    }
                }
            }
            return false;
        });
    }
    static findTokenInLogs(txn_hash) {
        return __awaiter(this, void 0, void 0, function* () {
            const findTokenContract = eth_worker_1.eth_worker.stripBeginningZeroXFromString(eth_config_1.eth_config.getTokenContract());
            return yield eth_receipt_logs_tools.findValueInLogs(txn_hash, findTokenContract);
        });
    }
    static getTransferTokenFrom(txn_hash, from) {
        return __awaiter(this, void 0, void 0, function* () {
            const transfers = yield eth_receipt_logs_tools.getLogsByMethod(txn_hash, "transfer");
            let foundTransfers = [];
            for (const transfer of transfers) {
                if (transfer.from.toLowerCase() === from.toLowerCase() && transfer.ContractInfo.address.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                    foundTransfers.push(transfer);
                }
            }
            return foundTransfers;
        });
    }
    static getFirstTransferFrom(txn_hash, from) {
        return __awaiter(this, void 0, void 0, function* () {
            const transfers = yield eth_receipt_logs_tools.getLogsByMethod(txn_hash, "transfer");
            for (const transfer of transfers) {
                if (transfer.from.toLowerCase() === from.toLowerCase())
                    return transfer;
            }
            return false;
        });
    }
}
exports.eth_receipt_logs_tools = eth_receipt_logs_tools;
