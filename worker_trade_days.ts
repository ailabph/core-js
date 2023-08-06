import {trade_days} from "./build/trade_days";
import {random} from 'lodash';
import {TIME_FORMATS, time_helper} from "./time_helper";
import {argv} from "process";
import {tools} from "./tools";
import {user} from "./build/user";
import Web3 from "web3";
import {web3_rpc_web3} from "./web3_rpc_web3";
import {eth_worker} from "./eth_worker";
import {trade_cycle} from "./build/trade_cycle";
import {INTERVAL, INTERVAL_DATA, time_range} from "./time_range";

const Web3Client:Web3 = web3_rpc_web3.getWeb3Client();
export class worker_trade_days{

    private static async checkSlowMode():Promise<void>{
        await tools.sleep(500);
    }
    private static readonly MIN_PROFIT_PERCENTAGE = 0.001001;
    private static readonly MAX_PROFIT_PERCENTAGE = 0.009001;

    private static lastMsg:string = "";
    private static log(msg:string, method:string){
        const formatTime = time_helper.getAsFormat(time_helper.getCurrentTimeStamp(),TIME_FORMATS.READABLE);
        if(this.lastMsg !== msg){
            console.log(`${formatTime}|${method}|${msg}`);
            this.lastMsg = msg;
        }
    }

