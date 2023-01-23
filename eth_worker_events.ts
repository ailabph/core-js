import {config} from "./config";
import {tools} from "./tools";
import {eth_config} from "./eth_config";
import {connection} from "./connection";
import {eth_transaction} from "./build/eth_transaction";
import {eth_worker} from "./eth_worker";
import {eth_contract_events} from "./build/eth_contract_events";
import {eth_block} from "./build/eth_block";

export class eth_worker_events{

    private static hasRun:boolean = false;
    public static async run(){
        if(!eth_worker_events.hasRun){
            console.log(`running events worker on env:${config.getEnv()} rpc:${eth_config.getRPCUrl()}`);
            console.log(`retrieving unprocessed token tagged transactions`);
            eth_worker_events.hasRun = true;
        }
        await connection.startTransaction();
        try{
            const unprocessedTransactions = new eth_transaction();
            await unprocessedTransactions.list(" WHERE time_processed IS NULL AND token_found=:y ",{y:"y"},` ORDER BY id ASC LIMIT ${eth_worker_events.getBatchLimit()} `);
            if(unprocessedTransactions.count() > 0) console.log(`${unprocessedTransactions.count()} unprocessed transactions found`);
            for(const transaction of unprocessedTransactions._dataList as eth_transaction[]){
                const event = new eth_contract_events();
                event.txn_hash = transaction.hash;
                await event.fetch();
                if(event.recordExists()){
                    console.log(`${transaction.hash} event already added, skipping`);
                    transaction.time_processed = tools.getCurrentTimeStamp();
                    await transaction.save();
                    continue;
                }
                console.log(`analyzing ${transaction.hash} is_swap:${transaction.is_swap?"yes":"n"}`);
                const result = await eth_worker.analyzeTokenTransaction(transaction);
                event.loadValues(result,true);
                const block = await eth_worker.getBlockByNumber(transaction.blockNumber??0,true);
                if(!(block.time_added??0 > 0)) throw new Error(`no time_added information on block ${block.blockNumber}`);
                event.block_time = block.time_added;
                event.blockNumber = block.blockNumber;
                event.tax_amount = result.taxAmount;
                event.tax_percentage = parseFloat(result.taxPerc);

                // set price context
                let token_amount:number|string = -1;
                if(event.type === "buy"){
                    token_amount = event.toAmount??-1;
                }
                else if(event.type === "sell" || event.type === "transfer"){
                    token_amount = event.fromAmountGross??-1;
                }
                if(token_amount < 0) throw new Error(`token_amount not established`);

                let bnb_usdBn = await eth_worker.getBnbUsdPriceByBlockNumber(event.blockNumber);
                event.bnb_usd = bnb_usdBn.toFixed(18);
                let token_bnbBn = await eth_worker.getTokenBnbPriceByBlockNumber(event.blockNumber);
                event.token_usd = token_bnbBn.toFixed(18);
                event.token_bnb_value = tools.toBn(token_amount).multipliedBy(token_bnbBn).toFixed(18);
                event.token_usd_value = null;

                await event.save();
                console.log(`${event.txn_hash} event added. method:${event.method} type:${event.type}`);
                transaction.time_processed = tools.getCurrentTimeStamp();
                await transaction.save();
            }
            await connection.commit();
        }catch (e){
            await connection.rollback();
            console.error(e);
        }
        await tools.sleep(eth_worker_events.waitMs());
        await eth_worker_events.run();
    }

    private static waitMs():number{
        const worker_wait_ms = config.getCustomOption("worker_wait_ms");
        if(tools.isNumeric(worker_wait_ms) && worker_wait_ms > 0){
            return worker_wait_ms as number;
        }
        return eth_config.default_worker_wait_ms;
    }

    private static getBatchLimit():number{
        const batch_limit = config.getCustomOption("worker_events_batch");
        if(tools.isNumeric(batch_limit) && batch_limit > 0){
            return batch_limit as number;
        }
        return eth_config.default_worker_batch;
    }
}