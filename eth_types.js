"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESULT_SEND_STATUS = exports.RESULT_STATUS = exports.eth_types = void 0;
const assert_1 = require("./assert");
class eth_types {
    static getDefaultAnalysisResult(eth) {
        let result = {
            abiDecodeStatus: "",
            blockNumber: 0,
            block_time: "",
            fromAddress: "",
            fromAmount: "",
            fromAmountGross: "",
            fromContract: "",
            fromDecimal: 0,
            fromSymbol: "",
            fromTaxAmount: "",
            fromTaxPerc: "",
            fromValue: "",
            hash: "",
            method: "",
            sendStatus: RESULT_SEND_STATUS.NOT_CHECKED,
            status: RESULT_STATUS.NOT_INVOLVED,
            tag: "",
            toAddress: "",
            toAmount: "",
            toAmountGross: "",
            toContract: "",
            toDecimal: 0,
            toSymbol: "",
            toTaxAmount: "",
            toTaxPerc: "",
            toValue: "",
            type: ""
        };
        if (eth) {
            result.hash = assert_1.assert.isString({ val: eth.hash, prop_name: "eth.hash" });
            result.blockNumber = assert_1.assert.isNumber(eth.blockNumber, "result.blockNumber", 0);
            result.fromAddress = assert_1.assert.isString({ val: eth.fromAddress, prop_name: "eth.fromAddress" });
            result.toAddress = assert_1.assert.isString({ val: eth.toAddress, prop_name: "eth.toAddress" });
        }
        return result;
    }
}
exports.eth_types = eth_types;
var RESULT_STATUS;
(function (RESULT_STATUS) {
    RESULT_STATUS["INVOLVED"] = "involved";
    RESULT_STATUS["NOT_INVOLVED"] = "not_involved";
})(RESULT_STATUS || (RESULT_STATUS = {}));
exports.RESULT_STATUS = RESULT_STATUS;
var RESULT_SEND_STATUS;
(function (RESULT_SEND_STATUS) {
    RESULT_SEND_STATUS["NOT_CHECKED"] = "not_checked";
    RESULT_SEND_STATUS["SUCCESS"] = "success";
    RESULT_SEND_STATUS["FAILED"] = "failed";
})(RESULT_SEND_STATUS || (RESULT_SEND_STATUS = {}));
exports.RESULT_SEND_STATUS = RESULT_SEND_STATUS;
// export { GasInfo, ContractInfo, DecodedAbi, LogData, LogSigArgs, AnalyzeLogsResult, WalletInfo }
