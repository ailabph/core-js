import {tools} from "./tools";
import {connection} from "./connection";
import {eth_config} from "./eth_config";
import {logger} from "./logger";
import {eth_contract_events} from "./build/eth_contract_events";
import {eth_trade} from "./build/eth_trade";

enum TRADE_STATUS {
    OPEN = "open",
    CLOSED = "close",
    FAILED = "fail",
    CANCELLED = "cancel",
}
export { TRADE_STATUS };

enum TRADE_BUY_SELL_STATUS {
    PENDING = "pending",
    DONE = "done",
    FAILED = "failed",
}

export { TRADE_BUY_SELL_STATUS }

export class eth_worker_trade_strategy{

    private static start_time:number = -1;
    private static buy_tax:number = -1;
    private static sell_tax:number = -1;
    private static target_profit_percentage:number = -1;
    private static stop_loss:number = -1;
    private static has_run:boolean = false;

    // note: no web3 implementation in this class
    public static async run(recursive:boolean = true, start_time_override:number = -1, enable_transaction:boolean = true):Promise<void>{
        if(start_time_override > 0) this.start_time = start_time_override;
        if(this.start_time < 0) {
            this.start_time = tools.getTime().unix();
        }
        if(!this.has_run){
            this.has_run = true;
            await this.log(`running strategy worker | ${tools.getTime(this.start_time).format()}`);
            this.buy_tax = await eth_worker_trade_strategy.getBuyTax();
            this.sell_tax = await eth_worker_trade_strategy.getSellTax();
            this.target_profit_percentage = eth_worker_trade_strategy.getTargetProfit() + this.sell_tax;
            this.stop_loss = eth_worker_trade_strategy.getStopLoss();
            await this.log(`buy_tax:${this.buy_tax}`);
            await this.log(`sell_tax:${this.sell_tax}`);
            await this.log(`target_profit:${this.target_profit_percentage}`);
            await this.log(`stop_loss:${this.stop_loss}`);
        }

        if(enable_transaction) await connection.startTransaction();
        try{
            // get last trade event unprocessed
            const unprocessed_trade_event = new eth_contract_events();
            let queryOrder = " ORDER BY blockNumber ASC, id ASC ";
            if(recursive) queryOrder += " LIMIT 1 ";
            await unprocessed_trade_event.list(" WHERE time_strategy_processed IS NULL AND block_time >= :from  ",{from:this.start_time}, queryOrder);
            for(const event of unprocessed_trade_event._dataList as eth_contract_events[]){
                await this.log(`trade event detected:${event.type} hash:${event.txn_hash}`);
                const current_bnb_usd = tools.numericToString({val:event.bnb_usd,name:"bnb_usd",strict:true});
                const current_bnb_token = tools.numericToString({val:event.token_bnb,name:"token_bnb",strict:true});
                if(event.type === "sell"){
                    let buy_remarks:string[] = [];
                    buy_remarks.push(await this.log(`sell trade detected from ${event.txn_hash}`));
                    let sell_value = tools.numericToString({val:event.token_usd_value,name:"token_usd_value",strict:true});
                    buy_remarks.push(await this.log(`sold ${event.fromAmountGross} ${event.fromSymbol} USD value ${event.token_usd_value}`));
                    let total_base_buy_usd_value = 0;
                    let target_buy_time = tools.getCurrentTimeStamp();
                    while(tools.toBn(total_base_buy_usd_value).comparedTo(tools.toBn(sell_value)) < 0) {
                        buy_remarks.push(await this.log(`bnb_usd:${current_bnb_usd}`));
                        const target_buy_usd_value = eth_worker_trade_strategy.generateRandomBuyAmount();
                        buy_remarks.push(await this.log(`target buy usd value:${target_buy_usd_value}`));
                        total_base_buy_usd_value += target_buy_usd_value;
                        const base_amount = tools.toBn(target_buy_usd_value).dividedBy(tools.toBn(current_bnb_usd)).toFixed(18);
                        buy_remarks.push(await this.log(`estimated bnb buy amount:${base_amount}`));
                        buy_remarks.push(await this.log(`adding buy order of token ${eth_config.getTokenSymbol()} for bnb:${base_amount} to be executed on ${tools.getTime(target_buy_time).format()})`));
                        const newTrade = new eth_trade();
                        newTrade.pair = `${eth_config.getEthSymbol()}${eth_config.getTokenSymbol()}`;
                        newTrade.base_contract = eth_config.getEthContract();
                        newTrade.base_symbol = eth_config.getEthSymbol();
                        newTrade.base_decimal = eth_config.getEthDecimal();
                        newTrade.quote_contract = eth_config.getTokenContract();
                        newTrade.quote_symbol = eth_config.getTokenSymbol();
                        newTrade.quote_decimal = eth_config.getTokenDecimal();
                        newTrade.open_time_added = tools.getCurrentTimeStamp();
                        newTrade.open_time_executed = target_buy_time;
                        newTrade.open_base_amount = base_amount;
                        newTrade.open_desired_usd_value = tools.toBn(target_buy_usd_value).toFixed(18);
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
                for(const open_trade of openTrades._dataList as eth_trade[]){
                    let sell_remarks:string[] = [];
                    const open_bnb_token = tools.numericToString({val:open_trade.open_bnb_token,name:"open_bnb_token",strict:true});
                    const diff = tools.toBn(current_bnb_token).minus(tools.toBn(open_bnb_token));
                    const diff_percentage = diff.dividedBy(tools.toBn(open_bnb_token));
                    let close_trade = false;

                    sell_remarks.push(await this.log(`checking open trade id:${open_trade.id}`));
                    sell_remarks.push(await this.log(`open_bnb_token:${open_bnb_token}`));
                    sell_remarks.push(await this.log(`current_bnb_token:${current_bnb_token}`));
                    sell_remarks.push(await this.log(`diff_percentage:${diff_percentage.toFixed(18)}`));

                    // target reached
                    if(diff_percentage.comparedTo(tools.toBn(this.target_profit_percentage)) === 1){
                        close_trade = true;
                        sell_remarks.push(await this.log(`target reached, closing trade`));
                    }

                    // if not yet closed and stop loss
                    if(open_trade.status === TRADE_STATUS.OPEN && diff_percentage.comparedTo(tools.toBn(this.stop_loss)) === -1){
                        close_trade = true;
                        sell_remarks.push(await this.log(`stop loss reached, closing trade`));
                    }

                    if(close_trade){
                        open_trade.close_quote_amount = open_trade.open_quote_amount;
                        open_trade.close_status = TRADE_BUY_SELL_STATUS.PENDING;
                        open_trade.close_time_added = tools.getCurrentTimeStamp();
                        open_trade.close_time_executed = tools.getCurrentTimeStamp();
                        open_trade.close_remarks = JSON.stringify(sell_remarks);
                        await open_trade.save();
                    }
                }

                event.time_strategy_processed = tools.getCurrentTimeStamp();
                await event.save();
            }
            if(enable_transaction) await connection.commit();
        }catch (e){
            if(enable_transaction) await connection.rollback();
            console.log(e);
        }
        if(recursive) await eth_worker_trade_strategy.run();
        else await this.log("strategy worker done");
    }

    private static async log(msg:string):Promise<string>{
        await logger.add(msg,"strategy",true);
        return msg;
    }

    //region GETTERS
    private static async getBuyTax():Promise<number>{
        let buy_tax = 0;
        const recentBuy = new eth_contract_events();
        await recentBuy.list(" WHERE type=:buy ",{buy:"buy"}," ORDER BY blockNumber DESC, id DESC LIMIT 1 ");
        if(recentBuy.count() > 0){
            const buyEvent = recentBuy.getItem();
            if(buyEvent.tax_percentage === undefined || buyEvent.tax_percentage === null){
                buy_tax = 0;
            }
            else{
                buy_tax = tools.parseNumber(buyEvent.tax_percentage,"tax_percentage",true);
            }
        }
        return buy_tax;
    }

    private static async getSellTax():Promise<number>{
        let sell_tax = 0;
        const recentSell = new eth_contract_events();
        await recentSell.list(" WHERE type=:sell ",{sell:"sell"}," ORDER BY blockNumber DESC, id DESC LIMIT 1 ");
        if(recentSell.count() > 0){
            const sellEvent = recentSell.getItem();
            if(sellEvent.tax_percentage === undefined || sellEvent.tax_percentage === null){
                sell_tax = 0;
            }
            else{
                sell_tax = tools.parseNumber(sellEvent.tax_percentage,"tax_percentage",true);
            }
        }
        return sell_tax;
    }

    public static async getOpenTrades():Promise<eth_trade>{
        const openTrades = new eth_trade();
        await openTrades.list(" WHERE status=:open AND open_status=:trade_done ",{open:TRADE_STATUS.OPEN,trade_done:TRADE_BUY_SELL_STATUS.DONE}," ORDER BY id ASC ");
        return openTrades;
    }

    private static getTargetProfit():number{
        return 0.1; // 10%
    }

    private static getStopLoss():number{
        return -0.2; // -20%
    }

    private static getMinimumBuyUsd():number{
        return 30;
    }

    private static getMaximumBuyUsd():number{
        return 50;
    }

    private static generateRandomBuyAmount():number{
        return tools.generateRandomNumber(eth_worker_trade_strategy.getMinimumBuyUsd(),eth_worker_trade_strategy.getMaximumBuyUsd());
    }

    private static getRandomMinutesInSeconds(from_min:number = 3,to_min:number = 5):number{
        const min = from_min * 60;
        const max = to_min * 60;
        return Math.abs(tools.generateRandomNumber(min,max));
    }
    //endregion END OF GETTERS
}