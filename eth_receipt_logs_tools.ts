import {TransactionReceipt} from "web3-eth/types";
import {assert} from "./assert";
import {config} from "./config";
import {eth_config} from "./eth_config";
import {eth_types,AnalyzeLogsResult,ContractInfo} from "./eth_types";
import {tools} from "./tools";
import {web3_abi_decoder} from "./web3_abi_decoder";
import {eth_worker} from "./eth_worker";
import {web3_log_decoder,BaseType,SwapLog,TransferLog} from "./web3_log_decoder";
import {eth_receipt} from "./build/eth_receipt";
import {eth_receipt_logs} from "./build/eth_receipt_logs";
import {Log} from "web3-core";
import {PAIR_INFO, TRADE_TYPE} from "./eth_worker_trade";
import {TIME_FORMATS, time_helper} from "./time_helper";
import {worker_price} from "./worker_price";
import {eth_contract_events} from "./build/eth_contract_events";
import {eth_contract_events_tools} from "./eth_contract_events_tools";
import {web3_pair_price_tools} from "./web3_pair_price_tools";

//region TYPES
type SwapTradeInfo = {
    contractInfo:ContractInfo,
    swapAmount:string,
    swapValue:string,
    transferAmount:string
}
export { SwapTradeInfo }
//endregion TYPES

export class eth_receipt_logs_tools{

    private static verbose = false;

