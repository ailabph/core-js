import {BlockTransactionObject, BlockTransactionString, Transaction, TransactionReceipt} from "web3-eth/types"
import {
    DepositLog,
    web3_log_decoder,
    SwapLog,
    SyncLog,
    TransferLog,
    WithdrawalLog,
} from "./web3_log_decoder";

import { eth_types,AnalysisResult,AnalyzeLogsResult,BnbUsdReserve,ContractInfo,LogData,RESULT_SEND_STATUS,RESULT_STATUS,TokenBnbReserve,WalletInfo,LogSigArgs,GasInfo } from "./eth_types";
import { web3_abi_decoder,DecodedAbiObject } from "./web3_abi_decoder";
import { eth_receipt_logs_tools } from "./eth_receipt_logs_tools";
import { eth_transaction_tools } from "./eth_transaction_tools";
import { eth_rpc } from "./eth_rpc";
import { assert_eth } from "./assert_eth";
import { assert } from "./assert";
import { eth_config } from "./eth_config";
import { config } from "./config";
import { eth_tools } from "./eth_tools";
import { tools } from "./tools";

import fsPromise from "fs/promises";
import BigNumber from "bignumber.js";

import {eth_transaction} from "./build/eth_transaction";
import {eth_contract_data} from "./build/eth_contract_data";
import {eth_log_sig} from "./build/eth_log_sig";
import {eth_receipt} from "./build/eth_receipt";
import {eth_block} from "./build/eth_block";
import {eth_receipt_logs} from "./build/eth_receipt_logs";
import {HttpProvider, Log} from "web3-core";
import {PAIR_INFO, TRADE_PAIR_INFO} from "./eth_worker_trade";
import {eth_price_track_header} from "./build/eth_price_track_header";
import {web3_pair_price_tools} from "./web3_pair_price_tools";
import Web3 from "web3";
import {eth_contract_data_tools} from "./eth_contract_data_tools";
import {web3_quicknode} from "./web3_quicknode";
import {web3_pancake_pair} from "./web3_pancake_pair";
import {web3_pancake_factory} from "./web3_pancake_factory";
import {web3_rpc_web3} from "./web3_rpc_web3";

// const Web3 = require("web3");
// const Web3Provider:HttpProvider = eth_rpc.getWeb3Provider();
const Web3Client:Web3 = web3_rpc_web3.getWeb3Client();

enum ADDRESS_TYPE {
    ADDRESS = "wallet",
    CONTRACT = "contracty",
}
export { ADDRESS_TYPE }
type ADDRESS_INFO = {
    type:ADDRESS_TYPE,
    name:string
}
export { ADDRESS_INFO }

export class eth_worker{

    //region EVENT TAGS

    public static getTagSwapEthToToken(): string{
        return "swap_"+eth_config.getEthSymbol()+"_to_"+eth_config.getTokenSymbol();
    }
    public static getTagSwapTokenToEth(): string{
        return "swap_"+eth_config.getTokenSymbol()+"_to_"+eth_config.getEthSymbol();
    }
    public static getTagSwapTokenToOtherToken(): string{
        return "swap_"+eth_config.getTokenSymbol()+"_to_OTHER_TOKEN";
    }
    public static getTagSwapOtherTokenToToken(): string{
        return "swap_OTHER_TOKEN_to_"+eth_config.getTokenSymbol();
    }
    public static getTagTransferTokenToOther(): string{
        return "transfer_"+eth_config.getTokenSymbol();
    }
    public static getTagContractCreated(): string{
        return "contract_created_for_"+eth_config.getTokenSymbol();
    }
    public static getTagAddLiquidityToToken(): string{
        return "add_liquidity_to_"+eth_config.getTokenSymbol();
    }
    public static getTagOtherContractEvents(): string{
        return "other_event_"+eth_config.getTokenSymbol();
    }

    //endregion

    //region ASSERTS
    static isValidAddress(_address: string): boolean {
        return Web3.utils.isAddress(_address);
    }
    //endregion

    //region UTILITIES

    static convertValueToAmount(_value: number | string, _decimals:number|string, desc:string = ""): string {
        let toReturn = new BigNumber(0);
        try{
            BigNumber.config({DECIMAL_PLACES: Number(_decimals)});
            BigNumber.config({EXPONENTIAL_AT: 1e+9});
            toReturn = new BigNumber(Number(_value));
            if (_decimals > 0) {
                let valueBN = new BigNumber(_value);
                let tenBN = new BigNumber(10);
                let decimalsBN = new BigNumber(_decimals);
                let powBN = tenBN.pow(decimalsBN);
                let amountBN = valueBN.dividedBy(powBN);
                return amountBN.toString();
            }
        }catch (e) {
            console.log(`ERROR convertValueToAmount value ${_value} decimals ${_decimals} on ${desc}`);
            throw e;
        }
        return toReturn.toString();
    }

    static convertAmountToValue(_amount: number | string, _decimals: number): string {
        BigNumber.config({DECIMAL_PLACES: Number(_decimals)});
        BigNumber.config({EXPONENTIAL_AT: 1e+9});
        let toReturn = new BigNumber(Number(_amount));
        if (_decimals > 0) {
            let decimals = new BigNumber(_decimals);
            let amount = new BigNumber(_amount);
            let ten = new BigNumber(10);
            let pow = ten.pow(decimals);
            toReturn = amount.multipliedBy(pow);
        }
        return toReturn.toString();
    }

    static convertValueToETH(_value: number | string): string {
        return this.convertValueToAmount(_value, eth_config.getEthDecimal());
    }

    static convertEthToValue(_amount: number | string): string {
        return this.convertAmountToValue(_amount, eth_config.getEthDecimal());
    }

    static convertValueToToken(_value: number | string): string {
        return this.convertValueToAmount(_value, eth_config.getTokenDecimal());
    }

    static convertTokenToValue(_token_amount: number | string): string {
        return this.convertAmountToValue(_token_amount, eth_config.getTokenDecimal());
    }

    public static getBnbUsdValue(bnb_amount:number|string,bnb_usd:number|string):string{
        bnb_amount = tools.numericToString({val:bnb_amount,dec:eth_config.getEthDecimal(),name:"bnb_amount",strict:true});
        bnb_usd = tools.numericToString({val:bnb_usd,dec:eth_config.getEthDecimal(),name:"bnb_usd",strict:true});
        return tools.toBn(bnb_amount).multipliedBy(tools.toBn(bnb_usd)).toFixed(eth_config.getEthDecimal());
    }
    public static getTokenBnbValue(token_amount:number|string,bnb_token:number|string):string{
        token_amount = tools.numericToString({val:token_amount,dec:eth_config.getTokenDecimal(),name:"token_amount",strict:true});
        bnb_token = tools.numericToString({val:bnb_token,dec:eth_config.getTokenDecimal(),name:"bnb_token",strict:true});
        return tools.toBn(token_amount).multipliedBy(tools.toBn(bnb_token)).toFixed(eth_config.getTokenDecimal());
    }
    public static getTokenUsdValue(token_amount:number|string,bnb_usd:number|string,bnb_token:string|number):string{
        const token_bnb_value = this.getTokenBnbValue(token_amount,bnb_token);
        bnb_usd = tools.numericToString({val:bnb_usd,dec:eth_config.getEthDecimal(),name:"bnb_usd",strict:true});
        return tools.toBn(token_bnb_value).multipliedBy(tools.toBn(bnb_usd)).toFixed(eth_config.getTokenDecimal());
    }
    public static getTokenUsd(bnb_usd:number|string,bnb_token:string|number):string{
        bnb_usd = tools.numericToString({val:bnb_usd,dec:eth_config.getEthDecimal(),strict:true});
        bnb_token = tools.numericToString({val:bnb_token,dec:eth_config.getTokenDecimal(),strict:true});
        return tools.toBn(bnb_usd).multipliedBy(tools.toBn(bnb_token)).toFixed(eth_config.getTokenDecimal());
    }

    static checkIfInvolved({from="",to=null,abi=false}:{from?:string,to?:string|null,abi?:DecodedAbiObject|false}):boolean{
        if(from.toLowerCase() === eth_config.getTokenContract().toLowerCase()) return true;
        if(typeof to === "string" && to.toLowerCase() === eth_config.getTokenContract().toLowerCase()) return true;
        if(abi){
            for(let prop in abi.argument_key_value){
                let value = abi.argument_key_value[prop];
                if(typeof value === "string" && value.toLowerCase() === eth_config.getTokenContract().toLowerCase()) return true;
                if(Array.isArray(value)){
                    for(let array_index in value){
                        let array_value = value[array_index];
                        if(array_value.toLowerCase() === eth_config.getTokenContract().toLowerCase()) return true;
                    }
                }
            }
        }
        return false;
    }

    static checkIfInvolved2({fromAddress=null,toAddress=null,input=null,hash=null}:{fromAddress:string|null,toAddress:string|null,input:string|null,hash:string|null}) : boolean{
        if(hash?.toLowerCase() === eth_config.getTokenContract().toLowerCase()) return true;
        if(fromAddress?.toLowerCase() === eth_config.getTokenContract().toLowerCase()) return true;
        if(toAddress?.toLowerCase() === eth_config.getTokenContract().toLowerCase()) return true;
        const striped_tracked_token = eth_config.getTokenContract().toLowerCase().replace(/^(0x)/, "");
        if(input?.toLowerCase().includes(striped_tracked_token)) return true;
        return false;
    }

    public static async isInvolved({fromAddress=null,toAddress=null,input=null,hash=null}:{fromAddress:string|null,toAddress:string|null,input:string|null,hash:string|null}) : Promise<boolean>{
        // Token Creation
        if(hash?.toLowerCase() === eth_config.getTokenGenesisHash().toLowerCase()) return true;
        const fromMatch = fromAddress?.toLowerCase() === eth_config.getTokenContract().toLowerCase();
        const toMatch = toAddress?.toLowerCase() === eth_config.getTokenContract().toLowerCase();
        const inputMatch = input?.toLowerCase().includes(eth_worker.stripBeginningZeroXFromString(eth_config.getTokenContract().toLowerCase()));
        if(fromMatch || toMatch || inputMatch){
            const decodedAbi = web3_abi_decoder.decodeAbiObject(input);
            if(decodedAbi) return true;
            else{
                return await eth_receipt_logs_tools.findTokenInLogs(hash ?? "");
            }
        }
        return false;
    }

    public static async identifyInvolvement(txn:eth_transaction):Promise<eth_transaction>{
        if(txn.token_found === null){
            if(await eth_worker.isInvolved(txn)){
                txn.token_found = "y";
                txn.method_name = "unknown";
                const receipt = await eth_worker.getReceiptByTxnHash(txn.hash);
                if(receipt) txn.send_status = receipt.status?1:0;
                const abi = web3_abi_decoder.decodeAbiObject(txn.input);
                if(abi) txn.method_name = abi.abi.name;
                const swaps = await eth_receipt_logs_tools.getLogsByMethod<SwapLog>(txn.hash,"swap");
                txn.is_swap = swaps.length > 0 ? 1 : 0;
                await txn.save();
            }
        }
        return txn;
    }

