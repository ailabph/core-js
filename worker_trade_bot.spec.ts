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

    it("greenBarUsd returns 100",()=>{
        const ohlc = eth_ohlc_tool.getDefaultOhlcDetailed();
        ohlc.volume_buy_usd = "50";
        ohlc.volume_sell_usd = "100";

    });
});