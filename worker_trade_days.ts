import {trade_days} from "./build/trade_days";
import {random} from 'lodash';
import {TIME_FORMATS, time_helper} from "./time_helper";
import {argv} from "process";
import {tools} from "./tools";
import {user} from "./build/user";
import Web3 from "web3";
import {web3_rpc_web3} from "./web3_rpc_web3";
import {eth_worker} from "./eth_worker";

const Web3Client:Web3 = web3_rpc_web3.getWeb3Client();
export class worker_trade_days{

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
        // Convert timestamps to dates
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
            record.est_profit_percentage = random(0.0001001, 0.005001, true);
            record.est_bnb_earned = "0";
            record.from_time = d.setHours(0, 0, 0, 0) / 1000;
            record.to_time = d.setHours(23, 59, 59, 999) / 1000;
            record.status = ['active', 'inactive', 'completed'][random(0, 2)];

            console.log(`profit ${record.est_profit_percentage}`);
            await record.save();
        }
    }
}

if(argv.includes("run_worker_trade_days")){
    console.log(`running worker_trade_days`);
    worker_trade_days.run().finally();
}