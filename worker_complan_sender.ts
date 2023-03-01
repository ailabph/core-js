import { argv } from "process";
import {config} from "./config";
import {tools} from "./tools";

//region TYPES
//endregion TYPES

export class worker_complan_sender{
    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`${this.name}|${method}|${msg}`);
            if(end) console.log(`${this.name}|${method}|${tools.LINE}`);
        }
    }
    public static async run():Promise<void>{
        /**
         * get points_log not yet processed for sending
         * check if wallet has user owner
         * check if owner is PH
         * else send email
         */
    }
}

if(argv.includes("run_worker_complan_sender")){
    console.log(`running worker to process points to token send request...`);
    worker_complan_sender.run().finally();
}