    public static async importTransactionsFromFile(file_path:string, assert_involved:boolean = false){
        assert.inTransaction();
        assert.fileExists(file_path);
        const file = await fsPromise.open(file_path, 'r');
        for await (const line of file.readLines()) {
            const txnHash = assert.isString({val:line,prop_name:"imported hash data"});
            assert_eth.isLikelyTransactionHash(txnHash);
            if(assert_involved){
                const txn = await eth_worker.getTxnByHash(txnHash);
                let newTransaction = new eth_transaction();
                newTransaction.loadValues(txn,true);
                newTransaction.fromAddress = txn.from;
                newTransaction.toAddress = txn.to;
                const result = await eth_worker.analyzeTransaction3(newTransaction);
                if(result.status === RESULT_STATUS.NOT_INVOLVED){
                    console.error(txn);
                    console.error(result);
                    throw new Error(`${txnHash} is not involved`);
                }
                console.log(`involved:${txnHash}|method:${result.method}`);
            }
        }

        if(assert_involved){
            console.log(`all transactions checked and are involved with ${eth_config.getTokenSymbol()}`);
        }
    }

    public static async addLogSignature(signature:string,params:string,params_names:string){
        let logSig = new eth_log_sig();
        logSig.signature = signature;
        await logSig.fetch();
        if(logSig.isNew()){
            logSig.params = params;
            logSig.params_names = params_names;
            await logSig.save();
        }
    }

    public static stripBeginningZeroXFromString(hash:string){
        return hash.replace(/^(0x)/,"");
    }

    public static async isContract(address:string):Promise<boolean> {
        const contract = await eth_worker.getContractMetaData(address);
        return contract.name !== "";
    }

    public static async isWalletAddress(address:string):Promise<boolean> {
        return !(await this.isContract(address));
    }


    public static async getAddressInfo(address:string):Promise<ADDRESS_INFO>{
        const contractInfo = await this.getContractMetaData(address);
        const addressInfo:ADDRESS_INFO = {name: "", type: ADDRESS_TYPE.ADDRESS};
        if(tools.isEmpty(contractInfo.name)){
            addressInfo.type = ADDRESS_TYPE.ADDRESS;
            addressInfo.name = ADDRESS_TYPE.ADDRESS;
        }
        else{
            addressInfo.type = ADDRESS_TYPE.CONTRACT;
            addressInfo.name = contractInfo.symbol;
        }
        return addressInfo;
    }

    //endregion END OF UTILITIES

    //region GETTERS

    public static async getLatestBlock():Promise<number>{
        let latestBlock = -1;
        const lastBlock = new eth_block();
        await lastBlock.list(" WHERE 1 ",{}," ORDER BY blockNumber DESC LIMIT 1 ");
        if(lastBlock.count() > 0){
            latestBlock = lastBlock.getItem().blockNumber;
        }
        if(latestBlock < 0){
            latestBlock = assert.positiveInt(config.getCustomOption("STARTING_BLOCK",true));
        }
        return latestBlock;
    }

    static async getLatestBlockWeb3(): Promise<number> {
        return web3_quicknode.getLatestBlock();
    }

    public static async getBlockByNumber(blockNumber:number,strict:boolean = false):Promise<eth_block>{
        if(config.getConfig().verbose_log) console.log(`getBlockByNumber | retrieving block ${blockNumber} info from db`);
        assert.isNumber(blockNumber,"blockNumber",0);
        const block = new eth_block();
        block.blockNumber = blockNumber;
        await block.fetch();
        if(block.isNew()){
            if(config.getConfig().verbose_log) console.log(`getBlockByNumber | block ${blockNumber} not on db, retrieving via rpc`);
            const web3Block = await this.getBlockByNumberWeb3(blockNumber);
            if(!web3Block && strict){
                throw new Error(`unable to retrieve block:${blockNumber} from rpc`);
            }
            block.loadValues(web3Block,true);
            block.blockNumber = web3Block.number;
            block.blockHash = web3Block.hash
            block.time_added = assert.isNumber( web3Block.timestamp,"web3Block.timestamp",0);
            await block.save();
        }
        if(config.getConfig().verbose_log) console.log(`getBlockByNumber | block ${blockNumber} found`);
        return block;
    }
    static async getBlockByNumberWeb3(blockNumber:number): Promise<BlockTransactionString>{
        return await Web3Client.eth.getBlock(blockNumber);
    }

    static async getTxnByBlockNumberWeb3(_block_num: number) : Promise<BlockTransactionObject>{
        return await Web3Client.eth.getBlock(_block_num, true);
    }

    public static async getTxnByHashWeb3(txn_hash:string):Promise<Transaction>{
        return await Web3Client.eth.getTransaction(txn_hash);
    }

    static async getTxnByHash(_txn_hash: string): Promise<Transaction> {
        let txn_db = new eth_transaction();
        txn_db.hash = _txn_hash;
        await txn_db.fetch();
        if(txn_db.isNew()){
            const web3_txn = await Web3Client.eth.getTransaction(_txn_hash);
            if(tools.isEmpty(web3_txn)) throw new Error(`unable to retrieve transaction hash:${_txn_hash} from web3`);
            txn_db.loadValues(web3_txn,true);
            txn_db.fromAddress = web3_txn.from;
            txn_db.toAddress = web3_txn.to;
            await txn_db.save();
        }
        return {
            blockHash: txn_db.blockHash,
            blockNumber: txn_db.blockNumber,
            from: txn_db.fromAddress ?? "",
            gas: parseFloat(txn_db.gas ?? "0"),
            gasPrice: txn_db.gasPrice ?? "",
            hash: txn_db.hash,
            input: txn_db.input ?? "",
            nonce: txn_db.nonce ?? 0,
            to: txn_db.toAddress ?? "",
            transactionIndex: 0,
            value: txn_db.value ?? ""
        };
    }

    static async getDbTxnByHash(txn_hash:string): Promise<eth_transaction>{
        let txn_db = new eth_transaction();
        txn_db.hash = txn_hash;
        await txn_db.fetch();
        if(txn_db.isNew()){
            await eth_worker.getTxnByHash(txn_hash);
            txn_db.hash = txn_hash;
            await txn_db.fetch();
        }
        if(txn_db.isNew()) throw new Error(`unable to retrieve txn record hash:${txn_hash}`);
        return txn_db;
    }

    static getReceiptByTxnHashWeb3(txn_hash:string): Promise<TransactionReceipt>{
        return Web3Client.eth.getTransactionReceipt(txn_hash);
    }

    static async getReceiptByTxnHash(_txn_hash: string, strict:boolean = false) : Promise<TransactionReceipt | false> {
        try {
            let receipt_db = new eth_receipt();
            receipt_db.transactionHash = _txn_hash;
            await receipt_db.fetch();
            if(receipt_db.recordExists()){
                let analyzeReceipt = await eth_receipt_logs_tools.getReceiptLogs(_txn_hash);
                return analyzeReceipt.receipt;
            }

            let receipt;
            let waitLimit = 40;
            let waitCount = 0;
            receipt = await eth_worker.getTxnByHash(_txn_hash);
            while (typeof receipt === "undefined" || receipt == null) {
                if (waitCount >= waitLimit) break;
                waitCount++;
                console.log("txn not yet mined, waiting...");
                await new Promise((resolve) => {
                    setTimeout(resolve, 500);
                });
                receipt = await eth_worker.getTxnByHash(_txn_hash);
            }
            let analyzeReceipt = await eth_receipt_logs_tools.getReceiptLogs(_txn_hash);
            return analyzeReceipt.receipt;
        } catch (e) {
            if(strict){
                throw e;
            }
            console.log("Error getting receipt from txn:%s", _txn_hash);
            console.log(e);
            return false;
        }
    }

    public static async getDbReceipt(transactionHash:string):Promise<eth_receipt>{
        const dbReceipt = new eth_receipt();
        dbReceipt.transactionHash = transactionHash;
        await dbReceipt.fetch();
        if(dbReceipt.isNew()){
            const web3Receipt = await this.getReceiptByTxnHashWeb3(transactionHash);
            if(!web3Receipt) throw new Error(`unable to retrieve receipt with hash ${transactionHash} via rpc`);
            dbReceipt.loadValues(web3Receipt,true);
            dbReceipt.fromAddress = web3Receipt.from;
            dbReceipt.toAddress = web3Receipt.to;
            await dbReceipt.save();
        }
        return dbReceipt;
    }

    static async estimateGasContract(_from: string, _to: string, _amount: string, _contract_address: string): Promise<any[]> {
        let transfer_contract = await new Web3Client.eth.Contract(eth_config.getTransferAbi(), _contract_address);
        //@ts-ignore
        return await transfer_contract.methods.transfer(_to, Web3.utils.toWei((_amount + ""))).estimateGas({from: _from});
    }

    static async getGasPrice() : Promise<string> {
        return await Web3Client.eth.getGasPrice();
    }

    static getTokenTransferData(_from: string, _to: string, _amount: string) {
        console.log("creating contract web3 obj...");
        let contract = new Web3Client.eth.Contract(eth_config.getTokenAbi(), eth_config.getTokenContract(), {from: _from});
        console.log("converting token to value...");
        let value = this.convertTokenToValue(_amount);
        console.log("encoding transfer method ABI to:%s value:%s...",_to, value);
        //@ts-ignore
        return contract.methods.transfer(_to, value).encodeABI();
    }

    static async getEstimateGasPriceToken(_from: string, _to: string, _amount: string): Promise<GasInfo> {
        console.log("estimating gas from:%s to:%s amount:%s, retrieving transfer data ABI...", _from, _to, _amount);
        let _data = this.getTokenTransferData(_from, _to, _amount);
        console.log("data ABI generated, estimating gas...");
        let estimateGas = await Web3Client.eth.estimateGas({
            value: "0x0" // only tokens
            , data: _data
            , to: Web3.utils.toHex(_to)
            , from: Web3.utils.toHex(_from)
        });
        console.log("...gas estimated, retrieving gas price");
        let _gas = await Web3Client.eth.getGasPrice();
        console.log("...gas price retreived");
        let gasLimit = Math.floor(estimateGas * eth_config.getGasMultiplier());
        return {
            gasPrice: _gas,
            estimateGas: estimateGas,
            gasLimit: gasLimit
        };
    }

    static async getContractMetaData(_contract_address:string): Promise<ContractInfo> {
        const contractInfo = await eth_contract_data_tools.getContractViaAddress(_contract_address,true);
        if(contractInfo) return contractInfo;
        else throw new Error(`unable to retrieve contract info of ${_contract_address}`);
    }

    static async getTokenBalance(_address: string): Promise<string> {
        let contract = new Web3Client.eth.Contract(eth_config.getBalanceAbi(), eth_config.getTokenContract());
        let result = 0;
        try {
            result = await contract.methods.balanceOf(_address).call();
        } catch (e) {
            if(e instanceof Error){
                console.log("unable to retrieve token balance of %s :$s", _address, e.message);
            }
            return "invalid";
        }
        return this.convertValueToToken(result);
    }

    static async getETHBalance(_address: string): Promise<string> {
        let value = "0";
        try {
            value = await Web3Client.eth.getBalance(_address);
        } catch (e) {
            if(e instanceof Error){
                console.log("unable to retrieve eth balance of:%s %s", _address, e.message);
            }
            return "invalid";
        }
        return this.convertValueToETH(value);
    }

    static async getHotWalletNonce(): Promise<number> {
        return await Web3Client.eth.getTransactionCount(eth_config.getHotWalletAddress());
    }

