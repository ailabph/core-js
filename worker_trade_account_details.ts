import {trade_days} from "./build/trade_days";
import {TIME_FORMATS, time_helper} from "./time_helper";
import {argv} from "process";
import {tools} from "./tools";
import {user} from "./build/user";
import {trade_cycle} from "./build/trade_cycle";
import {trade_account_header} from "./build/trade_account_header";
import {assert} from "./assert";
import {trade_account_details} from "./build/trade_account_details";
import {config} from "./config";
import axios from "axios";
import BigNumber from "bignumber.js";
import {eth_price_track_details_tools} from "./eth_price_track_details_tools";
import {eth_config} from "./eth_config";

type transaction_item = { timestamp: string, hash: string, from: string, to: string, value: string };
type deposit_item = {time:number,amount:string,txn_hash:string};
type trade_detail_track = {header_id:number,total_deposit:string,running_balance:string,last_time_added:number,last_type:string};
type trade_detail = {header_id:number,time_added:number,date_time:string,type:string,amount:string,asset_balance:string,gross_p:number,gross_pf:string,net_p:number,net_pf:string,net_token:string,net_asset:string};


export class worker_trade_account_details{
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
        
        // await this.checkBnbDeposits();
        const allAccounts = new trade_account_header();
        await allAccounts.list(" WHERE 1 ",{});
        for(const trade_account of allAccounts._dataList as trade_account_header[]){
            await this.processCyclesOfTradeAccount(trade_account);
        }

