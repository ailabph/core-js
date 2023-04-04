import {assert} from "./assert";
import {tools} from "./tools";
import {worker_price} from "./worker_price";
import {eth_price_track_details} from "./build/eth_price_track_details";
import {INTERVAL, INTERVAL_DATA, TIME_FORMATS, time_helper} from "./time_helper";
import {eth_contract_events} from "./build/eth_contract_events";
import {TRADE_TYPE} from "./eth_worker_trade";
import {Dayjs} from "dayjs";
import {config} from "./config";
import {web3_tools} from "./web3_tools";
import {ohlc_details} from "./build/ohlc_details";

//region TYPES
enum BAR_COLOR {
    RED = "red",
    GREEN = "green",
}

export {BAR_COLOR}

type OHLC_DETAILED = {
    open: string,
    open_usd: string
    high: string,
    high_usd: string,
    low: string,
    low_usd: string,
    close: string,
    close_usd: string,
    color: BAR_COLOR,
    volume_sell: string,
    volume_sell_usd: string,
    volume_buy: string,
    volume_buy_usd: string,
    volume: string,
    volume_usd: string,
    volume_token: string,
    volume_token_buy: string,
    volume_token_sell: string,
    from_time: number,
    from_dateTime: string,
    to_time: number,
    to_dateTime: string,
}
export {OHLC_DETAILED}

type OHLC_SIMPLE = {
    open: number,
    high: number,
    low: number,
    close: number,
    time: string,
}
export {OHLC_SIMPLE}

type TIME_PRICE = {
    time: number,
    value: number,
}
export {TIME_PRICE}

type OHLC_DETAILED_LIST = {
    interval: INTERVAL,
    intervalInfo: INTERVAL_DATA,
    trades: eth_contract_events[],
    ohlc: OHLC_DETAILED,
}
export {OHLC_DETAILED_LIST}

//endregion TYPES

