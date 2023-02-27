import {LIMITER_INFO, RATE_LIMIT_INTERVAL, tools} from "./tools";
import {config} from "./config";
import {assert} from "./assert";
import {sms_api} from "./build/sms_api";
import {sms_queue} from "./build/sms_queue";
import {connection} from "./connection";
import axios from "axios";
import * as t from "io-ts";
import * as d from "fp-ts/Either";
import { argv } from "process";

//region TYPES
enum SMS_STATUS {
    OPEN = "o",
    PENDING = "p",
    DONE = "d",
    ERROR = "e",
}
export { SMS_STATUS }

const SemaphoreResponseDataCodec = t.type({
    message_id:t.number,
    user_id:t.number,
    user:t.string,
    account_id:t.number,
    account:t.string,
    recipient:t.string,
    message:t.string,
    sender_name:t.string,
    network:t.string,
    status:t.string,
    type:t.string,
    source:t.string,
    created_at:t.string,
    updated_at:t.string,
});
type SemaphoreResponseData = t.TypeOf<typeof SemaphoreResponseDataCodec>;
export { SemaphoreResponseData }

const SemaphoreSuccessfulResponseCodec = t.type({
    status:t.number,
    statusText:t.string,
    data:t.array(SemaphoreResponseDataCodec),
});
type SemaphoreSuccessfulResponse = t.TypeOf<typeof SemaphoreSuccessfulResponseCodec>;
export { SemaphoreSuccessfulResponse }

const SemaphoreFailedResponseCodec = t.type({
    status:t.number,
    statusText:t.string,
    data:t.unknown,
});
type SemaphoreFailedResponse = t.TypeOf<typeof SemaphoreFailedResponseCodec>;
export { SemaphoreFailedResponse }
//endregion

