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
exports.eth_api_binance = void 0;
const t = __importStar(require("io-ts"));
const eth_worker_1 = require("./eth_worker");
const BinanceKlineCodec = t.type({
    openTime: t.number,
    openPrice: t.string,
    highPrice: t.string,
    lowPrice: t.string,
    closePrice: t.string,
    volume: t.string,
    closeTime: t.number,
    quoteAssetVolume: t.string,
    numberOfTrades: t.number,
    takerBuyBaseAssetVolume: t.string,
    takerBuyQuoteAssetVolume: t.string,
    unusedField: t.string,
});
class eth_api_binance {
    static async getBNBUSDPrice(txn_hash) {
        console.log(`Get the block number of the transaction`);
        // first get txn info on db before going to rpc
        let blockNumber = -1;
        const receiptDb = await eth_worker_1.eth_worker.getReceiptByTxnHash(txn_hash);
        if (receiptDb) {
            if (receiptDb.blockNumber > 0)
                blockNumber = receiptDb.blockNumber;
        }
        if (blockNumber < 0) {
            const receipt = await eth_worker_1.eth_worker.getReceiptByTxnHashWeb3(txn_hash);
            blockNumber = receipt.blockNumber;
        }
        if (blockNumber < 0)
            throw new Error(`unable to retrieve txn info of ${txn_hash}`);
        console.log(`blockNumber:${blockNumber}`);
        console.log('Get the timestamp of the block');
        let timeStamp = -1;
        const blockDb = await eth_worker_1.eth_worker.getBlockByNumber(blockNumber);
        if (blockDb.recordExists() && blockDb.time_added > 0) {
            timeStamp = blockDb.time_added;
        }
        // fallback
        if (timeStamp < 0) {
            const block = await eth_worker_1.eth_worker.getBlockByNumberWeb3(blockNumber);
            // timeStamp = tools.parseInt(block.timestamp);
        }
        if (timeStamp < 0)
            throw new Error(`unable to retrieve timestamp info`);
        console.log(`timestamp:${timeStamp}`);
        console.log(`Use the timestamp to fetch the BNB-BUSD price from an API`);
        const response = await fetch(`https://api.binance.com/api/v3/klines?interval=1m&symbol=BNBBUSD&limit=1&startTime=${timeStamp}000`);
        console.log(response.status);
        console.log(`x-mbx-used-weight:${response.headers.get('X-MBX-USED-WEIGHT')}`);
        console.log(`x-mbx-used-weight:${response.headers.get('x-mbx-used-weight-1m')}`);
        const data = await response.json();
        console.log(data);
    }
}
exports.eth_api_binance = eth_api_binance;
//# sourceMappingURL=eth_api_binance.js.map