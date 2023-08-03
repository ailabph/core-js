import {trade_account_details} from "./build/trade_account_details";
import {trade_account_header} from "./build/trade_account_header";
import {assert} from "./assert";
import {user} from "./build/user";
import {connection} from "./connection";
import {eth_send_token} from "./build/eth_send_token";
import {time_helper} from "./time_helper";
import {argv} from "process";
import {config} from "./config";
import {worker_trade_bot} from "./worker_trade_bot";

export class worker_token_distribution{
    public static async run(){
        await connection.startTransaction();
        try{
            const pendingDistribution = new trade_account_details();
            await pendingDistribution.list(" WHERE type=:distribute AND send_token_id IS NULL ",{distribute:"distribute"});
            console.log(`${pendingDistribution.count()} pending for distribution...`);
            for(const detail of pendingDistribution._dataList as trade_account_details[]){
                const header = new trade_account_header();
                header.id = detail.header_id;
                await header.fetch();
                assert.recordExist(header,`header ${detail.header_id} not exist`);
                const owner = new user();
                owner.id = header.user_id;
                await owner.fetch();
                assert.recordExist(owner,`owner ${header.user_id} not exist`);
                console.log(`distribute ${detail.amount} to ${owner.username}...`);

                const sendTokenRequest = new eth_send_token();
                sendTokenRequest.toAddress = header.wallet_address;
                sendTokenRequest.amount = detail.net_token_distribution;
                sendTokenRequest.time_added = time_helper.getCurrentTimeStamp();
                sendTokenRequest.tag = "distribute";
                sendTokenRequest.status = "o";
                sendTokenRequest.email_queue_id = 0;
                sendTokenRequest.sms_queue_id = 0;
                sendTokenRequest.status = "o";
                await sendTokenRequest.save();
                detail.send_token_id = sendTokenRequest.id;
                await detail.save();
                console.log(`...added send token request ${sendTokenRequest.id}`);
            }
            await connection.commit();
        }catch (e){
            await connection.rollback();
            if(e instanceof Error){
                console.error(e.message);
            }else throw e;
        }
    }
}

if(argv.includes("run_worker_token_distribution")){
    console.log(`running worker_token_distribution`);
    worker_token_distribution.run().finally();
}