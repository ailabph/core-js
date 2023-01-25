"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ailab_core_1 = require("./ailab-core");
const eth_transaction_1 = require("./build/eth_transaction");
const eth_contract_events_1 = require("./build/eth_contract_events");
const generic_data_1 = require("./build/generic_data");
let batchLimit = 4000;
console.log("starting worker to analyze transactions related to tracked token");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield ailab_core_1.connection.startTransaction();
        try {
            let transactions = new eth_transaction_1.eth_transaction();
            let lastBlock = 0;
            let lastId = 0;
            let last_tx_id_process = new generic_data_1.generic_data();
            last_tx_id_process.tag = "last_tx_id_process";
            yield last_tx_id_process.fetch();
            if (last_tx_id_process.recordExists()) {
                if (typeof last_tx_id_process.value === "string") {
                    lastId = parseInt(last_tx_id_process.value);
                }
            }
            console.log("querying transactions not processed...");
            yield transactions.list(" WHERE id>:id ", { id: lastId }, ` ORDER BY id ASC LIMIT ${batchLimit} `);
            console.log(`...${transactions.count()} found. last_tx_id_processed:${lastId}`);
            let newT = new eth_transaction_1.eth_transaction();
            while (newT = transactions.getItem()) {
                if (ailab_core_1.config.getConfig().verbose_log)
                    console.log(`processing ${newT.hash}`);
                let result = yield ailab_core_1.eth_worker.analyzeTransaction2(newT);
                let status = "not_involved";
                if (result.status === "involved" && result.sendStatus === "success") {
                    console.log(`hash:${result.hash} method:${result.method}`);
                    status = "involved";
                    yield addEvent(result);
                }
                newT.status = status;
                newT.time_processed = ailab_core_1.tools.getCurrentTimeStamp();
                yield newT.save();
                lastBlock = newT.blockNumber;
                lastId = newT.id;
            }
            last_tx_id_process.value = lastId.toString();
            last_tx_id_process.time_updated = ailab_core_1.tools.getCurrentTimeStamp();
            yield last_tx_id_process.save();
            console.log(`${transactions.count()} processed transactions. last block:${lastBlock} last transaction id:${lastId}`);
            yield ailab_core_1.connection.commit();
            yield ailab_core_1.tools.sleep(500);
            yield run();
        }
        catch (e) {
            console.log("ERROR");
            console.log(e);
            yield ailab_core_1.connection.rollback();
        }
    });
}
function addEvent(_result) {
    return __awaiter(this, void 0, void 0, function* () {
        let newEvent = new eth_contract_events_1.eth_contract_events();
        newEvent.txn_hash = _result.hash;
        newEvent.fromSymbol = _result.fromSymbol;
        yield newEvent.fetch();
        if (newEvent.isNew()) {
            console.log(`adding event hash:${_result.hash}`);
            newEvent.loadValues(_result, true);
            yield newEvent.save();
            console.log(`...added event method:${newEvent.method}`);
        }
        else {
            console.log(`...skipped, event already added for txn:${newEvent.txn_hash}`);
        }
        return newEvent;
    });
}
run().finally();
