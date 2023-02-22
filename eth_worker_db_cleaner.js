"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_worker_db_cleaner = void 0;
const process_1 = require("process");
const assert_1 = require("./assert");
const connection_1 = require("./connection");
const tools_1 = require("./tools");
const eth_receipt_logs_1 = require("./build/eth_receipt_logs");
const eth_transaction_1 = require("./build/eth_transaction");
const eth_receipt_1 = require("./build/eth_receipt");
const batchLimit = 1000;
class eth_worker_db_cleaner {
    static async run() {
        let totalLogsDeleted = 0;
        let totalLogsSkipCauseTxnIsInvolved = 0;
        await connection_1.connection.startTransaction();
        try {
            const checkLogs = new eth_receipt_logs_1.eth_receipt_logs();
            console.log(`retrieving uninvolved logs...`);
            await checkLogs.list(" WHERE id>:id AND has_bnb_usd IS NULL AND has_token IS NULL AND has_token_dex IS NULL ", { id: eth_worker_db_cleaner.lastLogIdChecked }, ` ORDER BY id ASC LIMIT ${batchLimit} `);
            console.log(`${checkLogs.count()} found logs uninvolved. checking corresponding transactions`);
            for (const log of checkLogs._dataList) {
                eth_worker_db_cleaner.lastLogIdChecked = log.id;
                const checkTxn = new eth_transaction_1.eth_transaction();
                checkTxn.hash = assert_1.assert.isString({ val: log.transactionHash, prop_name: "transactionHash", strict: true });
                await checkTxn.fetch();
                if (checkTxn.isNew() || (checkTxn.has_bnb_usd !== "y" && checkTxn.has_token !== "y" && checkTxn.has_token_dex !== "y")) {
                    await log.delete(true);
                    totalLogsDeleted++;
                }
                else {
                    totalLogsSkipCauseTxnIsInvolved++;
                }
            }
            console.log(`${totalLogsDeleted} total logs deleted. ${totalLogsSkipCauseTxnIsInvolved} logs skip cause txn is involved`);
            // checking transactions not involved
            let totalTransactionsDeleted = 0, totalReceiptDeleted = 0;
            const checkTransactions = new eth_transaction_1.eth_transaction();
            await checkTransactions.list(" WHERE id>:id AND has_bnb_usd IS NULL AND has_token IS NULL AND has_token_dex IS NULL ", { id: eth_worker_db_cleaner.lastTransactionIdChecked }, ` ORDER BY id ASC LIMIT ${batchLimit} `);
            console.log(`${checkTransactions.count()} found transactions uninvolved. deleting transactions and receipts`);
            for (const transaction of checkTransactions._dataList) {
                eth_worker_db_cleaner.lastTransactionIdChecked = assert_1.assert.isNumber(transaction.id, "transaction.id", 0);
                await transaction.delete(true);
                totalTransactionsDeleted++;
                const dbReceipt = new eth_receipt_1.eth_receipt();
                dbReceipt.transactionHash = transaction.hash;
                if (dbReceipt.recordExists()) {
                    await dbReceipt.delete(true);
                    totalReceiptDeleted++;
                }
            }
            console.log(`${totalTransactionsDeleted} total transactions delete. ${totalReceiptDeleted} total receipt deleted`);
            await connection_1.connection.commit();
            if (checkLogs.count() === 0 && checkTransactions.count() === 0) {
                await tools_1.tools.sleep(10000);
            }
            const used = process.memoryUsage().heapUsed / 1024 / 1024;
            console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
            setImmediate(() => {
                eth_worker_db_cleaner.run();
            });
        }
        catch (e) {
            await connection_1.connection.rollback();
            console.log(e);
        }
    }
}
exports.eth_worker_db_cleaner = eth_worker_db_cleaner;
eth_worker_db_cleaner.lastLogIdChecked = 0;
eth_worker_db_cleaner.lastTransactionIdChecked = 0;
if (process_1.argv.includes("run")) {
    console.log(`running worker to clean db of uninvolved data`);
    eth_worker_db_cleaner.run().finally();
}
//# sourceMappingURL=eth_worker_db_cleaner.js.map