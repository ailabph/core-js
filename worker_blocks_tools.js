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
exports.worker_blocks_tools = void 0;
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
            blockInfo.result.block.number = blockInfo.result.block.number ? tools_1.tools.hexToNumberAsString(blockInfo.result.block.number) : blockInfo.result.block.number;
            blockInfo.result.block.baseFeePerGas = tools_1.tools.hexToNumberAsString(blockInfo.result.block.baseFeePerGas);
            blockInfo.result.block.difficulty = tools_1.tools.hexToNumberAsString(blockInfo.result.block.difficulty);
            blockInfo.result.block.gasLimit = tools_1.tools.hexToNumberAsString(blockInfo.result.block.gasLimit);
            blockInfo.result.block.gasUsed = tools_1.tools.hexToNumberAsString(blockInfo.result.block.gasUsed);
            blockInfo.result.block.timestamp = tools_1.tools.hexToNumberAsString(blockInfo.result.block.timestamp);
            for (const transaction of blockInfo.result.block.transactions) {
                transaction.blockNumber = tools_1.tools.hexToNumberAsString(transaction.blockNumber);
                transaction.gas = tools_1.tools.hexToNumberAsString(transaction.gas);
                transaction.gasPrice = tools_1.tools.hexToNumberAsString(transaction.gasPrice);
                transaction.maxFeePerGas = tools_1.tools.hexToNumberAsString(transaction.maxFeePerGas);
                transaction.maxPriorityFeePerGas = tools_1.tools.hexToNumberAsString(transaction.maxPriorityFeePerGas);
                transaction.value = tools_1.tools.hexToNumberAsString(transaction.value);
                if (transaction.transactionIndex)
                    transaction.transactionIndex = tools_1.tools.hexToNumberAsString(transaction.transactionIndex);
            }
            if (blockInfo.result.receipts) {
                for (const receipt of blockInfo.result.receipts) {
                    receipt.blockNumber = tools_1.tools.hexToNumberAsString(receipt.blockNumber);
                    receipt.cumulativeGasUsed = tools_1.tools.hexToNumberAsString(receipt.cumulativeGasUsed);
                    receipt.effectiveGasPrice = tools_1.tools.hexToNumberAsString(receipt.effectiveGasPrice);
                    receipt.gasUsed = tools_1.tools.hexToNumberAsString(receipt.gasUsed);
                    for (const log of receipt.logs) {
                        log.blockNumber = tools_1.tools.hexToNumberAsString(log.blockNumber);
                        if (log.logIndex)
                            log.logIndex = tools_1.tools.hexToNumberAsString(log.logIndex);
                        if (log.transactionIndex)
                            log.transactionIndex = tools_1.tools.hexToNumberAsString(log.transactionIndex);
                    }
                }
            }
            return blockInfo;
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
}
exports.worker_blocks_tools = worker_blocks_tools;
//# sourceMappingURL=worker_blocks_tools.js.map