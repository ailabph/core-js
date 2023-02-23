"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.web3_pancake_router = void 0;
const config_1 = require("./config");
const tools_1 = require("./tools");
const eth_rpc_1 = require("./eth_rpc");
const eth_config_1 = require("./eth_config");
class web3_pancake_router {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`web3_pancake_router|${method}|${msg}`);
            if (end)
                console.log(`web3_pancake_router|${method}|${tools_1.tools.LINE}`);
        }
    }
    static initDexContract() {
        return eth_rpc_1.eth_rpc.getEtherContract(eth_config_1.eth_config.getDexContract(), eth_config_1.eth_config.getDexAbi());
    }
    static async getFactory() {
        const method = "getFactory";
        this.log(`retrieving factory address`, method);
        let factoryAddress = "";
        try {
            factoryAddress = await this.initDexContract().factory();
        }
        catch (e) {
            this.log(`ERROR`, method);
            if (e instanceof Error) {
                this.log(e.message, method, true, true);
            }
            throw e;
        }
        return factoryAddress;
    }
}
exports.web3_pancake_router = web3_pancake_router;
//# sourceMappingURL=web3_pancake_router.js.map