
import {Contract} from "ethers";
import {assert} from "./assert";
import {eth_rpc} from "./eth_rpc";
import {eth_config} from "./eth_config";
import {config} from "./config";
import {tools} from "./tools";

export class web3_pancake_factory{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`web3_pancake_factory|${method}|${msg}`);
            if(end) console.log(`web3_pancake_factory|${method}|${tools.LINE}`);
        }
    }
    private static retryWaitDuration():number{
        return 500;
    }
    private static retryLimit():number{
        return 20;
    }

    private static pancakeFactoryContract:Contract;

    private static init(): void{
        if(typeof this.pancakeFactoryContract !== "undefined") return;
        this.pancakeFactoryContract = eth_rpc.getEtherContract(eth_config.getPancakeFactoryContract(),eth_config.getPancakeFactoryAbi());
    }

    //region READ
    public static async getPair(token0:string,token1:string,strict:boolean=false):Promise<string|false>{
        this.init();
        const method = "getPair";
        this.log(`retrieving pair address of ${token0} and ${token1}`,method);
        try{
            assert.notEmpty(token0,"token0");
            assert.notEmpty(token1,"token1");
            const pairAddress = await this.pancakeFactoryContract.getPair(token0,token1);
            if(pairAddress === "0x0000000000000000000000000000000000000000") throw new Error(`pair does not exist`);
            this.log(`pair address found ${pairAddress}`,method,true);
            return pairAddress;
        }catch (e){
            if(e instanceof Error && !tools.isEmpty(e.message)){
                this.log(e.message,method,true,true);
                if(strict) throw new web3_pancake_factory_error(e.message);
            }
            return false;
        }
    }
    public static async getPairStrict(token0:string,token1:string):Promise<string>{
        return await this.getPair(token0, token1, true) as string;
    }
    //endregion READ
}

class web3_pancake_factory_error extends Error{
    constructor(message:string) {
        super(message);
    }
}