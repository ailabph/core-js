import {connection} from "./connection";
import {eth_contract_events} from "./build/eth_contract_events";
import {account} from "./build/account";
import {TIME_FORMATS, time_helper} from "./time_helper";
import {assert} from "./assert";
import {argv} from "process";
import {user} from "./build/user";
import {tools} from "./tools";
import {eth_worker} from "./eth_worker";
import {eth_price_track_details_tools} from "./eth_price_track_details_tools";
import {eth_config} from "./eth_config";
import {points_log} from "./build/points_log";
import {eth_send_token} from "./build/eth_send_token";

export class worker_complan{

    public static getBatch():number{
        return 100;
    }

    public static async run(){
        await connection.startTransaction();
        try{

            const unprocessedTrades = new eth_contract_events();
            await unprocessedTrades.list(
                " WHERE tag=:trade AND time_processed IS NULL ",
                {trade:"trade"},
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