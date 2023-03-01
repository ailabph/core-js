"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_complan = void 0;
const connection_1 = require("./connection");
const time_helper_1 = require("./time_helper");
const assert_1 = require("./assert");
const process_1 = require("process");
const tools_1 = require("./tools");
const eth_price_track_details_tools_1 = require("./eth_price_track_details_tools");
const eth_config_1 = require("./eth_config");
const points_log_1 = require("./build/points_log");
const eth_token_balance_1 = require("./build/eth_token_balance");
const config_1 = require("./config");
const account_tools_1 = require("./account_tools");
const eth_token_balance_tools_1 = require("./eth_token_balance_tools");
const eth_worker_1 = require("./eth_worker");
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
    static async run() {
        /**
         * every token_balance, save log also time_processed_complan
         *
         */
        const method = "run";
        await connection_1.connection.startTransaction();
        try {
            const buyTrades = await this.getTradesForProcessing();
            console.log(`${buyTrades.count()} found`);
            for (const buyTrade of buyTrades._dataList) {
                await this.processBuyTradeComplan(buyTrade);
            }
            await connection_1.connection.commit();
            await tools_1.tools.sleep(500);
            setImmediate(this.run);
        }
        catch (e) {
            await connection_1.connection.rollback();
            throw e;
        }
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
    static getMinimumUsdValue() {
        return 50;
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
    //region GETTERS
    static async getTradesForProcessing() {
        const method = "getTradesForProcessing";
        this.log(`retrieving identified buy trades for complan process`, method);
        const buyTrades = new eth_token_balance_1.eth_token_balance();
        this.log(`retrieving`, method);
        await buyTrades.list(" WHERE type=:buy AND time_processsed_complan IS NULL ", { buy: "buy" }, ` ORDER BY blockNumber ASC, logIndex ASC LIMIT ${this.getBatch()} `);
        this.log(`...${buyTrades.count()} buy trades found`, method);
        return buyTrades;
    }
    //endregion GETTERS
    //region POINTS
    static getDefaultPoint(receiverAccount, buyerAccount, buyTrade) {
        const method = "getDefaultPoint";
        this.assertBuyTrade(buyTrade, method);
        const point = new points_log_1.points_log();
        point.seq_no = 1;
        point.amount = 0;
        point.user_id = assert_1.assert.naturalNumber(receiverAccount.user_id, `${method} receiverAccount.user_id`);
        point.account_code = assert_1.assert.stringNotEmpty(receiverAccount.account_code, `${method} receiverAccount.account_code`);
        point.account_rank = assert_1.assert.stringNotEmpty(receiverAccount.account_type, `${method} receiverAccount.account_type`);
        point.account_id = assert_1.assert.positiveInt(receiverAccount.id, `${method} receiverAccount.id`);
        point.sponsor_level = assert_1.assert.positiveInt(receiverAccount.sponsor_level, `${method} receiverAccount.sponsor_level`);
        point.time_added = assert_1.assert.positiveInt(buyTrade.blockTime, `${method} buyTrade.blockTime`);
        point.date_added = time_helper_1.time_helper.getTime(point.time_added, "UTC").format(time_helper_1.TIME_FORMATS.MYSQL_DATE);
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
        const point = this.getDefaultPoint(bonusReceiver, buyerAccount, buyTrade);
        point.action = "eth_community_bonus";
        point.eth_token_bonus = communityBonus;
        point.eth_perc = bonusPercentage;
        point.eth_data = JSON.stringify(pointLogs);
        await point.save();
        log = this.addLog(`saved point with id ${point.id}`, method, log);
        return { log: log, points_log: point };
    }
    static async addCommunityBonusSkipOutOfRange() { }
    static async addCommunityBonusSkipNotMaintained() { }
    static async addCommunityBonusSkip(bonusReceiver, buyerAccount, buyTrade, log, reason) {
        const method = "addCommunityBonusSkip";
        assert_1.assert.inTransaction();
        const pointLogs = [];
        log = this.addLog(`adding community bonus skip to ${bonusReceiver.account_code} sponsor_level ${bonusReceiver.sponsor_level} from buyer ${buyerAccount.account_code} sponsor_level ${buyerAccount.sponsor_level}`, method, log);
        pointLogs.push(log[log.length - 1]);
        this.assertBuyTrade(buyTrade);
        const point = this.getDefaultPoint(bonusReceiver, buyerAccount, buyTrade);
        point.action = "eth_community_bonus";
        point.eth_token_bonus = "0";
        point.eth_data = JSON.stringify(pointLogs);
        await point.save();
        log = this.addLog(`saved point with id ${point.id}`, method, log);
        return { log: log, points_log: point };
    }
    //endregion POINTS
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
                await tools_1.tools.sleep(50);
                logs.push(`retrieving upline sponsor via sponsor_id ${sponsor_id}`);
                this.log(logs[logs.length - 1], method);
                traverseLevel++;
                const sponsor = await account_tools_1.account_tools.getAccount(sponsor_id);
                if (!sponsor)
                    throw new Error(`unable to retrieve account via sponsor_id ${sponsor_id}`);
                sponsor_id = sponsor.sponsor_id;
                logs.push(`traverse level ${traverseLevel}/${communityBonusLevelLimit}, upline ${sponsor.account_code} sponsor_level ${sponsor.sponsor_level}`);
                this.log(logs[logs.length - 1], method);
                if (traverseLevel > communityBonusLevelLimit) {
                    // add skip point here
                    logs = this.addLog(`skip because current level ${traverseLevel} is greater than limit ${communityBonusLevelLimit}`, method, logs);
                    const skip = this.getDefaultPoint(sponsor, buyer_account, buyTrade);
                    skip.action = "skip_eth_community_bonus";
                    skip.eth_data = logs[logs.length - 1];
                    await skip.save();
                }
                else {
                    logs = this.addLog(`checking if upline is maintained`, method, logs);
                    const timeFormat = time_helper_1.time_helper.getAsFormat(buyTrade.blockTime, time_helper_1.TIME_FORMATS.ISO, "UTC");
                    const tokenBalanceAtPurchaseInfo = await eth_token_balance_tools_1.eth_token_balance_tools.getBalanceDetailAsOf(sponsor.account_code, buyTrade.blockTime);
                    let tokenBalanceAtPurchase = "0";
                    if (tokenBalanceAtPurchaseInfo && tools_1.tools.greaterThan(tokenBalanceAtPurchaseInfo.token_amount, 0)) {
                        tokenBalanceAtPurchase = tokenBalanceAtPurchaseInfo.token_amount;
                    }
                    let tokenBalanceBusdValue = tools_1.tools.multiply(tokenBalanceAtPurchase, buyTrade.usd_price);
                    logs = this.addLog(`token balance during purchase on ${timeFormat} is ${tokenBalanceAtPurchase} valued at busd ${tokenBalanceBusdValue} bnb_usd ${buyTrade.bnb_usd} token_bnb ${buyTrade.bnb_price} token_usd ${buyTrade.usd_price}`, method, logs);
                    const currentTokenBalance = await eth_worker_1.eth_worker.getTokenBalance(assert_1.assert.stringNotEmpty(sponsor.account_code, `${method} bonusReceiver.account_code`));
                    const currentTokenBnbPrice = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbTokenPrice(buyTrade.blockTime, eth_config_1.eth_config.getTokenContract());
                    const currentBnbBusdPrice = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbUsdPrice(buyTrade.blockTime);
                    const currentTokenUsdPrice = tools_1.tools.multiply(currentTokenBnbPrice, currentBnbBusdPrice);
                    const currentBalanceUsdValue = tools_1.tools.multiply(currentTokenBalance, currentTokenUsdPrice);
                    const currentTime = time_helper_1.time_helper.getTime().format(time_helper_1.TIME_FORMATS.ISO);
                    logs = this.addLog(`current token balance during purchase on ${currentTime} is ${currentTokenBalance} valued at ${currentBalanceUsdValue} bnb_usd ${currentBnbBusdPrice} token_bnb ${currentTokenBnbPrice} token_usd ${currentTokenUsdPrice}`, method, logs);
                    if (tools_1.tools.greaterThanOrEqualTo(currentBalanceUsdValue, this.getMinimumUsdValue())) {
                        // add point
                        const result = await this.addCommunityBonus(sponsor, buyer_account, buyTrade, logs);
                        logs = result.log;
                    }
                    else {
                        // add skip point
                        logs = this.addLog(`skipped bonus because token balance ${currentTokenBalance} usd value ${currentTokenUsdPrice} is below minimum ${this.getMinimumUsdValue()}`, method, logs);
                        const skip = this.getDefaultPoint(sponsor, buyer_account, buyTrade);
                        skip.action = "skip_eth_community_bonus";
                        skip.eth_data = logs[logs.length - 1];
                    }
                }
            }
        }
        buyTrade.time_processsed_complan = tools_1.tools.getCurrentTimeStamp();
        buyTrade.logs = JSON.stringify(logs);
        await buyTrade.save();
        return buyTrade;
    }
}
exports.worker_complan = worker_complan;
if (process_1.argv.includes("run_worker_complan")) {
    console.log(`running complan worker`);
    worker_complan.run().finally();
}
//# sourceMappingURL=worker_complan.js.map