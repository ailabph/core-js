
import {assert} from "./assert";
import {config} from "./config";
import {eth_config} from "./eth_config";
import {eth_rpc} from "./eth_rpc";
import {eth_worker} from "./eth_worker";
import {tools} from "./tools";
import {eth_receipt_logs_tools} from "./eth_receipt_logs_tools";
import {web3_log_decoder,SwapLog,SyncLog} from "./web3_log_decoder";
import {PAIR_INFO} from "./eth_worker_trade";
import {eth_price_track_header} from "./build/eth_price_track_header";
import {SwapTradeInfo} from "./eth_receipt_logs_tools";
import {eth_receipt_logs} from "./build/eth_receipt_logs";
import {time_helper} from "./time_helper";
import {eth_price_track_details} from "./build/eth_price_track_details";
import {worker_price} from "./worker_price";
import {top_up_request_detail} from "./build/top_up_request_detail";
import {web3_pancake_factory} from "./web3_pancake_factory";
import {eth_price_track_details_tools} from "./eth_price_track_details_tools";
import {eth_price_track_header_tools} from "./eth_price_track_header_tools";
import {web3_pancake_pair} from "./web3_pancake_pair";
import {eth_contract_data_tools} from "./eth_contract_data_tools";

//region TYPES
type WhereParamOrder = {
    where:string,
    param:{[key:string]:string|number},
    order:string,
}
//endregion

/**
 * This class is exclusive for computation without accessing price_track_details
 */
