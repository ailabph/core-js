"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_contract_events_tools = void 0;
const assert_1 = require("./assert");
const eth_receipt_logs_tools_1 = require("./eth_receipt_logs_tools");
const tools_1 = require("./tools");
const eth_contract_events_1 = require("./build/eth_contract_events");
class eth_contract_events_tools {
    //region UTILITIES
    static isTokenRelated(db_log) {
        return eth_receipt_logs_tools_1.eth_receipt_logs_tools.isContractEventLog(db_log)
            || eth_receipt_logs_tools_1.eth_receipt_logs_tools.isPairEventLog(db_log);
    }
    //endregion UTILITIES
    //region CHECKER
    static async checkAndSaveForTradeEvents(newEvent) {
        if (newEvent.recordExists())
            throw new Error(`event is already saved`);
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
        for (const prop of propertiesThatShouldNotBeEmpty) {
            if (tools_1.tools.isEmpty(newEvent[prop]))
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
        for (const prop of propertiesThatShouldBeNumeric) {
            if (!tools_1.tools.isNumeric(newEvent[prop]))
                throw new Error(`${prop} for new contract event should be numeric. value found ${newEvent[prop]}`);
        }
        const eventCheck = new eth_contract_events_1.eth_contract_events();
        await eventCheck.list(" WHERE txn_hash=:hash AND logIndex=:logIndex ", {
            hash: assert_1.assert.stringNotEmpty(newEvent.txn_hash),
            logIndex: assert_1.assert.positiveInt(newEvent.logIndex)
        });
        if (eventCheck.count() > 0)
            throw new Error(`unable to save to trade event, already added to event hash ${newEvent.txn_hash} logIndex ${newEvent.logIndex} `);
        await newEvent.save();
        return newEvent;
    }
}
exports.eth_contract_events_tools = eth_contract_events_tools;
//# sourceMappingURL=eth_contract_events_tools.js.map