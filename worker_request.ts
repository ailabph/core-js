

import {argv} from "process";
import {request_queue} from "./build/request_queue";
import {connection} from "./connection";
import {eth_worker} from "./eth_worker";
import {tools} from "./tools";
import {time_helper} from "./time_helper";

export class worker_request{

    private static batchLimit:number = 10;

    public static async run(){

        await connection.startTransaction();

        try{
            let requests = new request_queue();
            await requests.list(" WHERE status!=:done ",{done:"d"},` ORDER BY id ASC LIMIT ${this.batchLimit} `);
            if(requests.count()>0) console.log(`total request found:${requests.count()}`);
            for(const request of requests._dataList as request_queue[]){
                if (typeof request.data_for !== "string") throw new Error("data_for is empty");
                console.log(`processing request ${request.hash} type ${request.type} for ${request.data_for} `);
                if (request.type === "wallet_token_balance") {
                    request.data_result = await eth_worker.getTokenBalance(request.data_for);
                }
                if (request.type === "wallet_eth_balance") {
                    request.data_result = await eth_worker.getETHBalance(request.data_for);
                }
                console.log(`--result:${request.data_result}`);
                request.status = "d";
                request.time_processed = time_helper.getCurrentTimeStamp();
                await request.save();
            }
            await connection.commit();
            await tools.sleep(150);
            setImmediate(()=>{
                worker_request.run().finally();
            });
        }catch (e){
            await connection.rollback();
            console.log(`ERROR`);
            console.log(e);
        }
    }

}

if(argv.includes("run_worker_request")){
    console.log(`running worker to process web3 requests on the side`);
    worker_request.run().finally();
}