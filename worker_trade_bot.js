"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_trade_bot = void 0;
const config_1 = require("./config");
const tools_1 = require("./tools");
const eth_trade_1 = require("./build/eth_trade");
const eth_trade_tools_1 = require("./eth_trade_tools");
const assert_1 = require("./assert");
const eth_price_track_details_tools_1 = require("./eth_price_track_details_tools");
const time_helper_1 = require("./time_helper");
const eth_ohlc_tool_1 = require("./eth_ohlc_tool");
const system_settings_header_1 = require("./build/system_settings_header");
const web3_tools_1 = require("./web3_tools");
class worker_trade_bot {
    static log(msg, method, end = false, force_display = true) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`${this.name}|${method}|${msg}`);
            if (end)
                console.log(`${this.name}|${method}|${tools_1.tools.LINE}`);
        }
    }
    //region PARAMETERS
    static async getPairToTrade() {
        const setting = new system_settings_header_1.system_settings_header();
        setting.name = this.SETTING_PAIR_TO_TRADE;
        await setting.fetch();
        if (setting.isNew())
            throw new Error(`no pair to trade setting set`);
        if (!(await web3_tools_1.web3_tools.isContractAddress(setting.value)))
            throw new Error(`pair_to_trade(${setting.value}) is not a contract address`);
        return setting.value;
    }
    static async getMinTradeBudget() {
        const setting = new system_settings_header_1.system_settings_header();
        setting.name = this.SETTING_MIN_TRADE_BUDGET;
        await setting.fetch();
        if (setting.isNew())
            throw new Error(`min_trade_budget setting not set`);
        assert_1.assert.isNumericString(setting.value, `setting(${setting.name}).value(${setting.value})`, 0);
        return setting.value;
    }
    static async getMaxTradeBudget() {
        const setting = new system_settings_header_1.system_settings_header();
        setting.name = this.SETTING_MAX_TRADE_BUDGET;
        await setting.fetch();
        if (setting.isNew())
            throw new Error(`max_trade_budget setting not set`);
        assert_1.assert.isNumericString(setting.value, `setting(${setting.name}).value(${setting.value})`, 0);
        return setting.value;
    }
    static async isAggressiveMode() {
        let aggressive_mode = false;
        const setting = new system_settings_header_1.system_settings_header();
        setting.name = this.SETTING_AGGRESSIVE_MODE;
        await setting.fetch();
        if (setting.recordExists()) {
            aggressive_mode = setting.value === "y";
        }
        return aggressive_mode;
    }
    static async runBot() {
        let enable_bot = false;
        const setting = new system_settings_header_1.system_settings_header();
        setting.name = this.SETTING_ENABLE_BOT;
        await setting.fetch();
        if (setting.recordExists()) {
            enable_bot = setting.value === "y";
        }
        return enable_bot;
    }
    //endregion PARAMETERS
    static async run() {
        const method = "run";
        try {
            let hasProcessed = false;
            if (!hasProcessed)
                hasProcessed = await this.checkOpenTradesMaturity();
            if (!hasProcessed) {
                const ohlc_bar = await eth_ohlc_tool_1.eth_ohlc_tool.getLatestCandle(await this.getPairToTrade(), time_helper_1.INTERVAL.HOUR);
                await this.strategy1(ohlc_bar);
            }
        }
        catch (e) {
            if (!(e instanceof Error))
                throw e;
            this.log(`ERROR ${e.message}`, method);
        }
        await tools_1.tools.sleep(1000);
        setImmediate(() => {
            worker_trade_bot.run().finally();
        });
    }
    static async checkOpenTradesMaturity() {
        const method = "closeOpenTrade";
        let hasProcessed = false;
        const trades = new eth_trade_1.eth_trade();
        await trades.list(" WHERE status=:open ", { open: eth_trade_tools_1.TRADE_STATUS.OPEN }, " ORDER id ASC LIMIT 1 ");
        if (trades.count() > 0) {
            const openTrade = trades.getItem();
            openTrade.pair = assert_1.assert.stringNotEmpty(openTrade.pair, `openTrade(${openTrade.id}).pair(${openTrade.pair})`);
            const currentUsdPrice = await eth_price_track_details_tools_1.eth_price_track_details_tools.getUsdPrice(openTrade.pair, time_helper_1.time_helper.getCurrentTimeStamp());
            assert_1.assert.isNumericString(currentUsdPrice, `currentUsdPrice(${currentUsdPrice})`, 0);
            if (this.openTradeProfitCheck(openTrade, currentUsdPrice)) {
                hasProcessed = true;
                await this.closeTrade(openTrade, "target profit reached");
            }
            else if (this.openTradeStopLossCheck(openTrade, currentUsdPrice)) {
                hasProcessed = true;
                await this.closeTrade(openTrade, "stop loss triggered");
            }
        }
        return hasProcessed;
    }
    static async closeTrade(openTrade, remarks = "") {
        const method = "closeTrade";
        if (openTrade.status !== eth_trade_tools_1.TRADE_STATUS.OPEN)
            throw new Error(`${method} openTrade(${openTrade.id}).status(${openTrade.status}) is not open`);
        if (openTrade.close_time_added ?? 0 > 0)
            throw new Error(`${method} openTrade(${openTrade.id}).close_time_added(${openTrade.close_time_added}) is already set`);
        openTrade.close_time_added = time_helper_1.time_helper.getCurrentTimeStamp();
        // set prices values
        openTrade.close_bnb_usd = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbUsdPrice(time_helper_1.time_helper.getCurrentTimeStamp());
        openTrade.base_contract = assert_1.assert.stringNotEmpty(openTrade.base_contract, `openTrade(${openTrade.id}).base_contract(${openTrade.base_contract})`);
        openTrade.close_bnb_token = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbTokenPrice(time_helper_1.time_helper.getCurrentTimeStamp(), openTrade.base_contract);
        openTrade.close_token_usd_price = await eth_price_track_details_tools_1.eth_price_track_details_tools.getUsdPrice(openTrade.pair, time_helper_1.time_helper.getCurrentTimeStamp());
        assert_1.assert.isNumericString(openTrade.close_token_usd_price, `openTrade(${openTrade.id}).close_token_usd_price(${openTrade.close_token_usd_price})`);
        openTrade.close_schedule = 0; // close as soon as possible
        openTrade.close_expiry = 0; // no expiry
        openTrade.close_base_amount = openTrade.open_base_amount;
        openTrade.close_desired_usd_value = tools_1.tools.multiply(openTrade.close_token_usd_price, openTrade.close_base_amount, 18);
        openTrade.status = eth_trade_tools_1.TRADE_STATUS.PENDING_CLOSE;
        openTrade.close_remarks = remarks;
        await openTrade.save();
    }
    //region STRATEGIES
    static async strategy1(ohlc_bar) {
        const ohlc = eth_ohlc_tool_1.eth_ohlc_tool.convertDbToOhlcDetailed(ohlc_bar);
        let hasTraded = false;
        let openTrade = false;
        let openTradeAmount = 0;
        // if there is volume, check if it is red bar, compute cost to make it green
        if (tools_1.tools.greaterThan(ohlc.volume, 0) && ohlc.color === eth_ohlc_tool_1.BAR_COLOR.RED) {
            // compute cost to make it green
        }
        // if aggressive mode, create open trade even if there is no volume
        // if within the range, schedule a buy trade with expiry before the hour ends
        // if open trade already exists for the hour, update
        // if open trade already exists and exceeds limit, cancel open trade
        // if open trade exists
    }
    //endregion STRATEGIES
    //region UTILITIES
    static openTradeProfitCheck(openTrade, currentUsdPrice) {
        const method = "openTradeProfitCheck";
        this.log(`open_token_usd_price(${openTrade.open_token_usd_price}) currentUsdPrice(${currentUsdPrice})`, method);
        if (openTrade.status !== eth_trade_tools_1.TRADE_STATUS.OPEN)
            throw new Error(`${method} openTrade(${openTrade.id}) status(${openTrade.status}) is not open`);
        if (typeof currentUsdPrice === "string")
            assert_1.assert.isNumericString(currentUsdPrice, `currentUsdPrice(${currentUsdPrice})`, 0);
        openTrade.take_profit_percentage = assert_1.assert.positiveNumber(openTrade.take_profit_percentage, `openTrade(${openTrade.id}).take_profit_percentage(${openTrade.take_profit_percentage})`);
        openTrade.open_token_usd_price = assert_1.assert.isNumericString(openTrade.open_token_usd_price, `openTrade(${openTrade.id}).open_token_usd_price(${openTrade.open_token_usd_price})`, 0);
        const percentageDiff = tools_1.tools.percentageDifference(openTrade.open_token_usd_price, currentUsdPrice, `num1:currentUsdPrice(${currentUsdPrice}) num2:openTrade(${openTrade.id}).open_token_usd_price(${openTrade.open_token_usd_price})`);
        this.log(`take_profit_percentage(${openTrade.take_profit_percentage})`, method);
        this.log(`percentageDiff(${percentageDiff})`, method);
        return tools_1.tools.greaterThanOrEqualTo(percentageDiff, openTrade.take_profit_percentage, `percentageDiff(${percentageDiff}) >= openTrade(${openTrade.id}).take_profit_percentage(${openTrade.take_profit_percentage})`);
    }
    static openTradeStopLossCheck(openTrade, currentUsdPrice) {
        const method = "openTradeStopLossCheck";
        this.log(`open_token_usd_price(${openTrade.open_token_usd_price}) currentUsdPrice(${currentUsdPrice})`, method);
        if (openTrade.status !== eth_trade_tools_1.TRADE_STATUS.OPEN)
            throw new Error(`${method} openTrade(${openTrade.id}) status(${openTrade.status}) is not open`);
        if (typeof currentUsdPrice === "string")
            assert_1.assert.isNumericString(currentUsdPrice, `currentUsdPrice(${currentUsdPrice})`, 0);
        openTrade.stop_loss_percentage = assert_1.assert.positiveNumber(openTrade.stop_loss_percentage, `openTrade(${openTrade.id}).stop_loss_percentage(${openTrade.stop_loss_percentage})`);
        openTrade.open_token_usd_price = assert_1.assert.isNumericString(openTrade.open_token_usd_price, `openTrade(${openTrade.id}).open_token_usd_price(${openTrade.open_token_usd_price})`, 0);
        const percentageDiff = tools_1.tools.percentageDifference(currentUsdPrice, openTrade.open_token_usd_price, `num1:currentUsdPrice(${currentUsdPrice}) num2:openTrade(${openTrade.id}).open_token_usd_price(${openTrade.open_token_usd_price})`);
        this.log(`stop_loss_percentage(${openTrade.stop_loss_percentage})`, method);
        this.log(`percentageDiff(${percentageDiff})`, method);
        return tools_1.tools.greaterThanOrEqualTo(percentageDiff, openTrade.stop_loss_percentage, `percentageDiff(${percentageDiff}) >= openTrade(${openTrade.id}).stop_loss_percentage(${openTrade.stop_loss_percentage})`);
    }
    static greenBarUsd(ohlc_bar) {
        let cost = "0";
        return cost;
    }
}
exports.worker_trade_bot = worker_trade_bot;
worker_trade_bot.SETTING_PAIR_TO_TRADE = "pair_to_trade";
worker_trade_bot.SETTING_MIN_TRADE_BUDGET = "min_trade_budget";
worker_trade_bot.SETTING_MAX_TRADE_BUDGET = "max_trade_budget";
worker_trade_bot.SETTING_AGGRESSIVE_MODE = "aggressive_mode";
worker_trade_bot.SETTING_ENABLE_BOT = "enable_bot";
//# sourceMappingURL=worker_trade_bot.js.map