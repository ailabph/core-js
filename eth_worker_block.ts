import {connection} from "./connection";
import {config} from "./config";
import {eth_config} from "./eth_config";
import {tools} from "./tools";
import {eth_block} from "./build/eth_block";
import fsPromise from "fs/promises";
import {eth_worker} from "./eth_worker";
import {assert} from "./assert";

export class eth_worker_block{

    private static hasRun: boolean = false;

    public static async run(){
        if(!eth_worker_block.hasRun){
            eth_worker_block.hasRun = true;
            console.log(`running block worker on env:${config.getEnv()} rpc:${eth_config.getRPCUrl()}`);
        }

        await connection.startTransaction();
        try{
            // check if db empty, check for import csv
            let latestBlock = new eth_block();
            await latestBlock.list(" WHERE 1 ",{}," ORDER BY blockNumber DESC LIMIT 1 ");
            if(latestBlock.count() === 0){
                // check import csv
                console.log(`no block records found on db, checking if import.csv exists`);
                if(!assert.fileExists("./import.csv",false)){
                    console.log(`no import.csv file found`);
                }
                else{
                    const file = await fsPromise.open('./import.csv', 'r');
                    let blockNoIndex = -1, firstLine = true;
                    // loop csv per line
                    for await (const line of file.readLines()) {
                        let newLine = line.replace(/(,)(?=(?:[^"]|"[^"]*")*$)/g, "|");
                        newLine = newLine.replace(/"/g, "");
                        newLine = newLine.replace(/,/g, "");
                        const parts = newLine.split("|");
                        // retrieve index for blockNo or blockNumber, throw error if not found
                        if(firstLine){
                            for(let index1=0; index1<parts.length; index1++){
                                const col_value = parts[index1].toLowerCase();
                                if(["blockno","blocknumber","block_no","block_number"].includes(col_value)){
                                    blockNoIndex = index1;
                                }
                            }
                            if(blockNoIndex < 0) throw new Error(`index for block number info not found`);
                            if(firstLine) firstLine = false;
                            continue;
                        }
                        // insert block info
                        const blockNumber = parseInt(parts[blockNoIndex]);
                        let newBlock = new eth_block();
                        newBlock.blockNumber = blockNumber;
                        await newBlock.fetch();
                        if(newBlock.recordExists()) {
                            console.log(`block ${blockNumber} already on db, skipping`);
                            continue;
                        }
                        const web3BlockInfo = await eth_worker.getBlockByNumberWeb3(blockNumber);
                        newBlock.blockNumber = web3BlockInfo.number;
                        newBlock.blockHash = web3BlockInfo.hash;
                        newBlock.time_added = typeof web3BlockInfo.timestamp === "string" ? parseInt(web3BlockInfo.timestamp) : web3BlockInfo.timestamp;
                        await newBlock.save();
                        console.log(`added new block:${newBlock.blockNumber} on db`);
                    }
                }
            }
            else{
                await latestBlock.list(" WHERE 1 ",{}," ORDER BY blockNumber DESC LIMIT 1 ");
                const latest_block_number = await eth_worker.getLatestBlockWeb3();
                const last_block_number = latestBlock.count() > 0 ? latestBlock.getItem().blockNumber : 0;
                const diff = latest_block_number - last_block_number;
                if(diff > 0){
                    const limit = diff > eth_worker_block.getBatchLimit() ? eth_worker_block.getBatchLimit() : diff;
                    let block_number_to_add = last_block_number;
                    for(let count1 = 0; count1 < limit; count1++,++block_number_to_add){
                        let newBlock = new eth_block();
                        newBlock.blockNumber = block_number_to_add;
                        await newBlock.fetch();
                        if(newBlock.recordExists()){
                            // console.log(`block:${block_number_to_add} already on db, skipping...`);
                            continue;
                        }
                        const web3BlockInfo = await eth_worker.getBlockByNumberWeb3(block_number_to_add);
                        newBlock.blockNumber = web3BlockInfo.number;
                        newBlock.blockHash = web3BlockInfo.hash;
                        newBlock.time_added = typeof web3BlockInfo.timestamp === "string" ? parseInt(web3BlockInfo.timestamp) : web3BlockInfo.timestamp;
                        await newBlock.save();
                        console.log(`added new block:${newBlock.blockNumber} on db`);
                    }
                }
            }
            await connection.commit();
        }catch (e){
            await connection.rollback();
            console.log(e);
        }
        await tools.sleep(eth_worker_block.waitMs());
        await eth_worker_block.run();
    }

    private static waitMs():number{
        const worker_wait_ms = config.getCustomOption("worker_wait_ms");
        if(tools.isNumeric(worker_wait_ms) && worker_wait_ms > 0){
            return worker_wait_ms as number;
        }
        return eth_config.default_worker_wait_ms;
    }

    private static getBatchLimit():number{
        const batch_limit = config.getCustomOption("worker_block_batch");
        if(tools.isNumeric(batch_limit) && batch_limit > 0){
            return batch_limit as number;
        }
        return eth_config.default_worker_batch;
    }

}