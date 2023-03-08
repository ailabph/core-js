import * as t from "io-ts";
import * as d from "fp-ts/Either";
import {tools} from "./tools";
import {Log} from "web3-core";
import {assert} from "./assert";

//region TYPES
const SingleFlightErrorCodec = t.type({
    code:t.number,
    msg:t.string,
});
type SingleFlightError = t.TypeOf<typeof SingleFlightErrorCodec>;
export { SingleFlightError }

const TransactionsCodec = t.type({
    blockHash: t.string,
    blockNumber: t.string,
    from: t.string,
    gas: t.string,
    gasPrice: t.string,
    hash: t.string,
    input: t.string,
    nonce: t.string,
    to: t.union([t.null,t.string]),
    transactionIndex: t.union([t.null,t.string]),
    value: t.string,
    type: t.string,
    v: t.string,
    r: t.string,
    s: t.string,
    maxFeePerGas: t.string,
    maxPriorityFeePerGas: t.string,
    accessList: t.union([t.null,t.array(t.any)]),
    chainId: t.string,
});
type TransactionsRaw = t.TypeOf<typeof TransactionsCodec>;
export { TransactionsRaw }

const TransactionDecodedCodec = t.type({
    blockHash: t.string,
    blockNumber: t.number,
    from: t.string,
    gas: t.number,
    gasPrice: t.number,
    hash: t.string,
    input: t.string,
    nonce: t.number,
    to: t.union([t.null,t.string]),
    transactionIndex: t.union([t.null,t.number]),
    value: t.number,
    type: t.string,
    v: t.number,
    r: t.string,
    s: t.string,
    maxFeePerGas: t.number,
    maxPriorityFeePerGas: t.number,
    accessList: t.union([t.null,t.array(t.any)]),
    chainId: t.number,
});
type TransactionDecoded = t.TypeOf<typeof TransactionDecodedCodec>;

const BlockCodec = t.type({
    baseFeePerGas: t.string,
    difficulty: t.string,
    extraData: t.string,
    gasLimit: t.string,
    gasUsed: t.string,
    hash: t.union([t.null,t.string]),
    logsBloom: t.union([t.null,t.string]),
    miner: t.string,
    mixHash: t.string,
    nonce: t.union([t.null,t.string]),
    number: t.union([t.null,t.string]),
    parentHash: t.string,
    receiptsRoot: t.string,
    sha3Uncles: t.string,
    size: t.string,
    stateRoot: t.string,
    timestamp: t.string,
    totalDifficulty: t.string,
    transactions: t.array(TransactionsCodec),
});
type BlockRaw = t.TypeOf<typeof BlockCodec>;
export { BlockRaw }

const BlockDecodedCodec = t.type({
    baseFeePerGas: t.number,
    difficulty: t.number,
    extraData: t.string,
    gasLimit: t.number,
    gasUsed: t.number,
    hash: t.union([t.null,t.string]),
    logsBloom: t.union([t.null,t.string]),
    miner: t.string,
    mixHash: t.string,
    nonce: t.union([t.null,t.string]),
    number: t.union([t.null,t.number]),
    parentHash: t.string,
    receiptsRoot: t.string,
    sha3Uncles: t.string,
    size: t.number,
    stateRoot: t.string,
    timestamp: t.number,
    totalDifficulty: t.number,
    transactions: t.array(TransactionDecodedCodec),
});
type BlockDecoded = t.TypeOf<typeof BlockDecodedCodec>;
export { BlockDecoded };

const LogCodec = t.type({
    address: t.string,
    topics: t.array(t.string),
    data: t.string,
    blockNumber: t.string,
    transactionHash: t.union([t.null,t.string]),
    transactionIndex: t.union([t.null,t.string]),
    blockHash: t.union([t.null,t.string]),
    logIndex: t.union([t.null,t.string]),
    removed: t.boolean,
});
type LogRaw = t.TypeOf<typeof LogCodec>;
export { LogRaw };

const LogDecodedCodec = t.type({
    address: t.string,
    topics: t.array(t.string),
    data: t.string,
    blockNumber: t.number,
    transactionHash: t.union([t.null,t.string]),
    transactionIndex: t.union([t.null,t.number]),
    blockHash: t.union([t.null,t.string]),
    logIndex: t.union([t.null,t.number]),
    removed: t.boolean,
});
type LogDecoded = t.TypeOf<typeof LogDecodedCodec>;
export { LogDecoded };

const ReceiptCodec = t.type({
    blockHash: t.union([t.null,t.string]),
    blockNumber: t.string,
    contractAddress: t.union([t.null,t.string]),
    cumulativeGasUsed: t.string,
    effectiveGasPrice: t.string,
    from: t.string,
    gasUsed: t.string,
    logs: t.array(LogCodec),
    logsBloom: t.string,
    status: t.string,
    to: t.union([t.null,t.string]),
    transactionHash: t.string,
    type: t.string,
});
type ReceiptRaw = t.TypeOf<typeof ReceiptCodec>;
export { ReceiptRaw }

