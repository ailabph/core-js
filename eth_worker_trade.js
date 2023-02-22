"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_worker_trade = exports.TRADE_TYPE = exports.POSITION_TYPE = void 0;
const eth_worker_price_1 = require("./eth_worker_price");
const assert_1 = require("./assert");
const eth_config_1 = require("./eth_config");
const eth_worker_1 = require("./eth_worker");
const tools_1 = require("./tools");
var POSITION_TYPE;
(function (POSITION_TYPE) {
    POSITION_TYPE["OPEN"] = "open";
    POSITION_TYPE["CLOSE"] = "close";
})(POSITION_TYPE || (POSITION_TYPE = {}));
exports.POSITION_TYPE = POSITION_TYPE;
var TRADE_TYPE;
(function (TRADE_TYPE) {
    TRADE_TYPE["BUY"] = "buy";
    TRADE_TYPE["SELL"] = "sell";
    TRADE_TYPE["NOT_SET"] = "not_set";
})(TRADE_TYPE || (TRADE_TYPE = {}));
exports.TRADE_TYPE = TRADE_TYPE;
class eth_worker_trade {
    // public static async getPendingTradeRequest():Promise<eth_trade|boolean>{
    //     const pending = new eth_trade();
    //     await pending.list(" WHERE  ");
    // }
    static async swap(srcToken, destToken) { }
    static async swapBuy() { }
    static async swapSell() { }
    static async getTokenBalance() { }
    static async getBnbBalance() { }
    static getTradeType(swapLog, of_token) {
        let tradeType;
        if (swapLog.amount0Out > 0) {
            if (!(swapLog.amount1In > 0))
                throw new Error(`buy type but no token1 in`);
            tradeType = TRADE_TYPE.BUY;
        }
        else if (swapLog.amount0In > 0) {
            if (!(swapLog.amount1Out > 0))
                throw new Error(`sell type but no token1 out`);
            tradeType = TRADE_TYPE.SELL;
        }
        else if ((swapLog.amount0In > 0 && swapLog.amount1In > 0)
            || (swapLog.amount1In > 0 && swapLog.amount1Out > 0)) {
            console.log(swapLog);
            throw new Error(`abnormal swap behaviour. both token0 and token1 are swapped at the same time`);
        }
        if (typeof tradeType === "undefined")
            throw new Error(`unable to recognize trade type`);
        return tradeType;
    }
    static getDefaultBaseQuoteAmount() {
        return {
            token0_value: "0",
            token1_value: "0",
            dateTime_traded: "",
            time_traded: 0,
            token0_amount: "",
            token0_contract: "",
            token0_decimal: 0,
            token0_symbol: "",
            token1_amount: "",
            token1_contract: "",
            token1_decimal: 0,
            token1_symbol: "",
            trade_type: TRADE_TYPE.NOT_SET,
            usd_value: ""
        };
    }
    static async getBaseQuoteAmount(swapLog, blockTime) {
        const pairInfo = await eth_worker_price_1.eth_worker_price.getPairInfo(swapLog.ContractInfo.address);
        const result = this.getDefaultBaseQuoteAmount();
        // result.trade_type = this.getTradeType(swapLog);
        result.token0_contract = pairInfo.token0_contract;
        result.token0_decimal = pairInfo.token0_decimal;
        result.token0_symbol = pairInfo.token0_symbol;
        result.token1_contract = pairInfo.token1_contract;
        result.token1_decimal = pairInfo.token1_decimal;
        result.token1_symbol = pairInfo.token1_symbol;
        const timeInfo = tools_1.tools.getTime(assert_1.assert.positiveInt(blockTime));
        result.dateTime_traded = timeInfo.format();
        result.trade_type = this.getTradeType(swapLog, result.token0_contract);
        if (result.trade_type === TRADE_TYPE.BUY) {
            result.token0_value = swapLog.amount0Out.toString();
            result.token1_value = swapLog.amount1In.toString();
        }
        else if (result.trade_type === TRADE_TYPE.SELL) {
            result.token0_value = swapLog.amount0In.toString();
            result.token1_value = swapLog.amount1Out.toString();
        }
        else {
            throw new Error(`trade_type not established`);
        }
        result.token0_amount = eth_worker_1.eth_worker.convertValueToAmount(result.token0_value, pairInfo.token0_decimal);
        result.token1_amount = eth_worker_1.eth_worker.convertValueToAmount(result.token1_value, pairInfo.token1_decimal);
        if (result.token1_contract.toLowerCase() === eth_config_1.eth_config.getEthContract().toLowerCase()) {
            const bnb_usd_price = await eth_worker_price_1.eth_worker_price.getBnbUsdPrice(blockTime);
            result.usd_value = tools_1.tools.toBn(bnb_usd_price).multipliedBy(result.token1_amount).toFixed(18);
        }
        if (result.token1_contract.toLowerCase() === eth_config_1.eth_config.getBusdContract().toLowerCase()) {
            result.usd_value = result.token1_amount;
        }
        if (!(tools_1.tools.getNumber(result.token0_amount) > 0) || !(tools_1.tools.getNumber(result.token1_amount) > 0))
            throw new Error(`token0_amount(${result.token0_amount}) or token1_amount(${result.token1_amount}) must be greater than zero`);
        return result;
    }
    static getDefaultTradePairInfo() {
        return {
            bnb_usd_price: "",
            bnb_value: "",
            from_amount: "",
            from_contract: "",
            from_decimal: 0,
            from_symbol: "",
            from_value: "",
            tax_amount: "",
            tax_perc: "",
            to_amount: "",
            to_contract: "",
            to_decimal: 0,
            to_symbol: "",
            to_value: "",
            trade_type: TRADE_TYPE.NOT_SET,
            usd_price: "",
            usd_value: ""
        };
    }
    static async getTradeInfo(baseQuoteInfo) {
        const tradePairInfo = this.getDefaultTradePairInfo();
        if (baseQuoteInfo.trade_type === TRADE_TYPE.NOT_SET)
            throw new Error(`trade type not set`);
        if (baseQuoteInfo.trade_type === TRADE_TYPE.BUY) {
            tradePairInfo.from_contract = baseQuoteInfo.token1_contract;
            tradePairInfo.from_decimal = baseQuoteInfo.token1_decimal;
            tradePairInfo.from_symbol = baseQuoteInfo.token1_symbol;
            tradePairInfo.from_amount = baseQuoteInfo.token1_amount;
            tradePairInfo.from_value = baseQuoteInfo.token1_value;
            tradePairInfo.to_contract = baseQuoteInfo.token0_contract;
            tradePairInfo.to_decimal = baseQuoteInfo.token0_decimal;
            tradePairInfo.to_symbol = baseQuoteInfo.token0_symbol;
            tradePairInfo.to_amount = baseQuoteInfo.token0_amount;
            tradePairInfo.to_value = baseQuoteInfo.token0_value;
        }
        else {
            tradePairInfo.from_contract = baseQuoteInfo.token0_contract;
            tradePairInfo.from_decimal = baseQuoteInfo.token0_decimal;
            tradePairInfo.from_symbol = baseQuoteInfo.token0_symbol;
            tradePairInfo.from_amount = baseQuoteInfo.token0_amount;
            tradePairInfo.from_value = baseQuoteInfo.token0_value;
            tradePairInfo.to_contract = baseQuoteInfo.token1_contract;
            tradePairInfo.to_decimal = baseQuoteInfo.token1_decimal;
            tradePairInfo.to_symbol = baseQuoteInfo.token1_symbol;
            tradePairInfo.to_amount = baseQuoteInfo.token1_amount;
            tradePairInfo.to_value = baseQuoteInfo.token1_value;
        }
        tradePairInfo.usd_value = baseQuoteInfo.usd_value;
        tradePairInfo.bnb_usd_price = await eth_worker_price_1.eth_worker_price.getBnbUsdPrice(baseQuoteInfo.time_traded);
        // tradePairInfo.bnb_value =
        return tradePairInfo;
    }
}
exports.eth_worker_trade = eth_worker_trade;
//# sourceMappingURL=eth_worker_trade.js.map