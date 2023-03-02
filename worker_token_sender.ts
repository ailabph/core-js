import { argv } from "process";
import {config} from "./config";
import {tools} from "./tools";
import {connection} from "./connection";
import {eth_send_token} from "./build/eth_send_token";
import {points_log} from "./build/points_log";
import {web3_token} from "./web3_token";
import {eth_config} from "./eth_config";
import {assert} from "./assert";
import {user_tools} from "./user_tools";
import {sms_queue} from "./build/sms_queue";
import {email_queue} from "./build/email_queue";

export class worker_token_sender{
    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`${this.name}|${method}|${msg}`);
            if(end) console.log(`${this.name}|${method}|${tools.LINE}`);
        }
    }
    public static getBatch():number{
        return 1;
    }
    public static async run(){
        const method = "run";
        try{
            const pendingCommunityBonus = await this.getPendingCommunityBonus();
            if(pendingCommunityBonus.count()>0){
                const pendingToSend = await pendingCommunityBonus.getItem();
                pendingToSend.status = "p";
                await pendingToSend.save();

                pendingToSend.toAddress = assert.stringNotEmpty(pendingToSend.toAddress,`${method} pendingToSend.toAddress`)
                pendingToSend.amount = assert.isNumericString(pendingToSend.amount,`${method} pendingToSend.amount`)

                const point = new points_log();
                point.send_token_request_id = pendingToSend.id
                await point.fetch();
                if(point.isNew()) throw new Error(`unable to retrieve point of send_token_request ${pendingToSend.id}`);

                const receiverUser = await user_tools.getUserByWallet(pendingToSend.toAddress);
                if(!receiverUser) throw new Error(`unable to retrieve user from send_token_request ${pendingToSend.id}`);

                this.log(`sending ${pendingToSend.amount} to ${pendingToSend.toAddress} owned by ${receiverUser.username}`,method,false,true);

                const receipt = await web3_token.transfer(
                    eth_config.getHotWalletAddress(),
                    eth_config.getHotWalletKey(),
                    pendingToSend.toAddress,
                    pendingToSend.amount);
                if(receipt){
                    pendingToSend.status = "d";
                    pendingToSend.hash = receipt.transactionHash;
                    pendingToSend.time_sent = tools.getCurrentTimeStamp();
                    await pendingToSend.save();

                    this.log(`send successful, notifying user`,method,false,true);
                    if(typeof point.sms_queue_id === "number" && point.sms_queue_id > 0){
                        this.log(`set sms_queue id ${point.sms_queue_id} for sending`,method,false,true);
                        const sms = new sms_queue();
                        sms.id = point.sms_queue_id;
                        await sms.fetch();
                        if(sms.recordExists()){
                            sms.status = "o";
                            await sms.save();
                        }
                    }
                    else if(typeof point.email_queue_id === "number" && point.email_queue_id > 0){
                        this.log(`set email_queue id ${point.email_queue_id} for sending`,method,false,true);
                        const emailRequest = new email_queue();
                        emailRequest.id = point.email_queue_id;
                        await emailRequest.fetch();
                        if(emailRequest.recordExists()){
                            emailRequest.status = "o";
                            await emailRequest.save();
                        }
                    }
                }

                this.log(``,method,true,true);
            }
            await tools.sleep(500);
            setImmediate(()=>{
                worker_token_sender.run().finally();
            });
        }catch (e){
            const errorMsg = e instanceof Error ? e.message : "unknown error";
            this.log(`ERROR ${errorMsg}`,method,false,true);
            this.log(`retrying in 3 seconds`,method,false,true);
            await tools.sleep(3000);
            setImmediate(()=>{
                worker_token_sender.run().finally();
            });
        }
    }
    public static async getPendingCommunityBonus():Promise<eth_send_token>{
        const pendingSend = new eth_send_token();
        await pendingSend.list(
            " WHERE tag=:eth_community_bonus AND status=:open ",
            {eth_community_bonus:"eth_community_bonus",open:"o"},
            ` ORDER BY id ASC LIMIT ${this.getBatch()} `);
        return pendingSend;
    }
}


if(argv.includes("run_worker_token_sender")){
    console.log(`running worker to process token sending on chain...`);
    worker_token_sender.run().finally();
}