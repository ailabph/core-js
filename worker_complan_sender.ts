import { argv } from "process";
import {config} from "./config";
import {tools} from "./tools";
import {points_log} from "./build/points_log";
import {connection} from "./connection";
import {user_tools} from "./user_tools";
import {assert} from "./assert";
import {eth_send_token} from "./build/eth_send_token";
import {SMS_STATUS, worker_sms} from "./worker_sms";
import {sms_queue} from "./build/sms_queue";
import {email_queue} from "./build/email_queue";
import {web3_tools} from "./web3_tools";
import {account_tools} from "./account_tools";
import {STATUS_EMAIL} from "./worker_email";

//region TYPES
//endregion TYPES

export class worker_complan_sender{
    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`${this.name}|${method}|${msg}`);
            if(end) console.log(`${this.name}|${method}|${tools.LINE}`);
        }
    }
    private static addLog(msg:string,method:string,logs:string[]):string[]{
        logs.push(msg);
        this.log(msg,method,false,true);
        return logs;
    }
    //region CONFIG
    public static retryWaitSeconds:number = 3;
    public static getBatch():number{
        return 5;
    }
    //endregion CONFIG
    public static errorCount:number = 0;
    public static async run():Promise<void>{
        const method = "run";
        /**
         * get points_log not yet processed for sending
         * check if wallet has user owner
         * check if owner is PH, add sms queue
         * else add email queue
         */
        await connection.startTransaction();
        try{
            const points = await this.getUnprocessedPoints();
            if(points.count() > 0) this.log(`unprocessed points found ${points.count()}`,method,false,true);
            for(const point of points._dataList as points_log[]){
                let logs:string[] = [];
                this.log(`id ${point.id} processing bonus ${point.action} amount ${point.eth_token_bonus} level ${point.gen_level} perc ${point.eth_perc} from buy amount ${point.eth_token_amount_source}`,method,false,true);

                point.code_source = assert.stringNotEmpty(point.code_source,`${method} point.code_source`);
                point.eth_token_amount_source = assert.stringNotEmpty(point.eth_token_amount_source,`${method} point.eth_token_amount_source`);
                point.gen_level = assert.positiveInt(point.gen_level,`${method} gen_level`);

                const sourceUser = await user_tools.getUserByWallet(point.code_source);
                const buyerUsername = sourceUser ? sourceUser.username : "unregistered";
                logs = this.addLog(`buyer ${buyerUsername}`,method,logs);
                logs = this.addLog(`source hash ${point.eth_source_hash}`,method,logs);

                let notifyType:string = "";
                let contact:string = "";
                let email:string = "";
                let firstName:string = "";
                const receiverUser = await user_tools.getUserByWallet(point.account_code);
                if(receiverUser){
                    logs = this.addLog(`receiver of bonus ${receiverUser.username} usergroup ${receiverUser.usergroup} country_id ${receiverUser.country_id}`,method,logs);
                    receiverUser.country_code = assert.stringNotEmpty(receiverUser.country_code,`${method} receiverUser.country_code`);
                    firstName = assert.stringNotEmpty(receiverUser.firstname,`${method} receiverUser.firstname`);
                    if(receiverUser.country_code === "ph"){
                        logs = this.addLog(`user is from PH, set notification sms`,method,logs);
                        notifyType = "sms";
                        contact = assert.isNumericString(receiverUser.contact,`${method} receiverUser.contact`);
                    }
                    else{
                        logs = this.addLog(`user is not from PH, set notification email`,method,logs);
                        notifyType = "email";
                        email = assert.validEmail(receiverUser.email,`${method} receiverUser.email`);
                    }

                    logs = this.addLog(`preparing send token request`,method,logs);

                    const sendTokenRequest = new eth_send_token();
                    sendTokenRequest.toAddress = assert.stringNotEmpty(point.account_code,`${method} point.account_code`);
                    sendTokenRequest.amount = assert.isNumericString(point.eth_token_bonus,`${method} point.eth_token_bonus`);
                    sendTokenRequest.time_added = tools.getCurrentTimeStamp();
                    sendTokenRequest.tag = point.action;
                    sendTokenRequest.status = "o";

                    // final checks before sending
                    if(point.action !== "eth_community_bonus") throw new Error(`point is not a community bonus`);
                    const receiverAccount = await account_tools.getAccount(sendTokenRequest.toAddress);
                    if(!receiverAccount) throw new Error(`unable to retrieve account of receiver with address ${sendTokenRequest.toAddress}`);
                    const sponsorStructure =  await account_tools.verifySponsorLineOfDownline(receiverAccount);
                    if(typeof sponsorStructure === "string") throw new Error(`${sponsorStructure}`);
                    if(sendTokenRequest.toAddress === point.code_source) throw new Error(`unexpected sending token to the buyer`);
                    const maxBonus = tools.multiply(point.eth_token_amount_source,0.05);
                    if(tools.greaterThan(sendTokenRequest.amount,maxBonus)) throw new Error(`unexpected bonus amount ${sendTokenRequest.amount} > 5% allowed which is ${maxBonus}`);
                    const toAddressIsWallet = await web3_tools.isWalletAddress(sendTokenRequest.toAddress);
                    if(!toAddressIsWallet) throw new Error(`toAddress ${sendTokenRequest.toAddress} is not detected as a wallet`);
                    await sendTokenRequest.save();
                    point.send_token_request_id = sendTokenRequest.id;
                    logs = this.addLog(`send token request id: ${sendTokenRequest.id}`,method,logs);

                    // notify
                    const formattedAmount = tools.toBn(sendTokenRequest.amount).toFixed(4);
                    let messageToUser = `Congratulations ${firstName.toUpperCase()}! You just earned`;
                    messageToUser += ` ${formattedAmount} SRT Community Bonus!`;
                    messageToUser += ` A ${tools.toOrdinal(point.gen_level)} generation member from your community just purchased SRT`;
                    if(notifyType === "sms"){
                        const sms = new sms_queue();
                        sms.message = messageToUser;
                        sms.number = assert.isNumericString(contact,`${method} contact`,0);
                        sms.timeadded = tools.getCurrentTimeStamp();
                        sms.status = SMS_STATUS.PENDING;
                        await sms.save();
                        point.sms_queue_id = sms.id;
                        logs = this.addLog(`added sms message to queue (${messageToUser}) to contact ${contact}, sms queue id ${sms.id}`,method,logs);
                    }else{
                        const emailRequest = new email_queue();
                        emailRequest.email = assert.validEmail(email,`${method} email`);
                        emailRequest.subject = `Community Bonus`;
                        emailRequest.message = messageToUser;
                        emailRequest.status = STATUS_EMAIL.PENDING;
                        await emailRequest.save();
                        point.email_queue_id = emailRequest.id;
                        logs = this.addLog(`added email message to queue (${messageToUser}) to email ${email}, email queue id ${emailRequest.id}`,method,logs);
                    }
                }
                else{
                    logs = this.addLog(`unknown receiver, skipping`,method,logs);
                }

                point.time_process_notification = tools.getCurrentTimeStamp();
                point.logs_check = JSON.stringify(logs);
                await point.save();
                this.log(``,method,true,true);
            }
            await connection.commit();
            await tools.sleep(100);
            setImmediate(()=>{
                worker_complan_sender.run().finally();
            });
        }catch (e) {
            await connection.rollback();
            this.errorCount++;
            const error_message = e instanceof Error ? e.message : "unknown error";
            this.log(`ERROR ${error_message}`,method,false,true);
            this.log(`retrying after ${this.retryWaitSeconds} seconds...`,method,false,true);
            await tools.sleep(this.retryWaitSeconds * 1000);
            return this.run();
        }
    }

    public static async getUnprocessedPoints():Promise<points_log>{
        const method = "getUnprocessedPoints";
        const points = new points_log();
        await points.list(
            " WHERE action=:eth_community_bonus AND time_process_notification IS NULL ",
            {eth_community_bonus:"eth_community_bonus"},
            ` ORDER BY time_added ASC, gen_level ASC LIMIT ${this.getBatch()} `);
        return points;
    }
}

if(argv.includes("run_worker_complan_sender")){
    console.log(`running worker to process points to token send request...`);
    worker_complan_sender.run().finally();
}