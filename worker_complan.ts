import {connection} from "./connection";
import {eth_contract_events} from "./build/eth_contract_events";
import {account} from "./build/account";
import {TIME_FORMATS, time_helper} from "./time_helper";
import {assert} from "./assert";
import {argv} from "process";
import {user} from "./build/user";
import {tools} from "./tools";
import {eth_price_track_details_tools} from "./eth_price_track_details_tools";
import {eth_config} from "./eth_config";
import {points_log} from "./build/points_log";
import {eth_send_token} from "./build/eth_send_token";
import {eth_token_balance} from "./build/eth_token_balance";
import {config} from "./config";
import {account_tools} from "./account_tools";
import {eth_token_balance_tools} from "./eth_token_balance_tools";
import {eth_worker} from "./eth_worker";

export class worker_complan{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`worker_complan|${method}|${msg}`);
            if(end) console.log(`worker_complan|${method}|${tools.LINE}`);
        }
    }

    private static addLog(msg:string,method:string,log:string[]):string[]{
        this.log(msg,method,false,true);
        log.push(msg);
        return log;
    }

    //region CONFIG
    public static getBatch():number{
        const method = "getBatch";
        let batch = 1;
        const overrideBatch = config.getCustomOption("complan_batch");
        if(overrideBatch){
            batch = assert.positiveInt(overrideBatch,`${method} overrideBatch`);
        }
        return batch;
    }
    public static getCommunityBonusLevelLimit():number{
        return 5;
    }
    public static getCommunityBonusPercentage(level:number):number{
        switch (level) {
            case 1:
                return 0.05;
            case 2:
                return 0.02;
            case 3:
                return 0.01;
            case 4:
                return 0.01;
            case 5:
                return 0.01;
            default:
                throw new Error(`no community bonus for level ${level}`);
        }
    }
    public static getMinimumUsdValue():number{
        return 50;
    }
    //endregion CONFIG

    //region CHECKS
    public static assertBuyTrade(balanceDetail:eth_token_balance, desc:string=""){
        if(balanceDetail.type !== "buy"){
            throw new Error(`${desc} balance detail id ${balanceDetail.id} blockNumber ${balanceDetail.blockNumber} logIndex ${balanceDetail.logIndex} hash ${balanceDetail.transactionHash} is not buy type, found ${balanceDetail.type}`);
        }
    }
    public static assertCommunityBonusLevelLimit(buyer:account,bonus_receiver:account){
        const method = "assertCommunityBonusLevelLimit";
        account_tools.assertSponsorRelated(bonus_receiver,buyer);
        const buyer_sponsor_level = assert.naturalNumber(buyer.sponsor_level,`${method} buyer.sponsor_level`);
        const bonus_receiver_level = assert.naturalNumber(bonus_receiver.sponsor_level,`${method} bonus_receiver.sponsor_level`);
        const community_bonus_level = buyer_sponsor_level - bonus_receiver_level;
        if(community_bonus_level > this.getCommunityBonusLevelLimit()){
            throw new Error(`${method} community bonus level ${community_bonus_level} > community bonus limit ${this.getCommunityBonusLevelLimit()}`);
        }
    }
    //endregion CHECKS

    public static async run2(){
        /**
         * every token_balance, save log also time_processed_complan
         *
         */
        const method = "run";
        await connection.startTransaction();
        try{
            const buyTrades = await this.getTradesForProcessing();
            console.log(`${buyTrades.count()} found`); 
            for(const buyTrade of buyTrades._dataList as eth_token_balance[]){
                await this.processBuyTradeComplan(buyTrade);
            }
            await connection.commit();
            await tools.sleep(500);
            setImmediate(()=>{
                this.run2();
            });
        }catch (e){
            await connection.rollback();
            throw e;
        }
    }

    public static async processBuyTradeComplan(buyTrade:eth_token_balance):Promise<eth_token_balance>{
        const method = "processBuyTradeComplan";
        this.log(`processing buy trade complan logic`,method);
        assert.inTransaction();
        this.assertBuyTrade(buyTrade);
        const buy_amount = assert.isNumericString(buyTrade.debit,`${method} buyTrade.debit`);
        const address_buyer = assert.stringNotEmpty(buyTrade.address,`${method} buyTrade.address`);
        const blockNumber = assert.positiveInt(buyTrade.blockNumber,`${method} buyTrade.blockNumber`);
        const logIndex = assert.positiveInt(buyTrade.logIndex,`${method} buyTrade.logIndex`);
        const transactionHash = assert.stringNotEmpty(buyTrade.transactionHash,`${method} buyTrade.transactionHash`);
        let logs:string[] = [];

        let traverseLevel = 0;
        const communityBonusLevelLimit = this.getCommunityBonusLevelLimit();
        /**
         * get account of address_buyer
         */
        const buyer_account = await account_tools.getAccount(address_buyer);
        if(!buyer_account){
            logs.push(`${address_buyer} has no registered account in db`);
            this.log(logs[logs.length-1],method);
        }
        else{
            // traverse upline
            const uplineCount = account_tools.countSponsorUplinesByDna(buyer_account.sponsor_dna);
            logs.push(`${address_buyer} has ${uplineCount} sponsor uplines`);
            this.log(logs[logs.length-1],method);

            const sponsorStructureCheck = await account_tools.verifySponsorLineOfDownline(buyer_account);
            if(typeof sponsorStructureCheck === "string"){
                throw new Error(sponsorStructureCheck);
            }

            let sponsor_id = buyer_account.sponsor_id;
            while(sponsor_id > 0){
                await tools.sleep(50);
                logs.push(`retrieving upline sponsor via sponsor_id ${sponsor_id}`);
                this.log(logs[logs.length-1],method);
                traverseLevel++;
                const sponsor = await account_tools.getAccount(sponsor_id);
                if(!sponsor) throw new Error(`unable to retrieve account via sponsor_id ${sponsor_id}`);
                sponsor_id = sponsor.sponsor_id;

                logs.push(`traverse level ${traverseLevel}/${communityBonusLevelLimit}, upline ${sponsor.account_code} sponsor_level ${sponsor.sponsor_level}`);
                this.log(logs[logs.length-1],method);

                if(traverseLevel > communityBonusLevelLimit){
                    // add skip point here
                    logs = this.addLog(`skip because current level ${traverseLevel} is greater than limit ${communityBonusLevelLimit}`,method,logs);
                    const skip = this.getDefaultPoint(sponsor,buyer_account,buyTrade);
                    skip.action = "skip_eth_community_bonus";
                    skip.eth_data = logs[logs.length-1];
                    await skip.save();
                }
                else{
                    logs = this.addLog(`checking if upline is maintained`,method,logs);
                    const timeFormat = time_helper.getAsFormat(buyTrade.blockTime,TIME_FORMATS.ISO,"UTC");
                    const tokenBalanceAtPurchaseInfo = await eth_token_balance_tools.getBalanceDetailAsOf(sponsor.account_code,buyTrade.blockTime);
                    let tokenBalanceAtPurchase = "0";
                    if(tokenBalanceAtPurchaseInfo && tools.greaterThan(tokenBalanceAtPurchaseInfo.token_amount,0)){
                        tokenBalanceAtPurchase = tokenBalanceAtPurchaseInfo.token_amount;
                    }
                    let tokenBalanceBusdValue = tools.multiply(tokenBalanceAtPurchase,buyTrade.usd_price);
                    logs = this.addLog(`token balance during purchase on ${timeFormat} is ${tokenBalanceAtPurchase} valued at busd ${tokenBalanceBusdValue} bnb_usd ${buyTrade.bnb_usd} token_bnb ${buyTrade.bnb_price} token_usd ${buyTrade.usd_price}`,method,logs);

                    const currentTokenBalance = await eth_worker.getTokenBalance(assert.stringNotEmpty(sponsor.account_code,`${method} bonusReceiver.account_code`));
                    const currentTokenBnbPrice = await eth_price_track_details_tools.getBnbTokenPrice(buyTrade.blockTime,eth_config.getTokenContract());
                    const currentBnbBusdPrice = await eth_price_track_details_tools.getBnbUsdPrice(buyTrade.blockTime);
                    const currentTokenUsdPrice = tools.multiply(currentTokenBnbPrice,currentBnbBusdPrice);
                    const currentBalanceUsdValue = tools.multiply(currentTokenBalance,currentTokenUsdPrice);
                    const currentTime = time_helper.getTime().format(TIME_FORMATS.ISO);
                    logs = this.addLog(`current token balance during purchase on ${currentTime} is ${currentTokenBalance} valued at ${currentBalanceUsdValue} bnb_usd ${currentBnbBusdPrice} token_bnb ${currentTokenBnbPrice} token_usd ${currentTokenUsdPrice}`,method,logs);

                    if(tools.greaterThanOrEqualTo(currentBalanceUsdValue,this.getMinimumUsdValue())){
                        // add point
                        const result = await this.addCommunityBonus(sponsor,buyer_account,buyTrade,logs);
                        logs = result.log;
                    }
                    else{
                        // add skip point
                        logs = this.addLog(`skipped bonus because token balance ${currentTokenBalance} usd value ${currentTokenUsdPrice} is below minimum ${this.getMinimumUsdValue()}`,method,logs);
                        const skip = this.getDefaultPoint(sponsor,buyer_account,buyTrade);
                        skip.action = "skip_eth_community_bonus";
                        skip.eth_data = logs[logs.length -1];
                    }
                }
            }
        }

        buyTrade.time_processsed_complan = tools.getCurrentTimeStamp();
        buyTrade.logs = JSON.stringify(logs);
        await buyTrade.save();
        return buyTrade;
    }

    private static getDefaultPoint(receiverAccount:account,buyerAccount:account,buyTrade:eth_token_balance):points_log{
        const method = "getDefaultPoint";
        this.assertBuyTrade(buyTrade,method);
        const point = new points_log();
        point.seq_no = 1;
        point.amount = 0;
        point.user_id = assert.naturalNumber(receiverAccount.user_id,`${method} receiverAccount.user_id`);
        point.account_code = assert.stringNotEmpty(receiverAccount.account_code,`${method} receiverAccount.account_code`);
        point.account_rank = assert.stringNotEmpty(receiverAccount.account_type,`${method} receiverAccount.account_type`);
        point.account_id = assert.positiveInt(receiverAccount.id,`${method} receiverAccount.id`);
        point.sponsor_level = assert.positiveInt(receiverAccount.sponsor_level,`${method} receiverAccount.sponsor_level`);
        point.time_added = assert.positiveInt(buyTrade.blockTime,`${method} buyTrade.blockTime`);
        point.date_added = time_helper.getTime(point.time_added,"UTC").format(TIME_FORMATS.MYSQL_DATE);
        point.code_source = assert.stringNotEmpty(buyerAccount.account_code,`${method} buyerAccount.account_code`);
        point.code_source_account_id = assert.positiveInt(buyerAccount.id,`${method} buyerAccount.id`);
        point.code_source_owner_user_id = assert.positiveInt(buyerAccount.user_id,`${method} buyerAccount.user_id`);
        const bonus_receiver_sponsor_level = assert.naturalNumber(receiverAccount.sponsor_level,`${method} bonusReceiver.sponsor_level`);
        const buyer_sponsor_level = assert.naturalNumber(buyerAccount.sponsor_level,`${method} buyerAccount.sponsor_level`);
        point.gen_level = buyer_sponsor_level - bonus_receiver_sponsor_level;
        point.eth_source_hash = buyTrade.transactionHash;
        point.eth_token_amount_source = assert.isNumericString(buyTrade.debit, `${method} buyTrade.debit for token_bought`, 0);
        point.eth_token_bnb_price = assert.isNumericString(buyTrade.bnb_price,`${method} buyTrade.bnb_price`);
        point.eth_token_usd_rate = assert.isNumericString(buyTrade.usd_price,`${method} buyTrade.usd_price`);
        return point;
    }


    private static async addCommunityBonus(bonusReceiver:account,buyerAccount:account,buyTrade:eth_token_balance,log:string[]):Promise<{points_log:points_log,log:string[]}>{
        const method = "addCommunityBonus";
        assert.inTransaction();
        const pointLogs:string[] = [];
        log = this.addLog(`adding community bonus to ${bonusReceiver.account_code} sponsor_level ${bonusReceiver.sponsor_level} from buyer ${buyerAccount.account_code} sponsor_level ${buyerAccount.sponsor_level}`,method,log);
        pointLogs.push(log[log.length-1]);

        this.assertBuyTrade(buyTrade);
        this.assertCommunityBonusLevelLimit(buyerAccount,bonusReceiver);

        const bonus_receiver_sponsor_level = assert.naturalNumber(bonusReceiver.sponsor_level,`${method} bonusReceiver.sponsor_level`);
        const buyer_sponsor_level = assert.naturalNumber(buyerAccount.sponsor_level,`${method} buyerAccount.sponsor_level`);
        const community_level = buyer_sponsor_level - bonus_receiver_sponsor_level;
        const token_bought = assert.isNumericString(buyTrade.debit,`${method} buyTrade.debit for token_bought`,0);
        const bonusPercentage = this.getCommunityBonusPercentage(community_level);
        const communityBonus = tools.multiply(token_bought,bonusPercentage);

        log = this.addLog(`community_level ${community_level} token_bought ${token_bought} bonus_percentage ${bonusPercentage} community_bonus ${communityBonus}`,method,log);
        pointLogs.push(log[log.length-1]);

        const point = this.getDefaultPoint(bonusReceiver,buyerAccount,buyTrade);
        point.action = "eth_community_bonus";
        point.eth_token_bonus = communityBonus;
        point.eth_perc = bonusPercentage;
        point.eth_data = JSON.stringify(pointLogs);
        await point.save();
        log = this.addLog(`saved point with id ${point.id}`,method,log);
        return {log: log, points_log: point};
    }

    public static async run(){
        await connection.startTransaction();
        try{
            const unprocessedTrades = new eth_contract_events();
            await unprocessedTrades.list(
                " WHERE tag=:trade AND time_processed IS NULL AND time_balance_processed>:zero ",
                {trade:"trade",zero:0},
                ` ORDER BY blockNumber ASC, logIndex ASC LIMIT ${this.getBatch()} `);

            for(const trade of unprocessedTrades._dataList as eth_contract_events[]){
                const timeInfo = time_helper.getAsFormat(assert.positiveInt(trade.block_time,"trade.block_time"),TIME_FORMATS.ISO);
                console.log(`checking trade ${trade.txn_hash} ${trade.blockNumber} ${trade.logIndex} on ${timeInfo}`);
                const owner = new user();
                owner.walletAddress = trade.toAddress;
                await owner.fetch();
                if(owner.isNew()){
                    console.log(`...trade has no connected wallet, skipping`);
                }
                else{
                    const walletAccount = new account();
                    walletAccount.account_code = owner.walletAddress;
                    await walletAccount.fetch();
                    if(walletAccount.isNew()){
                        console.log(`...unable to retrieve account ${owner.walletAddress}, skipping`);
                    }
                    else{
                        if(trade.type?.toLowerCase() !== "buy"){
                            console.log(`...trade is not buy, skipping`);
                        }
                        else{
                            const level_limit = 5;
                            let current_level = 0;
                            const perc = [0.05,0.02,0.01,0.01,0.01];
                            let sponsor_id = walletAccount.sponsor_id;
                            while(sponsor_id > 0 && current_level < level_limit){

                                const upline = new account();
                                upline.id = sponsor_id;
                                await upline.fetch();
                                if(upline.isNew()){
                                    console.log(`...unable to retrieve upline with id ${sponsor_id}, skipping`);
                                }
                                else{
                                    sponsor_id = upline.sponsor_id;
                                    const sponsor_user = new user();
                                    sponsor_user.walletAddress = upline.account_code;
                                    await sponsor_user.fetch();
                                    if(sponsor_user.isNew()){
                                        console.log(`... ${upline.account_code} is not connected to a user, skipping`);
                                    }
                                    else{
                                        console.log(`... giving bonus at level ${current_level+1} of ${owner.username}, ${sponsor_user.username}`);
                                        const selectedPercentage = perc[current_level];
                                        const buyAmount = assert.positiveNumber(trade.toAmount,"trade.toAmount");
                                        console.log(`...buy amount:${buyAmount} percentage multiplier ${selectedPercentage}`);
                                        const bonus = tools.multiply(buyAmount,selectedPercentage,18);
                                        console.log(`...bonus to give ${bonus}`);

                                        // const tokenBal = await eth_worker.getTokenBalance(assert.stringNotEmpty(upline.account_code));
                                        const tokenBal = await this.getBalanceFrom(assert.stringNotEmpty(upline.account_code,"upline.account_code"), assert.positiveInt(trade.block_time,"trade.block_time"));
                                        const bnbBusd = await eth_price_track_details_tools.getBnbUsdPrice(assert.positiveInt(trade.block_time,"trade.block_time"));
                                        const tokenBnbVal = await eth_price_track_details_tools.getBnbTokenValue(assert.positiveInt(trade.block_time,"trade.block_time"),eth_config.getTokenContract(),tokenBal);
                                        const tokenBusdVal = tools.multiply(bnbBusd,tokenBnbVal,18);
                                        console.log(`... current SRT ${tokenBal} current value ${tokenBusdVal}`);

                                        const point = new points_log();
                                        point.user_id = assert.positiveInt(sponsor_user.id);
                                        point.account_code = assert.stringNotEmpty(upline.account_code);
                                        point.account_id = assert.positiveInt(upline.id);
                                        point.amount = tools.getNumber(bonus,18);
                                        point.eth_token_amount_source = trade.toAmount;
                                        point.eth_source_hash = trade.txn_hash;
                                        point.eth_perc = selectedPercentage;
                                        point.eth_token_balance = tokenBal;
                                        point.eth_token_usd_value = tokenBusdVal;
                                        point.time_added = assert.positiveInt(trade.block_time);
                                        point.gen_level = current_level + 1;
                                        point.sponsor_level = assert.positiveInt(upline.sponsor_level);
                                        if(tools.greaterThan(tokenBusdVal,"49.99")){
                                            console.log(`.... GIVE BONUS`);
                                            point.action = "eth_community_bonus";

                                            const sendRequest = new eth_send_token();
                                            sendRequest.user_id = upline.user_id;
                                            sendRequest.toAddress = upline.account_code;
                                            sendRequest.time_added = point.time_added;
                                            sendRequest.amount = bonus;
                                            sendRequest.tag = point.action;
                                            sendRequest.status = "o";
                                            await sendRequest.save();
                                        }
                                        else{
                                            console.log(`... not enough minimum value of $50, skipping...`);
                                            point.action = "eth_skip_community_bonus";
                                            point.eth_data = "skipped dur to wallet token balance value does not meet the minimum $50 requirement at this point in time";

                                        }
                                        await point.save();
                                    }
                                }
                                current_level++;
                            }
                        }
                    }
                }
                trade.time_processed = tools.getCurrentTimeStamp();
                await trade.save();
            }

            await connection.rollback();
            // await tools.sleep(50);
            // setImmediate(()=> {
            //     worker_complan.run();
            // });
        }
        catch (e) {
            await connection.rollback();
            console.log(e);
        }
    }

    public static async getTradesForProcessing():Promise<eth_token_balance>{
        const method = "getTradesForProcessing";
        this.log(`retrieving identified buy trades for complan process`,method);
        const buyTrades = new eth_token_balance();
        this.log(`retrieving`,method);
        await buyTrades.list(
            " WHERE type=:buy AND time_processsed_complan IS NULL ",
            {buy:"buy"},
            ` ORDER BY blockNumber ASC, logIndex ASC LIMIT ${this.getBatch()} `);
        this.log(`...${buyTrades.count()} buy trades found`,method);
        return buyTrades;
    }

    public static async getBalanceFrom(wallet:string, time:number):Promise<string>{
        const events = new eth_contract_events();
        await events.list(
            " WHERE log_method=:transfer AND block_time<=:time AND (fromAddress=:wallet OR toAddress=:wallet) ",
            {wallet:wallet,transfer:"transfer",time:time},
            " ORDER BY blockNumber ASC, logIndex ASC ");
        let bal = "0";
        for(const event of events._dataList as eth_contract_events[]){
            let type = "", amt= "0";
            if(event.toAddress?.toLowerCase() === wallet.toLowerCase()){
                type = "IN";
                amt = assert.stringNotEmpty(event.toAmount,"event.toAmount");
                bal = tools.add(bal,amt,18);
            }
            else{
                type = "OUT";
                amt = assert.stringNotEmpty(event.fromAmountGross,"event.fromAmountGross");
                bal = tools.deduct(bal,amt,18);
            }
            // console.log(`......${type} ${amt} running bal:${bal} as of ${time_helper.getAsFormat(assert.positiveInt(event.block_time,"event.block_time"),TIME_FORMATS.ISO)}`);
        }
        return bal;
    }

}

if(argv.includes("run_worker_complan")){
    console.log(`running complan worker`);
    worker_complan.run().finally();
}