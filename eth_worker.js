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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_worker = void 0;
const eth_types_1 = require("./eth_types");
const eth_abi_decoder_1 = require("./eth_abi_decoder");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const eth_config_1 = require("./eth_config");
const eth_tools_1 = require("./eth_tools");
const eth_log_decoder_1 = require("./eth_log_decoder");
const eth_transaction_1 = require("./build/eth_transaction");
const eth_contract_data_1 = require("./build/eth_contract_data");
const eth_log_sig_1 = require("./build/eth_log_sig");
const tools_1 = require("./tools");
const assert_1 = require("./assert");
const assert_eth_1 = require("./assert_eth");
const promises_1 = __importDefault(require("fs/promises"));
const eth_block_1 = require("./build/eth_block");
const Web3 = require("web3");
const Web3Provider = new Web3.providers.HttpProvider(eth_config_1.eth_config.getRPCUrl());
const Web3Client = new Web3(Web3Provider);
class eth_worker {
    //region EVENT TAGS
    static getTagSwapEthToToken() {
        return "swap_" + eth_config_1.eth_config.getEthSymbol() + "_to_" + eth_config_1.eth_config.getTokenSymbol();
    }
    static getTagSwapTokenToEth() {
        return "swap_" + eth_config_1.eth_config.getTokenSymbol() + "_to_" + eth_config_1.eth_config.getEthSymbol();
    }
    static getTagSwapTokenToOtherToken() {
        return "swap_" + eth_config_1.eth_config.getTokenSymbol() + "_to_OTHER_TOKEN";
    }
    static getTagSwapOtherTokenToToken() {
        return "swap_OTHER_TOKEN_to_" + eth_config_1.eth_config.getTokenSymbol();
    }
    static getTagTransferTokenToOther() {
        return "transfer_" + eth_config_1.eth_config.getTokenSymbol();
    }
    static getTagContractCreated() {
        return "contract_created_for_" + eth_config_1.eth_config.getTokenSymbol();
    }
    static getTagAddLiquidityToToken() {
        return "add_liquidity_to_" + eth_config_1.eth_config.getTokenSymbol();
    }
    static getTagOtherContractEvents() {
        return "other_event_" + eth_config_1.eth_config.getTokenSymbol();
    }
    //endregion
    //region ASSERTS
    static isValidAddress(_address) {
        return Web3.utils.isAddress(_address);
    }
    //endregion
    //region UTILITIES
    static convertValueToAmount(_value, _decimals) {
        bignumber_js_1.default.config({ DECIMAL_PLACES: Number(_decimals) });
        bignumber_js_1.default.config({ EXPONENTIAL_AT: 1e+9 });
        let toReturn = new bignumber_js_1.default(Number(_value));
        if (_decimals > 0) {
            let valueBN = new bignumber_js_1.default(_value);
            let tenBN = new bignumber_js_1.default(10);
            let decimalsBN = new bignumber_js_1.default(_decimals);
            let powBN = tenBN.pow(decimalsBN);
            let amountBN = valueBN.dividedBy(powBN);
            return amountBN.toString();
        }
        return toReturn.toString();
    }
    static convertAmountToValue(_amount, _decimals) {
        bignumber_js_1.default.config({ DECIMAL_PLACES: Number(_decimals) });
        bignumber_js_1.default.config({ EXPONENTIAL_AT: 1e+9 });
        let toReturn = new bignumber_js_1.default(Number(_amount));
        if (_decimals > 0) {
            let decimals = new bignumber_js_1.default(_decimals);
            let amount = new bignumber_js_1.default(_amount);
            let ten = new bignumber_js_1.default(10);
            let pow = ten.pow(decimals);
            toReturn = amount.multipliedBy(pow);
        }
        return toReturn.toString();
    }
    static convertValueToETH(_value) {
        return this.convertValueToAmount(_value, eth_config_1.eth_config.getEthDecimal());
    }
    static convertEthToValue(_amount) {
        return this.convertAmountToValue(_amount, eth_config_1.eth_config.getEthDecimal());
    }
    static convertValueToToken(_value) {
        return this.convertValueToAmount(_value, eth_config_1.eth_config.getTokenDecimal());
    }
    static convertTokenToValue(_token_amount) {
        return this.convertAmountToValue(_token_amount, eth_config_1.eth_config.getTokenDecimal());
    }
    static checkIfInvolved({ from = "", to = null, abi = false }) {
        if (from.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase())
            return true;
        if (typeof to === "string" && to.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase())
            return true;
        if (abi) {
            for (let prop in abi.argument_key_value) {
                let value = abi.argument_key_value[prop];
                if (typeof value === "string" && value.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase())
                    return true;
                if (Array.isArray(value)) {
                    for (let array_index in value) {
                        let array_value = value[array_index];
                        if (array_value.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase())
                            return true;
                    }
                }
            }
        }
        return false;
    }
    static importTransactionsFromFile(file_path, assert_involved = false) {
        var e_1, _a;
        return __awaiter(this, void 0, void 0, function* () {
            assert_1.assert.inTransaction();
            assert_1.assert.fileExists(file_path);
            const file = yield promises_1.default.open(file_path, 'r');
            try {
                for (var _b = __asyncValues(file.readLines()), _c; _c = yield _b.next(), !_c.done;) {
                    const line = _c.value;
                    const txnHash = assert_1.assert.isString({ val: line, prop_name: "imported hash data" });
                    assert_eth_1.assert_eth.isLikelyTransactionHash(txnHash);
                    if (assert_involved) {
                        const txn = yield eth_worker.getTxnByHash(txnHash);
                        let newTransaction = new eth_transaction_1.eth_transaction();
                        newTransaction.loadValues(txn, true);
                        newTransaction.fromAddress = txn.from;
                        newTransaction.toAddress = txn.to;
                        const result = yield eth_worker.analyzeTransaction3(newTransaction);
                        if (result.status === eth_types_1.RESULT_STATUS.NOT_INVOLVED) {
                            console.error(txn);
                            console.error(result);
                            throw new Error(`${txnHash} is not involved`);
                        }
                        console.log(`involved:${txnHash}|method:${result.method}`);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (assert_involved) {
                console.log(`all transactions checked and are involved with ${eth_config_1.eth_config.getTokenSymbol()}`);
            }
        });
    }
    static addLogSignature(signature, params, params_names) {
        return __awaiter(this, void 0, void 0, function* () {
            let logSig = new eth_log_sig_1.eth_log_sig();
            logSig.signature = signature;
            yield logSig.fetch();
            if (logSig.isNew()) {
                logSig.params = params;
                logSig.params_names = params_names;
                yield logSig.save();
            }
        });
    }
    //endregion END OF UTILITIES
    //region GETTERS
    static getLatestBlock() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Web3Client.eth.getBlockNumber();
        });
    }
    static getBlockByNumber(blockNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Web3Client.eth.getBlock(blockNumber);
        });
    }
    static getTxnByBlockNumber(_block_num) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Web3Client.eth.getBlock(_block_num, true);
        });
    }
    static getTxnByHash(_txn_hash) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Web3Client.eth.getTransaction(_txn_hash);
        });
    }
    static getReceiptByTxnHash(_txn_hash) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let receipt;
                let waitLimit = 40;
                let waitCount = 0;
                receipt = yield Web3Client.eth.getTransactionReceipt(_txn_hash);
                while (typeof receipt === "undefined" || receipt == null) {
                    if (waitCount >= waitLimit)
                        break;
                    waitCount++;
                    console.log("txn not yet mined, waiting...");
                    yield new Promise((resolve) => {
                        setTimeout(resolve, 500);
                    });
                    receipt = yield Web3Client.eth.getTransactionReceipt(_txn_hash);
                }
                return receipt;
            }
            catch (e) {
                console.log("Error getting receipt from txn:%s", _txn_hash);
                console.log(e);
                return false;
            }
        });
    }
    static estimateGasContract(_from, _to, _amount, _contract_address) {
        return __awaiter(this, void 0, void 0, function* () {
            let transfer_contract = yield new Web3Client.eth.Contract(eth_config_1.eth_config.getTransferAbi(), _contract_address);
            //@ts-ignore
            return yield transfer_contract.methods.transfer(_to, Web3.utils.toWei((_amount + ""))).estimateGas({ from: _from });
        });
    }
    static getGasPrice() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Web3Client.eth.getGasPrice();
        });
    }
    static getTokenTransferData(_from, _to, _amount) {
        console.log("creating contract web3 obj...");
        let contract = new Web3Client.eth.Contract(eth_config_1.eth_config.getTokenAbi(), eth_config_1.eth_config.getTokenContract(), { from: _from });
        console.log("converting token to value...");
        let value = this.convertTokenToValue(_amount);
        console.log("encoding transfer method ABI to:%s value:%s...", _to, value);
        //@ts-ignore
        return contract.methods.transfer(_to, value).encodeABI();
    }
    static getEstimateGasPriceToken(_from, _to, _amount) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("estimating gas from:%s to:%s amount:%s, retrieving transfer data ABI...", _from, _to, _amount);
            let _data = this.getTokenTransferData(_from, _to, _amount);
            console.log("data ABI generated, estimating gas...");
            let estimateGas = yield Web3Client.eth.estimateGas({
                value: "0x0" // only tokens
                ,
                data: _data,
                to: Web3.utils.toHex(_to),
                from: Web3.utils.toHex(_from)
            });
            console.log("...gas estimated, retrieving gas price");
            let _gas = yield Web3Client.eth.getGasPrice();
            console.log("...gas price retreived");
            let gasLimit = Math.floor(estimateGas * eth_config_1.eth_config.getGasMultiplier());
            return {
                gasPrice: _gas,
                estimateGas: estimateGas,
                gasLimit: gasLimit
            };
        });
    }
    static getContractMetaData(_contract_address) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            let contractInfo = {};
            contractInfo.address = _contract_address;
            contractInfo.name = "";
            contractInfo.symbol = "";
            contractInfo.decimals = 0;
            let contract_data = new eth_contract_data_1.eth_contract_data();
            contract_data.contract = _contract_address;
            yield contract_data.fetch();
            if (contract_data._isNew) {
                contract_data.name = "";
                contract_data.symbol = "";
                contract_data.decimals = 0;
                let contract = new Web3Client.eth.Contract(eth_config_1.eth_config.getTokenAbi(), _contract_address);
                try {
                    contract_data.name = yield contract.methods.name().call();
                }
                catch (e) {
                    // console.log("ERROR on %s: %s",_contract_address, e);
                }
                try {
                    contract_data.symbol = yield contract.methods.symbol().call();
                }
                catch (e) {
                    // console.log("ERROR on %s: %s",_contract_address, e);
                }
                try {
                    contract_data.decimals = yield contract.methods.decimals().call();
                }
                catch (e) {
                    // console.log("ERROR on %s: %s",_contract_address, e);
                }
                yield contract_data.save();
            }
            contractInfo.name = (_a = contract_data.name) !== null && _a !== void 0 ? _a : "";
            contractInfo.symbol = (_b = contract_data.symbol) !== null && _b !== void 0 ? _b : "";
            contractInfo.decimals = (_c = contract_data.decimals) !== null && _c !== void 0 ? _c : 0;
            return contractInfo;
        });
    }
    static getTokenBalance(_address) {
        return __awaiter(this, void 0, void 0, function* () {
            let contract = new Web3Client.eth.Contract(eth_config_1.eth_config.getBalanceAbi(), eth_config_1.eth_config.getTokenContract());
            let result = 0;
            try {
                result = yield contract.methods.balanceOf(_address).call();
            }
            catch (e) {
                if (e instanceof Error) {
                    console.log("unable to retrieve token balance of %s :$s", _address, e.message);
                }
                return "invalid";
            }
            return this.convertValueToToken(result);
        });
    }
    static getETHBalance(_address) {
        return __awaiter(this, void 0, void 0, function* () {
            let value = "0";
            try {
                value = yield Web3Client.eth.getBalance(_address);
            }
            catch (e) {
                if (e instanceof Error) {
                    console.log("unable to retrieve eth balance of:%s %s", _address, e.message);
                }
                return "invalid";
            }
            return this.convertValueToETH(value);
        });
    }
    static getHotWalletNonce() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Web3Client.eth.getTransactionCount(eth_config_1.eth_config.getHotWalletAddress());
        });
    }
    //endregion
    //region ANALYZE TOOL
    static analyzeTransaction2(_txn_hash) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            let tx = new eth_transaction_1.eth_transaction();
            if (_txn_hash instanceof eth_transaction_1.eth_transaction) {
                tx = _txn_hash;
            }
            else {
                tx.hash = _txn_hash;
                yield tx.fetch();
            }
            if (tools_1.tools.isEmpty(tx.hash))
                throw new Error("hash must not be empty");
            if (tools_1.tools.isEmpty(tx.blockNumber))
                throw new Error("blockNumber must not be empty");
            let result = eth_tools_1.eth_tools.getDefaultResult();
            result.hash = tx.hash;
            result.blockNumber = tx.blockNumber;
            // ADD TRANSACTION IF NOT EXIST
            if (tx._isNew) {
                let txLookup = yield Web3Client.eth.getTransaction(tx.hash);
                if (typeof txLookup === "undefined") {
                    throw new Error("transaction record not found with hash:" + _txn_hash);
                }
                console.log(txLookup);
                tx.hash = txLookup.hash;
                tx.blockHash = txLookup.blockHash;
                tx.blockNumber = txLookup.blockNumber;
                tx.fromAddress = txLookup.from;
                tx.gas = txLookup.gas + "";
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
                yield tx.save();
            }
            result.fromAddress = (_a = tx.fromAddress) !== null && _a !== void 0 ? _a : "";
            result.toAddress = (_b = tx.toAddress) !== null && _b !== void 0 ? _b : "";
            result = yield this.processContractCreationEvent(tx, result);
            if (typeof tx.toAddress === "undefined" || tx.toAddress === null || tx.toAddress === "")
                return result;
            let decodedAbi = eth_abi_decoder_1.eth_abi_decoder.decodeAbiObject(tx.input);
            if (!decodedAbi)
                return result;
            result.method = decodedAbi.abi.name;
            if (eth_worker.checkIfInvolved({ from: result.fromAddress, to: result.toAddress, abi: decodedAbi })) {
                result = yield this.processAddLiquidity(result, decodedAbi);
                result = yield this.processApprovalEvent(tx, decodedAbi, result);
                result = yield this.processTransferEvent(tx, decodedAbi, result);
                result = yield this.processSwapEvents(tx, decodedAbi, result);
                result = yield this.processTransitSwap(tx, decodedAbi, result);
                result = yield this.processOtherEventsOfContract(result, decodedAbi);
            }
            /// BNB SYMBOL FIX
            result.fromSymbol = result.fromSymbol.replace("WBNB", "BNB");
            result.toSymbol = result.toSymbol.replace("WBNB", "BNB");
            result = this.processResultType(result);
            result = this.processTaxesFees(result);
            result = yield this.processResultChecks(result, decodedAbi);
            result = yield this.processResultBlockTime(result);
            return result;
        });
    }
    static analyzeTransaction3(txn) {
        return __awaiter(this, void 0, void 0, function* () {
            // establish eth_transaction
            let transaction = new eth_transaction_1.eth_transaction();
            if (typeof txn === "string") {
                transaction.hash = txn;
                yield transaction.fetch();
                // update eth_transaction information
                if (transaction.isNew()) {
                    let web3Transaction = yield eth_worker.getTxnByHash(txn);
                    transaction.loadValues(web3Transaction, true);
                    transaction.toAddress = web3Transaction.to;
                    transaction.fromAddress = web3Transaction.from;
                    yield transaction.save();
                    // update eth_block information
                    let block = new eth_block_1.eth_block();
                    block.blockNumber = assert_1.assert.isNumber(transaction.blockNumber, "transaction.blockNumber", 0);
                    yield block.fetch();
                    if (block.isNew()) {
                        const web3Block = yield eth_worker.getBlockByNumber(block.blockNumber);
                        block.blockNumber = web3Block.number;
                        block.blockHash = web3Block.hash;
                        block.time_added = tools_1.tools.getCurrentTimeStamp();
                        yield block.save();
                    }
                }
            }
            else {
                transaction = txn;
            }
            // double check required values
            transaction.fromAddress = assert_1.assert.isString({ val: transaction.fromAddress, prop_name: "transaction.fromAddress", strict: true });
            transaction.toAddress = assert_1.assert.isString({ val: transaction.toAddress, prop_name: "transaction.toAddress", strict: true });
            transaction.blockNumber = assert_1.assert.isNumber(transaction.blockNumber, "transaction.blockNumber", 0);
            // initiate analysis result object
            let result = eth_types_1.eth_types.getDefaultAnalysisResult(transaction);
            // decode abi
            const decoded_abi = eth_abi_decoder_1.eth_abi_decoder.decodeAbiObject(transaction.input);
            if (!decoded_abi) {
                result.abiDecodeStatus = "failed";
                return result;
            }
            result.abiDecodeStatus = "success";
            result.method = decoded_abi.abi.name;
            // check if involved
            if (!eth_worker.checkIfInvolved({ from: transaction.fromAddress, to: transaction.toAddress, abi: decoded_abi })) {
                result.status = eth_types_1.RESULT_STATUS.NOT_INVOLVED;
                return result;
            }
            result.status = eth_types_1.RESULT_STATUS.INVOLVED;
            // if involved, identify method
            if (result.sendStatus === eth_types_1.RESULT_SEND_STATUS.NOT_CHECKED)
                result = yield eth_worker.processContractCreationEvent(transaction, result);
            if (result.sendStatus === eth_types_1.RESULT_SEND_STATUS.NOT_CHECKED)
                result = yield eth_worker.processAddLiquidity(result, decoded_abi);
            if (result.sendStatus === eth_types_1.RESULT_SEND_STATUS.NOT_CHECKED)
                result = yield eth_worker.processApprovalEvent(transaction, decoded_abi, result);
            if (result.sendStatus === eth_types_1.RESULT_SEND_STATUS.NOT_CHECKED)
                result = yield eth_worker.processTransferEvent(transaction, decoded_abi, result);
            if (result.sendStatus === eth_types_1.RESULT_SEND_STATUS.NOT_CHECKED)
                result = yield eth_worker.processSwapEvents(transaction, decoded_abi, result);
            if (result.sendStatus === eth_types_1.RESULT_SEND_STATUS.NOT_CHECKED)
                result = yield eth_worker.processTransitSwap(transaction, decoded_abi, result);
            if (result.sendStatus === eth_types_1.RESULT_SEND_STATUS.NOT_CHECKED)
                result = yield eth_worker.processOtherEventsOfContract(result, decoded_abi);
            result = eth_worker.processResultType(result);
            result = eth_worker.processTaxesFees(result);
            result = yield eth_worker.processResultChecks(result, decoded_abi);
            result = yield eth_worker.processResultBlockTime(result);
            return result;
        });
    }
    static importResultValues(type, result, contract, value) {
        return __awaiter(this, void 0, void 0, function* () {
            let convertedValueFromAmount = this.convertValueToAmount(value, contract.decimals);
            if (type === "from") {
                result.fromContract = contract.address;
                result.fromDecimal = contract.decimals;
                result.fromSymbol = contract.symbol;
                result.fromValue = value;
                result.fromAmount = convertedValueFromAmount;
            }
            else {
                result.toContract = contract.address;
                result.toDecimal = contract.decimals;
                result.toSymbol = contract.symbol;
                result.toValue = value;
                result.toAmount = convertedValueFromAmount;
            }
            return result;
        });
    }
    /// CREATION EVENT
    static processContractCreationEvent(tx, result) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const action = "process contract creation event";
            tx.hash = assert_1.assert.isString({ val: tx.hash, prop_name: `${action}:tx.hash`, strict: true });
            if (tx.hash.toLowerCase() === eth_config_1.eth_config.getTokenGenesisHash().toLowerCase()) {
                result.status = eth_types_1.RESULT_STATUS.INVOLVED;
                const r = yield this.getReceiptByTxnHash(tx.hash);
                if (!r)
                    throw new Error("cannot " + action + ", unable to retrieve receipt");
                let lastLog = r.logs[r.logs.length - 1];
                let value = Web3Client.utils.hexToNumberString(lastLog.data);
                let tokenAmount = this.convertValueToToken(value);
                result.type = "transfer";
                result.tag = this.getTagContractCreated();
                result.method = "createContract";
                result.fromSymbol = eth_config_1.eth_config.getEthSymbol();
                result.fromDecimal = eth_config_1.eth_config.getEthDecimal();
                result.fromValue = (_a = tx.value) !== null && _a !== void 0 ? _a : "";
                result.fromAmount = this.convertValueToETH((_b = tx.value) !== null && _b !== void 0 ? _b : "");
                result.toAddress = result.fromAddress;
                result.toSymbol = eth_config_1.eth_config.getTokenSymbol();
                result.toDecimal = eth_config_1.eth_config.getTokenDecimal();
                result.toValue = value;
                result.toAmount = tokenAmount;
                result.sendStatus = eth_types_1.RESULT_SEND_STATUS.SUCCESS;
                return result;
            }
            return result;
        });
    }
    /// ADD LIQUIDITY
    static processAddLiquidity(result, decodedAbi) {
        return __awaiter(this, void 0, void 0, function* () {
            let action = "process add liquidity";
            let methodAbi = eth_abi_decoder_1.eth_abi_decoder.getAddLiquidityETH(decodedAbi);
            if (methodAbi) {
                result.status = eth_types_1.RESULT_STATUS.INVOLVED;
                result.tag = this.getTagAddLiquidityToToken();
                result.fromAmountGross = this.convertValueToToken(methodAbi.amountTokenDesired.toString());
                result.fromValue = methodAbi.amountTokenMin.toString();
                result.fromAmount = this.convertValueToToken(result.fromValue);
                result.fromContract = eth_config_1.eth_config.getTokenContract();
                result.fromSymbol = eth_config_1.eth_config.getTokenSymbol();
                result.fromDecimal = eth_config_1.eth_config.getTokenDecimal();
                result.toAmountGross = this.convertValueToETH(methodAbi.amountETHMin.toString());
                result.toValue = methodAbi.amountETHMin.toString();
                result.toAmount = result.toAmountGross;
                result.toContract = eth_config_1.eth_config.getEthContract();
                result.toDecimal = eth_config_1.eth_config.getEthDecimal();
                result.toSymbol = eth_config_1.eth_config.getEthSymbol();
                let analyzeLogsResult = yield this.analyzeLogs(result.hash);
                if (analyzeLogsResult.receipt.status) {
                    result.sendStatus = eth_types_1.RESULT_SEND_STATUS.SUCCESS;
                }
            }
            return result;
        });
    }
    /// APPROVAL EVENT
    static processApprovalEvent(tx, decodedAbi, result) {
        return __awaiter(this, void 0, void 0, function* () {
            let action = "process approval event";
            if (typeof tx.toAddress !== "string")
                throw new Error("cannot " + action + ", toAddress is not set");
            if (typeof tx.hash !== "string")
                throw new Error("cannot " + action + ", hash is not set");
            if (tx.toAddress.toLowerCase() !== eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                return result;
            }
            let methodAbi = yield eth_abi_decoder_1.eth_abi_decoder.getApproveAbi(decodedAbi);
            if (methodAbi) {
                result.status = eth_types_1.RESULT_STATUS.INVOLVED;
                result.fromContract = eth_config_1.eth_config.getTokenContract();
                result.fromSymbol = eth_config_1.eth_config.getTokenSymbol();
                result.fromDecimal = eth_config_1.eth_config.getTokenDecimal();
                result.tag = "approval";
                let receipt = yield this.getReceiptByTxnHash(tx.hash);
                if (receipt && receipt.status) {
                    result.sendStatus = eth_types_1.RESULT_SEND_STATUS.SUCCESS;
                }
            }
            return result;
        });
    }
    /// TRANSFER EVENT
    static processTransferEvent(tx, decodedAbi, result) {
        return __awaiter(this, void 0, void 0, function* () {
            let action = "process transfer event";
            tx.toAddress = assert_1.assert.isString({ val: tx.toAddress, prop_name: "tx.toAddress", strict: true });
            tx.hash = assert_1.assert.isString({ val: tx.hash, prop_name: "tx.hash", strict: true });
            if (tx.toAddress.toLowerCase() !== eth_config_1.eth_config.getTokenContract().toLowerCase())
                return result;
            let methodAbi = yield eth_abi_decoder_1.eth_abi_decoder.getTransferAbi(decodedAbi);
            if (methodAbi) {
                result.status = eth_types_1.RESULT_STATUS.INVOLVED;
                result.fromContract = eth_config_1.eth_config.getTokenContract();
                result.fromSymbol = eth_config_1.eth_config.getTokenSymbol();
                result.fromDecimal = eth_config_1.eth_config.getTokenDecimal();
                result.toContract = eth_config_1.eth_config.getTokenContract();
                result.toSymbol = eth_config_1.eth_config.getTokenSymbol();
                result.toDecimal = eth_config_1.eth_config.getTokenDecimal();
                result.toAddress = methodAbi.recipient;
                result.tag = this.getTagTransferTokenToOther();
                /// GROSS FROM
                result.fromValue = methodAbi.amount.toString();
                result.fromAmount = this.convertValueToAmount(methodAbi.amount.toString(), eth_config_1.eth_config.getTokenDecimal());
                result.fromAmountGross = this.convertValueToAmount(methodAbi.amount.toString(), eth_config_1.eth_config.getTokenDecimal());
                result.toAmountGross = this.convertValueToAmount(methodAbi.amount.toString(), eth_config_1.eth_config.getTokenDecimal());
                result.toValue = methodAbi.amount.toString();
                let receipt = yield this.getReceiptByTxnHash(tx.hash);
                if (receipt && receipt.status) {
                    result.sendStatus = eth_types_1.RESULT_SEND_STATUS.SUCCESS;
                }
                else {
                    return result;
                }
                for (let x = 0; x < receipt.logs.length; x++) {
                    let log = receipt.logs[x];
                    let transferLog = yield eth_log_decoder_1.eth_log_decoder.getTransferLog(log);
                    if (transferLog) {
                        if (transferLog.from.toLowerCase() === result.fromAddress.toLowerCase()
                            && transferLog.to.toLowerCase() === result.toAddress.toLowerCase()) {
                            result = this.importResultToValuesFromLog(result, transferLog.ContractInfo, transferLog.value.toString());
                        }
                    }
                }
            }
            return result;
        });
    }
    /// SWAP EVENTS
    static processSwapEvents(tx, decodedAbi, result) {
        return __awaiter(this, void 0, void 0, function* () {
            let action = "process swap events";
            tx.toAddress = assert_1.assert.isString({ val: tx.toAddress, prop_name: "tx.toAddress", strict: true });
            tx.fromAddress = assert_1.assert.isString({ val: tx.fromAddress, prop_name: "tx.fromAddress", strict: true });
            tx.hash = assert_1.assert.isString({ val: tx.hash, prop_name: "tx.hash", strict: true });
            // CHECK IF DEX
            if (tx.toAddress.toLowerCase() !== eth_config_1.eth_config.getDexContract().toLowerCase())
                return result;
            // CHECK IF TOKEN IS IN PATHS
            if (!eth_worker.checkIfInvolved({ from: tx.fromAddress, to: tx.toAddress, abi: decodedAbi }))
                return result;
            result.status = eth_types_1.RESULT_STATUS.INVOLVED;
            // CHECK IF SEND SUCCESS
            const receipt = yield this.getReceiptByTxnHash(tx.hash);
            if (!receipt || !receipt.status)
                return result;
            result.sendStatus = eth_types_1.RESULT_SEND_STATUS.SUCCESS;
            // identify contract informations
            const fromContract = assert_1.assert.isString({ val: decodedAbi.argument_key_value["path"][0], prop_name: "fromContract path", strict: true });
            const fromContractInfo = yield this.getContractMetaData(fromContract);
            const toContract = assert_1.assert.isString({ val: decodedAbi.argument_key_value["path"][decodedAbi.argument_key_value["path"].length - 1], prop_name: "toContract", strict: true });
            const toContractInfo = yield this.getContractMetaData(toContract);
            // set toAddress same with fromAddress because of swap
            result.toAddress = result.fromAddress;
            let fromProcessed = false;
            let grossProccessed = false;
            let toProcessed = false;
            // swapExactETHForTokens
            if (result.tag === "") {
                let swapExactETHForTokens = yield eth_abi_decoder_1.eth_abi_decoder.getSwapExactETHForTokens(decodedAbi);
                if (swapExactETHForTokens) {
                    result.tag = this.getTagSwapEthToToken();
                    /// SWAP LOGIC FOR EXACT ETH -> TOKEN
                    for (let x = 0; x < receipt.logs.length; x++) {
                        let log = receipt.logs[x];
                        //// -> FROM INFORMATION
                        let depositLog = yield eth_log_decoder_1.eth_log_decoder.getDepositLog(log);
                        if (depositLog
                            && depositLog.ContractInfo.address.toLowerCase() === fromContract.toLowerCase()) {
                            result = this.importResultFromValuesFromLog(result, depositLog.ContractInfo, depositLog.amount.toString());
                            fromProcessed = true;
                        }
                        //// -> GROSS INFO
                        let swapLog = yield eth_log_decoder_1.eth_log_decoder.getSwapLog(log);
                        if (swapLog
                            && swapLog.sender.toLowerCase() === eth_config_1.eth_config.getDexContract().toLowerCase()
                            && swapLog.to.toLowerCase() === result.toAddress.toLowerCase()) {
                            result.toAmountGross = swapLog.amount1Out.toString();
                            result.toAmountGross = this.convertValueToETH(result.toAmountGross);
                            grossProccessed = true;
                        }
                        //// -> TO INFO
                        let transferLog = yield eth_log_decoder_1.eth_log_decoder.getTransferLog(log);
                        if (transferLog
                            && transferLog.ContractInfo.address.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()
                            && transferLog.to.toLowerCase() === result.toAddress.toLowerCase()) {
                            result = this.importResultToValuesFromLog(result, transferLog.ContractInfo, transferLog.value.toString());
                            toProcessed = true;
                        }
                    }
                }
            }
            // swapETHForExactTokens
            if (result.tag === "") {
                let swapETHForExactTokens = yield eth_abi_decoder_1.eth_abi_decoder.getSwapETHForExactTokens(decodedAbi);
                if (swapETHForExactTokens) {
                    result.tag = this.getTagSwapEthToToken();
                    /// SWAP LOGIC FOR ETH -> TOKEN
                    for (let x = 0; x < receipt.logs.length; x++) {
                        let log = receipt.logs[x];
                        //// -> FROM INFO
                        let depositLog = yield eth_log_decoder_1.eth_log_decoder.getDepositLog(log);
                        if (depositLog
                            && depositLog.ContractInfo.address.toLowerCase() === fromContract.toLowerCase()) {
                            result = this.importResultFromValuesFromLog(result, depositLog.ContractInfo, depositLog.amount.toString());
                            fromProcessed = true;
                        }
                        //// -> GROSS INFO
                        let swapLog = yield eth_log_decoder_1.eth_log_decoder.getSwapLog(log);
                        if (swapLog) {
                            result.toAmountGross = swapLog.amount1Out.toString();
                            result.toAmountGross = this.convertValueToAmount(result.toAmountGross, result.toDecimal);
                            grossProccessed = true;
                        }
                        //// -> TO INFO
                        let transferLog = yield eth_log_decoder_1.eth_log_decoder.getTransferLog(log);
                        if (transferLog
                            && transferLog.ContractInfo.address.toLowerCase() === toContract.toLowerCase()
                            && transferLog.to.toLowerCase() === result.toAddress.toLowerCase()) {
                            result = this.importResultToValuesFromLog(result, transferLog.ContractInfo, transferLog.value.toString());
                            toProcessed = true;
                        }
                    }
                }
            }
            // swapExactTokensForTokens
            if (result.tag === "") {
                let swapExactTokensForTokens = yield eth_abi_decoder_1.eth_abi_decoder.getSwapExactTokensForTokens(decodedAbi);
                if (swapExactTokensForTokens) {
                    if (fromContract.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                        result.tag = this.getTagSwapTokenToOtherToken();
                    }
                    if (toContract.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                        result.tag = this.getTagSwapOtherTokenToToken();
                    }
                    result.fromAmountGross = this.convertValueToAmount(swapExactTokensForTokens.amountIn.toString(), fromContractInfo.decimals);
                    /// SWAP LOGIC FOR EXACT TOKENS -> TOKEN
                    for (let x = 0; x < receipt.logs.length; x++) {
                        let log = receipt.logs[x];
                        //// -> FROM INFO
                        let transferLogFrom = yield eth_log_decoder_1.eth_log_decoder.getTransferLog(log);
                        if (transferLogFrom
                            && transferLogFrom.ContractInfo.address.toLowerCase() === fromContract.toLowerCase()
                            && transferLogFrom.from.toLowerCase() === result.fromAddress.toLowerCase()) {
                            result = this.importResultFromValuesFromLog(result, transferLogFrom.ContractInfo, transferLogFrom.value.toString());
                            fromProcessed = true;
                        }
                        //// -> GROSS INFO
                        let swapLog = yield eth_log_decoder_1.eth_log_decoder.getSwapLog(log);
                        if (swapLog
                            && swapLog.to.toLowerCase() === result.fromAddress.toLowerCase()) {
                            result.toAmountGross = swapLog.amount1Out.toString();
                            result.toAmountGross = this.convertValueToToken(result.toAmountGross);
                            grossProccessed = true;
                        }
                        //// -> TO INFO
                        let transferLogTo = yield eth_log_decoder_1.eth_log_decoder.getTransferLog(log);
                        if (transferLogTo
                            && transferLogTo.ContractInfo.address.toLowerCase() === toContract.toLowerCase()) {
                            result = this.importResultToValuesFromLog(result, transferLogTo.ContractInfo, transferLogTo.value.toString());
                            toProcessed = true;
                        }
                    }
                }
            }
            // swapTokensForExactETH
            if (result.tag === "") {
                let swapTokensForExactETH = yield eth_abi_decoder_1.eth_abi_decoder.getSwapTokensForExactETH(decodedAbi);
                if (swapTokensForExactETH) {
                    result.tag = this.getTagSwapTokenToEth();
                    result.fromAmountGross = this.convertValueToAmount(swapTokensForExactETH.amountInMax.toString(), fromContractInfo.decimals);
                    grossProccessed = true;
                    for (let x = 0; x < receipt.logs.length; x++) {
                        let log = receipt.logs[x];
                        //// -> FROM INFO
                        let transferLogFrom = yield eth_log_decoder_1.eth_log_decoder.getTransferLog(log);
                        if (transferLogFrom
                            && transferLogFrom.ContractInfo.address.toLowerCase() === fromContract.toLowerCase()
                            && transferLogFrom.from.toLowerCase() === result.fromAddress.toLowerCase()) {
                            result = this.importResultFromValuesFromLog(result, transferLogFrom.ContractInfo, transferLogFrom.value.toString());
                            fromProcessed = true;
                        }
                        //// -> TO INFO
                        let transferLogTo = yield eth_log_decoder_1.eth_log_decoder.getTransferLog(log);
                        if (transferLogTo
                            && transferLogTo.ContractInfo.address.toLowerCase() === toContract.toLowerCase()) {
                            result = this.importResultToValuesFromLog(result, transferLogTo.ContractInfo, transferLogTo.value.toString());
                            toProcessed = true;
                        }
                    }
                }
            }
            // swapExactETHForTokensSupportingFeeOnTransferTokens
            if (result.tag === "") {
                let swapExactETHForTokensSupportingFeeOnTransferTokens = yield eth_abi_decoder_1.eth_abi_decoder.getSwapExactETHForTokensSupportingFeeOnTransferTokens(decodedAbi);
                if (swapExactETHForTokensSupportingFeeOnTransferTokens) {
                    result.tag = this.getTagSwapEthToToken();
                    for (let x = 0; x < receipt.logs.length; x++) {
                        let log = receipt.logs[x];
                        //// -> FROM INFO
                        let depositLog = yield eth_log_decoder_1.eth_log_decoder.getDepositLog(log);
                        if (depositLog
                            && depositLog.ContractInfo.address.toLowerCase() === fromContract.toLowerCase()) {
                            result = this.importResultFromValuesFromLog(result, depositLog.ContractInfo, depositLog.amount.toString());
                            fromProcessed = true;
                        }
                        //// -> GROSS INFO
                        let swapLog = yield eth_log_decoder_1.eth_log_decoder.getSwapLog(log);
                        if (swapLog) {
                            result.toAmountGross = swapLog.amount1Out.toString();
                            result.toAmountGross = this.convertValueToAmount(result.toAmountGross, result.toDecimal);
                            grossProccessed = true;
                        }
                        //// -> TO INFO
                        let transferLog = yield eth_log_decoder_1.eth_log_decoder.getTransferLog(log);
                        if (transferLog
                            && transferLog.ContractInfo.address.toLowerCase() === toContract.toLowerCase()
                            && transferLog.to.toLowerCase() === result.toAddress.toLowerCase()) {
                            result = this.importResultToValuesFromLog(result, transferLog.ContractInfo, transferLog.value.toString());
                            toProcessed = true;
                        }
                    }
                }
            }
            // swapExactTokensForETHSupportingFeeOnTransferTokens
            if (result.tag === "") {
                let swapExactTokensForETHSupportingFeeOnTransferTokens = yield eth_abi_decoder_1.eth_abi_decoder.getSwapExactTokensForETHSupportingFeeOnTransferTokens(decodedAbi);
                if (swapExactTokensForETHSupportingFeeOnTransferTokens) {
                    if (fromContract.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                        result.tag = this.getTagSwapTokenToOtherToken();
                    }
                    result.fromAmountGross = swapExactTokensForETHSupportingFeeOnTransferTokens.amountIn.toString();
                    result.fromAmountGross = this.convertValueToAmount(result.fromAmountGross, fromContractInfo.decimals);
                    grossProccessed = true;
                    /// SWAP LOGIC FOR EXACT TOKENS -> TOKEN
                    for (let x = 0; x < receipt.logs.length; x++) {
                        let log = receipt.logs[x];
                        //// -> FROM INFO
                        let transferLog = yield eth_log_decoder_1.eth_log_decoder.getTransferLog(log);
                        if (transferLog
                            && transferLog.ContractInfo.address.toLowerCase() === fromContract.toLowerCase()
                            && transferLog.from.toLowerCase() === result.fromAddress.toLowerCase()) {
                            result = this.importResultFromValuesFromLog(result, transferLog.ContractInfo, transferLog.value.toString());
                            fromProcessed = true;
                        }
                        //// -> TO INFO
                        let withdrawalLog = yield eth_log_decoder_1.eth_log_decoder.getWithdrawalLog(log);
                        if (withdrawalLog
                            && withdrawalLog.ContractInfo.address.toLowerCase() === toContract.toLowerCase()) {
                            result = this.importResultToValuesFromLog(result, withdrawalLog.ContractInfo, withdrawalLog.wad.toString());
                            toProcessed = true;
                        }
                    }
                }
            }
            // swapExactTokensForTokensSupportingFeeOnTransferTokens
            if (result.tag === "") {
                let swapExactTokensForTokensSupportingFeeOnTransferTokens = yield eth_abi_decoder_1.eth_abi_decoder.getSwapExactTokensForTokensSupportingFeeOnTransferTokens(decodedAbi);
                if (swapExactTokensForTokensSupportingFeeOnTransferTokens) {
                    if (fromContract.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                        result.tag = this.getTagSwapTokenToOtherToken();
                    }
                    if (toContract.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                        result.tag = this.getTagSwapOtherTokenToToken();
                    }
                    for (let x = 0; x < receipt.logs.length; x++) {
                        let log = receipt.logs[x];
                        //// -> FROM INFO
                        let transferLogFrom = yield eth_log_decoder_1.eth_log_decoder.getTransferLog(log);
                        if (transferLogFrom
                            && transferLogFrom.ContractInfo.address.toLowerCase() === fromContract.toLowerCase()
                            && transferLogFrom.from.toLowerCase() === result.fromAddress.toLowerCase()) {
                            result = this.importResultFromValuesFromLog(result, transferLogFrom.ContractInfo, transferLogFrom.value.toString());
                            fromProcessed = true;
                        }
                        //// -> GROSS INFO
                        let swapLog = yield eth_log_decoder_1.eth_log_decoder.getSwapLog(log);
                        if (swapLog
                            && swapLog.to.toLowerCase() === result.toAddress.toLowerCase()) {
                            result.toAmountGross = swapLog.amount1Out.toString();
                            result.toAmountGross = this.convertValueToAmount(result.toAmountGross, result.toDecimal);
                            grossProccessed = true;
                        }
                        //// -> TO INFO
                        let transferLogTo = yield eth_log_decoder_1.eth_log_decoder.getTransferLog(log);
                        if (transferLogTo
                            && transferLogTo.ContractInfo.address.toLowerCase() === toContract.toLowerCase()
                            && transferLogTo.to.toLowerCase() === result.toAddress.toLowerCase()) {
                            result = this.importResultToValuesFromLog(result, transferLogTo.ContractInfo, transferLogTo.value.toString());
                            toProcessed = true;
                        }
                    }
                }
            }
            if (result.tag !== "" && (!fromProcessed || !grossProccessed || !toProcessed)) {
                console.error(result);
                console.error(decodedAbi);
                console.log(`${fromProcessed ? "from processed" : "from not processed"}`);
                console.log(`${grossProccessed ? "gross processed" : "gross not processed"}`);
                console.log(`${toProcessed ? "to processed" : "to not processed"}`);
                throw new Error(`hash: ${result.hash} something wrong with processing method:${result.method}`);
            }
            return result;
        });
    }
    static processTransitSwap(tx, decodedAbi, result) {
        return __awaiter(this, void 0, void 0, function* () {
            let action = "process transit swap";
            if (tools_1.tools.isEmpty(tx.hash))
                throw new Error("cannot " + action + ", hash not set");
            let swap = yield eth_abi_decoder_1.eth_abi_decoder.getSwap(decodedAbi);
            if (swap) {
                let fromProcessed = false;
                let grossProcessed = false;
                let toProcessed = false;
                let fromContract = swap.srcToken;
                let toContract = swap.dstToken;
                if (fromContract === "0x0000000000000000000000000000000000000000") {
                    fromContract = swap.wrappedNative;
                }
                if (toContract === "0x0000000000000000000000000000000000000000") {
                    toContract = swap.wrappedNative;
                }
                if (fromContract.toLowerCase() !== eth_config_1.eth_config.getTokenContract().toLowerCase()
                    && toContract.toLowerCase() !== eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                    return result;
                }
                let fromContractInfo = yield this.getContractMetaData(fromContract);
                let toContractInfo = yield this.getContractMetaData(toContract);
                if (fromContract.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                    result.tag = this.getTagSwapTokenToOtherToken();
                }
                else {
                    result.tag = this.getTagSwapOtherTokenToToken();
                }
                result.status = eth_types_1.RESULT_STATUS.INVOLVED;
                result.toAddress = result.fromAddress;
                result.method = decodedAbi.abi.name;
                let receipt = yield this.getReceiptByTxnHash(tx.hash);
                if (receipt && receipt.status) {
                    result.sendStatus = eth_types_1.RESULT_SEND_STATUS.SUCCESS;
                }
                else {
                    result.sendStatus = eth_types_1.RESULT_SEND_STATUS.FAILED;
                    return result;
                }
                //// -> GROSS INFO
                result.fromAmountGross = this.convertValueToAmount(swap.amount.toString(), fromContractInfo.decimals);
                grossProcessed = true;
                for (let x = 0; x < receipt.logs.length; x++) {
                    let log = receipt.logs[x];
                    //// -> FROM INFO
                    let transferLog = yield eth_log_decoder_1.eth_log_decoder.getTransferLog(log);
                    if (transferLog
                        && transferLog.from.toLowerCase() === result.fromAddress.toLowerCase()) {
                        result = yield this.importResultValues("from", result, fromContractInfo, transferLog.value.toString());
                        fromProcessed = true;
                    }
                    //// -> FROM INFO ALTERNATIVE
                    let depositLog = yield eth_log_decoder_1.eth_log_decoder.getDepositLog(log);
                    if (depositLog
                        && depositLog.ContractInfo.address.toLowerCase() === fromContract.toLowerCase()) {
                        result = yield this.importResultValues("from", result, fromContractInfo, depositLog.amount.toString());
                        fromProcessed = true;
                    }
                    //// -> GROSS ALTERNATIVE
                    let swap = yield eth_log_decoder_1.eth_log_decoder.getSwapLog(log);
                    if (swap
                        && swap.to.toLowerCase() === result.toAddress.toLowerCase()) {
                        result.toAmountGross = this.convertValueToAmount(swap.amount1Out.toString(), toContractInfo.decimals);
                        grossProcessed = true;
                    }
                    //// -> TO INFO
                    let withdrawalLog = yield eth_log_decoder_1.eth_log_decoder.getWithdrawalLog(log);
                    if (withdrawalLog
                        && withdrawalLog.ContractInfo.address.toLowerCase() === toContractInfo.address.toLowerCase()) {
                        result = yield this.importResultValues("to", result, toContractInfo, withdrawalLog.wad.toString());
                        toProcessed = true;
                    }
                    //// -> TO INFO ALTERNATIVE
                    let transferLogTo = yield eth_log_decoder_1.eth_log_decoder.getTransferLog(log);
                    if (transferLogTo
                        && transferLogTo.to.toLowerCase() === result.toAddress.toLowerCase()) {
                        result = yield this.importResultValues("to", result, toContractInfo, transferLogTo.value.toString());
                        toProcessed = true;
                    }
                }
                if (result.status === eth_types_1.RESULT_STATUS.INVOLVED && result.sendStatus === "success"
                    && (!fromProcessed || !grossProcessed || !toProcessed)) {
                    throw new Error(`transaction is involved but not processed properly. hash:${result.hash}`);
                }
            }
            return result;
        });
    }
    static processOtherEventsOfContract(result, decodedAbi) {
        return __awaiter(this, void 0, void 0, function* () {
            let foundContract = false;
            if (result.status === "involved" && result.sendStatus === eth_types_1.RESULT_SEND_STATUS.SUCCESS) {
                return result;
            }
            /// DEEP SEARCH PARAMETERS FOR TOKEN_TO_TRACK CONTRACT
            if (result.fromAddress.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()
                || result.toAddress.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                let analyzeLogsResult = yield this.analyzeLogs(result.hash);
                if (analyzeLogsResult.receipt.status) {
                    result.sendStatus = eth_types_1.RESULT_SEND_STATUS.SUCCESS;
                    result.status = eth_types_1.RESULT_STATUS.INVOLVED;
                }
            }
            for (let x = 0; x < decodedAbi.abi.params.length; x++) {
                let param = decodedAbi.abi.params[x];
                if (Array.isArray(param.value)) {
                    for (let y = 0; y < param.value.length; y++) {
                        let param_arr_value = param.value[y];
                        if (typeof param_arr_value === "string"
                            && param_arr_value.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                            foundContract = true;
                        }
                    }
                }
                if (typeof param.value === "string"
                    && param.value.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                    foundContract = true;
                }
            }
            if (foundContract) {
                let analyzeLogsResult = yield this.analyzeLogs(result.hash);
                if (analyzeLogsResult.receipt.status) {
                    result.sendStatus = eth_types_1.RESULT_SEND_STATUS.SUCCESS;
                    result.status = eth_types_1.RESULT_STATUS.INVOLVED;
                }
            }
            if (result.sendStatus === "success" && result.status === "involved") {
                result.tag = this.getTagOtherContractEvents();
            }
            return result;
        });
    }
    /// SET TYPES
    static processResultType(result) {
        result.type = "generic_event";
        if (result.fromContract === eth_config_1.eth_config.getTokenContract()
            && result.toContract === eth_config_1.eth_config.getTokenContract()) {
            result.type = "transfer";
        }
        if (result.fromContract === eth_config_1.eth_config.getTokenContract()
            && result.toContract !== eth_config_1.eth_config.getTokenContract()) {
            result.type = "sell";
        }
        if (result.fromContract !== eth_config_1.eth_config.getTokenContract()
            && result.toContract === eth_config_1.eth_config.getTokenContract()) {
            result.type = "buy";
        }
        if (result.method === "addLiquidityETH") {
            result.type = "add_liquidity";
        }
        // intended type approv, to check for approve or approval string pattern
        if (result.method.indexOf("approv") >= 0) {
            result.type = "approval";
        }
        return result;
    }
    /// TAXES & FEES
    static processTaxesFees(result) {
        if (result.status === "involved") {
            result.fromTaxPerc = "0";
            let fromAmountBn = new bignumber_js_1.default(result.fromAmount);
            let fromAmountGrossBn = new bignumber_js_1.default(result.fromAmountGross);
            let fromTaxAmountBn = new bignumber_js_1.default(result.fromTaxAmount);
            let fromTaxPercBn = new bignumber_js_1.default(result.fromTaxPerc);
            fromTaxAmountBn = fromAmountGrossBn.comparedTo(0) === 1 ? fromAmountGrossBn.minus(fromAmountBn) : new bignumber_js_1.default(0);
            if (fromTaxAmountBn.comparedTo(0) === 1 && fromAmountGrossBn.comparedTo(0) === 1) {
                fromTaxPercBn = fromTaxAmountBn.dividedBy(fromAmountGrossBn);
                result.fromTaxPerc = fromTaxPercBn.toFixed(5);
            }
            result.toTaxPerc = "0";
            let toAmountBn = new bignumber_js_1.default(result.toAmount);
            let toAmountGrossBn = new bignumber_js_1.default(result.toAmountGross);
            let toTaxAmountBn = new bignumber_js_1.default(result.toTaxAmount);
            let toTaxPercBn = new bignumber_js_1.default(result.toTaxPerc);
            toTaxAmountBn = toAmountGrossBn.comparedTo(0) === 1 ? toAmountGrossBn.minus(toAmountBn) : new bignumber_js_1.default(0);
            if (toTaxAmountBn.comparedTo(0) === 1 && toAmountGrossBn.comparedTo(0) === 1) {
                toTaxPercBn = toTaxAmountBn.dividedBy(toAmountGrossBn);
                result.toTaxPerc = toTaxPercBn.toFixed(5);
            }
        }
        return result;
    }
    static processResultChecks(result, decodedAbi) {
        return __awaiter(this, void 0, void 0, function* () {
            if (result.status === eth_types_1.RESULT_STATUS.INVOLVED
                && result.sendStatus === "success") {
                let withAmount = ["transfer", "buy", "sell"];
                let fromTaxPerc = parseFloat(result.fromTaxPerc);
                let toTaxPerc = parseFloat(result.toTaxPerc);
                if (withAmount.indexOf(result.method) >= 0 &&
                    (result.type === ""
                        || result.tag === ""
                        || result.toAddress === ""
                        || result.fromAmount === ""
                        || result.toAmount === ""
                        || (!(fromTaxPerc >= 0) && !(toTaxPerc >= 0)))) {
                    console.log(result);
                    throw new Error("involved transaction method not processed:" + result.method + " hash:" + result.hash);
                }
                /// IF TRADE, CHECK TAXES
                let taxAmount = result.fromTaxAmount > result.toTaxAmount ? result.fromTaxAmount : result.toTaxAmount;
                taxAmount = parseFloat(taxAmount);
                if (result.type === "buy" || result.type === "sell") {
                    if (taxAmount === 0) {
                        // console.log("\nNotice: This tx has no tax or fee");
                    }
                }
                if (result.type === "transfer"
                    && result.fromAddress.toLowerCase() !== eth_config_1.eth_config.getHotWalletAddress().toLowerCase()
                    && result.fromAddress.toLowerCase() !== eth_config_1.eth_config.getTokenOwner().toLowerCase()
                    && result.fromAddress.toLowerCase() !== "0x8a9080fb96631cdc0fa95e479c68864dd5d3313b".toLowerCase() // evans address
                ) {
                    if (taxAmount === 0) {
                        // console.log("\nNotice: This tx has no tax or fee");
                    }
                }
            }
            else {
                let foundContract = false;
                let ignoreEvents = ["increaseAllowance", "setSwapAndLiquifyEnabled", "enableAllFees", "setTaxFee"];
                /// DEEP SEARCH PARAMETERS FOR TOKEN_TO_TRACK CONTRACT
                if (result.fromAddress.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()
                    || result.toAddress.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                    if (ignoreEvents.indexOf(result.method) < 0) {
                        let analyzeLogsResult = yield this.analyzeLogs(result.hash);
                        if (analyzeLogsResult.receipt.status) {
                            result.sendStatus = eth_types_1.RESULT_SEND_STATUS.SUCCESS;
                            throw new Error("tracked contract found on tx, should be involved. hash:" + result.hash);
                        }
                    }
                }
                for (let x = 0; x < decodedAbi.abi.params.length; x++) {
                    let param = decodedAbi.abi.params[x];
                    if (Array.isArray(param.value)) {
                        for (let y = 0; y < param.value.length; y++) {
                            let param_arr_value = param.value[y];
                            if (typeof param_arr_value === "string"
                                && param_arr_value.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                                foundContract = true;
                            }
                        }
                    }
                    if (typeof param.value === "string"
                        && param.value.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                        foundContract = true;
                    }
                }
                if (foundContract) {
                    if (ignoreEvents.indexOf(result.method) < 0) {
                        let analyzeLogsResult = yield this.analyzeLogs(result.hash);
                        if (analyzeLogsResult.receipt.status) {
                            result.sendStatus = eth_types_1.RESULT_SEND_STATUS.SUCCESS;
                            console.log(result);
                            throw new Error("tracked contract found on tx, should be involved. hash:" + result.hash);
                        }
                    }
                }
            }
            return result;
        });
    }
    static processResultBlockTime(result) {
        return __awaiter(this, void 0, void 0, function* () {
            if (result.status === "involved" && result.sendStatus === "success") {
                if (typeof result.blockNumber === "undefined")
                    throw new Error("blockNumber info not in result object");
                if (!(result.blockNumber > 0))
                    throw new Error("invalid blockNumber:" + result.blockNumber);
                let blockInfo = yield Web3Client.eth.getBlock(result.blockNumber);
                result.block_time = blockInfo.timestamp;
            }
            return result;
        });
    }
    //endregion
    static importResultFromValuesFromLog(result, ContractInfo, value) {
        result.fromContract = ContractInfo.address;
        result.fromDecimal = ContractInfo.decimals;
        result.fromSymbol = ContractInfo.symbol;
        result.fromValue = value;
        result.fromAmount = this.convertValueToAmount(result.fromValue, result.fromDecimal);
        return result;
    }
    static importResultToValuesFromLog(result, contractInfo, value) {
        result.toContract = contractInfo.address;
        result.toSymbol = contractInfo.symbol;
        result.toDecimal = contractInfo.decimals;
        result.toValue = value;
        result.toAmount = this.convertValueToAmount(result.toValue, result.toDecimal);
        return result;
    }
    static analyzeLogs(_tx_hash) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let action = "analyze logs";
            let receipt = yield this.getReceiptByTxnHash(_tx_hash);
            if (!receipt)
                throw new Error("cannot " + action + ", unable to get receipt of hash:" + _tx_hash);
            let result = [];
            for (let x = 0; x < receipt.logs.length; x++) {
                let logData = {};
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
                let contractMetaData = yield this.getContractMetaData(address);
                if (typeof contractMetaData === "undefined") {
                    throw new Error("no contract meta data not found");
                }
                if (typeof contractMetaData.symbol === "undefined") {
                    throw new Error("no contract symbol not found");
                }
                let log_sig = log.topics[0];
                log_sig = log_sig.replace(/^(0x)/, "");
                let log_sig_record = new eth_log_sig_1.eth_log_sig();
                log_sig_record.signature = log_sig;
                yield log_sig_record.fetch();
                if (log_sig_record._isNew) {
                    continue;
                    // throw new Error("log signature not found");
                }
                let param_names = ((_a = log_sig_record.params_names) !== null && _a !== void 0 ? _a : "").split(";");
                let param_name = param_names[0];
                let methodBreakdown = param_name.split("(");
                let methodName = methodBreakdown[0];
                logData.symbol = contractMetaData.symbol;
                logData.decimal = contractMetaData.decimals;
                logData.method_name = methodName;
                let args = methodBreakdown[1];
                args = args.replace(")", "");
                let indexArgs = [];
                let parameters = [];
                let paramTypes = [];
                args = args.split(",");
                for (let x = 0; x < args.length; x++) {
                    let param = args[x];
                    if (param.indexOf("indexed") >= 0) {
                        param = param.replace("indexed ", "");
                        param = param.split(" ");
                        indexArgs.push({
                            type: param[0],
                            name: param[1],
                            value: "",
                        });
                    }
                    else {
                        param = param.split(" ");
                        parameters.push({
                            type: param[0],
                            name: param[1],
                            value: "",
                        });
                        paramTypes.push(param[0]);
                    }
                }
                if (log.topics.length > 1 && indexArgs.length !== (log.topics.length - 1)) {
                    throw new Error("index args derived from decoded signature count(" + indexArgs.length + ") does not match count of log.topics (" + (log.topics.length - 1) + ")");
                }
                for (let x = 0; x < indexArgs.length; x++) {
                    indexArgs[x].value = log.topics[x + 1];
                    indexArgs[x].value = indexArgs[x].value.replace("0x000000000000000000000000", "0x");
                    logData.indexArgsObj[indexArgs[x].name] = indexArgs[x].value;
                    logData.arguments[indexArgs[x].name] = indexArgs[x].value;
                }
                let decodedData = Web3Client.eth.abi.decodeParameters(paramTypes, log.data);
                for (let x = 0; x < parameters.length; x++) {
                    if (typeof decodedData[x] === "undefined") {
                        throw new Error("parameter index(" + x + ") not found from decodedData");
                    }
                    parameters[x].value = decodedData[x];
                    logData.parametersObj[parameters[x].name] = parameters[x].value;
                    logData.arguments[parameters[x].name] = parameters[x].value;
                }
                logData.indexArgs = indexArgs;
                logData.parameters = parameters;
                result.push(logData);
            }
            return { result: result, receipt: receipt };
        });
    }
    static sendTokenFromHotWallet(_to, _amount) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.sendToken(eth_config_1.eth_config.getHotWalletAddress(), _to, _amount, eth_config_1.eth_config.getHotWalletKey());
        });
    }
    static sendToken(_from, _to, _amount, _key) {
        return __awaiter(this, void 0, void 0, function* () {
            _to = _to.replace(/\s/g, "");
            console.log("USING QUICKNODE");
            console.log("sending token amount:%... initiating contract...from:%s", _amount, eth_config_1.eth_config.getHotWalletAddress());
            let contract = new Web3Client.eth.Contract(eth_config_1.eth_config.getTokenAbi(), eth_config_1.eth_config.getTokenContract(), { from: _from });
            let value = this.convertTokenToValue(_amount);
            //@ts-ignore
            let _data = contract.methods.transfer(_to, value).encodeABI();
            console.log("converted token value: %s, encoding transfer ABI...", value);
            console.log(_data);
            let estimateGas = yield Web3Client.eth.estimateGas({
                value: "0x0" // only tokens
                ,
                data: _data,
                to: _to,
                from: _from
            });
            let _gas = yield Web3Client.eth.getGasPrice();
            let gasLimit = Math.floor(estimateGas * eth_config_1.eth_config.getGasMultiplier());
            console.log("...gas estimate:%s gas price:%s gas:%s", estimateGas, _gas, gasLimit);
            let _nonce = yield Web3Client.eth.getTransactionCount(_from);
            // let _nonce = await eth_helper.getHotWalletNonce();
            console.log("nonce:%s, signing transaction...", _nonce);
            let signedTransaction = yield Web3Client.eth.accounts.signTransaction({
                nonce: _nonce,
                data: _data,
                to: eth_config_1.eth_config.getTokenContract(),
                value: "0x0",
                gas: gasLimit,
                gasPrice: _gas,
            }, _key);
            console.log(signedTransaction);
            console.log("...signed transaction, sending...");
            return new Promise((resolve, reject) => {
                if (typeof signedTransaction.rawTransaction !== "string")
                    throw new Error("unable to send Eth, cannot sign transaction");
                Web3Client.eth.sendSignedTransaction(signedTransaction.rawTransaction)
                    .once("transactionHash", (hash) => {
                    console.log("transaction hash:%s", hash);
                    resolve(hash);
                });
            });
        });
    }
    static sendEth(_from, _to, _amount, _key) {
        return __awaiter(this, void 0, void 0, function* () {
            let from_eth_bal = yield this.getETHBalance(_from);
            let to_eth_bal = yield this.getETHBalance(_to);
            console.log("sending from:%s eth_bal:%s to:%s eth_bal:%s", _from, from_eth_bal, _to, to_eth_bal);
            let value = this.convertEthToValue(_amount);
            console.log("sending bnb:%s value:%s", _amount, value);
            let estimateGas = yield Web3Client.eth.estimateGas({
                value: value,
                to: _to,
                from: _from
            });
            let _gas = yield Web3Client.eth.getGasPrice();
            let gasLimit = Math.floor(estimateGas * 2.7);
            console.log("estimateGas:%s gasPrice:%s gasLimit:%s", estimateGas, _gas, gasLimit);
            let gasLimitAmount = this.convertValueToETH(gasLimit);
            console.log("estimated total to send including gas:%s", (_amount + gasLimitAmount));
            let _nonce = yield Web3Client.eth.getTransactionCount(_from);
            console.log("none:%s", _nonce);
            let signedTransaction = yield Web3Client.eth.accounts.signTransaction({
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
                if (typeof signedTransaction.rawTransaction !== "string")
                    throw new Error("unable to send Eth, cannot sign transaction");
                Web3Client.eth.sendSignedTransaction(signedTransaction.rawTransaction)
                    .once("transactionHash", (hash) => {
                    resolve(hash);
                });
            });
        });
    }
    static createWallet() {
        let account = Web3Client.eth.accounts.create(Web3.utils.randomHex(32));
        let wallet = Web3Client.eth.accounts.wallet.add(account);
        let keystore = wallet.encrypt(Web3.utils.randomHex(32));
        return { account: account, wallet: wallet, keystore: keystore };
    }
    static waitConfirmation(_txn) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof _txn === "string") {
                // console.log("arg is string, retrieving hash info...");
                _txn = yield this.getTxnByHash(_txn);
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
                    yield new Promise((resolve) => {
                        setTimeout(resolve, 500);
                    });
                }
                currentCheckCount++;
                currentBlock = yield this.getLatestBlock();
                height = currentBlock - _txn.blockNumber;
                console.log("current block:%s transaction block:%s height:%s", currentBlock, _txn.blockNumber, height);
                if (currentCheckCount >= confirmationCheckLimit) {
                    throw new Error("unable to confirm transaction");
                }
            } while (height < eth_config_1.eth_config.getConfirmationNeeded());
            return true;
        });
    }
}
exports.eth_worker = eth_worker;
