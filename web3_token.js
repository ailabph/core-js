"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.web3_token = void 0;
const config_1 = require("./config");
const eth_config_1 = require("./eth_config");
const eth_rpc_1 = require("./eth_rpc");
const tools_1 = require("./tools");
class web3_token {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`web3_token|${method}|${msg}`);
            if (end)
                console.log(`${tools_1.tools.LINE}`);
        }
    }
    static initContract(address) {
        return eth_rpc_1.eth_rpc.getEtherContract(address, eth_config_1.eth_config.getTokenAbi());
    }
    //region READ
    static async getName(contract_address, strict = false) {
        const method = "getName";
        this.log(`retrieving token name of ${contract_address}`, method);
        try {
            const token_name = await this.initContract(contract_address).name();
            this.log(`token name: ${token_name}`, method, true);
            return token_name;
        }
        catch (e) {
            if (e instanceof Error && !tools_1.tools.isEmpty(e.message)) {
                this.log(e.message, method, true, true);
                if (strict)
                    throw new web3_token_error(e.message);
            }
            return false;
        }
    }
    static async getSymbol(contract_address, strict = false) {
        const method = "getSymbol";
        this.log(`retrieving token symbol of ${contract_address}`, method);
        try {
            const tokenSymbol = await this.initContract(contract_address).symbol();
            this.log(`token symbol: ${tokenSymbol}`, method, true);
            return tokenSymbol;
        }
        catch (e) {
            if (e instanceof Error && !tools_1.tools.isEmpty(e.message)) {
                this.log(e.message, method, true, true);
                if (strict)
                    throw new web3_token_error(e.message);
            }
            return false;
        }
    }
    static async getDecimals(contract_address, strict = false) {
        const method = "getDecimals";
        this.log(`retrieving token decimals of ${contract_address}`, method);
        try {
            const tokenDecimals = await this.initContract(contract_address).decimals();
            this.log(`token decimals: ${tokenDecimals}`, method, true);
            return tokenDecimals;
        }
        catch (e) {
            if (e instanceof Error && !tools_1.tools.isEmpty(e.message)) {
                this.log(e.message, method, true, true);
                if (strict)
                    throw new web3_token_error(e.message);
            }
            return false;
        }
    }
}
exports.web3_token = web3_token;
class web3_token_error extends Error {
    constructor(message) {
        super(message);
    }
}
//# sourceMappingURL=web3_token.js.map