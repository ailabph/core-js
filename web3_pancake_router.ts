import {config} from "./config";
import {tools} from "./tools";
import {Contract} from "ethers";
import {eth_rpc} from "./eth_rpc";
import {eth_config} from "./eth_config";

export class web3_pancake_router{
    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`web3_pancake_router|${method}|${msg}`);
            if(end) console.log(`web3_pancake_router|${method}|${tools.LINE}`);
        }
    }
    private static initDexContract():Contract{
        return eth_rpc.getEtherContract(eth_config.getDexContract(),eth_config.getDexAbi());
    }
    public static async getFactory():Promise<string>{
        const method = "getFactory";
        this.log(`retrieving factory address`,method);
        let factoryAddress = "";
        try{
            factoryAddress = await this.initDexContract().factory();
        }catch (e){
            this.log(`ERROR`,method);
            if(e instanceof Error){
                this.log(e.message,method,true,true);
            }
            throw e;
        }
        return factoryAddress;
    }
}