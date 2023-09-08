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
const user_1 = require("../build/user");
const user_tools_1 = require("../user_tools");
describe("user tools spec", () => {
    it("user has walletAddress", () => {
        const u = new user_1.user();
        u.walletAddress = "abc123";
        assert.equal(user_tools_1.user_tools.hasWalletAddress(u), true);
    });
    it("user has no walletAddress", () => {
        const u = new user_1.user();
        assert.equal(user_tools_1.user_tools.hasWalletAddress(u), false);
        u.walletAddress = "";
        assert.equal(user_tools_1.user_tools.hasWalletAddress(u), false);
        u.walletAddress = "null";
        assert.equal(user_tools_1.user_tools.hasWalletAddress(u), false);
        u.walletAddress = "NULL";
        assert.equal(user_tools_1.user_tools.hasWalletAddress(u), false);
    });
});
//# sourceMappingURL=user_tools.spec.js.map