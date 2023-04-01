"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const connection_1 = require("./connection");
const eth_trade_1 = require("./build/eth_trade");
const worker_trade_bot_1 = require("./worker_trade_bot");
const chai_1 = require("chai");
const eth_trade_tools_1 = require("./eth_trade_tools");
const eth_ohlc_tool_1 = require("./eth_ohlc_tool");
describe("worker_trade_bot spec", () => {
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
    it("openTradeProfitCheck take profit returns false, starting price 100 current price 105", () => {
        const openTrade = new eth_trade_1.eth_trade();
        openTrade.status = eth_trade_tools_1.TRADE_STATUS.OPEN;
        openTrade.open_token_usd_price = "100";
        openTrade.take_profit_percentage = 0.1;
        const result = worker_trade_bot_1.worker_trade_bot.openTradeProfitCheck(openTrade, "105");
        (0, chai_1.expect)(result).to.equal(false);
    });
    it("openTradeProfitCheck take profit returns false, starting price 100 current price 25", () => {
        const openTrade = new eth_trade_1.eth_trade();
        openTrade.status = eth_trade_tools_1.TRADE_STATUS.OPEN;
        openTrade.open_token_usd_price = "100";
        openTrade.take_profit_percentage = 0.1;
        const result = worker_trade_bot_1.worker_trade_bot.openTradeProfitCheck(openTrade, "25");
        (0, chai_1.expect)(result).to.equal(false);
    });
    it("openTradeProfitCheck take profit returns true, starting price 100 current price 110", () => {
        const openTrade = new eth_trade_1.eth_trade();
        openTrade.status = eth_trade_tools_1.TRADE_STATUS.OPEN;
        openTrade.open_token_usd_price = "100";
        openTrade.take_profit_percentage = 0.1;
        const result = worker_trade_bot_1.worker_trade_bot.openTradeProfitCheck(openTrade, "110");
        (0, chai_1.expect)(result).to.equal(true);
    });
    it("openTradeStopLossCheck returns false, starting price 100 current price 190", () => {
        const openTrade = new eth_trade_1.eth_trade();
        openTrade.status = eth_trade_tools_1.TRADE_STATUS.OPEN;
        openTrade.stop_loss_percentage = 0.2;
        openTrade.open_token_usd_price = "100";
        const result = worker_trade_bot_1.worker_trade_bot.openTradeStopLossCheck(openTrade, "190");
        (0, chai_1.expect)(result).to.equal(false);
    });
    it("openTradeStopLossCheck returns true, starting price 100 current price 80", () => {
        const openTrade = new eth_trade_1.eth_trade();
        openTrade.status = eth_trade_tools_1.TRADE_STATUS.OPEN;
        openTrade.stop_loss_percentage = 0.2;
        openTrade.open_token_usd_price = "100";
        const result = worker_trade_bot_1.worker_trade_bot.openTradeStopLossCheck(openTrade, "80");
        (0, chai_1.expect)(result).to.equal(true);
    });
    it("greenBarUsd returns 100", () => {
        const ohlc = eth_ohlc_tool_1.eth_ohlc_tool.getDefaultOhlcDetailed();
        ohlc.volume_buy_usd = "50";
        ohlc.volume_sell_usd = "100";
    });
});
//# sourceMappingURL=worker_trade_bot.spec.js.map