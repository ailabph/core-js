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
const assert2 = __importStar(require("assert"));
const connection_1 = require("../connection");
const eth_worker_1 = require("../eth_worker");
describe("eth_worker spec", () => {
    beforeEach(async () => {
        await connection_1.connection.startTransaction();
    });
    afterEach(async () => {
        await connection_1.connection.rollback();
    });
    it("eth_worker spec getBnbUsdValue", async () => {
        const bnb_value = eth_worker_1.eth_worker.getBnbUsdValue("0.111111111111111111", "0.666666666666666666");
        assert2.equal(bnb_value, "0.074074074074074074", `bnb_value:${bnb_value}`);
    });
    it("eth_worker spec getTokenBnbValue", async () => {
        const bnb_value = eth_worker_1.eth_worker.getTokenBnbValue("2", "0.5");
        assert2.equal(bnb_value, "1.000000000000000000", `bnb_value:${bnb_value}`);
    });
    it("eth_worker spec getTokenUsdValue", async () => {
        const token_bnb_value = eth_worker_1.eth_worker.getTokenBnbValue("2", "0.5");
        const token_usd_value = eth_worker_1.eth_worker.getTokenUsdValue(2, 300, "0.5");
        assert2.equal(token_usd_value, "300.000000000000000000", `token_usd_value:${token_usd_value}`);
    });
});
//# sourceMappingURL=eth_worker.spec.js.map