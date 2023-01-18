"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESULT_SEND_STATUS = exports.RESULT_STATUS = exports.eth_types = void 0;
const tools_1 = require("./tools");
const assert_1 = require("./assert");
class eth_types {
    static getDefaultAnalysisResult(eth) {
        var _a;
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
            fromTaxAmount: "0",
            fromTaxPerc: "0",
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
            toTaxAmount: "0",
            toTaxPerc: "0",
            toValue: "",
            taxPerc: "0",
            taxAmount: "0",
            type: ""
        };
        if (eth) {
            result = tools_1.tools.importObjectValuesInto(eth, result);
            result.hash = assert_1.assert.isString({ val: eth.hash, prop_name: "eth.hash" });
            result.blockNumber = assert_1.assert.isNumber(eth.blockNumber, "result.blockNumber", 0);
            result.fromAddress = assert_1.assert.isString({ val: eth.fromAddress, prop_name: "eth.fromAddress" });
            result.toAddress = assert_1.assert.isString({ val: (_a = eth.toAddress) !== null && _a !== void 0 ? _a : "", prop_name: "eth.toAddress" });
        }
        return result;
    }
    static getDefaultTransactionReceipt() {
        return {
            blockHash: "",
            blockNumber: 0,
            cumulativeGasUsed: 0,
            from: "",
            gasUsed: 0,
            logs: [],
            logsBloom: "",
            status: false,
            to: "",
            transactionHash: "",
            transactionIndex: 0
        };
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
