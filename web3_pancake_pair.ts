import {config} from "./config";
import {eth_config} from "./eth_config";
import {eth_rpc} from "./eth_rpc";
import {tools} from "./tools";
import {Contract} from "ethers";

export class web3_pancake_pair{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`web3_pancake_pair|${method}|${msg}`);
            if(end) console.log(`web3_pancake_pair|${method}|${tools.LINE}`);
        }
    }

    private static initContract(address:string):Contract{
        return eth_rpc.getEtherContract(address,eth_config.getPancakePairAbi());
    }

    //region READ
    public static async token0(pair_address:string,strict:boolean=false):Promise<string|false>{
        const method = "token0";
        this.log(`retrieving token0 from pair address ${pair_address}`,method);
        try{
            const token0 = await this.initContract(pair_address).token0();
            this.log(`token0: ${token0}`,method,true);
            return token0;
        }
        catch (e){
            if(e instanceof Error && !tools.isEmpty(e.message)){
                this.log(e.message,method,true,true);
                if(strict) throw new web3_pancake_pair_error(`${method}|${e.message}`);
            }
            return false;
        }
    }
    public static async token0Strict(pair_address:string):Promise<string>{
        return await this.token0(pair_address,true) as string;
    }
    public static async token1(pair_address:string,strict:boolean=false):Promise<string|false>{
        const method = "token1";
        this.log(`retrieving token1 from pair address ${pair_address}`,method);
        try{
            const token1 = await this.initContract(pair_address).token1();
            this.log(`token1: ${token1}`,method,true);
            return token1;
        }
        catch (e){
            if(e instanceof Error && !tools.isEmpty(e.message)){
                this.log(e.message,method,true,true);
                if(strict) throw new web3_pancake_pair_error(`${method}|${e.message}`);
            }
            return false;
        }
    }
    public static async token1Strict(pair_address:string):Promise<string>{
        return await this.token1(pair_address,true) as string;
    }
    //endregion READ
}

class web3_pancake_pair_error extends Error{
    constructor(message:string) {
        super(message);
    }
}