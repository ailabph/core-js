import {argv} from "process";
import {worker_events_token} from "./worker_events_token";
import {connection} from "./connection";
import {eth_rpc} from "./eth_rpc";
import {web3_rpc_web3} from "./web3_rpc_web3";
import {tools} from "./tools";
import {config} from "./config";


export class worker_block{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`worker_block|${method}|${msg}`);
            if(end) console.log(`worker_block|${method}|${tools.LINE}`);
        }
    }

    //region CONFIG
    private static getBatch():number{
        return 50;
    }
    //endregion CONFIG

    public static async run(){
        /*
        process:
        blocks
        from = get last block on db + 1
        to = get latest block
        to = to > limit ? limit : to;

        loop from to
            process++
        single flight block
        scan logs

        if process is zero restart
         */

        await connection.startTransaction();
        try{
            this.getBlockSingleFlight(123).then(()=>{

            });
            await connection.commit();
        }catch (e){
            await connection.rollback();
        }
    }

    public static async getBlockSingleFlight(blockNumber:number):Promise<any>{
        const method = "getBlockSingleFlight";
        const blockNumberAsHex = tools.convertNumberToHex(blockNumber);
        this.log(`retrieving single flight block of ${blockNumber} as ${blockNumberAsHex}`,method);
        return new Promise((resolve, reject)=>{
            web3_rpc_web3.getWeb3Provider().send({jsonrpc:"2.0",method:"qn_getBlockWithReceipts",params:[blockNumberAsHex]},(error,result)=>{
                if(error){
                    reject(error);
                }
                if(result){
                    resolve(result);
                }
            });
        });
    }

}

if(argv.includes("run_worker_block")){
    console.log(`running worker to track token events`);
    worker_events_token.run().finally();
}