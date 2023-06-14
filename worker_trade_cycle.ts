import {trade_cycle} from "./build/trade_cycle";
import {TIME_FORMATS, time_helper} from "./time_helper";
import {trade_days} from "./build/trade_days";
import { argv } from "process";
import {assert} from "./assert";

export class worker_trade_cycle{
    public static async retrieveTradeCycleToProcess():Promise<trade_cycle|false>{
        console.log('retrieving trade cycles to process');
        const trade_cycles = new trade_cycle();
        await trade_cycles.list(" WHERE 1 ");

        if(trade_cycles.count() == 0){
            console.log(`no trade cycles found, initiating`);
            const from = time_helper.getTime('2023-04-21','UTC').startOf('D');
            const to = time_helper.getTime('2023-05-31','UTC').endOf('D');
            console.log(`retrieving trade days from ${from.format(TIME_FORMATS.ISO)} to ${to.format(TIME_FORMATS.ISO)}`);
            const trade_days_records = new trade_days();
            await trade_days_records.list(
                " WHERE from_time>=:from AND to_time<=:to ",{from:from.unix(),to:to.unix()},
                " ORDER BY date_period ASC ");
            if(trade_days_records.count() === 0) throw new Error(`no trade days found`);
            let total_profit = 0;
            for(const trade of trade_days_records._dataList as trade_days[]){
                console.log(`date period: ${trade.date_period} ${(trade.est_profit_percentage??0) * 100}`);
                const est_profit_percentage_parse = assert.positiveNumber(trade.est_profit_percentage,`est_profit_percentage`);
                total_profit = est_profit_percentage_parse + total_profit;
            }
            const newTradeCycle = new trade_cycle();
            newTradeCycle.from_time = from.unix();
            newTradeCycle.to_time = to.unix();
            newTradeCycle.subscription_type = "binance_chain_front_runner";
            newTradeCycle.period_tag = "apr_21_2023_to_may_31_2023";
            newTradeCycle.period_desc = "Binance Chain Front Runner Apr 21 to May 31 2023";
            newTradeCycle.total_days = trade_days_records.count();
            newTradeCycle.total_profit_percentage = total_profit;
            newTradeCycle.status = "done";
            await newTradeCycle.save();
            console.log(`${newTradeCycle.period_tag} profit ${(newTradeCycle.total_profit_percentage??0) * 100}%`);
            return newTradeCycle;
        }

        return false;
    }
}

/**
 * if(argv.includes("run_worker_block_run7")){
    console.log(`running worker to process blocks`);
    worker_block.run7().finally();
}
 */
if(argv.includes("run_retrieveTradeCycleToProcess")){
    worker_trade_cycle.retrieveTradeCycleToProcess().finally();
}