const ReceiptDecodedCodec = t.type({
    blockHash: t.union([t.null,t.string]),
    blockNumber: t.number,
    contractAddress: t.union([t.null,t.string]),
    cumulativeGasUsed: t.number,
    effectiveGasPrice: t.number,
    from: t.string,
    gasUsed: t.number,
    logs: t.array(LogDecodedCodec),
    logsBloom: t.string,
    status: t.number,
    to: t.union([t.null,t.string]),
    transactionHash: t.string,
    type: t.string,
});
type ReceiptDecoded = t.TypeOf<typeof ReceiptDecodedCodec>;
export { ReceiptDecodedCodec };

const SingleFlightBlockResultCodec = t.type({
    receipts:t.union([t.null,t.array(ReceiptCodec)]),
    block:BlockCodec
});
type SingleFlightBlockResult = t.TypeOf<typeof SingleFlightBlockResultCodec>;
export { SingleFlightBlockResult }

type SingleFlightBlockResultDecoded = {
    receipts:null|ReceiptDecoded[],
    block:BlockDecoded,
};
export { SingleFlightBlockResultDecoded }

const SingleFlightBlockCodec = t.type({
    jsonrpc:t.string,
    // id:t.unknown,
    result:SingleFlightBlockResultCodec
});
type SingleFlightBlock = t.TypeOf<typeof SingleFlightBlockCodec>;
export { SingleFlightBlock }

type SingleFlightBlockDecoded = {
    jsonrpc:string,
    result:SingleFlightBlockResultDecoded
}
export { SingleFlightBlockDecoded }

//endregion TYPES

export class worker_blocks_tools{
    public static getSingleFlightError(response:unknown):SingleFlightError|false {
        if (typeof response !== "object") return false;
        const decodedData = SingleFlightErrorCodec.decode(response);
        if(d.isRight(decodedData)){
            return decodedData.right as SingleFlightError;
        }
        return false;
    }

