import { assert } from "./assert";
import { tools } from "./tools";
import {eth_worker_price} from "./eth_worker_price";
import {eth_price_track_details} from "./build/eth_price_track_details";
import {INTERVAL, INTERVAL_DATA, TIME_FORMATS, time_helper} from "./time_helper";
import {eth_contract_events} from "./build/eth_contract_events";
import {TRADE_TYPE} from "./eth_worker_trade";
import {Dayjs} from "dayjs";

//region TYPES
enum BAR_COLOR {
    RED = "red",
    GREEN = "green",
}
export { BAR_COLOR }

type OHLC_DETAILED = {
    open:number,
    high:number,
    low:number,
    close:number,
    color:BAR_COLOR,
    volume_sell:number,
    volume_buy:number,
    volume:number,
    from_time:number,
    from_dateTime:string,
    to_time:number,
    to_dateTime:string,
}
export { OHLC_DETAILED }

type OHLC_SIMPLE = {
    open:number,
    high:number,
    low:number,
    close:number,
    time:string,
}
export { OHLC_SIMPLE }

type TIME_PRICE = {
    time:number,
    value:number,
}
export { TIME_PRICE }

type OHLC_DETAILED_LIST = {
    interval:INTERVAL,
    intervalInfo:INTERVAL_DATA,
    trades:eth_contract_events[],
    ohlc:OHLC_DETAILED,
}
export { OHLC_DETAILED_LIST }
//endregion TYPES

export class eth_ohlc_tool{

    //region UTILITIES
    public static getDefaultOhlcDetailed():OHLC_DETAILED{
        return {
            close: 0,
            color: BAR_COLOR.GREEN,
            from_dateTime: "",
            from_time: 0,
            high: 0,
            low: 0,
            open: 0,
            to_dateTime: "",
            to_time: 0,
            volume: 0,
            volume_buy: 0,
            volume_sell: 0
        };
    }
    public static getDefaultOhlc():OHLC_SIMPLE{
        return {close: 0, high: 0, low: 0, open: 0, time: ""};
    }
    public static isGreen(ohlc:OHLC_SIMPLE|OHLC_DETAILED):boolean{
        return ohlc.close >= ohlc.open
    }
    public static isRed(ohlc:OHLC_SIMPLE|OHLC_DETAILED):boolean{
        return !this.isGreen(ohlc);
    }
    public static getDefaultDecimal():number{
        return 6;
    }
    //endregion UTILITIES

    //region GETTERS
    public static getOpen(tradeEvents:eth_contract_events[]):number{
        if(tradeEvents.length === 0) return 0;
        const open = tradeEvents[0].token_usd_value;
        return tools.getNumber(open,this.getDefaultDecimal());
    }
    public static getClose(tradeEvents:eth_contract_events[]):number{
        if(tradeEvents.length === 0) return 0;
        const close = tradeEvents[tradeEvents.length-1].token_usd_value;
        return tools.getNumber(close,this.getDefaultDecimal());
    }
    public static getHigh(tradeEvents:eth_contract_events[]):number{
        if(tradeEvents.length === 0) return 0;
        let high:number|null = null;
        for(const trade of tradeEvents as eth_contract_events[]){
            const token_usd_value = tools.getNumber(trade.token_usd_value,this.getDefaultDecimal());
            if(high === null){
                high = token_usd_value;
            }
            else{
                if(token_usd_value > high) high = token_usd_value;
            }
        }
        if(high === null) throw new Error(`unable to retrieve highest usd price`);
        return high;
    }
    public static getLow(tradeEvents:eth_contract_events[]):number{
        if(tradeEvents.length === 0) return 0;
        let low:number|null = null;
        for(const trade of tradeEvents as eth_contract_events[]){
            const token_usd_value = tools.getNumber(trade.token_usd_value,this.getDefaultDecimal());
            if(low === null){
                low = token_usd_value;
            }
            else{
                if(token_usd_value < low) low = token_usd_value;
            }
        }
        if(low === null) throw new Error(`unable to retrieve lowest usd price`);
        return low;
    }
    public static getSellVolume(tradeEvents:eth_contract_events[]):number{
        let totalSellBn = tools.toBn(0);
        for(const trade of tradeEvents as eth_contract_events[]){
            if(trade.type === TRADE_TYPE.SELL){
                const token_usd_value = tools.getNumber(trade.token_usd_value,this.getDefaultDecimal());
                totalSellBn = totalSellBn.plus(tools.toBn(token_usd_value));
            }
        }
        const totalSellString = totalSellBn.toFixed(this.getDefaultDecimal());
        return tools.getNumber(totalSellString,this.getDefaultDecimal());
    }
    public static getBuyVolume(tradeEvents:eth_contract_events[]):number{
        let totalBuyBn = tools.toBn(0);
        for(const trade of tradeEvents as eth_contract_events[]){
            if(trade.type === TRADE_TYPE.BUY){
                const token_usd_value = tools.getNumber(trade.token_usd_value,this.getDefaultDecimal());
                totalBuyBn = totalBuyBn.plus(tools.toBn(token_usd_value));
            }
        }
        const totalBuyString = totalBuyBn.toFixed(this.getDefaultDecimal());
        return tools.getNumber(totalBuyString,this.getDefaultDecimal());
    }
    public static getTotalVolume(tradeEvents:eth_contract_events[]):number{
        return this.getBuyVolume(tradeEvents) + this.getSellVolume(tradeEvents);
    }
    public static getFromTimeInfo(tradeEvents:eth_contract_events[]):Dayjs{
        let fromTime:Dayjs|false = false;
        for(const trade of tradeEvents as eth_contract_events[]){
            const blockTimeInfo = time_helper.getTime(trade.block_time,"UTC");
            if(!fromTime){
                fromTime = blockTimeInfo;
            }
            else{
                if(blockTimeInfo.unix() < fromTime.unix()){
                    fromTime = blockTimeInfo;
                }
            }
        }
        if(!fromTime) throw new Error(`unable to retrieve fromTime info from tradeEvents`);
        return fromTime;
    }
    public static getToTimeInfo(tradeEvents:eth_contract_events[]):Dayjs{
        let toTime:Dayjs|false = false;
        for(const trade of tradeEvents as eth_contract_events[]){
            const blockTimeInfo = time_helper.getTime(trade.block_time,"UTC");
            if(!toTime){
                toTime = blockTimeInfo;
            }
            else{
                if(blockTimeInfo.unix() > toTime.unix()){
                    toTime = blockTimeInfo;
                }
            }
        }
        if(!toTime) throw new Error(`unable to retrieve toTIme info from tradeEvents`);
        return toTime;
    }
    //endregion

