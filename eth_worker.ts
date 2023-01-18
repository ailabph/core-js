import {BlockTransactionObject, BlockTransactionString, Transaction, TransactionReceipt} from "web3-eth/types"
import {
    AnalysisResult,
    AnalyzeLogsResult,
    ContractInfo,
    eth_types,
    GasInfo,
    LogData,
    LogSigArgs,
    RESULT_SEND_STATUS,
    RESULT_STATUS,
    WalletInfo
} from "./eth_types";
import {DecodedAbiObject, eth_abi_decoder} from "./eth_abi_decoder";

import BigNumber from "bignumber.js";
import {eth_config} from "./eth_config";

import {eth_tools} from "./eth_tools";

import {eth_log_decoder} from "./eth_log_decoder";

import {eth_transaction} from "./build/eth_transaction";
import {eth_contract_data} from "./build/eth_contract_data";
import {eth_log_sig} from "./build/eth_log_sig";
import {tools} from "./tools";
import {assert} from "./assert";
import {assert_eth} from "./assert_eth";
import fsPromise from "fs/promises";
import {eth_block} from "./build/eth_block";

const Web3 = require("web3");
const Web3Provider = new Web3.providers.HttpProvider(eth_config.getRPCUrl());
const Web3Client = new Web3(Web3Provider);

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

    static convertValueToAmount(_value: number | string, _decimals:number|string): string {
        BigNumber.config({DECIMAL_PLACES: Number(_decimals)});
        BigNumber.config({EXPONENTIAL_AT: 1e+9});
        let toReturn = new BigNumber(Number(_value));
        if (_decimals > 0) {
            let valueBN = new BigNumber(_value);
            let tenBN = new BigNumber(10);
            let decimalsBN = new BigNumber(_decimals);
            let powBN = tenBN.pow(decimalsBN);
            let amountBN = valueBN.dividedBy(powBN);
            return amountBN.toString();
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

    //endregion END OF UTILITIES


    //region GETTERS

    static async getLatestBlock(): Promise<number> {
        return await Web3Client.eth.getBlockNumber();
    }

    static async getBlockByNumber(blockNumber:number): Promise<BlockTransactionString>{
        return await Web3Client.eth.getBlock(blockNumber);
    }

    static async getTxnByBlockNumber(_block_num: number) : Promise<BlockTransactionObject>{
        return await Web3Client.eth.getBlock(_block_num, true);
    }

    static async getTxnByHash(_txn_hash: string): Promise<Transaction> {
        return await Web3Client.eth.getTransaction(_txn_hash);
    }

    static async getReceiptByTxnHash(_txn_hash: string) : Promise<TransactionReceipt | false> {
        try {
            let receipt;
            let waitLimit = 40;
            let waitCount = 0;
            receipt = await Web3Client.eth.getTransactionReceipt(_txn_hash);
            while (typeof receipt === "undefined" || receipt == null) {
                if (waitCount >= waitLimit) break;
                waitCount++;
                console.log("txn not yet mined, waiting...");
                await new Promise((resolve) => {
                    setTimeout(resolve, 500);
                });
                receipt = await Web3Client.eth.getTransactionReceipt(_txn_hash);
            }
            return receipt;
        } catch (e) {
            console.log("Error getting receipt from txn:%s", _txn_hash);
            console.log(e);
            return false;
        }
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

    static async getContractMetaData(_contract_address: string): Promise<ContractInfo> {
        let contractInfo = {} as ContractInfo;
        contractInfo.address = _contract_address;
        contractInfo.name = "";
        contractInfo.symbol = "";
        contractInfo.decimals = 0;

        let contract_data = new eth_contract_data();
        contract_data.contract = _contract_address;
        await contract_data.fetch();
        if(contract_data._isNew){
            contract_data.name = "";
            contract_data.symbol = "";
            contract_data.decimals = 0;
            let contract = new Web3Client.eth.Contract(eth_config.getTokenAbi(), _contract_address);
            try {
                contract_data.name = await contract.methods.name().call();
            } catch (e) {
                // console.log("ERROR on %s: %s",_contract_address, e);
            }
            try {
                contract_data.symbol = await contract.methods.symbol().call();
            } catch (e) {
                // console.log("ERROR on %s: %s",_contract_address, e);
            }
            try {
                contract_data.decimals = await contract.methods.decimals().call();
            } catch (e) {
                // console.log("ERROR on %s: %s",_contract_address, e);
            }

            await contract_data.save();
        }

        contractInfo.name = contract_data.name ?? "";
        contractInfo.symbol = contract_data.symbol ?? "";
        contractInfo.decimals = contract_data.decimals ?? 0;

        return contractInfo;
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

    //endregion

    //region ANALYZE TOOL

    static async analyzeTransaction2(_txn_hash: string | eth_transaction): Promise<AnalysisResult>{
        let tx = new eth_transaction();
        if(_txn_hash instanceof eth_transaction){
            tx = _txn_hash;
        }
        else{
            tx.hash = _txn_hash;
            await tx.fetch();
        }

        if(tools.isEmpty(tx.hash)) throw new Error("hash must not be empty");
        if(tools.isEmpty(tx.blockNumber)) throw new Error("blockNumber must not be empty");

        let result = eth_tools.getDefaultResult();
        result.hash = tx.hash;
        result.blockNumber = tx.blockNumber as number;

        // ADD TRANSACTION IF NOT EXIST
        if(tx._isNew){
            let txLookup = await Web3Client.eth.getTransaction(tx.hash);
            if(typeof txLookup === "undefined"){
                throw new Error("transaction record not found with hash:"+_txn_hash);
            }
            console.log(txLookup);
            tx.hash = txLookup.hash;
            tx.blockHash = txLookup.blockHash;
            tx.blockNumber = txLookup.blockNumber;
            tx.fromAddress = txLookup.from;
            tx.gas = txLookup.gas+"";
            tx.gasPrice = txLookup.gasPrice;
            tx.input = txLookup.input;
            tx.nonce = txLookup.nonce;
            tx.toAddress = txLookup.to;
            tx.value = txLookup.value;
            // tx.type = txLookup.type;
            // tx.v = txLookup.v;
            // tx.r = txLookup.r;
            // tx.s = txLookup.s;
            tx.status = "o";
            await tx.save();
        }

        result.fromAddress = tx.fromAddress ?? "";
        result.toAddress = tx.toAddress ?? "";

        result = await this.processContractCreationEvent(tx,result);
        if (typeof tx.toAddress === "undefined" || tx.toAddress === null || tx.toAddress === "") return result;

        let decodedAbi = eth_abi_decoder.decodeAbiObject(tx.input);
        if(!decodedAbi) return result;
        result.method = decodedAbi.abi.name;

        if(eth_worker.checkIfInvolved({from:result.fromAddress,to:result.toAddress,abi:decodedAbi})){
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
        result = await this.processResultBlockTime(result);

        return result;
    }

    static async analyzeTransaction3(txn:string|eth_transaction):Promise<AnalysisResult>{
        // establish eth_transaction
        let transaction = new eth_transaction();
        if(typeof txn === "string"){
            transaction.hash = txn;
            await transaction.fetch();

            // update eth_transaction information
            if(transaction.isNew()){
                let web3Transaction = await eth_worker.getTxnByHash(txn);
                transaction.loadValues(web3Transaction,true);
                transaction.toAddress = web3Transaction.to;
                transaction.fromAddress = web3Transaction.from;
                await transaction.save();

                // update eth_block information
                let block = new eth_block();
                block.blockNumber = assert.isNumber(transaction.blockNumber,"transaction.blockNumber",0);
                await block.fetch();
                if(block.isNew()){
                    const web3Block = await eth_worker.getBlockByNumber(block.blockNumber);
                    block.blockNumber = web3Block.number;
                    block.blockHash = web3Block.hash;
                    block.time_added = tools.getCurrentTimeStamp();
                    await block.save();
                }
            }
        }
        else{
            transaction = txn;
        }
        // double check required values
        transaction.fromAddress = assert.isString({val:transaction.fromAddress,prop_name:"transaction.fromAddress",strict:true});
        transaction.toAddress = assert.isString({val:transaction.toAddress,prop_name:"transaction.toAddress",strict:true});
        transaction.blockNumber = assert.isNumber(transaction.blockNumber,"transaction.blockNumber",0);

        // initiate analysis result object
        let result = eth_types.getDefaultAnalysisResult(transaction);

        // decode abi
        const decoded_abi = eth_abi_decoder.decodeAbiObject(transaction.input);
        if(!decoded_abi) {
            result.abiDecodeStatus = "failed";
            return result;
        }
        result.abiDecodeStatus = "success";
        result.method = decoded_abi.abi.name;

        // check if involved
        if(!eth_worker.checkIfInvolved({from:transaction.fromAddress,to:transaction.toAddress,abi:decoded_abi})) {
            result.status = RESULT_STATUS.NOT_INVOLVED;
            return result;
        }
        result.status = RESULT_STATUS.INVOLVED;

        // if involved, identify method
        if(result.sendStatus === RESULT_SEND_STATUS.NOT_CHECKED) result = await eth_worker.processContractCreationEvent(transaction,result);
        if(result.sendStatus === RESULT_SEND_STATUS.NOT_CHECKED) result = await eth_worker.processAddLiquidity(result,decoded_abi);
        if(result.sendStatus === RESULT_SEND_STATUS.NOT_CHECKED) result = await eth_worker.processApprovalEvent(transaction,decoded_abi,result);
        if(result.sendStatus === RESULT_SEND_STATUS.NOT_CHECKED) result = await eth_worker.processTransferEvent(transaction,decoded_abi,result);
        if(result.sendStatus === RESULT_SEND_STATUS.NOT_CHECKED) result = await eth_worker.processSwapEvents(transaction,decoded_abi,result);
        if(result.sendStatus === RESULT_SEND_STATUS.NOT_CHECKED) result = await eth_worker.processTransitSwap(transaction,decoded_abi,result);
        if(result.sendStatus === RESULT_SEND_STATUS.NOT_CHECKED) result = await eth_worker.processOtherEventsOfContract(result,decoded_abi);

        result = eth_worker.processResultType(result);
        result = eth_worker.processTaxesFees(result);
        result = await eth_worker.processResultChecks(result,decoded_abi);
        result = await eth_worker.processResultBlockTime(result);

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
        let methodAbi = eth_abi_decoder.getAddLiquidityETH(decodedAbi);
        if(methodAbi){
            result.status = RESULT_STATUS.INVOLVED;
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

            let analyzeLogsResult = await this.analyzeLogs(result.hash);
            if(analyzeLogsResult.receipt.status){
                result.sendStatus = RESULT_SEND_STATUS.SUCCESS;
            }
        }
        return result;
    }

    /// APPROVAL EVENT
    static async processApprovalEvent(tx: eth_transaction, decodedAbi: DecodedAbiObject, result: AnalysisResult): Promise<AnalysisResult>{
        let action = "process approval event";

        if(typeof tx.toAddress !== "string") throw new Error("cannot "+action+", toAddress is not set");
        if(typeof tx.hash !== "string") throw new Error("cannot "+action+", hash is not set");
        if(tx.toAddress.toLowerCase() !== eth_config.getTokenContract().toLowerCase()){
            return result;
        }

        let methodAbi = await eth_abi_decoder.getApproveAbi(decodedAbi);
        if(methodAbi) {
            result.status = RESULT_STATUS.INVOLVED;
            result.fromContract = eth_config.getTokenContract();
            result.fromSymbol = eth_config.getTokenSymbol();
            result.fromDecimal = eth_config.getTokenDecimal();
            result.tag = "approval";

            let receipt = await this.getReceiptByTxnHash(tx.hash);
            if (receipt && receipt.status) {
                result.sendStatus = RESULT_SEND_STATUS.SUCCESS;
            }
        }
        return result;
    }

    /// TRANSFER EVENT
    static async processTransferEvent(tx: eth_transaction, decodedAbi: DecodedAbiObject, result: AnalysisResult): Promise<AnalysisResult>{
        let action = "process transfer event";

        tx.toAddress = assert.isString({val:tx.toAddress,prop_name:"tx.toAddress",strict:true});
        tx.hash = assert.isString({val:tx.hash,prop_name:"tx.hash",strict:true});

        if(tx.toAddress.toLowerCase() !== eth_config.getTokenContract().toLowerCase()) return result;

        let methodAbi = await eth_abi_decoder.getTransferAbi(decodedAbi);
        if(methodAbi){
            result.status = RESULT_STATUS.INVOLVED;
            result.fromContract = eth_config.getTokenContract();
            result.fromSymbol = eth_config.getTokenSymbol();
            result.fromDecimal = eth_config.getTokenDecimal();

            result.toContract = eth_config.getTokenContract();
            result.toSymbol = eth_config.getTokenSymbol();
            result.toDecimal = eth_config.getTokenDecimal();

            result.toAddress = methodAbi.recipient;
            result.tag = this.getTagTransferTokenToOther();

            /// GROSS FROM
            result.fromValue = methodAbi.amount.toString();
            result.fromAmount = this.convertValueToAmount(methodAbi.amount.toString(),eth_config.getTokenDecimal());
            result.fromAmountGross = this.convertValueToAmount(methodAbi.amount.toString(),eth_config.getTokenDecimal());
            result.toAmountGross = this.convertValueToAmount(methodAbi.amount.toString(),eth_config.getTokenDecimal());
            result.toValue = methodAbi.amount.toString();

            let receipt = await this.getReceiptByTxnHash(tx.hash);
            if(receipt && receipt.status){
                result.sendStatus = RESULT_SEND_STATUS.SUCCESS;
            }
            else{
                return result;
            }

            for(let x=0;x<receipt.logs.length;x++){
                let log = receipt.logs[x];
                let transferLog = await eth_log_decoder.getTransferLog(log);
                if(transferLog){
                    if(
                        transferLog.from.toLowerCase() === result.fromAddress.toLowerCase()
                        && transferLog.to.toLowerCase() === result.toAddress.toLowerCase()
                    ){
                        result = this.importResultToValuesFromLog(result, transferLog.ContractInfo, transferLog.value.toString());
                    }
                }
            }
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

        // CHECK IF TOKEN IS IN PATHS
        if(!eth_worker.checkIfInvolved({from:tx.fromAddress,to:tx.toAddress,abi:decodedAbi})) return result
        result.status = RESULT_STATUS.INVOLVED;

        // CHECK IF SEND SUCCESS
        const receipt = await this.getReceiptByTxnHash(tx.hash);
        if(!receipt || !receipt.status) return result;
        result.sendStatus = RESULT_SEND_STATUS.SUCCESS;

        // identify contract informations
        const fromContract = assert.isString({val: decodedAbi.argument_key_value["path"][0],prop_name:"fromContract path",strict:true});
        const fromContractInfo = await this.getContractMetaData(fromContract);
        const toContract = assert.isString({val: decodedAbi.argument_key_value["path"][decodedAbi.argument_key_value["path"].length-1],prop_name:"toContract",strict:true});
        const toContractInfo = await this.getContractMetaData(toContract);

        // set toAddress same with fromAddress because of swap
        result.toAddress = result.fromAddress;

        let fromProcessed = false;
        let grossProccessed = false;
        let toProcessed = false;

        // swapExactETHForTokens
        if(result.tag === ""){
            let swapExactETHForTokens = await eth_abi_decoder.getSwapExactETHForTokens(decodedAbi);
            if(swapExactETHForTokens){
                result.tag = this.getTagSwapEthToToken();

                /// SWAP LOGIC FOR EXACT ETH -> TOKEN
                for(let x=0; x < receipt.logs.length; x++){
                    let log = receipt.logs[x];

                    //// -> FROM INFORMATION
                    let depositLog = await eth_log_decoder.getDepositLog(log);
                    if(
                        depositLog
                        && depositLog.ContractInfo.address.toLowerCase() === fromContract.toLowerCase()
                    ){
                        result = this.importResultFromValuesFromLog(result, depositLog.ContractInfo, depositLog.amount.toString());
                        fromProcessed = true;
                    }

                    //// -> GROSS INFO
                    let swapLog = await eth_log_decoder.getSwapLog(log);
                    if(
                        swapLog
                        && swapLog.sender.toLowerCase() === eth_config.getDexContract().toLowerCase()
                        && swapLog.to.toLowerCase() === result.toAddress.toLowerCase()
                    ){
                        result.toAmountGross = swapLog.amount1Out.toString();
                        result.toAmountGross = this.convertValueToETH(result.toAmountGross);
                        grossProccessed = true;
                    }

                    //// -> TO INFO
                    let transferLog = await eth_log_decoder.getTransferLog(log);
                    if(
                        transferLog
                        && transferLog.ContractInfo.address.toLowerCase() === eth_config.getTokenContract().toLowerCase()
                        && transferLog.to.toLowerCase() === result.toAddress.toLowerCase()
                    ){
                        result = this.importResultToValuesFromLog(result, transferLog.ContractInfo, transferLog.value.toString());
                        toProcessed = true;
                    }
                }
            }
        }

        // swapETHForExactTokens
        if(result.tag === ""){
            let swapETHForExactTokens = await eth_abi_decoder.getSwapETHForExactTokens(decodedAbi);
            if(swapETHForExactTokens){
                result.tag = this.getTagSwapEthToToken();
                /// SWAP LOGIC FOR ETH -> TOKEN
                for(let x=0; x < receipt.logs.length; x++) {
                    let log = receipt.logs[x];

                    //// -> FROM INFO
                    let depositLog = await eth_log_decoder.getDepositLog(log);
                    if(
                        depositLog
                        && depositLog.ContractInfo.address.toLowerCase() === fromContract.toLowerCase()
                    ){
                        result = this.importResultFromValuesFromLog(result, depositLog.ContractInfo, depositLog.amount.toString());
                        fromProcessed = true;
                    }

                    //// -> GROSS INFO
                    let swapLog = await eth_log_decoder.getSwapLog(log);
                    if(swapLog){
                        result.toAmountGross = swapLog.amount1Out.toString();
                        result.toAmountGross = this.convertValueToAmount(result.toAmountGross, result.toDecimal);
                        grossProccessed = true;
                    }

                    //// -> TO INFO
                    let transferLog = await eth_log_decoder.getTransferLog(log);
                    if(
                        transferLog
                        && transferLog.ContractInfo.address.toLowerCase() === toContract.toLowerCase()
                        && transferLog.to.toLowerCase() === result.toAddress.toLowerCase()
                    ){
                        result = this.importResultToValuesFromLog(result, transferLog.ContractInfo, transferLog.value.toString());
                        toProcessed = true;
                    }

                }
            }
        }

        // swapExactTokensForTokens
        if(result.tag === ""){
            let swapExactTokensForTokens = await eth_abi_decoder.getSwapExactTokensForTokens(decodedAbi);
            if(swapExactTokensForTokens){
                if(fromContract.toLowerCase() === eth_config.getTokenContract().toLowerCase()){
                    result.tag = this.getTagSwapTokenToOtherToken();
                }
                if(toContract.toLowerCase() === eth_config.getTokenContract().toLowerCase()){
                    result.tag = this.getTagSwapOtherTokenToToken();
                }

                result.fromAmountGross = this.convertValueToAmount(swapExactTokensForTokens.amountIn.toString(),fromContractInfo.decimals);

                /// SWAP LOGIC FOR EXACT TOKENS -> TOKEN
                for(let x=0; x < receipt.logs.length; x++){
                    let log = receipt.logs[x];

                    //// -> FROM INFO
                    let transferLogFrom = await eth_log_decoder.getTransferLog(log);
                    if(
                        transferLogFrom
                        && transferLogFrom.ContractInfo.address.toLowerCase() === fromContract.toLowerCase()
                        && transferLogFrom.from.toLowerCase() === result.fromAddress.toLowerCase()
                    ){
                        result = this.importResultFromValuesFromLog(result, transferLogFrom.ContractInfo, transferLogFrom.value.toString());
                        fromProcessed = true;
                    }

                    //// -> GROSS INFO
                    let swapLog = await eth_log_decoder.getSwapLog(log);
                    if(
                        swapLog
                        && swapLog.to.toLowerCase() === result.fromAddress.toLowerCase()
                    ){
                        result.toAmountGross = swapLog.amount1Out.toString();
                        result.toAmountGross = this.convertValueToToken(result.toAmountGross);
                        grossProccessed = true;
                    }

                    //// -> TO INFO
                    let transferLogTo = await eth_log_decoder.getTransferLog(log);
                    if(
                        transferLogTo
                        && transferLogTo.ContractInfo.address.toLowerCase() === toContract.toLowerCase()
                    ){
                        result = this.importResultToValuesFromLog(result,transferLogTo.ContractInfo,transferLogTo.value.toString());
                        toProcessed = true;
                    }
                }
            }
        }

        // swapTokensForExactETH
        if(result.tag === ""){
            let swapTokensForExactETH = await eth_abi_decoder.getSwapTokensForExactETH(decodedAbi);
            if(swapTokensForExactETH){
                result.tag = this.getTagSwapTokenToEth();

                result.fromAmountGross = this.convertValueToAmount(swapTokensForExactETH.amountInMax.toString(),fromContractInfo.decimals);
                grossProccessed = true;

                for(let x=0; x < receipt.logs.length; x++) {
                    let log = receipt.logs[x];

                    //// -> FROM INFO
                    let transferLogFrom = await eth_log_decoder.getTransferLog(log);
                    if(
                        transferLogFrom
                        && transferLogFrom.ContractInfo.address.toLowerCase() === fromContract.toLowerCase()
                        && transferLogFrom.from.toLowerCase() === result.fromAddress.toLowerCase()
                    ){
                        result = this.importResultFromValuesFromLog(result, transferLogFrom.ContractInfo, transferLogFrom.value.toString());
                        fromProcessed = true;
                    }

                    //// -> TO INFO
                    let transferLogTo = await eth_log_decoder.getTransferLog(log);
                    if(
                        transferLogTo
                        && transferLogTo.ContractInfo.address.toLowerCase() === toContract.toLowerCase()
                    ){
                        result = this.importResultToValuesFromLog(result, transferLogTo.ContractInfo, transferLogTo.value.toString());
                        toProcessed = true;
                    }
                }
            }
        }

        // swapExactETHForTokensSupportingFeeOnTransferTokens
        if(result.tag === ""){
            let swapExactETHForTokensSupportingFeeOnTransferTokens = await eth_abi_decoder.getSwapExactETHForTokensSupportingFeeOnTransferTokens(decodedAbi);
            if(swapExactETHForTokensSupportingFeeOnTransferTokens){
                result.tag = this.getTagSwapEthToToken();

                for(let x=0; x < receipt.logs.length; x++) {
                    let log = receipt.logs[x];

                    //// -> FROM INFO
                    let depositLog = await eth_log_decoder.getDepositLog(log);
                    if(
                        depositLog
                        && depositLog.ContractInfo.address.toLowerCase() === fromContract.toLowerCase()
                    ){
                        result = this.importResultFromValuesFromLog(result, depositLog.ContractInfo, depositLog.amount.toString());
                        fromProcessed = true;
                    }

                    //// -> GROSS INFO
                    let swapLog = await eth_log_decoder.getSwapLog(log);
                    if(swapLog){
                        result.toAmountGross = swapLog.amount1Out.toString();
                        result.toAmountGross = this.convertValueToAmount(result.toAmountGross,result.toDecimal);
                        grossProccessed = true;
                    }

                    //// -> TO INFO
                    let transferLog = await eth_log_decoder.getTransferLog(log);
                    if(
                        transferLog
                        && transferLog.ContractInfo.address.toLowerCase() === toContract.toLowerCase()
                        && transferLog.to.toLowerCase() === result.toAddress.toLowerCase()
                    ){
                        result = this.importResultToValuesFromLog(result, transferLog.ContractInfo, transferLog.value.toString());
                        toProcessed = true;
                    }
                }
            }
        }

        // swapExactTokensForETHSupportingFeeOnTransferTokens
        if(result.tag === ""){
            let swapExactTokensForETHSupportingFeeOnTransferTokens = await eth_abi_decoder.getSwapExactTokensForETHSupportingFeeOnTransferTokens(decodedAbi);
            if(swapExactTokensForETHSupportingFeeOnTransferTokens){
                if(fromContract.toLowerCase() === eth_config.getTokenContract().toLowerCase()){
                    result.tag = this.getTagSwapTokenToOtherToken();
                }

                result.fromAmountGross = swapExactTokensForETHSupportingFeeOnTransferTokens.amountIn.toString();
                result.fromAmountGross = this.convertValueToAmount(result.fromAmountGross,fromContractInfo.decimals);
                grossProccessed = true;

                /// SWAP LOGIC FOR EXACT TOKENS -> TOKEN
                for(let x=0; x < receipt.logs.length; x++){
                    let log = receipt.logs[x];

                    //// -> FROM INFO
                    let transferLog = await eth_log_decoder.getTransferLog(log);
                    if(
                        transferLog
                        && transferLog.ContractInfo.address.toLowerCase() === fromContract.toLowerCase()
                        && transferLog.from.toLowerCase() === result.fromAddress.toLowerCase()
                    ){
                        result = this.importResultFromValuesFromLog(result, transferLog.ContractInfo, transferLog.value.toString());
                        fromProcessed = true;
                    }

                    //// -> TO INFO
                    let withdrawalLog = await eth_log_decoder.getWithdrawalLog(log);
                    if(
                        withdrawalLog
                        && withdrawalLog.ContractInfo.address.toLowerCase() === toContract.toLowerCase()
                    ){
                        result = this.importResultToValuesFromLog(result, withdrawalLog.ContractInfo, withdrawalLog.wad.toString());
                        toProcessed = true;
                    }
                }
            }
        }

        // swapExactTokensForTokensSupportingFeeOnTransferTokens
        if(result.tag === ""){
            let swapExactTokensForTokensSupportingFeeOnTransferTokens = await eth_abi_decoder.getSwapExactTokensForTokensSupportingFeeOnTransferTokens(decodedAbi);
            if(swapExactTokensForTokensSupportingFeeOnTransferTokens){
                if(fromContract.toLowerCase() === eth_config.getTokenContract().toLowerCase()){
                    result.tag = this.getTagSwapTokenToOtherToken();
                }
                if(toContract.toLowerCase() === eth_config.getTokenContract().toLowerCase()){
                    result.tag = this.getTagSwapOtherTokenToToken();
                }

                for(let x=0; x < receipt.logs.length; x++) {
                    let log = receipt.logs[x];

                    //// -> FROM INFO
                    let transferLogFrom = await eth_log_decoder.getTransferLog(log);
                    if(
                        transferLogFrom
                        && transferLogFrom.ContractInfo.address.toLowerCase() === fromContract.toLowerCase()
                        && transferLogFrom.from.toLowerCase() === result.fromAddress.toLowerCase()
                    ){
                        result = this.importResultFromValuesFromLog(result, transferLogFrom.ContractInfo, transferLogFrom.value.toString());
                        fromProcessed = true;
                    }

                    //// -> GROSS INFO
                    let swapLog = await eth_log_decoder.getSwapLog(log);
                    if(
                        swapLog
                        && swapLog.to.toLowerCase() === result.toAddress.toLowerCase()
                    ){
                        result.toAmountGross = swapLog.amount1Out.toString();
                        result.toAmountGross = this.convertValueToAmount(result.toAmountGross,result.toDecimal);
                        grossProccessed = true;
                    }

                    //// -> TO INFO
                    let transferLogTo = await eth_log_decoder.getTransferLog(log);
                    if(
                        transferLogTo
                        && transferLogTo.ContractInfo.address.toLowerCase() === toContract.toLowerCase()
                        && transferLogTo.to.toLowerCase() === result.toAddress.toLowerCase()
                    ){
                        result = this.importResultToValuesFromLog(result, transferLogTo.ContractInfo, transferLogTo.value.toString());
                        toProcessed = true;
                    }
                }
            }
        }

        if(result.tag !== "" && (!fromProcessed || !grossProccessed || !toProcessed)){
            console.error(result);
            console.error(decodedAbi);
            console.log(`${fromProcessed ? "from processed" : "from not processed"}`);
            console.log(`${grossProccessed ? "gross processed" : "gross not processed"}`);
            console.log(`${toProcessed ? "to processed" : "to not processed"}`);
            throw new Error(`hash: ${result.hash} something wrong with processing method:${result.method}`);
        }

        return result;
    }
    static async processTransitSwap(tx: eth_transaction, decodedAbi: DecodedAbiObject, result: AnalysisResult): Promise<AnalysisResult>{
        let action = "process transit swap";
        if(tools.isEmpty(tx.hash)) throw new Error("cannot "+action+", hash not set");
        let swap = await eth_abi_decoder.getSwap(decodedAbi);

        if(swap){
            let fromProcessed = false;
            let grossProcessed = false;
            let toProcessed = false;

            let fromContract = swap.srcToken;
            let toContract = swap.dstToken;

            if(fromContract === "0x0000000000000000000000000000000000000000"){
                fromContract = swap.wrappedNative;
            }
            if(toContract === "0x0000000000000000000000000000000000000000"){
                toContract = swap.wrappedNative;
            }

            if( fromContract.toLowerCase() !== eth_config.getTokenContract().toLowerCase()
                && toContract.toLowerCase() !== eth_config.getTokenContract().toLowerCase()
            ){
                return result;
            }

            let fromContractInfo = await this.getContractMetaData(fromContract);
            let toContractInfo = await this.getContractMetaData(toContract);

            if(fromContract.toLowerCase() === eth_config.getTokenContract().toLowerCase()){
                result.tag = this.getTagSwapTokenToOtherToken();
            }
            else{
                result.tag = this.getTagSwapOtherTokenToToken();
            }

            result.status = RESULT_STATUS.INVOLVED;
            result.toAddress = result.fromAddress;
            result.method = decodedAbi.abi.name;

            let receipt = await this.getReceiptByTxnHash(tx.hash);
            if(receipt && receipt.status){
                result.sendStatus = RESULT_SEND_STATUS.SUCCESS;
            }
            else{
                result.sendStatus = RESULT_SEND_STATUS.FAILED;
                return result;
            }

            //// -> GROSS INFO
            result.fromAmountGross = this.convertValueToAmount(swap.amount.toString(),fromContractInfo.decimals);
            grossProcessed = true;

            for(let x=0; x < receipt.logs.length; x++) {
                let log = receipt.logs[x];

                //// -> FROM INFO
                let transferLog = await eth_log_decoder.getTransferLog(log);
                if(
                    transferLog
                    && transferLog.from.toLowerCase() === result.fromAddress.toLowerCase()
                ){
                    result = await this.importResultValues("from",result, fromContractInfo, transferLog.value.toString());
                    fromProcessed = true;
                }

                //// -> FROM INFO ALTERNATIVE
                let depositLog = await eth_log_decoder.getDepositLog(log);
                if(
                    depositLog
                    && depositLog.ContractInfo.address.toLowerCase() === fromContract.toLowerCase()
                ){
                    result = await this.importResultValues("from",result,fromContractInfo,depositLog.amount.toString());
                    fromProcessed = true;
                }

                //// -> GROSS ALTERNATIVE
                let swap = await eth_log_decoder.getSwapLog(log);
                if(
                    swap
                    && swap.to.toLowerCase() === result.toAddress.toLowerCase()
                ){
                    result.toAmountGross = this.convertValueToAmount(swap.amount1Out.toString(),toContractInfo.decimals);
                    grossProcessed = true;
                }

                //// -> TO INFO
                let withdrawalLog = await eth_log_decoder.getWithdrawalLog(log);
                if(
                    withdrawalLog
                    && withdrawalLog.ContractInfo.address.toLowerCase() === toContractInfo.address.toLowerCase()
                ){
                    result = await this.importResultValues("to",result,toContractInfo, withdrawalLog.wad.toString());
                    toProcessed = true;
                }

                //// -> TO INFO ALTERNATIVE
                let transferLogTo = await eth_log_decoder.getTransferLog(log);
                if(
                    transferLogTo
                    && transferLogTo.to.toLowerCase() === result.toAddress.toLowerCase()
                ){
                    result = await this.importResultValues("to",result,toContractInfo, transferLogTo.value.toString());
                    toProcessed = true;
                }
            }
            if( result.status === RESULT_STATUS.INVOLVED && result.sendStatus === "success"
                && (!fromProcessed || !grossProcessed || !toProcessed)
            ){
                throw new Error(`transaction is involved but not processed properly. hash:${result.hash}`);
            }
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
            let analyzeLogsResult = await this.analyzeLogs(result.hash);
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
            let analyzeLogsResult = await this.analyzeLogs(result.hash);
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
            }
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
                    let analyzeLogsResult = await this.analyzeLogs(result.hash);
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
                    let analyzeLogsResult = await this.analyzeLogs(result.hash);
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

    static async analyzeLogs(_tx_hash: string): Promise<AnalyzeLogsResult>{
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
            currentBlock = await this.getLatestBlock();
            height = currentBlock - _txn.blockNumber;
            console.log("current block:%s transaction block:%s height:%s", currentBlock, _txn.blockNumber, height);
            if (currentCheckCount >= confirmationCheckLimit) {
                throw new Error("unable to confirm transaction");
            }
        } while (height < eth_config.getConfirmationNeeded());
        return true;
    }

}