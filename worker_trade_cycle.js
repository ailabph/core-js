"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_trade_cycle = void 0;
const trade_cycle_1 = require("./build/trade_cycle");
const time_helper_1 = require("./time_helper");
const trade_days_1 = require("./build/trade_days");
const process_1 = require("process");
const assert_1 = require("./assert");
const time_range_1 = require("./time_range");
const tools_1 = require("./tools");
class worker_trade_cycle {
    static log(msg, method) {
        const formatTime = time_helper_1.time_helper.getAsFormat(time_helper_1.time_helper.getCurrentTimeStamp(), time_helper_1.TIME_FORMATS.READABLE);
        if (this.lastMsg !== msg) {
            console.log(`${formatTime}|${method}|${msg}`);
            this.lastMsg = msg;
        }
    }
    // NEW IMPLEMENTATION
    static async checkSlowMode() {
        await tools_1.tools.sleep(500);
    }
    static async run() {
        const method = "run";
        const ranges = worker_trade_cycle.generateRanges();
        await worker_trade_cycle.syncRangesCycleRecord(ranges);
        await worker_trade_cycle.updateCycleStatus();
        const minutes = worker_trade_cycle.RESTART_DELAY / 1000 / 60;
        this.log(`restarting in ${minutes} minutes`, method);
        setTimeout(worker_trade_cycle.run, worker_trade_cycle.RESTART_DELAY);
    }
    static getFirstMonthRange() {
        return time_range_1.time_range.createCustomRange(worker_trade_cycle.BINANCE_START_FROM, worker_trade_cycle.BINANCE_START_TO, "UTC");
    }
    static generateRanges() {
        const method = "generateRanges";
        const startRange = time_range_1.time_range.getTimeRange(worker_trade_cycle.BINANCE_START_FROM, time_range_1.INTERVAL.DAY, "UTC");
        const toRange = time_range_1.time_range.getTimeRange(time_helper_1.time_helper.getCurrentTimeStamp(), time_range_1.INTERVAL.DAY, "UTC");
        this.log(`subscription_type ${worker_trade_cycle.SUBSCRIPTION_TYPE}`, method);
        // 1) create list of all cycles
        this.log(`retrieving all cycles starting from ${startRange.from_dateTime_MySql} to ${toRange.to_dateTime_MySql} `, method);
        const ranges = [];
        ranges.push(worker_trade_cycle.getFirstMonthRange());
        const restOfRanges = time_range_1.time_range.createRanges(ranges[0].to + 1, toRange.to, time_range_1.INTERVAL.MONTH, "UTC");
        // adds restOfRanges to ranges
        for (const range of restOfRanges) {
            ranges.push(range);
        }
        this.log(`found ${ranges.length} ranges`, method);
        console.table(ranges);
        return ranges;
    }
    static async syncRangesCycleRecord(ranges) {
        const method = "syncRangesCycleRecord";
        let rangeIndex = 0;
        for (const range of ranges) {
            await this.checkSlowMode();
            this.log(`${++rangeIndex}| checking ${range.from_dateTime_MySql} - ${range.to_dateTime_MySql} record exits`, method);
            const cycle = new trade_cycle_1.trade_cycle();
            cycle.subscription_type = worker_trade_cycle.SUBSCRIPTION_TYPE;
            cycle.from_time = range.from;
            await cycle.fetch();
            if (cycle.isNew()) {
                this.log(`${rangeIndex}|-- does not exist, adding record`, method);
                cycle.subscription_type = worker_trade_cycle.SUBSCRIPTION_TYPE;
                cycle.period_tag = worker_trade_cycle.generateTag(range.from, range.to);
                cycle.period_desc = worker_trade_cycle.generateDescription(worker_trade_cycle.SUBSCRIPTION_TYPE, range.from, range.to);
                cycle.from_time = range.from;
                cycle.to_time = range.to;
                const days = time_range_1.time_range.createRanges(range.from, range.to, time_range_1.INTERVAL.DAY, "UTC");
                cycle.total_days = days.length;
                cycle.status = "open";
                await cycle.save();
                this.log(`${rangeIndex}|-- added id:${cycle.id}`, method);
            }
            else {
                this.log(`${rangeIndex}|-- exists`, method);
            }
            if (cycle.to_time !== range.to) {
                throw new Error(`cycle.to_time ${cycle.to_time} !== range.to ${range.to}`);
            }
        }
    }
    static generateTag(from_timestamp, to_timestamp) {
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
    static generateDescription(type, from, to) {
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
    static async updateCycleStatus() {
        const method = "updateCycleStatus";
        this.log(`updating trade cycle status`, method);
        const allCycles = new trade_cycle_1.trade_cycle();
        await allCycles.list(" WHERE 1 ", {}, " ORDER BY from_time ASC ");
        this.log(`...found ${allCycles.count()} cycles`, method);
        let cycleIndex = 0, totalCycle = allCycles.count();
        for (const cycle of allCycles._dataList) {
            await this.checkSlowMode();
            cycleIndex++;
            this.log(`${cycleIndex}/${totalCycle}| updating cycle ${cycle.subscription_type} ${cycle.period_tag}`, method);
            // check if cycle.total_days is nullish or not a number, throw error
            if (!cycle.total_days || isNaN(cycle.total_days)) {
                throw new Error(`cycle.total_days is nullish or not a number`);
            }
            this.log(`${cycleIndex}/${totalCycle}|-- retrieving trade_days of this cycle`, method);
            const trade_days_records = new trade_days_1.trade_days();
            await trade_days_records.list(" WHERE trade_type=:type AND from_time>=:from AND to_time<=:time AND status=:completed ", { type: cycle.subscription_type, from: cycle.from_time, time: cycle.to_time, completed: "completed" }, " ORDER BY from_time ASC ");
            this.log(`${cycleIndex}/${totalCycle}|-- found ${trade_days_records.count()} completed trade_days out of cycle total days ${cycle.total_days}`, method);
            if (trade_days_records.count() >= cycle.total_days) {
                // sum all est_profit_percentage
                let total_est_profit_percentage = 0;
                // trade_days_collection = array of date_period, est_profit_percentage, status
                const trade_days_collection = [];
                for (const trade_day of trade_days_records._dataList) {
                    trade_days_collection.push({
                        date_period: trade_day.date_period,
                        est_profit_percentage: trade_day.est_profit_percentage,
                        status: trade_day.status
                    });
                }
                console.table(trade_days_collection);
                for (const trade_day of trade_days_records._dataList) {
                    let parsed_est_profit_percentage = 0;
                    // check if it is string and numeric, attempt to parse number
                    if (typeof trade_day.est_profit_percentage === "string") {
                        // check if string is numeric
                        if (isNaN(parseFloat(trade_day.est_profit_percentage))) {
                            throw new Error(`trade_day.est_profit_percentage is not a number`);
                        }
                        parsed_est_profit_percentage = parseFloat(trade_day.est_profit_percentage);
                    }
                    else if (typeof trade_day.est_profit_percentage === "number") {
                        parsed_est_profit_percentage = trade_day.est_profit_percentage;
                    }
                    else {
                        throw new Error(`trade_day.est_profit_percentage is not a string or number`);
                    }
                    total_est_profit_percentage += parsed_est_profit_percentage;
                }
                // format_total_est_profit_percentage = formatted percentage, example 0.01 = 1%
                const format_total_est_profit_percentage = total_est_profit_percentage * 100;
                this.log(`${cycleIndex}/${totalCycle}|-- total profit_percentage is ${format_total_est_profit_percentage}% , updating cycle status to completed`, method);
                cycle.status = "completed";
                cycle.total_est_profit_percentage = format_total_est_profit_percentage;
                await cycle.save();
                this.log(`${cycleIndex}/${totalCycle}|-- updated cycle status to completed`, method);
            }
            else {
                this.log(`${cycleIndex}/${totalCycle}|-- not all trade_days are completed, updating cycle status to open`, method);
                cycle.status = "open";
                await cycle.save();
                this.log(`${cycleIndex}/${totalCycle}|-- updated cycle status to open`, method);
            }
        }
    }
    // OLD IMPLEMENTATION
    static async retrieveTradeCycleToProcess() {
        const method = "retrieveTradeCycleToProcess";
        this.log('retrieving trade cycles to process', method);
        const trade_cycles = new trade_cycle_1.trade_cycle();
        await trade_cycles.list(" WHERE 1 ");
        if (trade_cycles.count() === 0) {
            this.log(`no trade cycles found, initiating`, method);
            const from = time_helper_1.time_helper.getTime('2023-04-21', 'UTC').startOf('D');
            const to = time_helper_1.time_helper.getTime('2023-05-31', 'UTC').endOf('D');
            this.log(`retrieving trade days from ${from.format(time_helper_1.TIME_FORMATS.ISO)} to ${to.format(time_helper_1.TIME_FORMATS.ISO)}`, method);
            const trade_days_records = new trade_days_1.trade_days();
            await trade_days_records.list(" WHERE from_time>=:from AND to_time<=:to ", { from: from.unix(), to: to.unix() }, " ORDER BY date_period ASC ");
            if (trade_days_records.count() === 0)
                throw new Error(`no trade days found`);
            let total_profit = 0;
            for (const trade of trade_days_records._dataList) {
                this.log(`date period: ${trade.date_period} ${(trade.est_profit_percentage ?? 0) * 100}`, method);
                const est_profit_percentage_parse = assert_1.assert.positiveNumber(trade.est_profit_percentage, `est_profit_percentage`);
                total_profit = est_profit_percentage_parse + total_profit;
            }
            const newTradeCycle = new trade_cycle_1.trade_cycle();
            newTradeCycle.from_time = from.unix();
            newTradeCycle.to_time = to.unix();
            newTradeCycle.subscription_type = "binance_chain_front_runner";
            newTradeCycle.period_tag = "apr_21_2023_to_may_31_2023";
            newTradeCycle.period_desc = "Binance Chain Front Runner Apr 21 to May 31 2023";
            newTradeCycle.total_days = trade_days_records.count();
            newTradeCycle.total_profit_percentage = total_profit;
            newTradeCycle.status = "done";
            await newTradeCycle.save();
            this.log(`${newTradeCycle.period_tag} profit ${(newTradeCycle.total_profit_percentage ?? 0) * 100}%`, method);
            return newTradeCycle;
        }
        // update current cycle
        const currentPeriodTag = this.getCurrentMonthStartAndEnd();
        this.log(`updating current trade cycle ${currentPeriodTag}`, method);
        const checkCycle = new trade_cycle_1.trade_cycle();
        checkCycle.period_tag = currentPeriodTag;
        await checkCycle.fetch();
        if (checkCycle.isNew()) {
            this.log(`trace cycle not yet initiated, creating...`, method);
            checkCycle.subscription_type = "binance_chain_front_runner";
            checkCycle.period_desc = "Binance Chain Front Runner " + this.getCurrentMonthStartAndEndFormatted();
            checkCycle.from_time = time_helper_1.time_helper.getTime(time_helper_1.time_helper.getCurrentTimeStamp(), "UTC").startOf("month").unix();
            checkCycle.to_time = time_helper_1.time_helper.getTime(time_helper_1.time_helper.getCurrentTimeStamp(), "UTC").endOf("month").unix();
            checkCycle.total_days = 0;
            checkCycle.total_profit_percentage = 0;
            checkCycle.status = "ongoing";
            await checkCycle.save();
        }
        this.log(`syncing trade days of current trade cycle from_time ${checkCycle.from_time} to_time ${checkCycle.to_time}`, method);
        const checkTradeDays = new trade_days_1.trade_days();
        await checkTradeDays.list(" WHERE from_time>=:from AND to_time<=:to ", { from: checkCycle.from_time, to: checkCycle.to_time });
        checkCycle.total_days = checkTradeDays.count();
        this.log(`total_days ${checkCycle.total_days}`, method);
        let total_profit = 0;
        for (const trade of checkTradeDays._dataList) {
            this.log(`date period: ${trade.date_period} ${(trade.est_profit_percentage ?? 0) * 100}`, method);
            const est_profit_percentage_parse = assert_1.assert.positiveNumber(trade.est_profit_percentage, `est_profit_percentage`);
            total_profit = est_profit_percentage_parse + total_profit;
        }
        this.log(`total profit percentage ${checkCycle.total_profit_percentage}`, method);
        checkCycle.total_profit_percentage = total_profit;
        await checkCycle.save();
        // query cycle that is not done and complete it
        return false;
    }
    static getCurrentMonthStartAndEnd() {
        const startDate = new Date();
        startDate.setDate(1);
        const endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + 1);
        endDate.setDate(0);
        const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
        const monthName = monthNames[startDate.getMonth()];
        return `${monthName}_${startDate.getDate()}_${startDate.getFullYear()}_to_${monthName}_${endDate.getDate()}_${endDate.getFullYear()}`;
    }
    static getCurrentMonthStartAndEndFormatted() {
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
exports.worker_trade_cycle = worker_trade_cycle;
worker_trade_cycle.SUBSCRIPTION_TYPE = "binance_chain_front_runner";
worker_trade_cycle.BINANCE_START_FROM = 1682035200; //  Friday, April 21, 2023 12:00:00 AM UTC
worker_trade_cycle.BINANCE_START_TO = 1685577599; // Wednesday, May 31, 2023 11:59:59 PM UTC
worker_trade_cycle.RESTART_DELAY = 1000 * 60 * 10; // 10 minutes
worker_trade_cycle.lastMsg = "";
/**
 * if(argv.includes("run_worker_block_run7")){
    console.log(`running worker to process blocks`);
    worker_block.run7().finally();
}
 */
if (process_1.argv.includes("run_retrieveTradeCycleToProcess")) {
    worker_trade_cycle.retrieveTradeCycleToProcess().finally();
}
if (process_1.argv.includes("run_worker_trade_cycle")) {
    console.log(`running worker to process trade cycle`);
    worker_trade_cycle.run().finally();
}
//# sourceMappingURL=worker_trade_cycle.js.map