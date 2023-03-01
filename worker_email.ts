import {config} from "./config";
import {LIMITER_INFO, RATE_LIMIT_INTERVAL, tools} from "./tools";
import {assert} from "./assert";
import {argv} from "process";
import {email_queue} from "./build/email_queue";
import nodemailer from "nodemailer";
import {worker_complan} from "./worker_complan";
import {worker_sms} from "./worker_sms";

//region TYPES
enum STATUS_EMAIL{
    OPEN="o",
    SUCCESS="s",
    FAIL="f",
    PENDING="p",
}
export { STATUS_EMAIL }
//endregion TYPES

export class worker_email{
    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`worker_email|${method}|${msg}`);
            if(end) console.log(`worker_email|${method}|${tools.LINE}`);
        }
    }

    //region CONFIG
    private static getBatch():number{
        let batch = 20;
        const overrideBatch = config.getCustomOption("worker_email_batch");
        if(tools.isNotEmpty(overrideBatch)){
            batch = assert.positiveInt(overrideBatch,`getBatch overrideBatch`);
        }
        return batch;
    }
    //endregion CONFIG

    // region GETTERS
    private static async getUnsentEmails():Promise<email_queue>{
        const method = "getUnsentMessages";
        const otp_first = await this.getUnsentOtpEmail();
        if(otp_first.count() > 0) return otp_first;

        const normalMessages = new email_queue();
        await normalMessages.list(
            " WHERE status=:open ",
            {open:STATUS_EMAIL.OPEN},
            ` ORDER BY id ASC LIMIT ${this.getBatch()} `);
        return normalMessages;
    }
    private static async getUnsentOtpEmail():Promise<email_queue>{
        const method = "getUnsentOtpEmail";
        const unsentOtp = new email_queue();
        await unsentOtp.list(
            " WHERE status=:open AND (message LIKE :otp OR message LIKE :password) ",
            {open:STATUS_EMAIL.OPEN,otp:"% OTP %",password:"% password %"});
        return unsentOtp;
    }
    //endregion GETTERS

    //region INIT
    private static emailToProcess:number = 0;
    private static limiterInfo:LIMITER_INFO;
    private static init(){
        if(typeof this.limiterInfo === "undefined"){
            this.limiterInfo = tools.createLimiter(1200,RATE_LIMIT_INTERVAL.HOUR,5,150);
        }
    }
    //endregion

    public static async run(){
        const method = "run";
        this.init();
        try{
            const unsentMessages = await this.getUnsentEmails();
            this.log(`${unsentMessages.count()} unsent email found`,method);
            this.emailToProcess = unsentMessages.count();
            if(this.emailToProcess > 0){
                for(const message of unsentMessages._dataList as email_queue[]){
                    await tools.useCallLimiter(this.limiterInfo);
                    this.log(`${this.emailToProcess} email remaining to send`,method);
                    this.sendEmailByQueue(message).then(()=>{
                        this.log(`email job done, ${--this.emailToProcess} email remaining`,method);
                        this.restartWorker();
                    });
                }
            }
            else{
                this.restartWorker().finally();
            }
        }catch (e) {
            this.log(`ERROR something went wrong`,method,false,true);
            console.log(e);
            this.log(`...retrying after 30 seconds`,method,false,true);
            await tools.sleep(1000 * 30);
            this.emailToProcess = 0;
            setImmediate(()=>{
                worker_email.run().finally();
            });
        }
    }
    private static async restartWorker(){
        const method = "restartWorker";
        if(tools.lesserThan(worker_email.emailToProcess,0)){
            throw new Error(`${method} unexpected worker_email.emailToProcess ${worker_email.emailToProcess} < 0`);
        }
        if(worker_email.emailToProcess === 0){
            this.log(`restarting worker...`,method);
            await tools.sleep(1000);
            setImmediate(()=>{
                worker_email.run().finally();
            });
        }
        else{
            this.log(`not time to restart worker, ${this.emailToProcess} sms remaining to be sent`,method);
        }
    }

    public static async sendEmailByQueue(email:email_queue):Promise<email_queue>{
        const method = "sendEmailByQueue";
        this.log(`sending email from email queue, setting queue status to pending`,method);
        email.status = STATUS_EMAIL.PENDING;
        await email.save();
        const response = await this.sendEmail(email.email,email.subject,email.message);
        if(typeof response === "string"){
            this.log(`...send failed, reason: ${response}, updating status to FAIL`,method);
            email.status = STATUS_EMAIL.FAIL;
            email.remarks = response;
        }
        else{
            this.log(`...send successful, updating status`,method);
            email.status = STATUS_EMAIL.SUCCESS;
            email.time_sent = tools.getCurrentTimeStamp();
        }
        await email.save();
        return email;
    }

    public static async sendEmail(email:string|null,subject:string|null,content:string|null):Promise<boolean|string>{
        const method = "sendEmail";
        this.log(`sending email to ${email} subject ${subject} message ${content}`,method,false,true);
        email = assert.stringNotEmpty(email,`${method} email`);
        subject = assert.stringNotEmpty(subject,`${method} subject`);
        content = assert.stringNotEmpty(content,`${method} content`);

        let host = config.getCustomOption("smtp_host",true);
        host = assert.stringNotEmpty(host,`host`);
        let port = config.getCustomOption("smtp_port", true);
        port = assert.positiveInt(port,"port");
        let smtp_security = config.getCustomOption("smtp_security",true);
        let smtp_username = config.getCustomOption("smtp_username",true);
        smtp_username = assert.stringNotEmpty(smtp_username,"smtp_username");
        let smtp_password = config.getCustomOption("smtp_password",true);
        smtp_password = assert.stringNotEmpty(smtp_password,"smtp_password");
        const transporter = nodemailer.createTransport({
            host: host,
            port: port,
            secure: false, // use TLS
            auth: {
                user: smtp_username,
                pass: smtp_password
            }
        });

        const message = {
            from: {
                name:`SRT REVOLUTION`,
                address:'no-reply@srtrevolution.com'
            },
            to: email,
            subject: subject,
            html: content
        };

        try {
            const info = await transporter.sendMail(message);
            this.log(`...email sent: ${info.messageId}`,method,false,true);
            return true;
        } catch (error) {
            console.log(`Error sending email: ${error}`);
            let reason = error instanceof Error ? error.message : "unknown";
            this.log(`...error sending email: ${reason}`,method,false,true);
            return reason;
        }
    }

}


if(argv.includes("run_worker_email")){
    console.log(`running worker to send email in queue`);
    worker_email.run().finally();
}