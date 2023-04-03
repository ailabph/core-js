
//region TYPES
import {eth_trade} from "./build/eth_trade";

enum TRADE_STATUS{
    PENDING_OPEN = "pending_open",
    OPEN = "open",
    PENDING_CLOSE = "pending_close",
    CLOSE = "close",
}
export { TRADE_STATUS }
//endregion TYPES

import {eth_contract_events} from "./build/eth_contract_events";
import {eth_transaction} from "./build/eth_transaction";
import {assert} from "./assert";
import {eth_config} from "./eth_config";
import {time_helper} from "./time_helper";
import {web3_pair_price_tools} from "./web3_pair_price_tools";
import {eth_worker} from "./eth_worker";
import {web3_token} from "./web3_token";
import {eth_contract_data_tools} from "./eth_contract_data_tools";
import {eth_price_track_header_tools} from "./eth_price_track_header_tools";
import {tools} from "./tools";

export class eth_trade_tools{
    //region GETTERS
    public static async getTradeEvents(pairContract:string,from:number,to:number):Promise<eth_contract_events[]>{
        const events = new eth_contract_events();
        await events.list(
            " WHERE pair_contract=:pair AND type IN (:buy,:sell) AND block_time>=:from AND block_time<=:to "
            ,{ pair:pairContract,buy:"buy",sell:"sell",from:from,to:to }
            , ` ORDER BY block_time ASC `);
        return events._dataList as eth_contract_events[];
    }
    //endregion GETTERS

    //region UTILITIES
    public static async getDefault(base_contract:string, quote_contract:string):Promise<eth_trade>{
        const method = "getDefault";
        const baseInfo = await eth_contract_data_tools.getContractViaAddress(base_contract);
        if(!baseInfo) throw new Error(`${method}|base_contract(${base_contract}) has no info on db or on chain`);
        const quoteInfo = await eth_contract_data_tools.getContractViaAddress(quote_contract);
        if(!quoteInfo) throw new Error(`${method}|quote_contract(${quote_contract}) has no info on db or on chain`);
        const pairInfo = await eth_price_track_header_tools.getViaTokenContracts(base_contract,quote_contract);
        if(!pairInfo) throw new Error(`${method}|no pair info for base(${base_contract}) and quote(${quote_contract})`);
        
        const newTrade = new eth_trade();
        newTrade.pair = pairInfo.pair_contract;
        newTrade.base_contract = base_contract;
        newTrade.base_symbol = baseInfo.symbol;
        newTrade.base_decimal = tools.parseIntSimple(baseInfo.decimals,`baseInfo(${baseInfo.address}).decimals(${baseInfo.address})`);
        newTrade.quote_contract = quote_contract;
        newTrade.quote_symbol = baseInfo.symbol;
        newTrade.quote_decimal = tools.parseIntSimple(quoteInfo.decimals,`quoteInfo(${quoteInfo.address}).decimals(${quoteInfo.decimals})`);
        newTrade.status = TRADE_STATUS.PENDING_OPEN;
        newTrade.open_time_added = time_helper.getCurrentTimeStamp();
        newTrade.open_schedule = newTrade.open_time_added;
        newTrade.open_expiry = newTrade.open_schedule + (60 * 3); // 3 minutes
        newTrade.open_status = TRADE_STATUS.PENDING_OPEN;
        return newTrade;
    }
    public static isBot(transaction:eth_transaction):boolean{
        const toAddress = assert.stringNotEmpty(transaction.toAddress);
        return toAddress.toLowerCase() !== eth_config.getDexContract().toLowerCase();
    }
    //endregion UTILITIES
}