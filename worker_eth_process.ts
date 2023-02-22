import {config} from "./config";
import {connection} from "./connection";
import {tools} from "./tools";
import {eth_worker} from "./eth_worker";
import {AnalysisResult} from "./eth_types";

import {eth_transaction} from "./build/eth_transaction";
import {eth_contract_events} from "./build/eth_contract_events";
import {generic_data} from "./build/generic_data";

let batchLimit = 4000;

console.log("starting worker to analyze transactions related to tracked token");
async function run(){
    await connection.startTransaction();
    try{
        let transactions = new eth_transaction();
        let lastBlock = 0;
        let lastId = 0;
        let last_tx_id_process = new generic_data();
        last_tx_id_process.tag = "last_tx_id_process";
        await last_tx_id_process.fetch();
        if(last_tx_id_process.recordExists()){
            if(typeof last_tx_id_process.value === "string"){
                lastId = parseInt(last_tx_id_process.value);
            }
        }

        console.log("querying transactions not processed...");
        await transactions.list(" WHERE id>:id ",{id:lastId},` ORDER BY id ASC LIMIT ${batchLimit} `);
        console.log(`...${transactions.count()} found. last_tx_id_processed:${lastId}`);
        let newT = new eth_transaction();
        while(newT = transactions.getItem()){
            if(config.getConfig().verbose_log) console.log(`processing ${newT.hash}`);
            let result = await eth_worker.analyzeTransaction2(newT);
            let status = "not_involved";
            if(result.status === "involved" && result.sendStatus === "success"){
                console.log(`hash:${result.hash} method:${result.method}`);
                status = "involved";
                await addEvent(result);
            }
            newT.status = status;
            newT.time_processed = tools.getCurrentTimeStamp();
            await newT.save();
            lastBlock = newT.blockNumber as number;
            lastId = newT.id as number;
        }
        last_tx_id_process.value = lastId.toString();
        last_tx_id_process.time_updated = tools.getCurrentTimeStamp();
        await last_tx_id_process.save();
        console.log(`${transactions.count()} processed transactions. last block:${lastBlock} last transaction id:${lastId}`);
        await connection.commit();
        await tools.sleep(500);
        await run();
    }catch (e){
        console.log("ERROR");
        console.log(e);
        await connection.rollback();
    }
}
async function addEvent(_result:AnalysisResult): Promise<eth_contract_events>{
    let newEvent = new eth_contract_events();
    newEvent.txn_hash = _result.hash;
    newEvent.fromSymbol = _result.fromSymbol;
    await newEvent.fetch();
    if(newEvent.isNew()){
        console.log(`adding event hash:${_result.hash}`);
        newEvent.loadValues(_result,true);
        await newEvent.save();
        console.log(`...added event method:${newEvent.method}`);
    }
    else{
        console.log(`...skipped, event already added for txn:${newEvent.txn_hash}`);
    }
    return newEvent;
}
run().finally();