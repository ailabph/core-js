"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_tools = void 0;
const eth_types_1 = require("./eth_types");
class eth_tools {
    static getDefaultResult(eth_txn) {
        return eth_types_1.eth_types.getDefaultAnalysisResult(eth_txn);
    }
    static async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.eth_tools = eth_tools;
//# sourceMappingURL=eth_tools.js.map