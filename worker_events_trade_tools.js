"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_events_trade_tools = void 0;
const assert_1 = require("./assert");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const tools_1 = require("./tools");
class worker_events_trade_tools {
    static calculateBnbPerTokenFromSwap(token_amount, busd_received, bnb_usd) {
        assert_1.assert.isNumericString(token_amount, `token_amount(${token_amount})`);
        assert_1.assert.isNumericString(busd_received, `busd_received(${busd_received})`);
        assert_1.assert.isNumericString(bnb_usd, `bnb_usd(${bnb_usd})`);
        if (tools_1.tools.lesserThanOrEqualTo(token_amount, 0))
            return "0";
        if (tools_1.tools.lesserThanOrEqualTo(busd_received, 0))
            return "0";
        if (tools_1.tools.lesserThanOrEqualTo(bnb_usd, 0))
            return "0";
        const tokenAmountBN = new bignumber_js_1.default(token_amount);
        const busdReceivedBN = new bignumber_js_1.default(busd_received);
        const bnbUsdBN = new bignumber_js_1.default(bnb_usd);
        const busdToBnbRate = bnbUsdBN;
        const totalBnbValue = busdReceivedBN.div(busdToBnbRate);
        const bnbValuePerToken = totalBnbValue.div(tokenAmountBN);
        return bnbValuePerToken.toFixed(18);
    }
    static calculateBusdPerTokenFromSwap(token_amount, bnb_received, bnb_usd) {
        assert_1.assert.isNumericString(token_amount, `token_amount(${token_amount})`);
        assert_1.assert.isNumericString(bnb_received, `token_amount(${bnb_received})`);
        assert_1.assert.isNumericString(bnb_usd, `token_amount(${bnb_usd})`);
        if (tools_1.tools.lesserThanOrEqualTo(token_amount, 0))
            return "0.000000000000000000";
        if (tools_1.tools.lesserThanOrEqualTo(bnb_received, 0))
            return "0.000000000000000000";
        if (tools_1.tools.lesserThanOrEqualTo(bnb_usd, 0))
            return "0.000000000000000000";
        const tokenAmountBN = new bignumber_js_1.default(token_amount);
        const bnbReceivedBN = new bignumber_js_1.default(bnb_received);
        const bnbUsdBN = new bignumber_js_1.default(bnb_usd);
        const totalBusdValue = bnbReceivedBN.multipliedBy(bnbUsdBN);
        const busdValuePerToken = totalBusdValue.div(tokenAmountBN);
        return busdValuePerToken.toFixed(18);
    }
}
exports.worker_events_trade_tools = worker_events_trade_tools;
//# sourceMappingURL=worker_events_trade_tools.js.map