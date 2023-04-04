import {config} from "./config";
import {tools} from "./tools";
import {eth_trade} from "./build/eth_trade";
import {eth_trade_tools, TRADE_STATUS} from "./eth_trade_tools";
import {assert} from "./assert";
import {eth_price_track_details_tools} from "./eth_price_track_details_tools";
import {INTERVAL, TIME_FORMATS, time_helper} from "./time_helper";
import {eth_ohlc_tool, OHLC_DETAILED} from "./eth_ohlc_tool";
import {system_settings_header} from "./build/system_settings_header";
import {web3_tools} from "./web3_tools";
import {ohlc_details} from "./build/ohlc_details";
import {eth_price_track_header_tools} from "./eth_price_track_header_tools";
import {Dayjs} from "dayjs";
import {eth_worker} from "./eth_worker";
import {eth_contract_data_tools} from "./eth_contract_data_tools";
import {eth_config} from "./eth_config";
import {web3_token} from "./web3_token";
import {argv} from "process";

export class worker_trade_bot{
    private static lastLog:string = "";
    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=true):void{
        if(config.getConfig().verbose_log || force_display){
            const currentLog = `${this.name}|${method}|${msg}`;
            if(this.lastLog !== currentLog){
                this.lastLog = currentLog;
                // add log here
                console.log(currentLog);
                if(end) console.log(`${this.name}|${method}|${tools.LINE}`);
            }
        }
    }

    //region PARAMETERS
    public static SETTING_PAIR_BASE_CONTRACT = "pair_base_contract";
    public static SETTING_PAIR_QUOTE_CONTRACT = "pair_quote_contract";
    public static SETTING_MIN_TRADE_BUDGET = "min_trade_budget";
    public static SETTING_MAX_TRADE_BUDGET = "max_trade_budget";
    public static SETTING_AGGRESSIVE_MODE = "aggressive_mode";
    public static SETTING_ENABLE_BOT = "enable_bot";

    private static async getPairBaseContract():Promise<string>{
        const setting = new system_settings_header();
        setting.name = this.SETTING_PAIR_BASE_CONTRACT;
        await setting.fetch();
        if(setting.isNew()) throw new Error(`no pair to base contract set`);
        if(!(await web3_tools.isContractAddress(setting.value))) throw new Error(`pair_base_contract(${setting.value}) is not a contract address`);
        return setting.value;
    }
    private static async getPairQuoteContract():Promise<string>{
        const setting = new system_settings_header();
        setting.name = this.SETTING_PAIR_QUOTE_CONTRACT;
        await setting.fetch();
        if(setting.isNew()) throw new Error(`no pair to quote contract set`);
        if(!(await web3_tools.isContractAddress(setting.value))) throw new Error(`pair_quote_contract(${setting.value}) is not a contract address`);
        return setting.value;
    }
    private static async getPairToTrade():Promise<string>{
        const baseContract = await this.getPairBaseContract();
        const quoteContract = await this.getPairQuoteContract();
        const pairInfo = await eth_price_track_header_tools.getViaTokenContracts(baseContract,quoteContract);
        if(!pairInfo) throw new Error(`no pair address for base(${baseContract}) and quote(${quoteContract})`);
        return pairInfo.pair_contract;
    }
    private static async getMinTradeBudget():Promise<string>{
        const setting = new system_settings_header();
        setting.name = this.SETTING_MIN_TRADE_BUDGET;
        await setting.fetch();
        if(setting.isNew()) throw new Error(`min_trade_budget setting not set`);
        assert.isNumericString(setting.value,`setting(${setting.name}).value(${setting.value})`,0);
        return setting.value;
    }
    private static async getMaxTradeBudget():Promise<string>{
        const setting = new system_settings_header();
        setting.name = this.SETTING_MAX_TRADE_BUDGET;
        await setting.fetch();
        if(setting.isNew()) throw new Error(`max_trade_budget setting not set`);
        assert.isNumericString(setting.value,`setting(${setting.name}).value(${setting.value})`,0);
        return setting.value;
    }
    private static async isAggressiveMode():Promise<boolean>{
        let aggressive_mode = false;
        const setting = new system_settings_header();
        setting.name = this.SETTING_AGGRESSIVE_MODE;
        await setting.fetch();
        if(setting.recordExists()){
            aggressive_mode = setting.value === "y";
        }
        return aggressive_mode;
    }
    private static async botEnabled():Promise<boolean>{
        let enable_bot = false;
        const setting = new system_settings_header();
        setting.name = this.SETTING_ENABLE_BOT;
        await setting.fetch();
        if(setting.recordExists()){
            enable_bot = setting.value === "y";
        }
        return enable_bot;
    }
    //endregion PARAMETERS

    private static base_contract:string = "";
    private static quote_contract:string = "";
    private static pair_contract:string = "";
    private static min_trade_budget:string = "";
    private static max_trade_budget:string = "";
    private static aggressive_mode:boolean = false;
    private static bot_enabled:boolean = false;
    private static async init(){
        this.base_contract = await this.getPairBaseContract();
        this.quote_contract = await this.getPairQuoteContract();
        this.pair_contract = await this.getPairToTrade();
        this.min_trade_budget = await this.getMinTradeBudget();
        this.max_trade_budget = await this.getMaxTradeBudget();
        this.aggressive_mode = await this.isAggressiveMode();
        this.bot_enabled = await this.botEnabled();
    }

    public static async run():Promise<void>{
        const method = "run";
        try {
            await this.init();
            if(this.bot_enabled){
                await this.checkBalance();
                let hasProcessed = false;
                if (!hasProcessed) hasProcessed = await this.checkOpenTradesMaturity();
                if(!hasProcessed){
                    const ohlc_bar = await eth_ohlc_tool.getLatestCandle(await this.getPairToTrade(),INTERVAL.HOUR);
                    hasProcessed = await this.strategy1(ohlc_bar);
                }
            }
            else{
                this.log(`bot is not enabled`,method);
            }

            await tools.sleep(1000);
            setImmediate(()=>{
                worker_trade_bot.run().finally();
            });
        }
        catch (e){
            if(e instanceof HotWalletInsufficientBalance){
                const insufSecondsRetry = 10;
                this.log(`ERROR insufficient balance, ${e.message}, retry after ${insufSecondsRetry} seconds`,method);
                await tools.sleep(1000 * insufSecondsRetry);
                setImmediate(()=>{ worker_trade_bot.run().finally(); });
            }
            else{
                if(!(e instanceof Error)) throw e;
                const errorSecondsRetry = 60;
                this.log(`ERROR ${e.message}`,method);
                this.log(`retrying after ${errorSecondsRetry} seconds`,method,false,true);
                await tools.sleep(1000 * errorSecondsRetry);
                setImmediate(()=>{ worker_trade_bot.run().finally(); });
            }
        }
    }
    private static async checkOpenTradesMaturity():Promise<boolean>{
        const method = "closeOpenTrade";
        let hasProcessed = false;
        const trades = new eth_trade();
        await trades.list(
            " WHERE status=:open ",
            {open:TRADE_STATUS.OPEN},
            " ORDER BY id ASC LIMIT 1 ");
        if(trades.count() > 0){
            const openTrade = trades.getItem();
            openTrade.pair = assert.stringNotEmpty(openTrade.pair,`openTrade(${openTrade.id}).pair(${openTrade.pair})`);
            const currentUsdPrice = await eth_price_track_details_tools.getUsdPrice(openTrade.pair,time_helper.getCurrentTimeStamp());
            assert.isNumericString(currentUsdPrice,`currentUsdPrice(${currentUsdPrice})`,0);
            if(this.openTradeProfitCheck(openTrade,currentUsdPrice)){
                hasProcessed = true;
                await this.closeTrade(openTrade,"target profit reached");
            }
            else if(this.openTradeStopLossCheck(openTrade,currentUsdPrice)){
                hasProcessed = true;
                await this.closeTrade(openTrade,"stop loss triggered");
            }
        }
        return hasProcessed;
    }
    private static async openTrade(usd_value_to_purchase:string):Promise<eth_trade>{
        const method = "openTrade";
        usd_value_to_purchase = assert.isNumericString(usd_value_to_purchase,`usd_value_to_purchase(${usd_value_to_purchase})`,0);
        this.log(`purchasing token worth ${usd_value_to_purchase} usd`,method);

        const newTrade = await eth_trade_tools.getDefault(this.base_contract,this.quote_contract);
        newTrade.open_schedule = assert.positiveInt(newTrade.open_schedule,`newTrade.open_schedule`);

        const current_bnb_usd = await eth_price_track_details_tools.getBnbUsdPrice(newTrade.open_time_added);
        assert.isNumericString(current_bnb_usd,`current_bnb_usd(${current_bnb_usd})`,0);
        this.log(`current_bnb_usd(${current_bnb_usd})`,method);
        const current_token_usd = await eth_price_track_details_tools.getUsdPrice(newTrade.pair,newTrade.open_time_added);
        assert.isNumericString(current_token_usd,`current_token_usd(${current_token_usd})`,0);
        this.log(`current_token_usd(${current_token_usd})`,method);

        const tokenToPurchase = tools.multiply(current_token_usd,usd_value_to_purchase);
        this.log(`token to purchase ${tokenToPurchase} scheduled on ${time_helper.getAsFormat(newTrade.open_schedule,TIME_FORMATS.ISO)}`,method);

        newTrade.open_desired_usd_value = usd_value_to_purchase;
        newTrade.close_base_amount = tokenToPurchase;
        await newTrade.save();
        return newTrade;
    }
    private static async closeTrade(openTrade:eth_trade,remarks:string=""){
        const method = "closeTrade";
        if(openTrade.status !== TRADE_STATUS.OPEN) throw new Error(`${method} openTrade(${openTrade.id}).status(${openTrade.status}) is not open`);

        if(openTrade.close_time_added??0 > 0) throw new Error(`${method} openTrade(${openTrade.id}).close_time_added(${openTrade.close_time_added}) is already set`);
        openTrade.close_time_added = time_helper.getCurrentTimeStamp();

        // set prices values
        openTrade.close_bnb_usd = await eth_price_track_details_tools.getBnbUsdPrice(time_helper.getCurrentTimeStamp());
        openTrade.base_contract = assert.stringNotEmpty(openTrade.base_contract,`openTrade(${openTrade.id}).base_contract(${openTrade.base_contract})`);
        openTrade.close_bnb_token = await eth_price_track_details_tools.getBnbTokenPrice(time_helper.getCurrentTimeStamp(),openTrade.base_contract);
        openTrade.close_token_usd_price = await eth_price_track_details_tools.getUsdPrice(openTrade.pair,time_helper.getCurrentTimeStamp());
        assert.isNumericString(openTrade.close_token_usd_price,`openTrade(${openTrade.id}).close_token_usd_price(${openTrade.close_token_usd_price})`);

        openTrade.close_schedule = 0; // close as soon as possible
        openTrade.close_expiry = 0; // no expiry
        openTrade.close_base_amount = openTrade.open_base_amount;
        openTrade.close_desired_usd_value = tools.multiply(openTrade.close_token_usd_price,openTrade.close_base_amount,18);
        openTrade.status = TRADE_STATUS.PENDING_CLOSE;
        openTrade.close_remarks = remarks;
        await openTrade.save();
    }

    //region STRATEGIES
    public static async strategy1(ohlc_bar:ohlc_details){
        const method = "strategy1";
        const ohlc = eth_ohlc_tool.convertDbToOhlcDetailed(ohlc_bar);
        let hasTraded = false;
        let openTrade = false;
        let openTradeAmount = 0;

        // 4 minutes before
        const currentTimeRange = new CurrentHourTimeRange();
        // this.log(`current start of hour ${currentTimeRange.startTime.format(TIME_FORMATS.READABLE)}`,method);
        // this.log(`current end of hour ${currentTimeRange.endTime.format(TIME_FORMATS.READABLE)}`,method);
        const startOfTradeTime = currentTimeRange.endTime.subtract(30,'minute');
        // this.log(`time start of trade ${startOfTradeTime.format(TIME_FORMATS.READABLE)}`,method);

        if(currentTimeRange.currentTime.unix() < startOfTradeTime.unix()){
            this.log(`not yet within range for trading which starts on ${startOfTradeTime.format(TIME_FORMATS.ISO)}`,method);
            return false;
        }

        const hasNegativeOrZeroVolume = tools.lesserThanOrEqualTo(ohlc.volume_usd, 0);
        const isNotAggressiveMode = !(this.aggressive_mode);
        if (hasNegativeOrZeroVolume && isNotAggressiveMode) {
            this.log(`current bar has no trading volume and is not in aggressive mode, skipping`,method);
            return false;
        }

        const openTrades = await this.getOpenTradesBetween(ohlc_bar.pair,currentTimeRange.startTime.unix(),currentTimeRange.endTime.unix());
        if(openTrades.length > 0){
            this.log(`${openTrades.length} open trades found within this hour, skipping`,method);
            return false;
        }

        let buyVolumeRequired = this.computeGreenBarBuyVolume(ohlc);
        const minTradeBudget = await this.getMinTradeBudget();
        const maxTradeBudget = await this.getMaxTradeBudget();
        const isPositiveBuyVolume = tools.greaterThan(buyVolumeRequired, 0);
        const isAffordableTrade = await this.checkIfTradeIsAffordable(buyVolumeRequired, maxTradeBudget);
        if (isPositiveBuyVolume) {
            if (isAffordableTrade) {
                buyVolumeRequired = await this.adjustTradeAmountIfBelowMinimum(buyVolumeRequired, minTradeBudget);
                await this.openTrade(buyVolumeRequired);
                return true;
            } else {
                this.log(`buy volume required(${buyVolumeRequired}) to make it into a green candle is above budget(${maxTradeBudget}), backing off`, method);
                return false;
            }
        } else {
            this.log(`current bar is already a green candle, no trade needed`, method);
            return false;
        }
    }
    //endregion STRATEGIES

    //region UTILITIES
    public static checkTradeHasProfit(starting_price:string|number|null,current_price:string|number|null,take_profit_percentage:number|string|null):boolean {
        const method = "checkTradeHasProfit";
        starting_price = assert.isNumericString(starting_price, `${method}|starting_price(${starting_price})`);
        current_price = assert.isNumericString(current_price, `${method}|current_price(${current_price})`);
        take_profit_percentage = assert.positiveNumber(take_profit_percentage,`${method}|take_profit_percentage(${take_profit_percentage})`);
        let targetMinimumProfit = tools.multiply(starting_price,take_profit_percentage);
            targetMinimumProfit = tools.add(starting_price,targetMinimumProfit);
        return tools.greaterThanOrEqualTo(current_price,targetMinimumProfit);
    }
    public static checkTradeStopLossTriggered(starting_price:string|number|null,current_price:string|number|null,stop_loss_percentage:number|string|null):boolean{
        const method = "checkTradeStopLossTriggered";
        starting_price = assert.isNumericString(starting_price, `${method}|starting_price(${starting_price})`);
        current_price = assert.isNumericString(current_price, `${method}|current_price(${current_price})`);
        stop_loss_percentage = assert.positiveNumber(stop_loss_percentage,`${method}|take_profit_percentage(${stop_loss_percentage})`);
        let stopLossLevel = tools.multiply(starting_price,stop_loss_percentage);
            stopLossLevel = tools.minus(starting_price,stopLossLevel);
        return tools.lesserThanOrEqualTo(current_price,stopLossLevel);
    }
    public static openTradeProfitCheck(openTrade:eth_trade, currentUsdPrice:number|string):boolean{
        const method = "openTradeProfitCheck";
        this.log(`open_token_usd_price(${openTrade.open_token_usd_price}) currentUsdPrice(${currentUsdPrice})`,method);
        if(openTrade.status !== TRADE_STATUS.OPEN) throw new Error(`${method} openTrade(${openTrade.id}) status(${openTrade.status}) is not open`);
        return this.checkTradeHasProfit(openTrade.open_token_usd_price,currentUsdPrice,openTrade.take_profit_percentage);
    }
    public static openTradeStopLossCheck(openTrade:eth_trade, currentUsdPrice:number|string){
        const method = "openTradeStopLossCheck";
        this.log(`open_token_usd_price(${openTrade.open_token_usd_price}) currentUsdPrice(${currentUsdPrice})`,method);
        if(openTrade.status !== TRADE_STATUS.OPEN) throw new Error(`${method} openTrade(${openTrade.id}) status(${openTrade.status}) is not open`);
        if(typeof currentUsdPrice === "string") assert.isNumericString(currentUsdPrice,`currentUsdPrice(${currentUsdPrice})`,0);
        return this.checkTradeStopLossTriggered(openTrade.open_token_usd_price,currentUsdPrice,openTrade.stop_loss_percentage);

    }
    public static computeGreenBarBuyVolume(ohlc: OHLC_DETAILED, heightPercentage:number = 0.05): string {
        const method = "computeGreenBarBuyVolume";
        let buyVolumeRequired = "0";
        ohlc.open_usd = assert.isNumericString(ohlc.open_usd,`ohlc.open_usd(${ohlc.open_usd})`);
        ohlc.close_usd = assert.isNumericString(ohlc.close_usd,`ohlc.open_usd(${ohlc.close_usd})`);
        ohlc.volume_buy_usd = assert.isNumericString(ohlc.volume_buy_usd,`ohlc.volume_buy_usd(${ohlc.volume_buy_usd})`);
        ohlc.volume_sell_usd = assert.isNumericString(ohlc.volume_sell_usd,`ohlc.volume_sell_usd(${ohlc.volume_sell_usd})`);
        this.log(`open_usd(${ohlc.open_usd}) close_usd(${ohlc.close_usd}) volume_buy_usd(${ohlc.volume_buy_usd}) volume_sell_usd(${ohlc.volume_sell_usd})`,method);

        if (tools.greaterThanOrEqualTo(ohlc.close_usd,ohlc.open_usd,`close_usd(${ohlc.close_usd}) >= open_usd(${ohlc.open_usd})`)) {
            this.log(`Already a green bar or neutral, no need to compute additional buy volume`,method);
            return buyVolumeRequired;
        }

        const ratio = tools.greaterThan(ohlc.volume_sell_usd,0) ? tools.divide(ohlc.volume_buy_usd,ohlc.volume_sell_usd) : "1";
        this.log(`buy sell volume ratio ${ratio}`,method);

        // Compute the required buy volume
        buyVolumeRequired = tools.minus(ohlc.volume_sell_usd,ohlc.volume_buy_usd);
        this.log(`init buy volume required ${buyVolumeRequired}`,method);

        const additionalBuyVolume = tools.multiply(ohlc.volume_sell_usd,heightPercentage);
        this.log(`additional buy volume ${additionalBuyVolume} based on heightPercentage ${heightPercentage}(${tools.percentageFormat(heightPercentage)}%) of total sell volume(${ohlc.volume_sell_usd})`,method);
        buyVolumeRequired = tools.add(buyVolumeRequired,additionalBuyVolume);
        this.log(`total buy volume required ${buyVolumeRequired}`,method);

        return tools.greaterThan(buyVolumeRequired,0) ? buyVolumeRequired : "0";
    }
    public static async checkIfTradeIsAffordable(trade_amount_usd:string,max_trade_budget:string="0"):Promise<boolean>{
        const method = "checkIfTradeIsAffordable";
        assert.isNumericString(trade_amount_usd,`trade_amount_usd(${trade_amount_usd})`,0);
        if(max_trade_budget === "0") max_trade_budget = this.max_trade_budget;
        assert.isNumericString(max_trade_budget,`max_usd(${max_trade_budget})`,0);
        return tools.greaterThanOrEqualTo(max_trade_budget,trade_amount_usd);
    }
    public static async adjustTradeAmountIfBelowMinimum(trade_amount_usd:string,min_trade_budget:string="0"):Promise<string>{
        const method = "adjustTradeAmountIfBelowMinimum";
        assert.isNumericString(trade_amount_usd,`trade_amount_usd(${trade_amount_usd})`);
        if(min_trade_budget === "0") min_trade_budget = this.min_trade_budget;
        assert.isNumericString(min_trade_budget,`min_trade_budget(${min_trade_budget})`,0);
        return tools.lesserThan(trade_amount_usd,min_trade_budget) ? min_trade_budget : trade_amount_usd;
    }
    public static async getOpenTradesBetween(pair:string,from:number,to:number):Promise<eth_trade[]>{
        const query = new eth_trade();
        await query.list(
            " WHERE pair=:pair AND open_time_added>=:from AND open_time_added<=:to AND (status=:open OR status=:pending_open) ",
            {pair:pair,from:from,to:to,open:TRADE_STATUS.OPEN,pending_open:TRADE_STATUS.PENDING_OPEN});
        return query._dataList as eth_trade[];
    }
    public static async checkBalance(){
        let currentBusdBalanceValue = "0";
        if(this.quote_contract.toLowerCase() === eth_config.getEthContract().toLowerCase()){
            const bnbBalance = await eth_worker.getETHBalance(eth_config.getHotWalletAddress());
            const bnb_usd = await eth_price_track_details_tools.getBnbUsdPrice(time_helper.getCurrentTimeStamp());
            currentBusdBalanceValue = tools.multiply(bnbBalance,bnb_usd);
        }
        else if(this.quote_contract.toLowerCase() === eth_config.getBusdContract().toLowerCase()){
            currentBusdBalanceValue = await web3_token.getBalanceOf(eth_config.getBusdContract(),eth_config.getHotWalletAddress());
        }
        else{
            const quoteInfo = await eth_contract_data_tools.getContractViaAddressStrict(this.quote_contract);
            throw new Error(`quote contract(${this.quote_contract}) symbol(${quoteInfo.symbol}) not supported`);
        }
        if(tools.lesserThan(currentBusdBalanceValue,this.max_trade_budget)){
            throw new HotWalletInsufficientBalance(`not enough balance. max_trade_budget(${this.max_trade_budget}) current busd balance value:${currentBusdBalanceValue}`);
        }
    }
    //endregion UTILITIES
}

class CurrentHourTimeRange{
    public currentTime:Dayjs;
    public startTime:Dayjs;
    public endTime:Dayjs;
    public constructor() {
        this.currentTime = time_helper.getTime(time_helper.getCurrentTimeStamp(),"UTC");
        this.startTime = time_helper.startOfHour(this.currentTime.unix(),"UTC");
        this.endTime = time_helper.endOfHour(this.currentTime.unix(),"UTC");
    }
}

class HotWalletInsufficientBalance extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'HotWalletInsufficientBalance';
        Object.setPrototypeOf(this, HotWalletInsufficientBalance.prototype);
    }
}

if(argv.includes("run_worker_trade_bot")){
    console.log(`running worker_trade_bot on db ${config.getConfig().db_name}`);
    worker_trade_bot.run().finally();
}