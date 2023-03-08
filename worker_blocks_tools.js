"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_blocks_tools = exports.ReceiptDecodedCodec = void 0;
const t = __importStar(require("io-ts"));
const d = __importStar(require("fp-ts/Either"));
const tools_1 = require("./tools");
const assert_1 = require("./assert");
//region TYPES
const SingleFlightErrorCodec = t.type({
    code: t.number,
    msg: t.string,
});
const TransactionsCodec = t.type({
    blockHash: t.string,
    blockNumber: t.string,
    from: t.string,
    gas: t.string,
    gasPrice: t.string,
    hash: t.string,
    input: t.string,
    nonce: t.string,
    to: t.union([t.null, t.string]),
    transactionIndex: t.union([t.null, t.string]),
    value: t.string,
    type: t.string,
    v: t.string,
    r: t.string,
    s: t.string,
    maxFeePerGas: t.string,
    maxPriorityFeePerGas: t.string,
    accessList: t.union([t.null, t.array(t.any)]),
    chainId: t.string,
});
const TransactionDecodedCodec = t.type({
    blockHash: t.string,
    blockNumber: t.number,
    from: t.string,
    gas: t.number,
    gasPrice: t.number,
    hash: t.string,
    input: t.string,
    nonce: t.number,
    to: t.union([t.null, t.string]),
    transactionIndex: t.union([t.null, t.number]),
    value: t.number,
    type: t.string,
    v: t.number,
    r: t.string,
    s: t.string,
    maxFeePerGas: t.number,
    maxPriorityFeePerGas: t.number,
    accessList: t.union([t.null, t.array(t.any)]),
    chainId: t.number,
});
const BlockCodec = t.type({
    baseFeePerGas: t.string,
    difficulty: t.string,
    extraData: t.string,
    gasLimit: t.string,
    gasUsed: t.string,
    hash: t.union([t.null, t.string]),
    logsBloom: t.union([t.null, t.string]),
    miner: t.string,
    mixHash: t.string,
    nonce: t.union([t.null, t.string]),
    number: t.union([t.null, t.string]),
    parentHash: t.string,
    receiptsRoot: t.string,
    sha3Uncles: t.string,
    size: t.string,
    stateRoot: t.string,
    timestamp: t.string,
    totalDifficulty: t.string,
    transactions: t.array(TransactionsCodec),
});
const BlockDecodedCodec = t.type({
    baseFeePerGas: t.number,
    difficulty: t.number,
    extraData: t.string,
    gasLimit: t.number,
    gasUsed: t.number,
    hash: t.union([t.null, t.string]),
    logsBloom: t.union([t.null, t.string]),
    miner: t.string,
    mixHash: t.string,
    nonce: t.union([t.null, t.string]),
    number: t.union([t.null, t.number]),
    parentHash: t.string,
    receiptsRoot: t.string,
    sha3Uncles: t.string,
    size: t.number,
    stateRoot: t.string,
    timestamp: t.number,
    totalDifficulty: t.number,
    transactions: t.array(TransactionDecodedCodec),
});
const LogCodec = t.type({
    address: t.string,
    topics: t.array(t.string),
    data: t.string,
    blockNumber: t.string,
    transactionHash: t.union([t.null, t.string]),
    transactionIndex: t.union([t.null, t.string]),
    blockHash: t.union([t.null, t.string]),
    logIndex: t.union([t.null, t.string]),
    removed: t.boolean,
});
const LogDecodedCodec = t.type({
    address: t.string,
    topics: t.array(t.string),
    data: t.string,
    blockNumber: t.number,
    transactionHash: t.union([t.null, t.string]),
    transactionIndex: t.union([t.null, t.number]),
    blockHash: t.union([t.null, t.string]),
    logIndex: t.union([t.null, t.number]),
    removed: t.boolean,
});
const ReceiptCodec = t.type({
    blockHash: t.union([t.null, t.string]),
    blockNumber: t.string,
    contractAddress: t.union([t.null, t.string]),
    cumulativeGasUsed: t.string,
    effectiveGasPrice: t.string,
    from: t.string,
    gasUsed: t.string,
    logs: t.array(LogCodec),
    logsBloom: t.string,
    status: t.string,
    to: t.union([t.null, t.string]),
    transactionHash: t.string,
    type: t.string,
});
const ReceiptDecodedCodec = t.type({
    blockHash: t.union([t.null, t.string]),
    blockNumber: t.number,
    contractAddress: t.union([t.null, t.string]),
    cumulativeGasUsed: t.number,
    effectiveGasPrice: t.number,
    from: t.string,
    gasUsed: t.number,
    logs: t.array(LogDecodedCodec),
    logsBloom: t.string,
    status: t.number,
    to: t.union([t.null, t.string]),
    transactionHash: t.string,
    type: t.string,
});
exports.ReceiptDecodedCodec = ReceiptDecodedCodec;
const SingleFlightBlockResultCodec = t.type({
    receipts: t.union([t.null, t.array(ReceiptCodec)]),
    block: BlockCodec
});
const SingleFlightBlockCodec = t.type({
    jsonrpc: t.string,
    // id:t.unknown,
    result: SingleFlightBlockResultCodec
});
//endregion TYPES
class worker_blocks_tools {
    static getSingleFlightError(response) {
        if (typeof response !== "object")
            return false;
        const decodedData = SingleFlightErrorCodec.decode(response);
        if (d.isRight(decodedData)) {
            return decodedData.right;
        }
        return false;
    }
    static getSingleFlightBlockResult(response) {
        if (typeof response !== "object")
            return false;
        const decodedData = SingleFlightBlockCodec.decode(response);
        if (d.isRight(decodedData)) {
            const blockInfo = decodedData.right;
            const receipts = [];
            if (blockInfo.result.receipts) {
                for (const receiptRaw of blockInfo.result.receipts) {
                    receipts.push(this.getReceiptDecoded(receiptRaw));
                }
            }
            return {
                jsonrpc: blockInfo.jsonrpc,
                result: {
                    block: this.getBlockDecoded(blockInfo.result.block),
                    receipts: blockInfo.result.receipts === null ? null : receipts,
                }
            };
        }
        return false;
    }
    static getBlockObject(response) {
        if (typeof response !== "object")
            return false;
        const decoded = BlockCodec.decode(response);
        if (d.isRight(decoded)) {
            return decoded.right;
        }
        return false;
    }
    static getTransactionsObject(value) {
        if (typeof value !== "object")
            return false;
        const decoded = TransactionsCodec.decode(value);
        if (d.isRight(decoded)) {
            return decoded.right;
        }
        return false;
    }
    static getReceiptObject(value) {
        if (typeof value !== "object")
            return false;
        const decoded = ReceiptCodec.decode(value);
        if (d.isRight(decoded)) {
            return decoded.right;
        }
        return false;
    }
    static getLogObject(value) {
        if (typeof value !== "object")
            return false;
        const decoded = LogCodec.decode(value);
        if (d.isRight(decoded)) {
            return decoded.right;
        }
        return false;
    }
    //region CONVERT
    static convertWeb3Log(log) {
        const method = "convertWeb3Log";
        return {
            address: log.address,
            blockHash: log.blockHash ?? "",
            blockNumber: assert_1.assert.positiveInt(log.blockNumber, `${method} log.blockNumber`),
            data: log.data,
            logIndex: assert_1.assert.positiveInt(log.logIndex ?? 0, `${method} log.logIndex`),
            topics: log.topics,
            transactionHash: (log.transactionHash ?? ""),
            transactionIndex: assert_1.assert.naturalNumber(log.transactionIndex ?? 0, `${method} log.transactionIndex`)
        };
    }
    static getLogsArray(receipts) {
        const logs = [];
        for (const receipt of receipts) {
            for (const log of receipt.logs) {
                logs.push(this.convertWeb3Log(log));
            }
        }
        return logs;
    }
    static getBlockDecoded(block) {
        const method = "getBlockDecoded";
        const blockNumber = block.number === null ? null : tools_1.tools.hexToNumber(block.number, `${method} block.number`);
        const transactions = [];
        for (const transactionRaw of block.transactions) {
            transactions.push(worker_blocks_tools.getTransactionDecoded(transactionRaw));
        }
        return {
            transactions: transactions,
            baseFeePerGas: tools_1.tools.hexToNumber(block.baseFeePerGas, `${method} block.baseFeePerGas`),
            difficulty: tools_1.tools.hexToNumber(block.difficulty, `${method} block.difficulty`),
            extraData: block.extraData,
            gasLimit: tools_1.tools.hexToNumber(block.gasLimit, `${method} block.gasLimit`),
            gasUsed: tools_1.tools.hexToNumber(block.gasUsed, `${method} block.gasUsed`),
            hash: block.hash,
            logsBloom: block.logsBloom,
            miner: block.miner,
            mixHash: block.mixHash,
            nonce: block.nonce,
            number: blockNumber,
            parentHash: block.parentHash,
            receiptsRoot: block.receiptsRoot,
            sha3Uncles: block.sha3Uncles,
            size: tools_1.tools.hexToNumber(block.size, `${method} block.size`),
            stateRoot: block.stateRoot,
            timestamp: tools_1.tools.hexToNumber(block.timestamp, `${method} block.timestamp`),
            totalDifficulty: tools_1.tools.hexToNumber(block.totalDifficulty, `${method} block.totalDifficulty`)
        };
    }
    static getTransactionDecoded(transaction) {
        const method = "getTransactionDecoded";
        const transactionIndex = transaction.transactionIndex === null ? null : tools_1.tools.hexToNumber(transaction.transactionIndex, `${method} transaction.transactionIndex`);
        return {
            accessList: transaction.accessList,
            blockHash: transaction.blockHash,
            blockNumber: tools_1.tools.hexToNumber(transaction.blockNumber, `${method} transaction.blockNumber`),
            chainId: tools_1.tools.hexToNumber(transaction.chainId, `${method} transaction.chainId`),
            from: transaction.from,
            gas: tools_1.tools.hexToNumber(transaction.gas, `${method} transaction.gas`),
            gasPrice: tools_1.tools.hexToNumber(transaction.gasPrice, `${method} transaction.gasPrice`),
            hash: transaction.hash,
            input: transaction.input,
            maxFeePerGas: tools_1.tools.hexToNumber(transaction.maxFeePerGas, `${method} transaction.maxFeePerGas`),
            maxPriorityFeePerGas: tools_1.tools.hexToNumber(transaction.maxPriorityFeePerGas, `${method} transaction.maxPriorityFeePerGas`),
            nonce: tools_1.tools.hexToNumber(transaction.nonce, `${method} transaction.nonce`),
            r: transaction.r,
            s: transaction.s,
            to: transaction.to,
            transactionIndex: transactionIndex,
            type: transaction.type,
            v: tools_1.tools.hexToNumber(transaction.v, `${method} transaction.v`),
            value: tools_1.tools.hexToNumber(transaction.value, `${method} transaction.value`),
        };
    }
    static getLogDecoded(log) {
        const method = "getLogDecoded";
        const logIndex = log.logIndex === null ? null : tools_1.tools.hexToNumber(log.logIndex, `${method} log.logIndex`);
        const transactionIndex = log.transactionIndex === null ? null : tools_1.tools.hexToNumber(log.transactionIndex, `${method} log.transactionIndex`);
        return {
            address: log.address,
            blockHash: log.blockHash,
            blockNumber: tools_1.tools.hexToNumber(log.blockNumber, `${method} log.blockNumber`),
            data: log.data,
            logIndex: logIndex,
            removed: log.removed,
            topics: log.topics,
            transactionHash: log.transactionHash,
            transactionIndex: transactionIndex
        };
    }
    static getReceiptDecoded(receipt) {
        const method = "getReceiptDecoded";
        const logs = [];
        for (const logRaw of receipt.logs) {
            logs.push(this.getLogDecoded(logRaw));
        }
        return {
            blockHash: receipt.blockHash,
            blockNumber: tools_1.tools.hexToNumber(receipt.blockNumber, `${method} receipt.blockNumber`),
            contractAddress: receipt.contractAddress,
            cumulativeGasUsed: tools_1.tools.hexToNumber(receipt.cumulativeGasUsed, `${method} receipt.cumulativeGasUsed`),
            effectiveGasPrice: tools_1.tools.hexToNumber(receipt.effectiveGasPrice, `${method} receipt.effectiveGasPrice`),
            from: "",
            gasUsed: tools_1.tools.hexToNumber(receipt.gasUsed, `${method} receipt.gasUsed`),
            logs: logs,
            logsBloom: receipt.logsBloom,
            status: tools_1.tools.hexToNumber(receipt.status, `${method} receipt.status`),
            to: receipt.to,
            transactionHash: receipt.transactionHash,
            type: receipt.type
        };
    }
}
exports.worker_blocks_tools = worker_blocks_tools;
//# sourceMappingURL=worker_blocks_tools.js.map