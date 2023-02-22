"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_worker_trade_strategy = exports.TRADE_BUY_SELL_STATUS = exports.TRADE_STATUS = void 0;
const tools_1 = require("./tools");
const connection_1 = require("./connection");
const eth_config_1 = require("./eth_config");
const logger_1 = require("./logger");
const eth_contract_events_1 = require("./build/eth_contract_events");
const eth_trade_1 = require("./build/eth_trade");
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
exports.TRADE_BUY_SELL_STATUS = TRADE_BUY_SELL_STATUS;
class eth_worker_trade_strategy {
    // note: no web3 implementation in this class
    static async run(recursive = true, start_time_override = -1, enable_transaction = true) {
        if (start_time_override > 0)
            this.start_time = start_time_override;
        if (this.start_time < 0) {
            this.start_time = tools_1.tools.getTime().unix();
        }
        if (!this.has_run) {
            this.has_run = true;
            await this.log(`running strategy worker | ${tools_1.tools.getTime(this.start_time).format()}`);
            this.buy_tax = await eth_worker_trade_strategy.getBuyTax();
            this.sell_tax = await eth_worker_trade_strategy.getSellTax();
            this.target_profit_percentage = eth_worker_trade_strategy.getTargetProfit() + this.sell_tax;
            this.stop_loss = eth_worker_trade_strategy.getStopLoss();
            await this.log(`buy_tax:${this.buy_tax}`);
            await this.log(`sell_tax:${this.sell_tax}`);
            await this.log(`target_profit:${this.target_profit_percentage}`);
            await this.log(`stop_loss:${this.stop_loss}`);
        }
        if (enable_transaction)
            await connection_1.connection.startTransaction();
        try {
            // get last trade event unprocessed
            const unprocessed_trade_event = new eth_contract_events_1.eth_contract_events();
            let queryOrder = " ORDER BY blockNumber ASC, id ASC ";
            if (recursive)
                queryOrder += " LIMIT 1 ";
            await unprocessed_trade_event.list(" WHERE time_strategy_processed IS NULL AND block_time >= :from  ", { from: this.start_time }, queryOrder);
            for (const event of unprocessed_trade_event._dataList) {
                await this.log(`trade event detected:${event.type} hash:${event.txn_hash}`);
                const current_bnb_usd = tools_1.tools.numericToString({ val: event.bnb_usd, name: "bnb_usd", strict: true });
                const current_bnb_token = tools_1.tools.numericToString({ val: event.token_bnb, name: "token_bnb", strict: true });
                if (event.type === "sell") {
                    let buy_remarks = [];
                    buy_remarks.push(await this.log(`sell trade detected from ${event.txn_hash}`));
                    let sell_value = tools_1.tools.numericToString({ val: event.token_usd_value, name: "token_usd_value", strict: true });
                    buy_remarks.push(await this.log(`sold ${event.fromAmountGross} ${event.fromSymbol} USD value ${event.token_usd_value}`));
                    let total_base_buy_usd_value = 0;
                    let target_buy_time = tools_1.tools.getCurrentTimeStamp();
                    while (tools_1.tools.toBn(total_base_buy_usd_value).comparedTo(tools_1.tools.toBn(sell_value)) < 0) {
                        buy_remarks.push(await this.log(`bnb_usd:${current_bnb_usd}`));
                        const target_buy_usd_value = eth_worker_trade_strategy.generateRandomBuyAmount();
                        buy_remarks.push(await this.log(`target buy usd value:${target_buy_usd_value}`));
                        total_base_buy_usd_value += target_buy_usd_value;
                        const base_amount = tools_1.tools.toBn(target_buy_usd_value).dividedBy(tools_1.tools.toBn(current_bnb_usd)).toFixed(18);
                        buy_remarks.push(await this.log(`estimated bnb buy amount:${base_amount}`));
                        buy_remarks.push(await this.log(`adding buy order of token ${eth_config_1.eth_config.getTokenSymbol()} for bnb:${base_amount} to be executed on ${tools_1.tools.getTime(target_buy_time).format()})`));
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
                        newTrade.open_base_amount = base_amount;
                        newTrade.open_desired_usd_value = tools_1.tools.toBn(target_buy_usd_value).toFixed(18);
                        newTrade.open_remarks = JSON.stringify(buy_remarks);
                        newTrade.open_status = TRADE_BUY_SELL_STATUS.PENDING;
                        newTrade.status = TRADE_STATUS.OPEN;
                        await newTrade.save();
                        await this.log(`eth_trade added, id:${newTrade.id}`);
                        target_buy_time += eth_worker_trade_strategy.getRandomMinutesInSeconds();
                    }
                }
                const openTrades = await eth_worker_trade_strategy.getOpenTrades();
                await this.log(`${openTrades.count()} open trades found`);
                for (const open_trade of openTrades._dataList) {
                    let sell_remarks = [];
                    const open_bnb_token = tools_1.tools.numericToString({ val: open_trade.open_bnb_token, name: "open_bnb_token", strict: true });
                    const diff = tools_1.tools.toBn(current_bnb_token).minus(tools_1.tools.toBn(open_bnb_token));
                    const diff_percentage = diff.dividedBy(tools_1.tools.toBn(open_bnb_token));
                    let close_trade = false;
                    sell_remarks.push(await this.log(`checking open trade id:${open_trade.id}`));
                    sell_remarks.push(await this.log(`open_bnb_token:${open_bnb_token}`));
                    sell_remarks.push(await this.log(`current_bnb_token:${current_bnb_token}`));
                    sell_remarks.push(await this.log(`diff_percentage:${diff_percentage.toFixed(18)}`));
                    // target reached
                    if (diff_percentage.comparedTo(tools_1.tools.toBn(this.target_profit_percentage)) === 1) {
                        close_trade = true;
                        sell_remarks.push(await this.log(`target reached, closing trade`));
                    }
                    // if not yet closed and stop loss
                    if (open_trade.status === TRADE_STATUS.OPEN && diff_percentage.comparedTo(tools_1.tools.toBn(this.stop_loss)) === -1) {
                        close_trade = true;
                        sell_remarks.push(await this.log(`stop loss reached, closing trade`));
                    }
                    if (close_trade) {
                        open_trade.close_quote_amount = open_trade.open_quote_amount;
                        open_trade.close_status = TRADE_BUY_SELL_STATUS.PENDING;
                        open_trade.close_time_added = tools_1.tools.getCurrentTimeStamp();
                        open_trade.close_time_executed = tools_1.tools.getCurrentTimeStamp();
                        open_trade.close_remarks = JSON.stringify(sell_remarks);
                        await open_trade.save();
                    }
                }
                event.time_strategy_processed = tools_1.tools.getCurrentTimeStamp();
                await event.save();
            }
            if (enable_transaction)
                await connection_1.connection.commit();
        }
        catch (e) {
            if (enable_transaction)
                await connection_1.connection.rollback();
            console.log(e);
        }
        if (recursive)
            await run();
        else
            await this.log("strategy worker done");
    }
    static async log(msg) {
        await logger_1.logger.add(msg, "strategy", true);
        return msg;
    }
    //region GETTERS
    static async getBuyTax() {
        let buy_tax = 0;
        const recentBuy = new eth_contract_events_1.eth_contract_events();
        await recentBuy.list(" WHERE type=:buy ", { buy: "buy" }, " ORDER BY blockNumber DESC, id DESC LIMIT 1 ");
        if (recentBuy.count() > 0) {
            const buyEvent = recentBuy.getItem();
            if (buyEvent.tax_percentage === undefined || buyEvent.tax_percentage === null) {
                buy_tax = 0;
            }
            else {
                buy_tax = tools_1.tools.parseNumber({ val: buyEvent.tax_percentage, name: "tax_percentage", strict: true });
            }
        }
        return buy_tax;
    }
    static async getSellTax() {
        let sell_tax = 0;
        const recentSell = new eth_contract_events_1.eth_contract_events();
        await recentSell.list(" WHERE type=:sell ", { sell: "sell" }, " ORDER BY blockNumber DESC, id DESC LIMIT 1 ");
        if (recentSell.count() > 0) {
            const sellEvent = recentSell.getItem();
            if (sellEvent.tax_percentage === undefined || sellEvent.tax_percentage === null) {
                sell_tax = 0;
            }
            else {
                sell_tax = tools_1.tools.parseNumber({ val: sellEvent.tax_percentage, name: "tax_percentage", strict: true });
            }
        }
        return sell_tax;
    }
    static async getOpenTrades() {
        const openTrades = new eth_trade_1.eth_trade();
        await openTrades.list(" WHERE status=:open AND open_status=:trade_done ", { open: TRADE_STATUS.OPEN, trade_done: TRADE_BUY_SELL_STATUS.DONE }, " ORDER BY id ASC ");
        return openTrades;
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
eth_worker_trade_strategy.has_run = false;
//# sourceMappingURL=eth_worker_trade_strategy.js.map