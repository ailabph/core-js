import {config} from "./config";
import {eth_config} from "./eth_config";
import {eth_rpc} from "./eth_rpc";
import {tools} from "./tools";
import {Contract} from "ethers";
import {web3_rpc_web3} from "./web3_rpc_web3";

export class web3_token{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`web3_token|${method}|${msg}`);
            if(end) console.log(`web3_token|${method}|${tools.LINE}`);
        }
    }
    private static initContract(address:string):Contract{
        return eth_rpc.getEtherContract(address,eth_config.getTokenAbi());
    }

    //region READ
    public static async genericFunctionCallNoArgs<T>(contract_address:string, function_name:string, strict:boolean=false):Promise<T|false>{
        const method = "genericFunctionCallNoArgs";
        this.log(`calling function ${function_name} on contract ${contract_address}`,method);

        try{
            return await this.initContract(contract_address)[function_name]() as T;
        }catch (e) {
            this.log(`ERROR: unable to call function ${function_name} from contract ${contract_address}`,`callFunctionWithNoArgument:${function_name}`,false,false);
            if(strict){
                if(e instanceof Error) throw new web3_token_error(e.message);
                throw e;
            }
            return false;
        }
    }
    public static async getName(contract_address:string,strict:boolean=false):Promise<string|false>{
        const method = "getName";
        this.log(`retrieving token name of ${contract_address}`,method);
        return this.genericFunctionCallNoArgs<string>(contract_address,"name",strict);
    }
    public static async getSymbol(contract_address:string,strict:boolean=false):Promise<string|false>{
        const method = "getSymbol";
        this.log(`retrieving token symbol of ${contract_address}`,method);
        return this.genericFunctionCallNoArgs<string>(contract_address,"symbol");
    }
    public static async getDecimals(contract_address:string,strict:boolean=false):Promise<bigint|false>{
        const method = "getDecimals";
        this.log(`retrieving token decimals of ${contract_address}`,method);
        return this.genericFunctionCallNoArgs<bigint>(contract_address,"decimals",strict);
    }

    public static async getNameWeb3(contract_address:string,strict:boolean=false):Promise<string|false>{
        const method = "getNameWeb3";
        this.log(`retrieving name of contract ${contract_address}`,method);
        const contract = web3_rpc_web3.getWeb3Contract(contract_address,[
            {
                "constant": true,
                "inputs": [],
                "name": "name",
                "outputs": [
                    {
                        "internalType": "string",
                        "name": "",
                        "type": "string"
                    }
                ],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            }
        ]);
        try{
            const name = await contract.methods.name().call();
            this.log(`... name: ${name}`,method);
            return name;
        }
        catch (e){
            this.log(`ERROR, unable to retrieve name`,method);
            if(strict) throw e;
            return false;
        }

    }
    public static async getSymbolWeb3(contract_address:string,strict:boolean=false):Promise<string|false>{
        const method = "getSymbolWeb3";
        this.log(`retrieving symbol of contract ${contract_address}`,method);
        const contract = web3_rpc_web3.getWeb3Contract(contract_address,[
            {
                "constant": true,
                "inputs": [],
                "name": "symbol",
                "outputs": [
                    {
                        "internalType": "string",
                        "name": "",
                        "type": "string"
                    }
                ],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            }
        ]);
        try{
            const symbol = await contract.methods.symbol().call();
            this.log(`... symbol: ${symbol}`,method);
            return symbol;
        }
        catch (e){
            this.log(`ERROR, unable to retrieve symbol`,method);
            if(strict) throw e;
            return false;
        }
    }
    public static async getDecimalsWeb3(contract_address:string,strict:boolean=false):Promise<bigint|false>{
        const method = "getDecimalsWeb3";
        this.log(`retrieving decimals of contract ${contract_address}`,method);
        const contract = web3_rpc_web3.getWeb3Contract(contract_address,[
            {
                "constant": true,
                "inputs": [],
                "name": "decimals",
                "outputs": [
                    {
                        "internalType": "uint8",
                        "name": "",
                        "type": "uint8"
                    }
                ],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            }
        ]);
        try{
            const decimals = await contract.methods.decimals().call();
            this.log(`... decimals: ${decimals}`,method);
            return decimals;
        }
        catch (e){
            this.log(`ERROR, unable to retrieve symbol`,method);
            if(strict) throw e;
            return false;
        }
    }
    //endregion READ

    //region CHECKS

    //endregion CHECKS
}

class web3_token_error extends Error{
    constructor(message:string) {
        super(message);
    }
}