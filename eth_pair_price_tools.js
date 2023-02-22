"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_pair_price_tools = void 0;
const assert_1 = require("./assert");
const config_1 = require("./config");
const eth_config_1 = require("./eth_config");
const eth_rpc_1 = require("./eth_rpc");
const eth_worker_1 = require("./eth_worker");
const tools_1 = require("./tools");
const eth_receipt_logs_tools_1 = require("./eth_receipt_logs_tools");
const eth_price_track_header_1 = require("./build/eth_price_track_header");
const time_helper_1 = require("./time_helper");
const eth_price_track_details_1 = require("./build/eth_price_track_details");
const web3_pancake_factory_1 = require("./web3_pancake_factory");
const eth_price_track_details_tools_1 = require("./eth_price_track_details_tools");
//endregion
class eth_pair_price_tools {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`${this.name}|${method}|${msg}`);
            if (end)
                console.log(tools_1.tools.LINE);
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
    // public static async getPairAddress(token_1:string, token_2:string):Promise<string>{
    //     this.log(`dynamically retrieving pair address of token:${token_1} and token:${token_2}`);
    //     let pairAddress:string = "";
    //     const pairAddressDb = await this.getPairAddressViaDb(token_1,token_2);
    //     if(pairAddressDb){
    //         pairAddress = pairAddressDb;
    //     }
    //     else{
    //         this.log(`-- pair contract not found in db, retry on web3 call...`);
    //         const pairAddressWeb3 = await this.getPairAddressViaWeb3(token_1,token_2);
    //         if(!pairAddressWeb3) throw new Error(`no pair contract found for token:${token_1} token:${token_2}`);
    //         pairAddress = pairAddressWeb3;
    //     }
    //     this.log(`-- pair contract: ${pairAddress}`);
    //     return pairAddress;
    // }
    // public static async getPairAddressViaDb(token_1:string, token_2:string):Promise<string|false>{
    //
    // }
    static async getPairAddressViaWeb3(token_1, token_2) {
        return web3_pancake_factory_1.web3_pancake_factory.getPair(token_1, token_2);
    }
    static async getPairInfo(pair_contract) {
        const method = "getPairInfo";
        if (typeof pair_contract !== "string") {
            this.log(`pass thru pairInfo for ${pair_contract.address}`, method);
            return pair_contract;
        }
        this.log(`retrieving pairInfo for ${pair_contract}`, method);
        assert_1.assert.notEmpty(pair_contract, "pair_contract");
        const pairInfo = this.getDefaultPairInfo();
        const price_header = new eth_price_track_header_1.eth_price_track_header();
        price_header.pair_contract = pair_contract;
        await price_header.fetch();
        if (price_header.recordExists()) {
            this.log(`-- price_header exists, retrieving info`, method);
            pairInfo.token0_contract = price_header.token0_contract;
            pairInfo.token0_symbol = price_header.token0_symbol;
            pairInfo.token0_decimal = price_header.token0_decimal;
            pairInfo.token1_contract = price_header.token1_contract;
            pairInfo.token1_symbol = price_header.token1_symbol;
            pairInfo.token1_decimal = price_header.token1_decimal;
            pairInfo.address = pair_contract;
        }
        else {
            this.log(`--price_header does not exist, processing...`, method);
            pairInfo.token0_contract = await this.getPairContractToken0(pair_contract);
            const token0Info = await eth_worker_1.eth_worker.getContractMetaData(pairInfo.token0_contract);
            pairInfo.token0_symbol = token0Info.symbol;
            pairInfo.token0_decimal = tools_1.tools.parseIntSimple(token0Info.decimals);
            pairInfo.token1_contract = await this.getPairContractToken1(pair_contract);
            const token1Info = await eth_worker_1.eth_worker.getContractMetaData(pairInfo.token1_contract);
            pairInfo.token1_symbol = token1Info.symbol;
            pairInfo.token1_decimal = tools_1.tools.parseIntSimple(token1Info.decimals);
            price_header.token0_contract = pairInfo.token0_contract;
            price_header.token0_symbol = pairInfo.token0_symbol;
            price_header.token0_decimal = pairInfo.token0_decimal;
            price_header.token1_contract = pairInfo.token1_contract;
            price_header.token1_symbol = pairInfo.token1_symbol;
            price_header.token1_decimal = pairInfo.token1_decimal;
            await price_header.save();
        }
        assert_1.assert.notEmpty(price_header.token0_symbol, "token0_symbol getPairInfo");
        assert_1.assert.notEmpty(price_header.token1_symbol, "token1_symbol getPairInfo");
        pairInfo.pairSymbol = pairInfo.token0_symbol + pairInfo.token1_symbol;
        this.log(`--pair address:${pairInfo.address}`, method);
        return pairInfo;
    }
    static async getPriceHeader(pair) {
        pair = await this.getPairInfo(pair);
        const priceHeader = new eth_price_track_header_1.eth_price_track_header();
        priceHeader.pair_contract = pair.address;
        await priceHeader.fetch();
        assert_1.assert.recordExist(priceHeader, `unable to retrieve price header of pair ${pair.address}`);
        return priceHeader;
    }
    static async getPairContractToken0(pair_address) {
        const contract = new (eth_rpc_1.eth_rpc.getWeb3Client()).eth.Contract(eth_config_1.eth_config.getPancakePairAbi(), pair_address);
        const token0 = await contract.methods.token0().call();
        assert_1.assert.isString({ val: token0, prop_name: "token0", strict: true });
        return token0;
    }
    static async getPairContractToken1(pair_address) {
        const contract = new (eth_rpc_1.eth_rpc.getWeb3Client()).eth.Contract(eth_config_1.eth_config.getPancakePairAbi(), pair_address);
        const token1 = await contract.methods.token1().call();
        assert_1.assert.isString({ val: token1, prop_name: "token1", strict: true });
        return token1;
    }
    static async getContractInfoFromPair(pair, selected_token_contract) {
        pair = await this.getPairInfo(pair);
        const to_return = eth_receipt_logs_tools_1.eth_receipt_logs_tools.getDefaultSwapTradeInfo();
        if (pair.token0_contract.toLowerCase() === selected_token_contract.toLowerCase()) {
            to_return.contractInfo.address = pair.token0_contract;
            to_return.contractInfo.decimals = pair.token0_decimal;
            to_return.contractInfo.name = pair.token0_symbol;
            to_return.contractInfo.symbol = pair.token0_symbol;
        }
        if (pair.token1_contract.toLowerCase() === selected_token_contract.toLowerCase()) {
            to_return.contractInfo.address = pair.token1_contract;
            to_return.contractInfo.decimals = pair.token1_decimal;
            to_return.contractInfo.name = pair.token1_symbol;
            to_return.contractInfo.symbol = pair.token1_symbol;
        }
        if (tools_1.tools.isEmpty(to_return.contractInfo.address))
            throw new Error(`unable to retrieve contract info of ${selected_token_contract} in contract pair ${pair.address}`);
        return to_return;
    }
    static async getOppositeContractPairOf(pair, selected_token_contract) {
        pair = await this.getPairInfo(pair);
        const to_return = eth_receipt_logs_tools_1.eth_receipt_logs_tools.getDefaultSwapTradeInfo();
        if (pair.token0_contract.toLowerCase() === selected_token_contract.toLowerCase()) {
            to_return.contractInfo.address = pair.token1_contract;
            to_return.contractInfo.decimals = pair.token1_decimal;
            to_return.contractInfo.symbol = pair.token1_symbol;
        }
        else if (pair.token1_contract.toLowerCase() === selected_token_contract.toLowerCase()) {
            to_return.contractInfo.address = pair.token0_contract;
            to_return.contractInfo.decimals = pair.token0_decimal;
            to_return.contractInfo.symbol = pair.token0_symbol;
        }
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
    static async getPairSymbol(pair) {
        pair = await this.getPairInfo(pair);
        const baseInfo = await this.getBaseTokenInfo(pair);
        const quoteInfo = await this.getQuoteTokenInfo(pair);
        return `${baseInfo.contractInfo.symbol.toUpperCase()}${quoteInfo.contractInfo.symbol.toUpperCase()}`;
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
    //region PRICE VIA PRICE_TRACK_DETAILS
    static async getWhereParamOrderForPriceQuery(time_or_log) {
        let toReturn = { order: "", param: {}, where: "" };
        if (typeof time_or_log === "string" || typeof time_or_log === "number") {
            toReturn.where = " WHERE blockTime<=:time ";
            toReturn.param["time"] = time_helper_1.time_helper.getTime(time_or_log, "UTC").unix();
            toReturn.order = " ORDER BY blockTime DESC, logIndex DESC LIMIT 1 ";
        }
        else {
            toReturn.where = " WHERE blockNumber=:blockNumber AND logIndex<=:logIndex ";
            toReturn.param["blockNumber"] = assert_1.assert.positiveInt(time_or_log.blockNumber);
            toReturn.param["logIndex"] = assert_1.assert.naturalNumber(time_or_log.logIndex);
            toReturn.order = " ORDER BY logIndex DESC LIMIT 1 ";
        }
        return toReturn;
    }
    static async buildQueryForPrice(time_or_log) {
        let toReturn = { order: "", param: {}, where: "" };
        let timeStamp;
        let blockNumber;
        let logIndex;
        if (typeof time_or_log === "string" || typeof time_or_log === "number") {
            timeStamp = time_helper_1.time_helper.getTime(time_or_log, "UTC").unix();
        }
        else {
            timeStamp = assert_1.assert.positiveInt(time_or_log.blockTime);
            blockNumber = assert_1.assert.positiveInt(time_or_log.blockNumber);
            logIndex = assert_1.assert.naturalNumber(time_or_log.logIndex);
        }
        timeStamp = assert_1.assert.isDefined(timeStamp);
        let timeStampWhere = " blockTime<=:blockTime ";
        toReturn.param["blockTime"] = timeStamp;
        let blockInfoWhere = "";
        if (tools_1.tools.isNumber(blockNumber)) {
            blockNumber = assert_1.assert.isDefined(blockNumber);
            logIndex = assert_1.assert.isDefined(logIndex);
            blockInfoWhere = ` OR (blockNumber=:blockNumber AND logIndex<=:logIndex) `;
            toReturn.param["blockNumber"] = blockNumber;
            toReturn.param["logIndex"] = logIndex;
        }
        toReturn.where = ` WHERE (${timeStampWhere} ${blockInfoWhere}) `;
        toReturn.order = ` ORDER BY blockNumber DESC, logIndex DESC LIMIT 1 `;
        return toReturn;
    }
    static async getBaseQuotePrice(time_or_log, pair_contract) {
        const method = "getBaseQuotePrice";
        this.log(`retrieving base quote price for pair ${pair_contract}`, method);
        // let queryDetails = await this.getWhereParamOrderForPriceQuery(time_or_log);
        let queryDetails = await this.buildQueryForPrice(time_or_log);
        const pairInfo = await this.getPairInfo(pair_contract);
        this.log(`-- pair ${pairInfo.pairSymbol}`, method);
        const price_header = await this.getPriceHeader(pairInfo);
        queryDetails.where += " AND header_id=:header_id ";
        queryDetails.param["header_id"] = assert_1.assert.positiveInt(price_header.id);
        const searchPrice = new eth_price_track_details_1.eth_price_track_details();
        await searchPrice.list(queryDetails.where, queryDetails.param, queryDetails.order);
        if (searchPrice.count() === 0)
            throw new Error(`unable to retrieve price of pair ${pairInfo.pairSymbol} ${pairInfo.address}`);
        let baseQuotePrice = "0";
        for (const price_detail of searchPrice._dataList) {
            if (!tools_1.tools.isNumeric(price_detail.price))
                throw new Error(`price:${price_detail.price} is not numeric. price_detail_id:${price_detail.id}`);
            console.log(`price ref: ${price_detail.transactionHash} ${price_detail.blockNumber} ${price_detail.logIndex}`);
            baseQuotePrice = price_detail.price;
        }
        return baseQuotePrice;
    }
    static async getBnbUsdPrice(time_or_log) {
        return eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbUsdPrice(time_or_log);
    }
    // TOKEN BNB
    static async getTokenBnbPrice(time_or_log) {
        const tokenBnbContract = eth_config_1.eth_config.getTokenBnbPairContract();
        return await this.getBaseQuotePrice(time_or_log, tokenBnbContract);
    }
    static async getTokenBnbValue(time_or_log, token_amount) {
        assert_1.assert.naturalNumber(token_amount);
        const tokenBnbContract = eth_config_1.eth_config.getTokenBnbPairContract();
        const tokenBnbPrice = await this.getTokenBnbPrice(time_or_log);
        return tools_1.tools.toBn(tokenBnbPrice).multipliedBy(tools_1.tools.toBn(token_amount)).toFixed(18);
    }
    // TOKEN USD
    // public static async getTokenUsdPrice(time_or_log:number|string|eth_receipt_logs):Promise<string>{}
    // public static async getTokenUsdValue(){}
    // public static async getOtherTokenBnbValue(time_or_log:number|string|eth_receipt_logs, pair:string|PAIR_INFO, token_amount:string):Promise<string>{
    //     pair = await this.getPairInfo(pair);
    //     const
    // }
    //endregion PRICE VIA PRICE_TRACK_DETAILS
    //region PRICE VIA PAIR LOG ANALYSIS
    static async computePriceByReserve(syncLog) {
        const pairInfo = await this.getPairInfo(syncLog.ContractInfo.address);
        let baseReserve = syncLog.reserve0;
        let quoteReserve = syncLog.reserve1;
        let quoteDecimal = pairInfo.token1_decimal;
        if (await this.pairIsUsd(pairInfo)) {
            const oppositeToken = await this.getOppositeContractPairOf(pairInfo, eth_config_1.eth_config.getBusdContract());
            baseReserve = await this.getReserveByToken(syncLog, oppositeToken.contractInfo.address, pairInfo);
            quoteReserve = await this.getUsdReserve(syncLog, pairInfo);
            quoteDecimal = 18;
        }
        else if (await this.pairIsBnb(pairInfo)) {
            const oppositeToken = await this.getOppositeContractPairOf(pairInfo, eth_config_1.eth_config.getEthContract());
            baseReserve = await this.getReserveByToken(syncLog, oppositeToken.contractInfo.address, pairInfo);
            quoteReserve = await this.getBnbReserve(syncLog, pairInfo);
            quoteDecimal = 18;
        }
        return tools_1.tools.toBn(quoteReserve.toString()).dividedBy(tools_1.tools.toBn(baseReserve.toString())).toFixed(quoteDecimal);
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
    static supportedTokenForLiquidityForPair() {
        return [
            eth_config_1.eth_config.getEthContract(),
            eth_config_1.eth_config.getBusdContract(),
        ];
    }
}
exports.eth_pair_price_tools = eth_pair_price_tools;
//# sourceMappingURL=eth_pair_price_tools.js.map