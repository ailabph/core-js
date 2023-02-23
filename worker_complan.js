"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_complan = void 0;
const connection_1 = require("./connection");
const eth_contract_events_1 = require("./build/eth_contract_events");
const account_1 = require("./build/account");
const time_helper_1 = require("./time_helper");
const assert_1 = require("./assert");
const process_1 = require("process");
const user_1 = require("./build/user");
const tools_1 = require("./tools");
const eth_price_track_details_tools_1 = require("./eth_price_track_details_tools");
const eth_config_1 = require("./eth_config");
const points_log_1 = require("./build/points_log");
const eth_send_token_1 = require("./build/eth_send_token");
class worker_complan {
    static getBatch() {
        return 100;
    }
    static async run() {
        await connection_1.connection.startTransaction();
        try {
            const unprocessedTrades = new eth_contract_events_1.eth_contract_events();
            await unprocessedTrades.list(" WHERE tag=:trade AND time_processed IS NULL ", { trade: "trade" }, ` ORDER BY blockNumber ASC, logIndex ASC LIMIT ${this.getBatch()} `);
            for (const trade of unprocessedTrades._dataList) {
                const timeInfo = time_helper_1.time_helper.getAsFormat(assert_1.assert.positiveInt(trade.block_time, "trade.block_time"), time_helper_1.TIME_FORMATS.ISO);
                console.log(`checking trade ${trade.txn_hash} ${trade.blockNumber} ${trade.logIndex} on ${timeInfo}`);
                const owner = new user_1.user();
                owner.walletAddress = trade.toAddress;
                await owner.fetch();
                if (owner.isNew()) {
                    console.log(`...trade has no connected wallet, skipping`);
                }
                else {
                    const walletAccount = new account_1.account();
                    walletAccount.account_code = owner.walletAddress;
                    await walletAccount.fetch();
                    if (walletAccount.isNew()) {
                        console.log(`...unable to retrieve account ${owner.walletAddress}, skipping`);
                    }
                    else {
                        if (trade.type?.toLowerCase() !== "buy") {
                            console.log(`...trade is not buy, skipping`);
                        }
                        else {
                            const level_limit = 5;
                            let current_level = 0;
                            const perc = [0.05, 0.02, 0.01, 0.01, 0.01];
                            let sponsor_id = walletAccount.sponsor_id;
                            while (sponsor_id > 0 && current_level < level_limit) {
                                const upline = new account_1.account();
                                upline.id = sponsor_id;
                                await upline.fetch();
                                if (upline.isNew()) {
                                    console.log(`...unable to retrieve upline with id ${sponsor_id}, skipping`);
                                }
                                else {
                                    sponsor_id = upline.sponsor_id;
                                    const sponsor_user = new user_1.user();
                                    sponsor_user.walletAddress = upline.account_code;
                                    await sponsor_user.fetch();
                                    if (sponsor_user.isNew()) {
                                        console.log(`... ${upline.account_code} is not connected to a user, skipping`);
                                    }
                                    else {
                                        console.log(`... giving bonus at level ${current_level + 1} of ${owner.username}, ${sponsor_user.username}`);
                                        const selectedPercentage = perc[current_level];
                                        const buyAmount = assert_1.assert.positiveNumber(trade.toAmount, "trade.toAmount");
                                        console.log(`...buy amount:${buyAmount} percentage multiplier ${selectedPercentage}`);
                                        const bonus = tools_1.tools.multiply(buyAmount, selectedPercentage, 18);
                                        console.log(`...bonus to give ${bonus}`);
                                        // const tokenBal = await eth_worker.getTokenBalance(assert.stringNotEmpty(upline.account_code));
                                        const tokenBal = await this.getBalanceFrom(assert_1.assert.stringNotEmpty(upline.account_code, "upline.account_code"), assert_1.assert.positiveInt(trade.block_time, "trade.block_time"));
                                        const bnbBusd = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbUsdPrice(assert_1.assert.positiveInt(trade.block_time, "trade.block_time"));
                                        const tokenBnbVal = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbTokenValue(assert_1.assert.positiveInt(trade.block_time, "trade.block_time"), eth_config_1.eth_config.getTokenContract(), tokenBal);
                                        const tokenBusdVal = tools_1.tools.multiply(bnbBusd, tokenBnbVal, 18);
                                        console.log(`... current SRT ${tokenBal} current value ${tokenBusdVal}`);
                                        const point = new points_log_1.points_log();
                                        point.user_id = assert_1.assert.positiveInt(sponsor_user.id);
                                        point.account_code = assert_1.assert.stringNotEmpty(upline.account_code);
                                        point.account_id = assert_1.assert.positiveInt(upline.id);
                                        point.amount = tools_1.tools.getNumber(bonus, 18);
                                        point.eth_token_amount_source = trade.toAmount;
                                        point.eth_source_hash = trade.txn_hash;
                                        point.eth_perc = selectedPercentage;
                                        point.eth_token_balance = tokenBal;
                                        point.eth_token_usd_value = tokenBusdVal;
                                        point.time_added = assert_1.assert.positiveInt(trade.block_time);
                                        point.gen_level = current_level + 1;
                                        point.sponsor_level = assert_1.assert.positiveInt(upline.sponsor_level);
                                        if (tools_1.tools.greaterThan(tokenBusdVal, "49.99")) {
                                            console.log(`.... GIVE BONUS`);
                                            point.action = "eth_community_bonus";
                                            const sendRequest = new eth_send_token_1.eth_send_token();
                                            sendRequest.user_id = upline.user_id;
                                            sendRequest.toAddress = upline.account_code;
                                            sendRequest.time_added = point.time_added;
                                            sendRequest.amount = bonus;
                                            sendRequest.tag = point.action;
                                            sendRequest.status = "o";
                                            await sendRequest.save();
                                        }
                                        else {
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
                trade.time_processed = tools_1.tools.getCurrentTimeStamp();
                await trade.save();
            }
            await connection_1.connection.rollback();
            // await tools.sleep(50);
            // setImmediate(()=> {
            //     worker_complan.run();
            // });
        }
        catch (e) {
            await connection_1.connection.rollback();
            console.log(e);
        }
    }
    static async getBalanceFrom(wallet, time) {
        const events = new eth_contract_events_1.eth_contract_events();
        await events.list(" WHERE log_method=:transfer AND block_time<=:time AND (fromAddress=:wallet OR toAddress=:wallet) ", { wallet: wallet, transfer: "transfer", time: time }, " ORDER BY blockNumber ASC, logIndex ASC ");
        let bal = "0";
        for (const event of events._dataList) {
            let type = "", amt = "0";
            if (event.toAddress?.toLowerCase() === wallet.toLowerCase()) {
                type = "IN";
                amt = assert_1.assert.stringNotEmpty(event.toAmount, "event.toAmount");
                bal = tools_1.tools.add(bal, amt, 18);
            }
            else {
                type = "OUT";
                amt = assert_1.assert.stringNotEmpty(event.fromAmountGross, "event.fromAmountGross");
                bal = tools_1.tools.deduct(bal, amt, 18);
            }
            // console.log(`......${type} ${amt} running bal:${bal} as of ${time_helper.getAsFormat(assert.positiveInt(event.block_time,"event.block_time"),TIME_FORMATS.ISO)}`);
        }
        return bal;
    }
}
exports.worker_complan = worker_complan;
if (process_1.argv.includes("run_worker_complan")) {
    console.log(`running complan worker`);
    worker_complan.run().finally();
}
//# sourceMappingURL=worker_complan.js.map