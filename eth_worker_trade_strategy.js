"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_worker_trade_strategy = exports.TRADE_STATUS = void 0;
const eth_contract_events_1 = require("./build/eth_contract_events");
const assert_1 = require("./assert");
const eth_trade_1 = require("./build/eth_trade");
const tools_1 = require("./tools");
const connection_1 = require("./connection");
const eth_config_1 = require("./eth_config");
var TRADE_STATUS;
(function (TRADE_STATUS) {
    TRADE_STATUS["OPEN"] = "open";
    TRADE_STATUS["CLOSED"] = "close";
    TRADE_STATUS["FAILED"] = "fail";
    TRADE_STATUS["CANCELLED"] = "cancel";
})(TRADE_STATUS || (TRADE_STATUS = {}));
exports.TRADE_STATUS = TRADE_STATUS;
var TRADE_BUY_SELL_STATUS;
(function (TRADE_BUY_SELL_STATUS) {
    TRADE_BUY_SELL_STATUS["PENDING"] = "pending";
    TRADE_BUY_SELL_STATUS["DONE"] = "done";
    TRADE_BUY_SELL_STATUS["FAILED"] = "failed";
})(TRADE_BUY_SELL_STATUS || (TRADE_BUY_SELL_STATUS = {}));
class eth_worker_trade_strategy {
    // note: no web3 implementation in this class
    static run() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.start_time < 0) {
                const currentTime = tools_1.tools.getTime();
                this.log(`running strategy worker | ${currentTime.format()}`);
                this.start_time = currentTime.unix();
                this.buy_tax = yield eth_worker_trade_strategy.getBuyTax();
                this.sell_tax = yield eth_worker_trade_strategy.getSellTax();
                this.target_profit_percentage = eth_worker_trade_strategy.getTargetProfit() + this.sell_tax;
                this.stop_loss = eth_worker_trade_strategy.getStopLoss();
                this.log(`buy_tax:${this.buy_tax}`);
                this.log(`sell_tax:${this.sell_tax}`);
                this.log(`target_profit:${this.target_profit_percentage}`);
                this.log(`stop_loss:${this.stop_loss}`);
            }
            yield connection_1.connection.startTransaction();
            try {
                // get last trade event unprocessed
                const unprocessed_trade_event = new eth_contract_events_1.eth_contract_events();
                yield unprocessed_trade_event.list(" WHERE time_strategy_processed IS NULL AND block_time > :from  ", { from: this.start_time }, " ORDER BY blockNumber ASC, id ASC LIMIT 1 ");
                if (unprocessed_trade_event.count() > 0) {
                    for (const event of unprocessed_trade_event._dataList) {
                        const current_bnb_usd = assert_1.assert.isNumber(event.bnb_usd, "bnb_usd", 0);
                        const current_bnb_token = assert_1.assert.isNumber(event.token_bnb, "token_bnb", 0);
                        if (event.type === "sell") {
                            let buy_remarks = [];
                            buy_remarks.push(this.log(`sell trade detected from ${event.txn_hash}`));
                            let sell_value = assert_1.assert.isNumber(event.token_usd_value, "token_usd_value", 0);
                            buy_remarks.push(this.log(`sold ${event.fromAmountGross} ${event.fromSymbol} USD value ${event.token_usd_value}`));
                            let total_base_buy_usd_value = 0;
                            let target_buy_time = tools_1.tools.getCurrentTimeStamp();
                            while (total_base_buy_usd_value < sell_value) {
                                buy_remarks.push(this.log(`bnb_usd:${current_bnb_usd}`));
                                const target_buy_usd_value = eth_worker_trade_strategy.generateRandomBuyAmount();
                                buy_remarks.push(this.log(`target buy usd value:${target_buy_usd_value}`));
                                total_base_buy_usd_value += target_buy_usd_value;
                                const base_amount = target_buy_usd_value / current_bnb_usd;
                                buy_remarks.push(this.log(`estimated bnb buy amount:${base_amount}`));
                                buy_remarks.push(this.log(`adding buy order of token ${eth_config_1.eth_config.getTokenSymbol()} for bnb:${base_amount} to be executed on ${tools_1.tools.getTime(target_buy_time).format()})`));
                                const newTrade = new eth_trade_1.eth_trade();
                                newTrade.pair = `${eth_config_1.eth_config.getEthSymbol()}${eth_config_1.eth_config.getTokenSymbol()}`;
                                newTrade.base_contract = eth_config_1.eth_config.getEthContract();
                                newTrade.base_symbol = eth_config_1.eth_config.getEthSymbol();
                                newTrade.base_decimal = eth_config_1.eth_config.getEthDecimal();
                                newTrade.quote_contract = eth_config_1.eth_config.getTokenContract();
                                newTrade.quote_symbol = eth_config_1.eth_config.getTokenSymbol();
                                newTrade.quote_decimal = eth_config_1.eth_config.getTokenDecimal();
                                newTrade.open_time_added = tools_1.tools.getCurrentTimeStamp();
                                newTrade.open_time_executed = target_buy_time;
                                newTrade.open_base_amount = tools_1.tools.toBn(base_amount).toFixed(18);
                                newTrade.open_desired_usd_value = tools_1.tools.toBn(target_buy_usd_value).toFixed(18);
                                newTrade.open_remarks = JSON.stringify(buy_remarks);
                                newTrade.open_status = TRADE_BUY_SELL_STATUS.PENDING;
                                newTrade.status = TRADE_STATUS.OPEN;
                                yield newTrade.save();
                                target_buy_time += eth_worker_trade_strategy.getRandomMinutesInSeconds();
                            }
                        }
                        const openTrades = yield eth_worker_trade_strategy.getOpenTrades();
                        for (const open_trade of openTrades._dataList) {
                            let sell_remarks = [];
                            const open_bnb_token = assert_1.assert.isNumber(open_trade.open_bnb_token, "open_bnb_token", 0);
                            const diff = tools_1.tools.toBn(current_bnb_token).minus(tools_1.tools.toBn(open_bnb_token));
                            const diff_percentage = diff.dividedBy(tools_1.tools.toBn(open_bnb_token));
                            let close_trade = false;
                            sell_remarks.push(this.log(`checking open trade id:${open_trade.id}`));
                            sell_remarks.push(this.log(`open_bnb_token:${open_bnb_token}`));
                            sell_remarks.push(this.log(`current_bnb_token:${current_bnb_token}`));
                            sell_remarks.push(this.log(`diff_percentage:${diff_percentage.toFixed(18)}`));
                            // target reached
                            if (diff_percentage.comparedTo(tools_1.tools.toBn(this.target_profit_percentage)) === 1) {
                                close_trade = true;
                                sell_remarks.push(this.log(`target reached, closing trade`));
                            }
                            // if not yet closed and stop loss
                            if (open_trade.status === TRADE_STATUS.OPEN && diff_percentage.comparedTo(tools_1.tools.toBn(this.stop_loss)) === -1) {
                                close_trade = true;
                                sell_remarks.push(this.log(`stop loss reached, closing trade`));
                            }
                            if (close_trade) {
                                open_trade.close_quote_amount = open_trade.open_quote_amount;
                                open_trade.close_status = TRADE_BUY_SELL_STATUS.PENDING;
                                open_trade.close_time_added = tools_1.tools.getCurrentTimeStamp();
                                open_trade.close_time_executed = tools_1.tools.getCurrentTimeStamp();
                                open_trade.close_remarks = JSON.stringify(sell_remarks);
                                yield open_trade.save();
                            }
                        }
                        event.time_strategy_processed = tools_1.tools.getCurrentTimeStamp();
                        yield event.save();
                    }
                }
                yield connection_1.connection.commit();
            }
            catch (e) {
                yield connection_1.connection.rollback();
                console.log(e);
            }
            yield run();
        });
    }
    static log(msg) {
        console.log(msg);
        return msg;
    }
    //region GETTERS
    static getBuyTax() {
        return __awaiter(this, void 0, void 0, function* () {
            let buy_tax = 0;
            const recentBuy = new eth_contract_events_1.eth_contract_events();
            yield recentBuy.list(" WHERE type=:buy ", { buy: "buy" }, " ORDER BY blockNumber DESC, id DESC LIMIT 1 ");
            if (recentBuy.count() > 0) {
                buy_tax = assert_1.assert.isNumber(recentBuy.getItem().tax_percentage, "tax_percentage", undefined);
            }
            return buy_tax;
        });
    }
    static getSellTax() {
        return __awaiter(this, void 0, void 0, function* () {
            let sell_tax = 0;
            const recentSell = new eth_contract_events_1.eth_contract_events();
            yield recentSell.list(" WHERE type=:sell ", { sell: "sell" }, " ORDER BY blockNumber DESC, id DESC LIMIT 1 ");
            if (recentSell.count() > 0) {
                sell_tax = assert_1.assert.isNumber(recentSell.getItem().tax_percentage, "tax_percentage", undefined);
            }
            return sell_tax;
        });
    }
    static getOpenTrades() {
        return __awaiter(this, void 0, void 0, function* () {
            const openTrades = new eth_trade_1.eth_trade();
            yield openTrades.list(" WHERE status=:open ", { open: TRADE_STATUS.OPEN }, " ORDER BY id ASC ");
            return openTrades;
        });
    }
    static getTargetProfit() {
        return 0.1; // 10%
    }
    static getStopLoss() {
        return -0.2; // -20%
    }
    static getMinimumBuyUsd() {
        return 30;
    }
    static getMaximumBuyUsd() {
        return 50;
    }
    static generateRandomBuyAmount() {
        return tools_1.tools.generateRandomNumber(eth_worker_trade_strategy.getMinimumBuyUsd(), eth_worker_trade_strategy.getMaximumBuyUsd());
    }
    static getRandomMinutesInSeconds(from_min = 3, to_min = 5) {
        const min = from_min * 60;
        const max = to_min * 60;
        return Math.abs(tools_1.tools.generateRandomNumber(min, max));
    }
}
exports.eth_worker_trade_strategy = eth_worker_trade_strategy;
eth_worker_trade_strategy.start_time = -1;
eth_worker_trade_strategy.buy_tax = -1;
eth_worker_trade_strategy.sell_tax = -1;
eth_worker_trade_strategy.target_profit_percentage = -1;
eth_worker_trade_strategy.stop_loss = -1;
