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
const eth_ohlc_tool_1 = require("./eth_ohlc_tool");
const eth_ohlc_tool_2 = require("./eth_ohlc_tool");
const tools_1 = require("./tools");
const eth_contract_events_1 = require("./build/eth_contract_events");
const eth_worker_trade_1 = require("./eth_worker_trade");
const time_helper_1 = require("./time_helper");
let timeStamp = tools_1.tools.getCurrentTimeStamp();
describe("ohlc_tool spec", () => {
    it("ohlc_tool isGreen open:0 close:0", () => {
        const ohlc = eth_ohlc_tool_2.eth_ohlc_tool.getDefaultOhlc();
        const result = eth_ohlc_tool_2.eth_ohlc_tool.isGreen(ohlc);
        assert.equal(result, true, "isGreen = true");
    });
    it("ohlc_tool isGreen open:50 close:100", () => {
        const ohlc = eth_ohlc_tool_2.eth_ohlc_tool.getDefaultOhlc();
        ohlc.open = 50;
        ohlc.close = 100;
        const result = eth_ohlc_tool_2.eth_ohlc_tool.isGreen(ohlc);
        assert.equal(result, true, "isGreen = true");
    });
    it("ohlc_tool isGreen false open:50 close:25", () => {
        const ohlc = eth_ohlc_tool_2.eth_ohlc_tool.getDefaultOhlc();
        ohlc.open = 50;
        ohlc.close = 25;
        const result = eth_ohlc_tool_2.eth_ohlc_tool.isGreen(ohlc);
        assert.equal(result, false, "isGreen = false");
    });
    it("ohlc_tool isRed open:50 close:25", () => {
        const ohlc = eth_ohlc_tool_2.eth_ohlc_tool.getDefaultOhlc();
        ohlc.open = 50;
        ohlc.close = 25;
        const result = eth_ohlc_tool_2.eth_ohlc_tool.isRed(ohlc);
        assert.equal(result, true);
    });
    it("ohlc_tool isRed open:50 close:25", () => {
        const ohlc = eth_ohlc_tool_2.eth_ohlc_tool.getDefaultOhlc();
        ohlc.open = 50;
        ohlc.close = 25;
        const result = eth_ohlc_tool_2.eth_ohlc_tool.isRed(ohlc);
        assert.equal(result, true);
    });
    it("ohlc_tool isRed open:0 close:0", () => {
        const ohlc = eth_ohlc_tool_2.eth_ohlc_tool.getDefaultOhlc();
        ohlc.open = 0;
        ohlc.close = 0;
        const result = eth_ohlc_tool_2.eth_ohlc_tool.isRed(ohlc);
        assert.equal(result, false);
    });
    it("ohlc_tool isRed open:50 close:100", () => {
        const ohlc = eth_ohlc_tool_2.eth_ohlc_tool.getDefaultOhlc();
        ohlc.open = 0;
        ohlc.close = 0;
        const result = eth_ohlc_tool_2.eth_ohlc_tool.isRed(ohlc);
        assert.equal(result, false);
    });
    it("ohlc_tool getOpen", () => {
        let events = [];
        for (let usd_value = 5; usd_value < 50; usd_value += 5) {
            const newEvent = new eth_contract_events_1.eth_contract_events();
            newEvent.token_usd_value = usd_value + "";
            events.push(newEvent);
        }
        const open = eth_ohlc_tool_2.eth_ohlc_tool.getOpen(events);
        assert.equal(open, 5);
    });
    it("ohlc_tool getClose", () => {
        let events = [];
        for (let usd_value = 5; usd_value <= 50; usd_value += 5) {
            const newEvent = new eth_contract_events_1.eth_contract_events();
            newEvent.token_usd_value = usd_value + "";
            events.push(newEvent);
        }
        const close = eth_ohlc_tool_2.eth_ohlc_tool.getClose(events);
        assert.equal(close, 50);
    });
    it("ohlc_tool getHigh", () => {
        let events = [];
        for (let usd_value = 5; usd_value <= 50; usd_value += 5) {
            const newEvent = new eth_contract_events_1.eth_contract_events();
            newEvent.token_usd_value = usd_value + "";
            events.push(newEvent);
        }
        for (let usd_value = 45; usd_value > 0; usd_value -= 5) {
            const newEvent = new eth_contract_events_1.eth_contract_events();
            newEvent.token_usd_value = usd_value + "";
            events.push(newEvent);
        }
        const high = eth_ohlc_tool_2.eth_ohlc_tool.getHigh(events);
        assert.equal(high, 50);
    });
    it("ohlc_tool getLow", () => {
        let events = [];
        for (let usd_value = 45; usd_value > 0; usd_value -= 5) {
            const newEvent = new eth_contract_events_1.eth_contract_events();
            newEvent.token_usd_value = usd_value + "";
            events.push(newEvent);
        }
        const low = eth_ohlc_tool_2.eth_ohlc_tool.getLow(events);
        assert.equal(low, 5);
    });
    it("ohlc_tool getSellVolume", () => {
        let events = [];
        let totalSell = 0;
        for (let usd_value = 45; usd_value > 0; usd_value -= 5) {
            const newEvent = new eth_contract_events_1.eth_contract_events();
            newEvent.token_usd_value = usd_value + "";
            newEvent.type = eth_worker_trade_1.TRADE_TYPE.SELL;
            events.push(newEvent);
            totalSell += usd_value;
        }
        const newEvent = new eth_contract_events_1.eth_contract_events();
        newEvent.token_usd_value = "1234.56";
        newEvent.type = eth_worker_trade_1.TRADE_TYPE.BUY;
        events.push(newEvent);
        const totalSellVolume = eth_ohlc_tool_2.eth_ohlc_tool.getSellVolume(events);
        assert.equal(totalSellVolume, totalSell);
    });
    it("ohlc_tool getBuyVolume", () => {
        let events = [];
        let totalBuy = 0;
        for (let usd_value = 45; usd_value > 0; usd_value -= 5) {
            const newEvent = new eth_contract_events_1.eth_contract_events();
            newEvent.token_usd_value = usd_value + "";
            newEvent.type = eth_worker_trade_1.TRADE_TYPE.BUY;
            events.push(newEvent);
            totalBuy += usd_value;
        }
        const newEvent = new eth_contract_events_1.eth_contract_events();
        newEvent.token_usd_value = "1234.56";
        newEvent.type = eth_worker_trade_1.TRADE_TYPE.SELL;
        events.push(newEvent);
        const totalBuyVolume = eth_ohlc_tool_2.eth_ohlc_tool.getBuyVolume(events);
        assert.equal(totalBuyVolume, totalBuy);
    });
    it("ohlc_tool getTotalVolume", () => {
        let events = [];
        let totalVolume = 0;
        for (let usd_value = 1; usd_value <= 50; usd_value++) {
            const newEvent = new eth_contract_events_1.eth_contract_events();
            newEvent.token_usd_value = usd_value + "";
            newEvent.type = usd_value % 2 === 0 ? eth_worker_trade_1.TRADE_TYPE.SELL : eth_worker_trade_1.TRADE_TYPE.BUY;
            events.push(newEvent);
            totalVolume += usd_value;
        }
        const result = eth_ohlc_tool_2.eth_ohlc_tool.getTotalVolume(events);
        assert.equal(result, totalVolume);
    });
    it("ohlc_tool getFromTimeInfo", () => {
        let events = [];
        const firstTime = time_helper_1.time_helper.getTime("2023-01-01", "UTC");
        const secondTime = time_helper_1.time_helper.getTime("2023-01-02", "UTC");
        const event1 = new eth_contract_events_1.eth_contract_events();
        event1.block_time = firstTime.unix();
        events.push(event1);
        const event2 = new eth_contract_events_1.eth_contract_events();
        event2.block_time = secondTime.unix();
        events.push(event2);
        const fromTimeInfo = eth_ohlc_tool_2.eth_ohlc_tool.getFromTimeInfo(events);
        assert.equal(fromTimeInfo.unix(), firstTime.unix());
    });
    it("ohlc_tool getToTimeInfo", () => {
        let events = [];
        const dateTimes = ["2023-02-04", "2023-02-09", "2023-02-05"];
        for (const dateTime of dateTimes) {
            const timeInfo = time_helper_1.time_helper.getTime(dateTime, "UTC");
            const event = new eth_contract_events_1.eth_contract_events();
            event.block_time = timeInfo.unix();
            events.push(event);
        }
        const toTimeInfo = eth_ohlc_tool_2.eth_ohlc_tool.getToTimeInfo(events);
        assert.equal(toTimeInfo.unix(), 1675900800);
    });
    it("ohlc_tool generateDetailedOhlc red", () => {
        let events = [];
        const dateTimes = ["2023-01-01", "2023-01-02", "2023-01-03"];
        const token_usd_value = [123.54, 456.86, 50.12];
        const trade_types = ["buy", "sell", "buy"];
        for (let c1 = 0; c1 < dateTimes.length; c1++) {
            const dateTime = time_helper_1.time_helper.getTime(dateTimes[c1], "UTC");
            const newEvent = new eth_contract_events_1.eth_contract_events();
            newEvent.token_usd_value = token_usd_value[c1].toFixed(6);
            newEvent.block_time = dateTime.unix();
            newEvent.type = trade_types[c1];
            events.push(newEvent);
        }
        const ohlc = eth_ohlc_tool_2.eth_ohlc_tool.convertTradesToSingleOhlc(events);
        assert.equal(ohlc.open, 123.54, "open");
        assert.equal(ohlc.high, 456.86, "high");
        assert.equal(ohlc.low, 50.12, "low");
        assert.equal(ohlc.close, 50.12, "close");
        assert.equal(ohlc.color, eth_ohlc_tool_1.BAR_COLOR.RED, "color");
        assert.equal(ohlc.from_time, 1672531200, "from_time");
        assert.equal(ohlc.from_dateTime, "2023-01-01 00:00:00", "from_dateTime");
        assert.equal(ohlc.to_time, 1672704000, "to_time");
        assert.equal(ohlc.to_dateTime, "2023-01-03 00:00:00", "to_dateTime");
        assert.equal(ohlc.volume, 630.52, "volume");
        assert.equal(ohlc.volume_buy, 173.66, "volume buy");
        assert.equal(ohlc.volume_sell, 456.86, "volume sell");
    });
    it("ohlc_tool generateDetailedOhlc list", () => {
        const dateTimes = [
            "2022-01-01T01:00:00", "2022-01-01T01:15:00", "2022-01-01T01:30:00", "2022-01-01T01:45:00",
            "2022-01-01T02:00:00", "2022-01-01T02:15:00", "2022-01-01T02:30:00", "2022-01-01T02:45:00"
        ];
        const prices = [
            123.54, 101.02, 122.55, 130.45,
            101.34, 115.00, 95.61, 150.12,
        ];
        const trade_types = [
            "sell", "buy", "buy", "sell",
            "buy", "sell", "buy", "buy",
        ];
        const events = [];
        for (let c1 = 0; c1 < dateTimes.length; c1++) {
            const newEvent = new eth_contract_events_1.eth_contract_events();
            const timeInfo = time_helper_1.time_helper.getTime(dateTimes[c1], "UTC");
            newEvent.block_time = timeInfo.unix();
            newEvent.token_usd_value = prices[c1].toFixed(6);
            newEvent.type = trade_types[c1];
            events.push(newEvent);
        }
        const ohlc_list = eth_ohlc_tool_2.eth_ohlc_tool.convertTradesToOhlcList(time_helper_1.INTERVAL.HOUR, events);
        assert.equal(ohlc_list.length, 2, "ohlc bar count");
        const ohlc1 = ohlc_list[0].ohlc;
        assert.equal(ohlc1.open, 123.54, "open 1");
        assert.equal(ohlc1.high, 130.45, "high 1");
        assert.equal(ohlc1.low, 101.02, "low 1");
        assert.equal(ohlc1.close, 130.45, "close 1");
        assert.equal(ohlc1.from_time, 1640998800, "from 1");
    });
});
//# sourceMappingURL=eth_ohlc_tool.spec.js.map