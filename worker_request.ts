

import {argv} from "process";
import {request_queue} from "./build/request_queue";
import {connection} from "./connection";
import {eth_worker} from "./eth_worker";
import {tools} from "./tools";
import {time_helper} from "./time_helper";
import {web3_token} from "./web3_token";
import {eth_config} from "./eth_config";
import {web3_tools} from "./web3_tools";

export class worker_request{

    private static batchLimit:number = 10;

    public static async run(){
        let requests = new request_queue();
        await requests.list(" WHERE status=:open ",{open:"o"},` ORDER BY id ASC LIMIT ${this.batchLimit} `);
        if(requests.count()>0) console.log(`total request found:${requests.count()}`);
        for(const request of requests._dataList as request_queue[]){
            try{
                if (typeof request.data_for !== "string") throw new Error("data_for is empty");
                console.log(`processing request ${request.hash} type ${request.type} for ${request.data_for} `);
                if (request.type === "wallet_token_balance") {
                    request.data_result = await eth_worker.getTokenBalance(request.data_for);
                }
                if (request.type === "wallet_eth_balance") {
                    request.data_result = await eth_worker.getETHBalance(request.data_for);
                }
                if (request.type === "wallet_busd_balance") {
                    request.data_result = await web3_token.getBalanceOf(eth_config.getBusdContract(),request.data_for);
                }
                if (request.type === "is_wallet_address") {
                    const isWalletAddress = await web3_tools.isWalletAddress(request.data_for);
                    request.data_result = isWalletAddress ? "y" : "n";
                }
                console.log(`--result:${request.data_result}`);
                request.status = "d";
                request.time_processed = time_helper.getCurrentTimeStamp();
                await request.save();
                await tools.sleep(150);
            }catch (e){
                if(e instanceof Error){
                    console.log(`ERROR request(${request.id}) ${e.message}`);
                }
                request.status = "e";
                request.time_processed = time_helper.getCurrentTimeStamp();
                await request.save();
            }
        }
        setImmediate(()=>{
            worker_request.run().finally();
        });
    }

}

if(argv.includes("run_worker_request")){
    console.log(`running worker to process web3 requests on the side`);
    worker_request.run().finally();
}