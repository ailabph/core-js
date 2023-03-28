import * as assert from "assert";
import { BAR_COLOR } from "./eth_ohlc_tool";
import { eth_ohlc_tool } from "./eth_ohlc_tool";
import { tools } from "./tools";
import {eth_contract_events} from "./build/eth_contract_events";
import {TRADE_TYPE} from "./eth_worker_trade";
import {INTERVAL, time_helper} from "./time_helper";
import {Dayjs} from "dayjs";

let timeStamp = tools.getCurrentTimeStamp();

describe("ohlc_tool spec",()=> {

    it("ohlc_tool isGreen open:0 close:0", () => {
        const ohlc = eth_ohlc_tool.getDefaultOhlc();
        const result = eth_ohlc_tool.isGreen(ohlc);
        assert.equal(result,true,"isGreen = true");
    });

    it("ohlc_tool isGreen open:50 close:100", () => {
        const ohlc = eth_ohlc_tool.getDefaultOhlc();
        ohlc.open = 50;
        ohlc.close = 100;
        const result = eth_ohlc_tool.isGreen(ohlc);
        assert.equal(result,true,"isGreen = true");
    });

    it("ohlc_tool isGreen false open:50 close:25", () => {
        const ohlc = eth_ohlc_tool.getDefaultOhlc();
        ohlc.open = 50;
        ohlc.close = 25;
        const result = eth_ohlc_tool.isGreen(ohlc);
        assert.equal(result,false,"isGreen = false");
    });

    it("ohlc_tool isRed open:50 close:25", () => {
        const ohlc = eth_ohlc_tool.getDefaultOhlc();
        ohlc.open = 50;
        ohlc.close = 25;
        const result = eth_ohlc_tool.isRed(ohlc);
        assert.equal(result,true);
    });

    it("ohlc_tool isRed open:50 close:25", () => {
        const ohlc = eth_ohlc_tool.getDefaultOhlc();
        ohlc.open = 50;
        ohlc.close = 25;
        const result = eth_ohlc_tool.isRed(ohlc);
        assert.equal(result,true);
    });

    it("ohlc_tool isRed open:0 close:0", () => {
        const ohlc = eth_ohlc_tool.getDefaultOhlc();
        ohlc.open = 0;
        ohlc.close = 0;
        const result = eth_ohlc_tool.isRed(ohlc);
        assert.equal(result,false);
    });

    it("ohlc_tool isRed open:50 close:100", () => {
        const ohlc = eth_ohlc_tool.getDefaultOhlc();
        ohlc.open = 0;
        ohlc.close = 0;
        const result = eth_ohlc_tool.isRed(ohlc);
        assert.equal(result,false);
    });

    it("ohlc_tool getOpen", () => {
        let events:eth_contract_events[] = [];
        for(let usd_value=5;usd_value<50;usd_value += 5){
            const newEvent = new eth_contract_events();
            newEvent.token_usd_value = usd_value+"";
            events.push(newEvent);
        }
        const open = eth_ohlc_tool.getOpen(events);
        assert.equal(open,5);
    });

    it("ohlc_tool getClose", () => {
        let events:eth_contract_events[] = [];
        for(let usd_value=5;usd_value<=50;usd_value += 5){
            const newEvent = new eth_contract_events();
            newEvent.token_usd_value = usd_value+"";
            events.push(newEvent);
        }
        const close = eth_ohlc_tool.getClose(events);
        assert.equal(close,50);
    });

    it("ohlc_tool getHigh", () => {
        let events:eth_contract_events[] = [];
        for(let usd_value=5;usd_value<=50;usd_value += 5){
            const newEvent = new eth_contract_events();
            newEvent.token_usd_value = usd_value+"";
            events.push(newEvent);
        }
        for(let usd_value=45;usd_value>0;usd_value -= 5){
            const newEvent = new eth_contract_events();
            newEvent.token_usd_value = usd_value+"";
            events.push(newEvent);
        }
        const high = eth_ohlc_tool.getHigh(events);
        assert.equal(high,50);
    });

    it("ohlc_tool getLow", () => {
        let events:eth_contract_events[] = [];
        for(let usd_value=45;usd_value>0;usd_value -= 5){
            const newEvent = new eth_contract_events();
            newEvent.token_usd_value = usd_value+"";
            events.push(newEvent);
        }
        const low = eth_ohlc_tool.getLow(events);
        assert.equal(low,5);
    });

    it("ohlc_tool getSellVolume", () => {
        let events:eth_contract_events[] = [];
        let totalSell = 0;
        for(let usd_value=45;usd_value>0;usd_value -= 5){
            const newEvent = new eth_contract_events();
            newEvent.token_usd_value = usd_value+"";
            newEvent.type = TRADE_TYPE.SELL;
            events.push(newEvent);
            totalSell += usd_value;
        }
        const newEvent = new eth_contract_events();
        newEvent.token_usd_value = "1234.56";
        newEvent.type = TRADE_TYPE.BUY;
        events.push(newEvent);
        const totalSellVolume = eth_ohlc_tool.getSellVolume(events);
        assert.equal(totalSellVolume,totalSell);
    });

    it("ohlc_tool getBuyVolume", () => {
        let events:eth_contract_events[] = [];
        let totalBuy = 0;
        for(let usd_value=45;usd_value>0;usd_value -= 5){
            const newEvent = new eth_contract_events();
            newEvent.token_usd_value = usd_value+"";
            newEvent.type = TRADE_TYPE.BUY;
            events.push(newEvent);
            totalBuy += usd_value;
        }
        const newEvent = new eth_contract_events();
        newEvent.token_usd_value = "1234.56";
        newEvent.type = TRADE_TYPE.SELL;
        events.push(newEvent);
        const totalBuyVolume = eth_ohlc_tool.getBuyVolume(events);
        assert.equal(totalBuyVolume,totalBuy);
    });

    it("ohlc_tool getTotalVolume", () => {
        let events:eth_contract_events[] = [];
        let totalVolume = 0;
        for(let usd_value=1;usd_value<=50;usd_value++){
            const newEvent = new eth_contract_events();
            newEvent.token_usd_value = usd_value+"";
            newEvent.type = usd_value%2 === 0 ? TRADE_TYPE.SELL : TRADE_TYPE.BUY;
            events.push(newEvent);
            totalVolume += usd_value;
        }
        const result = eth_ohlc_tool.getTotalVolume(events);
        assert.equal(result,totalVolume);
    });
    it("ohlc_tool getFromTimeInfo", () => {
        let events:eth_contract_events[] = [];
        const firstTime = time_helper.getTime("2023-01-01","UTC");
        const secondTime = time_helper.getTime("2023-01-02","UTC")
        const event1 = new eth_contract_events();
        event1.block_time = firstTime.unix();
        events.push(event1);
        const event2 = new eth_contract_events();
        event2.block_time = secondTime.unix();
        events.push(event2);
        const fromTimeInfo = eth_ohlc_tool.getFromTimeInfo(events) as Dayjs;
        assert.equal(fromTimeInfo.unix(),firstTime.unix());
    });
    it("ohlc_tool getToTimeInfo", () => {
        let events:eth_contract_events[] = [];
        const dateTimes:string[] = ["2023-02-04","2023-02-09","2023-02-05"];
        for(const dateTime of dateTimes as string[]){
            const timeInfo = time_helper.getTime(dateTime,"UTC");
            const event = new eth_contract_events();
            event.block_time = timeInfo.unix();
            events.push(event);
        }
        const toTimeInfo = eth_ohlc_tool.getToTimeInfo(events) as Dayjs;
        assert.equal(toTimeInfo.unix(),1675900800);
    });
    it("ohlc_tool generateDetailedOhlc red", () => {
        let events:eth_contract_events[] = [];
        const dateTimes:string[] = ["2023-01-01","2023-01-02","2023-01-03"];
        const token_usd_value:number[] = [123.54,456.86,50.12];
        const trade_types:string[] = ["buy","sell","buy"]
        for(let c1=0;c1<dateTimes.length;c1++){
            const dateTime = time_helper.getTime(dateTimes[c1],"UTC");
            const newEvent = new eth_contract_events();
            newEvent.token_usd_value = token_usd_value[c1].toFixed(6);
            newEvent.block_time = dateTime.unix();
            newEvent.type = trade_types[c1];
            events.push(newEvent);
        }
        const ohlc = eth_ohlc_tool.convertTradesToSingleOhlc(events);
        assert.equal(ohlc.open,123.54,"open");
        assert.equal(ohlc.high,456.86,"high");
        assert.equal(ohlc.low,50.12,"low");
        assert.equal(ohlc.close,50.12,"close");
        assert.equal(ohlc.color,BAR_COLOR.RED,"color");
        assert.equal(ohlc.from_time,1672531200,"from_time");
        assert.equal(ohlc.from_dateTime,"2023-01-01 00:00:00","from_dateTime");
        assert.equal(ohlc.to_time,1672704000,"to_time");
        assert.equal(ohlc.to_dateTime,"2023-01-03 00:00:00","to_dateTime");
        assert.equal(ohlc.volume,630.52,"volume");
        assert.equal(ohlc.volume_buy,173.66,"volume buy");
        assert.equal(ohlc.volume_sell,456.86,"volume sell");
    });

    it("ohlc_tool generateDetailedOhlc list", () => {
        const dateTimes:string[] = [
            "2022-01-01T01:00:00","2022-01-01T01:15:00","2022-01-01T01:30:00","2022-01-01T01:45:00",
            "2022-01-01T02:00:00","2022-01-01T02:15:00","2022-01-01T02:30:00","2022-01-01T02:45:00"];
        const prices:number[]=[
            123.54,101.02,122.55,130.45,
            101.34,115.00,95.61,150.12,
        ];
        const trade_types:string[]=[
            "sell","buy","buy","sell",
            "buy","sell","buy","buy",
        ];
        const events:eth_contract_events[] = [];
        for(let c1=0;c1<dateTimes.length;c1++){
            const newEvent = new eth_contract_events();
            const timeInfo = time_helper.getTime(dateTimes[c1],"UTC");
            newEvent.block_time = timeInfo.unix();
            newEvent.token_usd_value = prices[c1].toFixed(6);
            newEvent.type = trade_types[c1];
            events.push(newEvent);
        }
        const ohlc_list = eth_ohlc_tool.convertTradesToOhlcList(INTERVAL.HOUR, events);
        assert.equal(ohlc_list.length,2,"ohlc bar count");
        const ohlc1 = ohlc_list[0].ohlc;
        assert.equal(ohlc1.open,123.54,"open 1");
        assert.equal(ohlc1.high,130.45,"high 1");
        assert.equal(ohlc1.low,101.02,"low 1");
        assert.equal(ohlc1.close,130.45,"close 1");
        assert.equal(ohlc1.from_time,1640998800,"from 1");
    });
});