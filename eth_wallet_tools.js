"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_wallet_tools = void 0;
const eth_wallet_1 = require("./build/eth_wallet");
const assert_1 = require("./assert");
class eth_wallet_tools {
    static async getWallet(address, for_staking) {
        const method = "eth_wallet_tools.getWallet";
        const wallet = new eth_wallet_1.eth_wallet();
        wallet.wallet_address = assert_1.assert.stringNotEmpty(address, `${method}|address`);
        await wallet.fetch();
        if (wallet.isNew())
            throw new Error(`${method}|wallet ${wallet.wallet_address} does not exist in db`);
        if (for_staking && typeof wallet.staking_id !== "number")
            throw new Error(`${method}|wallet ${wallet.wallet_address} has no staking_id`);
        return wallet;
    }
}
exports.eth_wallet_tools = eth_wallet_tools;
//# sourceMappingURL=eth_wallet_tools.js.map