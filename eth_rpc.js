"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_rpc = void 0;
const ethers_1 = require("ethers");
const eth_config_1 = require("./eth_config");
class eth_rpc {
    static getEtherProvider() {
        if (typeof this.etherRpcProvider !== "undefined")
            return this.etherRpcProvider;
        this.etherRpcProvider = new ethers_1.ethers.JsonRpcProvider(eth_config_1.eth_config.getRPCUrl());
        return this.etherRpcProvider;
    }
    static getEtherContract(contract_address, abi) {
        return new ethers_1.ethers.Contract(contract_address, abi, this.getEtherProvider());
    }
}
exports.eth_rpc = eth_rpc;
//# sourceMappingURL=eth_rpc.js.map