    public static async getPairAddress(token_1:string,token_2:string):Promise<string|false>{
        return web3_pancake_factory.getPair(token_2,token_2);
    }

    public static async getPairContractToken0(pairContract:string):Promise<string>{
        return web3_pair_price_tools.getPairContractToken0(pairContract);
    }

    public static async getPairContractToken1(pairContract:string):Promise<string>{
        return web3_pair_price_tools.getPairContractToken1(pairContract);
    }

    public static async getPairInfo(pairContract:string):Promise<PAIR_INFO>{
        return web3_pair_price_tools.getPairInfo(pairContract);
    }

    public static async getLogsByBlockNumber(blockNumber:number):Promise<Log[]>{
        const db_logs = new eth_receipt_logs();
        await db_logs.list(" WHERE blockNumber=:blockNumber ",{blockNumber:blockNumber});
        if(db_logs.count() === 0){
            if(config.getConfig().verbose_log) console.log(`getLogsByBlockNumber | logs of block ${blockNumber} not in db, retrieving via rpc`);
            return await this.getLogsByBlockNumberViaWeb3(blockNumber);
        }
        else{
            if(config.getConfig().verbose_log) console.log(`getLogsByBlockNumber | logs of block ${blockNumber} in db`);
            let logs:Log[] = [];
            for(const db_log of db_logs._dataList as eth_receipt_logs[]){
                logs.push(this.convertDbLogToWeb3Log(db_log));
            }
            return logs;
        }
    }

    public static async getLogsBetweenBlockNumbersViaRpc(fromBlock:number,toBlock:number):Promise<Log[]>{
        fromBlock = assert.isNumber(fromBlock,"fromBlock",0);
        toBlock = assert.isNumber(toBlock,"toBlock",fromBlock);
        const logs = await Web3Client.eth.getPastLogs({fromBlock:fromBlock,toBlock:toBlock});
        return logs;
    }

    public static convertDbLogToWeb3Log(db_log:eth_receipt_logs):Log{
        return {
            address: assert.isString({val: db_log.address, prop_name: "address", strict: true}),
            blockHash: assert.isString({val: db_log.blockHash, prop_name: "blockHash", strict: true}),
            blockNumber: assert.isNumber(db_log.blockNumber, "blockNumber", 0),
            data: assert.isString({val: db_log.data, prop_name: "data", strict: true}),
            logIndex: assert.isNumber(db_log.logIndex, "logIndex", 0),
            topics: JSON.parse(assert.isString({val: db_log.topics, prop_name: "topics", strict: true})),
            transactionHash: assert.isString({val: db_log.transactionHash, prop_name: "transactionHash", strict: true}),
            transactionIndex: assert.isNumber(db_log.transactionIndex, "transactionIndex", -1),
        };
    }

    public static async convertWeb3LogToDbLog(log:Log):Promise<eth_receipt_logs>{
        const newLog = new eth_receipt_logs();
        newLog.transactionHash = log.transactionHash;
        newLog.logIndex = log.logIndex;
        await newLog.fetch();
        if(newLog.recordExists()) return newLog;
        newLog.loadValues(log,true);
        const block = await this.getBlockByNumber(log.blockNumber);
        newLog.blockTime = block.time_added;
        return newLog;
    }

    public static async getLogsByTransactionHash(transactionHash:string, recursive:boolean = true):Promise<Log[]>{
        const db_logs = new eth_receipt_logs();

        await db_logs.list(" WHERE transactionHash=:transactionHash ",{transactionHash:transactionHash});
        if(db_logs.count() === 0){
            if(config.getConfig().verbose_log) console.log(`getLogsByTransactionHash | logs of hash ${transactionHash} not on db, retrieving via rpc`);
            if(recursive){
                const db_transaction = await this.getTxnByHash(transactionHash);
                const logs = await this.getLogsByBlockNumber(assert.isNumber(db_transaction.blockNumber,"db_transaction.blockNumber",0));
                return this.getLogsByTransactionHash(transactionHash,false);
            }
            throw new Error(`no logs found for transaction:${transactionHash}`);
        }
        else{
            if(config.getConfig().verbose_log) console.log(`getLogsByTransactionHash | logs of hash ${transactionHash} in db`);
            let logs:Log[] = [];
            for(const db_log of db_logs._dataList as eth_receipt_logs[]){
                logs.push(this.convertDbLogToWeb3Log(db_log));
            }
            return logs;
        }
    }

    public static async getLogsByBlockNumberViaWeb3(blockNumber:number):Promise<Log[]>{
        if(config.getConfig().verbose_log) console.log(`getLogsByBlockNumberViaWeb3 | retrieving logs in block ${blockNumber} info via rpc`);
        const blockInfo = await this.getBlockByNumber(blockNumber);
        if(!blockInfo) throw new Error(`unable to retrieve block info of ${blockNumber} from rpc`);
        const logs = await Web3Client.eth.getPastLogs({fromBlock:blockNumber,toBlock:blockNumber});
        if(!logs || logs.length === 0) throw new Error(`no logs found for block ${blockNumber} via rpc`);
        if(config.getConfig().verbose_log) console.log(`getLogsByBlockNumberViaWeb3 | ${logs.length} logs found, saving to db records`);
        for(const log of logs as Log[]){
            const check = new eth_receipt_logs();
            await check.list(" WHERE transactionHash=:transactionHash AND logIndex=:logIndex ",{transactionHash:log.transactionHash,logIndex:log.logIndex});
            if(check.count() === 0){
                const newLog = new eth_receipt_logs();
                newLog.loadValues(log,true);
                newLog.txn_hash = log.transactionHash;
                newLog.blockTime = blockInfo.time_added;
                await newLog.save();
            }
        }
        return logs;
    }

    public static async getBlockWithReceiptsViaRpc(blockNumber:number){
        const response = await eth_rpc.getEtherProvider().send("qn_getBlockWithReceipts",[tools.convertNumberToHex(blockNumber)]);
        console.log(response);
    }

    //endregion GETTER

    //region ANALYZE TOOL

    static async analyzeTransaction2(_txn_hash: string | eth_transaction): Promise<AnalysisResult>{
        let tx: eth_transaction;
        if(_txn_hash instanceof eth_transaction){
            tx = _txn_hash;
        }
        else{
            tx = await eth_worker.getDbTxnByHash(_txn_hash);
        }

        if(tools.isEmpty(tx.hash)) throw new Error("hash must not be empty");
        if(tools.isEmpty(tx.blockNumber)) throw new Error("blockNumber must not be empty");

        let result = eth_tools.getDefaultResult(tx);

        result = await this.processContractCreationEvent(tx,result);
        if (typeof tx.toAddress === "undefined" || tx.toAddress === null || tx.toAddress === "") return result;

        let decodedAbi = web3_abi_decoder.decodeAbiObject(tx.input);
        if(!decodedAbi) return result;
        result.method = decodedAbi.abi.name;

        if(eth_worker.checkIfInvolved2(tx)){
            result = await this.processAddLiquidity(result,decodedAbi);
            result = await this.processApprovalEvent(tx,decodedAbi,result);
            result = await this.processTransferEvent(tx,decodedAbi,result);
            result = await this.processSwapEvents(tx,decodedAbi,result);
            result = await this.processTransitSwap(tx,decodedAbi,result);
            result = await this.processOtherEventsOfContract(result,decodedAbi);
        }

        /// BNB SYMBOL FIX
        result.fromSymbol = result.fromSymbol.replace("WBNB","BNB");
        result.toSymbol = result.toSymbol.replace("WBNB","BNB");

        result = this.processResultType(result);
        result = this.processTaxesFees(result);
        result = await this.processResultChecks(result, decodedAbi);
        // result = await this.processResultBlockTime(result);

        return result;
    }

    static async analyzeTransaction3(txn:string|eth_transaction):Promise<AnalysisResult>{
        const transaction:eth_transaction = typeof txn === "string" ? await eth_worker.getDbTxnByHash(txn) : txn;
        let result = eth_types.getDefaultAnalysisResult(transaction);

        // result = await eth_worker.processContractCreationEvent(transaction,result);
        // if(result.method === "createContract") return result;

        if(!eth_worker.checkIfInvolved2(transaction)) return result;
        result.status = RESULT_STATUS.INVOLVED;
        const decoded_abi = web3_abi_decoder.decodeAbiObject(transaction.input);
        if(!decoded_abi) {
            result.abiDecodeStatus = "failed";
            return result;
        }
        result.abiDecodeStatus = "success";
        result.method = decoded_abi.abi.name;

        if(result.sendStatus === RESULT_SEND_STATUS.NOT_CHECKED) result = await eth_worker.processAddLiquidity(result,decoded_abi);
        if(result.sendStatus === RESULT_SEND_STATUS.NOT_CHECKED) result = await eth_worker.processApprovalEvent(transaction,decoded_abi,result);
        if(result.sendStatus === RESULT_SEND_STATUS.NOT_CHECKED) result = await eth_worker.processTransferEvent(transaction,decoded_abi,result);
        if(result.sendStatus === RESULT_SEND_STATUS.NOT_CHECKED) result = await eth_worker.processSwapEvents(transaction,decoded_abi,result);
        if(result.sendStatus === RESULT_SEND_STATUS.NOT_CHECKED) result = await eth_worker.processTransitSwap(transaction,decoded_abi,result);
        // if(result.sendStatus === RESULT_SEND_STATUS.NOT_CHECKED) result = await eth_worker.processOtherEventsOfContract(result,decoded_abi);

        result = eth_worker.processResultType(result);
        result = eth_worker.processTaxesFees(result);
        // result = await eth_worker.processResultChecks(result,decoded_abi);
        // result = await eth_worker.processResultBlockTime(result);

        return result;
    }

