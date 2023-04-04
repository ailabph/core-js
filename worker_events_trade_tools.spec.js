"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const config_1 = require("./config");
const connection_1 = require("./connection");
const chai_1 = require("chai");
const worker_events_trade_tools_1 = require("./worker_events_trade_tools");
describe("worker_events_trade_tools spec", () => {
    before(async () => {
        config_1.config.resetCache();
        connection_1.connection.reset();
        config_1.config.ENV_OVERRIDE = config_1.config.ENV["test"];
    });
    beforeEach(async () => {
        await connection_1.connection.startTransaction();
    });
    afterEach(async () => {
        await connection_1.connection.rollback();
    });
    //region calculateBnbPerTokenFromSwap
    it("calculateBnbPerTokenFromSwap should correctly calculate BNB value per token when divided by 18 decimals", () => {
        const token_amount = "790";
        const busd_received = "13.148";
        const bnb_usd = "312.71";
        const expected = "0.000053221956364311";
        const result = worker_events_trade_tools_1.worker_events_trade_tools.calculateBnbPerTokenFromSwap(token_amount, busd_received, bnb_usd);
        (0, chai_1.expect)(result).to.equal(expected);
    });
    it("calculateBnbPerTokenFromSwap should return '0' when token amount is '0'", () => {
        const token_amount = "0";
        const busd_received = "13.148";
        const bnb_usd = "312.71";
        const expected = "0";
        const result = worker_events_trade_tools_1.worker_events_trade_tools.calculateBnbPerTokenFromSwap(token_amount, busd_received, bnb_usd);
        (0, chai_1.expect)(result).to.equal(expected);
    });
    it("calculateBnbPerTokenFromSwap should return '0' when BUSD received is '0'", () => {
        const token_amount = "790";
        const busd_received = "0";
        const bnb_usd = "312.71";
        const expected = "0";
        const result = worker_events_trade_tools_1.worker_events_trade_tools.calculateBnbPerTokenFromSwap(token_amount, busd_received, bnb_usd);
        (0, chai_1.expect)(result).to.equal(expected);
    });
    it("calculateBnbPerTokenFromSwap should return '0' when BNB-USD rate is '0'", () => {
        const token_amount = "790";
        const busd_received = "13.148";
        const bnb_usd = "0";
        const expected = "0";
        const result = worker_events_trade_tools_1.worker_events_trade_tools.calculateBnbPerTokenFromSwap(token_amount, busd_received, bnb_usd);
        (0, chai_1.expect)(result).to.equal(expected);
    });
    it("calculateBnbPerTokenFromSwap should handle large values", () => {
        const token_amount = "1000000000000";
        const busd_received = "5000000000";
        const bnb_usd = "1000";
        const expected = "0.000005000000000000";
        const result = worker_events_trade_tools_1.worker_events_trade_tools.calculateBnbPerTokenFromSwap(token_amount, busd_received, bnb_usd);
        (0, chai_1.expect)(result).to.equal(expected);
    });
    //endregion calculateBnbPerTokenFromSwap
    //region calculateBusdPerTokenFromSwap
    it('calculateBusdPerTokenFromSwap should correctly calculate BUSD value per token', () => {
        const tokenAmount = '790';
        const bnbReceived = '0.042062';
        const bnbUsd = '312.71';
        const result = worker_events_trade_tools_1.worker_events_trade_tools.calculateBusdPerTokenFromSwap(tokenAmount, bnbReceived, bnbUsd);
        const expectedResult = '0.016649630405063291';
        assert.equal(result, expectedResult);
    });
    it('calculateBusdPerTokenFromSwap should correctly handle large values for token amount, BNB received, and BNB to USD rate', () => {
        const tokenAmount = '1000000000';
        const bnbReceived = '1000';
        const bnbUsd = '500';
        const result = worker_events_trade_tools_1.worker_events_trade_tools.calculateBusdPerTokenFromSwap(tokenAmount, bnbReceived, bnbUsd);
        const expectedResult = '0.000500000000000000';
        assert.equal(result, expectedResult);
    });
    it('calculateBusdPerTokenFromSwap should return 0 when token amount is 0', () => {
        const tokenAmount = '0';
        const bnbReceived = '0.042062';
        const bnbUsd = '312.71';
        const result = worker_events_trade_tools_1.worker_events_trade_tools.calculateBusdPerTokenFromSwap(tokenAmount, bnbReceived, bnbUsd);
        const expectedResult = '0.000000000000000000';
        assert.equal(result, expectedResult);
    });
    //endregion calculateBusdPerTokenFromSwap
});
//# sourceMappingURL=worker_events_trade_tools.spec.js.map