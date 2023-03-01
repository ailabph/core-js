import {argv} from "process";
import {assert} from "./assert";
import {connection} from "./connection";
import {tools} from "./tools";
import {eth_receipt_logs} from "./build/eth_receipt_logs";
import {eth_transaction} from "./build/eth_transaction";
import {eth_receipt} from "./build/eth_receipt";

const batchLimit = 1000;
export class eth_worker_db_cleaner{
    public static lastLogIdChecked:number = 0;
    public static lastTransactionIdChecked:number = 0;

    public static async run(){
        let totalLogsDeleted = 0
        let totalLogsSkipCauseTxnIsInvolved = 0;
        await connection.startTransaction();
        try{
            const checkLogs = new eth_receipt_logs();
            console.log(`retrieving uninvolved logs...`)
            await checkLogs.list(
                " WHERE id>:id AND has_bnb_usd IS NULL AND has_token IS NULL AND has_token_dex IS NULL ",
                {id:eth_worker_db_cleaner.lastLogIdChecked},` ORDER BY id ASC LIMIT ${batchLimit} `);
            console.log(`${checkLogs.count()} found logs uninvolved. checking corresponding transactions`);
            for(const log of checkLogs._dataList as eth_receipt_logs[]){
                eth_worker_db_cleaner.lastLogIdChecked = log.id as number;
                const checkTxn = new eth_transaction();
                checkTxn.hash = assert.isString({val:log.transactionHash,prop_name:"transactionHash",strict:true});
                await checkTxn.fetch();
                if(checkTxn.isNew() || (checkTxn.has_bnb_usd !== "y" && checkTxn.has_token !== "y" && checkTxn.has_token_dex !== "y")){
                    await log.delete(true);
                    totalLogsDeleted++;
                }
                else{
                    totalLogsSkipCauseTxnIsInvolved++;
                }
            }
            console.log(`${totalLogsDeleted} total logs deleted. ${totalLogsSkipCauseTxnIsInvolved} logs skip cause txn is involved`);

            // checking transactions not involved
            let totalTransactionsDeleted = 0, totalReceiptDeleted = 0;
            const checkTransactions = new eth_transaction();
            await checkTransactions.list(
                " WHERE id>:id AND has_bnb_usd IS NULL AND has_token IS NULL AND has_token_dex IS NULL "
                ,{id:eth_worker_db_cleaner.lastTransactionIdChecked},` ORDER BY id ASC LIMIT ${batchLimit} `);
            console.log(`${checkTransactions.count()} found transactions uninvolved. deleting transactions and receipts`);
            for(const transaction of checkTransactions._dataList as eth_transaction[]){
                eth_worker_db_cleaner.lastTransactionIdChecked = assert.isNumber(transaction.id,"transaction.id",0);
                await transaction.delete(true);
                totalTransactionsDeleted++;
                const dbReceipt = new eth_receipt();
                dbReceipt.transactionHash = transaction.hash;
                if(dbReceipt.recordExists()){
                    await dbReceipt.delete(true);
                    totalReceiptDeleted++;
                }
            }
            console.log(`${totalTransactionsDeleted} total transactions delete. ${totalReceiptDeleted} total receipt deleted`);

            await connection.commit();
            if(checkLogs.count() === 0 && checkTransactions.count() === 0){
                await tools.sleep(10000);
            }
            const used = process.memoryUsage().heapUsed / 1024 / 1024;
            console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);

            setImmediate(()=>{
                eth_worker_db_cleaner.run().finally();
            });
        }catch (e) {
            await connection.rollback();
            console.log(e);
        }
    }
}

if(argv.includes("run")){
    console.log(`running worker to clean db of uninvolved data`);
    eth_worker_db_cleaner.run().finally();
}