    // NEW IMPLEMENTATION
    public static async run2():Promise<void>{

        const trade_cycles = await this.getTradeCycleList();
        await this.getTradingDaysRangeAndSyncRecords(trade_cycles);
        await this.generateDailyProfits();

        // run this every 5 minutes
        this.log(`waiting for 5 minutes before running again`,"run2")
        await tools.sleep(1000*60*5);
        setImmediate(async ()=>{
            await this.run2();
        });
    }
    private static async getTradeCycleList():Promise<trade_cycle[]>{
        const method = "getTradeCycleList";
        this.log(`retrieving current trade cycles`,method);
        const tradeCycle = new trade_cycle();
        await tradeCycle.list(" WHERE 1 ",{},` ORDER BY from_time ASC `);
        this.log(`found ${tradeCycle.count()}`,method);
        return tradeCycle._dataList as trade_cycle[];
    }
    private static async getTradingDaysRangeAndSyncRecords(trade_cycles:trade_cycle[]){
        const method = "getTradingDaysRangeAndSyncRecords";
        let cycleIndex = 0;
        for(const trade_cycle of trade_cycles){
            await this.checkSlowMode();
            this.log(`${++cycleIndex}/${trade_cycles.length}| processing trade cycle ${trade_cycle.period_tag}`,method);
            // generate days list
            const days = time_range.createRanges(trade_cycle.from_time,trade_cycle.to_time,INTERVAL.DAY,"UTC");
            this.log(`${cycleIndex}/${trade_cycles.length}|-- found days ${days.length} days`,method);
            await this.syncTradeDayInCycle(trade_cycle,days);
        }
    }
    private static async syncTradeDayInCycle(cycle:trade_cycle, days:INTERVAL_DATA[]){
        const method = "syncTradeDayInCycle";
        this.log(`syncing trade days for cycle ${cycle.period_tag}`,method);
        let dayIndex = 0;
        for(const day of days){
            await this.checkSlowMode();
            this.log(`${++dayIndex}/${days.length}| processing day ${day.from_dateTime_MySql} to ${day.to_dateTime_MySql}`,method);

            // check if day record exists
            const trade_cycle_day_query = new trade_days();
            await trade_cycle_day_query.list(" WHERE from_time=:from ",{from:day.from}," ORDER BY id ASC ");


            // CHECK DUPLICATE ---------------------
            if(trade_cycle_day_query.count() > 1){
                throw new Error(`duplcate found for day ${day.from_dateTime_MySql} to ${day.to_dateTime_MySql}`);
            }


            // IF NEW ADD RECORD ---------------------
            if(trade_cycle_day_query.count() === 0){
                this.log(`${dayIndex}/${days.length}|-- new day record, adding`,method);
                const trade_cycle_day = new trade_days();
                trade_cycle_day.date_period = day.from_dateTime_MySql;
                trade_cycle_day.trade_type = cycle.subscription_type;
                trade_cycle_day.status = "new";
                trade_cycle_day.total_trades = 0;
                trade_cycle_day.est_profit_percentage = 0;
                trade_cycle_day.est_bnb_earned = "0";
                trade_cycle_day.from_time = day.from;
                trade_cycle_day.to_time = day.to;
                await trade_cycle_day.save();
                this.log(`${dayIndex}/${days.length}|-- new day record, added id:${trade_cycle_day.id}`,method);
                continue;
            }

            const trade_cycle_day = trade_cycle_day_query.getItem();


            // CHECK TO_TIME IS VALID ---------------------

            if(trade_cycle_day.to_time !== day.to){
                throw new Error(`trade_cycle_day.to_time is not the same for day ${trade_cycle_day.to_time} to ${day.to}`);
            }
            else{
                this.log(`${dayIndex}/${days.length}|-- trade_cycle_day.to_time is valid`,method);
            }


            // CHECK TRADE_TYPE IS VALID ---------------------
            if(trade_cycle_day.trade_type !== cycle.subscription_type){
                this.log(`${dayIndex}/${days.length}|-- trade_type is not the same, updating`,method);
                trade_cycle_day.trade_type = cycle.subscription_type;
                await trade_cycle_day.save();
                this.log(`${dayIndex}/${days.length}|-- updated, type_type = ${cycle.subscription_type}`,method);
            }
            else{
                this.log(`${dayIndex}/${days.length}|-- trade_type is valid`,method);
            }


            // CHECK DATE_PERIOD IS VALID ---------------------
            const local_time_range = time_range.getTimeRange(day.from,INTERVAL.DAY,"Asia/Manila");
            const parsed_local_time_ISO = local_time_range.from_dateTime_ISO.replace("+00:00","");
            let parsed_date_period = trade_cycle_day.date_period.replace(".000Z","");
            parsed_date_period = parsed_date_period.replace(/"/g,"");
            if(parsed_date_period !== parsed_local_time_ISO){
                this.log(`${dayIndex}/${days.length}|-- trade_day.date_period(${parsed_date_period}) is not the same with local_time_range.from_dateTime_MySql(${parsed_local_time_ISO}), updating`,method);
                trade_cycle_day.date_period = day.from_dateTime_MySql;
                await trade_cycle_day.save();
                this.log(`${dayIndex}/${days.length}|-- updated, date_period = ${day.from_dateTime_MySql}`,method);
            }
            else{
                this.log(`${dayIndex}/${days.length}|-- date_period is valid`,method);
            }


            // CHECK STATUS IS VALID ---------------------
            const current_timestamp = time_helper.getCurrentTimeStamp();
            if(trade_cycle_day.from_time >= current_timestamp && trade_cycle_day.to_time <= current_timestamp && trade_cycle_day.status !== "active"){
                this.log(`${dayIndex}/${days.length}|-- trade_day.status(${trade_cycle_day.status}) is not active, updating`,method);
                trade_cycle_day.status = "active";
                await trade_cycle_day.save();
                this.log(`${dayIndex}/${days.length}|-- updated, status = active`,method);
            }
            else if(trade_cycle_day.status !== "new" && trade_cycle_day.to_time < current_timestamp && trade_cycle_day.status !== "completed"){
                this.log(`${dayIndex}/${days.length}|-- trade_day.status(${trade_cycle_day.status}) is not completed, updating`,method);
                trade_cycle_day.status = "completed";
                await trade_cycle_day.save();
                this.log(`${dayIndex}/${days.length}|-- updated, status = completed`,method);
            }
            else{
                this.log(`${dayIndex}/${days.length}|-- status is valid`,method);
            }
        }
    }
    private static async generateDailyProfits():Promise<void>{
        const method = `generateDailyProfits`;
        this.log(`generating daily profits`,method);
        const new_trade_days = new trade_days();
        await new_trade_days.list(
            ' WHERE status=:new AND from_time < :current_timestamp ',
            {new:"new",current_timestamp:time_helper.getCurrentTimeStamp()},
            " ORDER BY from_time ASC ");
        this.log(`new trades in the past found ${new_trade_days.count()}`,method);
        let dayIndex = 0, total_days = new_trade_days.count();
        for(const trade_day of new_trade_days._dataList as trade_days[]){
            await this.checkSlowMode();
            dayIndex++;
            this.log(`${dayIndex}/${total_days}| processing day from(${trade_day.date_period})`,method);
            if(typeof trade_day.est_profit_percentage === "number" && trade_day.est_profit_percentage > 0){
                this.log(`${dayIndex}/${total_days}|-- est_profit_percentage is already set, skipping`,method);
                continue;
            }

            trade_day.est_profit_percentage = random(this.MIN_PROFIT_PERCENTAGE, this.MAX_PROFIT_PERCENTAGE, true);
            trade_day.status = "completed";
            await trade_day.save();
            this.log(`${dayIndex}/${total_days}|-- updated, est_profit_percentage = ${trade_day.est_profit_percentage}`,method);
        }
    }



    // OLD IMPLEMENTATION
    public static async run(){

        const usersWithTrade = new user();
        await usersWithTrade.list(" WHERE trading_wallet IS NOT NULL ");
        console.log(`users with trading wallet ${usersWithTrade.count()}`);
        for(const u of usersWithTrade._dataList as user[]){
            u.trade_bnb_balance = await eth_worker.getETHBalance(u.trading_wallet ?? "");
            await u.save();
        }

        let from = time_helper.getTime(`2023-04-23`,`UTC`);
        from = time_helper.getStartOfDay(from.unix(),true);
        let to = time_helper.getTime(time_helper.getCurrentTimeStamp());
        to = time_helper.getStartOfDay(to.unix(),true);
        to = to.subtract(1,'day');
        await this.generateDailyRecord(from.unix(),to.unix());

        await tools.sleep(3000);
        setImmediate(()=>{
            worker_trade_days.run();
        });
    }

    static async generateDailyRecord(startDay: number, endDay: number) {
        // Convert timestamps to date
        const startDate = new Date(startDay * 1000);
        const endDate = new Date(endDay * 1000);

        for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
            const datePeriod = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
            let time1 = time_helper.getTime(datePeriod,"UTC");
            time1 = time_helper.getStartOfDay(time1.unix(),true);
            const record = new trade_days();
            record.date_period = time_helper.getAsFormat(time1.unix(),TIME_FORMATS.MYSQL_DATE_TIME);
            await record.fetch();
            if(record.recordExists()) continue;
            // record.date_period = d.toString();
            record.total_trades = random(1, 10000);
            record.est_profit_percentage = random(0.001001, 0.009001, true);
            record.est_bnb_earned = "0";
            record.from_time = time_helper.getTime(time_helper.getCurrentTimeStamp(),"UTC").startOf("day").unix();
            record.to_time = time_helper.getTime(time_helper.getCurrentTimeStamp(),"UTC").endOf("day").unix();
            record.status = ['active', 'inactive', 'completed'][random(0, 2)];

            console.log(`profit ${record.est_profit_percentage}`);
            await record.save();
        }
    }

