import {eth_receipt_logs} from "./build/eth_receipt_logs";
import { assert } from "./assert";
import { eth_config } from "./eth_config";
import { eth_receipt_logs_tools } from "./eth_receipt_logs_tools";
import { tools } from "./tools";
import {eth_contract_events} from "./build/eth_contract_events";
import {config} from "./config";

export class eth_contract_events_tools{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`eth_contract_events_tools|${method}|${msg}`);
            if(end) console.log(`eth_contract_events_tools|${method}|${tools.LINE}`);
        }
    }

    //region UTILITIES
    public static isTokenRelated(db_log:eth_receipt_logs,has_usd_pair:boolean = false):boolean{
        return  eth_receipt_logs_tools.isContractEventLog(db_log)
                || eth_receipt_logs_tools.isPairEventLog(db_log,has_usd_pair);
    }
    //endregion UTILITIES

    //region CHECKER
    public static async checkAndSaveForTradeEvents(newEvent:eth_contract_events):Promise<eth_contract_events>{
        const method = `checkAndSaveForTradeEvents`;
        if(newEvent.recordExists()) throw new eth_contract_events_tools_error(`${method}|event is already saved`);
        const propertiesThatShouldNotBeEmpty = [
            "txn_hash",
            "pair_contract",
            "type",
            "method",
            "log_method",
            "fromAddress",
            "fromContract",
            "fromSymbol",
            "fromDecimal",
            "fromAmount",
            "fromAmountGross",
            "toContract",
            "toSymbol",
            "toDecimal",
            "toAmount",
            "toAmountGross",
        ];
        for(const prop of propertiesThatShouldNotBeEmpty as string[]) {
            if (tools.isEmpty(newEvent[prop]))
                throw new eth_contract_events_tools_error(`${method}|${prop} for new contract event should not be empty`);
        }
        const propertiesThatShouldBeNumeric = [
            "blockNumber",
            "logIndex",
            "fromAmount",
            "fromAmountGross",
            "toAmount",
            "toAmountGross",
            "tax_amount",
            "tax_percentage",
            "block_time",
            "bnb_usd",
            "token_bnb",
            "token_bnb_value",
            "token_usd",
            "token_usd_value",
        ];
        for(const prop of propertiesThatShouldBeNumeric as any[]){
            if(!tools.isNumeric(newEvent[prop]))
                throw new eth_contract_events_tools_error(`${method}|${prop} for new contract event should be numeric. value found ${newEvent[prop]}`);
        }
        const eventCheck = new eth_contract_events();
        await eventCheck.list(
            " WHERE txn_hash=:hash AND logIndex=:logIndex ",
            {
                hash: assert.stringNotEmpty(newEvent.txn_hash,`${method} newEvent.txn_hash`),
                logIndex: assert.positiveInt(newEvent.logIndex,`${method} newEvent.logIndex`)
            });
        if(eventCheck.count() > 0)
            throw new eth_contract_events_tools_error(`${method}|unable to save to trade event, already added to event hash ${newEvent.txn_hash} logIndex ${newEvent.logIndex} `);

        await newEvent.save();
        return newEvent;
    }
    //endregion CHECKER

    //region GETTER
    public static async get_event_by_hash(txn_hash:unknown, type:string = ""):Promise<eth_contract_events>{
        if(typeof txn_hash !== "string") throw new Error(`invalid txn_hash, must be a string`);
        if(tools.isNullish(txn_hash)) throw new Error(`invalid txn_hash, must not be null`);
        if(tools.isEmpty(txn_hash)) throw new Error(`invalid txn_hash, must not be empty`);
        const q = new eth_contract_events();
        q.txn_hash = txn_hash;
        if(type !== "") q.type = type;
        await q.fetch();
        if(q.isNew()) throw new Error(`unable to retrieve event with hash ${txn_hash}`);
        return q;
    }
    public static async get_buy_event_by_hash(txn_hash:unknown):Promise<eth_contract_events>{
        try{
            return await this.get_event_by_hash(txn_hash,"buy");
        }catch (e) {
            throw new Error(`unable to retrieve buy event with hash ${txn_hash}`);
        }
    }
    //endregion GETTER

}

class eth_contract_events_tools_error extends Error{
    constructor(message:string) {
        super(message);
    }
}