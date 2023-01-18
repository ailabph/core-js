"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_log_decoder = void 0;
const eth_log_sig_1 = require("./build/eth_log_sig");
const t = __importStar(require("io-ts"));
const d = __importStar(require("fp-ts/Either"));
const eth_config_1 = require("./eth_config");
const eth_worker_1 = require("./eth_worker");
const assert_1 = require("./assert");
const Web3 = require("web3");
const Web3Provider = new Web3.providers.HttpProvider(eth_config_1.eth_config.getRPCUrl());
const Web3Client = new Web3(Web3Provider);
//region Log Types
const ContractInfoCodec = t.type({
    address: t.string,
    name: t.string,
    symbol: t.string,
    decimals: t.union([t.string, t.number]),
});
const TransferLogCodec = t.type({
    method_name: t.literal("Transfer"),
    ContractInfo: ContractInfoCodec,
    from: t.string,
    to: t.string,
    value: t.bigint,
}, "transfer");
const SwapLogCodec = t.type({
    method_name: t.literal("Swap"),
    ContractInfo: ContractInfoCodec,
    sender: t.string,
    amount0In: t.bigint,
    amount1In: t.bigint,
    amount0Out: t.bigint,
    amount1Out: t.bigint,
    to: t.string,
}, "swap");
const ApprovalLogCodec = t.type({
    method_name: t.literal("Approval"),
    ContractInfo: ContractInfoCodec,
    owner: t.string,
    spender: t.string,
    value: t.bigint,
}, "approval");
const WithdrawalLogCodec = t.type({
    method_name: t.literal("Withdrawal"),
    ContractInfo: ContractInfoCodec,
    src: t.string,
    wad: t.bigint,
}, "withdrawal");
const SyncLogCodec = t.type({
    method_name: t.literal("Sync"),
    ContractInfo: ContractInfoCodec,
    reserve0: t.bigint,
    reserve1: t.bigint,
}, "sync");
const DepositLogCodec = t.type({
    method_name: t.literal("Deposit"),
    ContractInfo: ContractInfoCodec,
    user: t.string,
    amount: t.bigint,
}, "deposit");
const MintLogCodec = t.type({
    method_name: t.literal("Mint"),
    ContractInfo: ContractInfoCodec,
    sender: t.string,
    amount0: t.bigint,
    amount1: t.bigint,
}, "mint");
//endregion
class eth_log_decoder {
    static decodeLog(log) {
        return __awaiter(this, void 0, void 0, function* () {
            if (log.topics.length === 0)
                throw new Error("log has no topics");
            // extract signature
            let signature = log.topics[0];
            signature = signature.replace(/^(0x)/, "");
            // retrieve signature from DB
            let logSig = new eth_log_sig_1.eth_log_sig();
            logSig.signature = signature;
            yield logSig.fetch();
            if (logSig.isNew()) {
                // console.warn(`signature not found on database for hash:${log.transactionHash} log_signature:${signature}`);
                return { ContractInfo: {
                        address: "",
                        name: "",
                        symbol: "",
                        decimals: 0,
                    }, method_name: "" };
            }
            assert_1.assert.notEmpty(logSig.params_names, "params_names");
            logSig.params_names = assert_1.assert.isString({ val: logSig.params_names, prop_name: "params_names", strict: true });
            // build data object
            // For future reference example:
            // -- Transfer(address indexed from,address indexed to,uint256 value);Transfer...
            let method_object = {};
            let parameters = logSig.params_names;
            let parts = parameters.split(";");
            parts = parts[0];
            parts = parts.split("(");
            const logMethodName = assert_1.assert.isString({ val: parts[0], prop_name: "log method name", strict: true });
            let args = assert_1.assert.isString({ val: parts[1], prop_name: "log method arguments", strict: true });
            args = args.replace(")", "");
            //// get method name
            method_object.method_name = logMethodName;
            method_object.ContractInfo = {
                address: "",
                name: "",
                symbol: "",
                decimals: 0,
            };
            let contractMetaData = yield eth_worker_1.eth_worker.getContractMetaData(log.address);
            assert_1.assert.isset({ val: contractMetaData.symbol, prop_name: "contractMetaData.symbol", strict: true });
            method_object.ContractInfo.address = log.address;
            method_object.ContractInfo.name = contractMetaData.name;
            method_object.ContractInfo.symbol = contractMetaData.symbol;
            method_object.ContractInfo.decimals = contractMetaData.decimals;
            //// segregate indexes and parameter name and values
            //     parts = parts[1].replace(")","");
            //     parts = parts.split(",");
            const arg_parts = args.split(",");
            let parameterNames = [];
            let parameterTypes = [];
            let topicLogIndex = 0;
            for (let x = 0; x < arg_parts.length; x++) {
                let parameter_parts = arg_parts[x].split(" ");
                let isIndex = (typeof parameter_parts[1] === "string" && parameter_parts[1] === "indexed");
                let parameter_name = parameter_parts[parameter_parts.length - 1];
                let parameter_type = parameter_parts[0];
                let parameter_value = "";
                if (isIndex) {
                    parameter_value = log.topics[++topicLogIndex].replace("0x000000000000000000000000", "0x");
                    if (parameter_type.indexOf("uint") >= 0) {
                        parameter_value = BigInt(parameter_value);
                    }
                }
                else {
                    parameterNames.push(parameter_name);
                    parameterTypes.push(parameter_type);
                }
                method_object[parameter_name] = parameter_value;
            }
            //// decode data based on collected parameter types
            let decodedDataCollection = Web3Client.eth.abi.decodeParameters(parameterTypes, log.data);
            for (let x = 0; x < parameterNames.length; x++) {
                if (typeof decodedDataCollection[x] === "undefined") {
                    console.log("COLLECTED PARAMETERS");
                    console.log(parameterNames);
                    console.log("DECODED DATA COLLECTION");
                    console.log(decodedDataCollection);
                    throw new Error("decoded data collection do not match collected parameters");
                }
                if (typeof decodedDataCollection[x] === "string") {
                    method_object[parameterNames[x]] = decodedDataCollection[x].replace("0x000000000000000000000000", "0x");
                }
                if (parameterTypes[x].indexOf("uint") >= 0) {
                    method_object[parameterNames[x]] = BigInt(method_object[parameterNames[x]]);
                }
            }
            return method_object;
        });
    }
    //region Log Type Getters
    static getTransferLog(log) {
        return __awaiter(this, void 0, void 0, function* () {
            let decodedLog = yield this.decodeLog(log);
            if (!decodedLog)
                return false;
            if (decodedLog.method_name.toLowerCase() !== TransferLogCodec.name.toLowerCase())
                return false;
            let processedData = TransferLogCodec.decode(decodedLog);
            if (d.isRight(processedData)) {
                return processedData.right;
            }
            console.log(decodedLog);
            console.log(processedData.left[0].context);
            throw new Error("log is transfer but unable to identify type");
        });
    }
    static getSwapLog(log) {
        return __awaiter(this, void 0, void 0, function* () {
            let decodedLog = yield this.decodeLog(log);
            if (!decodedLog)
                return false;
            if (decodedLog.method_name.toLowerCase() !== SwapLogCodec.name)
                return false;
            let processedData = SwapLogCodec.decode(decodedLog);
            if (d.isRight(processedData)) {
                return processedData.right;
            }
            console.log(decodedLog);
            console.log(processedData);
            throw new Error("log is swap but unable to identify type");
        });
    }
    static getApprovalLog(log) {
        return __awaiter(this, void 0, void 0, function* () {
            let decodedLog = yield this.decodeLog(log);
            if (!decodedLog)
                return false;
            if (decodedLog.method_name.toLowerCase() !== ApprovalLogCodec.name)
                return false;
            let processedData = ApprovalLogCodec.decode(decodedLog);
            if (d.isRight(processedData)) {
                return processedData.right;
            }
            console.log(decodedLog);
            console.log(processedData);
            throw new Error("log is approval but unable to identify type");
        });
    }
    static getWithdrawalLog(log) {
        return __awaiter(this, void 0, void 0, function* () {
            let decodedLog = yield this.decodeLog(log);
            if (!decodedLog)
                return false;
            if (decodedLog.method_name.toLowerCase() !== WithdrawalLogCodec.name)
                return false;
            let processedData = WithdrawalLogCodec.decode(decodedLog);
            if (d.isRight(processedData)) {
                return processedData.right;
            }
            console.log(decodedLog);
            console.log(processedData);
            throw new Error("log is withdrawal but unable to identify type");
        });
    }
    static getSyncLog(log) {
        return __awaiter(this, void 0, void 0, function* () {
            let decodedLog = yield this.decodeLog(log);
            if (!decodedLog)
                return false;
            if (decodedLog.method_name.toLowerCase() !== SyncLogCodec.name)
                return false;
            let processedData = SyncLogCodec.decode(decodedLog);
            if (d.isRight(processedData)) {
                return processedData.right;
            }
            console.log(decodedLog);
            console.log(processedData);
            throw new Error("log is sync but unable to identify type");
        });
    }
    static getDepositLog(log) {
        return __awaiter(this, void 0, void 0, function* () {
            let decodedLog = yield this.decodeLog(log);
            if (!decodedLog)
                return false;
            if (decodedLog.method_name.toLowerCase() !== DepositLogCodec.name)
                return false;
            let processedData = DepositLogCodec.decode(decodedLog);
            if (d.isRight(processedData)) {
                return processedData.right;
            }
            console.log(decodedLog);
            console.log(processedData);
            throw new Error("log is Deposit but unable to identify type");
        });
    }
    static getMintLog(log) {
        return __awaiter(this, void 0, void 0, function* () {
            let decodedLog = yield this.decodeLog(log);
            if (!decodedLog)
                return false;
            if (decodedLog.method_name.toLowerCase() !== MintLogCodec.name)
                return false;
            let processedData = MintLogCodec.decode(decodedLog);
            if (d.isRight(processedData)) {
                return processedData.right;
            }
            console.log(decodedLog);
            console.log(processedData);
            throw new Error("log is " + MintLogCodec.name + " but unable to identify type");
        });
    }
}
exports.eth_log_decoder = eth_log_decoder;
