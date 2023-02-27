"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_sms = exports.SMS_STATUS = void 0;
const tools_1 = require("./tools");
const config_1 = require("./config");
const assert_1 = require("./assert");
const sms_api_1 = require("./build/sms_api");
const sms_queue_1 = require("./build/sms_queue");
const axios_1 = __importDefault(require("axios"));
const t = __importStar(require("io-ts"));
const d = __importStar(require("fp-ts/Either"));
const process_1 = require("process");
//region TYPES
var SMS_STATUS;
(function (SMS_STATUS) {
    SMS_STATUS["OPEN"] = "o";
    SMS_STATUS["PENDING"] = "p";
    SMS_STATUS["DONE"] = "d";
    SMS_STATUS["ERROR"] = "e";
})(SMS_STATUS || (SMS_STATUS = {}));
exports.SMS_STATUS = SMS_STATUS;
const SemaphoreResponseDataCodec = t.type({
    message_id: t.number,
    user_id: t.number,
    user: t.string,
    account_id: t.number,
    account: t.string,
    recipient: t.string,
    message: t.string,
    sender_name: t.string,
    network: t.string,
    status: t.string,
    type: t.string,
    source: t.string,
    created_at: t.string,
    updated_at: t.string,
});
const SemaphoreSuccessfulResponseCodec = t.type({
    status: t.number,
    statusText: t.string,
    data: t.array(SemaphoreResponseDataCodec),
});
const SemaphoreFailedResponseCodec = t.type({
    status: t.number,
    statusText: t.string,
    data: t.unknown,
});
//endregion
class worker_sms {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`worker_sms|${method}|${msg}`);
            if (end)
                console.log(`worker_sms|${method}|${tools_1.tools.LINE}`);
        }
    }
    //region CONFIG
    static getSmsLimit() {
        const method = "getSmsLimit";
        let limit = 29;
        const limit_override = config_1.config.getCustomOption("sms_limit");
        if (tools_1.tools.isNumeric(limit_override)) {
            limit = assert_1.assert.positiveInt(limit_override, `${method} limit_override`);
        }
        return limit;
    }
    static getApiUrl(priority_version = false) {
        const method = "getApiUrl";
        let url = `http://api.semaphore.co/api/v4/messages`;
        if (priority_version) {
            url = `http://api.semaphore.co/api/v4/priority`;
            let prioritySmsApiUrl = config_1.config.getCustomOption(`sms_api_url_priority`);
            if (tools_1.tools.isNotEmpty(prioritySmsApiUrl)) {
                url = assert_1.assert.stringNotEmpty(prioritySmsApiUrl, `${method} prioritySmsApiUrl`);
            }
        }
        else {
            let smsApiUrlOverride = config_1.config.getCustomOption(`sms_api_url`);
            if (tools_1.tools.isNotEmpty(smsApiUrlOverride)) {
                url = assert_1.assert.stringNotEmpty(smsApiUrlOverride, `${method} smsApiUrlOverride`);
            }
        }
        return url;
    }
    static getApiKey() {
        const method = "getApiKey";
        let sms_api = config_1.config.getCustomOption(`sms_api`, true);
        sms_api = assert_1.assert.stringNotEmpty(sms_api, `${method} sms_api`);
        return sms_api;
    }
    static getSenderName() {
        const method = "getSenderName";
        let sender_name = config_1.config.getCustomOption(`sender_name`, true);
        return assert_1.assert.stringNotEmpty(sender_name, `${method} sender_name`);
    }
    static getBatch() {
        let batch = 100;
        const overrideBatch = config_1.config.getCustomOption("worker_sms_batch");
        if (tools_1.tools.isNotEmpty(overrideBatch)) {
            batch = assert_1.assert.positiveInt(overrideBatch, `getBatch overrideBatch`);
        }
        return batch;
    }
    //endregion CONFIG
    // region GETTERS
    static async countMessagesSentByMinutes(minutes = 1) {
        const method = "countMessagesSentByMinutes";
        assert_1.assert.positiveInt(minutes, `${method} minutes`);
        const lastMinutes = tools_1.tools.getCurrentTimeStamp() - (minutes * 60);
        const messages = new sms_api_1.sms_api();
        await messages.list(" WHERE time_added>=:time ", { time: lastMinutes });
        return messages.count();
    }
    static async getUnsentMessages() {
        const method = "getUnsentMessages";
        const otp_first = await this.getUnsentOtpMessages();
        if (otp_first.count() > 0)
            return otp_first;
        const normalMessages = new sms_queue_1.sms_queue();
        await normalMessages.list(" WHERE status=:open ", { open: SMS_STATUS.OPEN }, ` ORDER BY id ASC LIMIT ${this.getBatch()} `);
        return normalMessages;
    }
    static async getUnsentOtpMessages() {
        const method = "getUnsentOtpMessages";
        const unsentOtp = new sms_queue_1.sms_queue();
        await unsentOtp.list(" WHERE status=:open AND message LIKE :otp ", { open: SMS_STATUS.OPEN, otp: "% OTP %" });
        return unsentOtp;
    }
    //endregion GETTERS
    //region CODECS
    static decodeSemaphoreSuccessfulResponse(data) {
        if (typeof data !== "object")
            return false;
        const decodedData = SemaphoreSuccessfulResponseCodec.decode(data);
        if (d.isRight(decodedData)) {
            return decodedData.right;
        }
        return false;
    }
    static decodeSemaphoreFailedResponse(data) {
        if (typeof data !== "object")
            return false;
        const decodedData = SemaphoreFailedResponseCodec.decode(data);
        if (d.isRight(decodedData)) {
            return decodedData.right;
        }
        return false;
    }
    static init() {
        if (typeof this.limiterinfo === "undefined") {
            this.limiterinfo = tools_1.tools.createLimiter(2, tools_1.RATE_LIMIT_INTERVAL.SECOND);
        }
    }
    //endregion
    static async run() {
        const method = "run";
        this.init();
        try {
            const unsentMessages = await this.getUnsentMessages();
            this.log(`${unsentMessages.count()} unsent messages found`, method);
            this.smsToProcess = unsentMessages.count();
            if (this.smsToProcess > 0) {
                for (const message of unsentMessages._dataList) {
                    await tools_1.tools.useCallLimiter(this.limiterinfo);
                    this.log(`${this.smsToProcess} sms remaining to send`, method);
                    this.sendSmsByQueue(message).then(() => {
                        this.log(`sms job done, ${--this.smsToProcess} sms remaining`, method);
                        this.restartWorker();
                    });
                }
            }
            else {
                this.restartWorker().finally();
            }
        }
        catch (e) {
            this.log(`ERROR something went wrong`, method, false, true);
            console.log(e);
            this.log(`...retrying after 2 minutes`, method, false, true);
            await tools_1.tools.sleep(1000 * 60 * 2);
            this.smsToProcess = 0;
            setImmediate(() => {
                worker_sms.run();
            });
        }
    }
    static async restartWorker() {
        const method = "restartWorker";
        if (tools_1.tools.lesserThan(worker_sms.smsToProcess, 0)) {
            throw new Error(`${method} unexpected worker_sms.smsToProcess ${worker_sms.smsToProcess} < 0`);
        }
        if (worker_sms.smsToProcess === 0) {
            this.log(`restarting worker...`, method);
            await tools_1.tools.sleep(1000);
            setImmediate(() => {
                this.run();
            });
        }
        else {
            this.log(`not time to restart worker, ${this.smsToProcess} sms remaining to be sent`, method);
        }
    }
    static async sendSmsByQueue(sms) {
        const method = "sendSMSByQueue";
        this.log(`sending sms from sms queue, setting queue status to pending`, method);
        sms.status = SMS_STATUS.PENDING;
        await sms.save();
        const response = await this.sendSms(sms.number, sms.message, tools_1.tools.greaterThan(sms.is_priority, 0));
        if (typeof response === "string") {
            this.log(`...send failed, updating status`, method);
            sms.status = SMS_STATUS.ERROR;
            sms.remarks = response;
        }
        else {
            this.log(`...send successful, updating status`, method);
            sms.status = SMS_STATUS.DONE;
            const api = new sms_api_1.sms_api();
            if (response.data.length > 0) {
                this.log(`...updating api info`, method);
                api.message_id = response.data[0].message_id;
                api.user = response.data[0].user;
                api.account_id = response.data[0].account_id;
                api.account = response.data[0].account;
                api.recipient = response.data[0].recipient;
                api.message = response.data[0].message;
                api.sender_name = response.data[0].sender_name;
                api.network = response.data[0].network;
                api.status = response.data[0].status;
                api.time_added = tools_1.tools.getCurrentTimeStamp();
                await api.save();
            }
            else {
                this.log(`...no api info`, method);
            }
        }
        await sms.save();
    }
    static async sendSms(contact, message, priority = false) {
        const method = "sendSms";
        this.log(`sending sms to ${contact} message ${message} priority ${priority ? "yes" : "no"}`, method, false, true);
        const data = {
            apikey: this.getApiKey(),
            number: assert_1.assert.isNumericString(contact, `${method} contact`),
            message: assert_1.assert.stringNotEmpty(message, `${method} message`),
            sendername: this.getSenderName()
        };
        const response = await axios_1.default.post(this.getApiUrl(priority), data);
        const decodedResponse = this.decodeSemaphoreSuccessfulResponse(response);
        if (decodedResponse) {
            const responseData = decodedResponse.data[0];
            this.log(`...send successful. message_id ${responseData.message_id} sender_name ${responseData.sender_name} ${responseData.network}`, method, false, true);
            return decodedResponse;
        }
        this.log(`...send not successful`, method);
        const failed = this.decodeSemaphoreFailedResponse(response);
        let failedReason = "failed send, unexpected server response";
        if (failed) {
            this.log(`...failed to send`, method, false, true);
            if (typeof failed.data === "object" && failed.data !== null) {
                failedReason = "failed to send, " + failed.data.toString();
            }
        }
        this.log(failedReason, method, false, true);
        return failedReason;
    }
}
exports.worker_sms = worker_sms;
//endregion CODES
//region INIT
worker_sms.smsToProcess = 0;
if (process_1.argv.includes("run_worker_sms")) {
    console.log(`running worker to send sms in queue`);
    worker_sms.run().finally();
}
//# sourceMappingURL=worker_sms.js.map