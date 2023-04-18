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
const eth_price_track_header_tools_1 = require("./eth_price_track_header_tools");
const eth_worker_1 = require("./eth_worker");
const eth_contract_data_tools_1 = require("./eth_contract_data_tools");
const eth_config_1 = require("./eth_config");
const web3_token_1 = require("./web3_token");
const process_1 = require("process");
class worker_trade_bot {
    static log(msg, method, end = false, force_display = true) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            const currentLog = `${this.name}|${method}|${msg}`;
            if (this.lastLog !== currentLog) {
                this.lastLog = currentLog;
                // add log here
                console.log(currentLog);
                if (end)
                    console.log(`${this.name}|${method}|${tools_1.tools.LINE}`);
            }
        }
    }
    static async getPairBaseContract() {
        const setting = new system_settings_header_1.system_settings_header();
        setting.name = this.SETTING_PAIR_BASE_CONTRACT;
        await setting.fetch();
        if (setting.isNew())
            throw new Error(`no pair to base contract set`);
        if (!(await web3_tools_1.web3_tools.isContractAddress(setting.value)))
            throw new Error(`pair_base_contract(${setting.value}) is not a contract address`);
        return setting.value;
    }
    static async getPairQuoteContract() {
        const setting = new system_settings_header_1.system_settings_header();
        setting.name = this.SETTING_PAIR_QUOTE_CONTRACT;
        await setting.fetch();
        if (setting.isNew())
            throw new Error(`no pair to quote contract set`);
        if (!(await web3_tools_1.web3_tools.isContractAddress(setting.value)))
            throw new Error(`pair_quote_contract(${setting.value}) is not a contract address`);
        return setting.value;
    }
    static async getPairToTrade() {
        const baseContract = await this.getPairBaseContract();
        const quoteContract = await this.getPairQuoteContract();
        const pairInfo = await eth_price_track_header_tools_1.eth_price_track_header_tools.getViaTokenContracts(baseContract, quoteContract);
        if (!pairInfo)
            throw new Error(`no pair address for base(${baseContract}) and quote(${quoteContract})`);
        return pairInfo.pair_contract;
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
    static async botEnabled() {
        let enable_bot = false;
        const setting = new system_settings_header_1.system_settings_header();
        setting.name = this.SETTING_ENABLE_BOT;
        await setting.fetch();
        if (setting.recordExists()) {
            enable_bot = setting.value === "y";
        }
        return enable_bot;
    }
    static async init() {
        this.base_contract = await this.getPairBaseContract();
        this.quote_contract = await this.getPairQuoteContract();
        this.pair_contract = await this.getPairToTrade();
        this.min_trade_budget = await this.getMinTradeBudget();
        this.max_trade_budget = await this.getMaxTradeBudget();
        this.aggressive_mode = await this.isAggressiveMode();
        this.bot_enabled = await this.botEnabled();
    }
    static async run() {
        const method = "run";
        try {
            await this.init();
            if (this.bot_enabled) {
                await this.checkBalance();
                let hasProcessed = false;
                if (!hasProcessed)
                    hasProcessed = await this.checkOpenTradesMaturity();
                if (!hasProcessed) {
                    const ohlc_db = await eth_ohlc_tool_1.eth_ohlc_tool.getLatestCandle(await this.getPairToTrade(), time_helper_1.INTERVAL.HOUR);
                    const ohlc_bar = eth_ohlc_tool_1.eth_ohlc_tool.convertDbToOhlcDetailed(ohlc_db);
                    this.checkTimeRange(ohlc_bar);
                    hasProcessed = await this.strategy1(ohlc_bar, ohlc_db.pair);
                }
            }
            else {
                this.log(`bot is not enabled`, method);
            }
            await tools_1.tools.sleep(1000);
            setImmediate(() => {
                worker_trade_bot.run().finally();
            });
        }
        catch (e) {
            if (e instanceof HotWalletInsufficientBalance) {
                const insufSecondsRetry = 10;
                this.log(`ERROR insufficient balance, ${e.message}, retry after ${insufSecondsRetry} seconds`, method);
                await tools_1.tools.sleep(1000 * insufSecondsRetry);
                setImmediate(() => { worker_trade_bot.run().finally(); });
            }
            else {
                if (!(e instanceof Error))
                    throw e;
                const errorSecondsRetry = 60;
                this.log(`ERROR ${e.message}`, method);
                this.log(`retrying after ${errorSecondsRetry} seconds`, method, false, true);
                await tools_1.tools.sleep(1000 * errorSecondsRetry);
                setImmediate(() => { worker_trade_bot.run().finally(); });
            }
        }
    }
    static async checkOpenTradesMaturity() {
        const method = "closeOpenTrade";
        let hasProcessed = false;
        const trades = new eth_trade_1.eth_trade();
        await trades.list(" WHERE status=:open ", { open: eth_trade_tools_1.TRADE_STATUS.OPEN }, " ORDER BY id ASC LIMIT 1 ");
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
    static async openTrade(usd_value_to_purchase) {
        const method = "openTrade";
        usd_value_to_purchase = assert_1.assert.isNumericString(usd_value_to_purchase, `usd_value_to_purchase(${usd_value_to_purchase})`, 0);
        this.log(`purchasing token worth ${usd_value_to_purchase} usd`, method);
        const newTrade = await eth_trade_tools_1.eth_trade_tools.getDefault(this.base_contract, this.quote_contract);
        newTrade.open_schedule = assert_1.assert.positiveInt(newTrade.open_schedule, `newTrade.open_schedule`);
        const current_bnb_usd = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbUsdPrice(newTrade.open_time_added);
        assert_1.assert.isNumericString(current_bnb_usd, `current_bnb_usd(${current_bnb_usd})`, 0);
        this.log(`current_bnb_usd(${current_bnb_usd})`, method);
        const current_token_usd = await eth_price_track_details_tools_1.eth_price_track_details_tools.getUsdPrice(newTrade.pair, newTrade.open_time_added);
        assert_1.assert.isNumericString(current_token_usd, `current_token_usd(${current_token_usd})`, 0);
        this.log(`current_token_usd(${current_token_usd})`, method);
        const tokenToPurchase = tools_1.tools.multiply(current_token_usd, usd_value_to_purchase);
        this.log(`token to purchase ${tokenToPurchase} scheduled on ${time_helper_1.time_helper.getAsFormat(newTrade.open_schedule, time_helper_1.TIME_FORMATS.ISO)}`, method);
        newTrade.open_desired_usd_value = usd_value_to_purchase;
        newTrade.close_base_amount = tokenToPurchase;
        await newTrade.save();
        return newTrade;
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
    static async strategy1(ohlc_bar, pair_address) {
        const method = "strategy1";
        assert_1.assert.stringNotEmpty(pair_address, `pair_address(${pair_address})`);
        web3_tools_1.web3_tools.isContractAddressStrict(pair_address, `${method} pair_address(${pair_address})`);
        let hasTraded = false;
        let openTrade = false;
        let openTradeAmount = 0;
        // 4 minutes before
        const currentTimeRange = new CurrentHourTimeRange();
        // this.log(`current start of hour ${currentTimeRange.startTime.format(TIME_FORMATS.READABLE)}`,method);
        // this.log(`current end of hour ${currentTimeRange.endTime.format(TIME_FORMATS.READABLE)}`,method);
        const startOfTradeTime = currentTimeRange.endTime.subtract(30, 'minute');
        // this.log(`time start of trade ${startOfTradeTime.format(TIME_FORMATS.READABLE)}`,method);
        if (currentTimeRange.currentTime.unix() < startOfTradeTime.unix()) {
            this.log(`not yet within range for trading which starts on ${startOfTradeTime.format(time_helper_1.TIME_FORMATS.ISO)}`, method);
            return false;
        }
        const hasNegativeOrZeroVolume = tools_1.tools.lesserThanOrEqualTo(ohlc_bar.volume_usd, 0);
        const isNotAggressiveMode = !(this.aggressive_mode);
        if (hasNegativeOrZeroVolume && isNotAggressiveMode) {
            this.log(`current bar has no trading volume and is not in aggressive mode, skipping`, method);
            return false;
        }
        const openTrades = await this.getOpenTradesBetween(pair_address, currentTimeRange.startTime.unix(), currentTimeRange.endTime.unix());
        if (openTrades.length > 0) {
            this.log(`${openTrades.length} open trades found within this hour, skipping`, method);
            return false;
        }
        let buyVolumeRequired = this.computeGreenBarBuyVolume(ohlc_bar);
        const minTradeBudget = await this.getMinTradeBudget();
        const maxTradeBudget = await this.getMaxTradeBudget();
        const isPositiveBuyVolume = tools_1.tools.greaterThan(buyVolumeRequired, 0);
        const isAffordableTrade = await this.checkIfTradeIsAffordable(buyVolumeRequired, maxTradeBudget);
        if (isPositiveBuyVolume) {
            if (isAffordableTrade) {
                buyVolumeRequired = await this.adjustTradeAmountIfBelowMinimum(buyVolumeRequired, minTradeBudget);
                await this.openTrade(buyVolumeRequired);
                return true;
            }
            else {
                this.log(`buy volume required(${buyVolumeRequired}) to make it into a green candle is above budget(${maxTradeBudget}), backing off`, method);
                return false;
            }
        }
        else {
            this.log(`current bar is already a green candle, no trade needed`, method);
            return false;
        }
    }
    //endregion STRATEGIES
    //region UTILITIES
    static checkTradeHasProfit(starting_price, current_price, take_profit_percentage) {
        const method = "checkTradeHasProfit";
        starting_price = assert_1.assert.isNumericString(starting_price, `${method}|starting_price(${starting_price})`);
        current_price = assert_1.assert.isNumericString(current_price, `${method}|current_price(${current_price})`);
        take_profit_percentage = assert_1.assert.positiveNumber(take_profit_percentage, `${method}|take_profit_percentage(${take_profit_percentage})`);
        let targetMinimumProfit = tools_1.tools.multiply(starting_price, take_profit_percentage);
        targetMinimumProfit = tools_1.tools.add(starting_price, targetMinimumProfit);
        return tools_1.tools.greaterThanOrEqualTo(current_price, targetMinimumProfit);
    }
    static checkTradeStopLossTriggered(starting_price, current_price, stop_loss_percentage) {
        const method = "checkTradeStopLossTriggered";
        starting_price = assert_1.assert.isNumericString(starting_price, `${method}|starting_price(${starting_price})`);
        current_price = assert_1.assert.isNumericString(current_price, `${method}|current_price(${current_price})`);
        stop_loss_percentage = assert_1.assert.positiveNumber(stop_loss_percentage, `${method}|take_profit_percentage(${stop_loss_percentage})`);
        let stopLossLevel = tools_1.tools.multiply(starting_price, stop_loss_percentage);
        stopLossLevel = tools_1.tools.minus(starting_price, stopLossLevel);
        return tools_1.tools.lesserThanOrEqualTo(current_price, stopLossLevel);
    }
    static openTradeProfitCheck(openTrade, currentUsdPrice) {
        const method = "openTradeProfitCheck";
        this.log(`open_token_usd_price(${openTrade.open_token_usd_price}) currentUsdPrice(${currentUsdPrice})`, method);
        if (openTrade.status !== eth_trade_tools_1.TRADE_STATUS.OPEN)
            throw new Error(`${method} openTrade(${openTrade.id}) status(${openTrade.status}) is not open`);
        return this.checkTradeHasProfit(openTrade.open_token_usd_price, currentUsdPrice, openTrade.take_profit_percentage);
    }
    static openTradeStopLossCheck(openTrade, currentUsdPrice) {
        const method = "openTradeStopLossCheck";
        this.log(`open_token_usd_price(${openTrade.open_token_usd_price}) currentUsdPrice(${currentUsdPrice})`, method);
        if (openTrade.status !== eth_trade_tools_1.TRADE_STATUS.OPEN)
            throw new Error(`${method} openTrade(${openTrade.id}) status(${openTrade.status}) is not open`);
        if (typeof currentUsdPrice === "string")
            assert_1.assert.isNumericString(currentUsdPrice, `currentUsdPrice(${currentUsdPrice})`, 0);
        return this.checkTradeStopLossTriggered(openTrade.open_token_usd_price, currentUsdPrice, openTrade.stop_loss_percentage);
    }
    static computeGreenBarBuyVolume(ohlc, heightPercentage = 0.05) {
        const method = "computeGreenBarBuyVolume";
        let buyVolumeRequired = "0";
        ohlc.open_usd = assert_1.assert.isNumericString(ohlc.open_usd, `ohlc.open_usd(${ohlc.open_usd})`);
        ohlc.close_usd = assert_1.assert.isNumericString(ohlc.close_usd, `ohlc.open_usd(${ohlc.close_usd})`);
        ohlc.volume_buy_usd = assert_1.assert.isNumericString(ohlc.volume_buy_usd, `ohlc.volume_buy_usd(${ohlc.volume_buy_usd})`);
        ohlc.volume_sell_usd = assert_1.assert.isNumericString(ohlc.volume_sell_usd, `ohlc.volume_sell_usd(${ohlc.volume_sell_usd})`);
        this.log(`open_usd(${ohlc.open_usd}) close_usd(${ohlc.close_usd}) volume_buy_usd(${ohlc.volume_buy_usd}) volume_sell_usd(${ohlc.volume_sell_usd})`, method);
        if (tools_1.tools.greaterThanOrEqualTo(ohlc.close_usd, ohlc.open_usd, `close_usd(${ohlc.close_usd}) >= open_usd(${ohlc.open_usd})`)) {
            this.log(`Already a green bar or neutral, no need to compute additional buy volume`, method);
            return buyVolumeRequired;
        }
        const ratio = tools_1.tools.greaterThan(ohlc.volume_sell_usd, 0) ? tools_1.tools.divide(ohlc.volume_buy_usd, ohlc.volume_sell_usd) : "1";
        this.log(`buy sell volume ratio ${ratio}`, method);
        // Compute the required buy volume
        buyVolumeRequired = tools_1.tools.minus(ohlc.volume_sell_usd, ohlc.volume_buy_usd);
        this.log(`init buy volume required ${buyVolumeRequired}`, method);
        const additionalBuyVolume = tools_1.tools.multiply(ohlc.volume_sell_usd, heightPercentage);
        this.log(`additional buy volume ${additionalBuyVolume} based on heightPercentage ${heightPercentage}(${tools_1.tools.percentageFormat(heightPercentage)}%) of total sell volume(${ohlc.volume_sell_usd})`, method);
        buyVolumeRequired = tools_1.tools.add(buyVolumeRequired, additionalBuyVolume);
        this.log(`total buy volume required ${buyVolumeRequired}`, method);
        return tools_1.tools.greaterThan(buyVolumeRequired, 0) ? buyVolumeRequired : "0";
    }
    static async checkIfTradeIsAffordable(trade_amount_usd, max_trade_budget = "0") {
        const method = "checkIfTradeIsAffordable";
        assert_1.assert.isNumericString(trade_amount_usd, `trade_amount_usd(${trade_amount_usd})`, 0);
        if (max_trade_budget === "0")
            max_trade_budget = this.max_trade_budget;
        assert_1.assert.isNumericString(max_trade_budget, `max_usd(${max_trade_budget})`, 0);
        return tools_1.tools.greaterThanOrEqualTo(max_trade_budget, trade_amount_usd);
    }
    static async adjustTradeAmountIfBelowMinimum(trade_amount_usd, min_trade_budget = "0") {
        const method = "adjustTradeAmountIfBelowMinimum";
        assert_1.assert.isNumericString(trade_amount_usd, `trade_amount_usd(${trade_amount_usd})`);
        if (min_trade_budget === "0")
            min_trade_budget = this.min_trade_budget;
        assert_1.assert.isNumericString(min_trade_budget, `min_trade_budget(${min_trade_budget})`, 0);
        return tools_1.tools.lesserThan(trade_amount_usd, min_trade_budget) ? min_trade_budget : trade_amount_usd;
    }
    static async getOpenTradesBetween(pair, from, to) {
        const query = new eth_trade_1.eth_trade();
        await query.list(" WHERE pair=:pair AND open_time_added>=:from AND open_time_added<=:to AND (status=:open OR status=:pending_open) ", { pair: pair, from: from, to: to, open: eth_trade_tools_1.TRADE_STATUS.OPEN, pending_open: eth_trade_tools_1.TRADE_STATUS.PENDING_OPEN });
        return query._dataList;
    }
    static async checkBalance() {
        let currentBusdBalanceValue = "0";
        if (this.quote_contract.toLowerCase() === eth_config_1.eth_config.getEthContract().toLowerCase()) {
            const bnbBalance = await eth_worker_1.eth_worker.getETHBalance(eth_config_1.eth_config.getHotWalletAddress());
            const bnb_usd = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbUsdPrice(time_helper_1.time_helper.getCurrentTimeStamp());
            currentBusdBalanceValue = tools_1.tools.multiply(bnbBalance, bnb_usd);
        }
        else if (this.quote_contract.toLowerCase() === eth_config_1.eth_config.getBusdContract().toLowerCase()) {
            currentBusdBalanceValue = await web3_token_1.web3_token.getBalanceOf(eth_config_1.eth_config.getBusdContract(), eth_config_1.eth_config.getHotWalletAddress());
        }
        else {
            const quoteInfo = await eth_contract_data_tools_1.eth_contract_data_tools.getContractViaAddressStrict(this.quote_contract);
            throw new Error(`quote contract(${this.quote_contract}) symbol(${quoteInfo.symbol}) not supported`);
        }
        if (tools_1.tools.lesserThan(currentBusdBalanceValue, this.max_trade_budget)) {
            throw new HotWalletInsufficientBalance(`not enough balance. max_trade_budget(${this.max_trade_budget}) current busd balance value:${currentBusdBalanceValue}`);
        }
    }
    static checkTimeRange(ohlcBar) {
        const method = "checkTimeRange";
        ohlcBar.from_time = assert_1.assert.positiveInt(ohlcBar.from_time, `ohlcBar.from_time(${ohlcBar.from_time})`);
        ohlcBar.to_time = assert_1.assert.positiveInt(ohlcBar.to_time, `ohlcBar.to_time(${ohlcBar.to_time})`);
        if (tools_1.tools.greaterThan(ohlcBar.from_time, ohlcBar.to_time))
            throw new Error(`to_time cannot be greater than from_time.`);
        const currentTime = Date.now(); // get the current time in milliseconds
        const barFromTime = ohlcBar.from_time * 1000; // convert the bar's 'from_time' to milliseconds
        const barToTime = ohlcBar.to_time * 1000; // convert the bar's 'to_time' to milliseconds
        if (currentTime < barFromTime || currentTime > barToTime) {
            throw new OhlcNotSynced("Current time is not within the bar time range.");
        }
    }
}
exports.worker_trade_bot = worker_trade_bot;
worker_trade_bot.lastLog = "";
//region PARAMETERS
worker_trade_bot.SETTING_PAIR_BASE_CONTRACT = "pair_base_contract";
worker_trade_bot.SETTING_PAIR_QUOTE_CONTRACT = "pair_quote_contract";
worker_trade_bot.SETTING_MIN_TRADE_BUDGET = "min_trade_budget";
worker_trade_bot.SETTING_MAX_TRADE_BUDGET = "max_trade_budget";
worker_trade_bot.SETTING_AGGRESSIVE_MODE = "aggressive_mode";
worker_trade_bot.SETTING_ENABLE_BOT = "enable_bot";
//endregion PARAMETERS
worker_trade_bot.base_contract = "";
worker_trade_bot.quote_contract = "";
worker_trade_bot.pair_contract = "";
worker_trade_bot.min_trade_budget = "";
worker_trade_bot.max_trade_budget = "";
worker_trade_bot.aggressive_mode = false;
worker_trade_bot.bot_enabled = false;
class CurrentHourTimeRange {
    constructor() {
        this.currentTime = time_helper_1.time_helper.getTime(time_helper_1.time_helper.getCurrentTimeStamp(), "UTC");
        this.startTime = time_helper_1.time_helper.startOfHour(this.currentTime.unix(), "UTC");
        this.endTime = time_helper_1.time_helper.endOfHour(this.currentTime.unix(), "UTC");
    }
}
class HotWalletInsufficientBalance extends Error {
    constructor(message) {
        super(message);
        this.name = 'HotWalletInsufficientBalance';
        Object.setPrototypeOf(this, HotWalletInsufficientBalance.prototype);
    }
}
class OhlcNotSynced extends Error {
    constructor(message) {
        super(message);
        this.name = 'OhlcNotSynced';
        Object.setPrototypeOf(this, OhlcNotSynced.prototype);
    }
}
if (process_1.argv.includes("run_worker_trade_bot")) {
    console.log(`running worker_trade_bot on db ${config_1.config.getConfig().db_name}`);
    worker_trade_bot.run().finally();
}
//# sourceMappingURL=worker_trade_bot.js.map