    //region OHLC
    public static generateDetailedOhlc(tradeEvents:eth_contract_events[]):OHLC_DETAILED{
        const ohlc = this.getDefaultOhlcDetailed();
        ohlc.open = this.getOpen(tradeEvents);
        ohlc.high = this.getHigh(tradeEvents);
        ohlc.low = this.getLow(tradeEvents);
        ohlc.close = this.getClose(tradeEvents);
        ohlc.volume_buy = this.getBuyVolume(tradeEvents);
        ohlc.volume_sell = this.getSellVolume(tradeEvents);
        ohlc.volume = this.getTotalVolume(tradeEvents);
        const fromTimeInfo = this.getFromTimeInfo(tradeEvents);
        if(fromTimeInfo){
            ohlc.from_time = fromTimeInfo.unix();
            ohlc.from_dateTime = fromTimeInfo.format(TIME_FORMATS.MYSQL_DATE_TIME);
        }
        const toTimeInfo = this.getToTimeInfo(tradeEvents);
        if(toTimeInfo){
            ohlc.to_time = toTimeInfo.unix();
            ohlc.to_dateTime = toTimeInfo.format(TIME_FORMATS.MYSQL_DATE_TIME);
        }
        ohlc.color = this.isGreen(ohlc) ? BAR_COLOR.GREEN : BAR_COLOR.RED;
        return ohlc;
    }
    public static generateOhlcList(timeFrame:INTERVAL, tradeEvents:eth_contract_events[]):OHLC_DETAILED_LIST[]{
        const fromTimeInfo = this.getFromTimeInfo(tradeEvents);
        const toTimeInfo = this.getToTimeInfo(tradeEvents);
        const intervals = time_helper.getTimeIntervals(timeFrame,fromTimeInfo.unix(),toTimeInfo.unix(),"UTC");
        const ohlc_collection:OHLC_DETAILED_LIST[] = [];
        for(const interval of intervals as INTERVAL_DATA[]){
            const ohlc_item:OHLC_DETAILED_LIST = {
                interval: timeFrame,
                intervalInfo: interval,
                trades:[],
                ohlc:this.getDefaultOhlcDetailed(),
            };
            for(const trade of tradeEvents as eth_contract_events[]){
                trade.block_time = assert.positiveInt(trade.block_time);
                if(trade.block_time >= interval.from && trade.block_time <= interval.to){
                    ohlc_item.trades.push(trade);
                }
            }
            ohlc_item.ohlc = this.generateDetailedOhlc(ohlc_item.trades);
            ohlc_collection.push(ohlc_item);
        }
        return ohlc_collection;
    }
    //endregion OHLC

}