    static async analyzeTokenTransaction(txn:string|eth_transaction):Promise<AnalysisResult>{
        txn = await eth_transaction_tools.get(txn);
        txn = await eth_worker.identifyInvolvement(txn);
        let result = eth_types.getDefaultAnalysisResult(txn);

        result.status = txn.token_found === "y" ? RESULT_STATUS.INVOLVED : RESULT_STATUS.NOT_INVOLVED;
        result.sendStatus = txn.send_status ? RESULT_SEND_STATUS.SUCCESS : RESULT_SEND_STATUS.FAILED;
        if(result.status !== RESULT_STATUS.INVOLVED) return result;

        const abi = web3_abi_decoder.decodeAbiObject(txn.input);
        result.method = abi ? abi.abi.name : "unknown";

        if(result.sendStatus !== RESULT_SEND_STATUS.SUCCESS) return result;

        if(typeof txn.blockTime !== "number" || !(txn.blockTime > 0)){
            const block = await eth_worker.getBlockByNumber(assert.isNumber(txn.blockNumber,"txn.blockNumber",0));
            txn.blockTime = assert.isNumber(block.time_added,"block.time_added",0);
            await txn.save();
        }
        result.block_time = txn.blockTime;

        const firstTransfer1 = await eth_receipt_logs_tools.getFirstLogByMethod<TransferLog>(txn.hash,"transfer") as TransferLog;
        const lastTransfer1 = await eth_receipt_logs_tools.getLastLogByMethod<TransferLog>(txn.hash,"transfer") as TransferLog;

        if(result.method.toLowerCase() === "approve") result.type = "approve";
        if(result.hash.toLowerCase() === eth_config.getTokenGenesisHash().toLowerCase()) result.type = "creation";
        if(result.method.toLowerCase() === "transfer") {
            result.type = "transfer";
            result.fromContract = firstTransfer1.ContractInfo.address;
            result.fromSymbol = firstTransfer1.ContractInfo.symbol;
            result.fromDecimal = firstTransfer1.ContractInfo.decimals;
            result.toContract = lastTransfer1.ContractInfo.address;
            result.toSymbol = lastTransfer1.ContractInfo.symbol;
            result.toDecimal = lastTransfer1.ContractInfo.decimals;
            result.toAddress = lastTransfer1.to;

            const transferAbi = web3_abi_decoder.getTransferAbi(abi);
            if(transferAbi){
                result.fromValue = transferAbi.amount.toString();
            }
            result.toValue = lastTransfer1.value.toString();

            result.fromAmount = eth_worker.convertValueToAmount(result.fromValue,result.fromDecimal);
            result.fromAmountGross = result.fromAmount;
            result.toAmountGross = result.fromAmountGross;
            result.toAmount = eth_worker.convertValueToAmount(result.toValue,result.toDecimal);

            result.taxAmount = tools.toBn(result.toAmountGross).minus(tools.toBn(result.toAmount)).toString();
            if(parseFloat(result.taxAmount) > 0){
                result.taxPerc = tools.toBn(result.taxAmount).dividedBy(tools.toBn(result.toAmountGross)).toString();
            }
        }

        if(txn.is_swap && txn.toAddress?.toLowerCase() === eth_config.getDexContract().toLowerCase()){
            result.toAddress = txn.fromAddress ?? "";

            const logsResult = await eth_receipt_logs_tools.getReceiptLogs(txn.hash);
            const firstLog = await web3_log_decoder.decodeLog(logsResult.receipt.logs[0]);
            const lastLog = await web3_log_decoder.decodeLog( logsResult.receipt.logs[logsResult.receipt.logs.length-1] );
            const lastSwap = await eth_receipt_logs_tools.getLastLogByMethod<SwapLog>(txn.hash,"swap") as SwapLog;
            const firstTransferFrom = await eth_receipt_logs_tools.getFirstTransferFrom(txn.hash,txn.fromAddress??"");
            result.type = lastTransfer1.ContractInfo.address.toLowerCase() === eth_config.getTokenContract().toLowerCase() ? "buy" : "sell";

            result.fromAmount = "0";
            result.toAmount = "0";
            result.taxAmount = "0";
            result.taxPerc = "0";
            result.fromContract = firstTransfer1.ContractInfo.address;
            result.fromSymbol = firstTransfer1.ContractInfo.symbol;
            result.fromDecimal = firstTransfer1.ContractInfo.decimals;
            result.toContract = lastTransfer1.ContractInfo.address;
            result.toSymbol = lastTransfer1.ContractInfo.symbol;
            result.toDecimal = lastTransfer1.ContractInfo.decimals;

            if(firstLog.method_name.toLowerCase() === "deposit"){
                const deposit = await eth_receipt_logs_tools.getFirstLogByMethod<DepositLog>(txn.hash,"deposit") as DepositLog;
                result.fromValue = deposit.amount.toString();
            }
            if(lastLog.method_name.toLowerCase() === "withdrawal"){
                const withdrawal = await eth_receipt_logs_tools.getLastLogByMethod<WithdrawalLog>(txn.hash,"withdrawal") as WithdrawalLog;
                result.toValue = withdrawal.wad.toString();
            }

            if(result.toAmount === "0"){
                result.toValue = lastTransfer1.value.toString();
            }
            if(result.fromAmount === "0"){
                if(firstTransferFrom){
                    result.fromValue = firstTransferFrom.value.toString();
                }
            }

            result.fromAmount = eth_worker.convertValueToAmount(result.fromValue,result.fromDecimal);
            result.fromAmountGross = result.fromAmount;
            result.toAmount = eth_worker.convertValueToAmount(result.toValue,result.toDecimal);
            result.toAmountGross = result.toAmount;

            const token_amount = result.type === "buy" ? result.toAmount : result.fromAmount;

            let gross_token_amount:string = "0";
            if(result.type === "buy"){
                const swapExactETHForTokensAbi = web3_abi_decoder.getSwapExactETHForTokens(abi);
                if(swapExactETHForTokensAbi){
                    gross_token_amount = swapExactETHForTokensAbi.amountOutMin > lastSwap.amount1Out ? swapExactETHForTokensAbi.amountOutMin.toString() : lastSwap.amount1Out.toString();
                }

                if(gross_token_amount === "0" || result.toAmount > gross_token_amount){
                    gross_token_amount = lastSwap.amount1Out.toString();
                }

                result.toAmountGross = eth_worker.convertValueToAmount(gross_token_amount, result.toDecimal);
            }
            if(result.type === "sell"){
                if(abi){
                    const swapExactTokensForETHSupportingFeeOnTransferTokensAbi = web3_abi_decoder.getSwapExactTokensForETHSupportingFeeOnTransferTokens(abi);
                    if(swapExactTokensForETHSupportingFeeOnTransferTokensAbi){
                        gross_token_amount = swapExactTokensForETHSupportingFeeOnTransferTokensAbi.amountIn.toString();

                    }

                    const swapExactTokensForTokensSupportingFeeOnTransferTokensAbi = web3_abi_decoder.getSwapExactTokensForTokensSupportingFeeOnTransferTokens(abi);
                    if(swapExactTokensForTokensSupportingFeeOnTransferTokensAbi){
                        gross_token_amount = swapExactTokensForTokensSupportingFeeOnTransferTokensAbi.amountIn.toString();
                    }

                    const swapTokensForExactETHAbi = web3_abi_decoder.getSwapTokensForExactETH(abi);
                    if(swapTokensForExactETHAbi){
                        gross_token_amount = swapTokensForExactETHAbi.amountInMax.toString();
                    }

                    result.fromAmountGross = eth_worker.convertValueToAmount(gross_token_amount,result.fromDecimal);
                }

            }
            gross_token_amount = eth_worker.convertValueToAmount( gross_token_amount, eth_config.getTokenDecimal());
            result.taxAmount = tools.toBn(gross_token_amount).minus(tools.toBn(token_amount)).toString();

            if(parseFloat(result.taxAmount) > 0){
                result.taxPerc = tools.toBn(result.taxAmount).dividedBy(tools.toBn(token_amount)).toString();
            }
        }

        // set price info
        const token_amount = result.type === "buy" ? result.toAmount : result.fromAmount;
        result.bnb_usd = (await eth_worker.getBnbUsdPriceByBlockNumber(result.blockNumber)).toFixed(18);
        result.token_bnb = (await eth_worker.getTokenBnbPriceByBlockNumber(result.blockNumber)).toFixed(18);
        result.token_usd = (await eth_worker.getTokenUsdPriceByBlockNumber(result.blockNumber)).toFixed(18);
        result.token_bnb_value = tools.toBn(token_amount).multipliedBy(tools.toBn(result.token_bnb)).toFixed(18);
        result.token_usd_value = tools.toBn(token_amount).multipliedBy(tools.toBn(result.token_usd)).toFixed(18);
        return result;
    }

    static async importResultValues(type: "from" | "to", result: AnalysisResult, contract:ContractInfo ,value: string): Promise<AnalysisResult>{
        let convertedValueFromAmount = this.convertValueToAmount(value,contract.decimals);
        if(type === "from"){
            result.fromContract = contract.address;
            result.fromDecimal = contract.decimals;
            result.fromSymbol = contract.symbol;
            result.fromValue = value;
            result.fromAmount = convertedValueFromAmount;
        }
        else{

            result.toContract = contract.address;
            result.toDecimal = contract.decimals;
            result.toSymbol = contract.symbol;
            result.toValue = value;
            result.toAmount = convertedValueFromAmount;
        }
        return result;
    }

    /// CREATION EVENT
    static async processContractCreationEvent(tx: eth_transaction, result: AnalysisResult): Promise<AnalysisResult>{
        const action = "process contract creation event";
        tx.hash = assert.isString({val:tx.hash,prop_name:`${action}:tx.hash`,strict:true});
        if (tx.hash.toLowerCase() === eth_config.getTokenGenesisHash().toLowerCase()) {
            result.status = RESULT_STATUS.INVOLVED;

            const r = await this.getReceiptByTxnHash(tx.hash);
            if(!r) throw new Error("cannot "+action+", unable to retrieve receipt");

            let lastLog = r.logs[r.logs.length - 1];
            let value = Web3Client.utils.hexToNumberString(lastLog.data);
            let tokenAmount = this.convertValueToToken(value);
            result.type = "transfer";
            result.tag = this.getTagContractCreated();
            result.method = "createContract";
            result.fromSymbol = eth_config.getEthSymbol();
            result.fromDecimal = eth_config.getEthDecimal();
            result.fromValue = tx.value ?? "";
            result.fromAmount = this.convertValueToETH(tx.value ?? "");
            result.toAddress = result.fromAddress;
            result.toSymbol = eth_config.getTokenSymbol();
            result.toDecimal = eth_config.getTokenDecimal();
            result.toValue = value;
            result.toAmount = tokenAmount;
            result.sendStatus = RESULT_SEND_STATUS.SUCCESS;
            return result;
        }
        return result;
    }

    /// ADD LIQUIDITY
    static async processAddLiquidity(result: AnalysisResult, decodedAbi: DecodedAbiObject): Promise<AnalysisResult>{
        let action = "process add liquidity";
        let methodAbi = web3_abi_decoder.getAddLiquidityETH(decodedAbi);
        if(!methodAbi) return result;

        result.tag = this.getTagAddLiquidityToToken();

        result.fromAmountGross = this.convertValueToToken(methodAbi.amountTokenDesired.toString());
        result.fromValue = methodAbi.amountTokenMin.toString();
        result.fromAmount = this.convertValueToToken(result.fromValue);
        result.fromContract = eth_config.getTokenContract();
        result.fromSymbol = eth_config.getTokenSymbol();
        result.fromDecimal = eth_config.getTokenDecimal();

        result.toAmountGross = this.convertValueToETH(methodAbi.amountETHMin.toString());
        result.toValue = methodAbi.amountETHMin.toString();
        result.toAmount = result.toAmountGross;
        result.toContract = eth_config.getEthContract();
        result.toDecimal = eth_config.getEthDecimal();
        result.toSymbol = eth_config.getEthSymbol();

        const receipt = await eth_worker.getReceiptByTxnHash(result.hash);
        result.sendStatus = receipt && receipt.status ? RESULT_SEND_STATUS.SUCCESS : RESULT_SEND_STATUS.FAILED;

        return result;
    }

    /// APPROVAL EVENT
    static async processApprovalEvent(tx: eth_transaction, decodedAbi: DecodedAbiObject, result: AnalysisResult): Promise<AnalysisResult>{
        let action = "process approval event";
        tx.toAddress = assert.isString({val:tx.toAddress,prop_name:"tx.toAddress",strict:true});
        if(tx.toAddress.toLowerCase() !== eth_config.getTokenContract().toLowerCase()) return result;

        let methodAbi = await web3_abi_decoder.getApproveAbi(decodedAbi);
        if(!methodAbi) return result;

        result.fromContract = eth_config.getTokenContract();
        result.fromSymbol = eth_config.getTokenSymbol();
        result.fromDecimal = eth_config.getTokenDecimal();
        result.tag = "approval";

        let receipt = await this.getReceiptByTxnHash(tx.hash);
        result.sendStatus = receipt && receipt.status ? RESULT_SEND_STATUS.SUCCESS : RESULT_SEND_STATUS.FAILED;

        return result;
    }

