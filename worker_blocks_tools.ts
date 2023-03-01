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
type Transactions = t.TypeOf<typeof TransactionsCodec>;

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
type Block = t.TypeOf<typeof BlockCodec>;
export { Block }

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
type LogDecoded = t.TypeOf<typeof LogCodec>;
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
type ReceiptDecoded = t.TypeOf<typeof ReceiptCodec>;
export { ReceiptDecoded }

const SingleFlightBlockResultCodec = t.type({
    receipts:t.union([t.null,t.array(ReceiptCodec)]),
    block:BlockCodec
});
type SingleFlightBlockResult = t.TypeOf<typeof SingleFlightBlockResultCodec>;
export { SingleFlightBlockResult }

const SingleFlightBlockCodec = t.type({
    jsonrpc:t.string,
    // id:t.unknown,
    result:SingleFlightBlockResultCodec
});
type SingleFlightBlock = t.TypeOf<typeof SingleFlightBlockCodec>;
export { SingleFlightBlock }

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

    public static getSingleFlightBlockResult(response:unknown):SingleFlightBlock|false{
        if(typeof response !== "object") return false;
        const decodedData = SingleFlightBlockCodec.decode(response);
        if(d.isRight(decodedData)){
            const blockInfo = decodedData.right as SingleFlightBlock;
            blockInfo.result.block.number = blockInfo.result.block.number ? tools.hexToNumberAsString(blockInfo.result.block.number) : blockInfo.result.block.number;
            blockInfo.result.block.baseFeePerGas = tools.hexToNumberAsString(blockInfo.result.block.baseFeePerGas);
            blockInfo.result.block.difficulty = tools.hexToNumberAsString(blockInfo.result.block.difficulty);
            blockInfo.result.block.gasLimit = tools.hexToNumberAsString(blockInfo.result.block.gasLimit);
            blockInfo.result.block.gasUsed = tools.hexToNumberAsString(blockInfo.result.block.gasUsed);
            blockInfo.result.block.timestamp = tools.hexToNumberAsString(blockInfo.result.block.timestamp);
            for(const transaction of blockInfo.result.block.transactions){
                transaction.blockNumber = tools.hexToNumberAsString(transaction.blockNumber);
                transaction.gas = tools.hexToNumberAsString(transaction.gas);
                transaction.gasPrice = tools.hexToNumberAsString(transaction.gasPrice);
                transaction.maxFeePerGas = tools.hexToNumberAsString(transaction.maxFeePerGas);
                transaction.maxPriorityFeePerGas = tools.hexToNumberAsString(transaction.maxPriorityFeePerGas);
                transaction.value = tools.hexToNumberAsString(transaction.value);
                if(transaction.transactionIndex) transaction.transactionIndex = tools.hexToNumberAsString(transaction.transactionIndex);
            }
            if(blockInfo.result.receipts){
                for(const receipt of blockInfo.result.receipts){
                    receipt.blockNumber = tools.hexToNumberAsString(receipt.blockNumber);
                    receipt.cumulativeGasUsed = tools.hexToNumberAsString(receipt.cumulativeGasUsed);
                    receipt.effectiveGasPrice = tools.hexToNumberAsString(receipt.effectiveGasPrice);
                    receipt.gasUsed = tools.hexToNumberAsString(receipt.gasUsed);
                    for(const log of receipt.logs){
                        log.blockNumber = tools.hexToNumberAsString(log.blockNumber);
                        if(log.logIndex) log.logIndex = tools.hexToNumberAsString(log.logIndex);
                        if(log.transactionIndex) log.transactionIndex = tools.hexToNumberAsString(log.transactionIndex);
                    }
                }
            }
            return blockInfo;
        }
        return false;
    }

    public static getBlockObject(response:unknown):Block|false{
        if(typeof response !== "object") return false;
        const decoded = BlockCodec.decode(response);
        if(d.isRight(decoded)){
            return decoded.right as Block;
        }
        return false;
    }

    public static getTransactionsObject(value:unknown):Transactions|false{
        if(typeof value !== "object") return false;
        const decoded = TransactionsCodec.decode(value);
        if(d.isRight(decoded)){
            return decoded.right as Transactions;
        }
        return false;
    }
    
    public static getReceiptObject(value:unknown):ReceiptDecoded|false{
        if(typeof value !== "object") return false;
        const decoded = ReceiptCodec.decode(value);
        if(d.isRight(decoded)){
            return decoded.right as ReceiptDecoded;
        }
        return false;
    }

    public static getLogObject(value:unknown):LogDecoded|false{
        if(typeof value !== "object") return false;
        const decoded = LogCodec.decode(value);
        if(d.isRight(decoded)){
            return decoded.right as LogDecoded;
        }
        return false;
    }

    //region CONVERT
    public static convertWeb3Log(log:LogDecoded):Log{
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
    public static getLogsArray(receipts:ReceiptDecoded[]):Log[]{
        const logs:Log[] = [];
        for(const receipt of receipts){
            for(const log of receipt.logs){
                logs.push(this.convertWeb3Log(log));
            }
        }
        return logs;
    }
    //endregion CONVERT
}