        this.log(`waiting for 10 minute before running again`,method);
        await tools.sleep(1000*60*10);
        setImmediate(async ()=>{
            await this.run();
        });
    }

    private static async checkBnbDeposits():Promise<void>{
        const method = "checkBnbDeposits";
        this.log(`retrieving trade account headers...`,method);
        const account_headers = new trade_account_header();
        await account_headers.list(
            " WHERE 1 ",
            {});
        this.log(`...retrieved ${account_headers.count()} trade account headers`,method);
        let accountHeaderIndex = 0, accountHeaderCount = account_headers.count();
        for(const account_header of account_headers._dataList as trade_account_header[]){
            await this.checkSlowMode();
            accountHeaderIndex++;
            const owner = new user();
            owner.id = account_header.user_id;
            await owner.fetch();
            if(owner.isNew()) throw new Error(`owner ${account_header.user_id} not found`);
            this.log(`${accountHeaderIndex}/${accountHeaderCount}| processing trade account header ${account_header.id} for user ${owner.username}.`,method);
            this.log(`${accountHeaderIndex}/${accountHeaderCount}|-- checking existing bnb deposits`,method);

            // header_id, type
            const deposit_details = new trade_account_details();
            await deposit_details.list(
                " WHERE header_id=:header_id AND type=:type ",
                {header_id:account_header.id, type:"deposit"});

            this.log(`${accountHeaderIndex}/${accountHeaderCount}|-- found ${deposit_details.count()} existing bnb deposits`,method);
            const collection = [];
            for(const deposit_detail of deposit_details._dataList as trade_account_details[]){

                // format time_added to readable
                const time_addedFormat = time_helper.getAsFormat(deposit_detail.time_added,TIME_FORMATS.READABLE);

                collection.push({
                    time:deposit_detail.time_added,
                    date_time:time_addedFormat,
                    type:"deposit",
                    amount:deposit_detail.amount,
                    txn_hash:deposit_detail.transactionHash,
                });
            }
            if(collection.length > 0) console.table(collection);
            const deposit_items = await this.getBnbDepositsBscscan(account_header.wallet_address, account_header.trade_wallet_address);

            // CHECKING IF DEPOSIT ALREADY ON DB ---------------------------------
            let total_deposit = "0";
            for(const deposit of deposit_items){
                const depositDetails = new trade_account_details();
                await depositDetails.list(
                    " WHERE type=:deposit AND transactionHash=:transactionHash "
                    ,{deposit:"deposit",transactionHash:deposit.txn_hash});

                // CHECK FOR DUPLICATES ------------------------------------------
                if(depositDetails.count() > 1){
                    throw new Error(`duplicate deposit found for txn ${deposit.txn_hash}`);
                }

                // CHECK IF DEPOSIT ALREADY EXISTS -------------------------------
                if(depositDetails.count() === 0){
                    this.log(`${accountHeaderIndex}/${accountHeaderCount}|-- deposit ${deposit.txn_hash} is new, adding record`,method);
                    const deposit_detail = new trade_account_details();
                    deposit_detail.header_id = assert.positiveInt(account_header.id,`account_header.id`);
                    deposit_detail.type = "deposit";
                    deposit_detail.amount = deposit.amount;
                    deposit_detail.transactionHash = deposit.txn_hash;
                    deposit_detail.time_added = deposit.time;
                    deposit_detail.date_period = "";
                    await deposit_detail.save();
                    this.log(`${accountHeaderIndex}/${accountHeaderCount}|-- deposit id ${deposit_detail.id} saved`,method);
                }


                // CHECK IF DETAILS ARE CORRECT -----------------------------------
                const checkDepositDetail = depositDetails.getItem();
                if(checkDepositDetail && checkDepositDetail.amount !== deposit.amount.toString()){
                    throw new Error(`bscscan deposit amt(${checkDepositDetail.amount}) mismatch from DB amt(${deposit.amount.toString()}) for txn ${deposit.txn_hash}`);
                }

                total_deposit = new BigNumber(total_deposit).plus(deposit.amount).toString();
            }
            if(account_header.total_deposit !== total_deposit){
                this.log(`${accountHeaderIndex}/${accountHeaderCount}|-- total_deposit(${account_header.total_deposit}) mismatch from DB total_deposit(${total_deposit})`,method);
                account_header.total_deposit = total_deposit;
                await account_header.save();
                this.log(`${accountHeaderIndex}/${accountHeaderCount}|-- updated`,method);
            }
            this.log(`${accountHeaderIndex}/${accountHeaderCount}|-- bnb deposits synced`,method);
        }
    }
    private static async getBnbDepositsBscscan(walletAddress:string,depositAddress:string):Promise<deposit_item[]>{
        const method = "getBnbDepositsBscscan";
        this.log(`retrieving txns from ${walletAddress}`,method);
        const transactions = await this.getTransactionList(walletAddress);
        this.log(`...retrieved ${transactions.length} txns from ${walletAddress}`,method);
        if(transactions.length>0) console.table(transactions);
        let txnIndex = 0, txnCount = transactions.length, deposits:deposit_item[] = [];
        for(const transaction of transactions){
            txnIndex++;
            // use BigNumber if transaction.value as string is > 0
            const parsed_amount = transaction.value === "0" ? 0 : new BigNumber(transaction.value).dividedBy(10**18).toNumber();
            if(transaction.to.toLowerCase() === depositAddress.toLowerCase() && parsed_amount > 0){
                this.log(`${txnIndex}/${txnCount}|---- txn ${transaction.hash} is a deposit of ${transaction.value}`,method);
                deposits.push({
                    time:Number(transaction.timestamp),
                    amount:transaction.value,
                    txn_hash:transaction.hash,
                });
            }
        }
        this.log(`found ${deposits.length} deposits`,method);
        if(deposits.length > 0) console.table(deposits);

        return deposits;
    }
    private static async getTransactionList(walletAddress: string): Promise<Array<transaction_item>> {
        const method = "getTransactionList";

        const api_key = config.getCustomOption("bsc_scan_key",true);
        if(typeof api_key !== "string") throw new Error("bsc_scan_key is not a string");
        if(api_key === "") throw new Error("bsc_scan_key is empty");

        const results: Array<{ timestamp: string, hash: string, from: string, to: string, value: string }> = [];
        let page = 1;
        const startingBlock = 25930084; //Feb-24-2023 12:06:02 AM +UTC

        while (true) {
            await this.checkSlowMode();
            this.log(`fetching page ${page} of txns from wallet ${walletAddress}`,method);
            const urlBase = `https://api.bscscan.com/api?module=account&action=txlist&address=${walletAddress}&startblock=${startingBlock}&endblock=99999999&page=${page}&offset=50&sort=asc&apikey=${api_key}`;
            try {
                const response = await axios.get(urlBase);
                if (response.data.status === "1" && response.data.result.length > 0) {
                    response.data.result.forEach((transaction: any) => {
                        const amount_str = new BigNumber(transaction.value).dividedBy(1e18).toString();
                        const amount_num = Number(amount_str);
                        if(amount_num > 0){
                            results.push({
                                timestamp: transaction.timeStamp,
                                hash: transaction.hash,
                                from: transaction.from,
                                to: transaction.to,
                                value: amount_str
                            });
                        }
                    });
                    page++;
                } else {
                    break;
                }
            } catch (error) {
                console.error(error);
                throw error;
            }
        }
        return results;
    }


    private static async processCyclesOfTradeAccount(trade_header:trade_account_header){
        const method = "processCyclesOfTradeAccount";
        const owner = new user();
        owner.id = trade_header.user_id;
        await owner.fetch();
        assert.recordExist(owner,`owner of trade_header(${trade_header.id})`);
        this.log(`processing cycles of account of ${owner.username}`,method);

        const allCycles = new trade_cycle();
        await allCycles.list(" WHERE 1 ",{}," ORDER BY from_time ASC ");
        this.log(`-- found ${allCycles.count()} cycles`,method);

        let tradeTrack:trade_detail_track = {
            header_id: trade_header.id??0,
            last_time_added: 0,
            last_type: "",
            running_balance: "0",
            total_deposit: "0"
        };

        for(const cycle of allCycles._dataList as trade_cycle[]){
            await this.checkSlowMode();
            tradeTrack = await this.processTradeDaysOfCycle(cycle, trade_header, tradeTrack);
        }
        console.table(tradeTrack);
    }
    private static async processTradeDaysOfCycle(cycle:trade_cycle,trade_header:trade_account_header,trade_track:trade_detail_track):Promise<trade_detail_track>{
        const method = "processTradeDaysOfCycle";
        this.log(`-- processing cycle ${cycle.period_tag} of ${cycle.subscription_type}`,method);

        const currentTime = time_helper.getCurrentTimeStamp();
        const currentTimeFormat = time_helper.getAsFormat(currentTime,TIME_FORMATS.ISO);
        this.log(`-- retrieving trade_days <= today (${currentTimeFormat})`,method);

        const days = new trade_days();
        await days.list(" WHERE trade_type=:type AND from_time>=:from AND to_time<=:to AND to_time<=:now ",
            {type:cycle.subscription_type,from:cycle.from_time,to:cycle.to_time,now:currentTime},
            " ORDER BY from_time ASC ");

        this.log(`-- found ${days.count()}`,method);
        let dayIndex = 0, dayCount = days.count(), trade_details:trade_detail[] = [];
        for(const day of days._dataList as trade_days[]){
            dayIndex++;
            await this.checkSlowMode();

            const profit_percentage = new BigNumber(day.est_profit_percentage??0).multipliedBy(100).toNumber();

            this.log(`${dayIndex}/${dayCount}|---- processing trade_day ${day.date_period} profit ${profit_percentage}% | total_deposit ${trade_track.total_deposit} | current running_balance ${trade_track.running_balance}`,method);

            // get deposit today
            const deposits = new trade_account_details();
            await deposits.list(
                " WHERE header_id=:header_id AND type=:deposit AND time_added>=:from AND time_added<=:to ",
                {header_id:trade_header.id, deposit:"deposit",from:day.from_time,to:day.to_time},
                " ORDER BY time_added ASC ");
            let deposits_today = "0";
            for(const deposit of deposits._dataList as trade_account_details[]){
                deposits_today = new BigNumber(deposits_today).plus(deposit.amount).toString();
                trade_track.total_deposit = new BigNumber(trade_track.total_deposit).plus(deposit.amount).toString();
                trade_details.push({
                    header_id:assert.positiveInt(trade_header.id,"trade_header.id"),
                    time_added:deposit.time_added,
                    date_time: time_helper.getAsFormat(deposit.time_added,TIME_FORMATS.MYSQL_DATE_TIME,"UTC"),
                    type:"deposit",
                    amount:deposit.amount,
                    asset_balance:trade_track.total_deposit,
                    gross_p:0,
                    gross_pf:"0",
                    net_p:0,
                    net_pf:"0",
                    net_asset:"0",
                    net_token:"0",
                });
                trade_track.last_type = "deposit";
                trade_track.last_time_added = deposit.time_added;
            }
            if(deposits.count()>0) this.log(`${dayIndex}/${dayCount}|------ found ${deposits.count()} deposits total ${deposits_today}`,method);
            trade_track.running_balance = new BigNumber(trade_track.running_balance).plus(deposits_today).toString();

            // if running_balance > 0
            if(new BigNumber(trade_track.running_balance).isGreaterThan(0)){
                const profit_p = (day.est_profit_percentage??0).toString();
                const profit_num = Number(profit_p);
                const gross_pf = new BigNumber(profit_p).multipliedBy(100).toString();

                // divide profit by 2
                const net_p = new BigNumber(profit_p).dividedBy(2).toNumber();
                const net_pf = new BigNumber(net_p).multipliedBy(100).toString();

                const net_asset = new BigNumber(trade_track.running_balance).multipliedBy(net_p).toString();

                trade_details.push({
                    header_id:assert.positiveInt(trade_header.id,"trade_header.id"),
                    time_added:day.to_time,
                    date_time: time_helper.getAsFormat(day.from_time,TIME_FORMATS.MYSQL_DATE_TIME,"UTC"),
                    type:"trade",
                    amount:profit_p,
                    asset_balance:trade_track.running_balance,
                    gross_p:profit_num,
                    gross_pf:gross_pf,
                    net_p:net_p,
                    net_pf:net_pf,
                    net_asset:net_asset,
                    net_token:"0",
                });

                trade_track.last_type = "trade";
                trade_track.last_time_added = day.from_time;
            }
        }

        //CHECK IF CYCLE IS COMPLETE --------------------
        if(cycle.status === "completed"){
            // sum all net asset
            let total_net_asset = "0";
            let total_net_profit_p = "0";
            let total_gross_p = "0";
            for(const detail of trade_details){
                if(detail.type === "trade"){
                    total_net_asset = new BigNumber(total_net_asset).plus(detail.net_asset).toString();
                    total_net_profit_p = new BigNumber(total_net_profit_p).plus(detail.net_p).toString();
                    total_gross_p = new BigNumber(total_gross_p).plus(detail.gross_p).toString();
                }
            }
            const total_gross_pf = new BigNumber(total_gross_p).multipliedBy(100).toString();
            const total_net_profit_pf = new BigNumber(total_net_profit_p).multipliedBy(100).toString();

            this.log(`-- total_net_asset earned ${total_net_asset}`,method);
            this.log(`-- total_net_profit earned ${total_net_profit_p}`,method);

            // divide total_net_asset by 2
            const for_token_swap = new BigNumber(total_net_asset).dividedBy(2).toString();
            const net_asset_to_add = for_token_swap;

            this.log(`-- net_asset_to_add ${net_asset_to_add} for_token_swap ${for_token_swap}`,method);

            // get bnb price of token on to_time
            const bnb_token_price = await eth_price_track_details_tools.getBnbTokenPrice(cycle.to_time,eth_config.getTokenContract());
            this.log(`-- bnb_token_price ${bnb_token_price} as of ${time_helper.getAsFormat(cycle.to_time,TIME_FORMATS.ISO,"UTC")}`,method);
            const token_swapped = new BigNumber(for_token_swap).dividedBy(bnb_token_price).toString();

            // add type "distribute"
            trade_details.push({
                header_id:assert.positiveInt(trade_header.id,"trade_header.id"),
                time_added:cycle.to_time,
                date_time: time_helper.getAsFormat(cycle.to_timee,TIME_FORMATS.MYSQL_DATE_TIME,"UTC"),
                type:"distribute",
                amount:total_net_profit_p,
                asset_balance:trade_track.running_balance,
                gross_p:Number(total_gross_p),
                gross_pf:total_gross_pf,
                net_p:Number(total_net_profit_p),
                net_pf:total_net_profit_pf,
                net_asset:net_asset_to_add,
                net_token:token_swapped,
            });
        }

        // SYNC TO DB --------------------
        if(trade_details.length > 0){
            console.table(trade_details);

            this.log(`-- syncing ${trade_details.length} details on trade_account_details db records`,method);
            let detailIndex = 0, detailCount = trade_details.length;
            for(const detail of trade_details){
                detailIndex++;
                await this.checkSlowMode();
                this.log(`${detailIndex}/${detailCount}|checking header_id:${detail.header_id} date_time:${detail.date_time} ${detail.type}`,method);
                const checkDetail = new trade_account_details();
                checkDetail.header_id = detail.header_id;
                checkDetail.time_added = detail.time_added;
                checkDetail.type = detail.type;
                await checkDetail.fetch();
                if(checkDetail.isNew()){
                    this.log(`${detailIndex}/${detailCount}|-- record does not exist, adding`,method);
                    checkDetail.header_id = detail.header_id;
                    checkDetail.date_period = cycle.period_tag;
                    checkDetail.type = detail.type;
                    checkDetail.time_added = detail.time_added;
                    checkDetail.amount = detail.amount;
                    checkDetail.asset_balance = trade_track.running_balance;
                    checkDetail.gross_percentage = detail.gross_p;
                    checkDetail.net_percentage = detail.net_p;
                    checkDetail.net_token_distribution = detail.net_token;
                    checkDetail.net_asset_distribution = detail.net_asset;
                    checkDetail.status = detail.type === "distribute" ? "pending" : "done";
                    await checkDetail.save();
                    this.log(`${detailIndex}/${detailCount}|-- saved id ${checkDetail.id}`,method);
                }
                else{
                    this.log(`${detailIndex}/${detailCount}|-- record exists, comparing values`,method);
                    // check amount
                    if(checkDetail.amount !== detail.amount){
                        this.log(`${detailIndex}/${detailCount}|-- amount is not equal, updating`,method);
                        throw new Error();
                    }

                    // check asset_balance
                    if(checkDetail.asset_balance !== trade_track.running_balance){
                        this.log(`${detailIndex}/${detailCount}|-- asset_balance is not equal, updating`,method);
                        throw new Error();
                    }

                    // if trade or distribute
                    if(checkDetail.type === "trade"){
                        //-- check gross_percentage
                        if(checkDetail.gross_percentage !== detail.gross_p){
                            this.log(`${detailIndex}/${detailCount}|-- gross_percentage is not equal, updating`,method);
                            throw new Error();
                        }
                        //-- check net_percentage
                        if(checkDetail.net_percentage !== detail.net_p){
                            this.log(`${detailIndex}/${detailCount}|-- net_percentage is not equal, updating`,method);
                            throw new Error();
                        }
                        //-- check net_asset_distribution
                        if(checkDetail.net_asset_distribution !== detail.net_asset){
                            this.log(`${detailIndex}/${detailCount}|-- net_asset_distribution is not equal, updating`,method);
                            throw new Error();
                        }
                    }
                    if(checkDetail.type === "distribute"){
                        //-- check net_token_distribution
                        if(checkDetail.net_token_distribution !== detail.net_token){
                            this.log(`${detailIndex}/${detailCount}|-- net_token_distribution is not equal, updating`,method);
                            throw new Error();
                        }
                    }
                    this.log(`${detailIndex}/${detailCount}|-- record is equal`,method);
                }
            }
        }

        return trade_track;
    }

}

if(argv.includes("run_worker_trade_account_details")) {
    console.log(`running worker_trade_account_details`);
    worker_trade_account_details.run().finally();
}