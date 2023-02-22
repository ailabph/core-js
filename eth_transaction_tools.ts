import {assert} from "./assert";
import {eth_worker} from "./eth_worker";
import {tools} from "./tools";
import {eth_transaction} from "./build/eth_transaction";

export class eth_transaction_tools{

    public static async get(transaction:number|string|eth_transaction):Promise<eth_transaction>{
        let to_return = new eth_transaction();
        let method = "";
        if(tools.isNumeric(transaction)){
            method = `,via id:${transaction}`;
            to_return.id = transaction as number;
            await to_return.fetch();
        }
        if(!tools.isNumeric(transaction) && typeof transaction === "string"){
            method = `,via hash:${transaction}`;
            to_return.hash = transaction;
            await to_return.fetch();
        }
        if(typeof transaction !== "number" && typeof transaction !== "string"){
            method = `,via passed eth_transaction object`;
            to_return = transaction;
        }
        if(to_return.isNew()) throw new Error(`unable to retrieve eth_transaction${method}`);
        return to_return;
    }

    public static async importWeb3TransactionsToDbByBlockNumber(blockNumber:number):Promise<eth_transaction>{
        assert.inTransaction();
        if(!(blockNumber > 0)) throw new Error("blockNumber must be greater than 0");
        let result = new eth_transaction();
        const transactions = await eth_worker.getTxnByBlockNumberWeb3(blockNumber);
        for(const transaction of transactions.transactions){
            let txn_db = new eth_transaction();
            txn_db.hash = transaction.hash;
            await txn_db.fetch();
            if(txn_db.recordExists()) continue;
            txn_db.loadValues(transaction,true);
            txn_db.fromAddress = transaction.from;
            txn_db.toAddress = transaction.to;
            await txn_db.save();
            result._dataList.push(txn_db);
        }
        console.log(`${result.count()} imported transactions from block:${blockNumber}`);
        return result;
    }

}