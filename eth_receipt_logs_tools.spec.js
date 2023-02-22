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
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const config_1 = require("./config");
const connection_1 = require("./connection");
const eth_config_1 = require("./eth_config");
const tools_1 = require("./tools");
const eth_receipt_logs_tools_1 = require("./eth_receipt_logs_tools");
const eth_worker_trade_1 = require("./eth_worker_trade");
const time_helper_1 = require("./time_helper");
const eth_receipt_logs_1 = require("./build/eth_receipt_logs");
const eth_price_track_header_1 = require("./build/eth_price_track_header");
describe("receipt_logs_tools spec", () => {
    before(async () => {
        config_1.config.resetCache();
        connection_1.connection.reset();
        config_1.config.ENV_OVERRIDE = config_1.config.ENV["test"];
    });
    beforeEach(async () => {
        await connection_1.connection.startTransaction();
    });
    afterEach(async () => {
        await connection_1.connection.rollback();
    });
    it("receipt_logs_tools getUnprocessedReceiptLogsForEvents price not yet processed", async () => {
        const logs1 = getMockReceiptLogs();
        await logs1.save();
        const result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getUnprocessedLogsForEvents();
        assert.equal(result.length, 0);
    });
    it("receipt_logs_tools getUnprocessedReceiptLogsForEvents price processed", async () => {
        const logs1 = getMockReceiptLogs();
        logs1.time_processed_price = time_helper_1.time_helper.getCurrentTimeStamp();
        await logs1.save();
        const result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getUnprocessedLogsForEvents();
        assert.equal(result.length, 1);
    });
    it("receipt_logs_tools getUnprocessedReceiptLogsForEvents cache id", async () => {
        const logs1 = getMockReceiptLogs();
        logs1.time_processed_price = time_helper_1.time_helper.getCurrentTimeStamp();
        await logs1.save();
        let result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getUnprocessedLogsForEvents();
        assert.equal(result.length, 1);
        assert.equal(result[0].id, logs1.id, "first log");
        const logs2 = getMockReceiptLogs();
        logs2.time_processed_price = time_helper_1.time_helper.getCurrentTimeStamp();
        await logs2.save();
        const logs3 = getMockReceiptLogs();
        logs3.time_processed_price = time_helper_1.time_helper.getCurrentTimeStamp();
        await logs3.save();
        result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getUnprocessedLogsForEvents();
        assert.equal(result.length, 2);
        assert.equal(result[0].id, logs2.id, "second log");
    });
    it("receipt_logs_tools getUnprocessedReceiptLogsForEvents all processed", async () => {
        const logs1 = getMockReceiptLogs();
        logs1.time_processed_price = time_helper_1.time_helper.getCurrentTimeStamp();
        logs1.time_processed_events = time_helper_1.time_helper.getCurrentTimeStamp();
        await logs1.save();
        const logs2 = getMockReceiptLogs();
        logs2.time_processed_price = time_helper_1.time_helper.getCurrentTimeStamp();
        logs2.time_processed_events = time_helper_1.time_helper.getCurrentTimeStamp();
        await logs2.save();
        let result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getUnprocessedLogsForEvents();
        assert.equal(result.length, 0);
    });
    it("receipt_logs_tools isContractEventLog true", () => {
        const mockLog = getMockReceiptLogs();
        mockLog.address = eth_config_1.eth_config.getTokenContract();
        const result = eth_receipt_logs_tools_1.eth_receipt_logs_tools.isContractEventLog(mockLog);
        assert.equal(result, true);
    });
    it("receipt_logs_tools isContractEventLog false", () => {
        const mockLog = getMockReceiptLogs();
        const result = eth_receipt_logs_tools_1.eth_receipt_logs_tools.isContractEventLog(mockLog);
        assert.equal(result, false);
    });
    it("receipt_logs_tools isPairEventLog true token_bnb", () => {
        const mockLog = getMockReceiptLogs();
        mockLog.address = eth_config_1.eth_config.getTokenBnbPairContract();
        const result = eth_receipt_logs_tools_1.eth_receipt_logs_tools.isPairEventLog(mockLog);
        assert.equal(result, true);
    });
    it("receipt_logs_tools isPairEventLog true token_usd", () => {
        const mockLog = getMockReceiptLogs();
        mockLog.address = eth_config_1.eth_config.getTokenUsdPairContract();
        const result = eth_receipt_logs_tools_1.eth_receipt_logs_tools.isPairEventLog(mockLog);
        assert.equal(result, true);
    });
    it("receipt_logs_tools isPairEventLog false", () => {
        const mockLog = getMockReceiptLogs();
        const result = eth_receipt_logs_tools_1.eth_receipt_logs_tools.isPairEventLog(mockLog);
        assert.equal(result, false);
    });
    it("receipt_logs_tools processLogToEvent completed", () => {
    });
    it("receipt_logs_tools ifTransferProcessEventData", () => { });
    it("receipt_logs_tools ifSwapProcessEventData", () => { });
    it("receipt_logs_tools getTradeTypeOfSwap buy token on token0", async () => {
        const newPair = getMockPairInfoTokenToken0BusdToken1();
        await newPair.save();
        const swapLog = getMockSwapLog();
        swapLog.amount0Out = 123n;
        swapLog.amount0In = 234n;
        swapLog.amount1In = 345n;
        const result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getTradeTypeOfSwap(swapLog, newPair.token0_contract);
        assert.equal(result, eth_worker_trade_1.TRADE_TYPE.BUY);
    });
    it("receipt_logs_tools getTradeTypeOfSwap sell token on token0", async () => {
        const swapLog = getMockSwapLog();
        const newPair = getMockPairInfoTokenToken0BusdToken1();
        await newPair.save();
        swapLog.amount0In = 123n;
        swapLog.amount0Out = 234n;
        swapLog.amount1Out = 345n;
        const result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getTradeTypeOfSwap(swapLog, newPair.token0_contract);
        assert.equal(result, eth_worker_trade_1.TRADE_TYPE.SELL);
    });
    it("receipt_logs_tools getTradeTypeOfSwap buy token on token1", async () => {
        const swapLog = getMockSwapLog();
        const newPair = getMockPairInfoBusdToken0TokenToken1();
        await newPair.save();
        swapLog.amount1Out = 123n;
        swapLog.amount1In = 234n;
        swapLog.amount0In = 456n;
        const result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getTradeTypeOfSwap(swapLog, newPair.token1_contract);
        assert.equal(result, eth_worker_trade_1.TRADE_TYPE.BUY);
    });
    it("receipt_logs_tools getTradeTypeOfSwap sell token on token1", async () => {
        const swapLog = getMockSwapLog();
        const newPair = getMockPairInfoBusdToken0TokenToken1();
        await newPair.save();
        swapLog.amount1In = 123n;
        swapLog.amount1Out = 234n;
        swapLog.amount0Out = 456n;
        const result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getTradeTypeOfSwap(swapLog, newPair.token1_contract);
        assert.equal(result, eth_worker_trade_1.TRADE_TYPE.SELL);
    });
    it("receipt_logs_tools getTotalSwapInOf from token if token is token0", async () => {
        const newPair = getMockPairInfoTokenToken0BusdToken1();
        await newPair.save();
        const swapLog = getMockSwapLog();
        swapLog.amount0In = 123n;
        const result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getTotalSwapInOf(swapLog, newPair.token0_contract);
        assert.equal(result, "0.000000000000000123");
    });
    it("receipt_logs_tools getTotalSwapInOf from token if token is token1", async () => {
        const newPair = getMockPairInfoBusdToken0TokenToken1();
        await newPair.save();
        const swapLog = getMockSwapLog();
        swapLog.amount1In = 123n;
        const result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getTotalSwapInOf(swapLog, newPair.token1_contract);
        assert.equal(result, "0.000000000000000123");
    });
    it("receipt_logs_tools getTotalSwapOutOf from token if token is token0", async () => {
        const newPair = getMockPairInfoTokenToken0BusdToken1();
        await newPair.save();
        const swapLog = getMockSwapLog();
        swapLog.amount0Out = 123n;
        const result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getTotalSwapOutOf(swapLog, newPair.token0_contract);
        assert.equal(result, "0.000000000000000123");
    });
    it("receipt_logs_tools getTotalSwapOutOf from token if token is token1", async () => {
        const newPair = getMockPairInfoBusdToken0TokenToken1();
        await newPair.save();
        const swapLog = getMockSwapLog();
        swapLog.amount1Out = 123n;
        const result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getTotalSwapOutOf(swapLog, newPair.token1_contract);
        assert.equal(result, "0.000000000000000123");
    });
    it("receipt_logs_tools getBuySwapOf token if token is token0", async () => {
        const newPair = getMockPairInfoTokenToken0BusdToken1();
        await newPair.save();
        const swapLog = getMockSwapLog();
        swapLog.amount0Out = 123n;
        swapLog.amount1In = 345n;
        const result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getBuySwapOf(swapLog, newPair.token0_contract);
        assert.equal(result, "0.000000000000000123");
    });
    it("receipt_logs_tools getBuySwapOf token if token is token0", async () => {
        const newPair = getMockPairInfoBusdToken0TokenToken1();
        await newPair.save();
        const swapLog = getMockSwapLog();
        swapLog.amount1Out = 123n;
        swapLog.amount0In = 345n;
        const result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getBuySwapOf(swapLog, newPair.token1_contract);
        assert.equal(result, "0.000000000000000123");
    });
    it("receipt_logs_tools getBuySwapOf token if token is token0 and swap is sell", async () => {
        const newPair = getMockPairInfoTokenToken0BusdToken1();
        await newPair.save();
        const swapLog = getMockSwapLog();
        swapLog.amount1Out = 123n;
        swapLog.amount0In = 345n;
        const result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getBuySwapOf(swapLog, newPair.token0_contract);
        assert.equal(result, "0.0");
    });
    it("receipt_logs_tools getBuySwapOf token if token is token1 and swap is sell", async () => {
        const newPair = getMockPairInfoBusdToken0TokenToken1();
        await newPair.save();
        const swapLog = getMockSwapLog();
        swapLog.amount0Out = 123n;
        swapLog.amount1In = 345n;
        const result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getBuySwapOf(swapLog, newPair.token1_contract);
        assert.equal(result, "0.0");
    });
    it("receipt_logs_tools getSellSwapOf token if token is token0", async () => {
        const newPair = getMockPairInfoTokenToken0BusdToken1();
        await newPair.save();
        const swapLog = getMockSwapLog();
        swapLog.amount0In = 123n;
        swapLog.amount1Out = 345n;
        const result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getSellSwapOf(swapLog, newPair.token0_contract);
        assert.equal(result, "0.000000000000000123");
    });
    it("receipt_logs_tools getSellSwapOf token if token is token1", async () => {
        const newPair = getMockPairInfoBusdToken0TokenToken1();
        await newPair.save();
        const swapLog = getMockSwapLog();
        swapLog.amount1In = 123n;
        swapLog.amount0Out = 345n;
        const result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getSellSwapOf(swapLog, newPair.token1_contract);
        assert.equal(result, "0.000000000000000123");
    });
    it("receipt_logs_tools getSellSwapOf token if token is token0 but buy", async () => {
        const newPair = getMockPairInfoTokenToken0BusdToken1();
        await newPair.save();
        const swapLog = getMockSwapLog();
        swapLog.amount1In = 123n;
        swapLog.amount0Out = 345n;
        const result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getSellSwapOf(swapLog, newPair.token0_contract);
        assert.equal(result, "0.0");
    });
    it("receipt_logs_tools getSellSwapOf token if token is token1 but buy", async () => {
        const newPair = getMockPairInfoBusdToken0TokenToken1();
        await newPair.save();
        const swapLog = getMockSwapLog();
        swapLog.amount0In = 123n;
        swapLog.amount1Out = 345n;
        const result = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getSellSwapOf(swapLog, newPair.token1_contract);
        assert.equal(result, "0.0");
    });
    // it("receipt_logs_tools getTotalTransferIntoDex",async()=>{
    //     const newPair = getMockPairInfoTokenToken0BusdToken1();
    //     await newPair.save();
    //     const swapDbLog = getMockReceiptLogSwap("hash123",newPair.pair_contract,"sender123","toAddress");
    //     console.log(swapDbLog);
    //     const web3Log = eth_worker.convertDbLogToWeb3Log(swapDbLog);
    //     console.log(web3Log);
    //     const decodeSwap = await eth_log_decoder.getSwapLog(web3Log);
    //     console.log(decodeSwap);
    //
    //     // await eth_receipt_logs_tools.getTotalTransferIntoDex(swapLog,newPair.token0_contract);
    // });
});
function getMockReceiptLogs() {
    const newLog = new eth_receipt_logs_1.eth_receipt_logs();
    newLog.txn_hash = `hash_${tools_1.tools.generateRandomNumber(1000, 9999)}`;
    newLog.address = `address_${tools_1.tools.generateRandomNumber(1000, 9999)}`;
    newLog.topics = `topics_${tools_1.tools.generateRandomNumber(1000, 9999)}`;
    newLog.data = `data_${tools_1.tools.generateRandomNumber(1000, 9999)}`;
    newLog.blockNumber = time_helper_1.time_helper.getCurrentTimeStamp();
    newLog.transactionHash = newLog.txn_hash;
    newLog.transactionIndex = tools_1.tools.generateRandomNumber(1, 10);
    newLog.blockHash = `blockHash_${tools_1.tools.generateRandomNumber(1000, 9999)}`;
    newLog.blockTime = time_helper_1.time_helper.getCurrentTimeStamp();
    return newLog;
}
function getMockPairContract() {
    return { address: "pair_address", decimals: 18, name: "", symbol: "" };
}
function getMockPairInfoTokenToken0BusdToken1() {
    const tokenContract = "token_contract";
    const usdContract = "usd_contract";
    const newPair = new eth_price_track_header_1.eth_price_track_header();
    newPair.token0_contract = tokenContract;
    newPair.token0_symbol = "token";
    newPair.token0_decimal = 18;
    newPair.token1_contract = usdContract;
    newPair.token1_symbol = "usd";
    newPair.token1_decimal = 18;
    newPair.pair_contract = getMockPairContract().address;
    return newPair;
}
function getMockPairInfoBusdToken0TokenToken1() {
    const tokenContract = "token_contract";
    const usdContract = "usd_contract";
    const newPair = new eth_price_track_header_1.eth_price_track_header();
    newPair.token1_contract = tokenContract;
    newPair.token1_symbol = "token";
    newPair.token1_decimal = 18;
    newPair.token0_contract = usdContract;
    newPair.token0_symbol = "usd";
    newPair.token0_decimal = 18;
    newPair.pair_contract = getMockPairContract().address;
    return newPair;
}
function getMockSwapLog() {
    return {
        ContractInfo: getMockPairContract(),
        amount0In: 0n,
        amount0Out: 0n,
        amount1In: 0n,
        amount1Out: 0n,
        method_name: "Swap",
        sender: "",
        to: ""
    };
}
function getMockReceiptLogTransfer(hash, pair_address, from_address, to_address) {
    const newLog = new eth_receipt_logs_1.eth_receipt_logs();
    newLog.address = pair_address;
    newLog.transactionHash = hash;
    newLog.topics = `["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef","${from_address}","${to_address}"]`;
    newLog.transactionIndex = 1;
    newLog.blockHash = `block_${hash}`;
    newLog.logIndex = 0;
    // 0.110224927418049454 (decimal 18)
    newLog.data = `0x000000000000000000000000000000000000000000000000018798fccc2563ae`;
    return newLog;
}
function getMockReceiptLogSwap(hash, pair_address, sender, to_address) {
    const newLog = new eth_receipt_logs_1.eth_receipt_logs();
    newLog.address = '0x6b012785a4A423f28717e449E3b2B3187b62b1A2';
    newLog.transactionHash = '0xfd8e8343a2db6f1411a734bbe3de95f489ac6e6a01869f72eef5c46de403c85c';
    newLog.topics = '["0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822","0x000000000000000000000000fbaebcb3c22ba9acb3a64eb0be82c9a46c56deea","0x0000000000000000000000006e0ae9056f065d7808f2dd5ff10b02541dc6af6a"]';
    newLog.transactionIndex = 1;
    newLog.blockHash = `0xbcae7bc65a67692690f0e6f6ce81c2e82881900aba38ee64e65959e2e4a21090`;
    newLog.blockNumber = 123;
    newLog.blockTime = time_helper_1.time_helper.getCurrentTimeStamp();
    newLog.logIndex = 1;
    // amount0In:0 amount0Out:32.522233946987161582 amount1In:0.110224927418049454 amount1Out:0 (decimal 18)
    newLog.data = '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000018798fccc2563ae000000000000000000000000000000000000000000000001c3562f76f051e7ee0000000000000000000000000000000000000000000000000000000000000000';
    return newLog;
}
//# sourceMappingURL=eth_receipt_logs_tools.spec.js.map