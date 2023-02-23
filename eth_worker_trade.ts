import {eth_trade} from "./build/eth_trade";
import {SwapLog} from "./web3_log_decoder";
import {undefined} from "io-ts";
import {worker_price} from "./worker_price";
import {assert} from "./assert";
import {eth_config} from "./eth_config";
import {eth_worker} from "./eth_worker";
import {tools} from "./tools";

enum POSITION_TYPE {
    OPEN = "open",
    CLOSE = "close",
}
export { POSITION_TYPE }

enum TRADE_TYPE {
    BUY = "buy",
    SELL = "sell",
    NOT_SET = "not_set",
}
export { TRADE_TYPE }

type BaseQuoteAmountInfo = {
    trade_type:TRADE_TYPE,
    token0_contract:string,
    token0_amount:string,
    token0_value:string,
    token0_symbol:string,
    token0_decimal:number,
    
    token1_contract:string,
    token1_amount:string,
    token1_value:string,
    token1_symbol:string,
    token1_decimal:number,

    usd_value:string,
    time_traded:number,
    dateTime_traded:string
}
export { BaseQuoteAmountInfo }

type PAIR_INFO = {
    address:string,
    pairSymbol:string
    orderedPairSymbol:string,
    token0_contract:string,
    token0_symbol:string,
    token0_decimal:number,
    token1_contract:string,
    token1_symbol:string,
    token1_decimal:number,
}

export { PAIR_INFO };

type TRADE_PAIR_INFO = {
    trade_type:TRADE_TYPE,
    from_contract:string,
    from_symbol:string,
    from_decimal:number,
    from_amount:string,
    from_value:string,
    
    to_contract:string,
    to_symbol:string,
    to_decimal:number,
    to_amount:string,
    to_value:string,

    tax_amount:string,
    tax_perc:string,

    usd_price:string,
    bnb_usd_price:string,
    usd_value:string,
    bnb_value:string,
}

export { TRADE_PAIR_INFO }

export class eth_worker_trade{

    // public static async getPendingTradeRequest():Promise<eth_trade|boolean>{
    //     const pending = new eth_trade();
    //     await pending.list(" WHERE  ");
    // }
    public static async swap(srcToken:string,destToken:string,){}
    public static async swapBuy(){}
    public static async swapSell(){}
    public static async getTokenBalance(){}
    public static async getBnbBalance(){}

    public static getTradeType(swapLog:SwapLog, of_token:string):TRADE_TYPE{
        let tradeType:TRADE_TYPE|undefined;
        if(swapLog.amount0Out > 0){
            if(!(swapLog.amount1In > 0)) throw new Error(`buy type but no token1 in`);
            tradeType = TRADE_TYPE.BUY;
        }
        else if(swapLog.amount0In > 0){
            if(!(swapLog.amount1Out > 0)) throw new Error(`sell type but no token1 out`);
            tradeType = TRADE_TYPE.SELL;
        }
        else if(
            (swapLog.amount0In > 0 && swapLog.amount1In > 0)
            || (swapLog.amount1In > 0 && swapLog.amount1Out > 0)
        ){
            console.log(swapLog);
            throw new Error(`abnormal swap behaviour. both token0 and token1 are swapped at the same time`);
        }
        if(typeof tradeType === "undefined") throw new Error(`unable to recognize trade type`);
        return tradeType;
    }

    public static getDefaultBaseQuoteAmount():BaseQuoteAmountInfo{
        return {
            token0_value: "0",
            token1_value: "0",
            dateTime_traded: "",
            time_traded: 0,
            token0_amount: "",
            token0_contract: "",
            token0_decimal: 0,
            token0_symbol: "",
            token1_amount: "",
            token1_contract: "",
            token1_decimal: 0,
            token1_symbol: "",
            trade_type: TRADE_TYPE.NOT_SET,
            usd_value: ""
        };
    }

