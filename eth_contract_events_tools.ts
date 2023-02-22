import {eth_receipt_logs} from "./build/eth_receipt_logs";
import { assert } from "./assert";
import { eth_config } from "./eth_config";
import { eth_receipt_logs_tools } from "./eth_receipt_logs_tools";
import { tools } from "./tools";
import {eth_contract_events} from "./build/eth_contract_events";

export class eth_contract_events_tools{

    //region UTILITIES
    public static isTokenRelated(db_log:eth_receipt_logs):boolean{
        return  eth_receipt_logs_tools.isContractEventLog(db_log)
                || eth_receipt_logs_tools.isPairEventLog(db_log);
    }
    //endregion UTILITIES

    //region CHECKER
    public static async checkAndSaveForTradeEvents(newEvent:eth_contract_events):Promise<eth_contract_events>{
        if(newEvent.recordExists()) throw new Error(`event is already saved`);
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
                throw new Error(`${prop} for new contract event should not be empty`);
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
                throw new Error(`${prop} for new contract event should be numeric. value found ${newEvent[prop]}`);
        }
        const eventCheck = new eth_contract_events();
        await eventCheck.list(
            " WHERE txn_hash=:hash AND logIndex=:logIndex ",
            {
                hash: assert.stringNotEmpty(newEvent.txn_hash),
                logIndex: assert.positiveInt(newEvent.logIndex)
            });
        if(eventCheck.count() > 0)
            throw new Error(`unable to save to trade event, already added to event hash ${newEvent.txn_hash} logIndex ${newEvent.logIndex} `);

        await newEvent.save();
        return newEvent;
    }
    //endregion CHECKER

    //region PROCESS LOGS TO EVENTS
    //loop through events
    //if log isTokenRelated, process
    //time_processed_events
    //endregion PROCESS LOGS TO EVENTS

}