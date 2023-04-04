import {eth_price_track_header} from "./build/eth_price_track_header";
import {assert} from "./assert";
import { config } from "./config";
import { eth_config } from "./eth_config";
import { tools} from "./tools";
import {eth_contract_data_tools} from "./eth_contract_data_tools";
import {web3_pair_price_tools} from "./web3_pair_price_tools";
import {web3_pancake_factory} from "./web3_pancake_factory";
import {web3_pancake_pair} from "./web3_pancake_pair";
import {eth_price_track_details_tools} from "./eth_price_track_details_tools";
import {worker_price} from "./worker_price";
import {web3_tools} from "./web3_tools";

export class eth_price_track_header_tools{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`eth_price_track_header_tools|${method}|${msg}`);
            if(end) console.log(`eth_price_track_header_tools|${method}|${tools.LINE}`);
        }
    }

    //region UTILITIES
    public static getPairSymbol(header:eth_price_track_header,separator:string=""):string{
        const method = "getPairSymbol";
        const token0_symbol = tools.isEmpty(header.token0_symbol) ? "unknown" :  assert.stringNotEmpty(header.token0_symbol,`${method} header.token0_symbol`);
        const token1_symbol = tools.isEmpty(header.token1_symbol) ? "unknown" : assert.stringNotEmpty(header.token1_symbol,`${method} header.token0_symbol`);
        return `${token0_symbol.toUpperCase()}${separator}${token1_symbol}`;
    }
    public static getOrderedPairSymbol(header:eth_price_track_header,separator:string=""):string{
        const method = "getOrderedPairSymbol";
        let base_position = 0;
        if(this.pairHasBusd(header)){
            // this.log("...has BUSD token in pair",method);
            base_position = this.pairBusdPosition(header);
        }
        else if(this.pairHasBnb(header)){
            // this.log("...has BNB token in pair",method);
            base_position = this.pairBnbPosition(header);
        }
        else{
            // this.log("...has no BNB or BUSD token in pair",method);
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
    public static async pairhasBusdViaPairAddress(pair_address:string):Promise<boolean>{
        const pair_header = await this.getViaIdOrContractStrict(pair_address);
        return this.pairHasBusd(pair_header);
    }

    public static pairBnbPosition(header:eth_price_track_header):number{
        return this.getTokenPairPosition(header,eth_config.getEthContract());
    }
    public static pairHasBnb(header:eth_price_track_header):boolean{
        return this.pairBnbPosition(header) >= 0;
    }
    public static async pairHasBnbViaPairAddress(pair_address:string):Promise<boolean>{
        const pair_header = await this.getViaIdOrContractStrict(pair_address);
        return this.pairHasBnb(pair_header);
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
            " OR (token1_contract=:token0 AND token0_contract=:token1) ",
            {token0:token0,token1:token1}," LIMIT 1 ");
        if(pair.count() === 0){
            this.log(`pair not on db, retrieving pair info on chain`,method);
            try{
                const token0Info = await eth_contract_data_tools.getContractViaAddressStrict(token0);
                const token1Info = await eth_contract_data_tools.getContractViaAddressStrict(token1);
                const pairAddress = await web3_pancake_factory.getPair(token0Info.address,token1Info.address);
                if(!pairAddress) throw new Error(`unable to retrieve pair address of ${token0} and ${token1}`);

                this.log(`pair address found on chain: ${pairAddress}`,method);
                this.log(`checking if pair contract on db`,method);
                const checkPairExists = new eth_price_track_header();
                checkPairExists.pair_contract = pairAddress;
                await checkPairExists.fetch();
                if(checkPairExists.recordExists()){
                    this.log(`pair in db`,method);
                    pairToReturn = checkPairExists;
                }
                else{
                    pairToReturn.pair_contract = pairAddress;
                    pairToReturn.token0_contract = token0Info.address;
                    pairToReturn.token0_symbol = token0Info.symbol;
                    pairToReturn.token0_decimal = assert.naturalNumber(token0Info.decimals);

                    pairToReturn.token1_contract = token1Info.address;
                    pairToReturn.token1_symbol = token1Info.symbol;
                    pairToReturn.token1_decimal = assert.naturalNumber(token1Info.decimals);
                    this.log(`saving new pair`,method);
                    await pairToReturn.save();
                }
            }catch (e){
                if(e instanceof Error){
                    this.log(e.message,method,true,true);
                    if(strict) throw new eth_price_track_header_tools_error(e.message);
                }
                return false;
            }
        }
        pairToReturn = pair.getItem();
        return pairToReturn;
    }
    public static async getViaIdOrContract(header:number|string|eth_price_track_header,strict:boolean=false):Promise<eth_price_track_header|false>{
        const method = "getViaIdOrContract";
        this.log(`retrieving price_track_header via...`,method);
        if(typeof header === "number"){
            const header_id:number = header;
            this.log(`...id ${header_id}, retrieving on db`,method);
            header = new eth_price_track_header();
            header.id = header_id;
            await header.fetch();
            if(header.isNew()) throw new eth_price_track_header_tools_error(`not on db and unable to retrieve on chain with just id`);
        }
        else if(typeof header === "string"){
            const contract_address:string = header;
            this.log(`...address ${contract_address}, retrieving on db`,method);
            header = new eth_price_track_header();
            header.pair_contract = assert.stringNotEmpty(contract_address,`${method} contract_address`);
            await header.fetch();
        }
        else{
            this.log(`...passed price_track_header with id ${header.id} and address ${header.pair_contract}`,method);
        }

        if(header.isNew()){
            this.log(`...pair not on db, retrieving on chain`,method);
            try{
                const pair_address = assert.stringNotEmpty(header.pair_contract,`${method} header.pair_contract`);
                header.pair_contract = pair_address;
                header.token0_contract = await web3_pancake_pair.token0Strict(pair_address);
                header.token1_contract = await web3_pancake_pair.token1Strict(pair_address);
                this.log(`...found pair address token0:${header.token0_contract} token1:${header.token1_contract}, retrieving contract info`,method);

                const token0_info = await eth_contract_data_tools.getContractViaAddress(header.token0_contract,false);
                if(!token0_info) throw new Error(`unable to retrieve token0 info on db or chain`);
                header.token0_symbol = tools.isEmpty(token0_info.symbol) ? "unknown" : token0_info.symbol;
                header.token0_decimal = assert.naturalNumber(token0_info.decimals,`${method} token0_info.decimals`);

                const token1_info = await eth_contract_data_tools.getContractViaAddress(header.token1_contract,false);
                if(!token1_info) throw new Error(`unable to retrieve token0 info on db or chain`);
                header.token1_symbol = tools.isEmpty(token1_info.symbol) ? "unknown" : token1_info.symbol;
                header.token1_decimal = assert.naturalNumber(token1_info.decimals,`${method} token1_info.decimals`);

                await header.save();
                this.log(`...saved pair info on db with id:${header.id} and pair address:${header.pair_contract}`,method);
            }catch (e){
                if(e instanceof Error){
                    this.log(e.message,method,true,true);
                    if(strict) throw new eth_price_track_header_tools_error(e.message);
                }
                return false;
            }
        }
        this.log(`...retrieved header with id:${header.id} pair_contract:${header.pair_contract}`,method);
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