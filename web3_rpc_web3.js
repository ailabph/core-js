"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.web3_rpc_web3 = void 0;
const web3_1 = __importDefault(require("web3"));
const eth_config_1 = require("./eth_config");
class web3_rpc_web3 {
    static getWeb3Provider() {
        if (typeof web3_rpc_web3.web3Provider !== "undefined")
            return web3_rpc_web3.web3Provider;
        web3_rpc_web3.web3Provider = new web3_1.default.providers.HttpProvider(eth_config_1.eth_config.getRPCUrl());
        return web3_rpc_web3.web3Provider;
    }
    static getWeb3Client() {
        if (typeof web3_rpc_web3.web3Client !== "undefined")
            return web3_rpc_web3.web3Client;
        web3_rpc_web3.web3Client = new web3_1.default(web3_rpc_web3.getWeb3Provider());
        return web3_rpc_web3.web3Client;
    }
    static getWeb3Contract(contract_address, abi) {
        const client = this.getWeb3Client();
        return new client.eth.Contract(abi, contract_address);
    }
}
exports.web3_rpc_web3 = web3_rpc_web3;
//# sourceMappingURL=web3_rpc_web3.js.map