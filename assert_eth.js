"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assert_eth = void 0;
class assert_eth {
    static isLikelyTransactionHash(str) {
        const regex = /^0x[a-fA-F0-9]{60,120}$/;
        if (!regex.test(str))
            throw new Error(`hash:${str} is not likely a valid hash transaction string`);
        return true;
    }
}
exports.assert_eth = assert_eth;
