"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.web3_pancake_pair = void 0;
const config_1 = require("./config");
const eth_config_1 = require("./eth_config");
const eth_rpc_1 = require("./eth_rpc");
const tools_1 = require("./tools");
class web3_pancake_pair {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`${this.name}|${method}|${msg}`);
            if (end)
                console.log(`${tools_1.tools.LINE}`);
        }
    }
    static initContract(address) {
        return eth_rpc_1.eth_rpc.getEtherContract(address, eth_config_1.eth_config.getPancakePairAbi());
    }
    //region READ
    static async token0(pair_address, strict = false) {
        const method = "token0";
        this.log(`retrieving token0 from pair address ${pair_address}`, method);
        try {
            const token0 = await this.initContract(pair_address).token0();
            this.log(`token0: ${token0}`, method, true);
            return token0;
        }
        catch (e) {
            if (e instanceof Error && !tools_1.tools.isEmpty(e.message)) {
                this.log(e.message, method, true, true);
                if (strict)
                    throw new web3_pancake_pair_error(`${method}|${e.message}`);
            }
            return false;
        }
    }
    static async token1(pair_address, strict = false) {
        const method = "token1";
        this.log(`retrieving token1 from pair address ${pair_address}`, method);
        try {
            const token1 = await this.initContract(pair_address).token1();
            this.log(`token1: ${token1}`, method, true);
            return token1;
        }
        catch (e) {
            if (e instanceof Error && !tools_1.tools.isEmpty(e.message)) {
                this.log(e.message, method, true, true);
                if (strict)
                    throw new web3_pancake_pair_error(`${method}|${e.message}`);
            }
            return false;
        }
    }
}
exports.web3_pancake_pair = web3_pancake_pair;
class web3_pancake_pair_error extends Error {
    constructor(message) {
        super(message);
    }
}
//# sourceMappingURL=web3_pancake_pair.js.map