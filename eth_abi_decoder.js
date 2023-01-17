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
exports.eth_abi_decoder = void 0;
const eth_config_1 = require("./eth_config");
const t = __importStar(require("io-ts"));
const d = __importStar(require("fp-ts/Either"));
const tools_1 = require("./tools");
const abiDecoder = require("abi-decoder");
//region TYPES
const DecodedMethodArgumentsCodec = t.type({
    name: t.string,
    value: t.union([t.string, t.array(t.string)]),
    type: t.string,
});
const DecodedAbiCodec = t.type({
    name: t.string,
    params: t.array(DecodedMethodArgumentsCodec),
});
function isValidDecodedAbi(data) {
    if (typeof data === undefined)
        return false;
    return d.isRight(DecodedAbiCodec.decode(data));
}
const StringDictionary = t.record(t.string, t.string);
const DecodedAbiObjectCodec = t.type({
    abi: t.exact(DecodedAbiCodec),
    argument_names: t.array(t.string),
    argument_key_value: StringDictionary,
});
//endregion
//region EVENT TYPES
const transferCodec = t.type({
    recipient: t.string,
    amount: t.bigint,
});
const approveCodec = t.type({
    spender: t.string,
    amount: t.bigint,
});
const addLiquidityETHCodec = t.type({
    token: t.string,
    amountTokenDesired: t.bigint,
    amountTokenMin: t.bigint,
    amountETHMin: t.bigint,
    to: t.string,
    deadline: t.bigint,
});
const swapETHForExactTokensCodec = t.type({
    amountOut: t.bigint,
    path: t.array(t.string),
    to: t.string,
    deadline: t.bigint,
});
const swapExactETHForTokensCodec = t.type({
    amountOutMin: t.bigint,
    path: t.array(t.string),
    to: t.string,
    deadline: t.bigint
});
const excludeFromFeeCodec = t.type({
    account: t.string,
});
const swapExactTokensForTokensCodec = t.type({
    amountIn: t.bigint,
    amountOutMin: t.bigint,
    path: t.array(t.string),
    to: t.string,
    deadline: t.bigint,
});
const setNumTokensSellToAddToLiquidityCodec = t.type({
    numTokensSellToAddToLiquidity: t.bigint,
});
const clearStuckBNBBalanceCodec = t.type({
    to: t.string,
    amount: t.bigint,
});
const swapTokensForExactETHCodec = t.type({
    amountOut: t.bigint,
    amountInMax: t.bigint,
    path: t.array(t.string),
    to: t.string,
    deadline: t.bigint,
});
const setMarketFeeCodec = t.type({
    marketFee: t.bigint,
});
const setSellFeeMultiplierCodec = t.type({
    newSellFeeMultiplier: t.bigint,
});
const setLiquidityFeeCodec = t.type({
    liquidityFee: t.bigint,
});
const swapExactTokensForETHSupportingFeeOnTransferTokensCodec = t.type({
    amountIn: t.bigint,
    amountOutMin: t.bigint,
    path: t.array(t.string),
    to: t.string,
    deadline: t.bigint,
});
const swapExactETHForTokensSupportingFeeOnTransferTokensCodec = t.type({
    amountOutMin: t.bigint,
    path: t.array(t.string),
    to: t.string,
    deadline: t.bigint,
});
const swapExactTokensForTokensSupportingFeeOnTransferTokensCodec = t.type({
    amountIn: t.bigint,
    amountOutMin: t.bigint,
    path: t.array(t.string),
    to: t.string,
    deadline: t.bigint,
});
const swapCodec = t.type({
    swapType: t.string,
    srcToken: t.string,
    dstToken: t.string,
    srcReceiver: t.string,
    dstReceiver: t.string,
    amount: t.string,
    minReturnAmount: t.string,
    channel: t.string,
    toChainID: t.string,
    wrappedNative: t.string,
});
// LOAD ABI
abiDecoder.addABI(eth_config_1.eth_config.getDexAbi());
abiDecoder.addABI(eth_config_1.eth_config.getSwapRouterAbi());
abiDecoder.addABI(eth_config_1.eth_config.getEthAbi());
abiDecoder.addABI(eth_config_1.eth_config.getTokenAbi());
class eth_abi_decoder {
    static decodeAbiPure(input) {
        if (typeof input !== "string")
            throw new Error("input invalid");
        return abiDecoder.decodeMethod(input);
    }
    static decodeAbi(input) {
        try {
            let result = abiDecoder.decodeMethod(input);
            if (isValidDecodedAbi(result)) {
                return result;
            }
            else {
                return false;
            }
        }
        catch (e) {
            return false;
        }
    }
    static convertAbiParamsToObject(methodArguments) {
        let obj = {};
        for (let x = 0; x < methodArguments.length; x++) {
            let methodArg = methodArguments[x];
            if (methodArg.type === "tuple") {
                let count = 0;
                let tupleStart = methodArg.value.length;
                //@ts-ignore
                for (let key in methodArg.value) {
                    if (++count > tupleStart) {
                        obj[key] = methodArg.value[key];
                    }
                }
                return obj;
            }
            else {
                let val = methodArg.value;
                if (methodArg.type === "uint256"
                    && typeof methodArg.value === "string") {
                    val = BigInt(methodArg.value);
                }
                obj[methodArg.name] = val;
            }
        }
        return obj;
    }
    static decodeAbiObject(input) {
        if (typeof input !== "string" || tools_1.tools.isEmpty(input))
            throw new Error("invalid input type, string expected");
        let abi = this.decodeAbi(input);
        if (!abi)
            return false;
        let decodedAbiObj = {};
        decodedAbiObj.abi = abi;
        decodedAbiObj.argument_names = [];
        decodedAbiObj.argument_key_value = {};
        for (let x = 0; x < abi.params.length; x++) {
            let param = abi.params[x];
            decodedAbiObj.argument_names.push(param.name);
            decodedAbiObj.argument_key_value[param.name] = param.value;
        }
        return decodedAbiObj;
    }
    //region EVENT ABI GETTERS
    static getGenericAbiTypeStrict(abiObj, codec, typeName) {
        let paramAsObject = this.convertAbiParamsToObject(abiObj.abi.params);
        let decodedCodec = codec.decode(paramAsObject);
        if (d.isRight(decodedCodec)) {
            return decodedCodec.right;
        }
        console.log(abiObj.abi.params);
        console.log(paramAsObject);
        throw new Error("unable to decode method " + typeName);
    }
    // TRANSFER
    static getTransferAbiByInput(input) {
        let abiObj = this.decodeAbiObject(input);
        return this.getTransferAbi(abiObj);
    }
    static getTransferAbi(abiObj) {
        let methodName = "transfer";
        if (typeof abiObj === "boolean" && !abiObj)
            return false;
        if (abiObj.abi.name.toLowerCase() !== methodName.toLowerCase())
            return false;
        return this.getGenericAbiTypeStrict(abiObj, transferCodec, methodName);
    }
    // APPROVE
    static getApproveAbiByInput(input) {
        let abiObj = this.decodeAbiObject(input);
        return this.getApproveAbi(abiObj);
    }
    static getApproveAbi(abiObj) {
        let methodName = "approve";
        if (typeof abiObj === "boolean" && !abiObj)
            return false;
        if (abiObj.abi.name.toLowerCase() !== methodName.toLowerCase())
            return false;
        return this.getGenericAbiTypeStrict(abiObj, approveCodec, methodName);
    }
    // addLiquidityETH
    static getAddLiquidityETHByInput(input) {
        let abiObj = this.decodeAbiObject(input);
        return this.getAddLiquidityETH(abiObj);
    }
    static getAddLiquidityETH(abiObj) {
        let methodName = "addLiquidityETH";
        if (typeof abiObj === "boolean" && !abiObj)
            return false;
        if (abiObj.abi.name.toLowerCase() !== methodName.toLowerCase())
            return false;
        return this.getGenericAbiTypeStrict(abiObj, addLiquidityETHCodec, methodName);
    }
    // swapETHForExactTokens
    static getSwapETHForExactTokensByInput(input) {
        let abiObj = this.decodeAbiObject(input);
        return this.getSwapETHForExactTokens(abiObj);
    }
    static getSwapETHForExactTokens(abiObj) {
        let methodName = "swapETHForExactTokens";
        if (typeof abiObj === "boolean" && !abiObj)
            return false;
        if (abiObj.abi.name.toLowerCase() !== methodName.toLowerCase())
            return false;
        return this.getGenericAbiTypeStrict(abiObj, swapETHForExactTokensCodec, methodName);
    }
    // swapExactETHForTokens
    static getSwapExactETHForTokensByInput(input) {
        let abiObj = this.decodeAbiObject(input);
        return this.getSwapExactETHForTokens(abiObj);
    }
    static getSwapExactETHForTokens(abiObj) {
        let methodName = "swapExactETHForTokens";
        if (typeof abiObj === "boolean" && !abiObj)
            return false;
        if (abiObj.abi.name.toLowerCase() !== methodName.toLowerCase())
            return false;
        return this.getGenericAbiTypeStrict(abiObj, swapExactETHForTokensCodec, "swapExactETHForTokens");
    }
    // excludeFromFee
    static getExcludeFromFeeByInput(input) {
        let abiObj = this.decodeAbiObject(input);
        return this.getExcludeFromFee(abiObj);
    }
    static getExcludeFromFee(abiObj) {
        let methodName = "excludeFromFee";
        if (typeof abiObj === "boolean" && !abiObj)
            return false;
        if (abiObj.abi.name.toLowerCase() !== methodName.toLowerCase())
            return false;
        return this.getGenericAbiTypeStrict(abiObj, excludeFromFeeCodec, "excludeFromFee");
    }
    // swapExactTokensForTokens
    static getSwapExactTokensForTokensByInput(input) {
        let abiObj = this.decodeAbiObject(input);
        return this.getSwapExactTokensForTokens(abiObj);
    }
    static getSwapExactTokensForTokens(abiObj) {
        let methodName = "swapExactTokensForTokens";
        if (typeof abiObj === "boolean" && !abiObj)
            return false;
        if (abiObj.abi.name.toLowerCase() !== methodName.toLowerCase())
            return false;
        return this.getGenericAbiTypeStrict(abiObj, swapExactTokensForTokensCodec, "swapExactTokensForTokens");
    }
    // setNumTokensSellToAddToLiquidity
    static getSetNumTokensSellToAddToLiquidityByInput(input) {
        let abiObj = this.decodeAbiObject(input);
        return this.getSetNumTokensSellToAddToLiquidity(abiObj);
    }
    static getSetNumTokensSellToAddToLiquidity(abiObj) {
        let methodName = "setNumTokensSellToAddToLiquidity";
        if (typeof abiObj === "boolean" && !abiObj)
            return false;
        if (abiObj.abi.name.toLowerCase() !== methodName.toLowerCase())
            return false;
        return this.getGenericAbiTypeStrict(abiObj, setNumTokensSellToAddToLiquidityCodec, "setNumTokensSellToAddToLiquidity");
    }
    // clearStuckBNBBalance
    static getClearStuckBNBBalanceByInput(input) {
        let abiObj = this.decodeAbiObject(input);
        return this.getClearStuckBNBBalance(abiObj);
    }
    static getClearStuckBNBBalance(abiObj) {
        let methodName = "clearStuckBNBBalance";
        if (typeof abiObj === "boolean" && !abiObj)
            return false;
        if (abiObj.abi.name.toLowerCase() !== methodName.toLowerCase())
            return false;
        return this.getGenericAbiTypeStrict(abiObj, clearStuckBNBBalanceCodec, "clearStuckBNBBalance");
    }
    // swapTokensForExactETH
    static getSwapTokensForExactETHByInput(input) {
        let abiObj = this.decodeAbiObject(input);
        return this.getSwapTokensForExactETH(abiObj);
    }
    static getSwapTokensForExactETH(abiObj) {
        let methodName = "swapTokensForExactETH";
        if (typeof abiObj === "boolean" && !abiObj)
            return false;
        if (abiObj.abi.name.toLowerCase() !== methodName.toLowerCase())
            return false;
        return this.getGenericAbiTypeStrict(abiObj, swapTokensForExactETHCodec, "swapTokensForExactETH");
    }
    // setMarketFee
    static getSetMarketFeeByInput(input) {
        let abiObj = this.decodeAbiObject(input);
        return this.getSetMarketFee(abiObj);
    }
    static getSetMarketFee(abiObj) {
        let methodName = "setMarketFee";
        if (typeof abiObj === "boolean" && !abiObj)
            return false;
        if (abiObj.abi.name.toLowerCase() !== methodName.toLowerCase())
            return false;
        return this.getGenericAbiTypeStrict(abiObj, setMarketFeeCodec, "setMarketFee");
    }
    // setSellFeeMultiplier
    static getSetSellFeeMultiplierByInput(input) {
        let abiObj = this.decodeAbiObject(input);
        return this.getSetSellFeeMultiplier(abiObj);
    }
    static getSetSellFeeMultiplier(abiObj) {
        let methodName = "setSellFeeMultiplier";
        if (typeof abiObj === "boolean" && !abiObj)
            return false;
        if (abiObj.abi.name.toLowerCase() !== methodName.toLowerCase())
            return false;
        return this.getGenericAbiTypeStrict(abiObj, setSellFeeMultiplierCodec, "setSellFeeMultiplier");
    }
    // setLiquidityFee
    static getSetLiquidityFeeByInput(input) {
        let abiObj = this.decodeAbiObject(input);
        return this.setLiquidityFee(abiObj);
    }
    static setLiquidityFee(abiObj) {
        let methodName = "setLiquidityFee";
        if (typeof abiObj === "boolean" && !abiObj)
            return false;
        if (abiObj.abi.name.toLowerCase() !== methodName.toLowerCase())
            return false;
        return this.getGenericAbiTypeStrict(abiObj, setLiquidityFeeCodec, "setLiquidityFee");
    }
    // swapExactTokensForETHSupportingFeeOnTransferTokens
    static getSwapExactTokensForETHSupportingFeeOnTransferTokensByInput(input) {
        let abiObj = this.decodeAbiObject(input);
        return this.getSwapExactTokensForETHSupportingFeeOnTransferTokens(abiObj);
    }
    static getSwapExactTokensForETHSupportingFeeOnTransferTokens(abiObj) {
        let methodName = "swapExactTokensForETHSupportingFeeOnTransferTokens";
        if (typeof abiObj === "boolean" && !abiObj)
            return false;
        if (abiObj.abi.name.toLowerCase() !== methodName.toLowerCase())
            return false;
        return this.getGenericAbiTypeStrict(abiObj, swapExactTokensForETHSupportingFeeOnTransferTokensCodec, "swapExactTokensForETHSupportingFeeOnTransferTokens");
    }
    // swapExactETHForTokensSupportingFeeOnTransferTokens
    static getSwapExactETHForTokensSupportingFeeOnTransferTokensByInput(input) {
        let abi = this.decodeAbiObject(input);
        return this.getSwapExactETHForTokensSupportingFeeOnTransferTokens(abi);
    }
    static getSwapExactETHForTokensSupportingFeeOnTransferTokens(abiObj) {
        let methodName = "swapExactETHForTokensSupportingFeeOnTransferTokens";
        if (typeof abiObj === "boolean" && !abiObj)
            return false;
        if (abiObj.abi.name.toLowerCase() !== methodName.toLowerCase())
            return false;
        return this.getGenericAbiTypeStrict(abiObj, swapExactETHForTokensSupportingFeeOnTransferTokensCodec, "swapExactETHForTokensSupportingFeeOnTransferTokens");
    }
    // swapExactTokensForTokensSupportingFeeOnTransferTokens
    static getSwapExactTokensForTokensSupportingFeeOnTransferTokensByInput(input) {
        let abi = this.decodeAbiObject(input);
        return this.getSwapExactTokensForTokensSupportingFeeOnTransferTokens(abi);
    }
    static getSwapExactTokensForTokensSupportingFeeOnTransferTokens(abiObj) {
        let methodName = "swapExactTokensForTokensSupportingFeeOnTransferTokens";
        if (typeof abiObj === "boolean" && !abiObj)
            return false;
        if (abiObj.abi.name.toLowerCase() !== methodName.toLowerCase())
            return false;
        return this.getGenericAbiTypeStrict(abiObj, swapExactTokensForTokensSupportingFeeOnTransferTokensCodec, "swapExactTokensForTokensSupportingFeeOnTransferTokens");
    }
    //swap
    static getSwapByInput(input) {
        let abi = this.decodeAbiObject(input);
        return this.getSwap(abi);
    }
    static getSwap(abiObj) {
        let methodName = "swap";
        if (typeof abiObj === "boolean" && !abiObj)
            return false;
        if (abiObj.abi.name.toLowerCase() !== methodName.toLowerCase())
            return false;
        return this.getGenericAbiTypeStrict(abiObj, swapCodec, "swap");
    }
}
exports.eth_abi_decoder = eth_abi_decoder;
