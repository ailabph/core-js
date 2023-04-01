import {config} from "./config";
import {tools} from "./tools";
import {eth_trade} from "./build/eth_trade";
import {TRADE_STATUS} from "./eth_trade_tools";
import {assert} from "./assert";
import {eth_price_track_details_tools} from "./eth_price_track_details_tools";
import {INTERVAL, time_helper} from "./time_helper";
import {BAR_COLOR, eth_ohlc_tool, OHLC_DETAILED} from "./eth_ohlc_tool";
import {system_settings_header} from "./build/system_settings_header";
import {web3_tools} from "./web3_tools";
import {ohlc_details} from "./build/ohlc_details";

export class worker_trade_bot{

    public static SETTING_PAIR_TO_TRADE = "pair_to_trade";
    public static SETTING_MIN_TRADE_BUDGET = "min_trade_budget";
    public static SETTING_MAX_TRADE_BUDGET = "max_trade_budget";
    public static SETTING_AGGRESSIVE_MODE = "aggressive_mode";
    public static SETTING_ENABLE_BOT = "enable_bot";

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=true):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`${this.name}|${method}|${msg}`);
            if(end) console.log(`${this.name}|${method}|${tools.LINE}`);
        }
    }

    //region PARAMETERS
    private static async getPairToTrade():Promise<string>{
        const setting = new system_settings_header();
        setting.name = this.SETTING_PAIR_TO_TRADE;
        await setting.fetch();
        if(setting.isNew()) throw new Error(`no pair to trade setting set`);
        if(!(await web3_tools.isContractAddress(setting.value))) throw new Error(`pair_to_trade(${setting.value}) is not a contract address`);
        return setting.value;
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
    private static async runBot():Promise<boolean>{
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

    public static async run():Promise<void>{
        const method = "run";
        try {
            let hasProcessed = false;

            if (!hasProcessed) hasProcessed = await this.checkOpenTradesMaturity();

            if(!hasProcessed){
                const ohlc_bar = await eth_ohlc_tool.getLatestCandle(await this.getPairToTrade(),INTERVAL.HOUR);
                await this.strategy1(ohlc_bar);
            }
        }
        catch (e){
            if(!(e instanceof Error)) throw e;
            this.log(`ERROR ${e.message}`,method);
        }
        await tools.sleep(1000);
        setImmediate(()=>{
            worker_trade_bot.run().finally();
        });
    }
    private static async checkOpenTradesMaturity():Promise<boolean>{
        const method = "closeOpenTrade";
        let hasProcessed = false;
        const trades = new eth_trade();
        await trades.list(
            " WHERE status=:open ",
            {open:TRADE_STATUS.OPEN},
            " ORDER id ASC LIMIT 1 ");
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
        const ohlc = eth_ohlc_tool.convertDbToOhlcDetailed(ohlc_bar);
        let hasTraded = false;
        let openTrade = false;
        let openTradeAmount = 0;

        // if there is volume, check if it is red bar, compute cost to make it green
        if(tools.greaterThan(ohlc.volume,0) && ohlc.color === BAR_COLOR.RED){
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
    public static openTradeProfitCheck(openTrade:eth_trade, currentUsdPrice:number|string):boolean{
        const method = "openTradeProfitCheck";
        this.log(`open_token_usd_price(${openTrade.open_token_usd_price}) currentUsdPrice(${currentUsdPrice})`,method);
        if(openTrade.status !== TRADE_STATUS.OPEN) throw new Error(`${method} openTrade(${openTrade.id}) status(${openTrade.status}) is not open`);
        if(typeof currentUsdPrice === "string") assert.isNumericString(currentUsdPrice,`currentUsdPrice(${currentUsdPrice})`,0);
        openTrade.take_profit_percentage = assert.positiveNumber(openTrade.take_profit_percentage,`openTrade(${openTrade.id}).take_profit_percentage(${openTrade.take_profit_percentage})`);
        openTrade.open_token_usd_price = assert.isNumericString(openTrade.open_token_usd_price,`openTrade(${openTrade.id}).open_token_usd_price(${openTrade.open_token_usd_price})`,0);

        const percentageDiff = tools.percentageDifference(openTrade.open_token_usd_price,currentUsdPrice,`num1:currentUsdPrice(${currentUsdPrice}) num2:openTrade(${openTrade.id}).open_token_usd_price(${openTrade.open_token_usd_price})`);
        this.log(`take_profit_percentage(${openTrade.take_profit_percentage})`,method);
        this.log(`percentageDiff(${percentageDiff})`,method);
        return tools.greaterThanOrEqualTo(percentageDiff,openTrade.take_profit_percentage,`percentageDiff(${percentageDiff}) >= openTrade(${openTrade.id}).take_profit_percentage(${openTrade.take_profit_percentage})`);
    }
    public static openTradeStopLossCheck(openTrade:eth_trade, currentUsdPrice:number|string){
        const method = "openTradeStopLossCheck";
        this.log(`open_token_usd_price(${openTrade.open_token_usd_price}) currentUsdPrice(${currentUsdPrice})`,method);
        if(openTrade.status !== TRADE_STATUS.OPEN) throw new Error(`${method} openTrade(${openTrade.id}) status(${openTrade.status}) is not open`);
        if(typeof currentUsdPrice === "string") assert.isNumericString(currentUsdPrice,`currentUsdPrice(${currentUsdPrice})`,0);
        openTrade.stop_loss_percentage = assert.positiveNumber(openTrade.stop_loss_percentage,`openTrade(${openTrade.id}).stop_loss_percentage(${openTrade.stop_loss_percentage})`);
        openTrade.open_token_usd_price = assert.isNumericString(openTrade.open_token_usd_price,`openTrade(${openTrade.id}).open_token_usd_price(${openTrade.open_token_usd_price})`,0);

        const percentageDiff = tools.percentageDifference(currentUsdPrice,openTrade.open_token_usd_price,`num1:currentUsdPrice(${currentUsdPrice}) num2:openTrade(${openTrade.id}).open_token_usd_price(${openTrade.open_token_usd_price})`);
        this.log(`stop_loss_percentage(${openTrade.stop_loss_percentage})`,method);
        this.log(`percentageDiff(${percentageDiff})`,method);
        return tools.greaterThanOrEqualTo(percentageDiff,openTrade.stop_loss_percentage,`percentageDiff(${percentageDiff}) >= openTrade(${openTrade.id}).stop_loss_percentage(${openTrade.stop_loss_percentage})`);
    }
    public static greenBarUsd(ohlc_bar:OHLC_DETAILED):string{
        let cost = "0";

        return cost;
    }
    //endregion UTILITIES
}