    //region GETTERS
    public static async getReceiptLogs(txn_hash:string): Promise<AnalyzeLogsResult>{
        assert.inTransaction();
        assert.notEmpty(txn_hash,"txn_hash");
        let receipt_db = new eth_receipt();
        receipt_db.transactionHash = txn_hash;
        await receipt_db.fetch();
        if(receipt_db.isNew()){
            if(this.verbose) console.log(`hash:${txn_hash} receipt not on db, retrieving in rpc...`)
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
            if(this.verbose) console.log(`db receipt id:${receipt_db.id}`);

            let totalLogsAlreadyOnDb = 0, totalLogsAddedToDb = 0;
            for(const log of receipt.logs as Log[]){
                const check = new eth_receipt_logs();
                check.transactionHash = log.transactionHash;
                check.logIndex = log.logIndex;
                await check.fetch();
                if(check.recordExists()) {
                    totalLogsAlreadyOnDb++;
                    continue;
                }
                const dbLog = await eth_worker.convertWeb3LogToDbLog(log);
                await dbLog.save();
                totalLogsAddedToDb++;
            }
            if(this.verbose) console.log(`${totalLogsAlreadyOnDb} total logs already on db. ${totalLogsAddedToDb} total logs added to db`);
            return eth_receipt_logs_tools.getReceiptLogs(txn_hash);
        }
        else{
            if(this.verbose) console.log(`receipt info of ${txn_hash} on db`);
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
            await logs.list(" WHERE transactionHash=:transactionHash ",{transactionHash:receipt_db.transactionHash});
            let log = new eth_receipt_logs();
            while(log = logs.getItem()){
                if(this.verbose) console.log(`${log.id} ${log.blockNumber} ${log.logIndex}`);
                receipt.logs.push(eth_worker.convertDbLogToWeb3Log(log));
            }
            return {receipt: receipt, result: []};
        }
    }
    public static async getFirstTopicLog(txn_hash:string|AnalyzeLogsResult): Promise<BaseType>{
        const analyzeLogsResult = typeof txn_hash === "string" ? await eth_receipt_logs_tools.getReceiptLogs(txn_hash) : txn_hash;
        // if(analyzeLogsResult.receipt.logs.length === 0) throw new Error(`transaction(${txn_hash}) has no log topics`);
        return await web3_log_decoder.decodeLog(analyzeLogsResult.receipt.logs[0]);
    }
    public static async getLastTopicLog(txn_hash:string|AnalyzeLogsResult): Promise<BaseType|false>{
        const analyzeLogsResult = typeof txn_hash === "string" ? await eth_receipt_logs_tools.getReceiptLogs(txn_hash) : txn_hash;
        if(analyzeLogsResult.receipt.logs.length === 0) throw new Error(`transaction(${txn_hash}) has no log topics`);
        return await web3_log_decoder.decodeLog(analyzeLogsResult.receipt.logs[analyzeLogsResult.receipt.logs.length-1]);
    }
    public static async getFirstLogByMethod<T>(txn_hash:string|AnalyzeLogsResult,method_name:string,strict:boolean = false): Promise<T|false>{
        const analyzeLogsResult = typeof txn_hash === "string" ? await eth_receipt_logs_tools.getReceiptLogs(txn_hash) : txn_hash;
        // if(analyzeLogsResult.receipt.logs.length === 0) throw new Error(`transaction(${txn_hash}) has no log topics`);
        for(const log of analyzeLogsResult.receipt.logs){
            const decodedLog = await web3_log_decoder.decodeLog(log);
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
        // if(analyzeLogsResult.receipt.logs.length === 0) throw new Error(`transaction(${txn_hash}) has no log topics`);
        let to_return:T|boolean = false;
        for(const log of analyzeLogsResult.receipt.logs){
            const decodedLog = await web3_log_decoder.decodeLog(log);
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
            // if(strict) throw new Error(error_msg);
            console.warn(error_msg);
        }
        let collection:T[] = [];
        for(const log of analyzeLogsResult.receipt.logs){
            const decodedLog = await web3_log_decoder.decodeLog(log);
            if(decodedLog.method_name.toLowerCase() === method_name.toLowerCase()){
                collection.push(decodedLog as unknown as T);
            }
        }
        if(collection.length === 0 && strict) throw new Error(`no logs found for method:${method_name} in hash:${analyzeLogsResult.receipt.transactionHash}`);
        return collection;
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
    public static async getDbLog(transactionHash:string,logIndex:number):Promise<eth_receipt_logs>{
        const findLog = new eth_receipt_logs();
        findLog.transactionHash = transactionHash;
        findLog.logIndex = logIndex;
        await findLog.fetch();
        if(findLog.isNew()) throw new Error(`unable to retrieve log from db with hash: ${transactionHash} and logIndex: ${logIndex}`);
        return findLog;
    }
    //endregion GETTERS

    //region GET DEFAULTS
    public static getDefaultSwapTradeInfo():SwapTradeInfo{
        const defaultContract:ContractInfo = eth_types.getDefaultContractInfo();
        return {contractInfo: defaultContract, swapAmount: "", swapValue: "", transferAmount: ""};
    }
    //endregion GET DEFAULTS

    //region UTILITIES
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
    public static checkIfHasBnbUsdDex(log:Log):boolean{
        return log.address.toLowerCase() === eth_config.getBnbUsdPairContract().toLowerCase()
            || log.topics.includes(eth_config.getBnbUsdPairContract().toLowerCase());
    }
    public static checkIfHasToken(log:Log):boolean{
        return log.address.toLowerCase() === eth_config.getTokenContract().toLowerCase()
            || log.topics.includes(eth_config.getTokenContract().toLowerCase());
    }
    public static checkIfHasTokenDex(log:Log):boolean{
        return log.address.toLowerCase() === eth_config.getTokenBnbPairContract().toLowerCase()
            || log.topics.includes(eth_config.getTokenBnbPairContract().toLowerCase())
            || log.address.toLowerCase() === eth_config.getTokenUsdPairContract().toLowerCase()
            || log.topics.includes(eth_config.getTokenUsdPairContract().toLowerCase())
    }
    public static async analyzeLogsInvolvement(logs:Log[]){
        if(this.verbose) console.log(`${logs.length} logs to scan`);
        const total_logs = logs.length;
        let scan_count = 0;
        for(const log of logs as Log[]){
            if(this.verbose) console.log(`${++scan_count}/${total_logs} block ${log.blockNumber} hash ${log.transactionHash} logIndex ${log.logIndex}`);
            let has_bnb_usd = false;
            if(eth_receipt_logs_tools.checkIfHasBnbUsdDex(log)){
                has_bnb_usd = true;
            }

            let has_token = false;
            if(eth_receipt_logs_tools.checkIfHasToken(log)){
                has_token = true;
            }

            let has_token_dex = false;
            if(eth_receipt_logs_tools.checkIfHasTokenDex(log)){
                has_token_dex = true;
            }

            if(has_bnb_usd || has_token || has_token_dex){
                if(this.verbose) console.log(`transaction is involved, saving its logs to db`);
                const dbReceipt = await eth_receipt_logs_tools.getReceiptLogs(log.transactionHash);
                if(this.verbose) console.log(`${dbReceipt.receipt.logs.length} logs in db`);

                // flag this log
                const db_log = await eth_receipt_logs_tools.getDbLog(log.transactionHash,log.logIndex);
                if(has_bnb_usd) db_log.has_bnb_usd = "y";
                if(has_token) db_log.has_token = "y";
                if(has_token_dex) db_log.has_token_dex = "y";
                await db_log.save();
                if(this.verbose) console.log(`update log with flags, has_bnb_usd:${db_log.has_bnb_usd} has_token:${db_log.has_token} has_token_dex:${db_log.has_token_dex}`);

                // flag this transaction
                const transaction = await eth_worker.getDbTxnByHash(log.transactionHash);
                if(has_bnb_usd) transaction.has_bnb_usd = "y";
                if(has_token) transaction.has_token = "y";
                if(has_token_dex) transaction.has_token_dex = "y";
                await transaction.save();
                if(this.verbose) console.log(`update transaction flags, has_bnb_usd:${db_log.has_bnb_usd} has_token:${db_log.has_token} has_token_dex:${db_log.has_token_dex}`);

                // flag block
                const block = await eth_worker.getBlockByNumber(log.blockNumber);
                if(has_bnb_usd) block.has_bnb_usd = "y";
                if(has_token) block.has_token = "y";
                if(has_token_dex) block.has_token_dex = "y";
                await block.save();
                if(this.verbose) console.log(`update block flags, has_bnb_usd:${db_log.has_bnb_usd} has_token:${db_log.has_token} has_token_dex:${db_log.has_token_dex}`);
            }
        }
    }
    //endregion UTILITIES


    //region FOR EVENT PROCESS
    public static lastLogIdForProcessToEvent = 0;
    public static async getUnprocessedLogsForEvents():Promise<eth_receipt_logs[]>{
        const query = new eth_receipt_logs();
        await query.list(
            " WHERE time_processed_price>:zero AND id>:lastLogId AND time_processed_events IS NULL ",
            {zero:0,lastLogId:this.lastLogIdForProcessToEvent},
            ` ORDER BY blockTime ASC LIMIT ${this.getBatchProcessLogsForEvents()} `);
        if(query.count() > 0){
            this.lastLogIdForProcessToEvent = query._dataList[query.count()-1].id;
        }
        return query._dataList as eth_receipt_logs[];
    }
    public static getBatchProcessLogsForEvents():number{
        return 100;
    }

    public static getOrderLimitSwapToEvent():number{
        let limit = 1;
        const order_limit_swap_to_event = config.getCustomOption("order_limit_swap_to_event");
        if(tools.isWholeNumber(order_limit_swap_to_event)){
            limit = assert.positiveInt(order_limit_swap_to_event);
        }
        return limit;
    }
    public static lastBlockTimeProcessed = 0;
    public static async importSwapToTradeEvents(){
        assert.inTransaction();
        const find = await this.getUnprocessedTokenPairsLogsToEvents();
        for(const log of find._dataList as eth_receipt_logs[]){
            const blockTime = assert.positiveInt(log.blockTime);
            const web3Log = await eth_worker.convertDbLogToWeb3Log(log);
            const swapLog = await web3_log_decoder.getSwapLog(web3Log);
            if(swapLog){
                const pairInfo = await eth_worker.getPairInfo(swapLog.ContractInfo.address);
                const mainTokenInfo = await this.getContractInfoFromPair(pairInfo,eth_config.getTokenContract());
                const mainTokenDecimals = assert.positiveInt(mainTokenInfo.contractInfo.decimals);
                const otherTokenInfo = await this.getOppositeContractPairOf(pairInfo,mainTokenInfo.contractInfo.address);
                const tradeType = await this.getTradeTypeOfSwap(swapLog,mainTokenInfo.contractInfo.address);

                // get tokenSwapAmount based on trade type
                if(tradeType === TRADE_TYPE.BUY){
                    mainTokenInfo.swapAmount = await this.getBuySwapOf(swapLog,mainTokenInfo.contractInfo.address);
                    otherTokenInfo.swapAmount = await this.getSellSwapOf(swapLog,otherTokenInfo.contractInfo.address);
                }
                else if(tradeType === TRADE_TYPE.SELL){
                    mainTokenInfo.swapAmount = await this.getSellSwapOf(swapLog,mainTokenInfo.contractInfo.address);
                    otherTokenInfo.swapAmount = await this.getBuySwapOf(swapLog,otherTokenInfo.contractInfo.address);
                }
                else{
                    throw new Error(`unable to identify trade type of swap ${log.id} ${log.transactionHash} ${log.logIndex}`);
                }

                mainTokenInfo.transferAmount = await this.getTotalTransferOfSwap(log,mainTokenInfo.contractInfo.address);
                otherTokenInfo.transferAmount = await this.getTotalTransferOfSwap(log,otherTokenInfo.contractInfo.address);

                // compute fees
                const tokenAmountDifference = tools.toBn(mainTokenInfo.swapAmount).minus(tools.toBn(mainTokenInfo.transferAmount)).toFixed(mainTokenDecimals);
                let fees_percentage = "0";
                if(tools.getNumber(tokenAmountDifference,mainTokenDecimals) > 0){
                    fees_percentage = tools.toBn(tokenAmountDifference).dividedBy(tools.toBn(mainTokenInfo.swapAmount)).toFixed(4);
                }

                const bnb_usd_price = await worker_price.getBnbUsdPrice(blockTime);
                const token_usd_price = await worker_price.getUsdPriceOfToken(mainTokenInfo.contractInfo.address,blockTime);
                const token_bnb_price = await worker_price.getBnbPriceOfToken(mainTokenInfo.contractInfo.address,blockTime);
                const token_usd_value = await worker_price.getUsdValueOfToken(mainTokenInfo.contractInfo.address,blockTime,mainTokenInfo.transferAmount);
                const token_bnb_value = await worker_price.getBnbValueOfToken(mainTokenInfo.contractInfo.address,blockTime,mainTokenInfo.transferAmount);

                // create event
                const transaction = await eth_worker.getTxnByHash(assert.stringNotEmpty(log.transactionHash));
                const decodedTransaction = await web3_abi_decoder.decodeAbiObject(transaction.input);
                let newEvent = new eth_contract_events();
                newEvent.txn_hash = log.transactionHash;
                newEvent.blockNumber = assert.positiveInt(log.blockNumber);
                newEvent.logIndex = log.logIndex;
                newEvent.pair_contract = pairInfo.address;
                newEvent.type = tradeType;
                newEvent.tag = "";
                newEvent.method = "unknown";
                if(decodedTransaction){
                    newEvent.method = decodedTransaction.abi.name;
                }
                newEvent.log_method = swapLog.method_name;
                newEvent.fromAddress = transaction.from;

                const fromTokenInfo:SwapTradeInfo = tradeType === TRADE_TYPE.BUY ? otherTokenInfo : mainTokenInfo;
                const toTokenInfo:SwapTradeInfo = tradeType === TRADE_TYPE.BUY ? mainTokenInfo : otherTokenInfo;

                newEvent.fromContract = fromTokenInfo.contractInfo.address;
                newEvent.fromSymbol = fromTokenInfo.contractInfo.symbol;
                newEvent.fromDecimal = assert.naturalNumber(fromTokenInfo.contractInfo.decimals);
                newEvent.fromAmount = fromTokenInfo.swapAmount;
                newEvent.fromAmountGross = fromTokenInfo.transferAmount;

                newEvent.toContract = toTokenInfo.contractInfo.address;
                newEvent.toSymbol = toTokenInfo.contractInfo.symbol;
                newEvent.toDecimal = assert.naturalNumber(toTokenInfo.contractInfo.decimals);
                newEvent.toAmount = toTokenInfo.swapAmount;
                newEvent.toAmountGross = toTokenInfo.transferAmount;

                newEvent.tax_amount = tokenAmountDifference;
                newEvent.tax_percentage = tools.getNumber(fees_percentage,4);

                newEvent.block_time = blockTime;
                newEvent.bnb_usd = bnb_usd_price;
                newEvent.token_bnb = token_bnb_price;
                newEvent.token_bnb_value = token_bnb_value;
                newEvent.token_usd = token_usd_price
                newEvent.token_usd_value = token_usd_value;

                newEvent = await eth_contract_events_tools.checkAndSaveForTradeEvents(newEvent);

                console.log(`
                    ${time_helper.getAsFormat(blockTime,TIME_FORMATS.READABLE,"UTC")} 
                    ${newEvent.type} ${newEvent.txn_hash} ${newEvent.logIndex} 
                    ${newEvent.fromSymbol} ${newEvent.fromAmount} > 
                    ${newEvent.toSymbol} ${newEvent.toAmount} 
                    bnb_usd:${newEvent.bnb_usd} token_bnb:${newEvent.token_bnb} token_usd:${newEvent.token_usd} 
                    bnb_value ${newEvent.token_bnb_value} usd_value ${newEvent.token_usd_value}`);
            }

            log.time_processed_events = time_helper.getCurrentTimeStamp();
            await log.save();
            // cache blockTime for speed next query
            this.lastBlockTimeProcessed = blockTime;
        }



    }
    public static async getUnprocessedTokenPairsLogsToEvents():Promise<eth_receipt_logs>{
        const tradingPairs = eth_config.getTradingPairs();
        if(tradingPairs.length === 0) throw new Error(``);
        let where = " WHERE blockTime>=:from AND time_processed_price>:zero AND time_processed_events IS NULL AND (";
        let param: { [key: string]: string|number } = {};
        param[`from`] = this.lastBlockTimeProcessed;
        param[`zero`] = 0;
        let pairAdded = 0;
        for(const pair of tradingPairs as string[]){
            if(pairAdded > 0) where += ` OR `;
            where += ` address=:pair${pairAdded} `;
            param[`pair${pairAdded}`] = pair;
            pairAdded++;
        }
        where += ")";
        const find = new eth_receipt_logs();
        await find.list(where,param,` ORDER BY blockTime ASC, logIndex ASC LIMIT ${this.getOrderLimitSwapToEvent()} `);
        return find;
    }
    //endregion

    //region CHECKER
    public static isContractEventLog(log:eth_receipt_logs):boolean{
        const address = assert.stringNotEmpty(log.address,`isContractEventLog|log.address`);
        return address.toLowerCase() === eth_config.getTokenContract().toLowerCase();
    }
    public static isPairEventLog(log:eth_receipt_logs):boolean{
        const contract_address = assert.stringNotEmpty(log.address,`isPairEventLog log.address`);
        return  contract_address.toLowerCase() === eth_config.getTokenBnbPairContract().toLowerCase()
                || contract_address.toLowerCase() === eth_config.getTokenUsdPairContract().toLowerCase();
    }
    //endregion CHECKER

    //region LOG TRADE INFO
    public static async getTradeTypeOfSwap(swapLog:SwapLog,of_token_contract:string):Promise<TRADE_TYPE>{
        let to_return = TRADE_TYPE.NOT_SET;
        const pairInfo = await eth_worker.getPairInfo(swapLog.ContractInfo.address);

        if(pairInfo.token0_contract.toLowerCase() === of_token_contract.toLowerCase()){
            if(swapLog.amount0Out > 0 && swapLog.amount1Out === 0n){
                to_return = TRADE_TYPE.BUY;
            }
            if(swapLog.amount0In > 0 && swapLog.amount1In === 0n){
                to_return = TRADE_TYPE.SELL;
            }
        }else if(pairInfo.token1_contract.toLowerCase() === of_token_contract.toLowerCase()){
            if(swapLog.amount1Out > 0 && swapLog.amount0Out === 0n){
                to_return = TRADE_TYPE.BUY;
            }
            if(swapLog.amount1In > 0 && swapLog.amount0In === 0n){
                to_return = TRADE_TYPE.SELL;
            }
        }
        else{
            throw new Error(`unable to find contract:${of_token_contract} in pair contract:${pairInfo.address}`);
        }

        return to_return;
    }
    public static async getTotalSwapInOf(swapLog:SwapLog,of_token_contract:string):Promise<string>{
        let to_return = "0.0";
        const pairInfo = await eth_worker.getPairInfo(swapLog.ContractInfo.address);
        if(of_token_contract.toLowerCase() === pairInfo.token0_contract.toLowerCase()){
            to_return = eth_worker.convertValueToAmount(swapLog.amount0In.toString(),pairInfo.token0_decimal);
        }else if(of_token_contract.toLowerCase() === pairInfo.token1_contract.toLowerCase()){
            to_return = eth_worker.convertValueToAmount(swapLog.amount1In.toString(),pairInfo.token1_decimal);
        }
        else{
            throw new Error(`unable to find contract:${of_token_contract} in pair contract:${pairInfo.address}`);
        }
        return to_return;
    }
    public static async getTotalSwapOutOf(swapLog:SwapLog,of_token_contract:string):Promise<string>{
        let to_return = "0.0";
        const pairInfo = await eth_worker.getPairInfo(swapLog.ContractInfo.address);
        if(of_token_contract.toLowerCase() === pairInfo.token0_contract.toLowerCase()){
            to_return = eth_worker.convertValueToAmount(swapLog.amount0Out.toString(),pairInfo.token0_decimal);
        }else if(of_token_contract.toLowerCase() === pairInfo.token1_contract.toLowerCase()){
            to_return = eth_worker.convertValueToAmount(swapLog.amount1Out.toString(),pairInfo.token1_decimal);
        }
        else{
            throw new Error(`unable to find contract:${of_token_contract} in pair contract:${pairInfo.address}`);
        }
        return to_return;
    }
    public static async getBuySwapOf(swapLog:SwapLog,of_token_contract:string):Promise<string>{
        let to_return = "0.0";
        const pairInfo = await eth_worker.getPairInfo(swapLog.ContractInfo.address);
        const tradeType = await this.getTradeTypeOfSwap(swapLog,of_token_contract);
        if(tradeType === TRADE_TYPE.BUY){
            if(pairInfo.token0_contract.toLowerCase() === of_token_contract.toLowerCase()){
                to_return = eth_worker.convertValueToAmount(swapLog.amount0Out.toString(),pairInfo.token0_decimal);
            }
            else if(pairInfo.token1_contract.toLowerCase() === of_token_contract.toLowerCase()){
                to_return = eth_worker.convertValueToAmount(swapLog.amount1Out.toString(),pairInfo.token1_decimal);
            }
            else{
                throw new Error(`unable to find contract:${of_token_contract} in pair contract:${pairInfo.address}`);
            }
        }
        return to_return;
    }
    public static async getSellSwapOf(swapLog:SwapLog,of_token_contract:string):Promise<string>{
        let to_return = "0.0";
        const pairInfo = await eth_worker.getPairInfo(swapLog.ContractInfo.address);
        const tradeType = await this.getTradeTypeOfSwap(swapLog,of_token_contract);
        if(tradeType === TRADE_TYPE.SELL){
            if(pairInfo.token0_contract.toLowerCase() === of_token_contract.toLowerCase()){
                to_return = eth_worker.convertValueToAmount(swapLog.amount0In.toString(),pairInfo.token0_decimal);
            }else if(pairInfo.token1_contract.toLowerCase() === of_token_contract.toLowerCase()){
                to_return = eth_worker.convertValueToAmount(swapLog.amount1In.toString(),pairInfo.token1_decimal);
            }else{
                throw new Error(`unable to find contract:${of_token_contract} in pair contract:${pairInfo.address}`);
            }
        }
        return to_return;
    }
    public static async getContractInfoFromPair(pair_contract:string|PAIR_INFO,selected_token_contract:string):Promise<SwapTradeInfo>{
        return web3_pair_price_tools.getContractInfoFromPair(pair_contract,selected_token_contract);
    }
    public static async getOppositeContractPairOf(pair_contract:string|PAIR_INFO,selected_token_contract:string):Promise<SwapTradeInfo>{
        return web3_pair_price_tools.getOppositeContractPairOf(pair_contract,selected_token_contract);
    }

    public static async getTotalTransferOfSwap(db_log:eth_receipt_logs,token_contract:string):Promise<string>{
        let to_return = "0";
        const web3_log = eth_worker.convertDbLogToWeb3Log(db_log);
        const swapLog = await web3_log_decoder.getSwapLog(web3_log);
        if(!swapLog) throw new Error(`passed log ${db_log.id} ${db_log.transactionHash} ${db_log.logIndex} is not swap`);
        const pairInfo = await eth_worker.getPairInfo(swapLog.ContractInfo.address);
        if(
            pairInfo.token0_contract.toLowerCase() !== token_contract.toLowerCase()
            && pairInfo.token1_contract.toLowerCase() !== token_contract.toLowerCase())
        {
            throw new Error(`${token_contract} token is not in pair ${pairInfo.address}`);
        }
        const previousLogs = new eth_receipt_logs();
        await previousLogs.list(
            " WHERE transactionHash=:hash AND logIndex<:logIndex ",
            {hash:assert.stringNotEmpty(db_log.transactionHash), logIndex:assert.positiveInt(db_log.logIndex)},
            " ORDER BY logIndex ASC ");
        for(const log of previousLogs._dataList as eth_receipt_logs[]){
            const transferLog = await web3_log_decoder.getTransferLog(eth_worker.convertDbLogToWeb3Log(log));
            if(
                transferLog && transferLog.ContractInfo.address.toLowerCase() === token_contract.toLowerCase()
                && (transferLog.from.toLowerCase() === pairInfo.address.toLowerCase() || transferLog.to.toLowerCase() === pairInfo.address.toLowerCase())
            ){
                to_return = tools.toBn(to_return).plus(tools.toBn(eth_worker.convertValueToAmount(transferLog.value.toString(),transferLog.ContractInfo.decimals))).toFixed(tools.parseIntSimple(transferLog.ContractInfo.decimals));
            }
            else{
                if(log.id === db_log.id) continue;
                try{
                    const decoded_log = await web3_log_decoder.decodeLog(eth_worker.convertDbLogToWeb3Log(log));
                    if(
                        decoded_log.method_name.toLowerCase() === "SwapAndLiquify".toLowerCase()
                        || decoded_log.method_name.toLowerCase() === "Swap".toLowerCase()
                    ){
                        to_return = "0";
                    }
                }catch (e){}
            }
        }
        return to_return;
    }

    // public static async getTotalBuyTokenFromSwap(swapLog:SwapLog):Promise<string>{
    //     const tradeType = await this.getTradeTypeFromTokenSwap(swapLog);
    //     if(tradeType === TRADE_TYPE.BUY){
    //
    //     }
    // }
    //endregion LOG TRADE INFO
}