export class eth_ohlc_tool {
    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`${this.name}|${method}|${msg}`);
            if(end) console.log(`${this.name}|${method}|${tools.LINE}`);
        }
    }

    //region UTILITIES
    public static getDefaultOhlcDetailed(): OHLC_DETAILED {
        return {
            open: "0.00",
            open_usd: "0.00",
            high: "0.00",
            high_usd: "0.00",
            low: "0.00",
            low_usd: "0.00",
            close: "0.00",
            close_usd: "0.00",

            volume_buy: "0.00",
            volume_buy_usd: "0.00",
            volume_sell: "0.00",
            volume_sell_usd: "0.00",
            volume: "0.00",
            volume_usd: "0.00",

            volume_token: "0",
            volume_token_buy: "0",
            volume_token_sell: "0",

            color: BAR_COLOR.GREEN,
            from_dateTime: "",
            from_time: 0,
            
            to_dateTime: "",
            to_time: 0
        };
    }
    public static getDefaultOhlc(): OHLC_SIMPLE {
        return {close: 0, high: 0, low: 0, open: 0, time: ""};
    }
    public static isGreen(ohlc: OHLC_SIMPLE | OHLC_DETAILED): boolean {
        const method = "isGreen";
        assert.isNumericString(ohlc.open,`${method} ohlc.open`);
        assert.isNumericString(ohlc.close,`${method} ohlc.close`);
        return tools.greaterThanOrEqualTo(ohlc.close,ohlc.open,`${method} close ${ohlc.close} >= open ${ohlc.open}`);
    }
    public static isRed(ohlc: OHLC_SIMPLE | OHLC_DETAILED): boolean {
        return !this.isGreen(ohlc);
    }
    public static getDefaultDecimal(): number {
        return 6;
    }
    public static convertDbToOhlcDetailed(ohlc_detail:ohlc_details):OHLC_DETAILED{
        const ohlc = this.getDefaultOhlcDetailed();
        ohlc.open = assert.isNumericString(ohlc_detail.open,`ohlc_detail(${ohlc_detail.id}).open(${ohlc_detail.open})`);
        ohlc.high = assert.isNumericString(ohlc_detail.high,`ohlc_detail(${ohlc_detail.id}).high(${ohlc_detail.high})`);
        ohlc.low = assert.isNumericString(ohlc_detail.low,`ohlc_detail(${ohlc_detail.id}).high(${ohlc_detail.low})`);
        ohlc.close = assert.isNumericString(ohlc_detail.close,`ohlc_detail(${ohlc_detail.id}).high(${ohlc_detail.close})`);

        ohlc.open_usd = assert.isNumericString(ohlc_detail.open_usd,`ohlc_detail(${ohlc_detail.id}).open_usd(${ohlc_detail.open_usd})`);
        ohlc.high_usd = assert.isNumericString(ohlc_detail.high_usd,`ohlc_detail(${ohlc_detail.id}).high_usd(${ohlc_detail.high_usd})`);
        ohlc.low_usd = assert.isNumericString(ohlc_detail.low_usd,`ohlc_detail(${ohlc_detail.id}).low_usd(${ohlc_detail.low_usd})`);
        ohlc.close_usd = assert.isNumericString(ohlc_detail.close_usd,`ohlc_detail(${ohlc_detail.id}).close_usd(${ohlc_detail.close_usd})`);

        ohlc.volume_buy = assert.isNumericString(ohlc_detail.volume_buy,`ohlc_detail(${ohlc_detail.id}).volume_buy(${ohlc_detail.volume_buy})`);
        ohlc.volume_sell = assert.isNumericString(ohlc_detail.volume_sell,`ohlc_detail(${ohlc_detail.id}).volume_sell(${ohlc_detail.volume_sell})`);
        ohlc.volume = assert.isNumericString(ohlc_detail.volume_total,`ohlc_detail(${ohlc_detail.id}).volume_total(${ohlc_detail.volume_total})`);

        ohlc.volume_buy_usd = assert.isNumericString(ohlc_detail.volume_buy_usd,`ohlc_detail(${ohlc_detail.id}).volume_buy_usd(${ohlc_detail.volume_buy_usd})`);
        ohlc.volume_sell_usd = assert.isNumericString(ohlc_detail.volume_sell_usd,`ohlc_detail(${ohlc_detail.id}).volume_sell_usd(${ohlc_detail.volume_sell_usd})`);
        ohlc.volume_usd = assert.isNumericString(ohlc_detail.volume_total_usd,`ohlc_detail(${ohlc_detail.id}).volume_total_usd(${ohlc_detail.volume_total_usd})`);

        ohlc.volume_token_buy = assert.isNumericString(ohlc_detail.volume_buy_token,`ohlc_detail(${ohlc_detail.id}).volume_buy_token(${ohlc_detail.volume_buy_token})`);
        ohlc.volume_token_sell = assert.isNumericString(ohlc_detail.volume_sell_token,`ohlc_detail(${ohlc_detail.id}).volume_sell_token(${ohlc_detail.volume_sell_token})`);
        ohlc.volume_token = assert.isNumericString(ohlc_detail.volume_total_token,`ohlc_detail(${ohlc_detail.id}).volume_token(${ohlc_detail.volume_total_token})`);

        if(this.isRed(ohlc)) ohlc.color = BAR_COLOR.RED;
        ohlc.from_time = ohlc_detail.from;
        ohlc.to_time = ohlc_detail.to;

        return ohlc;
    }
    //endregion UTILITIES

    //region GETTERS

    public static getOpen(tradeEvents: eth_contract_events[], usd_price:boolean = false): string {
        const method = "getOpen";
        let open = "0";
        if(tradeEvents.length > 0){
            const firstTradeEvent = tradeEvents[0];
            if(usd_price) open = assert.isNumericString(firstTradeEvent.token_usd,`${method} firstTradeEvent.token_usd`);
            else open = assert.isNumericString(firstTradeEvent.token_bnb,`${method} firstTradeEvent.token_bnb`);
        }
        return open;
    }

    public static getOpenUsd(tradeEvents: eth_contract_events[]): string {
        return this.getOpen(tradeEvents,true);
    }

    public static getClose(tradeEvents: eth_contract_events[], usd_price:boolean = false): string {
        const method = "getClose";
        let close = "0";
        if(tradeEvents.length > 0){
            const lastTradeEvent = tradeEvents[tradeEvents.length-1];
            if(usd_price) close = assert.isNumericString(lastTradeEvent.token_usd,`${method} lastTradeEvent.token_usd`);
            else close = assert.isNumericString(lastTradeEvent.token_bnb,`${method} lastTradeEvent.token_bnb`);
        }
        return close;
    }

    public static getCloseUsd(tradeEvents: eth_contract_events[]): string {
        return this.getClose(tradeEvents,true);
    }

    public static getHigh(tradeEvents: eth_contract_events[], usd_price:boolean = false): string {
        const method = "getHigh";
        let high = "0";
        for(const trade of tradeEvents){
            let checkPrice:string = "0";
            if(usd_price) checkPrice = assert.isNumericString(trade.token_usd,`${method} trade.token_usd`);
            else checkPrice = assert.isNumericString(trade.token_bnb,`${method} trade.token_bnb`);
            if(tools.greaterThan(checkPrice,high)) high = checkPrice;
        }
        return high;
    }

    public static getHighUsd(tradeEvents: eth_contract_events[]):string{
        return this.getHigh(tradeEvents,true);
    }

    public static getLow(tradeEvents: eth_contract_events[], usd_price:boolean = false): string {
        const method = "getLow";
        let lowest = "0";
        for (const trade of tradeEvents) {
            let checkPrice:string = "0";
            if(usd_price) checkPrice = assert.isNumericString(trade.token_usd,`${method} trade.token_usd`);
            else checkPrice = assert.isNumericString(trade.token_bnb,`${method} trade.token_bnb`);
            if(lowest === "0"){
                lowest = checkPrice;
            }
            else{
                if(tools.lesserThan(checkPrice,lowest)){
                    lowest = checkPrice;
                }
            }
        }
        return lowest;
    }

    public static getLowUsd(tradeEvents: eth_contract_events[]):string{
        return this.getLow(tradeEvents,true);
    }

    public static getSellVolume(tradeEvents: eth_contract_events[], usd_price:boolean = false): string {
        const method = "getSellVolume";
        let totalSellVolume = "0";
        for (const trade of tradeEvents) {
            if (trade.type === TRADE_TYPE.SELL) {
                let sellVolume:string = "0";
                if(usd_price) sellVolume = assert.isNumericString(trade.token_usd_value,`${method} trade.token_usd_valud`);
                else sellVolume = assert.isNumericString(trade.token_bnb_value,`${method} trade.token_bnb_value`);
                totalSellVolume = tools.add(totalSellVolume,sellVolume,18,`${method} adding totalSellVolume(${totalSellVolume}) and sellVolume(${sellVolume})`);
            }
        }
        return totalSellVolume;
    }

    public static getSellVolumeUsd(tradeEvents: eth_contract_events[]): string{
        return this.getSellVolume(tradeEvents,true);
    }

    public static getBuyVolume(tradeEvents: eth_contract_events[], usd_price:boolean = false): string {
        const method = "getBuyVolume";
        let totalBuyVolume = "0";
        for(const trade of tradeEvents){
            if (trade.type === TRADE_TYPE.BUY){
                let buyVolume:string = "0";
                if(usd_price) buyVolume = assert.isNumericString(trade.token_usd_value,`${method} trade.token_usd_value`);
                else buyVolume = assert.isNumericString(trade.token_bnb_value,`${method} trade.token_bnb_value`);
                totalBuyVolume = tools.add(totalBuyVolume,buyVolume,18,`${method} adding totalBuyVolume ${totalBuyVolume} buyVolume ${buyVolume}`);
            }
        }
        return totalBuyVolume;
    }
    
    public static getBuyVolumeUsd(tradeEvents: eth_contract_events[]): string{
        return this.getBuyVolume(tradeEvents,true);
    }

    public static getBuyVolumeToken(tradeEvents: eth_contract_events[]): string {
        const method = "getBuyVolumeToken";
        let totalBuyVolume = "0";
        for (const trade of tradeEvents) {
            if (trade.type === TRADE_TYPE.BUY) {
                const buyVolume:string = assert.isNumericString(trade.toAmountGross,`${method} trade.toAmountGross`);
                totalBuyVolume = tools.add(totalBuyVolume,buyVolume,18,`${method} adding totalBuyVolume(${totalBuyVolume}) and buyVolume(${buyVolume})`);
            }
        }
        return totalBuyVolume;
    }

    public static getSellVolumeToken(tradeEvents: eth_contract_events[]): string {
        const method = "getSellVolumeToken";
        let totalSellVolume = "0";
        for (const trade of tradeEvents) {
            if (trade.type === TRADE_TYPE.SELL) {
                const SellVolume:string = assert.isNumericString(trade.fromAmountGross,`${method} trade.fromAmountGross`);
                totalSellVolume = tools.add(totalSellVolume,SellVolume,18,`${method} adding totalSellVolume(${totalSellVolume}) and SellVolume(${SellVolume})`);
            }
        }
        return totalSellVolume;
    }

    public static getTotalVolume(tradeEvents: eth_contract_events[], usd_price:boolean = false): string {
        const method = "getTotalVolume";
        const totalBuyVolume = this.getBuyVolume(tradeEvents,usd_price);
        const totalSellVolume = this.getSellVolume(tradeEvents,usd_price);
        return tools.add(totalBuyVolume,totalSellVolume,18,`${method} totalBuyVolume ${totalBuyVolume} totalSellVolume ${totalSellVolume}`);
    }

    public static getTotalVolumeUsd(tradeEvents: eth_contract_events[]): string{
        return this.getTotalVolume(tradeEvents, true);
    }

    public static getTotalVolumeToken(tradeEvents: eth_contract_events[]): string{
        const method = "getTotalVolumeToken";
        const totalBuyVolume = this.getBuyVolumeToken(tradeEvents);
        const totalSellVolume = this.getSellVolumeToken(tradeEvents);
        return tools.add(totalBuyVolume,totalSellVolume,18,`${method} totalBuyVolume ${totalBuyVolume} totalSellVolume ${totalSellVolume}`);
    }

    public static getFromTimeInfo(tradeEvents: eth_contract_events[]): Dayjs {
        const method = "getFromTimeInfo";
        let oldestTime:number = 0;
        for (const trade of tradeEvents) {
            trade.block_time = assert.positiveInt(trade.block_time,`${method} trade.block_time`);
            if(oldestTime === 0){
                oldestTime = trade.block_time;
            }
            else{
                if(trade.block_time < oldestTime){
                    oldestTime = trade.block_time;
                }
            }
        }
        // if(oldestTime <= 0) throw new Error(`${method} unable to retrieve oldest time(${oldestTime}) from trade list(${tradeEvents.length})`);
        return time_helper.getTime(oldestTime,"UTC");
    }

    public static getToTimeInfo(tradeEvents: eth_contract_events[]): Dayjs {
        const method = "getToTimeInfo";
        let latestTime:number = 0;
        for (const trade of tradeEvents) {
            trade.block_time = assert.positiveInt(trade.block_time,`${method} trade.block_time`);
            if(latestTime === 0){
                latestTime = trade.block_time;
            }
            else{
                if(trade.block_time > latestTime){
                    latestTime = trade.block_time;
                }
            }
        }
        // if(latestTime <= 0) throw new Error(`${method} unable to retrieve latest time`);
        return time_helper.getTime(latestTime,"UTC");
    }

    public static async getLatestCandle(pair:string,interval:INTERVAL):Promise<ohlc_details>{
        const method = "getLatestCandle";
        assert.stringNotEmpty(pair,`pair(${pair})`);
        const latestBar = new ohlc_details();
        await latestBar.list(
            " WHERE pair=:pair AND ohlc_details.interval=:interval ",
            {pair:pair,interval:interval},
            " ORDER BY ohlc_details.from DESC LIMIT 1 ");
        return latestBar.getItem();
    }
    //endregion

    //region OHLC
    public static convertTradesToSingleOhlc(tradeEvents: eth_contract_events[], previousClose:number = 0, previousCloseUsd:number = 0): OHLC_DETAILED {
        const ohlc = this.getDefaultOhlcDetailed();
        ohlc.open = this.getOpen(tradeEvents);
        ohlc.open_usd = this.getOpenUsd(tradeEvents);
        ohlc.high = this.getHigh(tradeEvents);
        ohlc.high_usd = this.getHighUsd(tradeEvents);
        ohlc.low = this.getLow(tradeEvents);
        ohlc.low_usd = this.getLowUsd(tradeEvents);
        ohlc.close = this.getClose(tradeEvents);
        ohlc.close_usd = this.getCloseUsd(tradeEvents);
        ohlc.volume_buy = this.getBuyVolume(tradeEvents);
        ohlc.volume_buy_usd = this.getBuyVolumeUsd(tradeEvents);
        ohlc.volume_sell = this.getSellVolume(tradeEvents);
        ohlc.volume_sell_usd = this.getSellVolumeUsd(tradeEvents);
        ohlc.volume = this.getTotalVolume(tradeEvents);
        ohlc.volume_usd = this.getTotalVolumeUsd(tradeEvents);
        ohlc.volume_token_buy = this.getBuyVolumeToken(tradeEvents);
        ohlc.volume_token_sell = this.getSellVolumeToken(tradeEvents);
        ohlc.volume_token = this.getTotalVolumeToken(tradeEvents);


        const fromTimeInfo = this.getFromTimeInfo(tradeEvents);
        ohlc.from_time = fromTimeInfo.unix();
        ohlc.from_dateTime = fromTimeInfo.format(TIME_FORMATS.MYSQL_DATE_TIME);

        const toTimeInfo = this.getToTimeInfo(tradeEvents);
        ohlc.to_time = toTimeInfo.unix();
        ohlc.to_dateTime = toTimeInfo.format(TIME_FORMATS.MYSQL_DATE_TIME);

        if(previousClose > 0 || previousCloseUsd > 0){
            assert.positiveNumber(previousClose,`previousClose(${previousClose})`);
            assert.positiveNumber(previousCloseUsd,`previousCloseUsd(${previousCloseUsd})`);
            ohlc.open = String(previousClose);
            ohlc.open_usd = String(previousCloseUsd);

            if(tradeEvents.length === 0){
                ohlc.high = String(previousClose);
                ohlc.low = String(previousClose);
                ohlc.close = String(previousClose);
                ohlc.high_usd = String(previousCloseUsd);
                ohlc.low_usd = String(previousCloseUsd);
                ohlc.close_usd = String(previousCloseUsd);
            }
        }


        ohlc.color = this.isGreen(ohlc) ? BAR_COLOR.GREEN : BAR_COLOR.RED;
        return ohlc;
    }

    public static convertTradesToOhlcList(timeFrame: INTERVAL, tradeEvents: eth_contract_events[]): OHLC_DETAILED_LIST[] {
        const fromTimeInfo = this.getFromTimeInfo(tradeEvents);
        const toTimeInfo = this.getToTimeInfo(tradeEvents);
        const intervals = time_helper.getTimeIntervals(timeFrame, fromTimeInfo.unix(), toTimeInfo.unix(), "UTC");
        const ohlc_collection: OHLC_DETAILED_LIST[] = [];
        let lastPrice:number = 0;
        let lastPriceUsd:number = 0;
        for (const interval of intervals) {
            const ohlc_item: OHLC_DETAILED_LIST = {
                interval: timeFrame,
                intervalInfo: interval,
                trades: [],
                ohlc: this.getDefaultOhlcDetailed(),
            };

            for (const trade of tradeEvents as eth_contract_events[]) {
                trade.block_time = assert.positiveInt(trade.block_time);
                if (trade.block_time >= interval.from && trade.block_time <= interval.to) {
                    ohlc_item.trades.push(trade);
                }
            }
            ohlc_item.ohlc = this.convertTradesToSingleOhlc(ohlc_item.trades,lastPrice,lastPriceUsd);
            const closePrice = tools.parseNumber(ohlc_item.ohlc.close,`ohlc.close(${ohlc_item.ohlc.close})`);
            const closePriceUsd = tools.parseNumber(ohlc_item.ohlc.close_usd,`ohlc.close(${ohlc_item.ohlc.close_usd})`);
            if(closePrice > 0){
                lastPrice = closePrice;
                lastPriceUsd = closePriceUsd;
            }
            ohlc_collection.push(ohlc_item);
        }
        return ohlc_collection;
    }

    public static async getCandles(pair_contract:string, interval:INTERVAL, from:string|number, to:string|number):Promise<OHLC_DETAILED_LIST[]> {
        const method = "getCandles";
        // retrieve trade data from db between from and to
        from = time_helper.getTime(from,"UTC",`from ${from}`).unix();
        to = time_helper.getTime(to,"UTC",`to ${to}`).unix();
        const trades = new eth_contract_events();
        await trades.list(" WHERE pair_contract=:pair AND block_time>=:from AND block_time<=:to AND (type=:buy OR type=:sell) ",
            {pair:pair_contract,from:from,to:to,buy:"buy",sell:"sell"});
        if(trades.count() <= 0) throw new Error(`no trade data for ${pair_contract} from(${from}) to(${to})`);
        // convert trade data to ohlc
        return this.convertTradesToOhlcList(interval,trades._dataList as eth_contract_events[]);
    }

    //endregion OHLC

}