    /// TRANSFER EVENT
    static async processTransferEvent(tx: eth_transaction, decodedAbi: DecodedAbiObject, result: AnalysisResult): Promise<AnalysisResult>{
        let action = "process transfer event";
        tx.toAddress = assert.isString({val:tx.toAddress,prop_name:"tx.toAddress",strict:true});
        tx.hash = assert.isString({val:tx.hash,prop_name:"tx.hash",strict:true});
        if(tx.toAddress.toLowerCase() !== eth_config.getTokenContract().toLowerCase()) return result;

        let methodAbi = await web3_abi_decoder.getTransferAbi(decodedAbi);
        if(!methodAbi) return result;

        result.fromContract = eth_config.getTokenContract();
        result.fromSymbol = eth_config.getTokenSymbol();
        result.fromDecimal = eth_config.getTokenDecimal();

        result.toContract = eth_config.getTokenContract();
        result.toSymbol = eth_config.getTokenSymbol();
        result.toDecimal = eth_config.getTokenDecimal();

        result.toAddress = methodAbi.recipient;
        result.tag = eth_worker.getTagTransferTokenToOther();

        /// GROSS FROM
        result.fromValue = methodAbi.amount.toString();
        result.fromAmount = eth_worker.convertValueToAmount(result.fromValue.toString(),eth_config.getTokenDecimal());
        result.fromAmountGross = result.fromAmount;

        result.toValue = result.fromValue;
        result.toAmount = result.fromAmount;
        result.toAmountGross = result.fromAmountGross;

        let receipt = await this.getReceiptByTxnHash(tx.hash);
        result.sendStatus = receipt && receipt.status ? RESULT_SEND_STATUS.SUCCESS : RESULT_SEND_STATUS.FAILED;

        const transferLog = await eth_receipt_logs_tools.getFirstLogByMethod<TransferLog>(tx.hash,"transfer");
        if(transferLog && transferLog.to.toLowerCase() === result.toAddress.toLowerCase()){
            result.toValue = transferLog.value.toString();
            result.toAmount = eth_worker.convertValueToAmount(result.toValue,eth_config.getTokenDecimal());
        }

        return result;
    }

    /// SWAP EVENTS
    static async processSwapEvents(tx: eth_transaction, decodedAbi: DecodedAbiObject, result: AnalysisResult): Promise<AnalysisResult>{
        let action = "process swap events";

        tx.toAddress = assert.isString({val:tx.toAddress,prop_name:"tx.toAddress",strict:true});
        tx.fromAddress = assert.isString({val:tx.fromAddress,prop_name:"tx.fromAddress",strict:true});
        tx.hash = assert.isString({val:tx.hash,prop_name:"tx.hash",strict:true});

        // CHECK IF DEX
        if(tx.toAddress.toLowerCase() !== eth_config.getDexContract().toLowerCase()) return result;

        // set toAddress same with fromAddress because of swap
        result.toAddress = result.fromAddress;

        // CHECK IF SEND SUCCESS
        const receipt = await this.getReceiptByTxnHash(tx.hash);
        result.sendStatus = receipt && receipt.status ? RESULT_SEND_STATUS.SUCCESS : RESULT_SEND_STATUS.FAILED;

        // identify contract informations
        const fromContract = assert.isString({val: decodedAbi.argument_key_value["path"][0],prop_name:"fromContract path",strict:true});
        const fromContractInfo = await this.getContractMetaData(fromContract);
        const toContract = assert.isString({val: decodedAbi.argument_key_value["path"][decodedAbi.argument_key_value["path"].length-1],prop_name:"toContract",strict:true});

        const analyzeResultLogs = await eth_receipt_logs_tools.getReceiptLogs(tx.hash);

        // BUY
        const swapExactETHForTokens = await web3_abi_decoder.getSwapExactETHForTokens(decodedAbi);
        if(swapExactETHForTokens){
            result.tag = eth_worker.getTagSwapEthToToken();
            // FROM
            const firstDepositLog = await eth_receipt_logs_tools.getFirstLogByMethod<DepositLog>(analyzeResultLogs,"deposit",true) as DepositLog;
            result = this.importResultFromValuesFromLog(result, firstDepositLog.ContractInfo, firstDepositLog.amount.toString());
            // TO
            const lastTransferLog = await eth_receipt_logs_tools.getLastLogByMethod<TransferLog>(analyzeResultLogs,"transfer",true) as TransferLog;
            result = this.importResultToValuesFromLog(result, lastTransferLog.ContractInfo, lastTransferLog.value.toString());
            // TO AMOUNT GROSS
            const swapLog = await eth_receipt_logs_tools.getFirstLogByMethod<SwapLog>(analyzeResultLogs,"swap",true) as SwapLog;
            result.toAmountGross = swapLog.amount1Out.toString();
            result.toAmountGross = this.convertValueToETH(result.toAmountGross);
        }

        const swapETHForExactTokens = await web3_abi_decoder.getSwapETHForExactTokens(decodedAbi);
        if(swapETHForExactTokens){
            result.tag = this.getTagSwapEthToToken();
            // FROM
            const depositLog = await eth_receipt_logs_tools.getFirstLogByMethod<DepositLog>(analyzeResultLogs,"deposit",true) as DepositLog;
            result = this.importResultFromValuesFromLog(result, depositLog.ContractInfo, depositLog.amount.toString());
            // TO
            const lastTransferLog = await eth_receipt_logs_tools.getLastLogByMethod<TransferLog>(analyzeResultLogs,"transfer",true) as TransferLog;
            result = this.importResultToValuesFromLog(result, lastTransferLog.ContractInfo, lastTransferLog.value.toString());
            // TO AMOUNT GROSS
            const swapLog = await eth_receipt_logs_tools.getLastLogByMethod<SwapLog>(analyzeResultLogs,"swap",true) as SwapLog;
            result.toAmountGross = swapLog.amount1Out.toString();
            result.toAmountGross = this.convertValueToAmount(result.toAmountGross, result.toDecimal);
        }

        const swapExactETHForTokensSupportingFeeOnTransferTokens =  await web3_abi_decoder.getSwapExactETHForTokensSupportingFeeOnTransferTokens(decodedAbi);
        if(swapExactETHForTokensSupportingFeeOnTransferTokens){
            result.tag = this.getTagSwapEthToToken();
            // FROM
            const firstDepositLog = await eth_receipt_logs_tools.getFirstLogByMethod<DepositLog>(analyzeResultLogs,"deposit",true) as DepositLog;
            result = this.importResultFromValuesFromLog(result, firstDepositLog.ContractInfo, firstDepositLog.amount.toString());
            // TO
            const lastTransferLog = await eth_receipt_logs_tools.getLastLogByMethod<TransferLog>(analyzeResultLogs,"transfer",true) as TransferLog;
            result = this.importResultToValuesFromLog(result, lastTransferLog.ContractInfo, lastTransferLog.value.toString());
            // TO AMOUNT GROSS
            const lastSwapLog = await eth_receipt_logs_tools.getLastLogByMethod<SwapLog>(analyzeResultLogs,"swap",true) as SwapLog;
            result.toAmountGross = lastSwapLog.amount1Out.toString();
            result.toAmountGross = this.convertValueToAmount(result.toAmountGross,result.toDecimal);
        }



        // SELL
        const swapTokensForExactETH = await web3_abi_decoder.getSwapTokensForExactETH(decodedAbi);
        if(swapTokensForExactETH){
            result.tag = this.getTagSwapTokenToEth();
            result.fromAmountGross = this.convertValueToAmount(swapTokensForExactETH.amountInMax.toString(),fromContractInfo.decimals);
            // FROM
            const firstTransferLog = await eth_receipt_logs_tools.getFirstLogByMethod<TransferLog>(analyzeResultLogs,"transfer",true) as TransferLog;
            result = this.importResultFromValuesFromLog(result, firstTransferLog.ContractInfo, firstTransferLog.value.toString());
            // TO
            const lastTransferLog = await eth_receipt_logs_tools.getLastLogByMethod<TransferLog>(analyzeResultLogs,"transfer",true) as TransferLog;
            result = this.importResultToValuesFromLog(result, lastTransferLog.ContractInfo, lastTransferLog.value.toString());
            // FROM GROSS AMOUNT
            // const syncLog = await eth_receipt_logs_tools.getFirstLogByMethod<SyncLog>(analyzeResultLogs,"sync",true) as SyncLog;
            // result.fromAmountGross = eth_worker.convertValueToAmount(syncLog.reserve1.toString(),firstTransferLog.ContractInfo.decimals);
        }

        const swapExactTokensForETHSupportingFeeOnTransferTokens = await web3_abi_decoder.getSwapExactTokensForETHSupportingFeeOnTransferTokens(decodedAbi);
        if(swapExactTokensForETHSupportingFeeOnTransferTokens){
            result.tag = this.getTagSwapTokenToOtherToken();
            // FROM AMOUNT GROSS
            result.fromAmountGross = swapExactTokensForETHSupportingFeeOnTransferTokens.amountIn.toString();
            result.fromAmountGross = this.convertValueToAmount(result.fromAmountGross,fromContractInfo.decimals);
            // FROM
            const firstTransferLog = await eth_receipt_logs_tools.getFirstLogByMethod<TransferLog>(analyzeResultLogs,"transfer",true) as TransferLog;
            result = this.importResultFromValuesFromLog(result, firstTransferLog.ContractInfo, firstTransferLog.value.toString());
            // TO
            const withdrawalLog = await eth_receipt_logs_tools.getLastLogByMethod<WithdrawalLog>(analyzeResultLogs,"withdrawal",true) as WithdrawalLog;
            result = this.importResultToValuesFromLog(result, withdrawalLog.ContractInfo, withdrawalLog.wad.toString());
        }


        const swapExactTokensForTokens = await web3_abi_decoder.getSwapExactTokensForTokens(decodedAbi);
        if(swapExactTokensForTokens){
            if(fromContract.toLowerCase() === eth_config.getTokenContract().toLowerCase()) result.tag = this.getTagSwapTokenToOtherToken();
            if(toContract.toLowerCase() === eth_config.getTokenContract().toLowerCase()) result.tag = this.getTagSwapOtherTokenToToken();
            result.fromAmountGross = this.convertValueToAmount(swapExactTokensForTokens.amountIn.toString(),fromContractInfo.decimals);
            // FROM
            const firstTransferLog = await eth_receipt_logs_tools.getFirstLogByMethod<TransferLog>(analyzeResultLogs,"transfer",true) as TransferLog;
            result = this.importResultFromValuesFromLog(result, firstTransferLog.ContractInfo, firstTransferLog.value.toString());
            // TO
            const lastTransferLog = await eth_receipt_logs_tools.getLastLogByMethod<TransferLog>(analyzeResultLogs,"transfer",true) as TransferLog;
            result = this.importResultToValuesFromLog(result,lastTransferLog.ContractInfo,lastTransferLog.value.toString());
            // TO AMOUNT GROSS
            const lastSwapLog = await eth_receipt_logs_tools.getLastLogByMethod<SwapLog>(analyzeResultLogs,"swap",true) as SwapLog;
            result.toAmountGross = lastSwapLog.amount1Out.toString();
            result.toAmountGross = this.convertValueToToken(result.toAmountGross);
        }







        const swapExactTokensForTokensSupportingFeeOnTransferTokens = await web3_abi_decoder.getSwapExactTokensForTokensSupportingFeeOnTransferTokens(decodedAbi);
        if(swapExactTokensForTokensSupportingFeeOnTransferTokens){
            if(fromContract.toLowerCase() === eth_config.getTokenContract().toLowerCase()) result.tag = this.getTagSwapTokenToOtherToken();
            if(toContract.toLowerCase() === eth_config.getTokenContract().toLowerCase()) result.tag = this.getTagSwapOtherTokenToToken();
            // FROM
            const firstTransferLog = await eth_receipt_logs_tools.getFirstLogByMethod<TransferLog>(analyzeResultLogs,"transfer",true) as TransferLog;
            result = this.importResultFromValuesFromLog(result, firstTransferLog.ContractInfo, firstTransferLog.value.toString());
            // TO
            const lastTransferLog = await eth_receipt_logs_tools.getLastLogByMethod<TransferLog>(analyzeResultLogs,"transfer",true) as TransferLog;
            result = this.importResultToValuesFromLog(result, lastTransferLog.ContractInfo, lastTransferLog.value.toString());
            // TO AMOUNT GROSS
            if(result.fromContract.toLowerCase() === eth_config.getTokenContract().toLowerCase()){
                result.fromAmountGross = swapExactTokensForTokensSupportingFeeOnTransferTokens.amountIn.toString();
                result.fromAmountGross = eth_worker.convertValueToAmount(result.fromAmountGross,eth_config.getTokenDecimal());
            }
            else{
                const lastSwapLog = await eth_receipt_logs_tools.getLastLogByMethod<SwapLog>(analyzeResultLogs,"swap",true) as SwapLog;
                result.toAmountGross = lastSwapLog.amount1Out.toString();
                result.toAmountGross = this.convertValueToAmount(result.toAmountGross,result.toDecimal);
            }

        }
        return result;
    }
    static async processTransitSwap(tx: eth_transaction, decodedAbi: DecodedAbiObject, result: AnalysisResult): Promise<AnalysisResult>{
        let action = "process transit swap";
        if(tools.isEmpty(tx.hash)) throw new Error("cannot "+action+", hash not set");
        let swap = await web3_abi_decoder.getSwap(decodedAbi);

        if(swap){
            const analyzeResultLogs = await eth_receipt_logs_tools.getReceiptLogs(tx.hash);
            result.fromContract = swap.srcToken;
            result.toContract = swap.dstToken;

            if(result.fromContract === "0x0000000000000000000000000000000000000000"){
                result.fromContract = swap.wrappedNative;
            }
            if(result.toContract === "0x0000000000000000000000000000000000000000"){
                result.toContract = swap.wrappedNative;
            }

            let fromContractInfo = await eth_worker.getContractMetaData(result.fromContract);
            let toContractInfo = await eth_worker.getContractMetaData(result.toContract);

            if(result.fromContract.toLowerCase() === eth_config.getTokenContract().toLowerCase()){
                result.tag = eth_worker.getTagSwapTokenToOtherToken();
            }
            else{
                result.tag = eth_worker.getTagSwapOtherTokenToToken();
            }

            result.toAddress = result.fromAddress;
            result.method = decodedAbi.abi.name;

            let receipt = await eth_worker.getReceiptByTxnHash(tx.hash);
            result.sendStatus = receipt && receipt.status ? RESULT_SEND_STATUS.SUCCESS : RESULT_SEND_STATUS.FAILED;

            // FROM
            const firstTransferLog = await eth_receipt_logs_tools.getFirstLogByMethod<TransferLog>(analyzeResultLogs,"transfer",true) as TransferLog;
            result = await eth_worker.importResultValues("from",result, fromContractInfo, firstTransferLog.value.toString());

            // TO
            const withdrawalLog = await eth_receipt_logs_tools.getLastLogByMethod<WithdrawalLog>(analyzeResultLogs,"withdrawal",false) as WithdrawalLog;
            if(withdrawalLog){
                const withdrawalLog = await eth_receipt_logs_tools.getLastLogByMethod<WithdrawalLog>(analyzeResultLogs,"withdrawal",true) as WithdrawalLog;
                result = await eth_worker.importResultValues("to",result,toContractInfo, withdrawalLog.wad.toString());
            }
            else{
                const lastTransferLog = await eth_receipt_logs_tools.getLastLogByMethod<TransferLog>(analyzeResultLogs,"transfer",true) as TransferLog;
                result = await eth_worker.importResultValues("to",result,toContractInfo,lastTransferLog.value.toString());
            }

            // FROM AMOUNT GROSS
            result.fromAmountGross = eth_worker.convertValueToAmount(swap.amount.toString(),fromContractInfo.decimals);
        }

        return result;
    }

