"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_ohlc_tool = exports.BAR_COLOR = void 0;
const assert_1 = require("./assert");
const tools_1 = require("./tools");
const time_helper_1 = require("./time_helper");
const eth_worker_trade_1 = require("./eth_worker_trade");
//region TYPES
var BAR_COLOR;
(function (BAR_COLOR) {
    BAR_COLOR["RED"] = "red";
    BAR_COLOR["GREEN"] = "green";
})(BAR_COLOR || (BAR_COLOR = {}));
exports.BAR_COLOR = BAR_COLOR;
//endregion TYPES
class eth_ohlc_tool {
    //region UTILITIES
    static getDefaultOhlcDetailed() {
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
    static getDefaultOhlc() {
        return { close: 0, high: 0, low: 0, open: 0, time: "" };
    }
    static isGreen(ohlc) {
        return ohlc.close >= ohlc.open;
    }
    static isRed(ohlc) {
        return !this.isGreen(ohlc);
    }
    static getDefaultDecimal() {
        return 6;
    }
    //endregion UTILITIES
    //region GETTERS
    static getOpen(tradeEvents) {
        if (tradeEvents.length === 0)
            return 0;
        const open = tradeEvents[0].token_usd_value;
        return tools_1.tools.getNumber(open, this.getDefaultDecimal());
    }
    static getClose(tradeEvents) {
        if (tradeEvents.length === 0)
            return 0;
        const close = tradeEvents[tradeEvents.length - 1].token_usd_value;
        return tools_1.tools.getNumber(close, this.getDefaultDecimal());
    }
    static getHigh(tradeEvents) {
        if (tradeEvents.length === 0)
            return 0;
        let high = null;
        for (const trade of tradeEvents) {
            const token_usd_value = tools_1.tools.getNumber(trade.token_usd_value, this.getDefaultDecimal());
            if (high === null) {
                high = token_usd_value;
            }
            else {
                if (token_usd_value > high)
                    high = token_usd_value;
            }
        }
        if (high === null)
            throw new Error(`unable to retrieve highest usd price`);
        return high;
    }
    static getLow(tradeEvents) {
        if (tradeEvents.length === 0)
            return 0;
        let low = null;
        for (const trade of tradeEvents) {
            const token_usd_value = tools_1.tools.getNumber(trade.token_usd_value, this.getDefaultDecimal());
            if (low === null) {
                low = token_usd_value;
            }
            else {
                if (token_usd_value < low)
                    low = token_usd_value;
            }
        }
        if (low === null)
            throw new Error(`unable to retrieve lowest usd price`);
        return low;
    }
    static getSellVolume(tradeEvents) {
        let totalSellBn = tools_1.tools.toBn(0);
        for (const trade of tradeEvents) {
            if (trade.type === eth_worker_trade_1.TRADE_TYPE.SELL) {
                const token_usd_value = tools_1.tools.getNumber(trade.token_usd_value, this.getDefaultDecimal());
                totalSellBn = totalSellBn.plus(tools_1.tools.toBn(token_usd_value));
            }
        }
        const totalSellString = totalSellBn.toFixed(this.getDefaultDecimal());
        return tools_1.tools.getNumber(totalSellString, this.getDefaultDecimal());
    }
    static getBuyVolume(tradeEvents) {
        let totalBuyBn = tools_1.tools.toBn(0);
        for (const trade of tradeEvents) {
            if (trade.type === eth_worker_trade_1.TRADE_TYPE.BUY) {
                const token_usd_value = tools_1.tools.getNumber(trade.token_usd_value, this.getDefaultDecimal());
                totalBuyBn = totalBuyBn.plus(tools_1.tools.toBn(token_usd_value));
            }
        }
        const totalBuyString = totalBuyBn.toFixed(this.getDefaultDecimal());
        return tools_1.tools.getNumber(totalBuyString, this.getDefaultDecimal());
    }
    static getTotalVolume(tradeEvents) {
        return this.getBuyVolume(tradeEvents) + this.getSellVolume(tradeEvents);
    }
    static getFromTimeInfo(tradeEvents) {
        let fromTime = false;
        for (const trade of tradeEvents) {
            const blockTimeInfo = time_helper_1.time_helper.getTime(trade.block_time, "UTC");
            if (!fromTime) {
                fromTime = blockTimeInfo;
            }
            else {
                if (blockTimeInfo.unix() < fromTime.unix()) {
                    fromTime = blockTimeInfo;
                }
            }
        }
        if (!fromTime)
            throw new Error(`unable to retrieve fromTime info from tradeEvents`);
        return fromTime;
    }
    static getToTimeInfo(tradeEvents) {
        let toTime = false;
        for (const trade of tradeEvents) {
            const blockTimeInfo = time_helper_1.time_helper.getTime(trade.block_time, "UTC");
            if (!toTime) {
                toTime = blockTimeInfo;
            }
            else {
                if (blockTimeInfo.unix() > toTime.unix()) {
                    toTime = blockTimeInfo;
                }
            }
        }
        if (!toTime)
            throw new Error(`unable to retrieve toTIme info from tradeEvents`);
        return toTime;
    }
    //endregion
    //region OHLC
    static generateDetailedOhlc(tradeEvents) {
        const ohlc = this.getDefaultOhlcDetailed();
        ohlc.open = this.getOpen(tradeEvents);
        ohlc.high = this.getHigh(tradeEvents);
        ohlc.low = this.getLow(tradeEvents);
        ohlc.close = this.getClose(tradeEvents);
        ohlc.volume_buy = this.getBuyVolume(tradeEvents);
        ohlc.volume_sell = this.getSellVolume(tradeEvents);
        ohlc.volume = this.getTotalVolume(tradeEvents);
        const fromTimeInfo = this.getFromTimeInfo(tradeEvents);
        if (fromTimeInfo) {
            ohlc.from_time = fromTimeInfo.unix();
            ohlc.from_dateTime = fromTimeInfo.format(time_helper_1.TIME_FORMATS.MYSQL_DATE_TIME);
        }
        const toTimeInfo = this.getToTimeInfo(tradeEvents);
        if (toTimeInfo) {
            ohlc.to_time = toTimeInfo.unix();
            ohlc.to_dateTime = toTimeInfo.format(time_helper_1.TIME_FORMATS.MYSQL_DATE_TIME);
        }
        ohlc.color = this.isGreen(ohlc) ? BAR_COLOR.GREEN : BAR_COLOR.RED;
        return ohlc;
    }
    static generateOhlcList(timeFrame, tradeEvents) {
        const fromTimeInfo = this.getFromTimeInfo(tradeEvents);
        const toTimeInfo = this.getToTimeInfo(tradeEvents);
        const intervals = time_helper_1.time_helper.getTimeIntervals(timeFrame, fromTimeInfo.unix(), toTimeInfo.unix(), "UTC");
        const ohlc_collection = [];
        for (const interval of intervals) {
            const ohlc_item = {
                interval: timeFrame,
                intervalInfo: interval,
                trades: [],
                ohlc: this.getDefaultOhlcDetailed(),
            };
            for (const trade of tradeEvents) {
                trade.block_time = assert_1.assert.positiveInt(trade.block_time);
                if (trade.block_time >= interval.from && trade.block_time <= interval.to) {
                    ohlc_item.trades.push(trade);
                }
            }
            ohlc_item.ohlc = this.generateDetailedOhlc(ohlc_item.trades);
            ohlc_collection.push(ohlc_item);
        }
        return ohlc_collection;
    }
}
exports.eth_ohlc_tool = eth_ohlc_tool;
//# sourceMappingURL=eth_ohlc_tool.js.map