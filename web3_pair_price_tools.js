"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.web3_pair_price_tools = void 0;
const assert_1 = require("./assert");
const config_1 = require("./config");
const eth_config_1 = require("./eth_config");
const eth_worker_1 = require("./eth_worker");
const tools_1 = require("./tools");
const eth_receipt_logs_tools_1 = require("./eth_receipt_logs_tools");
const eth_price_track_header_tools_1 = require("./eth_price_track_header_tools");
const web3_pancake_pair_1 = require("./web3_pancake_pair");
//endregion
/**
 * This class is exclusive for computation without accessing price_track_details
 */
class web3_pair_price_tools {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`web3_pair_price_tools|${method}|${msg}`);
            if (end)
                console.log(`web3_pair_price_tools|${method}|${tools_1.tools.LINE}`);
        }
    }
    //region DEFAULTS
    static getDefaultPairInfo() {
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
    static async getPairInfo(pair_contract) {
        const method = "getPairInfo";
        if (typeof pair_contract !== "string") {
            this.log(`pass thru pairInfo for ${pair_contract.address}`, method);
            return pair_contract;
        }
        this.log(`retrieving pairInfo for ${pair_contract}`, method);
        assert_1.assert.notEmpty(pair_contract, "pair_contract");
        const price_header = await eth_price_track_header_tools_1.eth_price_track_header_tools.getViaIdOrContractStrict(pair_contract);
        const pairInfo = this.convertDbPairHeaderToPairInfo(price_header);
        this.log(`--pair address:${pairInfo.address}`, method);
        return pairInfo;
    }
    static async getPairContractToken0(pair_address) {
        return await web3_pancake_pair_1.web3_pancake_pair.token0Strict(pair_address);
    }
    static async getPairContractToken1(pair_address) {
        return await web3_pancake_pair_1.web3_pancake_pair.token1Strict(pair_address);
    }
    static async getContractInfoFromPair(pair, selected_token_contract) {
        pair = await this.getPairInfo(pair);
        const pair_header = await eth_price_track_header_tools_1.eth_price_track_header_tools.getViaIdOrContractStrict(pair.address);
        const pairPosition = eth_price_track_header_tools_1.eth_price_track_header_tools.getTokenPairPosition(pair_header, selected_token_contract);
        if (pairPosition < 0)
            throw new web3_pair_price_tools_error(`token ${selected_token_contract} not in pair ${pair.address}`);
        const to_return = eth_receipt_logs_tools_1.eth_receipt_logs_tools.getDefaultSwapTradeInfo();
        to_return.contractInfo.address = tools_1.tools.getPropertyValue(pair, `token${pairPosition}_contract`);
        to_return.contractInfo.decimals = tools_1.tools.getPropertyValue(pair, `token${pairPosition}_decimal`);
        to_return.contractInfo.name = tools_1.tools.getPropertyValue(pair, `token${pairPosition}_symbol`);
        to_return.contractInfo.symbol = tools_1.tools.getPropertyValue(pair, `token${pairPosition}_symbol`);
        if (tools_1.tools.isEmpty(to_return.contractInfo.address))
            throw new web3_pair_price_tools_error(`unable to retrieve contract info of ${selected_token_contract} in contract pair ${pair.address}`);
        return to_return;
    }
    static async getOppositeContractPairOf(pair, selected_token_contract) {
        pair = await this.getPairInfo(pair);
        const pair_header = await eth_price_track_header_tools_1.eth_price_track_header_tools.getViaIdOrContractStrict(pair.address);
        const pairPosition = eth_price_track_header_tools_1.eth_price_track_header_tools.getTokenPairPosition(pair_header, selected_token_contract);
        if (pairPosition < 0)
            throw new web3_pair_price_tools_error(`token ${selected_token_contract} not in pair ${pair.address}`);
        const to_return = eth_receipt_logs_tools_1.eth_receipt_logs_tools.getDefaultSwapTradeInfo();
        const oppositePosition = pairPosition === 0 ? 1 : 0;
        to_return.contractInfo.address = tools_1.tools.getPropertyValue(pair, `token${oppositePosition}_contract`);
        to_return.contractInfo.decimals = tools_1.tools.getPropertyValue(pair, `token${oppositePosition}_decimal`);
        to_return.contractInfo.name = tools_1.tools.getPropertyValue(pair, `token${oppositePosition}_symbol`);
        to_return.contractInfo.symbol = tools_1.tools.getPropertyValue(pair, `token${oppositePosition}_symbol`);
        if (tools_1.tools.isEmpty(to_return.contractInfo.address))
            throw new Error(`unable to retrieve other contract info of pair ${pair.address} with selected token_contract:${selected_token_contract}`);
        return to_return;
    }
    static async getBaseTokenInfo(pair) {
        pair = await this.getPairInfo(pair);
        let baseSwapTradeInfo = eth_receipt_logs_tools_1.eth_receipt_logs_tools.getDefaultSwapTradeInfo();
        if (await this.pairIsBnb(pair)) {
            baseSwapTradeInfo = await this.getContractInfoFromPair(pair, eth_config_1.eth_config.getEthContract());
        }
        else if (await this.pairIsUsd(pair)) {
            baseSwapTradeInfo = await this.getContractInfoFromPair(pair, eth_config_1.eth_config.getBusdContract());
        }
        else {
            baseSwapTradeInfo.contractInfo = await eth_worker_1.eth_worker.getContractMetaData(pair.token0_contract);
        }
        return baseSwapTradeInfo;
    }
    static async getQuoteTokenInfo(pair) {
        pair = await this.getPairInfo(pair);
        let quoteSwapTradeInfo = eth_receipt_logs_tools_1.eth_receipt_logs_tools.getDefaultSwapTradeInfo();
        if (await this.pairIsBnb(pair)) {
            quoteSwapTradeInfo = await this.getOppositeContractPairOf(pair, eth_config_1.eth_config.getEthContract());
        }
        else if (await this.pairIsUsd(pair)) {
            quoteSwapTradeInfo = await this.getOppositeContractPairOf(pair, eth_config_1.eth_config.getBusdContract());
        }
        else {
            quoteSwapTradeInfo.contractInfo = await eth_worker_1.eth_worker.getContractMetaData(pair.token1_contract);
        }
        return quoteSwapTradeInfo;
    }
    //endregion GETTERS PAIR INFO
    //region GETTERS RESERVES
    static async getBnbReserve(syncLog, pairInfo) {
        if (!pairInfo)
            pairInfo = await this.getPairInfo(syncLog.ContractInfo.address);
        let reserve;
        if (pairInfo.token0_contract.toLowerCase() === eth_config_1.eth_config.getEthContract().toLowerCase()) {
            reserve = syncLog.reserve0;
        }
        else if (pairInfo.token1_contract.toLowerCase() === eth_config_1.eth_config.getEthContract().toLowerCase()) {
            reserve = syncLog.reserve1;
        }
        if (typeof reserve === "undefined")
            throw new Error(`${pairInfo.pairSymbol} ${pairInfo.address} does not have Bnb token in the pair`);
        return reserve;
    }
    static async getUsdReserve(syncLog, pairInfo) {
        if (!pairInfo)
            pairInfo = await this.getPairInfo(syncLog.ContractInfo.address);
        let reserve;
        if (pairInfo.token0_contract.toLowerCase() === eth_config_1.eth_config.getBusdContract().toLowerCase()) {
            reserve = syncLog.reserve0;
        }
        else if (pairInfo.token1_contract.toLowerCase() === eth_config_1.eth_config.getBusdContract().toLowerCase()) {
            reserve = syncLog.reserve1;
        }
        if (typeof reserve === "undefined")
            throw new Error(`${pairInfo.pairSymbol} ${pairInfo.address} does not have Busd token in the pair`);
        return reserve;
    }
    static async getReserveByToken(syncLog, token_contract, pairInfo) {
        let toReturn = 0n;
        if (!pairInfo)
            pairInfo = await this.getPairInfo(syncLog.ContractInfo.address);
        if (pairInfo.token0_contract.toLowerCase() === token_contract.toLowerCase()) {
            toReturn = syncLog.reserve0;
        }
        else if (pairInfo.token1_contract.toLowerCase() === token_contract.toLowerCase()) {
            toReturn = syncLog.reserve1;
        }
        else {
            throw new Error(`${token_contract} not in pair ${pairInfo.pairSymbol} ${pairInfo.address}`);
        }
        return toReturn;
    }
    static async getTargetTokenReserve(syncLog, pairInfo) {
        if (!pairInfo)
            pairInfo = await this.getPairInfo(syncLog.ContractInfo.address);
        let reserve;
        if (pairInfo.token0_contract.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()) {
            reserve = syncLog.reserve0;
        }
        else if (pairInfo.token1_contract.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()) {
            reserve = syncLog.reserve1;
        }
        if (typeof reserve === "undefined")
            throw new Error(`${pairInfo.pairSymbol} ${pairInfo.address} does not have ${eth_config_1.eth_config.getTokenSymbol()} token in the pair`);
        return reserve;
    }
    //endregion
    //region PRICE VIA PAIR LOG ANALYSIS
    static async computePriceByReserve(syncLog) {
        const method = "computePriceByReserve";
        this.log(`retrieving price by reserve...`, method);
        const pairInfo = await this.getPairInfo(syncLog.ContractInfo.address);
        let baseReserve = syncLog.reserve0;
        let baseDecimal = pairInfo.token0_decimal;
        let baseSymbol = pairInfo.token0_symbol;
        let quoteReserve = syncLog.reserve1;
        let quoteDecimal = pairInfo.token1_decimal;
        let quoteSymbol = pairInfo.token1_symbol;
        this.log(`...initial base reserve:${baseReserve.toString()} ${baseSymbol} ${baseDecimal}`, method);
        this.log(`...initial quote reserve:${quoteReserve.toString()} ${quoteSymbol} ${quoteDecimal}`, method);
        if (await this.pairIsUsd(pairInfo)) {
            this.log(`...pair has usd`, method);
            const oppositeToken = await this.getOppositeContractPairOf(pairInfo, eth_config_1.eth_config.getBusdContract());
            baseReserve = await this.getReserveByToken(syncLog, oppositeToken.contractInfo.address, pairInfo);
            baseDecimal = assert_1.assert.naturalNumber(oppositeToken.contractInfo.decimals);
            baseSymbol = assert_1.assert.stringNotEmpty(oppositeToken.contractInfo.symbol);
            quoteReserve = await this.getUsdReserve(syncLog, pairInfo);
            quoteDecimal = assert_1.assert.naturalNumber(eth_config_1.eth_config.getBusdDecimal());
            quoteSymbol = assert_1.assert.stringNotEmpty(eth_config_1.eth_config.getBusdSymbol());
        }
        else if (await this.pairIsBnb(pairInfo)) {
            this.log(`...pair has bnb`, method);
            const oppositeToken = await this.getOppositeContractPairOf(pairInfo, eth_config_1.eth_config.getEthContract());
            baseReserve = await this.getReserveByToken(syncLog, oppositeToken.contractInfo.address, pairInfo);
            baseDecimal = assert_1.assert.naturalNumber(oppositeToken.contractInfo.decimals);
            baseSymbol = assert_1.assert.stringNotEmpty(oppositeToken.contractInfo.symbol);
            quoteReserve = await this.getBnbReserve(syncLog, pairInfo);
            quoteDecimal = eth_config_1.eth_config.getEthDecimal();
            quoteSymbol = eth_config_1.eth_config.getEthSymbol();
        }
        this.log(`...current base reserve:${baseReserve.toString()} ${baseSymbol} ${baseDecimal}`, method);
        this.log(`...current quote reserve:${quoteReserve.toString()} ${quoteSymbol} ${quoteDecimal}`, method);
        const baseAmount = eth_worker_1.eth_worker.convertValueToAmount(baseReserve.toString(), baseDecimal);
        const quoteAmount = eth_worker_1.eth_worker.convertValueToAmount(quoteReserve.toString(), quoteDecimal);
        this.log(`...base reserve amount ${baseAmount}, quote reserve amount:${quoteAmount}`, method);
        const price = tools_1.tools.toBn(quoteAmount).dividedBy(tools_1.tools.toBn(baseAmount)).toFixed(quoteDecimal);
        this.log(`...computed price:${price}`, method, true);
        return price;
    }
    //endregion
    //region CHECK
    static async pairIsBnb(pair) {
        pair = await this.getPairInfo(pair);
        return pair.token0_contract.toLowerCase() === eth_config_1.eth_config.getEthContract().toLowerCase()
            || pair.token1_contract.toLowerCase() === eth_config_1.eth_config.getEthContract().toLowerCase();
    }
    static async pairIsUsd(pair) {
        pair = await this.getPairInfo(pair);
        return pair.token0_contract.toLowerCase() === eth_config_1.eth_config.getBusdContract().toLowerCase()
            || pair.token1_contract.toLowerCase() === eth_config_1.eth_config.getBusdContract().toLowerCase();
    }
    static async pairHasBnbOrUsd(pair) {
        return await this.pairIsBnb(pair) || await this.pairIsUsd(pair);
    }
    //endregion CHECK
    //region UTILITIES
    static convertDbPairHeaderToPairInfo(pair_header) {
        return {
            address: pair_header.pair_contract,
            orderedPairSymbol: eth_price_track_header_tools_1.eth_price_track_header_tools.getOrderedPairSymbol(pair_header),
            pairSymbol: eth_price_track_header_tools_1.eth_price_track_header_tools.getPairSymbol(pair_header),
            token0_contract: pair_header.token0_contract,
            token0_decimal: pair_header.token0_decimal,
            token0_symbol: pair_header.token0_symbol,
            token1_contract: pair_header.token1_contract,
            token1_decimal: pair_header.token1_decimal,
            token1_symbol: pair_header.token1_symbol
        };
    }
    //endregion UTILITIES
    static supportedTokenForLiquidityForPair() {
        return [
            eth_config_1.eth_config.getEthContract(),
            eth_config_1.eth_config.getBusdContract(),
        ];
    }
}
exports.web3_pair_price_tools = web3_pair_price_tools;
class web3_pair_price_tools_error extends Error {
    constructor(message) {
        super(message);
    }
}
//# sourceMappingURL=web3_pair_price_tools.js.map