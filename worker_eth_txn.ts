import {eth_block} from "./build/eth_block";
import {eth_worker} from "./eth_worker";
import {eth_transaction} from "./build/eth_transaction";
import {config, connection, tools} from "./ailab-core";

let batchLimit = 50;
let callLimit = 50;

console.log("running worker to update transactions from blocks");

async function run(){
    await connection.startTransaction();
    try{
        let avgApiCallPerSec = 0;
        let totalApiCalls = 0;
        let calls:{[key:string]:number} = {};
        let blocks = new eth_block();
        let txnAdded = 0;
        let txnSkipped = 0;
        await blocks.list(" WHERE time_txn_retrieved IS NULL ",[]," ORDER BY blockNumber ASC LIMIT "+batchLimit);
        if(blocks.count() > 0){
            let fromBlock = blocks._dataList[0];
            let toBlock = blocks._dataList[blocks.count() - 1];
            console.log(`blocks to process:${blocks.count()} from:${fromBlock.blockNumber} to:${toBlock.blockNumber}`);

            let current_block = new eth_block();
            while(current_block = blocks.getItem()){
                let current_time: string | number = tools.getCurrentTimeStamp();
                current_time = "time_" + current_time;
                if (typeof calls[current_time] === "undefined") {
                    calls[current_time] = 0;
                }
                calls[current_time]++;
                let transactions = await eth_worker.getTxnByBlockNumber(current_block.blockNumber);
                console.log(`${transactions.transactions.length} transactions found in block:${current_block.blockNumber}`);
                for(let i=0; i<transactions.transactions.length; i++){
                    let t = transactions.transactions[i];
                    let new_t = new eth_transaction();
                    new_t.hash = t.hash;
                    await new_t.fetch();
                    if(new_t._isNew){
                        new_t.blockHash = t.blockHash;
                        new_t.blockNumber = t.blockNumber;
                        new_t.fromAddress = t.from;
                        new_t.gas = eth_worker.convertValueToAmount(t.gas,18);
                        new_t.gasPrice = t.gasPrice;
                        new_t.input = t.input;
                        new_t.nonce = t.nonce;
                        new_t.toAddress = t.to;
                        new_t.value = t.value;
                        // new_t.type = t.type;
                        // new_t.chainId = t.chainId;
                        // new_t.v = t.v;
                        // new_t.r = t.r;
                        // new_t.s = t.s;
                        // let start = Date.now();
                        await new_t.save();
                        // let stop = Date.now();
                        // console.log("db save finished in %s ms",(stop-start));
                        // console.log("...added txn:%s",new_t.hash);
                        txnAdded++;
                    }
                    else{
                        console.log("...skip, record exist for txn:%s",new_t.hash);
                        txnSkipped++;
                    }
                }
                current_block.blockHash = transactions.hash;
                current_block.time_txn_retrieved = tools.getCurrentTimeStamp();
                await current_block.save();
                console.log("...updated block info");
            }
        }
        let timeOut = 1000;
        if (avgApiCallPerSec < callLimit) {
            timeOut = 100;
        }
        await new Promise((r)=>{ setTimeout(run,timeOut); });
        await connection.commit();
    }catch (e){
        console.log(`ERROR:`);
        console.log(e);
        await connection.rollback();
    }
}

run().finally();