export class worker_sms{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`worker_sms|${method}|${msg}`);
            if(end) console.log(`worker_sms|${method}|${tools.LINE}`);
        }
    }
    
    //region CONFIG
    private static getSmsLimit():number{
        const method = "getSmsLimit";
        let limit = 29;
        const limit_override = config.getCustomOption("sms_limit");
        if(tools.isNumeric(limit_override)){
            limit = assert.positiveInt(limit_override,`${method} limit_override`);
        }
        return limit;
    }
    private static getApiUrl(priority_version:boolean=false):string{
        const method = "getApiUrl";
        let url = `http://api.semaphore.co/api/v4/messages`;
        if(priority_version){
            url = `http://api.semaphore.co/api/v4/priority`;
            let prioritySmsApiUrl = config.getCustomOption(`sms_api_url_priority`);
            if(tools.isNotEmpty(prioritySmsApiUrl)){
                url = assert.stringNotEmpty(prioritySmsApiUrl,`${method} prioritySmsApiUrl`);
            }
        }
        else{
            let smsApiUrlOverride = config.getCustomOption(`sms_api_url`);
            if(tools.isNotEmpty(smsApiUrlOverride)){
                url = assert.stringNotEmpty(smsApiUrlOverride,`${method} smsApiUrlOverride`);
            }
        }
        return url;
    }
    private static getApiKey():string{
        const method = "getApiKey";
        let sms_api:string|number = config.getCustomOption(`sms_api`,true);
        sms_api = assert.stringNotEmpty(sms_api,`${method} sms_api`);
        return sms_api;
    }
    private static getSenderName():string{
        const method = "getSenderName";
        let sender_name = config.getCustomOption(`sender_name`,true);
        return assert.stringNotEmpty(sender_name,`${method} sender_name`);
    }
    private static getBatch():number{
        let batch = 100;
        const overrideBatch = config.getCustomOption("worker_sms_batch");
        if(tools.isNotEmpty(overrideBatch)){
            batch = assert.positiveInt(overrideBatch,`getBatch overrideBatch`);
        }
        return batch;
    }
    //endregion CONFIG

    // region GETTERS
    private static async countMessagesSentByMinutes(minutes:number = 1){
        const method = "countMessagesSentByMinutes";
        assert.positiveInt(minutes,`${method} minutes`);
        const lastMinutes = tools.getCurrentTimeStamp() - (minutes * 60);
        const messages = new sms_api();
        await messages.list(" WHERE time_added>=:time ",{time:lastMinutes});
        return messages.count();
    }
    private static async getUnsentMessages():Promise<sms_queue>{
        const method = "getUnsentMessages";
        const otp_first = await this.getUnsentOtpMessages();
        if(otp_first.count() > 0) return otp_first;

        const normalMessages = new sms_queue();
        await normalMessages.list(
            " WHERE status=:open ",
            {open:SMS_STATUS.OPEN},
            ` ORDER BY id ASC LIMIT ${this.getBatch()} `);
        return normalMessages;
    }
    private static async getUnsentOtpMessages():Promise<sms_queue>{
        const method = "getUnsentOtpMessages";
        const unsentOtp = new sms_queue();
        await unsentOtp.list(
            " WHERE status=:open AND message LIKE :otp ",
            {open:SMS_STATUS.OPEN,otp:"% OTP %"});
        return unsentOtp;
    }
    //endregion GETTERS

    //region CODECS
    private static decodeSemaphoreSuccessfulResponse(data:unknown):SemaphoreSuccessfulResponse|false{
        if(typeof data !== "object") return false;
        const decodedData = SemaphoreSuccessfulResponseCodec.decode(data);
        if(d.isRight(decodedData)){
            return decodedData.right as SemaphoreSuccessfulResponse;
        }
        return false;
    }
    private static decodeSemaphoreFailedResponse(data:unknown):SemaphoreFailedResponse|false{
        if(typeof data !== "object") return false;
        const decodedData = SemaphoreFailedResponseCodec.decode(data);
        if(d.isRight(decodedData)){
            return decodedData.right as SemaphoreFailedResponse;
        }
        return false;
    }
    //endregion CODES

    //region INIT
    private static smsToProcess:number = 0;
    private static limiterinfo:LIMITER_INFO;
    private static init(){
        if(typeof this.limiterinfo === "undefined"){
            this.limiterinfo = tools.createLimiter(2,RATE_LIMIT_INTERVAL.SECOND);
        }
    }
    //endregion

    public static async run(){
        const method = "run";
        this.init();
        try{
            const unsentMessages = await this.getUnsentMessages();
            this.log(`${unsentMessages.count()} unsent messages found`,method);
            this.smsToProcess = unsentMessages.count();
            if(this.smsToProcess > 0){
                for(const message of unsentMessages._dataList as sms_queue[]){
                    await tools.useCallLimiter(this.limiterinfo);
                    this.log(`${this.smsToProcess} sms remaining to send`,method);
                    this.sendSmsByQueue(message).then(()=>{
                        this.log(`sms job done, ${--this.smsToProcess} sms remaining`,method);
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
            this.log(`...retrying after 2 minutes`,method,false,true);
            await tools.sleep(1000 * 60 * 2);
            this.smsToProcess = 0;
            setImmediate(()=>{
                worker_sms.run();
            });
        }
    }
    private static async restartWorker(){
        const method = "restartWorker";
        if(tools.lesserThan(worker_sms.smsToProcess,0)){
            throw new Error(`${method} unexpected worker_sms.smsToProcess ${worker_sms.smsToProcess} < 0`);
        }
        if(worker_sms.smsToProcess === 0){
            this.log(`restarting worker...`,method);
            await tools.sleep(1000);
            setImmediate(()=>{
                this.run();
            });
        }
        else{
            this.log(`not time to restart worker, ${this.smsToProcess} sms remaining to be sent`,method);
        }
    }

    public static async sendSmsByQueue(sms:sms_queue){
        const method = "sendSMSByQueue";
        this.log(`sending sms from sms queue, setting queue status to pending`,method);
        sms.status = SMS_STATUS.PENDING;
        await sms.save();
        const response = await this.sendSms(sms.number, sms.message, tools.greaterThan(sms.is_priority,0));
        if(typeof response === "string"){
            this.log(`...send failed, updating status`,method);
            sms.status = SMS_STATUS.ERROR;
            sms.remarks = response;
        }
        else{
            this.log(`...send successful, updating status`,method);
            sms.status = SMS_STATUS.DONE;
            const api = new sms_api();
            if(response.data.length > 0){
                this.log(`...updating api info`,method);
                api.message_id = response.data[0].message_id;
                api.user = response.data[0].user;
                api.account_id = response.data[0].account_id;
                api.account = response.data[0].account;
                api.recipient = response.data[0].recipient;
                api.message = response.data[0].message;
                api.sender_name = response.data[0].sender_name;
                api.network = response.data[0].network;
                api.status = response.data[0].status;
                api.time_added = tools.getCurrentTimeStamp();
                await api.save();
            }
            else{
                this.log(`...no api info`,method);
            }
        }
        await sms.save();
    }

    public static async sendSms(contact:string|null,message:string|null,priority:boolean=false):Promise<SemaphoreSuccessfulResponse|string>{
        const method = "sendSms";
        this.log(`sending sms to ${contact} message ${message} priority ${priority?"yes":"no"}`,method,false,true);
        const data = {
            apikey:this.getApiKey(),
            number:assert.isNumericString(contact,`${method} contact`),
            message:assert.stringNotEmpty(message,`${method} message`),
            sendername:this.getSenderName()
        };
        const response = await axios.post(this.getApiUrl(priority),data);
        const decodedResponse = this.decodeSemaphoreSuccessfulResponse(response);
        if(decodedResponse){
            const responseData = decodedResponse.data[0];
            this.log(`...send successful. message_id ${responseData.message_id} sender_name ${responseData.sender_name} ${responseData.network}`,method,false,true);
            return decodedResponse;
        }
        this.log(`...send not successful`,method);
        const failed = this.decodeSemaphoreFailedResponse(response);
        let failedReason = "failed send, unexpected server response";
        if(failed){
            this.log(`...failed to send`,method,false,true);
            if(typeof failed.data === "object" && failed.data !== null){
                failedReason = "failed to send, "+failed.data.toString();
            }
        }
        this.log(failedReason,method,false,true);
        return failedReason;
    }

}


if(argv.includes("run_worker_sms")){
    console.log(`running worker to send sms in queue`);
    worker_sms.run().finally();
}