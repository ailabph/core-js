
//region TYPES

//endregion TYPES

import {eth_contract_events} from "./build/eth_contract_events";
import {eth_transaction} from "./build/eth_transaction";
import {assert} from "./assert";
import {eth_config} from "./eth_config";

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
    public static isBot(transaction:eth_transaction):boolean{
        const toAddress = assert.stringNotEmpty(transaction.toAddress);
        return toAddress.toLowerCase() !== eth_config.getDexContract().toLowerCase();
    }
    //endregion UTILITIES
}