import * as assert from "assert";
import {config} from "./config";
import {connection} from "./connection";
import {eth_trade} from "./build/eth_trade";
import {worker_trade_bot} from "./worker_trade_bot";
import {expect} from "chai";
import {TRADE_STATUS} from "./eth_trade_tools";
import {eth_ohlc_tool} from "./eth_ohlc_tool";

describe("worker_trade_bot spec",()=> {
    before(async ()=>{
        config.resetCache();
        connection.reset();
        config.ENV_OVERRIDE = config.ENV["test"];
    });
    beforeEach(async ()=>{
        await connection.startTransaction();
    });
    afterEach(async ()=>{
        await connection.rollback();
    });

    it("openTradeProfitCheck take profit returns false, starting price 100 current price 105",()=>{
        const openTrade = new eth_trade();
        openTrade.status = TRADE_STATUS.OPEN;
        openTrade.open_token_usd_price = "100";
        openTrade.take_profit_percentage = 0.1;
        const result = worker_trade_bot.openTradeProfitCheck(openTrade,"105");
        expect(result).to.equal(false);
    });

    it("openTradeProfitCheck take profit returns false, starting price 100 current price 25",()=>{
        const openTrade = new eth_trade();
        openTrade.status = TRADE_STATUS.OPEN;
        openTrade.open_token_usd_price = "100";
        openTrade.take_profit_percentage = 0.1;
        const result = worker_trade_bot.openTradeProfitCheck(openTrade,"25");
        expect(result).to.equal(false);
    });

    it("openTradeProfitCheck take profit returns true, starting price 100 current price 110",()=>{
        const openTrade = new eth_trade();
        openTrade.status = TRADE_STATUS.OPEN;
        openTrade.open_token_usd_price = "100";
        openTrade.take_profit_percentage = 0.1;
        const result = worker_trade_bot.openTradeProfitCheck(openTrade,"110");
        expect(result).to.equal(true);
    });

    it("openTradeStopLossCheck returns false, starting price 100 current price 190",()=>{
        const openTrade = new eth_trade();
        openTrade.status = TRADE_STATUS.OPEN;
        openTrade.stop_loss_percentage = 0.2;
        openTrade.open_token_usd_price = "100";
        const result = worker_trade_bot.openTradeStopLossCheck(openTrade,"190");
        expect(result).to.equal(false);
    });

    it("openTradeStopLossCheck returns true, starting price 100 current price 80",()=>{
        const openTrade = new eth_trade();
        openTrade.status = TRADE_STATUS.OPEN;
        openTrade.stop_loss_percentage = 0.2;
        openTrade.open_token_usd_price = "100";
        const result = worker_trade_bot.openTradeStopLossCheck(openTrade,"80");
        expect(result).to.equal(true);
    });

    //region computeGreenBarBuyVolume
    it("computeGreenBarBuyVolume should return 0 for a green bar", () => {
        const ohlc = eth_ohlc_tool.getDefaultOhlcDetailed();
        ohlc.open_usd = "100.000000000000000000";
        ohlc.high_usd = "105.000000000000000000";
        ohlc.low_usd = "95.000000000000000000";
        ohlc.close_usd = "102.000000000000000000";
        ohlc.volume_buy_usd= "600.000000000000000000";
        ohlc.volume_sell_usd = "500.000000000000000000";
        const additionalBuyVolume = worker_trade_bot.computeGreenBarBuyVolume(ohlc);
        expect(additionalBuyVolume).to.equal("0");
    });

    it("computeGreenBarBuyVolume should return 0 for a neutral bar", () => {
        const ohlc = eth_ohlc_tool.getDefaultOhlcDetailed();
        ohlc.open_usd = "100.000000000000000000";
        ohlc.high_usd = "105.000000000000000000";
        ohlc.low_usd = "95.000000000000000000";
        ohlc.close_usd = "100.000000000000000000";
        ohlc.volume_buy_usd= "500.000000000000000000";
        ohlc.volume_sell_usd = "500.000000000000000000";
        const additionalBuyVolume = worker_trade_bot.computeGreenBarBuyVolume(ohlc);
        expect(additionalBuyVolume).to.equal("0");
    });

    it("computeGreenBarBuyVolume should return the correct required buy volume for a red bar with an additional fixed 10% buy volume", () => {
        const ohlc = eth_ohlc_tool.getDefaultOhlcDetailed();
        ohlc.open_usd = "100.000000000000000000";
        ohlc.high_usd = "105.000000000000000000";
        ohlc.low_usd = "95.000000000000000000";
        ohlc.close_usd = "97.000000000000000000";
        ohlc.volume_buy_usd = "500.000000000000000000";
        ohlc.volume_sell_usd = "600.000000000000000000";
        const additionalBuyVolume = worker_trade_bot.computeGreenBarBuyVolume(ohlc,0.05);
        expect(additionalBuyVolume).to.equal("130.000000000000000000");
    });
    //endregion computeGreenBarBuyVolume

    it("checkIfTradeIsAffordable should return false when trade_amount_usd is above max_trade_budget", async () => {
        const result = await worker_trade_bot.checkIfTradeIsAffordable("100", "80");
        expect(result).to.equal(false);
    });

    it("checkIfTradeIsAffordable should return true when trade_amount_usd is below max_trade_budget", async () => {
        const result = await worker_trade_bot.checkIfTradeIsAffordable("50", "80");
        expect(result).to.equal(true);
    });

    it("checkIfTradeIsAffordable should return true when trade_amount_usd is equal max_trade_budget", async () => {
        const result = await worker_trade_bot.checkIfTradeIsAffordable("50", "50");
        expect(result).to.equal(true);
    });

    it("adjustTradeAmountIfBelowMinimum should return trade_amount_usd when it's equal or above min_trade_budget", async () => {
        const result = await worker_trade_bot.adjustTradeAmountIfBelowMinimum("50", "30");
        expect(result).to.equal("50");
    });

    it("adjustTradeAmountIfBelowMinimum should return min_trade_budget when trade_amount_usd is below min_trade_budget", async () => {
        const result = await worker_trade_bot.adjustTradeAmountIfBelowMinimum("20", "30");
        expect(result).to.equal("30");
    });

    it("adjustTradeAmountIfBelowMinimum should return trade_amount_usd when it's equal to min_trade_budget", async () => {
        const result = await worker_trade_bot.adjustTradeAmountIfBelowMinimum("30", "30");
        expect(result).to.equal("30");
    });
    it("adjustTradeAmountIfBelowMinimum should return min_trade_budget when trade_amount_usd is negative", async () => {
        const result = await worker_trade_bot.adjustTradeAmountIfBelowMinimum("-10", "30");
        expect(result).to.equal("30");
    });
    it("adjustTradeAmountIfBelowMinimum should return min_trade_budget when trade_amount_usd is zero", async () => {
        const result = await worker_trade_bot.adjustTradeAmountIfBelowMinimum("0", "30");
        expect(result).to.equal("30");
    });

    it('checkTradeHasProfit should return true if trade has profit', () => {
        const starting_price = '1.00';
        const current_price = '1.10';
        const take_profit_percentage = 0.05;

        const result = worker_trade_bot.checkTradeHasProfit(starting_price, current_price, take_profit_percentage);
        expect(result).to.be.true;
    });

    it('checkTradeHasProfit should return false if trade has no profit', () => {
        const starting_price = '1.00';
        const current_price = '1.02';
        const take_profit_percentage = 0.05;

        const result = worker_trade_bot.checkTradeHasProfit(starting_price, current_price, take_profit_percentage);
        expect(result).to.be.false;
    });

    it('checkTradeHasProfit should return true if trade profit is exactly at the take profit percentage', () => {
        const starting_price = '1.00';
        const current_price = '1.05';
        const take_profit_percentage = 0.05;

        const result = worker_trade_bot.checkTradeHasProfit(starting_price, current_price, take_profit_percentage);
        expect(result).to.be.true;
    });

    it('checkTradeHasProfit should handle negative profit and return false', () => {
        const starting_price = '1.00';
        const current_price = '0.90';
        const take_profit_percentage = 0.05;

        const result = worker_trade_bot.checkTradeHasProfit(starting_price, current_price, take_profit_percentage);
        expect(result).to.be.false;
    });

    it('checkTradeHasProfit should handle string numbers for take_profit_percentage', () => {
        const starting_price = '1.00';
        const current_price = '1.10';
        const take_profit_percentage = '0.05';

        const result = worker_trade_bot.checkTradeHasProfit(starting_price, current_price, take_profit_percentage);
        expect(result).to.be.true;
    });

    it('checkTradeStopLossTriggered returns true when stop loss is triggered as a number', () => {
        const startingPrice = '100';
        const currentPrice = '90';
        const stopLossPercentage = 0.1;
        assert.strictEqual(worker_trade_bot.checkTradeStopLossTriggered(startingPrice, currentPrice, stopLossPercentage), true);
    });

    it('checkTradeStopLossTriggered returns true when stop loss is triggered as a string', () => {
        const startingPrice = '100';
        const currentPrice = '90';
        const stopLossPercentage = '0.1';
        assert.strictEqual(worker_trade_bot.checkTradeStopLossTriggered(startingPrice, currentPrice, stopLossPercentage), true);
    });

    it('checkTradeStopLossTriggered returns false when stop loss is not triggered', () => {
        const startingPrice = '100';
        const currentPrice = '95';
        const stopLossPercentage = 0.1;
        assert.strictEqual(worker_trade_bot.checkTradeStopLossTriggered(startingPrice, currentPrice, stopLossPercentage), false);
    });

    it('checkTradeStopLossTriggered throws an error when stop loss percentage is negative', () => {
        const startingPrice = '100';
        const currentPrice = '90';
        const stopLossPercentage = -0.1;
        assert.throws(() => worker_trade_bot.checkTradeStopLossTriggered(startingPrice, currentPrice, stopLossPercentage), Error);
    });

    it('checkTradeStopLossTriggered throws an error when stop loss percentage is zero', () => {
        const startingPrice = '100';
        const currentPrice = '90';
        const stopLossPercentage = 0;
        assert.throws(() => worker_trade_bot.checkTradeStopLossTriggered(startingPrice, currentPrice, stopLossPercentage), Error);
    });

    it('checkTradeStopLossTriggered throws an error when stop loss percentage is not a valid number or string', () => {
        const startingPrice = '100';
        const currentPrice = '90';
        const stopLossPercentage = 'invalid';
        assert.throws(() => worker_trade_bot.checkTradeStopLossTriggered(startingPrice, currentPrice, stopLossPercentage), Error);
    });
});