"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.web3_tools = void 0;
//region TYPE
const web3_rpc_web3_1 = require("./web3_rpc_web3");
var PAIR_POSITION;
(function (PAIR_POSITION) {
    PAIR_POSITION[PAIR_POSITION["zero"] = 0] = "zero";
    PAIR_POSITION[PAIR_POSITION["one"] = 1] = "one";
})(PAIR_POSITION || (PAIR_POSITION = {}));
//endregion TYPE
class web3_tools {
    static getOrderedPair(token0, token1, position, separator = "") {
        if (position === PAIR_POSITION.zero)
            return `${token0.toUpperCase()}${separator}${token1.toUpperCase()}`;
        else
            return `${token1.toUpperCase()}${separator}${token0.toUpperCase()}`;
    }
    static async isContractAddress(address) {
        const code = await web3_rpc_web3_1.web3_rpc_web3.getWeb3Client().eth.getCode(address);
        return code !== '0x' && code !== '0x0';
    }
    static async isContractAddressStrict(address, context = "address") {
        const isContract = await this.isContractAddress(address);
        if (!isContract)
            throw new Error(`${context} is not a contract`);
    }
    static async isWalletAddress(address) {
        return web3_rpc_web3_1.web3_rpc_web3.getWeb3Client().utils.isAddress(address) && !(await this.isContractAddress(address));
    }
    static async assertWalletAddress(address, context = "address") {
        const isWallet = await this.isWalletAddress(address);
        if (!isWallet)
            throw new Error(`${context} is not a wallet`);
    }
}
exports.web3_tools = web3_tools;
//# sourceMappingURL=web3_tools.js.map