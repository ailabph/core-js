"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_price_track_header_tools = void 0;
const eth_price_track_header_1 = require("./build/eth_price_track_header");
const assert_1 = require("./assert");
const config_1 = require("./config");
const eth_config_1 = require("./eth_config");
const tools_1 = require("./tools");
const eth_contract_data_tools_1 = require("./eth_contract_data_tools");
const web3_pancake_factory_1 = require("./web3_pancake_factory");
const web3_pancake_pair_1 = require("./web3_pancake_pair");
const web3_tools_1 = require("./web3_tools");
class eth_price_track_header_tools {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`eth_price_track_header_tools|${method}|${msg}`);
            if (end)
                console.log(`eth_price_track_header_tools|${method}|${tools_1.tools.LINE}`);
        }
    }
    //region UTILITIES
    static getPairSymbol(header, separator = "") {
        const method = "getPairSymbol";
        const token0_symbol = assert_1.assert.stringNotEmpty(header.token0_symbol, `${method} header.token0_symbol`);
        const token1_symbol = assert_1.assert.stringNotEmpty(header.token1_symbol, `${method} header.token0_symbol`);
        return `${token0_symbol.toUpperCase()}${separator}${token1_symbol}`;
    }
    static getOrderedPairSymbol(header, separator = "") {
        const method = "getOrderedPairSymbol";
        let base_position = 0;
        if (this.pairHasBusd(header)) {
            this.log("has BUSD token in pair", method, true);
            base_position = this.pairBusdPosition(header);
        }
        else if (this.pairHasBnb(header)) {
            this.log("has BNB token in pair", method, true);
            base_position = this.pairBnbPosition(header);
        }
        else {
            this.log("has no BNB or BUSD token in pair", method, true);
        }
        return web3_tools_1.web3_tools.getOrderedPair(header.token0_symbol, header.token1_symbol, base_position, separator);
    }
    /**
     * checks for the position of a given token address in the pair.
     * returns 0 or 1 if found.
     * returns -1 if not found.
     */
    static getTokenPairPosition(header, token_address) {
        if (header.token0_contract.toLowerCase() === token_address.toLowerCase())
            return 0;
        if (header.token1_contract.toLowerCase() === token_address.toLowerCase())
            return 1;
        return -1;
    }
    static pairBusdPosition(header) {
        return this.getTokenPairPosition(header, eth_config_1.eth_config.getBusdContract());
    }
    static pairHasBusd(header) {
        return this.pairBusdPosition(header) >= 0;
    }
    static pairBnbPosition(header) {
        return this.getTokenPairPosition(header, eth_config_1.eth_config.getEthContract());
    }
    static pairHasBnb(header) {
        return this.pairBnbPosition(header) >= 0;
    }
    //endregion UTILITIES
    //region GET RECORD
    static async getViaTokenContracts(token0, token1, strict = false) {
        const method = "getViaTokenContracts";
        this.log(`retrieving pair from db of token0:${token0} token1:${token1}`, method);
        assert_1.assert.notEmpty(token0, "token0");
        assert_1.assert.notEmpty(token1, "token1");
        let pairToReturn = new eth_price_track_header_1.eth_price_track_header();
        const pair = new eth_price_track_header_1.eth_price_track_header();
        await pair.list(" WHERE (token0_contract=:token0 AND token1_contract=:token1) " +
            " OR (token1_contract=:token1 AND token0_contract=:token1) ", { token0: token0, token1: token1 }, " LIMIT 1 ");
        if (pair.count() === 0) {
            this.log(`pair not on db, retrieving pair info on chain`, method);
            try {
                const token0Info = await eth_contract_data_tools_1.eth_contract_data_tools.getContractViaAddressStrict(token0);
                const token1Info = await eth_contract_data_tools_1.eth_contract_data_tools.getContractViaAddressStrict(token1);
                const pairAddress = await web3_pancake_factory_1.web3_pancake_factory.getPair(token0Info.address, token1Info.address);
                if (!pairAddress)
                    throw new Error(`unable to retrieve pair address of ${token0} and ${token1}`);
                this.log(`pair address found on chain: ${pairAddress}`, method);
                this.log(`checking if pair contract on db`, method);
                const checkPairExists = new eth_price_track_header_1.eth_price_track_header();
                checkPairExists.pair_contract = pairAddress;
                await checkPairExists.fetch();
                if (checkPairExists.recordExists()) {
                    this.log(`pair in db`, method);
                    pairToReturn = checkPairExists;
                }
                else {
                    pairToReturn.pair_contract = pairAddress;
                    pairToReturn.token0_contract = token0Info.address;
                    pairToReturn.token0_symbol = token0Info.symbol;
                    pairToReturn.token0_decimal = assert_1.assert.naturalNumber(token0Info.decimals);
                    pairToReturn.token1_contract = token1Info.address;
                    pairToReturn.token1_symbol = token1Info.symbol;
                    pairToReturn.token1_decimal = assert_1.assert.naturalNumber(token1Info.decimals);
                    this.log(`saving new pair`, method);
                    await pairToReturn.save();
                }
            }
            catch (e) {
                if (e instanceof Error) {
                    this.log(e.message, method, true, true);
                    if (strict)
                        throw new eth_price_track_header_tools_error(e.message);
                }
                return false;
            }
        }
        pairToReturn = pair.getItem();
        return pairToReturn;
    }
    static async getViaIdOrContract(header, strict = false) {
        const method = "getViaIdOrContract";
        this.log(`retrieving price_track_header via...`, method);
        if (typeof header === "number") {
            const header_id = header;
            this.log(`...id ${header_id}, retrieving on db`, method);
            header = new eth_price_track_header_1.eth_price_track_header();
            header.id = header_id;
            await header.fetch();
            if (header.isNew())
                throw new eth_price_track_header_tools_error(`not on db and unable to retrieve on chain with just id`);
        }
        else if (typeof header === "string") {
            const contract_address = header;
            this.log(`...address ${contract_address}, retrieving on db`, method);
            header = new eth_price_track_header_1.eth_price_track_header();
            header.pair_contract = assert_1.assert.stringNotEmpty(contract_address, `${method} contract_address`);
            await header.fetch();
        }
        else {
            this.log(`...passed price_track_header with id ${header.id} and address ${header.pair_contract}`, method);
        }
        if (header.isNew()) {
            this.log(`...pair not on db, retrieving on chain`, method);
            try {
                const pair_address = assert_1.assert.stringNotEmpty(header.pair_contract, `${method} header.pair_contract`);
                header.pair_contract = pair_address;
                header.token0_contract = await web3_pancake_pair_1.web3_pancake_pair.token0Strict(pair_address);
                header.token1_contract = await web3_pancake_pair_1.web3_pancake_pair.token1Strict(pair_address);
                this.log(`...found pair address token0:${header.token0_contract} token1:${header.token1_contract}, retrieving contract info`, method);
                const token0_info = await eth_contract_data_tools_1.eth_contract_data_tools.getContractViaAddress(header.token0_contract, false);
                if (!token0_info)
                    throw new Error(`unable to retrieve token0 info on db or chain`);
                header.token0_symbol = token0_info.symbol;
                header.token0_decimal = assert_1.assert.naturalNumber(token0_info.decimals, `${method} token0_info.decimals`);
                const token1_info = await eth_contract_data_tools_1.eth_contract_data_tools.getContractViaAddress(header.token1_contract, false);
                if (!token1_info)
                    throw new Error(`unable to retrieve token0 info on db or chain`);
                header.token1_symbol = token1_info.symbol;
                header.token1_decimal = assert_1.assert.naturalNumber(token1_info.decimals, `${method} token1_info.decimals`);
                await header.save();
                this.log(`...saved pair info on db with id:${header.id} and pair address:${header.pair_contract}`, method);
            }
            catch (e) {
                if (e instanceof Error) {
                    this.log(e.message, method, true, true);
                    if (strict)
                        throw new eth_price_track_header_tools_error(e.message);
                }
                return false;
            }
        }
        this.log(`...retrieved header with id:${header.id} pair_contract:${header.pair_contract}`, method, true);
        return header;
    }
    static async getViaIdOrContractStrict(header_id_or_contract) {
        return await this.getViaIdOrContract(header_id_or_contract, true);
    }
}
exports.eth_price_track_header_tools = eth_price_track_header_tools;
class eth_price_track_header_tools_error extends Error {
    constructor(message) {
        super(message);
    }
}
//# sourceMappingURL=eth_price_track_header_tools.js.map