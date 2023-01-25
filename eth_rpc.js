"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_rpc = void 0;
const web3_1 = __importDefault(require("web3"));
const ailab_core_1 = require("./ailab-core");
class eth_rpc {
    static getWeb3Provider() {
        if (typeof eth_rpc.web3Provider !== "undefined")
            return eth_rpc.web3Provider;
        eth_rpc.web3Provider = new web3_1.default.providers.HttpProvider(ailab_core_1.eth_config.getRPCUrl());
        return eth_rpc.web3Provider;
    }
    static getWeb3Client() {
        if (typeof eth_rpc.web3Client !== "undefined")
            return eth_rpc.web3Client;
        eth_rpc.web3Client = new web3_1.default(eth_rpc.getWeb3Provider());
        return eth_rpc.web3Client;
    }
}
exports.eth_rpc = eth_rpc;
