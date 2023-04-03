"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_trade_tools = exports.TRADE_STATUS = void 0;
//region TYPES
const eth_trade_1 = require("./build/eth_trade");
var TRADE_STATUS;
(function (TRADE_STATUS) {
    TRADE_STATUS["PENDING_OPEN"] = "pending_open";
    TRADE_STATUS["OPEN"] = "open";
    TRADE_STATUS["PENDING_CLOSE"] = "pending_close";
    TRADE_STATUS["CLOSE"] = "close";
})(TRADE_STATUS || (TRADE_STATUS = {}));
exports.TRADE_STATUS = TRADE_STATUS;
//endregion TYPES
const eth_contract_events_1 = require("./build/eth_contract_events");
const assert_1 = require("./assert");
const eth_config_1 = require("./eth_config");
const time_helper_1 = require("./time_helper");
const eth_contract_data_tools_1 = require("./eth_contract_data_tools");
const eth_price_track_header_tools_1 = require("./eth_price_track_header_tools");
const tools_1 = require("./tools");
class eth_trade_tools {
    //region GETTERS
    static async getTradeEvents(pairContract, from, to) {
        const events = new eth_contract_events_1.eth_contract_events();
        await events.list(" WHERE pair_contract=:pair AND type IN (:buy,:sell) AND block_time>=:from AND block_time<=:to ", { pair: pairContract, buy: "buy", sell: "sell", from: from, to: to }, ` ORDER BY block_time ASC `);
        return events._dataList;
    }
    //endregion GETTERS
    //region UTILITIES
    static async getDefault(base_contract, quote_contract) {
        const method = "getDefault";
        const baseInfo = await eth_contract_data_tools_1.eth_contract_data_tools.getContractViaAddress(base_contract);
        if (!baseInfo)
            throw new Error(`${method}|base_contract(${base_contract}) has no info on db or on chain`);
        const quoteInfo = await eth_contract_data_tools_1.eth_contract_data_tools.getContractViaAddress(quote_contract);
        if (!quoteInfo)
            throw new Error(`${method}|quote_contract(${quote_contract}) has no info on db or on chain`);
        const pairInfo = await eth_price_track_header_tools_1.eth_price_track_header_tools.getViaTokenContracts(base_contract, quote_contract);
        if (!pairInfo)
            throw new Error(`${method}|no pair info for base(${base_contract}) and quote(${quote_contract})`);
        const newTrade = new eth_trade_1.eth_trade();
        newTrade.pair = pairInfo.pair_contract;
        newTrade.base_contract = base_contract;
        newTrade.base_symbol = baseInfo.symbol;
        newTrade.base_decimal = tools_1.tools.parseIntSimple(baseInfo.decimals, `baseInfo(${baseInfo.address}).decimals(${baseInfo.address})`);
        newTrade.quote_contract = quote_contract;
        newTrade.quote_symbol = baseInfo.symbol;
        newTrade.quote_decimal = tools_1.tools.parseIntSimple(quoteInfo.decimals, `quoteInfo(${quoteInfo.address}).decimals(${quoteInfo.decimals})`);
        newTrade.status = TRADE_STATUS.PENDING_OPEN;
        newTrade.open_time_added = time_helper_1.time_helper.getCurrentTimeStamp();
        newTrade.open_schedule = newTrade.open_time_added;
        newTrade.open_expiry = newTrade.open_schedule + (60 * 3); // 3 minutes
        newTrade.open_status = TRADE_STATUS.PENDING_OPEN;
        return newTrade;
    }
    static isBot(transaction) {
        const toAddress = assert_1.assert.stringNotEmpty(transaction.toAddress);
        return toAddress.toLowerCase() !== eth_config_1.eth_config.getDexContract().toLowerCase();
    }
}
exports.eth_trade_tools = eth_trade_tools;
//# sourceMappingURL=eth_trade_tools.js.map