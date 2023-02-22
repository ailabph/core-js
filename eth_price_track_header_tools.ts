import {eth_price_track_header} from "./build/eth_price_track_header";
import {assert} from "./assert";
import { config } from "./config";
import { eth_config } from "./eth_config";
import { tools} from "./tools";
import {eth_contract_data_tools} from "./eth_contract_data_tools";
import {eth_pair_price_tools} from "./eth_pair_price_tools";
import {web3_pancake_factory} from "./web3_pancake_factory";
import {web3_pancake_pair} from "./web3_pancake_pair";
import {eth_price_track_details_tools} from "./eth_price_track_details_tools";
import {eth_worker_price} from "./eth_worker_price";
import {web3_tools} from "./web3_tools";

export class eth_price_track_header_tools{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`${this.name}|${method}|${msg}`);
            if(end) console.log(tools.LINE);
        }
    }

    //region UTILITIES
    public static getPairSymbol(header:eth_price_track_header,separator:string=""):string{
        const token0_symbol = assert.stringNotEmpty(header.token0_symbol);
        const token1_symbol = assert.stringNotEmpty(header.token1_symbol);
        return `${token0_symbol.toUpperCase()}${separator}${token1_symbol}`;
    }
    public static getOrderedPairSymbol(header:eth_price_track_header,separator:string=""):string{
        const method = "getOrderedPairSymbol";
        let base_position = 0;
        if(this.pairHasBusd(header)){
            this.log("has BUSD token in pair",method,true);
            base_position = this.pairBusdPosition(header);
        }
        else if(this.pairHasBnb(header)){
            this.log("has BNB token in pair",method,true);
            base_position = this.pairBnbPosition(header);
        }
        else{
            this.log("has no BNB or BUSD token in pair",method,true);
        }
        return web3_tools.getOrderedPair(header.token0_symbol,header.token1_symbol,base_position,separator);
    }

    /**
     * checks for the position of a given token address in the pair.
     * returns 0 or 1 if found.
     * returns -1 if not found.
     */
    public static getTokenPairPosition(header:eth_price_track_header,token_address:string):number{
        if(header.token0_contract.toLowerCase() === token_address.toLowerCase()) return 0;
        if(header.token1_contract.toLowerCase() === token_address.toLowerCase()) return 1;
        return -1;
    }

    public static pairBusdPosition(header:eth_price_track_header):number{
        return this.getTokenPairPosition(header,eth_config.getBusdContract());
    }
    public static pairHasBusd(header:eth_price_track_header):boolean{
        return this.pairBusdPosition(header) >= 0;
    }

    public static pairBnbPosition(header:eth_price_track_header):number{
        return this.getTokenPairPosition(header,eth_config.getEthContract());
    }
    public static pairHasBnb(header:eth_price_track_header):boolean{
        return this.pairBnbPosition(header) >= 0;
    }

    //endregion UTILITIES

    //region GET RECORD
    public static async getViaTokenContracts(token0:string,token1:string,strict:boolean=false):Promise<eth_price_track_header|false>{
        const method = "getViaTokenContracts";
        this.log(`retrieving pair from db of token0:${token0} token1:${token1}`,method);
        assert.notEmpty(token0,"token0");
        assert.notEmpty(token1,"token1");
        let pairToReturn = new eth_price_track_header();
        const pair = new eth_price_track_header();
        await pair.list(
            " WHERE (token0_contract=:token0 AND token1_contract=:token1) "+
            " OR (token1_contract=:token1 AND token0_contract=:token1) ",
            {token0:token0,token1:token1}," LIMIT 1 ");
        if(pair.count() === 0){
            this.log(`pair not on db, retrieving pair info on chain`,method);
            try{
                const token0Info = await eth_contract_data_tools.getContractViaAddress(token0,strict);
                if(!token0Info) throw new Error(`unable to retrieve contract info of ${token0}`);

                const token1Info = await eth_contract_data_tools.getContractViaAddress(token1,strict);
                if(!token1Info) throw new Error(`unable to retrieve contract info of ${token1}`);

                const pairAddress = await web3_pancake_factory.getPair(token0Info.address,token1Info.address);
                if(!pairAddress) throw new Error(`unable to retrieve pair address of ${token0} and ${token1}`);

                this.log(`pair address found on chain: ${pairAddress}`,method);
                pairToReturn.pair_contract = pairAddress;
                pairToReturn.token0_contract = token0Info.address;
                pairToReturn.token0_symbol = token0Info.symbol;
                pairToReturn.token0_decimal = assert.naturalNumber(token0Info.decimals);

                pairToReturn.token1_contract = token1Info.address;
                pairToReturn.token1_symbol = token1Info.symbol;
                pairToReturn.token1_decimal = assert.naturalNumber(token1Info.decimals);
                this.log(`saving new pair`,method);
                await pairToReturn.save();
            }catch (e){
                if(e instanceof Error){
                    this.log(e.message,method,true,true);
                    if(strict) throw new eth_price_track_header_tools_error(e.message);
                }
                return false;
            }
        }
        return pairToReturn;
    }
    public static async getViaIdOrContract(header_id_or_contract:number|string|eth_price_track_header,strict:boolean=false):Promise<eth_price_track_header|false>{
        const method = "getViaIdOrContract";
        this.log(`retrieving price_track_header via ${header_id_or_contract}`,method);
        let header = new eth_price_track_header();
        if(typeof header_id_or_contract === "number") header.id = header_id_or_contract;
        else if(typeof header_id_or_contract === "string"){
            header.pair_contract = header_id_or_contract;
        }
        else{
            this.log(`price_track_header pass thru`,method,true);
            return header_id_or_contract;
        }
        await header.fetch();
        if(header.isNew()){
            this.log(`pair not on db, retrieving on chain`,method);
            try{
                if(typeof header_id_or_contract === "number"){
                    throw new Error(`unable to pair info on chain with db_id:${header_id_or_contract}`);
                }
                const token0 = await web3_pancake_pair.token0(header_id_or_contract,strict);
                if(!token0) throw new Error(`unable to retrieve token0 of ${header_id_or_contract}`);
                const token1 = await web3_pancake_pair.token1(header_id_or_contract,strict);
                if(!token1) throw new Error(`unable to retrieve token1 of ${header_id_or_contract}`);

                this.log(`found pair address token0:${token0} token1:${token1}`,method);
                const pairInfo = await this.getViaTokenContracts(token0,token1,strict);
                if(!pairInfo) throw new Error(`unable to retrieve pair info of ${token0} and ${token1}`);
                header.token0_contract = pairInfo.token0_contract;
                header.token0_symbol = pairInfo.token0_symbol;
                header.token0_decimal = pairInfo.token0_decimal;
                header.token1_contract = pairInfo.token1_contract;
                header.token1_symbol = pairInfo.token1_symbol;
                header.token1_decimal = pairInfo.token1_decimal;
                header.pair_contract = header_id_or_contract;
                await header.save();
            }catch (e){
                if(e instanceof Error){
                    this.log(e.message,method,true,true);
                    if(strict) throw new eth_price_track_header_tools_error(e.message);
                }
                return false;
            }
        }
        this.log(`retrieved header with id:${header.id} pair_contract:${header.pair_contract}`,method,true);
        return header;
    }
    public static async getViaIdOrContractStrict(header_id_or_contract:number|string|eth_price_track_header):Promise<eth_price_track_header>{
        return await this.getViaIdOrContract(header_id_or_contract,true) as eth_price_track_header;
    }
    //endregion GET RECORD
}

class eth_price_track_header_tools_error extends Error{
    constructor(message:string) {
        super(message);
    }
}