    static async processGenericSwapEvents(tx:eth_transaction|string, result:AnalysisResult): Promise<AnalysisResult>{
        tx = typeof tx === "string" ? await eth_worker.getDbTxnByHash(tx) : tx;
        tx.toAddress = assert.isString({val:tx.toAddress,prop_name:"processGenericSwapEvents tx.toAddress",strict:true});
        tx.fromAddress = assert.isString({val:tx.fromAddress,prop_name:"processGenericSwapEvents tx.fromAddress",strict:true});
        if(!eth_worker.checkIfInvolved2(tx)){
            result.status = RESULT_STATUS.NOT_INVOLVED;
            return result;
        }
        result.status = RESULT_STATUS.INVOLVED;
        const receipt = await eth_worker.getReceiptByTxnHash(tx.hash);
        if(!receipt){
            result.sendStatus = RESULT_SEND_STATUS.FAILED;
            return result;
        }
        return result;
    }

    static async processOtherEventsOfContract(result: AnalysisResult, decodedAbi: DecodedAbiObject): Promise<AnalysisResult>{
        let foundContract = false;
        if(result.status === "involved" && result.sendStatus === RESULT_SEND_STATUS.SUCCESS){
            return result;
        }
        /// DEEP SEARCH PARAMETERS FOR TOKEN_TO_TRACK CONTRACT
        if(
            result.fromAddress.toLowerCase() === eth_config.getTokenContract().toLowerCase()
            || result.toAddress.toLowerCase() === eth_config.getTokenContract().toLowerCase()
        ){
            let analyzeLogsResult = await eth_receipt_logs_tools.getReceiptLogs(result.hash);
            if(analyzeLogsResult.receipt.status){
                result.sendStatus = RESULT_SEND_STATUS.SUCCESS;
                result.status = RESULT_STATUS.INVOLVED;
            }
        }
        for(let x=0;x<decodedAbi.abi.params.length;x++){
            let param = decodedAbi.abi.params[x];
            if(Array.isArray(param.value)){
                for(let y=0;y<param.value.length;y++){
                    let param_arr_value = param.value[y];
                    if( typeof param_arr_value === "string"
                        && param_arr_value.toLowerCase() === eth_config.getTokenContract().toLowerCase()
                    ){
                        foundContract = true;
                    }
                }
            }

            if( typeof param.value === "string"
                && param.value.toLowerCase() === eth_config.getTokenContract().toLowerCase()
            ){
                foundContract = true;
            }
        }
        if(foundContract){
            let analyzeLogsResult = await eth_receipt_logs_tools.getReceiptLogs(result.hash);
            if(analyzeLogsResult.receipt.status){
                result.sendStatus = RESULT_SEND_STATUS.SUCCESS;
                result.status = RESULT_STATUS.INVOLVED;
            }
        }

        if(result.sendStatus === "success" && result.status === "involved"){
            result.tag = this.getTagOtherContractEvents();
        }

        return result;
    }

    /// SET TYPES
    static processResultType(result: AnalysisResult): AnalysisResult{
        result.type = "generic_event";

        if( result.fromContract === eth_config.getTokenContract()
            && result.toContract === eth_config.getTokenContract()
        ){
            result.type = "transfer";
        }

        if( result.fromContract === eth_config.getTokenContract()
            && result.toContract !== eth_config.getTokenContract()
        ){
            result.type = "sell";
        }

        if( result.fromContract !== eth_config.getTokenContract()
            && result.toContract === eth_config.getTokenContract()
        ){
            result.type = "buy";
        }

        if(result.method === "addLiquidityETH"){
            result.type = "add_liquidity";
        }

        // intended type approv, to check for approve or approval string pattern
        if(result.method.indexOf("approv") >= 0){
            result.type = "approval";
        }

        return result;
    }

    /// TAXES & FEES
    static processTaxesFees(result: AnalysisResult): AnalysisResult{
        if(result.status === "involved"){
            result.fromTaxPerc = "0";
            let fromAmountBn = new BigNumber(result.fromAmount);
            let fromAmountGrossBn = new BigNumber(result.fromAmountGross);
            let fromTaxAmountBn = new BigNumber(result.fromTaxAmount);
            let fromTaxPercBn = new BigNumber(result.fromTaxPerc);
            fromTaxAmountBn = fromAmountGrossBn.comparedTo(0) === 1 ? fromAmountGrossBn.minus(fromAmountBn) : new BigNumber(0);
            if(fromTaxAmountBn.comparedTo(0) === 1 && fromAmountGrossBn.comparedTo(0) === 1){
                fromTaxPercBn = fromTaxAmountBn.dividedBy(fromAmountGrossBn);
                result.fromTaxPerc = fromTaxPercBn.toFixed(5);
                result.toTaxAmount = fromTaxAmountBn.toFixed(8);
            }

            result.toTaxPerc = "0";
            let toAmountBn = new BigNumber(result.toAmount);
            let toAmountGrossBn = new BigNumber(result.toAmountGross);
            let toTaxAmountBn = new BigNumber(result.toTaxAmount);
            let toTaxPercBn = new BigNumber(result.toTaxPerc);

            toTaxAmountBn = toAmountGrossBn.comparedTo(0) === 1 ? toAmountGrossBn.minus(toAmountBn) : new BigNumber(0);
            if(toTaxAmountBn.comparedTo(0) === 1 && toAmountGrossBn.comparedTo(0) === 1){
                toTaxPercBn = toTaxAmountBn.dividedBy(toAmountGrossBn);
                result.toTaxPerc = toTaxPercBn.toFixed(5);
                result.toTaxAmount = toTaxAmountBn.toFixed(8);
            }

            result.taxAmount = result.toTaxAmount > result.fromTaxAmount ? result.toTaxAmount : result.fromTaxAmount;
            result.taxPerc = result.toTaxPerc > result.fromTaxAmount ? result.toTaxPerc : result.fromTaxPerc;
        }
        return result;
    }

