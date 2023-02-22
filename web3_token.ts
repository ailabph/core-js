import {config} from "./config";
import {eth_config} from "./eth_config";
import {eth_rpc} from "./eth_rpc";
import {tools} from "./tools";
import {Contract} from "ethers";

export class web3_token{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`web3_token|${method}|${msg}`);
            if(end) console.log(`${tools.LINE}`);
        }
    }
    private static initContract(address:string):Contract{
        return eth_rpc.getEtherContract(address,eth_config.getTokenAbi());
    }

    //region READ
    public static async getName(contract_address:string,strict:boolean=false):Promise<string|false>{
        const method = "getName";
        this.log(`retrieving token name of ${contract_address}`,method);
        try{
            const token_name = await this.initContract(contract_address).name();
            this.log(`token name: ${token_name}`,method,true);
            return token_name;
        }catch (e){
            if(e instanceof Error && !tools.isEmpty(e.message)) {
                this.log(e.message,method,true,true);
                if(strict) throw new web3_token_error(e.message);
            }
            return false;
        }
    }
    public static async getSymbol(contract_address:string,strict:boolean=false):Promise<string|false>{
        const method = "getSymbol";
        this.log(`retrieving token symbol of ${contract_address}`,method);
        try{
            const tokenSymbol = await this.initContract(contract_address).symbol();
            this.log(`token symbol: ${tokenSymbol}`,method,true);
            return tokenSymbol;
        }catch (e){
            if(e instanceof Error && !tools.isEmpty(e.message)) {
                this.log(e.message,method,true,true);
                if(strict) throw new web3_token_error(e.message);
            }
            return false;
        }
    }
    public static async getDecimals(contract_address:string,strict:boolean=false):Promise<bigint|false>{
        const method = "getDecimals";
        this.log(`retrieving token decimals of ${contract_address}`,method);
        try{
            const tokenDecimals = await this.initContract(contract_address).decimals();
            this.log(`token decimals: ${tokenDecimals}`,method,true);
            return tokenDecimals;
        }catch (e){
            if(e instanceof Error && !tools.isEmpty(e.message)) {
                this.log(e.message,method,true,true);
                if(strict) throw new web3_token_error(e.message);
            }
            return false;
        }
    }
    //endregion READ
}

class web3_token_error extends Error{
    constructor(message:string) {
        super(message);
    }
}