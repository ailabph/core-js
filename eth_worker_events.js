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
exports.eth_worker_events = void 0;
const config_1 = require("./config");
const tools_1 = require("./tools");
const eth_config_1 = require("./eth_config");
const connection_1 = require("./connection");
const eth_transaction_1 = require("./build/eth_transaction");
const eth_worker_1 = require("./eth_worker");
const eth_contract_events_1 = require("./build/eth_contract_events");
class eth_worker_events {
    static run() {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            if (!eth_worker_events.hasRun) {
                console.log(`running events worker on env:${config_1.config.getEnv()} rpc:${eth_config_1.eth_config.getRPCUrl()}`);
                console.log(`retrieving unprocessed token tagged transactions`);
                eth_worker_events.hasRun = true;
            }
            yield connection_1.connection.startTransaction();
            try {
                const unprocessedTransactions = new eth_transaction_1.eth_transaction();
                yield unprocessedTransactions.list(" WHERE time_processed IS NULL AND token_found=:y ", { y: "y" }, ` ORDER BY id ASC LIMIT ${eth_worker_events.getBatchLimit()} `);
                if (unprocessedTransactions.count() > 0)
                    console.log(`${unprocessedTransactions.count()} unprocessed transactions found`);
                for (const transaction of unprocessedTransactions._dataList) {
                    const event = new eth_contract_events_1.eth_contract_events();
                    event.txn_hash = transaction.hash;
                    yield event.fetch();
                    if (event.recordExists()) {
                        console.log(`${transaction.hash} event already added, skipping`);
                        transaction.time_processed = tools_1.tools.getCurrentTimeStamp();
                        yield transaction.save();
                        continue;
                    }
                    console.log(`analyzing ${transaction.hash} is_swap:${transaction.is_swap ? "yes" : "n"}`);
                    const result = yield eth_worker_1.eth_worker.analyzeTokenTransaction(transaction);
                    event.loadValues(result, true);
                    const block = yield eth_worker_1.eth_worker.getBlockByNumber((_a = transaction.blockNumber) !== null && _a !== void 0 ? _a : 0, true);
                    if (!((_b = block.time_added) !== null && _b !== void 0 ? _b : 0 > 0))
                        throw new Error(`no time_added information on block ${block.blockNumber}`);
                    event.block_time = block.time_added;
                    event.blockNumber = block.blockNumber;
                    event.tax_amount = result.taxAmount;
                    event.tax_percentage = parseFloat(result.taxPerc);
                    // set price context
                    let token_amount = -1;
                    if (event.type === "buy") {
                        token_amount = (_c = event.toAmount) !== null && _c !== void 0 ? _c : -1;
                    }
                    else if (event.type === "sell" || event.type === "transfer") {
                        token_amount = (_d = event.fromAmountGross) !== null && _d !== void 0 ? _d : -1;
                    }
                    if (token_amount < 0)
                        throw new Error(`token_amount not established`);
                    let bnb_usdBn = yield eth_worker_1.eth_worker.getBnbUsdPriceByBlockNumber(event.blockNumber);
                    event.bnb_usd = bnb_usdBn.toFixed(18);
                    let token_bnbBn = yield eth_worker_1.eth_worker.getTokenBnbPriceByBlockNumber(event.blockNumber);
                    event.token_usd = token_bnbBn.toFixed(18);
                    event.token_bnb_value = tools_1.tools.toBn(token_amount).multipliedBy(token_bnbBn).toFixed(18);
                    event.token_usd_value = null;
                    yield event.save();
                    console.log(`${event.txn_hash} event added. method:${event.method} type:${event.type}`);
                    transaction.time_processed = tools_1.tools.getCurrentTimeStamp();
                    yield transaction.save();
                }
                yield connection_1.connection.commit();
            }
            catch (e) {
                yield connection_1.connection.rollback();
                console.error(e);
            }
            yield tools_1.tools.sleep(eth_worker_events.waitMs());
            yield eth_worker_events.run();
        });
    }
    static waitMs() {
        const worker_wait_ms = config_1.config.getCustomOption("worker_wait_ms");
        if (tools_1.tools.isNumeric(worker_wait_ms) && worker_wait_ms > 0) {
            return worker_wait_ms;
        }
        return eth_config_1.eth_config.default_worker_wait_ms;
    }
    static getBatchLimit() {
        const batch_limit = config_1.config.getCustomOption("worker_events_batch");
        if (tools_1.tools.isNumeric(batch_limit) && batch_limit > 0) {
            return batch_limit;
        }
        return eth_config_1.eth_config.default_worker_batch;
    }
}
exports.eth_worker_events = eth_worker_events;
eth_worker_events.hasRun = false;
