
import * as t from "io-ts";
import * as d from "fp-ts/Either";
import {TransferLog} from "./web3_log_decoder";

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
type Log = t.TypeOf<typeof LogCodec>;
export { Log };

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
type Receipt = t.TypeOf<typeof ReceiptCodec>;
export { Receipt }

const SingleFlightBlockResultCodec = t.type({
    receipts:t.array(ReceiptCodec),
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
            return decodedData.right as SingleFlightBlock;
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
    
    public static getReceiptObject(value:unknown):Receipt|false{
        if(typeof value !== "object") return false;
        const decoded = ReceiptCodec.decode(value);
        if(d.isRight(decoded)){
            return decoded.right as Receipt;
        }
        return false;
    }

    public static getLogObject(value:unknown):Log|false{
        if(typeof value !== "object") return false;
        const decoded = LogCodec.decode(value);
        if(d.isRight(decoded)){
            return decoded.right as Log;
        }
        return false;
    }


}