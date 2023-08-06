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
import {trade_account_header} from "./build/trade_account_header";
import {assert} from "./assert";
import {worker_trade_cycle} from "./worker_trade_cycle";

export class worker_trade_account_header{
    private static async checkSlowMode():Promise<void>{
        await tools.sleep(500);
    }
    private static lastMsg:string = "";
    private static log(msg:string, method:string){
        const formatTime = time_helper.getAsFormat(time_helper.getCurrentTimeStamp(),TIME_FORMATS.READABLE);
        if(this.lastMsg !== msg){
            console.log(`${formatTime}|${method}|${msg}`);
            this.lastMsg = msg;
        }
    }

    public static async run():Promise<void>{
        const method = "run";

        await this.initHeaders();

        // run this every 5 minutes
        this.log(`waiting for 1 minute before running again`,method);
        await tools.sleep(1000*60*1);
        setImmediate(async ()=>{
            await this.run();
        });
    }

    private static async initHeaders(){
        // get users with trade wallet address
        const method = "initHeaders";
        this.log(`retrieving users with trading wallet...`,method);
        const trade_users = new user();
        await trade_users.list(
            " WHERE trading_wallet IS NOT NULL AND trading_wallet != :empty ",
            {empty:""},
            " ORDER BY id ASC ");
        this.log(`...retrieved ${trade_users.count()} users with trading wallet`,method);
        let userIndex = 0, userCount = trade_users.count();
        for(const trade_user of trade_users._dataList as user[]){
            await this.checkSlowMode();
            userIndex++;
            this.log(`${userIndex}/${userCount}| processing user ${trade_user.username} trade_wallet ${trade_user.trading_wallet}, checking...`,method);
            const trade_acc_headers = new trade_account_header();
            await trade_acc_headers.list(
                " WHERE user_id=:user_id ",
                {user_id:trade_user.id});

            // NO TRADE ACCOUNT HEADER YET -----------------------------
            if(trade_acc_headers.count() === 0){
                const new_trade_acc_header = new trade_account_header();
                new_trade_acc_header.user_id = assert.positiveInt(trade_user.id,`trade_user.id`);
                new_trade_acc_header.wallet_address = assert.stringNotEmpty(trade_user.walletAddress,`trade_user.walletAddress`);
                new_trade_acc_header.trade_wallet_address = assert.stringNotEmpty(trade_user.trading_wallet,`trade_user.trading_wallet`);
                new_trade_acc_header.subscription_type = worker_trade_cycle.SUBSCRIPTION_TYPE;

                // start_date_time is current date time string
                new_trade_acc_header.start_date_time = time_helper.getAsFormat(time_helper.getCurrentTimeStamp(),TIME_FORMATS.MYSQL_DATE_TIME);
                new_trade_acc_header.asset_type = "bnb";
                new_trade_acc_header.total_deposit = "0";
                new_trade_acc_header.current_trade_fund = "0";
                new_trade_acc_header.total_asset_earned = "0";
                new_trade_acc_header.total_token_earned = "0";
                new_trade_acc_header.total_gross_profit_percentage = 0;
                new_trade_acc_header.total_net_profit_percentage = 0;
                new_trade_acc_header.status = "pending";
                await new_trade_acc_header.save();
                this.log(`${userIndex}/${userCount}|-- trade_account_header initiated, id ${new_trade_acc_header.id}`,method);
                continue;
            }

            // DUPLICATE HEADERS FOUND ---------------------------------
            if(trade_acc_headers.count() > 1){
                const collection = [];
                for(const header of trade_acc_headers._dataList as trade_account_header[]){
                    collection.push({
                        id:header.id,
                        user_id:header.user_id,
                        wallet_address:header.wallet_address,
                        trade_wallet_address:header.trade_wallet_address,
                    });
                }
                console.table(collection);
                throw new Error(`duplicate headers found for user ${trade_user.username} trade_wallet ${trade_user.trading_wallet}`);
            }

            const trade_acc_header = trade_acc_headers.getItem();

            // CHECK IF WALLET IS VALID ---------------------------------
            if(trade_user.walletAddress?.toLowerCase() !== trade_acc_header.wallet_address.toLowerCase()){
                throw new Error(`wallet address mismatch for user ${trade_user.username} trade_wallet ${trade_user.trading_wallet}`);
            }


            // CHECK IF TRADE WALLET IS VALID ---------------------------
            if(trade_user.trading_wallet?.toLowerCase() !== trade_acc_header.trade_wallet_address.toLowerCase()){
                throw new Error(`trade wallet address mismatch for user ${trade_user.username} trade_wallet ${trade_user.trading_wallet}`);
            }

            this.log(`${userIndex}/${userCount}|-- trade_account_header already initiated`,method);
        }
    }
}

if(argv.includes("run_worker_trade_account_header")) {
    console.log(`running worker_trade_account_header`);
    worker_trade_account_header.run().finally();
}