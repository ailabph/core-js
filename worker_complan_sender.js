"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_complan_sender = void 0;
const process_1 = require("process");
const config_1 = require("./config");
const tools_1 = require("./tools");
const points_log_1 = require("./build/points_log");
const connection_1 = require("./connection");
const user_tools_1 = require("./user_tools");
const assert_1 = require("./assert");
const eth_send_token_1 = require("./build/eth_send_token");
const worker_sms_1 = require("./worker_sms");
const sms_queue_1 = require("./build/sms_queue");
const email_queue_1 = require("./build/email_queue");
const web3_tools_1 = require("./web3_tools");
const account_tools_1 = require("./account_tools");
const worker_email_1 = require("./worker_email");
//region TYPES
//endregion TYPES
class worker_complan_sender {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`${this.name}|${method}|${msg}`);
            if (end)
                console.log(`${this.name}|${method}|${tools_1.tools.LINE}`);
        }
    }
    static addLog(msg, method, logs) {
        logs.push(msg);
        this.log(msg, method, false, true);
        return logs;
    }
    static getBatch() {
        return 5;
    }
    static async run() {
        const method = "run";
        /**
         * get points_log not yet processed for sending
         * check if wallet has user owner
         * check if owner is PH, add sms queue
         * else add email queue
         */
        await connection_1.connection.startTransaction();
        try {
            const points = await this.getUnprocessedPoints();
            if (points.count() > 0)
                this.log(`unprocessed points found ${points.count()}`, method, false, true);
            for (const point of points._dataList) {
                let logs = [];
                this.log(`id ${point.id} processing bonus ${point.action} amount ${point.eth_token_bonus} level ${point.gen_level} perc ${point.eth_perc} from buy amount ${point.eth_token_amount_source}`, method, false, true);
                point.code_source = assert_1.assert.stringNotEmpty(point.code_source, `${method} point.code_source`);
                point.eth_token_amount_source = assert_1.assert.stringNotEmpty(point.eth_token_amount_source, `${method} point.eth_token_amount_source`);
                point.gen_level = assert_1.assert.positiveInt(point.gen_level, `${method} gen_level`);
                const sourceUser = await user_tools_1.user_tools.getUserByWallet(point.code_source);
                const buyerUsername = sourceUser ? sourceUser.username : "unregistered";
                logs = this.addLog(`buyer ${buyerUsername}`, method, logs);
                logs = this.addLog(`source hash ${point.eth_source_hash}`, method, logs);
                let notifyType = "";
                let contact = "";
                let email = "";
                let firstName = "";
                const receiverUser = await user_tools_1.user_tools.getUserByWallet(point.account_code);
                if (receiverUser) {
                    logs = this.addLog(`receiver of bonus ${receiverUser.username} usergroup ${receiverUser.usergroup} country_id ${receiverUser.country_id}`, method, logs);
                    receiverUser.country_code = assert_1.assert.stringNotEmpty(receiverUser.country_code, `${method} receiverUser.country_code`);
                    firstName = assert_1.assert.stringNotEmpty(receiverUser.firstname, `${method} receiverUser.firstname`);
                    if (receiverUser.country_code === "ph") {
                        logs = this.addLog(`user is from PH, set notification sms`, method, logs);
                        notifyType = "sms";
                        contact = assert_1.assert.isNumericString(receiverUser.contact, `${method} receiverUser.contact`);
                    }
                    else {
                        logs = this.addLog(`user is not from PH, set notification email`, method, logs);
                        notifyType = "email";
                        email = assert_1.assert.validEmail(receiverUser.email, `${method} receiverUser.email`);
                    }
                    logs = this.addLog(`preparing send token request`, method, logs);
                    const sendTokenRequest = new eth_send_token_1.eth_send_token();
                    sendTokenRequest.toAddress = assert_1.assert.stringNotEmpty(point.account_code, `${method} point.account_code`);
                    sendTokenRequest.amount = assert_1.assert.isNumericString(point.eth_token_bonus, `${method} point.eth_token_bonus`);
                    sendTokenRequest.time_added = tools_1.tools.getCurrentTimeStamp();
                    sendTokenRequest.tag = point.action;
                    sendTokenRequest.status = "o";
                    // final checks before sending
                    if (point.action !== "eth_community_bonus")
                        throw new Error(`point is not a community bonus`);
                    const receiverAccount = await account_tools_1.account_tools.getAccount(sendTokenRequest.toAddress);
                    if (!receiverAccount)
                        throw new Error(`unable to retrieve account of receiver with address ${sendTokenRequest.toAddress}`);
                    const sponsorStructure = await account_tools_1.account_tools.verifySponsorLineOfDownline(receiverAccount);
                    if (typeof sponsorStructure === "string")
                        throw new Error(`${sponsorStructure}`);
                    if (sendTokenRequest.toAddress === point.code_source)
                        throw new Error(`unexpected sending token to the buyer`);
                    const maxBonus = tools_1.tools.multiply(point.eth_token_amount_source, 0.05);
                    if (tools_1.tools.greaterThan(sendTokenRequest.amount, maxBonus))
                        throw new Error(`unexpected bonus amount ${sendTokenRequest.amount} > 5% allowed which is ${maxBonus}`);
                    const toAddressIsWallet = await web3_tools_1.web3_tools.isWalletAddress(sendTokenRequest.toAddress);
                    if (!toAddressIsWallet)
                        throw new Error(`toAddress ${sendTokenRequest.toAddress} is not detected as a wallet`);
                    await sendTokenRequest.save();
                    point.send_token_request_id = sendTokenRequest.id;
                    logs = this.addLog(`send token request id: ${sendTokenRequest.id}`, method, logs);
                    // notify
                    const formattedAmount = tools_1.tools.toBn(sendTokenRequest.amount).toFixed(4);
                    let messageToUser = `Congratulations ${firstName.toUpperCase()}! You just earned`;
                    messageToUser += ` ${formattedAmount} SRT Community Bonus!`;
                    messageToUser += ` A ${tools_1.tools.toOrdinal(point.gen_level)} generation member from your community just purchased SRT`;
                    if (notifyType === "sms") {
                        const sms = new sms_queue_1.sms_queue();
                        sms.message = messageToUser;
                        sms.number = assert_1.assert.isNumericString(contact, `${method} contact`, 0);
                        sms.timeadded = tools_1.tools.getCurrentTimeStamp();
                        sms.status = worker_sms_1.SMS_STATUS.PENDING;
                        await sms.save();
                        point.sms_queue_id = sms.id;
                        logs = this.addLog(`added sms message to queue (${messageToUser}) to contact ${contact}, sms queue id ${sms.id}`, method, logs);
                    }
                    else {
                        const emailRequest = new email_queue_1.email_queue();
                        emailRequest.email = assert_1.assert.validEmail(email, `${method} email`);
                        emailRequest.subject = `Community Bonus`;
                        emailRequest.message = messageToUser;
                        emailRequest.status = worker_email_1.STATUS_EMAIL.PENDING;
                        await emailRequest.save();
                        point.email_queue_id = emailRequest.id;
                        logs = this.addLog(`added email message to queue (${messageToUser}) to email ${email}, email queue id ${emailRequest.id}`, method, logs);
                    }
                }
                else {
                    logs = this.addLog(`unknown receiver, skipping`, method, logs);
                }
                point.time_process_notification = tools_1.tools.getCurrentTimeStamp();
                point.logs_check = JSON.stringify(logs);
                await point.save();
                this.log(``, method, true, true);
            }
            await connection_1.connection.commit();
            await tools_1.tools.sleep(100);
            setImmediate(() => {
                worker_complan_sender.run().finally();
            });
        }
        catch (e) {
            await connection_1.connection.rollback();
            this.errorCount++;
            const error_message = e instanceof Error ? e.message : "unknown error";
            this.log(`ERROR ${error_message}`, method, false, true);
            this.log(`retrying after ${this.retryWaitSeconds} seconds...`, method, false, true);
            await tools_1.tools.sleep(this.retryWaitSeconds * 1000);
            return this.run();
        }
    }
    static async getUnprocessedPoints() {
        const method = "getUnprocessedPoints";
        const points = new points_log_1.points_log();
        await points.list(" WHERE action=:eth_community_bonus AND time_process_notification IS NULL ", { eth_community_bonus: "eth_community_bonus" }, ` ORDER BY time_added ASC, gen_level ASC LIMIT ${this.getBatch()} `);
        return points;
    }
}
exports.worker_complan_sender = worker_complan_sender;
//region CONFIG
worker_complan_sender.retryWaitSeconds = 3;
//endregion CONFIG
worker_complan_sender.errorCount = 0;
if (process_1.argv.includes("run_worker_complan_sender")) {
    console.log(`running worker to process points to token send request...`);
    worker_complan_sender.run().finally();
}
//# sourceMappingURL=worker_complan_sender.js.map