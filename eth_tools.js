"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_tools = void 0;
const eth_types_1 = require("./eth_types");
class eth_tools {
    static getDefaultResult() {
        let result = {};
        result.hash = "";
        result.blockNumber = 0;
        result.block_time = 0;
        result.status = eth_types_1.RESULT_STATUS.NOT_INVOLVED;
        result.tag = "";
        result.method = "";
        result.fromAddress = "";
        result.fromContract = "";
        result.fromSymbol = "";
        result.fromDecimal = 0;
        result.fromValue = "";
        result.fromAmount = "";
        result.fromAmountGross = "";
        result.fromTaxAmount = "";
        result.fromTaxPerc = "";
        result.toAddress = "";
        result.toContract = "";
        result.toSymbol = "";
        result.toDecimal = 0;
        result.toValue = "";
        result.toAmount = "";
        result.toAmountGross = "";
        result.toTaxAmount = "";
        result.toTaxPerc = "";
        result.abiDecodeStatus = "";
        result.sendStatus = eth_types_1.RESULT_SEND_STATUS.FAILED;
        return result;
    }
    static wait(ms) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => setTimeout(resolve, ms));
        });
    }
}
exports.eth_tools = eth_tools;