export class web3_pair_price_tools {

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`web3_pair_price_tools|${method}|${msg}`);
            if(end) console.log(`web3_pair_price_tools|${method}|${tools.LINE}`);
        }
    }

    //region DEFAULTS
    public static getDefaultPairInfo():PAIR_INFO{
        return {
            address: "",
            pairSymbol: "",
            orderedPairSymbol: "",
            token0_contract: "",
            token0_decimal: 18,
            token0_symbol: "",
            token1_contract: "",
            token1_decimal: 18,
            token1_symbol: ""
        };
    }
    //endregion DEFAULTS

    //region GETTERS PAIR INFO
    public static async getPairInfo(pair_contract:string|PAIR_INFO):Promise<PAIR_INFO>{
        const method = "getPairInfo";
        if(typeof pair_contract !== "string"){
            this.log(`pass thru pairInfo for ${pair_contract.address}`,method);
            return pair_contract;
        }
        this.log(`retrieving pairInfo for ${pair_contract}`,method);
        assert.notEmpty(pair_contract,"pair_contract");
        const price_header = await eth_price_track_header_tools.getViaIdOrContractStrict(pair_contract);
        const pairInfo = this.convertDbPairHeaderToPairInfo(price_header);
        this.log(`--pair address:${pairInfo.address}`,method);
        return pairInfo;
    }
    public static async getPairContractToken0(pair_address:string):Promise<string>{
        return await web3_pancake_pair.token0Strict(pair_address);
    }
    public static async getPairContractToken1(pair_address:string):Promise<string>{
        return await web3_pancake_pair.token1Strict(pair_address);
    }
    public static async getContractInfoFromPair(pair:string|PAIR_INFO,selected_token_contract:string):Promise<SwapTradeInfo>{
        pair = await this.getPairInfo(pair);
        const pair_header = await eth_price_track_header_tools.getViaIdOrContractStrict(pair.address);
        const pairPosition = eth_price_track_header_tools.getTokenPairPosition(pair_header,selected_token_contract);
        if(pairPosition < 0) throw new web3_pair_price_tools_error(`token ${selected_token_contract} not in pair ${pair.address}`);
        const to_return:SwapTradeInfo = eth_receipt_logs_tools.getDefaultSwapTradeInfo();
        to_return.contractInfo.address = tools.getPropertyValue<string>(pair,`token${pairPosition}_contract`);
        to_return.contractInfo.decimals = tools.getPropertyValue<number>(pair,`token${pairPosition}_decimal`);
        to_return.contractInfo.name = tools.getPropertyValue<string>(pair,`token${pairPosition}_symbol`);
        to_return.contractInfo.symbol = tools.getPropertyValue<string>(pair,`token${pairPosition}_symbol`);
        if(tools.isEmpty(to_return.contractInfo.address)) throw new web3_pair_price_tools_error(`unable to retrieve contract info of ${selected_token_contract} in contract pair ${pair.address}`);
        return to_return;
    }
    public static async getOppositeContractPairOf(pair:string|PAIR_INFO,selected_token_contract:string):Promise<SwapTradeInfo>{
        pair = await this.getPairInfo(pair);
        const pair_header = await eth_price_track_header_tools.getViaIdOrContractStrict(pair.address);
        const pairPosition = eth_price_track_header_tools.getTokenPairPosition(pair_header,selected_token_contract);
        if(pairPosition < 0) throw new web3_pair_price_tools_error(`token ${selected_token_contract} not in pair ${pair.address}`);
        const to_return:SwapTradeInfo = eth_receipt_logs_tools.getDefaultSwapTradeInfo();
        const oppositePosition = pairPosition === 0 ? 1 : 0;
        to_return.contractInfo.address = tools.getPropertyValue<string>(pair,`token${oppositePosition}_contract`);
        to_return.contractInfo.decimals = tools.getPropertyValue<number>(pair,`token${oppositePosition}_decimal`);
        to_return.contractInfo.name = tools.getPropertyValue<string>(pair,`token${oppositePosition}_symbol`);
        to_return.contractInfo.symbol = tools.getPropertyValue<string>(pair,`token${oppositePosition}_symbol`);
        if(tools.isEmpty(to_return.contractInfo.address)) throw new Error(`unable to retrieve other contract info of pair ${pair.address} with selected token_contract:${selected_token_contract}`);
        return to_return;
    }
    public static async getBaseTokenInfo(pair:string|PAIR_INFO):Promise<SwapTradeInfo>{
        pair = await this.getPairInfo(pair);
        let baseSwapTradeInfo = eth_receipt_logs_tools.getDefaultSwapTradeInfo();
        if(await this.pairIsBnb(pair)){
            baseSwapTradeInfo = await this.getContractInfoFromPair(pair,eth_config.getEthContract());
        }
        else if(await this.pairIsUsd(pair)){
            baseSwapTradeInfo = await this.getContractInfoFromPair(pair,eth_config.getBusdContract());
        }
        else{
            baseSwapTradeInfo.contractInfo = await eth_worker.getContractMetaData(pair.token0_contract);
        }
        return baseSwapTradeInfo;
    }
    public static async getQuoteTokenInfo(pair:string|PAIR_INFO):Promise<SwapTradeInfo>{
        pair = await this.getPairInfo(pair);
        let quoteSwapTradeInfo = eth_receipt_logs_tools.getDefaultSwapTradeInfo();
        if(await this.pairIsBnb(pair)){
            quoteSwapTradeInfo = await this.getOppositeContractPairOf(pair,eth_config.getEthContract());
        }
        else if(await this.pairIsUsd(pair)){
            quoteSwapTradeInfo = await this.getOppositeContractPairOf(pair,eth_config.getBusdContract());
        }
        else{
            quoteSwapTradeInfo.contractInfo = await eth_worker.getContractMetaData(pair.token1_contract);
        }
        return quoteSwapTradeInfo;
    }
    //endregion GETTERS PAIR INFO

    //region GETTERS RESERVES
    public static async getBnbReserve(syncLog:SyncLog,pairInfo?:PAIR_INFO):Promise<bigint>{
        if(!pairInfo) pairInfo = await this.getPairInfo(syncLog.ContractInfo.address);
        let reserve:bigint|undefined;
        if(pairInfo.token0_contract.toLowerCase() === eth_config.getEthContract().toLowerCase()){
            reserve = syncLog.reserve0;
        }
        else if(pairInfo.token1_contract.toLowerCase() === eth_config.getEthContract().toLowerCase()){
            reserve = syncLog.reserve1;
        }
        if(typeof reserve === "undefined") throw new Error(`${pairInfo.pairSymbol} ${pairInfo.address} does not have Bnb token in the pair`);
        return reserve;
    }
    public static async getUsdReserve(syncLog:SyncLog,pairInfo?:PAIR_INFO):Promise<bigint>{
        if(!pairInfo) pairInfo = await this.getPairInfo(syncLog.ContractInfo.address);
        let reserve:bigint|undefined;
        if(pairInfo.token0_contract.toLowerCase() === eth_config.getBusdContract().toLowerCase()){
            reserve = syncLog.reserve0;
        }
        else if(pairInfo.token1_contract.toLowerCase() === eth_config.getBusdContract().toLowerCase()){
            reserve = syncLog.reserve1;
        }
        if(typeof reserve === "undefined") throw new Error(`${pairInfo.pairSymbol} ${pairInfo.address} does not have Busd token in the pair`);
        return reserve;
    }
    public static async getReserveByToken(syncLog:SyncLog,token_contract:string,pairInfo?:PAIR_INFO):Promise<bigint>{
        let toReturn:bigint = 0n;
        if(!pairInfo) pairInfo = await this.getPairInfo(syncLog.ContractInfo.address);
        if(pairInfo.token0_contract.toLowerCase() === token_contract.toLowerCase()){
            toReturn = syncLog.reserve0;
        }
        else if(pairInfo.token1_contract.toLowerCase() === token_contract.toLowerCase()){
            toReturn = syncLog.reserve1;
        }
        else{
            throw new Error(`${token_contract} not in pair ${pairInfo.pairSymbol} ${pairInfo.address}`);
        }
        return toReturn;
    }
    public static async getTargetTokenReserve(syncLog:SyncLog,pairInfo?:PAIR_INFO):Promise<bigint>{
        if(!pairInfo) pairInfo = await this.getPairInfo(syncLog.ContractInfo.address);
        let reserve:bigint|undefined;
        if(pairInfo.token0_contract.toLowerCase() === eth_config.getTokenContract().toLowerCase()){
            reserve = syncLog.reserve0;
        }
        else if(pairInfo.token1_contract.toLowerCase() === eth_config.getTokenContract().toLowerCase()){
            reserve = syncLog.reserve1;
        }
        if(typeof reserve === "undefined") throw new Error(`${pairInfo.pairSymbol} ${pairInfo.address} does not have ${eth_config.getTokenSymbol()} token in the pair`);
        return reserve;
    }
    //endregion

    //region PRICE VIA PAIR LOG ANALYSIS
    public static async computePriceByReserve(syncLog:SyncLog):Promise<string>{
        const method = "computePriceByReserve";
        this.log(`retrieving price by reserve...`,method);
        const pairInfo = await this.getPairInfo(syncLog.ContractInfo.address);
        let baseReserve:bigint = syncLog.reserve0;
        let baseDecimal = pairInfo.token0_decimal;
        let baseSymbol = pairInfo.token0_symbol;

        let quoteReserve:bigint = syncLog.reserve1;
        let quoteDecimal:number = pairInfo.token1_decimal;
        let quoteSymbol = pairInfo.token1_symbol;

        this.log(`...initial base reserve:${baseReserve.toString()} ${baseSymbol} ${baseDecimal}`,method);
        this.log(`...initial quote reserve:${quoteReserve.toString()} ${quoteSymbol} ${quoteDecimal}`,method);

        if(await this.pairIsUsd(pairInfo)){
            this.log(`...pair has usd`,method);
            const oppositeToken = await this.getOppositeContractPairOf(pairInfo,eth_config.getBusdContract());
            baseReserve = await this.getReserveByToken(syncLog,oppositeToken.contractInfo.address,pairInfo);
            baseDecimal = assert.naturalNumber(oppositeToken.contractInfo.decimals);
            baseSymbol = assert.stringNotEmpty(oppositeToken.contractInfo.symbol);

            quoteReserve = await this.getUsdReserve(syncLog,pairInfo);
            quoteDecimal = assert.naturalNumber(eth_config.getBusdDecimal());
            quoteSymbol = assert.stringNotEmpty(eth_config.getBusdSymbol());
        }
        else if(await this.pairIsBnb(pairInfo)){
            this.log(`...pair has bnb`,method);
            const oppositeToken = await this.getOppositeContractPairOf(pairInfo,eth_config.getEthContract());
            baseReserve = await this.getReserveByToken(syncLog,oppositeToken.contractInfo.address,pairInfo);
            baseDecimal = assert.naturalNumber(oppositeToken.contractInfo.decimals);
            baseSymbol = assert.stringNotEmpty(oppositeToken.contractInfo.symbol);
            quoteReserve = await this.getBnbReserve(syncLog,pairInfo);
            quoteDecimal = eth_config.getEthDecimal();
            quoteSymbol = eth_config.getEthSymbol();
        }

        this.log(`...current base reserve:${baseReserve.toString()} ${baseSymbol} ${baseDecimal}`,method);
        this.log(`...current quote reserve:${quoteReserve.toString()} ${quoteSymbol} ${quoteDecimal}`,method);

        const baseAmount = eth_worker.convertValueToAmount(baseReserve.toString(),baseDecimal);
        const quoteAmount = eth_worker.convertValueToAmount(quoteReserve.toString(),quoteDecimal);

        this.log(`...base reserve amount ${baseAmount}, quote reserve amount:${quoteAmount}`,method);

        const price = tools.toBn(quoteAmount).dividedBy(tools.toBn(baseAmount)).toFixed(quoteDecimal);
        this.log(`...computed price:${price}`,method,true);
        return price;
    }
    //endregion

    //region CHECK
    public static async pairIsBnb(pair:string|PAIR_INFO):Promise<boolean>{
        pair = await this.getPairInfo(pair);
        return  pair.token0_contract.toLowerCase() === eth_config.getEthContract().toLowerCase()
                || pair.token1_contract.toLowerCase() === eth_config.getEthContract().toLowerCase();
    }
    public static async pairIsUsd(pair:string|PAIR_INFO):Promise<boolean>{
        pair = await this.getPairInfo(pair);
        return  pair.token0_contract.toLowerCase() === eth_config.getBusdContract().toLowerCase()
            || pair.token1_contract.toLowerCase() === eth_config.getBusdContract().toLowerCase();
    }
    public static async pairHasBnbOrUsd(pair:string|PAIR_INFO):Promise<boolean>{
        return await this.pairIsBnb(pair) || await this.pairIsUsd(pair);
    }
    //endregion CHECK

    //region UTILITIES
    public static convertDbPairHeaderToPairInfo(pair_header:eth_price_track_header):PAIR_INFO{
        return {
            address: pair_header.pair_contract,
            orderedPairSymbol: eth_price_track_header_tools.getOrderedPairSymbol(pair_header),
            pairSymbol: eth_price_track_header_tools.getPairSymbol(pair_header),
            token0_contract: pair_header.token0_contract,
            token0_decimal: pair_header.token0_decimal,
            token0_symbol: pair_header.token0_symbol,
            token1_contract: pair_header.token1_contract,
            token1_decimal: pair_header.token1_decimal,
            token1_symbol: pair_header.token1_symbol
        };
    }
    //endregion UTILITIES

    public static supportedTokenForLiquidityForPair():string[]{
        return [
            eth_config.getEthContract(),
            eth_config.getBusdContract(),
        ];
    }
}

class web3_pair_price_tools_error extends Error{
    constructor(message:string) {
        super(message);
    }
}