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
    receipts: t.array(ReceiptCodec),
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
            return decodedData.right;
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
}
exports.worker_blocks_tools = worker_blocks_tools;
//# sourceMappingURL=worker_blocks_tools.js.map