    public static async getBaseQuoteAmount(swapLog:SwapLog, blockTime:number):Promise<BaseQuoteAmountInfo>{
        const pairInfo = await worker_price.getPairInfo(swapLog.ContractInfo.address);
        const result = this.getDefaultBaseQuoteAmount();
        // result.trade_type = this.getTradeType(swapLog);
        result.token0_contract= pairInfo.token0_contract;
        result.token0_decimal= pairInfo.token0_decimal;
        result.token0_symbol= pairInfo.token0_symbol;
        result.token1_contract= pairInfo.token1_contract;
        result.token1_decimal= pairInfo.token1_decimal;
        result.token1_symbol= pairInfo.token1_symbol;

        const timeInfo = tools.getTime(assert.positiveInt(blockTime));
        result.dateTime_traded = timeInfo.format();
        result.trade_type = this.getTradeType(swapLog,result.token0_contract);
        if(result.trade_type === TRADE_TYPE.BUY){
            result.token0_value = swapLog.amount0Out.toString();
            result.token1_value = swapLog.amount1In.toString();
        }
        else if(result.trade_type === TRADE_TYPE.SELL){
            result.token0_value = swapLog.amount0In.toString();
            result.token1_value = swapLog.amount1Out.toString();

        }
        else{
            throw new Error(`trade_type not established`);
        }
        result.token0_amount = eth_worker.convertValueToAmount(result.token0_value,pairInfo.token0_decimal);
        result.token1_amount = eth_worker.convertValueToAmount(result.token1_value,pairInfo.token1_decimal);


        if(result.token1_contract.toLowerCase() === eth_config.getEthContract().toLowerCase()){
            const bnb_usd_price = await worker_price.getBnbUsdPrice(blockTime);
            result.usd_value = tools.toBn(bnb_usd_price).multipliedBy(result.token1_amount).toFixed(18);
        }
        if(result.token1_contract.toLowerCase() === eth_config.getBusdContract().toLowerCase()){
            result.usd_value = result.token1_amount;
        }

        if(!(tools.getNumber(result.token0_amount) > 0) || !(tools.getNumber(result.token1_amount) > 0))
            throw new Error(`token0_amount(${result.token0_amount}) or token1_amount(${result.token1_amount}) must be greater than zero`);

        return result;
    }

    public static getDefaultTradePairInfo():TRADE_PAIR_INFO{
        return {
            bnb_usd_price: "",
            bnb_value: "",
            from_amount: "",
            from_contract: "",
            from_decimal: 0,
            from_symbol: "",
            from_value: "",
            tax_amount: "",
            tax_perc: "",
            to_amount: "",
            to_contract: "",
            to_decimal: 0,
            to_symbol: "",
            to_value: "",
            trade_type: TRADE_TYPE.NOT_SET,
            usd_price: "",
            usd_value: ""
        };
    }
    public static async getTradeInfo(baseQuoteInfo:BaseQuoteAmountInfo):Promise<TRADE_PAIR_INFO>{
        const tradePairInfo = this.getDefaultTradePairInfo();
        if(baseQuoteInfo.trade_type === TRADE_TYPE.NOT_SET) throw new Error(`trade type not set`);
        if(baseQuoteInfo.trade_type === TRADE_TYPE.BUY){
            tradePairInfo.from_contract = baseQuoteInfo.token1_contract;
            tradePairInfo.from_decimal = baseQuoteInfo.token1_decimal;
            tradePairInfo.from_symbol = baseQuoteInfo.token1_symbol;
            tradePairInfo.from_amount = baseQuoteInfo.token1_amount;
            tradePairInfo.from_value = baseQuoteInfo.token1_value;
            
            tradePairInfo.to_contract = baseQuoteInfo.token0_contract;
            tradePairInfo.to_decimal = baseQuoteInfo.token0_decimal;
            tradePairInfo.to_symbol = baseQuoteInfo.token0_symbol;
            tradePairInfo.to_amount = baseQuoteInfo.token0_amount;
            tradePairInfo.to_value = baseQuoteInfo.token0_value;
        }
        else{
            tradePairInfo.from_contract = baseQuoteInfo.token0_contract;
            tradePairInfo.from_decimal = baseQuoteInfo.token0_decimal;
            tradePairInfo.from_symbol = baseQuoteInfo.token0_symbol;
            tradePairInfo.from_amount = baseQuoteInfo.token0_amount;
            tradePairInfo.from_value = baseQuoteInfo.token0_value;

            tradePairInfo.to_contract = baseQuoteInfo.token1_contract;
            tradePairInfo.to_decimal = baseQuoteInfo.token1_decimal;
            tradePairInfo.to_symbol = baseQuoteInfo.token1_symbol;
            tradePairInfo.to_amount = baseQuoteInfo.token1_amount;
            tradePairInfo.to_value = baseQuoteInfo.token1_value;
        }
        tradePairInfo.usd_value = baseQuoteInfo.usd_value;
        tradePairInfo.bnb_usd_price = await worker_price.getBnbUsdPrice(baseQuoteInfo.time_traded);
        // tradePairInfo.bnb_value =

        return tradePairInfo;
    }
}