    static async processResultChecks(result: AnalysisResult, decodedAbi: DecodedAbiObject): Promise<AnalysisResult>{
        if( result.status === RESULT_STATUS.INVOLVED
            && result.sendStatus === "success"
        ){
            let withAmount = ["transfer","buy","sell"];
            let fromTaxPerc = parseFloat(result.fromTaxPerc);
            let toTaxPerc = parseFloat(result.toTaxPerc);
            if( withAmount.indexOf(result.method) >= 0 &&
                (result.type === ""
                    || result.tag === ""
                    || result.toAddress === ""
                    || result.fromAmount === ""
                    || result.toAmount === ""
                    || (!(fromTaxPerc >= 0) && !(toTaxPerc >= 0)))
            ){
                console.log(result);
                throw new Error("involved transaction method not processed:"+result.method+" hash:"+result.hash);
            }

            /// IF TRADE, CHECK TAXES
            let taxAmount: number | string = result.fromTaxAmount > result.toTaxAmount ? result.fromTaxAmount : result.toTaxAmount;
                taxAmount = parseFloat(taxAmount);
            if(result.type === "buy" || result.type === "sell") {
                if(taxAmount === 0){
                    // console.log("\nNotice: This tx has no tax or fee");
                }
            }
            if(result.type === "transfer"
                && result.fromAddress.toLowerCase() !== eth_config.getHotWalletAddress().toLowerCase()
                && result.fromAddress.toLowerCase() !== eth_config.getTokenOwner().toLowerCase()
                && result.fromAddress.toLowerCase() !== "0x8a9080fb96631cdc0fa95e479c68864dd5d3313b".toLowerCase() // evans address
            ){
                if(taxAmount === 0){
                    // console.log("\nNotice: This tx has no tax or fee");
                }
            }
        }
        else{
            let foundContract = false;
            let ignoreEvents = ["increaseAllowance","setSwapAndLiquifyEnabled","enableAllFees","setTaxFee"];
            /// DEEP SEARCH PARAMETERS FOR TOKEN_TO_TRACK CONTRACT
            if(
                result.fromAddress.toLowerCase() === eth_config.getTokenContract().toLowerCase()
                || result.toAddress.toLowerCase() === eth_config.getTokenContract().toLowerCase()
            ){
                if(ignoreEvents.indexOf(result.method) < 0){
                    let analyzeLogsResult = await eth_receipt_logs_tools.getReceiptLogs(result.hash);
                    if(analyzeLogsResult.receipt.status){
                        result.sendStatus = RESULT_SEND_STATUS.SUCCESS;
                        throw new Error("tracked contract found on tx, should be involved. hash:"+result.hash);
                    }
                }
            }
            for(let x=0;x<decodedAbi.abi.params.length;x++){
                let param = decodedAbi.abi.params[x];
                if(Array.isArray(param.value)){
                    for(let y=0;y<param.value.length;y++){
                        let param_arr_value = param.value[y];
                        if( typeof param_arr_value === "string"
                            && param_arr_value.toLowerCase() === eth_config.getTokenContract().toLowerCase()
                        ){
                            foundContract = true;
                        }
                    }
                }

                if( typeof param.value === "string"
                    && param.value.toLowerCase() === eth_config.getTokenContract().toLowerCase()
                ){
                    foundContract = true;
                }
            }
            if(foundContract){
                if(ignoreEvents.indexOf(result.method) < 0){
                    let analyzeLogsResult = await eth_receipt_logs_tools.getReceiptLogs(result.hash);
                    if(analyzeLogsResult.receipt.status){
                        result.sendStatus = RESULT_SEND_STATUS.SUCCESS;
                        console.log(result);
                        throw new Error("tracked contract found on tx, should be involved. hash:"+result.hash);
                    }
                }
            }
        }
        return result;
    }

    static async processResultBlockTime(result: AnalysisResult): Promise<AnalysisResult>{
        if(result.status === "involved" && result.sendStatus === "success"){
            if(typeof result.blockNumber === "undefined") throw new Error("blockNumber info not in result object");
            if(!(result.blockNumber > 0)) throw new Error("invalid blockNumber:"+result.blockNumber);
            let blockInfo = await Web3Client.eth.getBlock(result.blockNumber);
            result.block_time = blockInfo.timestamp;
        }
        return result;
    }

    //endregion

    //region API

    //endregion END OF API

    static importResultFromValuesFromLog(result: AnalysisResult, ContractInfo: ContractInfo,value: string): AnalysisResult{
        result.fromContract = ContractInfo.address;
        result.fromDecimal = ContractInfo.decimals;
        result.fromSymbol = ContractInfo.symbol;
        result.fromValue = value;
        result.fromAmount = this.convertValueToAmount(result.fromValue,result.fromDecimal);
        return result;
    }

    static importResultToValuesFromLog(result: AnalysisResult, contractInfo: ContractInfo, value: string): AnalysisResult{
        result.toContract = contractInfo.address;
        result.toSymbol = contractInfo.symbol;
        result.toDecimal = contractInfo.decimals;
        result.toValue = value;
        result.toAmount = this.convertValueToAmount(result.toValue,result.toDecimal);
        return result;
    }

    static async analyzeLogs(_tx_hash: string, strict:boolean = true): Promise<AnalyzeLogsResult>{

        let logResult:AnalyzeLogsResult = {receipt:eth_types.getDefaultTransactionReceipt(), result: []};
        let action = "analyze logs";
        let receipt = await this.getReceiptByTxnHash(_tx_hash);
        if(!receipt) throw new Error("cannot "+action+", unable to get receipt of hash:"+_tx_hash);

        let result: LogData[] = [];

        for(let x=0;x<receipt.logs.length;x++){
            let logData = {} as LogData;
            logData.contract = "";
            logData.symbol = "";
            logData.decimal = 0;
            logData.method_name = "";
            logData.indexArgs = [];
            logData.indexArgsObj = [];
            logData.parameters = [];
            logData.parametersObj = [];
            logData.arguments = {};

            let log = receipt.logs[x];

            let address = log.address;
            logData.contract = address;

            let contractMetaData = await this.getContractMetaData(address);
            if(typeof contractMetaData === "undefined"){
                throw new Error("no contract meta data not found");
            }
            if(typeof contractMetaData.symbol === "undefined"){
                throw new Error("no contract symbol not found");
            }

            let log_sig = log.topics[0];
            log_sig = log_sig.replace(/^(0x)/,"");

            let log_sig_record = new eth_log_sig();
            log_sig_record.signature = log_sig;
            await log_sig_record.fetch();

            if(log_sig_record._isNew){
                continue;
                // throw new Error("log signature not found");
            }

            let param_names = (log_sig_record.params_names ?? "").split(";");
            let param_name = param_names[0];

            let methodBreakdown = param_name.split("(");
            let methodName = methodBreakdown[0];

            logData.symbol = contractMetaData.symbol;
            logData.decimal = contractMetaData.decimals;
            logData.method_name = methodName;

            let args: string | string[] = methodBreakdown[1];
            args = args.replace(")","");

            let indexArgs: LogSigArgs[] = [];
            let parameters: LogSigArgs[] = [];
            let paramTypes: string[] = [];
            args = args.split(",");

            for(let x=0;x<args.length;x++){
                let param: string | string[] = args[x];
                if(param.indexOf("indexed") >= 0){
                    param = param.replace("indexed ","");
                    param = param.split(" ");
                    indexArgs.push({
                        type:param[0],
                        name:param[1],
                        value:"",
                    });
                }
                else{
                    param = param.split(" ");
                    parameters.push({
                        type:param[0],
                        name:param[1],
                        value:"",
                    });
                    paramTypes.push(param[0]);
                }
            }

            if(log.topics.length > 1 && indexArgs.length !== (log.topics.length-1)){
                throw new Error("index args derived from decoded signature count("+indexArgs.length+") does not match count of log.topics ("+(log.topics.length-1)+")");
            }
            for(let x=0;x<indexArgs.length;x++){
                indexArgs[x].value = log.topics[x+1];
                indexArgs[x].value = indexArgs[x].value.replace("0x000000000000000000000000","0x");
                logData.indexArgsObj[indexArgs[x].name] = indexArgs[x].value;
                logData.arguments[indexArgs[x].name] = indexArgs[x].value;
            }

            let decodedData = Web3Client.eth.abi.decodeParameters(paramTypes,log.data);
            for(let x=0;x<parameters.length;x++){
                if(typeof decodedData[x] === "undefined"){
                    throw new Error("parameter index("+x+") not found from decodedData");
                }
                parameters[x].value = decodedData[x];
                logData.parametersObj[parameters[x].name] = parameters[x].value;
                logData.arguments[parameters[x].name] = parameters[x].value;
            }

            logData.indexArgs = indexArgs;
            logData.parameters = parameters;

            result.push(logData);
        }
        return {result:result,receipt:receipt};
    }

    static async sendTokenFromHotWallet(_to: string, _amount: string): Promise<string> {
        return await this.sendToken(eth_config.getHotWalletAddress(), _to, _amount, eth_config.getHotWalletKey());
    }

    static async sendToken(_from: string, _to: string, _amount: string, _key: string): Promise<string> {
        _to = _to.replace(/\s/g, "");
        console.log("USING QUICKNODE");
        console.log("sending token amount:%... initiating contract...from:%s", _amount, eth_config.getHotWalletAddress());
        let contract = new Web3Client.eth.Contract(eth_config.getTokenAbi(), eth_config.getTokenContract(), {from: _from});
        let value = this.convertTokenToValue(_amount);
        //@ts-ignore
        let _data = contract.methods.transfer(_to, value).encodeABI();
        console.log("converted token value: %s, encoding transfer ABI...", value);
        console.log(_data);

        let estimateGas = await Web3Client.eth.estimateGas({
            value: "0x0" // only tokens
            , data: _data
            , to: _to
            , from: _from
        });
        let _gas = await Web3Client.eth.getGasPrice();
        let gasLimit = Math.floor(estimateGas * eth_config.getGasMultiplier());
        console.log("...gas estimate:%s gas price:%s gas:%s", estimateGas, _gas, gasLimit);

        let _nonce = await Web3Client.eth.getTransactionCount(_from);
        // let _nonce = await eth_helper.getHotWalletNonce();

        console.log("nonce:%s, signing transaction...", _nonce);
        let signedTransaction = await Web3Client.eth.accounts.signTransaction({
            nonce: _nonce,
            data: _data,
            to: eth_config.getTokenContract(),
            value: "0x0",
            gas: gasLimit,
            gasPrice: _gas,
        }, _key);
        console.log(signedTransaction);
        console.log("...signed transaction, sending...");
        return new Promise((resolve, reject) => {
            if(typeof signedTransaction.rawTransaction !== "string") throw new Error("unable to send Eth, cannot sign transaction");
            Web3Client.eth.sendSignedTransaction(signedTransaction.rawTransaction)
                .once("transactionHash", (hash:string) => {
                    console.log("transaction hash:%s", hash);
                    resolve(hash);
                });
        });
    }

    static async sendEth(_from: string, _to: string, _amount: string, _key: string): Promise<string> {
        let from_eth_bal = await this.getETHBalance(_from);
        let to_eth_bal = await this.getETHBalance(_to);
        console.log("sending from:%s eth_bal:%s to:%s eth_bal:%s", _from, from_eth_bal, _to, to_eth_bal);
        let value = this.convertEthToValue(_amount);
        console.log("sending bnb:%s value:%s", _amount, value);
        let estimateGas = await Web3Client.eth.estimateGas({
            value: value
            , to: _to
            , from: _from
        });
        let _gas = await Web3Client.eth.getGasPrice();
        let gasLimit = Math.floor(estimateGas * 2.7);
        console.log("estimateGas:%s gasPrice:%s gasLimit:%s", estimateGas, _gas, gasLimit);
        let gasLimitAmount = this.convertValueToETH(gasLimit);
        console.log("estimated total to send including gas:%s", (_amount + gasLimitAmount));
        let _nonce = await Web3Client.eth.getTransactionCount(_from);
        console.log("none:%s", _nonce);
        let signedTransaction = await Web3Client.eth.accounts.signTransaction({
            nonce: _nonce,
            to: _to,
            value: value,
            gas: Web3.utils.toHex(gasLimit),
            gasPrice: Web3.utils.toHex(_gas),
        }, _key);
        console.log("signed transaction:");
        console.log(signedTransaction);
        console.log("sending...");
        return new Promise((resolve, reject) => {
            if(typeof signedTransaction.rawTransaction !== "string") throw new Error("unable to send Eth, cannot sign transaction");
            Web3Client.eth.sendSignedTransaction(signedTransaction.rawTransaction)
                .once("transactionHash", (hash:string) => {
                    resolve(hash);
                });
        });
    }

