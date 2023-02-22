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
        if(tools.isEmpty(contract_address)) throw new eth_contract_data_tools_error(`contract_address must not be empty in ${method}`);

        this.log(`retrieving db contract ${contract_address}`,method);
        const contractInfo = eth_types.getDefaultContractInfo();
        const db_contract = new eth_contract_data();
        db_contract.contract = contract_address;
        await db_contract.fetch();
        if(db_contract.isNew()){
            this.log(`contract not on db, retrieving on chain`,method);
            db_contract.contract = contract_address;

            const token_name = await web3_token.getName(contract_address,strict);
            db_contract.name = token_name ? token_name : "";

            const token_symbol = await web3_token.getSymbol(contract_address,strict);
            db_contract.symbol = token_symbol ? token_symbol : "";

            const token_decimals = tools.parseIntSimple(await web3_token.getDecimals(contract_address,strict));
            db_contract.decimals = token_decimals ? tools.parseIntSimple(token_decimals.toString()) : -1;

            if(db_contract.decimals < 0){
                const errorMessage = `unable to retrieve token name,symbol,decimals info on chain with address:${contract_address}`;
                this.log(errorMessage,method,true,true);
                if(strict) throw new eth_contract_data_tools_error(errorMessage);
                return false;
            }
            else{
                this.log(`retrieved contract info on chain, saving on db`,method,true);
                await db_contract.save();
            }
        }
        contractInfo.name = assert.stringNotEmpty(db_contract.name);
        contractInfo.symbol = assert.stringNotEmpty(db_contract.symbol);
        contractInfo.decimals = assert.naturalNumber(db_contract.decimals);
        return contractInfo;
    }
    public static async getContractViaAddressStrict(contract_address:string):Promise<ContractInfo>{
        return await this.getContractViaAddress(contract_address,true) as ContractInfo;
    }
    //endregion READ
}

class eth_contract_data_tools_error extends Error{
    constructor(message:string) {
        super(message);
    }
}