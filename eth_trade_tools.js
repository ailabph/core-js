"use strict";
//region TYPES
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_trade_tools = void 0;
//endregion TYPES
const eth_contract_events_1 = require("./build/eth_contract_events");
const assert_1 = require("./assert");
const eth_config_1 = require("./eth_config");
class eth_trade_tools {
    //region GETTERS
    static async getTradeEvents(pairContract, from, to) {
        const events = new eth_contract_events_1.eth_contract_events();
        await events.list(" WHERE pair_contract=:pair AND type IN (:buy,:sell) AND block_time>=:from AND block_time<=:to ", { pair: pairContract, buy: "buy", sell: "sell", from: from, to: to }, ` ORDER BY block_time ASC `);
        return events._dataList;
    }
    //endregion GETTERS
    //region UTILITIES
    static isBot(transaction) {
        const toAddress = assert_1.assert.stringNotEmpty(transaction.toAddress);
        return toAddress.toLowerCase() !== eth_config_1.eth_config.getDexContract().toLowerCase();
    }
}
exports.eth_trade_tools = eth_trade_tools;
//# sourceMappingURL=eth_trade_tools.js.map