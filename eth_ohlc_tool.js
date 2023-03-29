"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_ohlc_tool = exports.BAR_COLOR = void 0;
const assert_1 = require("./assert");
const tools_1 = require("./tools");
const time_helper_1 = require("./time_helper");
const eth_contract_events_1 = require("./build/eth_contract_events");
const eth_worker_trade_1 = require("./eth_worker_trade");
const config_1 = require("./config");
//region TYPES
var BAR_COLOR;
(function (BAR_COLOR) {
    BAR_COLOR["RED"] = "red";
    BAR_COLOR["GREEN"] = "green";
})(BAR_COLOR || (BAR_COLOR = {}));
exports.BAR_COLOR = BAR_COLOR;
//endregion TYPES
class eth_ohlc_tool {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`${this.name}|${method}|${msg}`);
            if (end)
                console.log(`${this.name}|${method}|${tools_1.tools.LINE}`);
        }
    }
    //region UTILITIES
    static getDefaultOhlcDetailed() {
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
    static getDefaultOhlc() {
        return { close: 0, high: 0, low: 0, open: 0, time: "" };
    }
    static isGreen(ohlc) {
        const method = "isGreen";
        assert_1.assert.isNumericString(ohlc.open, `${method} ohlc.open`);
        assert_1.assert.isNumericString(ohlc.close, `${method} ohlc.close`);
        return tools_1.tools.greaterThanOrEqualTo(ohlc.close, ohlc.open, `${method} close ${ohlc.close} >= open ${ohlc.open}`);
    }
    static isRed(ohlc) {
        return !this.isGreen(ohlc);
    }
    static getDefaultDecimal() {
        return 6;
    }
    //endregion UTILITIES
    //region GETTERS
    static getOpen(tradeEvents, usd_price = false) {
        const method = "getOpen";
        let open = "0";
        if (tradeEvents.length > 0) {
            const firstTradeEvent = tradeEvents[0];
            if (usd_price)
                open = assert_1.assert.isNumericString(firstTradeEvent.token_usd, `${method} firstTradeEvent.token_usd`);
            else
                open = assert_1.assert.isNumericString(firstTradeEvent.token_bnb, `${method} firstTradeEvent.token_bnb`);
        }
        return open;
    }
    static getOpenUsd(tradeEvents) {
        return this.getOpen(tradeEvents, true);
    }
    static getClose(tradeEvents, usd_price = false) {
        const method = "getClose";
        let close = "0";
        if (tradeEvents.length > 0) {
            const lastTradeEvent = tradeEvents[tradeEvents.length - 1];
            if (usd_price)
                close = assert_1.assert.isNumericString(lastTradeEvent.token_usd, `${method} lastTradeEvent.token_usd`);
            else
                close = assert_1.assert.isNumericString(lastTradeEvent.token_bnb, `${method} lastTradeEvent.token_bnb`);
        }
        return close;
    }
    static getCloseUsd(tradeEvents) {
        return this.getClose(tradeEvents, true);
    }
    static getHigh(tradeEvents, usd_price = false) {
        const method = "getHigh";
        let high = "0";
        for (const trade of tradeEvents) {
            let checkPrice = "0";
            if (usd_price)
                checkPrice = assert_1.assert.isNumericString(trade.token_usd, `${method} trade.token_usd`);
            else
                checkPrice = assert_1.assert.isNumericString(trade.token_bnb, `${method} trade.token_bnb`);
            if (tools_1.tools.greaterThan(checkPrice, high))
                high = checkPrice;
        }
        return high;
    }
    static getHighUsd(tradeEvents) {
        return this.getHigh(tradeEvents, true);
    }
    static getLow(tradeEvents, usd_price = false) {
        const method = "getLow";
        let lowest = "0";
        for (const trade of tradeEvents) {
            let checkPrice = "0";
            if (usd_price)
                checkPrice = assert_1.assert.isNumericString(trade.token_usd, `${method} trade.token_usd`);
            else
                checkPrice = assert_1.assert.isNumericString(trade.token_bnb, `${method} trade.token_bnb`);
            if (lowest === "0") {
                lowest = checkPrice;
            }
            else {
                if (tools_1.tools.lesserThan(checkPrice, lowest)) {
                    lowest = checkPrice;
                }
            }
        }
        return lowest;
    }
    static getLowUsd(tradeEvents) {
        return this.getLow(tradeEvents, true);
    }
    static getSellVolume(tradeEvents, usd_price = false) {
        const method = "getSellVolume";
        let totalSellVolume = "0";
        for (const trade of tradeEvents) {
            if (trade.type === eth_worker_trade_1.TRADE_TYPE.SELL) {
                let sellVolume = "0";
                if (usd_price)
                    sellVolume = assert_1.assert.isNumericString(trade.token_usd_value, `${method} trade.token_usd_valud`);
                else
                    sellVolume = assert_1.assert.isNumericString(trade.token_bnb_value, `${method} trade.token_bnb_value`);
                totalSellVolume = tools_1.tools.add(totalSellVolume, sellVolume, 18, `${method} adding totalSellVolume(${totalSellVolume}) and sellVolume(${sellVolume})`);
            }
        }
        return totalSellVolume;
    }
    static getSellVolumeUsd(tradeEvents) {
        return this.getSellVolume(tradeEvents, true);
    }
    static getBuyVolume(tradeEvents, usd_price = false) {
        const method = "getBuyVolume";
        let totalBuyVolume = "0";
        for (const trade of tradeEvents) {
            if (trade.type === eth_worker_trade_1.TRADE_TYPE.BUY) {
                let buyVolume = "0";
                if (usd_price)
                    buyVolume = assert_1.assert.isNumericString(trade.token_usd_value, `${method} trade.token_usd_value`);
                else
                    buyVolume = assert_1.assert.isNumericString(trade.token_bnb_value, `${method} trade.token_bnb_value`);
                totalBuyVolume = tools_1.tools.add(totalBuyVolume, buyVolume, 18, `${method} adding totalBuyVolume ${totalBuyVolume} buyVolume ${buyVolume}`);
            }
        }
        return totalBuyVolume;
    }
    static getBuyVolumeUsd(tradeEvents) {
        return this.getBuyVolume(tradeEvents, true);
    }
    static getBuyVolumeToken(tradeEvents) {
        const method = "getBuyVolumeToken";
        let totalBuyVolume = "0";
        for (const trade of tradeEvents) {
            if (trade.type === eth_worker_trade_1.TRADE_TYPE.BUY) {
                const buyVolume = assert_1.assert.isNumericString(trade.toAmountGross, `${method} trade.toAmountGross`);
                totalBuyVolume = tools_1.tools.add(totalBuyVolume, buyVolume, 18, `${method} adding totalBuyVolume(${totalBuyVolume}) and buyVolume(${buyVolume})`);
            }
        }
        return totalBuyVolume;
    }
    static getSellVolumeToken(tradeEvents) {
        const method = "getSellVolumeToken";
        let totalSellVolume = "0";
        for (const trade of tradeEvents) {
            if (trade.type === eth_worker_trade_1.TRADE_TYPE.SELL) {
                const SellVolume = assert_1.assert.isNumericString(trade.fromAmountGross, `${method} trade.fromAmountGross`);
                totalSellVolume = tools_1.tools.add(totalSellVolume, SellVolume, 18, `${method} adding totalSellVolume(${totalSellVolume}) and SellVolume(${SellVolume})`);
            }
        }
        return totalSellVolume;
    }
    static getTotalVolume(tradeEvents, usd_price = false) {
        const method = "getTotalVolume";
        const totalBuyVolume = this.getBuyVolume(tradeEvents, usd_price);
        const totalSellVolume = this.getSellVolume(tradeEvents, usd_price);
        return tools_1.tools.add(totalBuyVolume, totalSellVolume, 18, `${method} totalBuyVolume ${totalBuyVolume} totalSellVolume ${totalSellVolume}`);
    }
    static getTotalVolumeUsd(tradeEvents) {
        return this.getTotalVolume(tradeEvents, true);
    }
    static getTotalVolumeToken(tradeEvents) {
        const method = "getTotalVolumeToken";
        const totalBuyVolume = this.getBuyVolumeToken(tradeEvents);
        const totalSellVolume = this.getSellVolumeToken(tradeEvents);
        return tools_1.tools.add(totalBuyVolume, totalSellVolume, 18, `${method} totalBuyVolume ${totalBuyVolume} totalSellVolume ${totalSellVolume}`);
    }
    static getFromTimeInfo(tradeEvents) {
        const method = "getFromTimeInfo";
        let oldestTime = 0;
        for (const trade of tradeEvents) {
            trade.block_time = assert_1.assert.positiveInt(trade.block_time, `${method} trade.block_time`);
            if (oldestTime === 0) {
                oldestTime = trade.block_time;
            }
            else {
                if (trade.block_time < oldestTime) {
                    oldestTime = trade.block_time;
                }
            }
        }
        // if(oldestTime <= 0) throw new Error(`${method} unable to retrieve oldest time(${oldestTime}) from trade list(${tradeEvents.length})`);
        return time_helper_1.time_helper.getTime(oldestTime, "UTC");
    }
    static getToTimeInfo(tradeEvents) {
        const method = "getToTimeInfo";
        let latestTime = 0;
        for (const trade of tradeEvents) {
            trade.block_time = assert_1.assert.positiveInt(trade.block_time, `${method} trade.block_time`);
            if (latestTime === 0) {
                latestTime = trade.block_time;
            }
            else {
                if (trade.block_time > latestTime) {
                    latestTime = trade.block_time;
                }
            }
        }
        // if(latestTime <= 0) throw new Error(`${method} unable to retrieve latest time`);
        return time_helper_1.time_helper.getTime(latestTime, "UTC");
    }
    //endregion
    //region OHLC
    static convertTradesToSingleOhlc(tradeEvents, previousClose = 0, previousCloseUsd = 0) {
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
        ohlc.from_dateTime = fromTimeInfo.format(time_helper_1.TIME_FORMATS.MYSQL_DATE_TIME);
        const toTimeInfo = this.getToTimeInfo(tradeEvents);
        ohlc.to_time = toTimeInfo.unix();
        ohlc.to_dateTime = toTimeInfo.format(time_helper_1.TIME_FORMATS.MYSQL_DATE_TIME);
        if (previousClose > 0 || previousCloseUsd > 0) {
            assert_1.assert.positiveNumber(previousClose, `previousClose(${previousClose})`);
            assert_1.assert.positiveNumber(previousCloseUsd, `previousCloseUsd(${previousCloseUsd})`);
            ohlc.open = String(previousClose);
            ohlc.open_usd = String(previousCloseUsd);
            if (tradeEvents.length === 0) {
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
    static convertTradesToOhlcList(timeFrame, tradeEvents) {
        const fromTimeInfo = this.getFromTimeInfo(tradeEvents);
        const toTimeInfo = this.getToTimeInfo(tradeEvents);
        const intervals = time_helper_1.time_helper.getTimeIntervals(timeFrame, fromTimeInfo.unix(), toTimeInfo.unix(), "UTC");
        const ohlc_collection = [];
        let lastPrice = 0;
        let lastPriceUsd = 0;
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
            ohlc_item.ohlc = this.convertTradesToSingleOhlc(ohlc_item.trades, lastPrice, lastPriceUsd);
            const closePrice = tools_1.tools.parseNumber(ohlc_item.ohlc.close, `ohlc.close(${ohlc_item.ohlc.close})`);
            const closePriceUsd = tools_1.tools.parseNumber(ohlc_item.ohlc.close_usd, `ohlc.close(${ohlc_item.ohlc.close_usd})`);
            if (closePrice > 0) {
                lastPrice = closePrice;
                lastPriceUsd = closePriceUsd;
            }
            ohlc_collection.push(ohlc_item);
        }
        return ohlc_collection;
    }
    static async getCandles(pair_contract, interval, from, to) {
        const method = "getCandles";
        // retrieve trade data from db between from and to
        from = time_helper_1.time_helper.getTime(from, "UTC", `from ${from}`).unix();
        to = time_helper_1.time_helper.getTime(to, "UTC", `to ${to}`).unix();
        const trades = new eth_contract_events_1.eth_contract_events();
        await trades.list(" WHERE pair_contract=:pair AND block_time>=:from AND block_time<=:to AND (type=:buy OR type=:sell) ", { pair: pair_contract, from: from, to: to, buy: "buy", sell: "sell" });
        if (trades.count() <= 0)
            throw new Error(`no trade data for ${pair_contract} from(${from}) to(${to})`);
        // convert trade data to ohlc
        return this.convertTradesToOhlcList(interval, trades._dataList);
    }
}
exports.eth_ohlc_tool = eth_ohlc_tool;
//# sourceMappingURL=eth_ohlc_tool.js.map