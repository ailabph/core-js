import {TransactionReceipt} from "web3-eth/types";
import {AnalyzeLogsResult} from "./eth_types";
import {assert} from "./assert";
import {eth_receipt} from "./build/eth_receipt";
import {eth_worker} from "./eth_worker";
import {eth_receipt_logs} from "./build/eth_receipt_logs";
import {Log} from "web3-core";
import {BaseType, eth_log_decoder, TransferLog} from "./eth_log_decoder";
import {tools} from "./tools";
import {eth_config} from "./eth_config";

export class eth_receipt_logs_tools{

    public static async getReceiptLogs(txn_hash:string): Promise<AnalyzeLogsResult>{
        assert.inTransaction();
        assert.notEmpty(txn_hash,"txn_hash");
        let receipt_db = new eth_receipt();
        receipt_db.transactionHash = txn_hash;
        await receipt_db.fetch();
        if(receipt_db.isNew()){
            console.log(`hash:${txn_hash} receipt not on db, retrieving in rpc...`)
            const receipt = await eth_worker.getReceiptByTxnHashWeb3(txn_hash);
            receipt_db.blockHash = receipt.blockHash;
            receipt_db.blockNumber = receipt.blockNumber;
            receipt_db.contractAddress = receipt.contractAddress ?? "";
            receipt_db.cumulativeGasUsed = receipt.cumulativeGasUsed.toString();
            receipt_db.fromAddress = receipt.from;
            receipt_db.gasUsed = receipt.gasUsed.toString();
            receipt_db.logsBloom = receipt.logsBloom;
            receipt_db.status = receipt.status ? "true" : "false";
            receipt_db.toAddress = receipt.to;
            receipt_db.transactionHash = receipt.transactionHash;
            receipt_db.transactionIndex = receipt.transactionIndex;
            await receipt_db.save();

            let logCheck = new eth_receipt_logs();
            await logCheck.list(" WHERE receipt_id=:receipt_id ",{receipt_id:receipt_db.id});
            if(logCheck.count() > 0) throw new Error(`logs already set for receipt id:${receipt_db.id} txn_hash:${receipt_db.transactionHash}`);

            for(let i=0; i < receipt.logs.length; i++){
                const log = receipt.logs[i];
                let logs_db = new eth_receipt_logs();
                logs_db.receipt_id = receipt_db.id;
                logs_db.txn_hash = log.transactionHash;
                logs_db.address = log.address;
                logs_db.topics = JSON.stringify(log.topics);
                logs_db.data = log.data;
                logs_db.blockNumber = log.blockNumber;
                logs_db.transactionHash = log.transactionHash;
                logs_db.transactionIndex = log.transactionIndex;
                logs_db.blockHash = log.blockHash;
                logs_db.logIndex = log.logIndex;
                await logs_db.save();
            }

            return eth_receipt_logs_tools.getReceiptLogs(txn_hash);
        }
        else{
            let receipt: TransactionReceipt = {
                blockHash: receipt_db.blockHash ?? "",
                blockNumber: receipt_db.blockNumber ?? 0,
                contractAddress: receipt_db.contractAddress ?? "",
                cumulativeGasUsed: parseFloat(receipt_db.cumulativeGasUsed ?? "0"),
                events: {},
                from: receipt_db.fromAddress ?? "",
                gasUsed: parseFloat(receipt_db.gasUsed ?? "0"),
                logs: [],
                logsBloom: receipt_db.logsBloom ?? "",
                status: (receipt_db.status ?? "false") === "true",
                to: receipt_db.toAddress ?? "",
                transactionHash: receipt_db.transactionHash ?? "",
                transactionIndex: receipt_db.transactionIndex ?? 0
            };
            let logs = new eth_receipt_logs();
            await logs.list(" WHERE receipt_id=:receipt_id ",{receipt_id:receipt_db.id});
            let log = new eth_receipt_logs();
            while(log = logs.getItem()){
                let topic_log:Log = {
                    address: log.address ?? "",
                    blockHash: log.blockHash ?? "",
                    blockNumber: log.blockNumber ?? 0,
                    data: log.data ?? "",
                    logIndex: log.logIndex ?? 0,
                    topics: JSON.parse(log.topics ?? "[]"),
                    transactionHash: log.transactionHash ?? "",
                    transactionIndex: log.transactionIndex ?? 0
                };
                receipt.logs.push(topic_log);
            }
            return {receipt: receipt, result: []};
        }
    }

    public static async getFirstTopicLog(txn_hash:string|AnalyzeLogsResult): Promise<BaseType>{
        const analyzeLogsResult = typeof txn_hash === "string" ? await eth_receipt_logs_tools.getReceiptLogs(txn_hash) : txn_hash;
        if(analyzeLogsResult.receipt.logs.length === 0) throw new Error(`transaction(${txn_hash}) has no log topics`);
        return await eth_log_decoder.decodeLog(analyzeLogsResult.receipt.logs[0]);
    }

    public static async getLastTopicLog(txn_hash:string|AnalyzeLogsResult): Promise<BaseType|false>{
        const analyzeLogsResult = typeof txn_hash === "string" ? await eth_receipt_logs_tools.getReceiptLogs(txn_hash) : txn_hash;
        if(analyzeLogsResult.receipt.logs.length === 0) throw new Error(`transaction(${txn_hash}) has no log topics`);
        return await eth_log_decoder.decodeLog(analyzeLogsResult.receipt.logs[analyzeLogsResult.receipt.logs.length-1]);
    }

