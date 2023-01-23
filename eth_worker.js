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
const eth_receipt_logs_tools_1 = require("./eth_receipt_logs_tools");
const eth_receipt_1 = require("./build/eth_receipt");
const eth_transaction_tools_1 = require("./eth_transaction_tools");
const eth_block_1 = require("./build/eth_block");
const eth_receipt_logs_1 = require("./build/eth_receipt_logs");
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
    static checkIfInvolved2({ fromAddress = null, toAddress = null, input = null, hash = null }) {
        if ((hash === null || hash === void 0 ? void 0 : hash.toLowerCase()) === eth_config_1.eth_config.getTokenContract().toLowerCase())
            return true;
        if ((fromAddress === null || fromAddress === void 0 ? void 0 : fromAddress.toLowerCase()) === eth_config_1.eth_config.getTokenContract().toLowerCase())
            return true;
        if ((toAddress === null || toAddress === void 0 ? void 0 : toAddress.toLowerCase()) === eth_config_1.eth_config.getTokenContract().toLowerCase())
            return true;
        const striped_tracked_token = eth_config_1.eth_config.getTokenContract().toLowerCase().replace(/^(0x)/, "");
        if (input === null || input === void 0 ? void 0 : input.toLowerCase().includes(striped_tracked_token))
            return true;
        return false;
    }
    static isInvolved({ fromAddress = null, toAddress = null, input = null, hash = null }) {
        return __awaiter(this, void 0, void 0, function* () {
            // Token Creation
            if ((hash === null || hash === void 0 ? void 0 : hash.toLowerCase()) === eth_config_1.eth_config.getTokenGenesisHash().toLowerCase())
                return true;
            const fromMatch = (fromAddress === null || fromAddress === void 0 ? void 0 : fromAddress.toLowerCase()) === eth_config_1.eth_config.getTokenContract().toLowerCase();
            const toMatch = (toAddress === null || toAddress === void 0 ? void 0 : toAddress.toLowerCase()) === eth_config_1.eth_config.getTokenContract().toLowerCase();
            const inputMatch = input === null || input === void 0 ? void 0 : input.toLowerCase().includes(eth_worker.stripBeginningZeroXFromString(eth_config_1.eth_config.getTokenContract().toLowerCase()));
            if (fromMatch || toMatch || inputMatch) {
                const decodedAbi = eth_abi_decoder_1.eth_abi_decoder.decodeAbiObject(input);
                if (decodedAbi)
                    return true;
                else {
                    return yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.findTokenInLogs(hash !== null && hash !== void 0 ? hash : "");
                }
            }
            return false;
        });
    }
    static identifyInvolvement(txn) {
        return __awaiter(this, void 0, void 0, function* () {
            if (txn.token_found === null) {
                if (yield eth_worker.isInvolved(txn)) {
                    txn.token_found = "y";
                    txn.method_name = "unknown";
                    const receipt = yield eth_worker.getReceiptByTxnHash(txn.hash);
                    if (receipt)
                        txn.send_status = receipt.status ? 1 : 0;
                    const abi = eth_abi_decoder_1.eth_abi_decoder.decodeAbiObject(txn.input);
                    if (abi)
                        txn.method_name = abi.abi.name;
                    const swaps = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getLogsByMethod(txn.hash, "swap");
                    txn.is_swap = swaps.length > 0 ? 1 : 0;
                    yield txn.save();
                }
            }
            return txn;
        });
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
    static stripBeginningZeroXFromString(hash) {
        return hash.replace(/^(0x)/, "");
    }
    //endregion END OF UTILITIES
    //region GETTERS
    static getLatestBlock() {
        return __awaiter(this, void 0, void 0, function* () {
            let latestBlock = -1;
            const lastBlock = new eth_block_1.eth_block();
            yield lastBlock.list(" WHERE 1 ", {}, " ORDER BY id DESC, blockNumber DESC LIMIT 1 ");
            if (lastBlock.count() > 0) {
                latestBlock = lastBlock.getItem().blockNumber;
            }
            // fallback
            if (latestBlock < 0) {
                latestBlock = yield eth_worker.getLatestBlockWeb3();
            }
            return latestBlock;
        });
    }
    static getLatestBlockWeb3() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Web3Client.eth.getBlockNumber();
        });
    }
    static getBlockByNumber(blockNumber, strict = false) {
        return __awaiter(this, void 0, void 0, function* () {
            assert_1.assert.isNumber(blockNumber, "blockNumber", 0);
            const block = new eth_block_1.eth_block();
            block.blockNumber = blockNumber;
            yield block.fetch();
            if (strict && block.isNew())
                throw new Error(`unable to retrieve block:${blockNumber} from db`);
            return block;
        });
    }
    static getBlockByNumberWeb3(blockNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Web3Client.eth.getBlock(blockNumber);
        });
    }
    static getTxnByBlockNumberWeb3(_block_num) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Web3Client.eth.getBlock(_block_num, true);
        });
    }
    static getTxnByHashWeb3(txn_hash) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Web3Client.eth.getTransaction(txn_hash);
        });
    }
    static getTxnByHash(_txn_hash) {
        var _a, _b, _c, _d, _e, _f, _g;
        return __awaiter(this, void 0, void 0, function* () {
            let txn_db = new eth_transaction_1.eth_transaction();
            txn_db.hash = _txn_hash;
            yield txn_db.fetch();
            if (txn_db.isNew()) {
                const web3_txn = yield Web3Client.eth.getTransaction(_txn_hash);
                if (tools_1.tools.isEmpty(web3_txn))
                    throw new Error(`unable to retrieve transaction hash:${_txn_hash} from web3`);
                txn_db.loadValues(web3_txn, true);
                txn_db.fromAddress = web3_txn.from;
                txn_db.toAddress = web3_txn.to;
                yield txn_db.save();
            }
            return {
                blockHash: txn_db.blockHash,
                blockNumber: txn_db.blockNumber,
                from: (_a = txn_db.fromAddress) !== null && _a !== void 0 ? _a : "",
                gas: parseFloat((_b = txn_db.gas) !== null && _b !== void 0 ? _b : "0"),
                gasPrice: (_c = txn_db.gasPrice) !== null && _c !== void 0 ? _c : "",
                hash: txn_db.hash,
                input: (_d = txn_db.input) !== null && _d !== void 0 ? _d : "",
                nonce: (_e = txn_db.nonce) !== null && _e !== void 0 ? _e : 0,
                to: (_f = txn_db.toAddress) !== null && _f !== void 0 ? _f : "",
                transactionIndex: 0,
                value: (_g = txn_db.value) !== null && _g !== void 0 ? _g : ""
            };
        });
    }
    static getDbTxnByHash(txn_hash) {
        return __awaiter(this, void 0, void 0, function* () {
            let txn_db = new eth_transaction_1.eth_transaction();
            txn_db.hash = txn_hash;
            yield txn_db.fetch();
            if (txn_db.isNew()) {
                yield eth_worker.getTxnByHash(txn_hash);
                txn_db.hash = txn_hash;
                yield txn_db.fetch();
            }
            if (txn_db.isNew())
                throw new Error(`unable to retrieve txn record hash:${txn_hash}`);
            return txn_db;
        });
    }
    static getReceiptByTxnHashWeb3(txn_hash) {
        return Web3Client.eth.getTransactionReceipt(txn_hash);
    }
    static getReceiptByTxnHash(_txn_hash, strict = false) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let receipt_db = new eth_receipt_1.eth_receipt();
                receipt_db.transactionHash = _txn_hash;
                yield receipt_db.fetch();
                if (receipt_db.recordExists()) {
                    let analyzeReceipt = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getReceiptLogs(_txn_hash);
                    return analyzeReceipt.receipt;
                }
                let receipt;
                let waitLimit = 40;
                let waitCount = 0;
                receipt = yield eth_worker.getTxnByHash(_txn_hash);
                while (typeof receipt === "undefined" || receipt == null) {
                    if (waitCount >= waitLimit)
                        break;
                    waitCount++;
                    console.log("txn not yet mined, waiting...");
                    yield new Promise((resolve) => {
                        setTimeout(resolve, 500);
                    });
                    receipt = yield eth_worker.getTxnByHash(_txn_hash);
                }
                let analyzeReceipt = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getReceiptLogs(_txn_hash);
                return analyzeReceipt.receipt;
            }
            catch (e) {
                if (strict) {
                    throw e;
                }
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
            if (contract_data.isNew()) {
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
    static getPairAddress(token_1, token_2) {
        return __awaiter(this, void 0, void 0, function* () {
            const contract = new Web3Client.eth.Contract(eth_config_1.eth_config.getPancakeFactoryAbi(), eth_config_1.eth_config.getPancakeFactoryContract());
            return contract.methods.getPair(token_1, token_2).call();
        });
    }
    //endregion
    //region ANALYZE TOOL
    static analyzeTransaction2(_txn_hash) {
        return __awaiter(this, void 0, void 0, function* () {
            let tx;
            if (_txn_hash instanceof eth_transaction_1.eth_transaction) {
                tx = _txn_hash;
            }
            else {
                tx = yield eth_worker.getDbTxnByHash(_txn_hash);
            }
            if (tools_1.tools.isEmpty(tx.hash))
                throw new Error("hash must not be empty");
            if (tools_1.tools.isEmpty(tx.blockNumber))
                throw new Error("blockNumber must not be empty");
            let result = eth_tools_1.eth_tools.getDefaultResult(tx);
            result = yield this.processContractCreationEvent(tx, result);
            if (typeof tx.toAddress === "undefined" || tx.toAddress === null || tx.toAddress === "")
                return result;
            let decodedAbi = eth_abi_decoder_1.eth_abi_decoder.decodeAbiObject(tx.input);
            if (!decodedAbi)
                return result;
            result.method = decodedAbi.abi.name;
            if (eth_worker.checkIfInvolved2(tx)) {
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
            // result = await this.processResultBlockTime(result);
            return result;
        });
    }
    static analyzeTransaction3(txn) {
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = typeof txn === "string" ? yield eth_worker.getDbTxnByHash(txn) : txn;
            let result = eth_types_1.eth_types.getDefaultAnalysisResult(transaction);
            // result = await eth_worker.processContractCreationEvent(transaction,result);
            // if(result.method === "createContract") return result;
            if (!eth_worker.checkIfInvolved2(transaction))
                return result;
            result.status = eth_types_1.RESULT_STATUS.INVOLVED;
            const decoded_abi = eth_abi_decoder_1.eth_abi_decoder.decodeAbiObject(transaction.input);
            if (!decoded_abi) {
                result.abiDecodeStatus = "failed";
                return result;
            }
            result.abiDecodeStatus = "success";
            result.method = decoded_abi.abi.name;
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
            // if(result.sendStatus === RESULT_SEND_STATUS.NOT_CHECKED) result = await eth_worker.processOtherEventsOfContract(result,decoded_abi);
            result = eth_worker.processResultType(result);
            result = eth_worker.processTaxesFees(result);
            // result = await eth_worker.processResultChecks(result,decoded_abi);
            // result = await eth_worker.processResultBlockTime(result);
            return result;
        });
    }
    static analyzeTokenTransaction(txn) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            txn = yield eth_transaction_tools_1.eth_transaction_tools.get(txn);
            txn = yield eth_worker.identifyInvolvement(txn);
            let result = eth_types_1.eth_types.getDefaultAnalysisResult(txn);
            result.status = txn.token_found === "y" ? eth_types_1.RESULT_STATUS.INVOLVED : eth_types_1.RESULT_STATUS.NOT_INVOLVED;
            result.sendStatus = txn.send_status ? eth_types_1.RESULT_SEND_STATUS.SUCCESS : eth_types_1.RESULT_SEND_STATUS.FAILED;
            if (result.status !== eth_types_1.RESULT_STATUS.INVOLVED)
                return result;
            const abi = eth_abi_decoder_1.eth_abi_decoder.decodeAbiObject(txn.input);
            result.method = abi ? abi.abi.name : "unknown";
            if (result.sendStatus !== eth_types_1.RESULT_SEND_STATUS.SUCCESS)
                return result;
            if (typeof txn.blockTime !== "number" || !(txn.blockTime > 0)) {
                const block = yield eth_worker.getBlockByNumber(assert_1.assert.isNumber(txn.blockNumber, "txn.blockNumber", 0));
                txn.blockTime = assert_1.assert.isNumber(block.time_added, "block.time_added", 0);
                yield txn.save();
            }
            result.block_time = txn.blockTime;
            const firstTransfer1 = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getFirstLogByMethod(txn.hash, "transfer");
            const lastTransfer1 = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getLastLogByMethod(txn.hash, "transfer");
            if (result.method.toLowerCase() === "approve")
                result.type = "approve";
            if (result.hash.toLowerCase() === eth_config_1.eth_config.getTokenGenesisHash().toLowerCase())
                result.type = "creation";
            if (result.method.toLowerCase() === "transfer") {
                result.type = "transfer";
                result.fromContract = firstTransfer1.ContractInfo.address;
                result.fromSymbol = firstTransfer1.ContractInfo.symbol;
                result.fromDecimal = firstTransfer1.ContractInfo.decimals;
                result.toContract = lastTransfer1.ContractInfo.address;
                result.toSymbol = lastTransfer1.ContractInfo.symbol;
                result.toDecimal = lastTransfer1.ContractInfo.decimals;
                result.toAddress = lastTransfer1.to;
                const transferAbi = eth_abi_decoder_1.eth_abi_decoder.getTransferAbi(abi);
                if (transferAbi) {
                    result.fromValue = transferAbi.amount.toString();
                }
                result.toValue = lastTransfer1.value.toString();
                result.fromAmount = eth_worker.convertValueToAmount(result.fromValue, result.fromDecimal);
                result.fromAmountGross = result.fromAmount;
                result.toAmountGross = result.fromAmountGross;
                result.toAmount = eth_worker.convertValueToAmount(result.toValue, result.toDecimal);
                result.taxAmount = tools_1.tools.toBn(result.toAmountGross).minus(tools_1.tools.toBn(result.toAmount)).toString();
                if (parseFloat(result.taxAmount) > 0) {
                    result.taxPerc = tools_1.tools.toBn(result.taxAmount).dividedBy(tools_1.tools.toBn(result.toAmountGross)).toString();
                }
            }
            if (txn.is_swap && ((_a = txn.toAddress) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === eth_config_1.eth_config.getDexContract().toLowerCase()) {
                result.toAddress = (_b = txn.fromAddress) !== null && _b !== void 0 ? _b : "";
                const logsResult = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getReceiptLogs(txn.hash);
                const firstLog = yield eth_log_decoder_1.eth_log_decoder.decodeLog(logsResult.receipt.logs[0]);
                const lastLog = yield eth_log_decoder_1.eth_log_decoder.decodeLog(logsResult.receipt.logs[logsResult.receipt.logs.length - 1]);
                const lastSwap = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getLastLogByMethod(txn.hash, "swap");
                const firstTransferFrom = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getFirstTransferFrom(txn.hash, (_c = txn.fromAddress) !== null && _c !== void 0 ? _c : "");
                result.type = lastTransfer1.ContractInfo.address.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase() ? "buy" : "sell";
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
                if (firstLog.method_name.toLowerCase() === "deposit") {
                    const deposit = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getFirstLogByMethod(txn.hash, "deposit");
                    result.fromValue = deposit.amount.toString();
                }
                if (lastLog.method_name.toLowerCase() === "withdrawal") {
                    const withdrawal = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getLastLogByMethod(txn.hash, "withdrawal");
                    result.toValue = withdrawal.wad.toString();
                }
                if (result.toAmount === "0") {
                    result.toValue = lastTransfer1.value.toString();
                }
                if (result.fromAmount === "0") {
                    if (firstTransferFrom) {
                        result.fromValue = firstTransferFrom.value.toString();
                    }
                }
                result.fromAmount = eth_worker.convertValueToAmount(result.fromValue, result.fromDecimal);
                result.fromAmountGross = result.fromAmount;
                result.toAmount = eth_worker.convertValueToAmount(result.toValue, result.toDecimal);
                result.toAmountGross = result.toAmount;
                const token_amount = result.type === "buy" ? result.toAmount : result.fromAmount;
                let gross_token_amount = "0";
                if (result.type === "buy") {
                    const swapExactETHForTokensAbi = eth_abi_decoder_1.eth_abi_decoder.getSwapExactETHForTokens(abi);
                    if (swapExactETHForTokensAbi) {
                        gross_token_amount = swapExactETHForTokensAbi.amountOutMin > lastSwap.amount1Out ? swapExactETHForTokensAbi.amountOutMin.toString() : lastSwap.amount1Out.toString();
                    }
                    if (gross_token_amount === "0" || result.toAmount > gross_token_amount) {
                        gross_token_amount = lastSwap.amount1Out.toString();
                    }
                    result.toAmountGross = eth_worker.convertValueToAmount(gross_token_amount, result.toDecimal);
                }
                if (result.type === "sell") {
                    if (abi) {
                        const swapExactTokensForETHSupportingFeeOnTransferTokensAbi = eth_abi_decoder_1.eth_abi_decoder.getSwapExactTokensForETHSupportingFeeOnTransferTokens(abi);
                        if (swapExactTokensForETHSupportingFeeOnTransferTokensAbi) {
                            gross_token_amount = swapExactTokensForETHSupportingFeeOnTransferTokensAbi.amountIn.toString();
                        }
                        const swapExactTokensForTokensSupportingFeeOnTransferTokensAbi = eth_abi_decoder_1.eth_abi_decoder.getSwapExactTokensForTokensSupportingFeeOnTransferTokens(abi);
                        if (swapExactTokensForTokensSupportingFeeOnTransferTokensAbi) {
                            gross_token_amount = swapExactTokensForTokensSupportingFeeOnTransferTokensAbi.amountIn.toString();
                        }
                        const swapTokensForExactETHAbi = eth_abi_decoder_1.eth_abi_decoder.getSwapTokensForExactETH(abi);
                        if (swapTokensForExactETHAbi) {
                            gross_token_amount = swapTokensForExactETHAbi.amountInMax.toString();
                        }
                        result.fromAmountGross = eth_worker.convertValueToAmount(gross_token_amount, result.fromDecimal);
                    }
                }
                gross_token_amount = eth_worker.convertValueToAmount(gross_token_amount, eth_config_1.eth_config.getTokenDecimal());
                result.taxAmount = tools_1.tools.toBn(gross_token_amount).minus(tools_1.tools.toBn(token_amount)).toString();
                if (parseFloat(result.taxAmount) > 0) {
                    result.taxPerc = tools_1.tools.toBn(result.taxAmount).dividedBy(tools_1.tools.toBn(token_amount)).toString();
                }
            }
            // set price info
            const token_amount = result.type === "buy" ? result.toAmount : result.fromAmount;
            result.bnb_usd = (yield eth_worker.getBnbUsdPriceByBlockNumber(result.blockNumber)).toFixed(18);
            result.token_bnb = (yield eth_worker.getTokenBnbPriceByBlockNumber(result.blockNumber)).toFixed(18);
            result.token_usd = (yield eth_worker.getTokenUsdPriceByBlockNumber(result.blockNumber)).toFixed(18);
            result.token_bnb_value = tools_1.tools.toBn(token_amount).multipliedBy(tools_1.tools.toBn(result.token_bnb)).toFixed(18);
            result.token_usd_value = tools_1.tools.toBn(token_amount).multipliedBy(tools_1.tools.toBn(result.token_usd)).toFixed(18);
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
            if (!methodAbi)
                return result;
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
            const receipt = yield eth_worker.getReceiptByTxnHash(result.hash);
            result.sendStatus = receipt && receipt.status ? eth_types_1.RESULT_SEND_STATUS.SUCCESS : eth_types_1.RESULT_SEND_STATUS.FAILED;
            return result;
        });
    }
    /// APPROVAL EVENT
    static processApprovalEvent(tx, decodedAbi, result) {
        return __awaiter(this, void 0, void 0, function* () {
            let action = "process approval event";
            tx.toAddress = assert_1.assert.isString({ val: tx.toAddress, prop_name: "tx.toAddress", strict: true });
            if (tx.toAddress.toLowerCase() !== eth_config_1.eth_config.getTokenContract().toLowerCase())
                return result;
            let methodAbi = yield eth_abi_decoder_1.eth_abi_decoder.getApproveAbi(decodedAbi);
            if (!methodAbi)
                return result;
            result.fromContract = eth_config_1.eth_config.getTokenContract();
            result.fromSymbol = eth_config_1.eth_config.getTokenSymbol();
            result.fromDecimal = eth_config_1.eth_config.getTokenDecimal();
            result.tag = "approval";
            let receipt = yield this.getReceiptByTxnHash(tx.hash);
            result.sendStatus = receipt && receipt.status ? eth_types_1.RESULT_SEND_STATUS.SUCCESS : eth_types_1.RESULT_SEND_STATUS.FAILED;
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
            if (!methodAbi)
                return result;
            result.fromContract = eth_config_1.eth_config.getTokenContract();
            result.fromSymbol = eth_config_1.eth_config.getTokenSymbol();
            result.fromDecimal = eth_config_1.eth_config.getTokenDecimal();
            result.toContract = eth_config_1.eth_config.getTokenContract();
            result.toSymbol = eth_config_1.eth_config.getTokenSymbol();
            result.toDecimal = eth_config_1.eth_config.getTokenDecimal();
            result.toAddress = methodAbi.recipient;
            result.tag = eth_worker.getTagTransferTokenToOther();
            /// GROSS FROM
            result.fromValue = methodAbi.amount.toString();
            result.fromAmount = eth_worker.convertValueToAmount(result.fromValue.toString(), eth_config_1.eth_config.getTokenDecimal());
            result.fromAmountGross = result.fromAmount;
            result.toValue = result.fromValue;
            result.toAmount = result.fromAmount;
            result.toAmountGross = result.fromAmountGross;
            let receipt = yield this.getReceiptByTxnHash(tx.hash);
            result.sendStatus = receipt && receipt.status ? eth_types_1.RESULT_SEND_STATUS.SUCCESS : eth_types_1.RESULT_SEND_STATUS.FAILED;
            const transferLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getFirstLogByMethod(tx.hash, "transfer");
            if (transferLog && transferLog.to.toLowerCase() === result.toAddress.toLowerCase()) {
                result.toValue = transferLog.value.toString();
                result.toAmount = eth_worker.convertValueToAmount(result.toValue, eth_config_1.eth_config.getTokenDecimal());
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
            // set toAddress same with fromAddress because of swap
            result.toAddress = result.fromAddress;
            // CHECK IF SEND SUCCESS
            const receipt = yield this.getReceiptByTxnHash(tx.hash);
            result.sendStatus = receipt && receipt.status ? eth_types_1.RESULT_SEND_STATUS.SUCCESS : eth_types_1.RESULT_SEND_STATUS.FAILED;
            // identify contract informations
            const fromContract = assert_1.assert.isString({ val: decodedAbi.argument_key_value["path"][0], prop_name: "fromContract path", strict: true });
            const fromContractInfo = yield this.getContractMetaData(fromContract);
            const toContract = assert_1.assert.isString({ val: decodedAbi.argument_key_value["path"][decodedAbi.argument_key_value["path"].length - 1], prop_name: "toContract", strict: true });
            const analyzeResultLogs = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getReceiptLogs(tx.hash);
            // BUY
            const swapExactETHForTokens = yield eth_abi_decoder_1.eth_abi_decoder.getSwapExactETHForTokens(decodedAbi);
            if (swapExactETHForTokens) {
                result.tag = eth_worker.getTagSwapEthToToken();
                // FROM
                const firstDepositLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getFirstLogByMethod(analyzeResultLogs, "deposit", true);
                result = this.importResultFromValuesFromLog(result, firstDepositLog.ContractInfo, firstDepositLog.amount.toString());
                // TO
                const lastTransferLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getLastLogByMethod(analyzeResultLogs, "transfer", true);
                result = this.importResultToValuesFromLog(result, lastTransferLog.ContractInfo, lastTransferLog.value.toString());
                // TO AMOUNT GROSS
                const swapLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getFirstLogByMethod(analyzeResultLogs, "swap", true);
                result.toAmountGross = swapLog.amount1Out.toString();
                result.toAmountGross = this.convertValueToETH(result.toAmountGross);
            }
            const swapETHForExactTokens = yield eth_abi_decoder_1.eth_abi_decoder.getSwapETHForExactTokens(decodedAbi);
            if (swapETHForExactTokens) {
                result.tag = this.getTagSwapEthToToken();
                // FROM
                const depositLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getFirstLogByMethod(analyzeResultLogs, "deposit", true);
                result = this.importResultFromValuesFromLog(result, depositLog.ContractInfo, depositLog.amount.toString());
                // TO
                const lastTransferLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getLastLogByMethod(analyzeResultLogs, "transfer", true);
                result = this.importResultToValuesFromLog(result, lastTransferLog.ContractInfo, lastTransferLog.value.toString());
                // TO AMOUNT GROSS
                const swapLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getLastLogByMethod(analyzeResultLogs, "swap", true);
                result.toAmountGross = swapLog.amount1Out.toString();
                result.toAmountGross = this.convertValueToAmount(result.toAmountGross, result.toDecimal);
            }
            const swapExactETHForTokensSupportingFeeOnTransferTokens = yield eth_abi_decoder_1.eth_abi_decoder.getSwapExactETHForTokensSupportingFeeOnTransferTokens(decodedAbi);
            if (swapExactETHForTokensSupportingFeeOnTransferTokens) {
                result.tag = this.getTagSwapEthToToken();
                // FROM
                const firstDepositLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getFirstLogByMethod(analyzeResultLogs, "deposit", true);
                result = this.importResultFromValuesFromLog(result, firstDepositLog.ContractInfo, firstDepositLog.amount.toString());
                // TO
                const lastTransferLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getLastLogByMethod(analyzeResultLogs, "transfer", true);
                result = this.importResultToValuesFromLog(result, lastTransferLog.ContractInfo, lastTransferLog.value.toString());
                // TO AMOUNT GROSS
                const lastSwapLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getLastLogByMethod(analyzeResultLogs, "swap", true);
                result.toAmountGross = lastSwapLog.amount1Out.toString();
                result.toAmountGross = this.convertValueToAmount(result.toAmountGross, result.toDecimal);
            }
            // SELL
            const swapTokensForExactETH = yield eth_abi_decoder_1.eth_abi_decoder.getSwapTokensForExactETH(decodedAbi);
            if (swapTokensForExactETH) {
                result.tag = this.getTagSwapTokenToEth();
                result.fromAmountGross = this.convertValueToAmount(swapTokensForExactETH.amountInMax.toString(), fromContractInfo.decimals);
                // FROM
                const firstTransferLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getFirstLogByMethod(analyzeResultLogs, "transfer", true);
                result = this.importResultFromValuesFromLog(result, firstTransferLog.ContractInfo, firstTransferLog.value.toString());
                // TO
                const lastTransferLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getLastLogByMethod(analyzeResultLogs, "transfer", true);
                result = this.importResultToValuesFromLog(result, lastTransferLog.ContractInfo, lastTransferLog.value.toString());
                // FROM GROSS AMOUNT
                // const syncLog = await eth_receipt_logs_tools.getFirstLogByMethod<SyncLog>(analyzeResultLogs,"sync",true) as SyncLog;
                // result.fromAmountGross = eth_worker.convertValueToAmount(syncLog.reserve1.toString(),firstTransferLog.ContractInfo.decimals);
            }
            const swapExactTokensForETHSupportingFeeOnTransferTokens = yield eth_abi_decoder_1.eth_abi_decoder.getSwapExactTokensForETHSupportingFeeOnTransferTokens(decodedAbi);
            if (swapExactTokensForETHSupportingFeeOnTransferTokens) {
                result.tag = this.getTagSwapTokenToOtherToken();
                // FROM AMOUNT GROSS
                result.fromAmountGross = swapExactTokensForETHSupportingFeeOnTransferTokens.amountIn.toString();
                result.fromAmountGross = this.convertValueToAmount(result.fromAmountGross, fromContractInfo.decimals);
                // FROM
                const firstTransferLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getFirstLogByMethod(analyzeResultLogs, "transfer", true);
                result = this.importResultFromValuesFromLog(result, firstTransferLog.ContractInfo, firstTransferLog.value.toString());
                // TO
                const withdrawalLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getLastLogByMethod(analyzeResultLogs, "withdrawal", true);
                result = this.importResultToValuesFromLog(result, withdrawalLog.ContractInfo, withdrawalLog.wad.toString());
            }
            const swapExactTokensForTokens = yield eth_abi_decoder_1.eth_abi_decoder.getSwapExactTokensForTokens(decodedAbi);
            if (swapExactTokensForTokens) {
                if (fromContract.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase())
                    result.tag = this.getTagSwapTokenToOtherToken();
                if (toContract.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase())
                    result.tag = this.getTagSwapOtherTokenToToken();
                result.fromAmountGross = this.convertValueToAmount(swapExactTokensForTokens.amountIn.toString(), fromContractInfo.decimals);
                // FROM
                const firstTransferLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getFirstLogByMethod(analyzeResultLogs, "transfer", true);
                result = this.importResultFromValuesFromLog(result, firstTransferLog.ContractInfo, firstTransferLog.value.toString());
                // TO
                const lastTransferLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getLastLogByMethod(analyzeResultLogs, "transfer", true);
                result = this.importResultToValuesFromLog(result, lastTransferLog.ContractInfo, lastTransferLog.value.toString());
                // TO AMOUNT GROSS
                const lastSwapLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getLastLogByMethod(analyzeResultLogs, "swap", true);
                result.toAmountGross = lastSwapLog.amount1Out.toString();
                result.toAmountGross = this.convertValueToToken(result.toAmountGross);
            }
            const swapExactTokensForTokensSupportingFeeOnTransferTokens = yield eth_abi_decoder_1.eth_abi_decoder.getSwapExactTokensForTokensSupportingFeeOnTransferTokens(decodedAbi);
            if (swapExactTokensForTokensSupportingFeeOnTransferTokens) {
                if (fromContract.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase())
                    result.tag = this.getTagSwapTokenToOtherToken();
                if (toContract.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase())
                    result.tag = this.getTagSwapOtherTokenToToken();
                // FROM
                const firstTransferLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getFirstLogByMethod(analyzeResultLogs, "transfer", true);
                result = this.importResultFromValuesFromLog(result, firstTransferLog.ContractInfo, firstTransferLog.value.toString());
                // TO
                const lastTransferLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getLastLogByMethod(analyzeResultLogs, "transfer", true);
                result = this.importResultToValuesFromLog(result, lastTransferLog.ContractInfo, lastTransferLog.value.toString());
                // TO AMOUNT GROSS
                if (result.fromContract.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                    result.fromAmountGross = swapExactTokensForTokensSupportingFeeOnTransferTokens.amountIn.toString();
                    result.fromAmountGross = eth_worker.convertValueToAmount(result.fromAmountGross, eth_config_1.eth_config.getTokenDecimal());
                }
                else {
                    const lastSwapLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getLastLogByMethod(analyzeResultLogs, "swap", true);
                    result.toAmountGross = lastSwapLog.amount1Out.toString();
                    result.toAmountGross = this.convertValueToAmount(result.toAmountGross, result.toDecimal);
                }
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
                const analyzeResultLogs = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getReceiptLogs(tx.hash);
                result.fromContract = swap.srcToken;
                result.toContract = swap.dstToken;
                if (result.fromContract === "0x0000000000000000000000000000000000000000") {
                    result.fromContract = swap.wrappedNative;
                }
                if (result.toContract === "0x0000000000000000000000000000000000000000") {
                    result.toContract = swap.wrappedNative;
                }
                let fromContractInfo = yield eth_worker.getContractMetaData(result.fromContract);
                let toContractInfo = yield eth_worker.getContractMetaData(result.toContract);
                if (result.fromContract.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                    result.tag = eth_worker.getTagSwapTokenToOtherToken();
                }
                else {
                    result.tag = eth_worker.getTagSwapOtherTokenToToken();
                }
                result.toAddress = result.fromAddress;
                result.method = decodedAbi.abi.name;
                let receipt = yield eth_worker.getReceiptByTxnHash(tx.hash);
                result.sendStatus = receipt && receipt.status ? eth_types_1.RESULT_SEND_STATUS.SUCCESS : eth_types_1.RESULT_SEND_STATUS.FAILED;
                // FROM
                const firstTransferLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getFirstLogByMethod(analyzeResultLogs, "transfer", true);
                result = yield eth_worker.importResultValues("from", result, fromContractInfo, firstTransferLog.value.toString());
                // TO
                const withdrawalLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getLastLogByMethod(analyzeResultLogs, "withdrawal", false);
                if (withdrawalLog) {
                    const withdrawalLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getLastLogByMethod(analyzeResultLogs, "withdrawal", true);
                    result = yield eth_worker.importResultValues("to", result, toContractInfo, withdrawalLog.wad.toString());
                }
                else {
                    const lastTransferLog = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getLastLogByMethod(analyzeResultLogs, "transfer", true);
                    result = yield eth_worker.importResultValues("to", result, toContractInfo, lastTransferLog.value.toString());
                }
                // FROM AMOUNT GROSS
                result.fromAmountGross = eth_worker.convertValueToAmount(swap.amount.toString(), fromContractInfo.decimals);
            }
            return result;
        });
    }
    static processGenericSwapEvents(tx, result) {
        return __awaiter(this, void 0, void 0, function* () {
            tx = typeof tx === "string" ? yield eth_worker.getDbTxnByHash(tx) : tx;
            tx.toAddress = assert_1.assert.isString({ val: tx.toAddress, prop_name: "processGenericSwapEvents tx.toAddress", strict: true });
            tx.fromAddress = assert_1.assert.isString({ val: tx.fromAddress, prop_name: "processGenericSwapEvents tx.fromAddress", strict: true });
            if (!eth_worker.checkIfInvolved2(tx)) {
                result.status = eth_types_1.RESULT_STATUS.NOT_INVOLVED;
                return result;
            }
            result.status = eth_types_1.RESULT_STATUS.INVOLVED;
            const receipt = yield eth_worker.getReceiptByTxnHash(tx.hash);
            if (!receipt) {
                result.sendStatus = eth_types_1.RESULT_SEND_STATUS.FAILED;
                return result;
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
                let analyzeLogsResult = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getReceiptLogs(result.hash);
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
                let analyzeLogsResult = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getReceiptLogs(result.hash);
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
                result.toTaxAmount = fromTaxAmountBn.toFixed(8);
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
                result.toTaxAmount = toTaxAmountBn.toFixed(8);
            }
            result.taxAmount = result.toTaxAmount > result.fromTaxAmount ? result.toTaxAmount : result.fromTaxAmount;
            result.taxPerc = result.toTaxPerc > result.fromTaxAmount ? result.toTaxPerc : result.fromTaxPerc;
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
                        let analyzeLogsResult = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getReceiptLogs(result.hash);
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
                        let analyzeLogsResult = yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getReceiptLogs(result.hash);
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
    //region API
    //endregion END OF API
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
    static analyzeLogs(_tx_hash, strict = true) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let logResult = { receipt: eth_types_1.eth_types.getDefaultTransactionReceipt(), result: [] };
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
                currentBlock = yield this.getLatestBlockWeb3();
                height = currentBlock - _txn.blockNumber;
                console.log("current block:%s transaction block:%s height:%s", currentBlock, _txn.blockNumber, height);
                if (currentCheckCount >= confirmationCheckLimit) {
                    throw new Error("unable to confirm transaction");
                }
            } while (height < eth_config_1.eth_config.getConfirmationNeeded());
            return true;
        });
    }
    static getTokenPriceInBUSD(tokenAddress, timestamp) {
        return __awaiter(this, void 0, void 0, function* () {
            const logs = yield Web3Client.eth.getPastLogs({ address: "0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16", fromBlock: 23989415, toBlock: 23989415, topics: ["0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1"] });
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
        });
    }
    //region PRICE
    static getReserveByBlockNumber(blockNumber, pairContract) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        return __awaiter(this, void 0, void 0, function* () {
            let sync_log = false;
            const logDb = new eth_receipt_logs_1.eth_receipt_logs();
            console.log(`attempting to search sync log of contract:${pairContract} in db`);
            yield logDb.list(" WHERE blockNumber=:blockNumber AND address=:address ", { blockNumber: blockNumber, address: pairContract });
            if (logDb.count() > 0) {
                console.log(`sync log found`);
                for (const log of logDb._dataList) {
                    let check_sync_log = yield eth_log_decoder_1.eth_log_decoder.getSyncLog({
                        address: (_a = log.address) !== null && _a !== void 0 ? _a : "",
                        blockHash: (_b = log.blockHash) !== null && _b !== void 0 ? _b : "",
                        blockNumber: (_c = log.blockNumber) !== null && _c !== void 0 ? _c : 0,
                        data: (_d = log.data) !== null && _d !== void 0 ? _d : "",
                        logIndex: (_e = log.logIndex) !== null && _e !== void 0 ? _e : 0,
                        topics: JSON.parse((_f = log.topics) !== null && _f !== void 0 ? _f : "[]"),
                        transactionHash: (_g = log.transactionHash) !== null && _g !== void 0 ? _g : "",
                        transactionIndex: (_h = log.transactionIndex) !== null && _h !== void 0 ? _h : 0
                    });
                    if (check_sync_log) {
                        sync_log = check_sync_log;
                    }
                }
            }
            // fallback web3
            else {
                console.log(`not found in db, attempting to search sync log pair:${pairContract} in rpc`);
                const logs = yield Web3Client.eth.getPastLogs({ address: pairContract, fromBlock: blockNumber, toBlock: blockNumber, topics: [eth_config_1.eth_config.getSyncTopicSig()] });
                if (logs.length === 0) {
                    console.log(`not found for current block:${blockNumber}, trying on block:${--blockNumber}`);
                    return eth_worker.getReserveByBlockNumber(blockNumber, pairContract);
                }
                for (const log of logs) {
                    sync_log = yield eth_log_decoder_1.eth_log_decoder.getSyncLog(log);
                    if (sync_log) {
                        console.log(`sync log found, adding on db`);
                        yield eth_worker.getDbTxnByHash(log.transactionHash);
                        yield eth_receipt_logs_tools_1.eth_receipt_logs_tools.getReceiptLogs(log.transactionHash);
                    }
                }
            }
            if (!sync_log)
                throw new Error(`unable to retrieve reserve of ${pairContract} in block:${blockNumber}`);
            return sync_log;
        });
    }
    // BNB USD PAIR
    static getBnbUsdReserveByBlockNumber(blockNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const syncLog = yield eth_worker.getReserveByBlockNumber(blockNumber, eth_config_1.eth_config.getBnbUsdPairContract());
            return { bnb: syncLog.reserve0, usd: syncLog.reserve1 };
        });
    }
    static getBnbUsdPriceByBlockNumber(blockNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const reserve = yield eth_worker.getBnbUsdReserveByBlockNumber(blockNumber);
            return tools_1.tools.toBn(reserve.usd.toString()).dividedBy(tools_1.tools.toBn(reserve.bnb.toString()));
        });
    }
    static getBnbUsdPriceByTime(timeStamp) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`attempting to retrieve closest block on db for time:${timeStamp}`);
            const blockDb = new eth_block_1.eth_block();
            yield blockDb.list(" WHERE time_added <= :timeStamp ", { timeStamp: timeStamp }, " ORDER BY time_added DESC LIMIT 1 ");
            if (blockDb.count() === 0)
                throw new Error(`no block information retrieved on db`);
            const block = blockDb.getItem();
            const diff = timeStamp - block.time_added;
            let blockNumber = block.blockNumber;
            if (diff > (60 * 3)) { // 3 minutes
                console.log(`retrieved block:${block.blockNumber} time_added:${block.time_added} is too far from query time:${timeStamp} difference of ${diff} seconds`);
                let factor = Math.floor(diff / 3);
                blockNumber = (blockNumber + factor) - 31;
                console.log(`adjusting block from ${block.blockNumber} to ${blockNumber}`);
            }
            return eth_worker.getBnbUsdPriceByBlockNumber(blockNumber);
        });
    }
    static getBnbUsdValueByTime(amount, timeStamp) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error(`for implementation`);
        });
    }
    static getBnbUsdPriceByHash(txn_hash) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error(`for implementation`);
        });
    }
    static getBnbUsdValueByHash(amount, txn_hash) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error(`for implementation`);
        });
    }
    // BNB TOKEN PAIR
    static getTokenBnbReserveByBlockNumber(blockNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const syncLog = yield eth_worker.getReserveByBlockNumber(blockNumber, eth_config_1.eth_config.getTokenBnbPairContract());
            return { bnb: syncLog.reserve0, token: syncLog.reserve1 };
        });
    }
    static getTokenBnbPriceByBlockNumber(blockNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const reserve = yield eth_worker.getTokenBnbReserveByBlockNumber(blockNumber);
            return tools_1.tools.toBn(reserve.bnb.toString()).dividedBy(tools_1.tools.toBn(reserve.token.toString()));
        });
    }
    static getTokenUsdPriceByBlockNumber(blockNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const bnb_usd = yield eth_worker.getBnbUsdPriceByBlockNumber(blockNumber);
            const bnb_token = yield eth_worker.getTokenBnbPriceByBlockNumber(blockNumber);
            return tools_1.tools.toBn(bnb_token.toString()).multipliedBy(tools_1.tools.toBn(bnb_usd.toString()));
        });
    }
    static getTokenBnbValueByTime(amount, timeStamp) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error(`for implementation`);
        });
    }
    static getTokenUsdValueByTime(amount, timeStamp) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error(`for implementation`);
        });
    }
    static getTokenBnbPriceByHash(txn_hash) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error(`for implementation`);
        });
    }
    static getTokenUsdPriceByHash(txn_hash) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error(`for implementation`);
        });
    }
    static getTokenBnbValueByHash(amount, txn_hash) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error(`for implementation`);
        });
    }
    static getTokenUsdValueByHash(amount, txn_hash) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error(`for implementation`);
        });
    }
}
exports.eth_worker = eth_worker;
