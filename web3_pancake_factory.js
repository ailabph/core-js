"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.web3_pancake_factory = void 0;
const assert_1 = require("./assert");
const eth_rpc_1 = require("./eth_rpc");
const eth_config_1 = require("./eth_config");
const config_1 = require("./config");
const tools_1 = require("./tools");
class web3_pancake_factory {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`web3_pancake_factory|${method}|${msg}`);
            if (end)
                console.log(`web3_pancake_factory|${method}|${tools_1.tools.LINE}`);
        }
    }
    static retryWaitDuration() {
        return 500;
    }
    static retryLimit() {
        return 20;
    }
    static init() {
        if (typeof this.pancakeFactoryContract !== "undefined")
            return;
        this.pancakeFactoryContract = eth_rpc_1.eth_rpc.getEtherContract(eth_config_1.eth_config.getPancakeFactoryContract(), eth_config_1.eth_config.getPancakeFactoryAbi());
    }
    //region READ
    static async getPair(token0, token1, strict = false) {
        this.init();
        const method = "getPair";
        this.log(`retrieving pair address of ${token0} and ${token1}`, method);
        try {
            assert_1.assert.notEmpty(token0, "token0");
            assert_1.assert.notEmpty(token1, "token1");
            const pairAddress = await this.pancakeFactoryContract.getPair(token0, token1);
            if (pairAddress === "0x0000000000000000000000000000000000000000")
                throw new Error(`pair does not exist`);
            this.log(`pair address found ${pairAddress}`, method, true);
            return pairAddress;
        }
        catch (e) {
            if (e instanceof Error && !tools_1.tools.isEmpty(e.message)) {
                this.log(e.message, method, true, true);
                if (strict)
                    throw new web3_pancake_factory_error(e.message);
            }
            return false;
        }
    }
    static async getPairStrict(token0, token1) {
        return await this.getPair(token0, token1, true);
    }
}
exports.web3_pancake_factory = web3_pancake_factory;
class web3_pancake_factory_error extends Error {
    constructor(message) {
        super(message);
    }
}
//# sourceMappingURL=web3_pancake_factory.js.map