
import {config} from "./config";
import {tools} from "./tools";
import {eth_config} from "./eth_config";
import {connection} from "./connection";
import {eth_worker} from "./eth_worker";
import {eth_block} from "./build/eth_block";
import {eth_transaction} from "./build/eth_transaction";
import {Transaction} from "web3-eth/types";

export class eth_worker_txn{
    private static hasRun: boolean = false;
    public static async run(){
        if(!eth_worker_txn.hasRun){
            eth_worker_txn.hasRun = true;
            console.log(`running txn worker on env:${config.getEnv()} rpc:${eth_config.getRPCUrl()}`);
        }
        await connection.startTransaction();
        try{
            let lastBlockProcessed = -1;
            const latestBlock = await eth_worker.getLatestBlock();
            // get unprocessed block
            let unprocessedBlock = new eth_block();
            await unprocessedBlock.list(" WHERE time_txn_retrieved IS NULL ",{},` ORDER BY blockNumber ASC LIMIT ${eth_worker_txn.getBatchLimit()} `);
            if(unprocessedBlock.count() > 0) console.log(`${unprocessedBlock.count()} blocks to process found`);
            let totalTxnAddedUpdated = 0;
            for(const block of unprocessedBlock._dataList as eth_block[]){
                if(!(block.time_added > 0)) throw new Error(`block time not available`);
                // console.log(`retrieving transactions of block:${block.blockNumber} from rpc`);
                const transactions = await eth_worker.getTxnByBlockNumberWeb3(block.blockNumber);
                // console.log(`${transactions.transactions.length} transactions found`);

                for(const transaction of transactions.transactions as Transaction[]){
                    const newTxn = new eth_transaction();
                    newTxn.hash = transaction.hash;
                    await newTxn.fetch();
                    // insert txn if not on db
                    if(newTxn.isNew()){
                        newTxn.loadValues(transaction,true);
                        newTxn.fromAddress = transaction.from;
                        newTxn.toAddress = transaction.to;
                        newTxn.blockTime = block.time_added;
                        await newTxn.save();
                    }
                    // tag txn if involved
                    await eth_worker.identifyInvolvement(newTxn);
                    totalTxnAddedUpdated++
                    // console.log(`${block.blockNumber} ${transaction.hash} updated on db. token_found:${newTxn.token_found === "y"? "yes":"no"} is_swap:${newTxn.is_swap?"yes":"no"} method_name:${newTxn.method_name}`);
                }
                block.time_txn_retrieved = tools.getCurrentTimeStamp();
                await block.save();
                lastBlockProcessed = block.blockNumber;
            }
            lastBlockProcessed = lastBlockProcessed > 0 ? lastBlockProcessed : latestBlock;
            const height = latestBlock - lastBlockProcessed;
            if(totalTxnAddedUpdated > 0) console.log(`${totalTxnAddedUpdated} transactions processed. last block:${lastBlockProcessed} latest block:${latestBlock} height:${height}`);
            await connection.commit();
        }catch (e){
            await connection.rollback();
            console.log(e);
        }
        await tools.sleep(eth_worker_txn.waitMs());
        await eth_worker_txn.run();
    }

    private static waitMs():number{
        const worker_wait_ms = config.getCustomOption("worker_wait_ms");
        if(tools.isNumeric(worker_wait_ms) && worker_wait_ms > 0){
            return worker_wait_ms as number;
        }
        return eth_config.default_worker_wait_ms;
    }

    private static getBatchLimit():number{
        const batch_limit = config.getCustomOption("worker_txn_batch");
        if(tools.isNumeric(batch_limit) && batch_limit > 0){
            return batch_limit as number;
        }
        return eth_config.default_worker_batch;
    }
}