    static createWallet(): WalletInfo {
        let account = Web3Client.eth.accounts.create(Web3.utils.randomHex(32));
        let wallet = Web3Client.eth.accounts.wallet.add(account);
        let keystore = wallet.encrypt(Web3.utils.randomHex(32));
        return {account: account, wallet: wallet, keystore: keystore};
    }

    static async waitConfirmation(_txn: string | Transaction): Promise<boolean> {
        if (typeof _txn === "string") {
            // console.log("arg is string, retrieving hash info...");
            _txn = await this.getTxnByHash(_txn);
            // console.log(_txn);
        }
        if (typeof _txn.blockNumber !== "number") {
            throw new Error("transaction has no block number");
        }
        let currentBlock = 0;
        let height = 0;
        let confirmationCheckLimit = 40;
        let currentCheckCount = 0;
        do {
            if (currentCheckCount > 0) {
                await new Promise((resolve) => {
                    setTimeout(resolve, 500);
                });
            }
            currentCheckCount++;
            currentBlock = await this.getLatestBlockWeb3();
            height = currentBlock - _txn.blockNumber;
            console.log("current block:%s transaction block:%s height:%s", currentBlock, _txn.blockNumber, height);
            if (currentCheckCount >= confirmationCheckLimit) {
                throw new Error("unable to confirm transaction");
            }
        } while (height < eth_config.getConfirmationNeeded());
        return true;
    }


    public static async getTokenPriceInBUSD(tokenAddress: string, timestamp: number){
        const logs = await Web3Client.eth.getPastLogs({address:"0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16",fromBlock:23989415,toBlock:23989415,topics:["0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1"]});
        console.log(logs);
        // get token symbol
        // const symbol = await Web3Client.eth.call({
        //     to: tokenAddress,
        //     data: '0x95d89b41'
        // });
        // let contract = new Web3Client.eth.Contract(eth_config.getPancakePairAbi(), "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73");
        // console.log(contract);

        // const pairData = await Web3Client.eth.call({
        //     to: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
        //     data: '0x6c3f8b37',
        //     blockNumber: 16052476
        // });
        // console.log(pairData);

        // const result = await contract.methods.symbol().call();
        // console.log(result);
        // console.log(symbol);
        // const symbolHex = symbol.slice(2);
        // const symbolDec = Web3Client.utils.hexToString(symbolHex);
        // console.log(symbolDec);
        // if (symbolDec === 'BUSD') return 1;
        // // get token symbol
        // const decimals = await Web3Client.eth.call({
        //     to: tokenAddress,
        //     data: '0x313ce567'
        // });
        // const decimalsHex = decimals.slice(2, 66);
        // const decimalsDec = Web3Client.utils.hexToNumber(decimalsHex);
        // // get pair address
        // const pairAddress = await Web3Client.eth.call({
        //     to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        //     data: '0x0357d2f2' + tokenAddress.slice(2) + '0x4fabb145d64652a948d72533023f6e7a623c7c53'
        // });
        //
        // // get pair data
        // const pairData = await Web3Client.eth.call({
        //     to: pairAddress,
        //     data: '0x6c3f8b37'
        // });
        // const pairDataArray = pairData.slice(2).match(/.{1,64}/g);
        // const token0Reserve = parseInt(pairDataArray[0], 16);
        // const token1Reserve = parseInt(pairDataArray[1], 16);
        // const liquidity = parseInt(pairDataArray[2], 16);
        //
        // // get trade history
        // const tradeHistory = await Web3Client.eth.call({
        //     to: pairAddress,
        //     data: '0x38a13df2'
        // });
        // const tradeHistoryArray = tradeHistory.slice(2).match(/.{1,64}/g);
        // let totalBuy = new Web3Client.utils.BN(0);
        // let totalSell = new Web3Client.utils.BN(0);
        // for (let i = 0; i < tradeHistoryArray.length; i++) {
        //     const trade = tradeHistoryArray[i];
        //     const timestampTrade = parseInt(trade.slice(24, 64), 16);
        //     if (timestampTrade <= timestamp) {
        //         const buyAmount = new Web3Client.utils.BN(trade.slice(0, 24), 16);
        //         const sellAmount = new Web3Client.utils.BN(trade.slice(64, 88), 16);
        //         totalBuy = totalBuy.add(buyAmount);
        //         totalSell = totalSell.add(sellAmount);
        //     }
        // }
    }

    //region PRICE

    private static async getReserveByBlockNumber(blockNumber:number,pairContract:string):Promise<SyncLog>{
        let sync_log:SyncLog|false = false;
        const logDb = new eth_receipt_logs();
        console.log(`attempting to search sync log of contract:${pairContract} in db`);
        await logDb.list(" WHERE blockNumber=:blockNumber AND address=:address ",{blockNumber:blockNumber,address:pairContract});
        if(logDb.count() > 0){
            console.log(`sync log found`);
            for(const log of logDb._dataList as eth_receipt_logs[]){
                let check_sync_log = await web3_log_decoder.getSyncLog({
                    address: log.address ?? "",
                    blockHash: log.blockHash ?? "",
                    blockNumber: log.blockNumber ?? 0,
                    data: log.data ?? "",
                    logIndex: log.logIndex ?? 0,
                    topics: JSON.parse(log.topics ?? "[]"),
                    transactionHash: log.transactionHash ?? "",
                    transactionIndex: log.transactionIndex ?? 0
                });
                if(check_sync_log){
                    sync_log = check_sync_log;
                }
            }
        }
        // fallback web3
        else{
            console.log(`not found in db, attempting to search sync log pair:${pairContract} in rpc`);
            const logs = await Web3Client.eth.getPastLogs({address:pairContract,fromBlock:blockNumber,toBlock:blockNumber,topics:[eth_config.getSyncTopicSig()]});
            if(logs.length === 0){
                console.log(`not found for current block:${blockNumber}, trying on block:${--blockNumber}`);
                return eth_worker.getReserveByBlockNumber(blockNumber,pairContract);
            }
            for(const log of logs){
                sync_log = await web3_log_decoder.getSyncLog(log);
                if(sync_log){
                    console.log(`sync log found, adding on db`);
                    await eth_worker.getDbTxnByHash(log.transactionHash);
                    await eth_receipt_logs_tools.getReceiptLogs(log.transactionHash);
                }
            }
        }
        if(!sync_log) throw new Error(`unable to retrieve reserve of ${pairContract} in block:${blockNumber}`);
        return sync_log;
    }

    // BNB USD PAIR
    private static async getBnbUsdReserveByBlockNumber(blockNumber:number):Promise<BnbUsdReserve>{
        const syncLog = await eth_worker.getReserveByBlockNumber(blockNumber,eth_config.getBnbUsdPairContract());
        return {bnb:syncLog.reserve0,usd:syncLog.reserve1};
    }

    public static getBnbUsdPriceByReserve(bnbReserve:bigint,usdReserve:bigint):BigNumber{
        return tools.toBn(usdReserve.toString()).dividedBy(tools.toBn(bnbReserve.toString()));
    }

    public static async getBnbUsdPriceByBlockNumber(blockNumber:number):Promise<BigNumber>{
        const reserve = await eth_worker.getBnbUsdReserveByBlockNumber(blockNumber);
        return tools.toBn(reserve.usd.toString()).dividedBy(tools.toBn(reserve.bnb.toString()));
    }

    public static async getBnbUsdPriceByTime(timeStamp:number):Promise<BigNumber>{
        console.log(`attempting to retrieve closest block on db for time:${timeStamp}`);
        const blockDb = new eth_block();
        await blockDb.list(" WHERE time_added <= :timeStamp ",{timeStamp:timeStamp}," ORDER BY time_added DESC LIMIT 1 ");
        if(blockDb.count() === 0) throw new Error(`no block information retrieved on db`);
        const block = blockDb.getItem();
        const diff = timeStamp - block.time_added;
        let blockNumber = block.blockNumber;
        if(diff > (60 * 3)){ // 3 minutes
            console.log(`retrieved block:${block.blockNumber} time_added:${block.time_added} is too far from query time:${timeStamp} difference of ${diff} seconds`);
            let factor = Math.floor(diff / 3);
            blockNumber = (blockNumber + factor) - 31;
            console.log(`adjusting block from ${block.blockNumber} to ${blockNumber}`);
        }
        return eth_worker.getBnbUsdPriceByBlockNumber(blockNumber);
    }

    public static async getBnbUsdValueByTime(amount:number|string,timeStamp:number){
        throw new Error(`for implementation`);
    }

    public static async getBnbUsdPriceByHash(txn_hash:string){
        throw new Error(`for implementation`);
    }

    public static async getBnbUsdValueByHash(amount:number|string,txn_hash:string){
        throw new Error(`for implementation`);
    }

    // BNB TOKEN PAIR
    private static async getTokenBnbReserveByBlockNumber(blockNumber:number):Promise<TokenBnbReserve>{
        const syncLog = await eth_worker.getReserveByBlockNumber(blockNumber,eth_config.getTokenBnbPairContract());
        return {bnb:syncLog.reserve0,token:syncLog.reserve1};
    }


    public static async getTokenBnbPriceByBlockNumber(blockNumber:number):Promise<BigNumber>{
        const reserve = await eth_worker.getTokenBnbReserveByBlockNumber(blockNumber);
        return tools.toBn(reserve.bnb.toString()).dividedBy(tools.toBn(reserve.token.toString()));
    }

    public static async getTokenUsdPriceByBlockNumber(blockNumber:number):Promise<BigNumber>{
        const bnb_usd = await eth_worker.getBnbUsdPriceByBlockNumber(blockNumber);
        const bnb_token = await eth_worker.getTokenBnbPriceByBlockNumber(blockNumber);
        return tools.toBn(bnb_token.toString()).multipliedBy(tools.toBn(bnb_usd.toString()));
    }


    public static async getTokenBnbValueByTime(amount:number|string,timeStamp:number){
        throw new Error(`for implementation`);
    }

    public static async getTokenUsdValueByTime(amount:number|string,timeStamp:number){
        throw new Error(`for implementation`);
    }


    public static async getTokenBnbPriceByHash(txn_hash:string){
        throw new Error(`for implementation`);
    }

    public static async getTokenUsdPriceByHash(txn_hash:string){
        throw new Error(`for implementation`);
    }


    public static async getTokenBnbValueByHash(amount:number|string,txn_hash:string){
        throw new Error(`for implementation`);
    }

    public static async getTokenUsdValueByHash(amount:number|string,txn_hash:string){
        throw new Error(`for implementation`);
    }


    //endregion


    //region TRADE



    //endregion

}