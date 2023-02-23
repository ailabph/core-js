import {assert} from "./assert";
import {config} from "./config";
import {connection} from "./connection";
import {eth_receipt_logs_tools} from "./eth_receipt_logs_tools";
import {eth_worker} from "./eth_worker";
import {tools} from "./tools";
import {eth_transaction_known} from "./build/eth_transaction_known";
import {Log} from "web3-core";
import {argv} from "process";

const blocksToProcess = getBlocksToProcess();
const blockConfirmation = 8;
const updatedWaitTimeSeconds = 2;
let totalErrors = 0;
let lastBlockProcessed = 0;
let latestBlock = 0;
let adjustedToBlock = 0;

export class eth_worker_logs{
    public static async run(){
        // check if known has records tim_processed = null
        await connection.startTransaction();
        const startTime = tools.getCurrentTimeStamp();
        let logsFound = 0;
        try{
            const unprocessedKnownTransactions = new eth_transaction_known();
            await unprocessedKnownTransactions.list(" WHERE time_processed IS NULL ",{}," ORDER BY blockNo ASC LIMIT 1");
            if(unprocessedKnownTransactions.count() > 0){
                for(const known of unprocessedKnownTransactions._dataList as eth_transaction_known[]){
                    if(!(known.blockNo??0 > 0)){
                        const web3Transaction = await eth_worker.getTxnByHashWeb3(known.hash??"");
                        known.blockNo = web3Transaction.blockNumber;
                        await known.save();
                    }
                    const fromBlock = assert.isNumber(known.blockNo,"blockNo",0) - 1;
                    const toBlock = assert.isNumber(known.blockNo,"blockNo",0);
                    console.log(`processing known transactions for block:${known.blockNo} range from ${fromBlock} to ${toBlock}`);
                    const logs = await eth_worker.getLogsBetweenBlockNumbersViaRpc(fromBlock,toBlock);
                    await eth_receipt_logs_tools.analyzeLogsInvolvement(logs);
                    known.time_processed = tools.getCurrentTimeStamp();
                    await known.save();
                }
            }
            else{
                if(lastBlockProcessed === 0){
                    lastBlockProcessed = await eth_worker.getLatestBlock()
                }
                latestBlock = await eth_worker.getLatestBlockWeb3();
                adjustedToBlock = latestBlock - blockConfirmation;
                let from_block = 0;
                let to_block = 0;
                if(lastBlockProcessed === adjustedToBlock){
                    from_block = lastBlockProcessed;
                    to_block = lastBlockProcessed;
                }
                else{
                    from_block = lastBlockProcessed + 1;
                    to_block = from_block + blocksToProcess;
                    to_block = to_block > adjustedToBlock ? adjustedToBlock : to_block;
                }

                const height = latestBlock - from_block;
                console.log(`processing from last block Processed ${from_block} to ${to_block} height:${height}`);
                const logs = await eth_worker.getLogsBetweenBlockNumbersViaRpc(from_block,to_block);
                logsFound = logs.length;
                if(logs.length > 0){
                    await eth_receipt_logs_tools.analyzeLogsInvolvement(logs);
                    lastBlockProcessed = logs[logs.length-1].blockNumber;
                }
                console.log(`processed blocks from ${from_block} to ${to_block} height:${height}`);
            }
            await connection.commit();
            const endTime = tools.getCurrentTimeStamp();
            const diff = endTime - startTime;
            const minutes = Math.floor(diff / 60);
            const minutesInSeconds = minutes * 60;
            const seconds = diff - minutesInSeconds;
            const blocksPerMinute = 20;
            const blocksPerHour = 1200;
            let processBlocksPerHour:number|string = blocksPerHour / blocksToProcess;
            processBlocksPerHour = processBlocksPerHour * diff;
            processBlocksPerHour = (processBlocksPerHour / 60).toFixed(2);
            const blocksPerDay = 28800;
            let processBlocksPerDay:number|string = blocksPerDay / blocksToProcess;
            processBlocksPerDay = processBlocksPerDay * diff;
            processBlocksPerDay = (processBlocksPerDay / 60).toFixed(2);


            console.log(`run time ${minutes} minutes ${seconds} seconds to process ${blocksToProcess} blocks`);
            console.log(`estimated ${processBlocksPerHour} minutes to process 1 hour worth of blocks (${blocksPerHour})`);
            console.log(`estimated ${processBlocksPerDay} minutes to process 1 day worth of blocks (${blocksPerDay})`);
            const used = process.memoryUsage().heapUsed / 1024 / 1024;
            console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
            console.log(`total errors:${totalErrors}`);

            if(unprocessedKnownTransactions.count() === 0 && lastBlockProcessed === adjustedToBlock){
                console.log(`latest block reached, waiting ${updatedWaitTimeSeconds} seconds`)
                await tools.sleep(updatedWaitTimeSeconds * 1000);
            }
            setImmediate(()=>{
                eth_worker_logs.run();
            });
        }catch (e) {
            await connection.rollback();
            totalErrors++;
            console.log(e);
            console.log(`rolled back changes on db. waiting ${updatedWaitTimeSeconds} seconds before trying again....`);
            await tools.sleep(updatedWaitTimeSeconds * 1000);
            setImmediate(()=>{
                eth_worker_logs.run();
            });
        }
    }


}

function getBlocksToProcess():number{
    const config_blocksToProcess = config.getCustomOption("BLOCKS_TO_PROCESS");
    console.log(config_blocksToProcess);
    if(tools.isNumeric(config_blocksToProcess)){
        return assert.positiveInt(config_blocksToProcess);
    }
    return 150;
}

if(argv.includes("run_eth_worker_logs")){
    console.log(`running worker to process logs. batch limit ${blocksToProcess}`);
    eth_worker_logs.run().finally();
}