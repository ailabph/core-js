"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const connection_1 = require("./connection");
const tools_1 = require("./tools");
const eth_worker_1 = require("./eth_worker");
const eth_transaction_1 = require("./build/eth_transaction");
const eth_contract_events_1 = require("./build/eth_contract_events");
const generic_data_1 = require("./build/generic_data");
let batchLimit = 4000;
console.log("starting worker to analyze transactions related to tracked token");
async function run() {
    await connection_1.connection.startTransaction();
    try {
        let transactions = new eth_transaction_1.eth_transaction();
        let lastBlock = 0;
        let lastId = 0;
        let last_tx_id_process = new generic_data_1.generic_data();
        last_tx_id_process.tag = "last_tx_id_process";
        await last_tx_id_process.fetch();
        if (last_tx_id_process.recordExists()) {
            if (typeof last_tx_id_process.value === "string") {
                lastId = parseInt(last_tx_id_process.value);
            }
        }
        console.log("querying transactions not processed...");
        await transactions.list(" WHERE id>:id ", { id: lastId }, ` ORDER BY id ASC LIMIT ${batchLimit} `);
        console.log(`...${transactions.count()} found. last_tx_id_processed:${lastId}`);
        let newT = new eth_transaction_1.eth_transaction();
        while (newT = transactions.getItem()) {
            if (config_1.config.getConfig().verbose_log)
                console.log(`processing ${newT.hash}`);
            let result = await eth_worker_1.eth_worker.analyzeTransaction2(newT);
            let status = "not_involved";
            if (result.status === "involved" && result.sendStatus === "success") {
                console.log(`hash:${result.hash} method:${result.method}`);
                status = "involved";
                await addEvent(result);
            }
            newT.status = status;
            newT.time_processed = tools_1.tools.getCurrentTimeStamp();
            await newT.save();
            lastBlock = newT.blockNumber;
            lastId = newT.id;
        }
        last_tx_id_process.value = lastId.toString();
        last_tx_id_process.time_updated = tools_1.tools.getCurrentTimeStamp();
        await last_tx_id_process.save();
        console.log(`${transactions.count()} processed transactions. last block:${lastBlock} last transaction id:${lastId}`);
        await connection_1.connection.commit();
        await tools_1.tools.sleep(500);
        await run();
    }
    catch (e) {
        console.log("ERROR");
        console.log(e);
        await connection_1.connection.rollback();
    }
}
async function addEvent(_result) {
    let newEvent = new eth_contract_events_1.eth_contract_events();
    newEvent.txn_hash = _result.hash;
    newEvent.fromSymbol = _result.fromSymbol;
    await newEvent.fetch();
    if (newEvent.isNew()) {
        console.log(`adding event hash:${_result.hash}`);
        newEvent.loadValues(_result, true);
        await newEvent.save();
        console.log(`...added event method:${newEvent.method}`);
    }
    else {
        console.log(`...skipped, event already added for txn:${newEvent.txn_hash}`);
    }
    return newEvent;
}
run().finally();
//# sourceMappingURL=worker_eth_process.js.map