    public static async getFirstLogByMethod<T>(txn_hash:string|AnalyzeLogsResult,method_name:string,strict:boolean = false): Promise<T|false>{
        const analyzeLogsResult = typeof txn_hash === "string" ? await eth_receipt_logs_tools.getReceiptLogs(txn_hash) : txn_hash;
        if(analyzeLogsResult.receipt.logs.length === 0) throw new Error(`transaction(${txn_hash}) has no log topics`);
        for(const log of analyzeLogsResult.receipt.logs){
            const decodedLog = await eth_log_decoder.decodeLog(log);
            if(decodedLog.method_name.toLowerCase() === method_name.toLowerCase()){
                return decodedLog as unknown as T;
            }
        }
        if(strict) throw new Error(`hash:${analyzeLogsResult.receipt.transactionHash} unable to find log:${method_name}`);
        return false;
    }

    public static async getFirstUserTransferInLogs(txn_hash:string|AnalyzeLogsResult,from:string): Promise<TransferLog>{
        const transferLogs = await eth_receipt_logs_tools.getLogsByMethod<TransferLog>(txn_hash,"transfer");
        let to_return:TransferLog|undefined;
        for(const transfer of transferLogs){
            if(from.toLowerCase() === transfer.from.toLowerCase()){
                to_return = transfer;
                break;
            }
        }
        if(typeof to_return === "undefined"){
            throw new Error(`unable to retrieve transfer from:${from}`);
        }
        return to_return;
    }

    public static async getLastLogByMethod<T>(txn_hash:string|AnalyzeLogsResult,method_name:string,strict:boolean = false): Promise<T|false>{
        const analyzeLogsResult = typeof txn_hash === "string" ? await eth_receipt_logs_tools.getReceiptLogs(txn_hash) : txn_hash;
        if(analyzeLogsResult.receipt.logs.length === 0) throw new Error(`transaction(${txn_hash}) has no log topics`);
        let to_return:T|boolean = false;
        for(const log of analyzeLogsResult.receipt.logs){
            const decodedLog = await eth_log_decoder.decodeLog(log);
            if(decodedLog.method_name.toLowerCase() === method_name.toLowerCase()){
                to_return = decodedLog as unknown as T;
            }
        }
        if(!to_return && strict) throw new Error(`hash:${analyzeLogsResult.receipt.transactionHash} unable to find log:${method_name}`);
        return to_return ? to_return : false;
    }

    public static async getLogsByMethod<T>(txn_hash:string|AnalyzeLogsResult,method_name:string,strict:boolean = false): Promise<T[]>{
        const analyzeLogsResult = typeof txn_hash === "string" ? await eth_receipt_logs_tools.getReceiptLogs(txn_hash) : txn_hash;
        if(
            analyzeLogsResult.receipt.status
            && analyzeLogsResult.receipt.logs.length === 0
        ) {
            const error_msg = `transaction(${txn_hash}) has no log topics`;
            if(strict) throw new Error(error_msg);
            console.warn(error_msg);
        }
        let collection:T[] = [];
        for(const log of analyzeLogsResult.receipt.logs){
            const decodedLog = await eth_log_decoder.decodeLog(log);
            if(decodedLog.method_name.toLowerCase() === method_name.toLowerCase()){
                collection.push(decodedLog as unknown as T);
            }
        }
        if(collection.length === 0 && strict) throw new Error(`no logs found for method:${method_name} in hash:${analyzeLogsResult.receipt.transactionHash}`);
        return collection;
    }

    public static async findValueInLogs(txn_hash:string|AnalyzeLogsResult,find_value:string):Promise<boolean>{
        assert.notEmpty(find_value);
        const analyzeLogsResult = typeof txn_hash === "string" ? await eth_receipt_logs_tools.getReceiptLogs(txn_hash) : txn_hash;

        let receipt = await eth_worker.getReceiptByTxnHash(analyzeLogsResult.receipt.transactionHash) as TransactionReceipt;
        for(const log of receipt.logs){
            for(const key in log){
                const value = (log as any)[key];
                if(tools.stringFoundInStringOrArray(value,find_value)){
                    return true;
                }
            }
        }

        return false;
    }

    public static async findTokenInLogs(txn_hash:string|AnalyzeLogsResult):Promise<boolean>{
        const findTokenContract = eth_worker.stripBeginningZeroXFromString(eth_config.getTokenContract());
        return await eth_receipt_logs_tools.findValueInLogs(txn_hash,findTokenContract);
    }

    public static async getTransferTokenFrom(txn_hash:string|AnalyzeLogsResult,from:string):Promise<TransferLog[]>{
        const transfers = await eth_receipt_logs_tools.getLogsByMethod<TransferLog>(txn_hash,"transfer");
        let foundTransfers:TransferLog[] = [];
        for(const transfer of transfers){
            if(transfer.from.toLowerCase() === from.toLowerCase() && transfer.ContractInfo.address.toLowerCase() === eth_config.getTokenContract().toLowerCase()){
                foundTransfers.push(transfer);
            }
        }
        return foundTransfers;
    }

    public static async getFirstTransferFrom(txn_hash:string|AnalyzeLogsResult,from:string):Promise<TransferLog|false>{
        const transfers = await eth_receipt_logs_tools.getLogsByMethod<TransferLog>(txn_hash,"transfer");
        for(const transfer of transfers){
            if(transfer.from.toLowerCase() === from.toLowerCase()) return transfer;
        }
        return false;
    }

}