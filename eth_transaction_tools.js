"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_transaction_tools = void 0;
const assert_1 = require("./assert");
const eth_worker_1 = require("./eth_worker");
const tools_1 = require("./tools");
const eth_transaction_1 = require("./build/eth_transaction");
class eth_transaction_tools {
    static async get(transaction) {
        let to_return = new eth_transaction_1.eth_transaction();
        let method = "";
        if (tools_1.tools.isNumeric(transaction)) {
            method = `,via id:${transaction}`;
            to_return.id = transaction;
            await to_return.fetch();
        }
        if (!tools_1.tools.isNumeric(transaction) && typeof transaction === "string") {
            method = `,via hash:${transaction}`;
            to_return.hash = transaction;
            await to_return.fetch();
        }
        if (typeof transaction !== "number" && typeof transaction !== "string") {
            method = `,via passed eth_transaction object`;
            to_return = transaction;
        }
        if (to_return.isNew())
            throw new Error(`unable to retrieve eth_transaction${method}`);
        return to_return;
    }
    static async importWeb3TransactionsToDbByBlockNumber(blockNumber) {
        assert_1.assert.inTransaction();
        if (!(blockNumber > 0))
            throw new Error("blockNumber must be greater than 0");
        let result = new eth_transaction_1.eth_transaction();
        const transactions = await eth_worker_1.eth_worker.getTxnByBlockNumberWeb3(blockNumber);
        for (const transaction of transactions.transactions) {
            let txn_db = new eth_transaction_1.eth_transaction();
            txn_db.hash = transaction.hash;
            await txn_db.fetch();
            if (txn_db.recordExists())
                continue;
            txn_db.loadValues(transaction, true);
            txn_db.fromAddress = transaction.from;
            txn_db.toAddress = transaction.to;
            await txn_db.save();
            result._dataList.push(txn_db);
        }
        console.log(`${result.count()} imported transactions from block:${blockNumber}`);
        return result;
    }
}
exports.eth_transaction_tools = eth_transaction_tools;
//# sourceMappingURL=eth_transaction_tools.js.map