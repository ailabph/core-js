"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_price_track_details_tools = exports.ORDER = void 0;
const eth_price_track_details_1 = require("./build/eth_price_track_details");
const assert_1 = require("./assert");
const config_1 = require("./config");
const eth_config_1 = require("./eth_config");
const tools_1 = require("./tools");
const eth_price_track_header_tools_1 = require("./eth_price_track_header_tools");
const time_helper_1 = require("./time_helper");
const eth_contract_data_tools_1 = require("./eth_contract_data_tools");
var ORDER;
(function (ORDER) {
    ORDER["ASC"] = "ASC";
    ORDER["DESC"] = "DESC";
})(ORDER || (ORDER = {}));
exports.ORDER = ORDER;
/**
 * This class is exclusive for price retrieval or computation via db only
 */
class eth_price_track_details_tools {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`eth_price_track_details_tools|${method}|${msg}`);
            if (end)
                console.log(`eth_price_track_details_tools|${method}|${tools_1.tools.LINE}`);
        }
    }
    static async getDetails(header, { from_time = 0, to_time = 0, log = undefined, order = ORDER.DESC, limit = 1 }, strict = false) {
        const method = `getDetails`;
        this.log(`retrieving price details. establishing header`, method);
        const details = new eth_price_track_details_1.eth_price_track_details();
        try {
            const retrievedHeader = await eth_price_track_header_tools_1.eth_price_track_header_tools.getViaIdOrContractStrict(header);
            const orderString = ` ORDER BY blockNumber ${order}, logIndex ${order} LIMIT ${limit} `;
            if (log) {
                this.log(`db log passed, retrieving via blockNumber(${log.blockNumber}) and logIndex(${log.logIndex})`, method);
                const blockNumber = assert_1.assert.positiveNumber(log.blockNumber, `${method}|log.blockNumber`);
                const logIndex = assert_1.assert.naturalNumber(log.logIndex, `${method}|log.logIndex`);
                await details.list(" WHERE header_id=:header_id AND blockNumber=:blockNumber AND logIndex<=:logIndex ", { header_id: retrievedHeader.id, blockNumber: blockNumber, logIndex: logIndex }, orderString);
            }
            if (details.count() === 0) {
                if (log) {
                    this.log(`no details found via logs method, retrieving via timestamp`, method);
                }
                let where = " WHERE header_id=:header_id ";
                let param = {};
                param["header_id"] = assert_1.assert.positiveNumber(retrievedHeader.id);
                if (from_time > 0) {
                    const fromTimeInfo = time_helper_1.time_helper.getTime(from_time, "UTC");
                    this.log(`from ${fromTimeInfo.format(time_helper_1.TIME_FORMATS.READABLE)}`, method);
                    where += " AND blockTime>=:from ";
                    param["from"] = from_time;
                }
                else {
                    this.log(`no from_time info`, method);
                }
                if (to_time > 0) {
                    const toTimeInfo = time_helper_1.time_helper.getTime(to_time, "UTC");
                    this.log(`to ${toTimeInfo.format(time_helper_1.TIME_FORMATS.READABLE)}`, method);
                    where += " AND blockTime<=:to ";
                    param["to"] = to_time;
                }
                else {
                    if (log) {
                        const toTimeInfo = time_helper_1.time_helper.getTime(log.blockTime, "UTC");
                        this.log(`no to time info specified, using time in db_log `, method);
                        this.log(`to ${toTimeInfo.format(time_helper_1.TIME_FORMATS.READABLE)}`, method);
                        where += " AND blockTime<=:to ";
                        param["to"] = toTimeInfo.unix();
                    }
                }
                this.log(`current query ${where}`, method);
                await details.list(where, param, orderString);
            }
        }
        catch (e) {
            if (e instanceof Error) {
                this.log(e.message, method, true, true);
                if (strict)
                    throw new eth_price_track_details_tools_error(e.message);
            }
            return false;
        }
        if (details.count() === 1) {
            const item = details._dataList[0];
            this.log(`found blockNumber ${item.blockNumber} logIndex ${item.logIndex}`, method);
        }
        this.log(`found:${details.count()}`, method, true);
        return details;
    }
    static async getDetail(header, time_or_log, strict = false) {
        const method = "getDetail";
        let detail = new eth_price_track_details_1.eth_price_track_details();
        try {
            header = await eth_price_track_header_tools_1.eth_price_track_header_tools.getViaIdOrContractStrict(header);
            this.log(`retrieving price detail for ${eth_price_track_header_tools_1.eth_price_track_header_tools.getOrderedPairSymbol(header)} ${tools_1.tools.lastSubstring(header.pair_contract, 6)}`, method);
            const arg = {};
            arg["order"] = ORDER.DESC;
            arg["limit"] = 1;
            if (typeof time_or_log === "number" || typeof time_or_log === "string") {
                this.log(`time argument passed:${time_or_log}`, method);
                const timeInfo = time_helper_1.time_helper.getTime(time_or_log, "UTC");
                arg["to_time"] = timeInfo.unix();
            }
            else {
                this.log(`db log argument passed`, method);
                arg["log"] = time_or_log;
            }
            const details = await this.getDetails(header, arg, strict);
            if (!details)
                throw new Error(`no price details found`);
            if (details.count() === 0)
                throw new Error(`no price details found`);
            detail = details.getItem();
        }
        catch (e) {
            if (e instanceof Error) {
                this.log(e.message, method, true, true);
                if (strict)
                    throw new eth_price_track_details_tools_error(e.message);
            }
        }
        return detail;
    }
    static async getPrice(header, time_or_log, strict = false) {
        const method = "getPrice";
        this.log(`retrieving price`, method);
        let price = "0.00";
        try {
            header = await eth_price_track_header_tools_1.eth_price_track_header_tools.getViaIdOrContractStrict(header);
            this.log(`...on pair ${eth_price_track_header_tools_1.eth_price_track_header_tools.getOrderedPairSymbol(header)} ${header.pair_contract}`, method);
            const detail = await this.getDetail(header, time_or_log, strict);
            if (detail.isNew())
                throw new Error(`no price detail found`);
            this.log(`...price retrieved ${detail.price} on ${detail.blockNumber} ${detail.transactionHash} ${detail.logIndex} during ${time_helper_1.time_helper.getAsFormat(detail.blockTime, time_helper_1.TIME_FORMATS.ISO, "UTC")}`, method);
            price = assert_1.assert.isNumeric(detail.price, `eth_price_track_detail.price(${detail.price}) is not numeric`);
        }
        catch (e) {
            this.log(`ERROR`, method, false, true);
            if (e instanceof Error) {
                this.log(e.message, method, true, true);
                if (strict)
                    throw new eth_price_track_details_tools_error(e.message);
            }
        }
        return price;
    }
    static async getBnbPrice(header, time_or_log, strict = false) {
        const method = "getBnbPrice";
        let bnb_price = "0.00";
        try {
            header = await eth_price_track_header_tools_1.eth_price_track_header_tools.getViaIdOrContractStrict(header);
            this.log(`retrieving bnb price of pair ${eth_price_track_header_tools_1.eth_price_track_header_tools.getOrderedPairSymbol(header)} ${header.pair_contract}`, method);
            const detail = await this.getDetail(header, time_or_log, strict);
            if (detail.isNew())
                throw new Error(`no price detail found`);
            const price_bnb = assert_1.assert.stringNotEmpty(detail.price_bnb, "detail.price_bnb");
            bnb_price = assert_1.assert.isNumeric(price_bnb, `eth_price_track_detail.price_bnb(${detail.price_bnb}) is not numeric`);
        }
        catch (e) {
            if (e instanceof Error) {
                this.log(e.message, method, true, true);
                if (strict)
                    throw new eth_price_track_details_tools_error(e.message);
            }
        }
        return bnb_price;
    }
    static async getUsdPrice(header, time_or_log, strict = false) {
        const method = "getUsdPrice";
        let usd_price = "0.00";
        try {
            header = await eth_price_track_header_tools_1.eth_price_track_header_tools.getViaIdOrContractStrict(header);
            this.log(`retrieving usd price of pair ${eth_price_track_header_tools_1.eth_price_track_header_tools.getOrderedPairSymbol(header)} ${header.pair_contract}`, method);
            const detail = await this.getDetail(header, time_or_log, strict);
            if (detail.isNew())
                throw new Error(`no price detail found`);
            const price_usd = assert_1.assert.stringNotEmpty(detail.price_usd, "detail.price_usd");
            usd_price = assert_1.assert.isNumeric(price_usd, `eth_price_track_detail.price_usd(${detail.price_usd}) is not numeric`);
        }
        catch (e) {
            if (e instanceof Error) {
                this.log(e.message, method, true, true);
                if (strict)
                    throw new eth_price_track_details_tools_error(e.message);
            }
        }
        return usd_price;
    }
    static async getBnbUsdPrice(time_or_log) {
        return this.getPrice(eth_config_1.eth_config.getBnbUsdPairContract(), time_or_log);
    }
    static async getBnbUsdValue(time_or_log, token_amount) {
        const bnbUsdPrice = await this.getBnbUsdPrice(time_or_log);
        return tools_1.tools.toBn(bnbUsdPrice).multipliedBy(tools_1.tools.toBn(token_amount)).toFixed(eth_config_1.eth_config.getBusdDecimal());
    }
    static async getBnbTokenPrice(time_or_log, token) {
        const method = "getBnbTokenPrice";
        let price = "0.00";
        token = await eth_contract_data_tools_1.eth_contract_data_tools.getContractDynamicStrict(token);
        this.log(`token symbol:${token.symbol} ${token.address}`, method);
        const tokenBnbPair = await eth_price_track_header_tools_1.eth_price_track_header_tools.getViaTokenContracts(eth_config_1.eth_config.getEthContract(), token.address, false);
        if (!tokenBnbPair) {
            this.log(`WBNB${token.symbol.toUpperCase()} pair does not exists`, method);
        }
        else {
            this.log(`bnb pair found:${tokenBnbPair.pair_contract}`, method);
            price = await this.getBnbPrice(tokenBnbPair, time_or_log, false);
        }
        return assert_1.assert.isNumeric(price, `${method}|price`);
    }
    static async getBnbTokenValue(time_or_log, token, token_amount) {
        const method = "getBnbTokenValue";
        token_amount = assert_1.assert.isNumeric(token_amount);
        token = await eth_contract_data_tools_1.eth_contract_data_tools.getContractDynamicStrict(token);
        this.log(`retrieving bnb token value of ${token_amount} ${token.symbol}`, method);
        const bnbTokenPrice = await this.getBnbTokenPrice(time_or_log, token);
        return tools_1.tools.toBn(bnbTokenPrice).multipliedBy(tools_1.tools.toBn(token_amount)).toFixed(eth_config_1.eth_config.getEthDecimal());
    }
}
exports.eth_price_track_details_tools = eth_price_track_details_tools;
class eth_price_track_details_tools_error extends Error {
    constructor(message) {
        super(message);
    }
}
//# sourceMappingURL=eth_price_track_details_tools.js.map