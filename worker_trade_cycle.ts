import {trade_cycle} from "./build/trade_cycle";
import {TIME_FORMATS, time_helper} from "./time_helper";
import {trade_days} from "./build/trade_days";
import {argv} from "process";
import {assert} from "./assert";
import {INTERVAL, INTERVAL_DATA, time_range} from "./time_range";
import {tools} from "./tools";

// below is a type with properties with timestamp_start, timestamp_end, datetime_from as string, datetime_end as string
export type trade_cycle_to_process = {
    timestamp_start:number,
    timestamp_end:number,
    datetime_from:string,
    datetime_end:string
}

export class worker_trade_cycle{

    private static readonly SUBSCRIPTION_TYPE:string = "binance_chain_front_runner";
    private static readonly BINANCE_START_FROM:number = 1682035200; //  Friday, April 21, 2023 12:00:00 AM UTC
    private static readonly BINANCE_START_TO:number = 1685577599; // Wednesday, May 31, 2023 11:59:59 PM UTC

    private static lastMsg:string = "";
    private static log(msg:string, method:string){
        const formatTime = time_helper.getAsFormat(time_helper.getCurrentTimeStamp(),TIME_FORMATS.READABLE);
        if(this.lastMsg !== msg){
            console.log(`${formatTime}|${method}|${msg}`);
            this.lastMsg = msg;
        }
    }
    
    // NEW IMPLEMENTATION
    private static async checkDelayMode():Promise<void>{
        await tools.sleep(250);
    }
    public static async run(){
        const method = "run";
        const ranges = worker_trade_cycle.generateRanges();
        await worker_trade_cycle.syncRangesCycleRecord(ranges);
    }
    private static getFirstMonthRange():INTERVAL_DATA{
        return time_range.createCustomRange(worker_trade_cycle.BINANCE_START_FROM,worker_trade_cycle.BINANCE_START_TO,"UTC");
    }
    private static generateRanges():INTERVAL_DATA[]{
        const method = "generateRanges";
        const startRange = time_range.getTimeRange(worker_trade_cycle.BINANCE_START_FROM,INTERVAL.DAY,"UTC");
        const toRange = time_range.getTimeRange(time_helper.getCurrentTimeStamp(),INTERVAL.DAY,"UTC");

        this.log(`subscription_type ${worker_trade_cycle.SUBSCRIPTION_TYPE}`,method);

        // 1) create list of all cycles
        this.log(`retrieving all cycles starting from ${startRange.from_dateTime_MySql} to ${toRange.to_dateTime_MySql} `,method);
        const ranges:INTERVAL_DATA[] = [];
        ranges.push(worker_trade_cycle.getFirstMonthRange());
        const restOfRanges = time_range.createRanges(ranges[0].to+1,toRange.to,INTERVAL.MONTH,"UTC");
        // adds restOfRanges to ranges
        for(const range of restOfRanges){
            ranges.push(range);
        }
        this.log(`found ${ranges.length} ranges`,method);
        console.table(ranges);
        return ranges;
    }
    private static async syncRangesCycleRecord(ranges:INTERVAL_DATA[]):Promise<void>{
        const method = "syncRangesCycleRecord";
        let rangeIndex = 0;
        for(const range of ranges){
            await this.checkDelayMode();
            this.log(`${++rangeIndex}| checking ${range.from_dateTime_MySql} - ${range.to_dateTime_MySql} record exits`,method);
            const cycle = new trade_cycle();
            cycle.subscription_type = worker_trade_cycle.SUBSCRIPTION_TYPE;
            cycle.from_time = range.from;
            await cycle.fetch();
            if(cycle.to_time !== range.to){
                throw new Error(`cycle.to_time ${cycle.to_time} !== range.to ${range.to}`);
            }
            if(cycle.isNew()){
                this.log(`${rangeIndex}|-- does not exist, adding record`,method);
                cycle.subscription_type = worker_trade_cycle.SUBSCRIPTION_TYPE;
                cycle.period_tag = worker_trade_cycle.generateTag(range.from,range.to);
                cycle.period_desc = worker_trade_cycle.generateDescription(worker_trade_cycle.SUBSCRIPTION_TYPE,range.from,range.to);
                cycle.from_time = range.from;
                cycle.to_time = range.to;
                const days = time_range.createRanges(range.from,range.to,INTERVAL.DAY,"UTC");
                cycle.total_days = days.length;
                cycle.status = "open";
                await cycle.save();
                this.log(`${rangeIndex}|-- added id:${cycle.id}`,method);
            }
            else{
                this.log(`${rangeIndex}|-- exists`,method);
            }
        }
    }
    static generateTag(from_timestamp: number, to_timestamp: number): string {
        // Create new Date objects from the timestamps
        let fromDate = new Date(from_timestamp * 1000);
        let toDate = new Date(to_timestamp * 1000);

        // Define an array of month names
        let monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

        // Get the components of the dates
        let fromMonth = monthNames[fromDate.getUTCMonth()];
        let fromDay = fromDate.getUTCDate();
        let fromYear = fromDate.getUTCFullYear();

        let toMonth = monthNames[toDate.getUTCMonth()];
        let toDay = toDate.getUTCDate();
        let toYear = toDate.getUTCFullYear();

        // Return the tag
        return `${fromMonth}_${fromDay}_${fromYear}_to_${toMonth}_${toDay}_${toYear}`;
    }
    static generateDescription(type: string, from: number, to: number): string {
        // Create new Date objects from the timestamps
        let fromDate = new Date(from * 1000);
        let toDate = new Date(to * 1000);

        // Define an array of month names
        let monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        // Get the components of the dates
        let fromMonth = monthNames[fromDate.getUTCMonth()];
        let fromDay = fromDate.getUTCDate();
        let fromYear = fromDate.getUTCFullYear();

        let toMonth = monthNames[toDate.getUTCMonth()];
        let toDay = toDate.getUTCDate();
        let toYear = toDate.getUTCFullYear();

        // Convert the type to title case
        let typeTitleCase = type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

        // Return the description
        return `${typeTitleCase} ${fromMonth} ${fromDay}, ${fromYear} to ${toMonth} ${toDay}, ${toYear}`;
    }


