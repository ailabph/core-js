"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_email = exports.STATUS_EMAIL = void 0;
const config_1 = require("./config");
const tools_1 = require("./tools");
const assert_1 = require("./assert");
const process_1 = require("process");
const email_queue_1 = require("./build/email_queue");
const nodemailer_1 = __importDefault(require("nodemailer"));
//region TYPES
var STATUS_EMAIL;
(function (STATUS_EMAIL) {
    STATUS_EMAIL["OPEN"] = "o";
    STATUS_EMAIL["SUCCESS"] = "s";
    STATUS_EMAIL["FAIL"] = "f";
    STATUS_EMAIL["PENDING"] = "p";
})(STATUS_EMAIL || (STATUS_EMAIL = {}));
exports.STATUS_EMAIL = STATUS_EMAIL;
//endregion TYPES
class worker_email {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`worker_email|${method}|${msg}`);
            if (end)
                console.log(`worker_email|${method}|${tools_1.tools.LINE}`);
        }
    }
    //region CONFIG
    static getBatch() {
        let batch = 20;
        const overrideBatch = config_1.config.getCustomOption("worker_email_batch");
        if (tools_1.tools.isNotEmpty(overrideBatch)) {
            batch = assert_1.assert.positiveInt(overrideBatch, `getBatch overrideBatch`);
        }
        return batch;
    }
    //endregion CONFIG
    // region GETTERS
    static async getUnsentEmails() {
        const method = "getUnsentMessages";
        const otp_first = await this.getUnsentOtpEmail();
        if (otp_first.count() > 0)
            return otp_first;
        const normalMessages = new email_queue_1.email_queue();
        await normalMessages.list(" WHERE status=:open ", { open: STATUS_EMAIL.OPEN }, ` ORDER BY id ASC LIMIT ${this.getBatch()} `);
        return normalMessages;
    }
    static async getUnsentOtpEmail() {
        const method = "getUnsentOtpEmail";
        const unsentOtp = new email_queue_1.email_queue();
        await unsentOtp.list(" WHERE status=:open AND (message LIKE :otp OR message LIKE :password) ", { open: STATUS_EMAIL.OPEN, otp: "% OTP %", password: "% password %" });
        return unsentOtp;
    }
    static init() {
        if (typeof this.limiterInfo === "undefined") {
            this.limiterInfo = tools_1.tools.createLimiter(1200, tools_1.RATE_LIMIT_INTERVAL.HOUR, 5, 150);
        }
    }
    //endregion
    static async run() {
        const method = "run";
        this.init();
        try {
            const unsentMessages = await this.getUnsentEmails();
            this.log(`${unsentMessages.count()} unsent email found`, method);
            this.emailToProcess = unsentMessages.count();
            if (this.emailToProcess > 0) {
                for (const message of unsentMessages._dataList) {
                    await tools_1.tools.useCallLimiter(this.limiterInfo);
                    this.log(`${this.emailToProcess} email remaining to send`, method);
                    this.sendEmailByQueue(message).then(() => {
                        this.log(`email job done, ${--this.emailToProcess} email remaining`, method);
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
            this.log(`...retrying after 30 seconds`, method, false, true);
            await tools_1.tools.sleep(1000 * 30);
            this.emailToProcess = 0;
            setImmediate(() => {
                worker_email.run().finally();
            });
        }
    }
    static async restartWorker() {
        const method = "restartWorker";
        if (tools_1.tools.lesserThan(worker_email.emailToProcess, 0)) {
            throw new Error(`${method} unexpected worker_email.emailToProcess ${worker_email.emailToProcess} < 0`);
        }
        if (worker_email.emailToProcess === 0) {
            this.log(`restarting worker...`, method);
            await tools_1.tools.sleep(1000);
            setImmediate(() => {
                worker_email.run().finally();
            });
        }
        else {
            this.log(`not time to restart worker, ${this.emailToProcess} sms remaining to be sent`, method);
        }
    }
    static async sendEmailByQueue(email) {
        const method = "sendEmailByQueue";
        this.log(`sending email from email queue, setting queue status to pending`, method);
        email.status = STATUS_EMAIL.PENDING;
        await email.save();
        const response = await this.sendEmail(email.email, email.subject, email.message);
        if (typeof response === "string") {
            this.log(`...send failed, reason: ${response}, updating status to FAIL`, method);
            email.status = STATUS_EMAIL.FAIL;
            email.remarks = response;
        }
        else {
            this.log(`...send successful, updating status`, method);
            email.status = STATUS_EMAIL.SUCCESS;
            email.time_sent = tools_1.tools.getCurrentTimeStamp();
        }
        await email.save();
        return email;
    }
    static async sendEmail(email, subject, content) {
        const method = "sendEmail";
        this.log(`sending email to ${email} subject ${subject} message ${content}`, method, false, true);
        email = assert_1.assert.stringNotEmpty(email, `${method} email`);
        subject = assert_1.assert.stringNotEmpty(subject, `${method} subject`);
        content = assert_1.assert.stringNotEmpty(content, `${method} content`);
        let host = config_1.config.getCustomOption("smtp_host", true);
        host = assert_1.assert.stringNotEmpty(host, `host`);
        let port = config_1.config.getCustomOption("smtp_port", true);
        port = assert_1.assert.positiveInt(port, "port");
        let smtp_security = config_1.config.getCustomOption("smtp_security", true);
        let smtp_username = config_1.config.getCustomOption("smtp_username", true);
        smtp_username = assert_1.assert.stringNotEmpty(smtp_username, "smtp_username");
        let smtp_password = config_1.config.getCustomOption("smtp_password", true);
        smtp_password = assert_1.assert.stringNotEmpty(smtp_password, "smtp_password");
        const transporter = nodemailer_1.default.createTransport({
            host: host,
            port: port,
            secure: false,
            auth: {
                user: smtp_username,
                pass: smtp_password
            }
        });
        const message = {
            from: {
                name: `SRT REVOLUTION`,
                address: 'no-reply@srtrevolution.com'
            },
            to: email,
            subject: subject,
            html: content
        };
        try {
            const info = await transporter.sendMail(message);
            this.log(`...email sent: ${info.messageId}`, method, false, true);
            return true;
        }
        catch (error) {
            console.log(`Error sending email: ${error}`);
            let reason = error instanceof Error ? error.message : "unknown";
            this.log(`...error sending email: ${reason}`, method, false, true);
            return reason;
        }
    }
}
exports.worker_email = worker_email;
//endregion GETTERS
//region INIT
worker_email.emailToProcess = 0;
if (process_1.argv.includes("run_worker_email")) {
    console.log(`running worker to send email in queue`);
    worker_email.run().finally();
}
//# sourceMappingURL=worker_email.js.map