    public static getSingleFlightBlockResult(response:unknown):SingleFlightBlockDecoded|false{
        if(typeof response !== "object") return false;
        const decodedData = SingleFlightBlockCodec.decode(response);
        if(d.isRight(decodedData)){
            const blockInfo = decodedData.right as SingleFlightBlock;
            const receipts:ReceiptDecoded[] = [];
            if(blockInfo.result.receipts){
                for(const receiptRaw of blockInfo.result.receipts){
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

    public static getBlockObject(response:unknown):BlockRaw|false{
        if(typeof response !== "object") return false;
        const decoded = BlockCodec.decode(response);
        if(d.isRight(decoded)){
            return decoded.right as BlockRaw;
        }
        return false;
    }

    public static getTransactionsObject(value:unknown):TransactionsRaw|false{
        if(typeof value !== "object") return false;
        const decoded = TransactionsCodec.decode(value);
        if(d.isRight(decoded)){
            return decoded.right as TransactionsRaw;
        }
        return false;
    }
    
    public static getReceiptObject(value:unknown):ReceiptRaw|false{
        if(typeof value !== "object") return false;
        const decoded = ReceiptCodec.decode(value);
        if(d.isRight(decoded)){
            return decoded.right as ReceiptRaw;
        }
        return false;
    }

    public static getLogObject(value:unknown):LogRaw|false{
        if(typeof value !== "object") return false;
        const decoded = LogCodec.decode(value);
        if(d.isRight(decoded)){
            return decoded.right as LogRaw;
        }
        return false;
    }

    //region CONVERT
    public static convertWeb3Log(log:LogRaw):Log{
        const method = "convertWeb3Log";
        return {
            address: log.address,
            blockHash: log.blockHash ?? "",
            blockNumber: assert.positiveInt(log.blockNumber, `${method} log.blockNumber`),
            data: log.data,
            logIndex: assert.positiveInt(log.logIndex ?? 0, `${method} log.logIndex`),
            topics: log.topics,
            transactionHash: (log.transactionHash ?? ""),
            transactionIndex: assert.naturalNumber(log.transactionIndex ?? 0, `${method} log.transactionIndex`)
        };
    }
    public static getLogsArray(receipts:ReceiptRaw[]):Log[]{
        const logs:Log[] = [];
        for(const receipt of receipts){
            for(const log of receipt.logs){
                logs.push(this.convertWeb3Log(log));
            }
        }
        return logs;
    }

    public static getBlockDecoded(block:BlockRaw):BlockDecoded{
        const method = "getBlockDecoded";
        const blockNumber = block.number === null ? null : tools.hexToNumber(block.number,`${method} block.number`);
        const transactions:TransactionDecoded[] = [];
        for(const transactionRaw of block.transactions){
            transactions.push(worker_blocks_tools.getTransactionDecoded(transactionRaw));
        }
        return {
            transactions: transactions,
            baseFeePerGas: tools.hexToNumber(block.baseFeePerGas,`${method} block.baseFeePerGas`),
            difficulty: tools.hexToNumber(block.difficulty,`${method} block.difficulty`),
            extraData: block.extraData,
            gasLimit: tools.hexToNumber(block.gasLimit,`${method} block.gasLimit`),
            gasUsed: tools.hexToNumber(block.gasUsed, `${method} block.gasUsed`),
            hash: block.hash,
            logsBloom: block.logsBloom,
            miner: block.miner,
            mixHash: block.mixHash,
            nonce: block.nonce,
            number: blockNumber,
            parentHash: block.parentHash,
            receiptsRoot: block.receiptsRoot,
            sha3Uncles: block.sha3Uncles,
            size: tools.hexToNumber(block.size,`${method} block.size`),
            stateRoot: block.stateRoot,
            timestamp: tools.hexToNumber(block.timestamp,`${method} block.timestamp`),
            totalDifficulty: tools.hexToNumber(block.totalDifficulty,`${method} block.totalDifficulty`)
        };
    }
    public static getTransactionDecoded(transaction:TransactionsRaw):TransactionDecoded{
        const method = "getTransactionDecoded";
        const transactionIndex = transaction.transactionIndex === null ? null : tools.hexToNumber(transaction.transactionIndex,`${method} transaction.transactionIndex`);
        return {
            accessList: transaction.accessList,
            blockHash: transaction.blockHash,
            blockNumber: tools.hexToNumber(transaction.blockNumber,`${method} transaction.blockNumber`),
            chainId: tools.hexToNumber(transaction.chainId,`${method} transaction.chainId`),
            from: transaction.from,
            gas: tools.hexToNumber(transaction.gas,`${method} transaction.gas`),
            gasPrice: tools.hexToNumber(transaction.gasPrice,`${method} transaction.gasPrice`),
            hash: transaction.hash,
            input: transaction.input,
            maxFeePerGas: tools.hexToNumber(transaction.maxFeePerGas,`${method} transaction.maxFeePerGas`),
            maxPriorityFeePerGas: tools.hexToNumber(transaction.maxPriorityFeePerGas,`${method} transaction.maxPriorityFeePerGas`),
            nonce: tools.hexToNumber(transaction.nonce,`${method} transaction.nonce`),
            r: transaction.r,
            s: transaction.s,
            to: transaction.to,
            transactionIndex: transactionIndex,
            type: transaction.type,
            v: tools.hexToNumber(transaction.v,`${method} transaction.v`),
            value: tools.hexToNumber(transaction.value,`${method} transaction.value`),
        };
    }
    public static getLogDecoded(log:LogRaw):LogDecoded{
        const method = "getLogDecoded";
        const logIndex = log.logIndex === null ? null : tools.hexToNumber(log.logIndex,`${method} log.logIndex`);
        const transactionIndex = log.transactionIndex === null ? null : tools.hexToNumber(log.transactionIndex,`${method} log.transactionIndex`);
        return {
            address: log.address,
            blockHash: log.blockHash,
            blockNumber: tools.hexToNumber(log.blockNumber,`${method} log.blockNumber`),
            data: log.data,
            logIndex: logIndex,
            removed: log.removed,
            topics: log.topics,
            transactionHash: log.transactionHash,
            transactionIndex: transactionIndex
        };
    }
    public static getReceiptDecoded(receipt:ReceiptRaw):ReceiptDecoded{
        const method = "getReceiptDecoded";
        const logs:LogDecoded[] = [];
        for(const logRaw of receipt.logs){
            logs.push(this.getLogDecoded(logRaw));
        }
        return {
            blockHash: receipt.blockHash,
            blockNumber: tools.hexToNumber(receipt.blockNumber,`${method} receipt.blockNumber`),
            contractAddress: receipt.contractAddress,
            cumulativeGasUsed: tools.hexToNumber(receipt.cumulativeGasUsed,`${method} receipt.cumulativeGasUsed`),
            effectiveGasPrice: tools.hexToNumber(receipt.effectiveGasPrice,`${method} receipt.effectiveGasPrice`),
            from: "",
            gasUsed: tools.hexToNumber(receipt.gasUsed,`${method} receipt.gasUsed`),
            logs: logs,
            logsBloom: receipt.logsBloom,
            status: tools.hexToNumber(receipt.status,`${method} receipt.status`),
            to: receipt.to,
            transactionHash: receipt.transactionHash,
            type: receipt.type
        };
    }
    //endregion CONVERT
}