    // OLD IMPLEMENTATION
    public static async retrieveTradeCycleToProcess():Promise<trade_cycle|false>{
        const method = "retrieveTradeCycleToProcess";
        this.log('retrieving trade cycles to process',method);
        const trade_cycles = new trade_cycle();
        await trade_cycles.list(" WHERE 1 ");

        if(trade_cycles.count() === 0){
            this.log(`no trade cycles found, initiating`,method);
            const from = time_helper.getTime('2023-04-21','UTC').startOf('D');
            const to = time_helper.getTime('2023-05-31','UTC').endOf('D');
            this.log(`retrieving trade days from ${from.format(TIME_FORMATS.ISO)} to ${to.format(TIME_FORMATS.ISO)}`,method);
            const trade_days_records = new trade_days();
            await trade_days_records.list(
                " WHERE from_time>=:from AND to_time<=:to ",{from:from.unix(),to:to.unix()},
                " ORDER BY date_period ASC ");
            if(trade_days_records.count() === 0) throw new Error(`no trade days found`);
            let total_profit = 0;
            for(const trade of trade_days_records._dataList as trade_days[]){
                this.log(`date period: ${trade.date_period} ${(trade.est_profit_percentage??0) * 100}`,method);
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
            this.log(`${newTradeCycle.period_tag} profit ${(newTradeCycle.total_profit_percentage??0) * 100}%`,method);
            return newTradeCycle;
        }

        // update current cycle
        const currentPeriodTag = this.getCurrentMonthStartAndEnd();
        this.log(`updating current trade cycle ${currentPeriodTag}`,method);
        const checkCycle = new trade_cycle();
        checkCycle.period_tag = currentPeriodTag;
        await checkCycle.fetch();
        if(checkCycle.isNew()){
            this.log(`trace cycle not yet initiated, creating...`,method);
            checkCycle.subscription_type = "binance_chain_front_runner";
            checkCycle.period_desc = "Binance Chain Front Runner "+this.getCurrentMonthStartAndEndFormatted();
            checkCycle.from_time = time_helper.getTime(time_helper.getCurrentTimeStamp(),"UTC").startOf("month").unix();
            checkCycle.to_time = time_helper.getTime(time_helper.getCurrentTimeStamp(),"UTC").endOf("month").unix();
            checkCycle.total_days = 0;
            checkCycle.total_profit_percentage = 0;
            checkCycle.status = "ongoing";
            await checkCycle.save();
        }
        this.log(`syncing trade days of current trade cycle from_time ${checkCycle.from_time} to_time ${checkCycle.to_time}`,method);
        const checkTradeDays = new trade_days();
        await checkTradeDays.list(" WHERE from_time>=:from AND to_time<=:to ",{from:checkCycle.from_time,to:checkCycle.to_time});
        checkCycle.total_days = checkTradeDays.count();
        this.log(`total_days ${checkCycle.total_days}`,method);
        let total_profit = 0;
        for(const trade of checkTradeDays._dataList as trade_days[]){
            this.log(`date period: ${trade.date_period} ${(trade.est_profit_percentage??0) * 100}`,method);
            const est_profit_percentage_parse = assert.positiveNumber(trade.est_profit_percentage,`est_profit_percentage`);
            total_profit = est_profit_percentage_parse + total_profit;
        }
        this.log(`total profit percentage ${checkCycle.total_profit_percentage}`,method);
        checkCycle.total_profit_percentage = total_profit;
        await checkCycle.save();

        // query cycle that is not done and complete it

        return false;
    }
    private static getCurrentMonthStartAndEnd(): string {
        const startDate = new Date();
        startDate.setDate(1);

        const endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + 1);
        endDate.setDate(0);

        const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
        const monthName = monthNames[startDate.getMonth()];

        return `${monthName}_${startDate.getDate()}_${startDate.getFullYear()}_to_${monthName}_${endDate.getDate()}_${endDate.getFullYear()}`;
    }
    private static getCurrentMonthStartAndEndFormatted(): string {
        const startDate = new Date();
        startDate.setDate(1);

        const endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + 1);
        endDate.setDate(0);

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthName = monthNames[startDate.getMonth()];

        return `${monthName} ${startDate.getDate()} ${startDate.getFullYear()} to ${monthName} ${endDate.getDate()} ${endDate.getFullYear()}`;
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

if(argv.includes("run_worker_trade_cycle")){
    console.log(`running worker to process trade cycle`);
    worker_trade_cycle.run().finally();
}