    public static async fixFromToTimeUTC(){
        const allDays = new trade_days();
        await allDays.list(" WHERE 1 ",{}," ORDER BY from_time ASC ");
        for(const trade_day of allDays._dataList as trade_days[]){
            const fromTime = time_helper.getTime(trade_day.from_time,"UTC").startOf("day").unix();
            const toTime = time_helper.getTime(trade_day.from_time,"UTC").endOf("day").unix();
            if(trade_day.from_time !== fromTime){
                const origFromFormat = time_helper.getAsFormat(trade_day.from_time,TIME_FORMATS.MYSQL_DATE_TIME,"UTC");
                const correctFormat = time_helper.getAsFormat(fromTime,TIME_FORMATS.MYSQL_DATE_TIME,"UTC");
                console.log(`db from time ${origFromFormat} does not match correct ${correctFormat}`);
                trade_day.from_time = fromTime;
            }
            if(trade_day.to_time !== toTime){
                const origToFormat = time_helper.getAsFormat(trade_day.to_time,TIME_FORMATS.MYSQL_DATE_TIME,"UTC");
                const correctToFormat = time_helper.getAsFormat(toTime,TIME_FORMATS.MYSQL_DATE_TIME,"UTC");
                console.log(`db to time ${origToFormat} does not match correct ${correctToFormat}`);
                trade_day.to_time = toTime;
            }
            const period = time_helper.getAsFormat(fromTime,TIME_FORMATS.MYSQL_DATE_TIME,"UTC");
            if(trade_day.date_period !== period){
                console.log(`db date_period(${trade_day.date_period}) does not match ${period}`);
                trade_day.date_period = period;
            }
            await trade_day.save();
        }
        console.log(`done`);
    }
}

if(argv.includes("run_worker_trade_days_disabled")){
    console.log(`running worker_trade_days`);
    worker_trade_days.run().finally();
}
if(argv.includes("run_fixFromToTimeUTC")){
    console.log(`running fixFromToTimeUTC`);
    worker_trade_days.fixFromToTimeUTC().finally();
}
if(argv.includes("run_worker_trade_days")){
    console.log(`running worker_trade_days`);
    worker_trade_days.run2().finally();
}