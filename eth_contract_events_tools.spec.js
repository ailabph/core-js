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
const connection_1 = require("./connection");
const eth_config_1 = require("./eth_config");
const eth_receipt_logs_1 = require("./build/eth_receipt_logs");
const eth_contract_events_tools_1 = require("./eth_contract_events_tools");
describe("contract_events_tools spec", () => {
    beforeEach(async () => {
        await connection_1.connection.startTransaction();
    });
    afterEach(async () => {
        await connection_1.connection.rollback();
    });
    it("contract_events_tools isTokenRelated token address", () => {
        const log = new eth_receipt_logs_1.eth_receipt_logs();
        log.address = eth_config_1.eth_config.getTokenContract();
        const result = eth_contract_events_tools_1.eth_contract_events_tools.isTokenRelated(log);
        assert.equal(result, true);
    });
    it("contract_events_tools isTokenRelated token_bnb pair address", () => {
        const log = new eth_receipt_logs_1.eth_receipt_logs();
        log.address = eth_config_1.eth_config.getTokenBnbPairContract();
        const result = eth_contract_events_tools_1.eth_contract_events_tools.isTokenRelated(log);
        assert.equal(result, true);
    });
    // it("contract_events_tools isTokenRelated token_usd pair address", () => {
    //     const log = new eth_receipt_logs();
    //     log.address = eth_config.getTokenUsdPairContract();
    //     const result = eth_contract_events_tools.isTokenRelated(log);
    //     assert.equal(result,true);
    // });
    it("contract_events_tools isTokenRelated false", () => {
        const log = new eth_receipt_logs_1.eth_receipt_logs();
        log.address = eth_config_1.eth_config.getDexContract();
        const result = eth_contract_events_tools_1.eth_contract_events_tools.isTokenRelated(log);
        assert.equal(result, false);
    });
    // get unprocessed receipt_logs no last_id
    // get unprocessed receipt_logs with last_id
    // is Trade
    // is Buy
    // is Sell
});
//# sourceMappingURL=eth_contract_events_tools.spec.js.map