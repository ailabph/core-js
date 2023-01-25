import {assert,tools,connection,eth_config} from "./ailab-core";
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

    // note: no web3 implementation in this class
    public static async run():Promise<void>{

        if(this.start_time < 0) {
            const currentTime = tools.getTime();
            this.log(`running strategy worker | ${currentTime.format()}`);
            this.start_time = currentTime.unix();
            this.buy_tax = await eth_worker_trade_strategy.getBuyTax();
            this.sell_tax = await eth_worker_trade_strategy.getSellTax();
            this.target_profit_percentage = eth_worker_trade_strategy.getTargetProfit() + this.sell_tax;
            this.stop_loss = eth_worker_trade_strategy.getStopLoss();
            this.log(`buy_tax:${this.buy_tax}`);
            this.log(`sell_tax:${this.sell_tax}`);
            this.log(`target_profit:${this.target_profit_percentage}`);
            this.log(`stop_loss:${this.stop_loss}`);
        }

        await connection.startTransaction();
        try{
            // get last trade event unprocessed
            const unprocessed_trade_event = new eth_contract_events();
            await unprocessed_trade_event.list(" WHERE time_strategy_processed IS NULL AND block_time > :from  ",{from:this.start_time}," ORDER BY blockNumber ASC, id ASC LIMIT 1 ");
            if(unprocessed_trade_event.count() > 0){
                for(const event of unprocessed_trade_event._dataList as eth_contract_events[]){
                    const current_bnb_usd = assert.isNumber(event.bnb_usd,"bnb_usd",0);
                    const current_bnb_token = assert.isNumber(event.token_bnb,"token_bnb",0);
                    if(event.type === "sell"){
                        let buy_remarks:string[] = [];
                        buy_remarks.push(this.log(`sell trade detected from ${event.txn_hash}`));
                        let sell_value = assert.isNumber( event.token_usd_value,"token_usd_value",0);
                        buy_remarks.push(this.log(`sold ${event.fromAmountGross} ${event.fromSymbol} USD value ${event.token_usd_value}`));
                        let total_base_buy_usd_value = 0;
                        let target_buy_time = tools.getCurrentTimeStamp();
                        while(total_base_buy_usd_value < sell_value) {
                            buy_remarks.push(this.log(`bnb_usd:${current_bnb_usd}`));
                            const target_buy_usd_value = eth_worker_trade_strategy.generateRandomBuyAmount();
                            buy_remarks.push(this.log(`target buy usd value:${target_buy_usd_value}`));
                            total_base_buy_usd_value += target_buy_usd_value;
                            const base_amount = target_buy_usd_value / current_bnb_usd;
                            buy_remarks.push(this.log(`estimated bnb buy amount:${base_amount}`));
                            buy_remarks.push(this.log(`adding buy order of token ${eth_config.getTokenSymbol()} for bnb:${base_amount} to be executed on ${tools.getTime(target_buy_time).format()})`));
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
                            newTrade.open_base_amount = tools.toBn(base_amount).toFixed(18);
                            newTrade.open_desired_usd_value = tools.toBn(target_buy_usd_value).toFixed(18);
                            newTrade.open_remarks = JSON.stringify(buy_remarks);
                            newTrade.open_status = TRADE_BUY_SELL_STATUS.PENDING;
                            newTrade.status = TRADE_STATUS.OPEN;
                            await newTrade.save();

                            target_buy_time += eth_worker_trade_strategy.getRandomMinutesInSeconds();
                        }
                    }
                    const openTrades = await eth_worker_trade_strategy.getOpenTrades();
                    for(const open_trade of openTrades._dataList as eth_trade[]){
                        let sell_remarks:string[] = [];
                        const open_bnb_token = assert.isNumber(open_trade.open_bnb_token,"open_bnb_token",0);
                        const diff = tools.toBn(current_bnb_token).minus(tools.toBn(open_bnb_token));
                        const diff_percentage = diff.dividedBy(tools.toBn(open_bnb_token));
                        let close_trade = false;

                        sell_remarks.push(this.log(`checking open trade id:${open_trade.id}`));
                        sell_remarks.push(this.log(`open_bnb_token:${open_bnb_token}`));
                        sell_remarks.push(this.log(`current_bnb_token:${current_bnb_token}`));
                        sell_remarks.push(this.log(`diff_percentage:${diff_percentage.toFixed(18)}`));

                        // target reached
                        if(diff_percentage.comparedTo(tools.toBn(this.target_profit_percentage)) === 1){
                            close_trade = true;
                            sell_remarks.push(this.log(`target reached, closing trade`));
                        }

                        // if not yet closed and stop loss
                        if(open_trade.status === TRADE_STATUS.OPEN && diff_percentage.comparedTo(tools.toBn(this.stop_loss)) === -1){
                            close_trade = true;
                            sell_remarks.push(this.log(`stop loss reached, closing trade`));
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
            }
            await connection.commit();
        }catch (e){
            await connection.rollback();
            console.log(e);
        }

        await run();
    }

    private static log(msg:string):string{
        console.log(msg);
        return msg;
    }

    //region GETTERS
    private static async getBuyTax():Promise<number>{
        let buy_tax = 0;
        const recentBuy = new eth_contract_events();
        await recentBuy.list(" WHERE type=:buy ",{buy:"buy"}," ORDER BY blockNumber DESC, id DESC LIMIT 1 ");
        if(recentBuy.count() > 0){
            buy_tax = assert.isNumber(recentBuy.getItem().tax_percentage,"tax_percentage",undefined);
        }
        return buy_tax;
    }

    private static async getSellTax():Promise<number>{
        let sell_tax = 0;
        const recentSell = new eth_contract_events();
        await recentSell.list(" WHERE type=:sell ",{sell:"sell"}," ORDER BY blockNumber DESC, id DESC LIMIT 1 ");
        if(recentSell.count() > 0){
            sell_tax = assert.isNumber(recentSell.getItem().tax_percentage,"tax_percentage",undefined);
        }
        return sell_tax;
    }

    private static async getOpenTrades():Promise<eth_trade>{
        const openTrades = new eth_trade();
        await openTrades.list(" WHERE status=:open ",{open:TRADE_STATUS.OPEN}," ORDER BY id ASC ");
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