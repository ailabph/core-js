"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_token_sender = void 0;
const process_1 = require("process");
const config_1 = require("./config");
const tools_1 = require("./tools");
const eth_send_token_1 = require("./build/eth_send_token");
const points_log_1 = require("./build/points_log");
const web3_token_1 = require("./web3_token");
const eth_config_1 = require("./eth_config");
const assert_1 = require("./assert");
const user_tools_1 = require("./user_tools");
const sms_queue_1 = require("./build/sms_queue");
const email_queue_1 = require("./build/email_queue");
const time_helper_1 = require("./time_helper");
class worker_token_sender {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`${this.name}|${method}|${msg}`);
            if (end)
                console.log(`${this.name}|${method}|${tools_1.tools.LINE}`);
        }
    }
    static getBatch() {
        return 1;
    }
    static async run() {
        const method = "run";
        try {
            const pendingCommunityBonus = await this.getPendingCommunityBonus();
            if (pendingCommunityBonus.count() > 0) {
                const pendingToSend = await pendingCommunityBonus.getItem();
                if (pendingToSend.status === "p") {
                    this.log(`retrying to resend a previous failed send request id ${pendingToSend.id} amount ${pendingToSend.amount} to ${pendingToSend.toAddress} requested on ${time_helper_1.time_helper.getAsFormat(pendingToSend.time_added ?? 0, time_helper_1.TIME_FORMATS.ISO)}`, method, false, true);
                }
                else {
                    pendingToSend.status = "p";
                    await pendingToSend.save();
                }
                if (!tools_1.tools.isNullish(pendingToSend.hash)) {
                    throw new Error(`refuse to send request id ${pendingToSend.id}, already has send hash ${pendingToSend.hash}`);
                }
                pendingToSend.toAddress = assert_1.assert.stringNotEmpty(pendingToSend.toAddress, `${method} pendingToSend.toAddress`);
                pendingToSend.amount = assert_1.assert.isNumericString(pendingToSend.amount, `${method} pendingToSend.amount`);
                const point = new points_log_1.points_log();
                point.send_token_request_id = pendingToSend.id;
                await point.fetch();
                if (point.isNew())
                    throw new Error(`unable to retrieve point of send_token_request ${pendingToSend.id}`);
                const receiverUser = await user_tools_1.user_tools.getUserByWallet(pendingToSend.toAddress);
                if (!receiverUser)
                    throw new Error(`unable to retrieve user from send_token_request ${pendingToSend.id}`);
                this.log(`sending ${pendingToSend.amount} to ${pendingToSend.toAddress} owned by ${receiverUser.username}`, method, false, true);
                const receipt = await web3_token_1.web3_token.transfer(eth_config_1.eth_config.getHotWalletAddress(), eth_config_1.eth_config.getHotWalletKey(), pendingToSend.toAddress, pendingToSend.amount);
                if (receipt) {
                    pendingToSend.status = "d";
                    pendingToSend.hash = receipt.transactionHash;
                    pendingToSend.time_sent = tools_1.tools.getCurrentTimeStamp();
                    await pendingToSend.save();
                    this.log(`send successful, notifying user`, method, false, true);
                    if (typeof point.sms_queue_id === "number" && point.sms_queue_id > 0) {
                        this.log(`set sms_queue id ${point.sms_queue_id} for sending`, method, false, true);
                        const sms = new sms_queue_1.sms_queue();
                        sms.id = point.sms_queue_id;
                        await sms.fetch();
                        if (sms.recordExists()) {
                            sms.status = "o";
                            await sms.save();
                        }
                    }
                    else if (typeof point.email_queue_id === "number" && point.email_queue_id > 0) {
                        this.log(`set email_queue id ${point.email_queue_id} for sending`, method, false, true);
                        const emailRequest = new email_queue_1.email_queue();
                        emailRequest.id = point.email_queue_id;
                        await emailRequest.fetch();
                        if (emailRequest.recordExists()) {
                            emailRequest.status = "o";
                            await emailRequest.save();
                        }
                    }
                }
                this.log(``, method, true, true);
            }
            await tools_1.tools.sleep(500);
            setImmediate(() => {
                worker_token_sender.run().finally();
            });
        }
        catch (e) {
            const errorMsg = e instanceof Error ? e.message : "unknown error";
            this.log(`ERROR ${errorMsg}`, method, false, true);
            this.log(`retrying in 3 seconds`, method, false, true);
            await tools_1.tools.sleep(3000);
            setImmediate(() => {
                worker_token_sender.run().finally();
            });
        }
    }
    static async getPendingCommunityBonus() {
        let pendingSend = new eth_send_token_1.eth_send_token();
        await pendingSend.list(" WHERE tag=:eth_community_bonus AND status=:open ", { eth_community_bonus: "eth_community_bonus", open: "o" }, ` ORDER BY id ASC LIMIT ${this.getBatch()} `);
        if (pendingSend.count() === 0) {
            await pendingSend.list(" WHERE tag=:eth_community_bonus AND status=:pending AND hash IS NULL ", { eth_community_bonus: "eth_community_bonus", pending: "p" }, ` ORDER BY id ASC LIMIT ${this.getBatch()} `);
        }
        return pendingSend;
    }
}
exports.worker_token_sender = worker_token_sender;
if (process_1.argv.includes("run_worker_token_sender")) {
    console.log(`running worker to process token sending on chain...`);
    worker_token_sender.run().finally();
}
//# sourceMappingURL=worker_token_sender.js.map