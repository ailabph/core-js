import {ContractInfo, eth_types} from "./eth_types";
import {eth_contract_data} from "./build/eth_contract_data";
import { assert } from "./assert";
import { config } from "./config";
import { tools } from "./tools";
import {web3_token} from "./web3_token";

export class eth_contract_data_tools{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`eth_contract_data_tools|${method}|${msg}`);
            if(end) console.log(`eth_contract_data_tools|${method}|${tools.LINE}`);
        }
    }

    //region READ
    public static async getContractViaAddress(contract_address:string,strict:boolean=false):Promise<ContractInfo|false>{
        const method = "getContractViaAddress";
        contract_address = assert.stringNotEmpty(contract_address,`${method} contract_address`);

        this.log(`retrieving db contract ${contract_address}`,method);
        const contractInfo = eth_types.getDefaultContractInfo();
        const db_contract = new eth_contract_data();
        db_contract.contract = contract_address;
        await db_contract.fetch();
        if(db_contract.isNew()){
            this.log(`contract not on db, retrieving on chain`,method);
            db_contract.contract = contract_address;

            const token_name = await web3_token.getNameWeb3(contract_address,strict);
            if(!token_name) return false;
            db_contract.name = token_name;

            const token_symbol = await web3_token.getSymbolWeb3(contract_address,strict);
            if(!token_symbol) return false;
            db_contract.symbol = token_symbol;

            const token_decimalsBn = await web3_token.getDecimalsWeb3(contract_address,strict);
            if(!token_decimalsBn) return false;
            db_contract.decimals = tools.parseIntSimple(token_decimalsBn.toString(),"token_decimalsBn.toString");

            await db_contract.save();
            this.log(`...saved contract on db with id ${db_contract.id}`,method);
        }
        else{
            this.log(`...record on db`,method);
        }
        contractInfo.name = db_contract.name;
        contractInfo.symbol = db_contract.symbol;
        contractInfo.decimals = assert.naturalNumber(db_contract.decimals,`${method} db_contract.decimals`);
        contractInfo.address = assert.stringNotEmpty(db_contract.contract,`${method} contract_address`);
        this.log(`...returning ${contractInfo.name} ${contractInfo.symbol} ${contractInfo.decimals}`,method);
        return contractInfo;
    }
    public static async getContractViaAddressStrict(contract_address:string):Promise<ContractInfo>{
        return await this.getContractViaAddress(contract_address,true) as ContractInfo;
    }
    public static async getContractDynamicStrict(contract:string|ContractInfo):Promise<ContractInfo>{
        if(typeof contract !== "string") return contract;
        return this.getContractViaAddressStrict(contract);
    }
    //endregion READ
}

class eth_contract_data_tools_error extends Error{
    constructor(message:string) {
        super(message);
    }
}