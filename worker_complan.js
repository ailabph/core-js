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
const eth_token_balance_1 = require("./build/eth_token_balance");
const config_1 = require("./config");
const account_tools_1 = require("./account_tools");
const eth_token_balance_tools_1 = require("./eth_token_balance_tools");
class worker_complan {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`worker_complan|${method}|${msg}`);
            if (end)
                console.log(`worker_complan|${method}|${tools_1.tools.LINE}`);
        }
    }
    static addLog(msg, method, log) {
        this.log(msg, method, false, true);
        log.push(msg);
        return log;
    }
    //region CONFIG
    static getBatch() {
        const method = "getBatch";
        let batch = 1;
        const overrideBatch = config_1.config.getCustomOption("complan_batch");
        if (overrideBatch) {
            batch = assert_1.assert.positiveInt(overrideBatch, `${method} overrideBatch`);
        }
        return batch;
    }
    static getCommunityBonusLevelLimit() {
        return 5;
    }
    static getCommunityBonusPercentage(level) {
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
    //endregion CONFIG
    //region CHECKS
    static assertBuyTrade(balanceDetail, desc = "") {
        if (balanceDetail.type !== "buy") {
            throw new Error(`${desc} balance detail id ${balanceDetail.id} blockNumber ${balanceDetail.blockNumber} logIndex ${balanceDetail.logIndex} hash ${balanceDetail.transactionHash} is not buy type, found ${balanceDetail.type}`);
        }
    }
    static assertCommunityBonusLevelLimit(buyer, bonus_receiver) {
        const method = "assertCommunityBonusLevelLimit";
        account_tools_1.account_tools.assertSponsorRelated(bonus_receiver, buyer);
        const buyer_sponsor_level = assert_1.assert.naturalNumber(buyer.sponsor_level, `${method} buyer.sponsor_level`);
        const bonus_receiver_level = assert_1.assert.naturalNumber(bonus_receiver.sponsor_level, `${method} bonus_receiver.sponsor_level`);
        const community_bonus_level = buyer_sponsor_level - bonus_receiver_level;
        if (community_bonus_level > this.getCommunityBonusLevelLimit()) {
            throw new Error(`${method} community bonus level ${community_bonus_level} > community bonus limit ${this.getCommunityBonusLevelLimit()}`);
        }
    }
    //endregion CHECKS
    static async run2() {
        /**
         * every token_balance, save log also time_processed_complan
         *
         */
        const method = "run";
        await connection_1.connection.startTransaction();
        try {
            const buyTrades = await this.getTradesForProcessing();
            for (const buyTrade of buyTrades._dataList) {
                await this.processBuyTradeComplan(buyTrade);
            }
            await connection_1.connection.commit();
        }
        catch (e) {
            await connection_1.connection.rollback();
        }
    }
    static async processBuyTradeComplan(buyTrade) {
        const method = "processBuyTradeComplan";
        this.log(`processing buy trade complan logic`, method);
        assert_1.assert.inTransaction();
        this.assertBuyTrade(buyTrade);
        const buy_amount = assert_1.assert.isNumericString(buyTrade.debit, `${method} buyTrade.debit`);
        const address_buyer = assert_1.assert.stringNotEmpty(buyTrade.address, `${method} buyTrade.address`);
        const blockNumber = assert_1.assert.positiveInt(buyTrade.blockNumber, `${method} buyTrade.blockNumber`);
        const logIndex = assert_1.assert.positiveInt(buyTrade.logIndex, `${method} buyTrade.logIndex`);
        const transactionHash = assert_1.assert.stringNotEmpty(buyTrade.transactionHash, `${method} buyTrade.transactionHash`);
        let logs = [];
        let traverseLevel = 0;
        const communityBonusLevelLimit = this.getCommunityBonusLevelLimit();
        /**
         * get account of address_buyer
         */
        const buyer_account = await account_tools_1.account_tools.getAccount(address_buyer);
        if (!buyer_account) {
            logs.push(`${address_buyer} has no registered account in db`);
            this.log(logs[logs.length - 1], method);
        }
        else {
            // traverse upline
            const uplineCount = account_tools_1.account_tools.countSponsorUplinesByDna(buyer_account.sponsor_dna);
            logs.push(`${address_buyer} has ${uplineCount} sponsor uplines`);
            this.log(logs[logs.length - 1], method);
            const sponsorStructureCheck = await account_tools_1.account_tools.verifySponsorLineOfDownline(buyer_account);
            if (typeof sponsorStructureCheck === "string") {
                throw new Error(sponsorStructureCheck);
            }
            let sponsor_id = buyer_account.sponsor_id;
            while (sponsor_id > 0) {
                logs.push(`retrieving upline sponsor via sponsor_id ${sponsor_id}`);
                this.log(logs[logs.length - 1], method);
                traverseLevel++;
                const sponsor = await account_tools_1.account_tools.getAccount(sponsor_id);
                if (!sponsor) {
                    logs.push(`unable to retrieve account via sponsor_id ${sponsor_id}`);
                    this.log(logs[logs.length - 1], method);
                }
                else {
                    logs.push(`traverse level ${traverseLevel}/${communityBonusLevelLimit}, upline ${sponsor.account_code} sponsor_level ${sponsor.sponsor_level}`);
                    this.log(logs[logs.length - 1], method);
                    if (traverseLevel > communityBonusLevelLimit) {
                        // add skip point here
                    }
                    else {
                        //
                    }
                }
            }
        }
        buyTrade.time_processsed_complan = tools_1.tools.getCurrentTimeStamp();
        buyTrade.logs = JSON.stringify(logs);
        await buyTrade.save();
        return buyTrade;
    }
    static getDefaultPoint(receiverAccount, buyerAccount, buyTrade) {
        const method = "getDefaultPoint";
        this.assertBuyTrade(buyTrade, method);
        const point = new points_log_1.points_log();
        point.seq_no = 1;
        point.user_id = assert_1.assert.naturalNumber(receiverAccount.user_id, `${method} receiverAccount.user_id`);
        point.account_code = assert_1.assert.stringNotEmpty(receiverAccount.account_code, `${method} receiverAccount.account_code`);
        point.account_rank = assert_1.assert.stringNotEmpty(receiverAccount.account_type, `${method} receiverAccount.account_type`);
        point.account_id = assert_1.assert.positiveInt(receiverAccount.id, `${method} receiverAccount.id`);
        point.sponsor_level = assert_1.assert.positiveInt(receiverAccount.sponsor_level, `${method} receiverAccount.sponsor_level`);
        point.time_added = assert_1.assert.positiveInt(buyTrade.blockTime, `${method} buyTrade.blockTime`);
        point.date_added = time_helper_1.time_helper.getTime(point.time_added, "UTC").format("Y-m-d");
        point.code_source = assert_1.assert.stringNotEmpty(buyerAccount.account_code, `${method} buyerAccount.account_code`);
        point.code_source_account_id = assert_1.assert.positiveInt(buyerAccount.id, `${method} buyerAccount.id`);
        point.code_source_owner_user_id = assert_1.assert.positiveInt(buyerAccount.user_id, `${method} buyerAccount.user_id`);
        const bonus_receiver_sponsor_level = assert_1.assert.naturalNumber(receiverAccount.sponsor_level, `${method} bonusReceiver.sponsor_level`);
        const buyer_sponsor_level = assert_1.assert.naturalNumber(buyerAccount.sponsor_level, `${method} buyerAccount.sponsor_level`);
        point.gen_level = buyer_sponsor_level - bonus_receiver_sponsor_level;
        point.eth_source_hash = buyTrade.transactionHash;
        point.eth_token_amount_source = assert_1.assert.isNumericString(buyTrade.debit, `${method} buyTrade.debit for token_bought`, 0);
        point.eth_token_bnb_price = assert_1.assert.isNumericString(buyTrade.bnb_price, `${method} buyTrade.bnb_price`);
        point.eth_token_usd_rate = assert_1.assert.isNumericString(buyTrade.usd_price, `${method} buyTrade.usd_price`);
        return point;
    }
    static async addSkipCommunityBonus() {
    }
    static async addCommunityBonus(bonusReceiver, buyerAccount, buyTrade, log) {
        const method = "addCommunityBonus";
        assert_1.assert.inTransaction();
        const pointLogs = [];
        log = this.addLog(`adding community bonus to ${bonusReceiver.account_code} sponsor_level ${bonusReceiver.sponsor_level} from buyer ${buyerAccount.account_code} sponsor_level ${buyerAccount.sponsor_level}`, method, log);
        pointLogs.push(log[log.length - 1]);
        this.assertBuyTrade(buyTrade);
        this.assertCommunityBonusLevelLimit(buyerAccount, bonusReceiver);
        const bonus_receiver_sponsor_level = assert_1.assert.naturalNumber(bonusReceiver.sponsor_level, `${method} bonusReceiver.sponsor_level`);
        const buyer_sponsor_level = assert_1.assert.naturalNumber(buyerAccount.sponsor_level, `${method} buyerAccount.sponsor_level`);
        const community_level = buyer_sponsor_level - bonus_receiver_sponsor_level;
        const token_bought = assert_1.assert.isNumericString(buyTrade.debit, `${method} buyTrade.debit for token_bought`, 0);
        const bonusPercentage = this.getCommunityBonusPercentage(community_level);
        const communityBonus = tools_1.tools.multiply(token_bought, bonusPercentage);
        log = this.addLog(`community_level ${community_level} token_bought ${token_bought} bonus_percentage ${bonusPercentage} community_bonus ${communityBonus}`, method, log);
        pointLogs.push(log[log.length - 1]);
        const timeFormat = time_helper_1.time_helper.getAsFormat(buyTrade.blockTime, time_helper_1.TIME_FORMATS.ISO, "UTC");
        const tokenBalanceAtPurchaseInfo = await eth_token_balance_tools_1.eth_token_balance_tools.getBalanceDetailAsOf(bonusReceiver.account_code, buyTrade.blockTime);
        let tokenBalanceAtPurchase = "0";
        let tokenBnbPriceAtPurchase = "0";
        let tokenBnbValueAtPurchase = "0";
        if (tokenBalanceAtPurchaseInfo) {
        }
        else {
            const tokenBalanceValueAtPurchase = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbTokenValue(buyTrade.blockTime, eth_config_1.eth_config.getTokenContract(), tokenBalanceAtPurchase);
        }
        let currentTokenBalance = "0";
        let currentTokenBnbPrice = "0";
        let currentTokenBnbValue = "0";
        const point = this.getDefaultPoint(bonusReceiver, buyerAccount, buyTrade);
        point.action = "eth_community_bonus";
        point.eth_token_bonus = communityBonus;
        point.eth_perc = bonusPercentage;
        point.eth_data = JSON.stringify(pointLogs);
        await point.save();
        log = this.addLog(`saved point with id ${point.id}`, method, log);
        return { log: log, points_log: point };
    }
    static async run() {
        await connection_1.connection.startTransaction();
        try {
            const unprocessedTrades = new eth_contract_events_1.eth_contract_events();
            await unprocessedTrades.list(" WHERE tag=:trade AND time_processed IS NULL AND time_balance_processed>:zero ", { trade: "trade", zero: 0 }, ` ORDER BY blockNumber ASC, logIndex ASC LIMIT ${this.getBatch()} `);
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
    static async getTradesForProcessing() {
        const method = "getTradesForProcessing";
        this.log(`retrieving identified buy trades for complan process...`, method);
        const buyTrades = new eth_token_balance_1.eth_token_balance();
        await buyTrades.list(" WHERE type=:sell AND time_processed_complan IS NULL ", { sell: "sell" }, ` ORDER BY blockNumber ASC, logIndex ASC `);
        this.log(`...${buyTrades.count()} buy trades found`, method);
        return buyTrades;
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