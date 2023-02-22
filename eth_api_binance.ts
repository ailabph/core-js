import * as t from "io-ts";
import {eth_worker} from "./eth_worker";
import {eth_block} from "./build/eth_block";
import {tools} from "./tools";
import {assert} from "./assert";

const BinanceKlineCodec = t.type({
    openTime:t.number,
    openPrice:t.string,
    highPrice:t.string,
    lowPrice:t.string,
    closePrice:t.string,
    volume:t.string,
    closeTime:t.number,
    quoteAssetVolume:t.string,
    numberOfTrades:t.number,
    takerBuyBaseAssetVolume:t.string,
    takerBuyQuoteAssetVolume:t.string,
    unusedField:t.string,
});
type BinanceKline = t.TypeOf<typeof BinanceKlineCodec>;

export class eth_api_binance{

    public static async getBNBUSDPrice(txn_hash:string){
        console.log(`Get the block number of the transaction`);

        // first get txn info on db before going to rpc
        let blockNumber = -1;
        const receiptDb = await eth_worker.getReceiptByTxnHash(txn_hash);
        if(receiptDb){
            if(receiptDb.blockNumber > 0) blockNumber = receiptDb.blockNumber;
        }
        if(blockNumber < 0){
            const receipt = await eth_worker.getReceiptByTxnHashWeb3(txn_hash);
            blockNumber = receipt.blockNumber;
        }
        if(blockNumber < 0) throw new Error(`unable to retrieve txn info of ${txn_hash}`);
        console.log(`blockNumber:${blockNumber}`);

        console.log('Get the timestamp of the block');
        let timeStamp = -1;
        const blockDb = await eth_worker.getBlockByNumber(blockNumber);
        if(blockDb.recordExists() && blockDb.time_added > 0){
            timeStamp = blockDb.time_added;
        }
        // fallback
        if(timeStamp < 0){
            const block = await eth_worker.getBlockByNumberWeb3(blockNumber);
            // timeStamp = tools.parseInt(block.timestamp);
        }
        if(timeStamp < 0) throw new Error(`unable to retrieve timestamp info`);
        console.log(`timestamp:${timeStamp}`);
        console.log(`Use the timestamp to fetch the BNB-BUSD price from an API`)
        const response = await fetch(`https://api.binance.com/api/v3/klines?interval=1m&symbol=BNBBUSD&limit=1&startTime=${timeStamp}000`);
        console.log(response.status);

        console.log(`x-mbx-used-weight:${response.headers.get('X-MBX-USED-WEIGHT')}`);
        console.log(`x-mbx-used-weight:${response.headers.get('x-mbx-used-weight-1m')}`);
        const data = await response.json();

        console.log(data);
    }

}