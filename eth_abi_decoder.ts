import {eth_config} from "./eth_config";
import * as t from "io-ts";
import * as d from "fp-ts/Either";
import {Codec} from "io-ts/Codec";
import {tools} from "./tools";

const abiDecoder = require("abi-decoder");

//region TYPES

const DecodedMethodArgumentsCodec = t.type({
    name: t.string,
    value: t.union([t.string,t.array(t.string)]),
    type: t.string,
});
type DecodedMethodArguments = t.TypeOf<typeof DecodedMethodArgumentsCodec>;


const DecodedAbiCodec = t.type({
    name: t.string,
    params: t.array(DecodedMethodArgumentsCodec),
});
type DecodedAbi = t.TypeOf<typeof DecodedAbiCodec>;
function isValidDecodedAbi(data: unknown): boolean{
    if(typeof data === undefined) return false;
    return d.isRight(DecodedAbiCodec.decode(data));
}

const StringDictionary = t.record(t.string, t.string);
const DecodedAbiObjectCodec = t.type({
    abi: t.exact(DecodedAbiCodec),
    argument_names: t.array(t.string),
    argument_key_value: StringDictionary,
});
type DecodedAbiObject = t.TypeOf<typeof DecodedAbiObjectCodec>;







type AddLiquidityETH = {
    token: string,
    amountTokenDesired: string,
    amountTokenMin: string,
    amountETHMin: string,
};

//endregion

//region EVENT TYPES
const transferCodec = t.type({
    recipient: t.string,
    amount: t.bigint,
});
type transfer = t.TypeOf<typeof transferCodec>;


const approveCodec = t.type({
    spender: t.string,
    amount: t.bigint,
});
type approve = t.TypeOf<typeof approveCodec>;


const addLiquidityETHCodec = t.type({
    token: t.string,
    amountTokenDesired: t.bigint,
    amountTokenMin: t.bigint,
    amountETHMin: t.bigint,
    to: t.string,
    deadline: t.bigint,
});
type addLiquidityETH = t.TypeOf<typeof addLiquidityETHCodec>;

const swapETHForExactTokensCodec = t.type({
    amountOut: t.bigint,
    path: t.array(t.string),
    to: t.string,
    deadline: t.bigint,
});
type swapETHForExactTokens = t.TypeOf<typeof swapETHForExactTokensCodec>;


const swapExactETHForTokensCodec = t.type({
    amountOutMin: t.bigint,
    path: t.array(t.string),
    to: t.string,
    deadline: t.bigint
});
type swapExactETHForTokens = t.TypeOf<typeof swapExactETHForTokensCodec>;


const excludeFromFeeCodec = t.type({
    account: t.string,
});
type excludeFromFee = t.TypeOf<typeof excludeFromFeeCodec>;


const swapExactTokensForTokensCodec = t.type({
    amountIn:t.bigint,
    amountOutMin:t.bigint,
    path:t.array(t.string),
    to:t.string,
    deadline:t.bigint,
});
type swapExactTokensForTokens = t.TypeOf<typeof swapExactTokensForTokensCodec>;


const setNumTokensSellToAddToLiquidityCodec = t.type({
    numTokensSellToAddToLiquidity:t.bigint,
});
type setNumTokensSellToAddToLiquidity = t.TypeOf<typeof setNumTokensSellToAddToLiquidityCodec>;


const clearStuckBNBBalanceCodec = t.type({
    to:t.string,
    amount:t.bigint,
});
type clearStuckBNBBalance = t.TypeOf<typeof clearStuckBNBBalanceCodec>;


const swapTokensForExactETHCodec = t.type({
    amountOut:t.bigint,
    amountInMax:t.bigint,
    path:t.array(t.string),
    to:t.string,
    deadline:t.bigint,
});
type swapTokensForExactETH = t.TypeOf<typeof swapTokensForExactETHCodec>;


const setMarketFeeCodec = t.type({
    marketFee:t.bigint,
});
type setMarketFee = t.TypeOf<typeof setMarketFeeCodec>;


const setSellFeeMultiplierCodec = t.type({
    newSellFeeMultiplier:t.bigint,
});
type setSellFeeMultiplier = t.TypeOf<typeof setSellFeeMultiplierCodec>;


const setLiquidityFeeCodec = t.type({
    liquidityFee: t.bigint,
});
type setLiquidityFee = t.TypeOf<typeof setLiquidityFeeCodec>;


const swapExactTokensForETHSupportingFeeOnTransferTokensCodec = t.type({
    amountIn: t.bigint,
    amountOutMin: t.bigint,
    path: t.array(t.string),
    to: t.string,
    deadline: t.bigint,
});
type swapExactTokensForETHSupportingFeeOnTransferTokens = t.TypeOf<typeof swapExactTokensForETHSupportingFeeOnTransferTokensCodec>;

const swapExactETHForTokensSupportingFeeOnTransferTokensCodec = t.type({
    amountOutMin: t.bigint,
    path:t.array(t.string),
    to:t.string,
    deadline:t.bigint,
});
type swapExactETHForTokensSupportingFeeOnTransferTokens = t.TypeOf<typeof swapExactETHForTokensSupportingFeeOnTransferTokensCodec>;


const swapExactTokensForTokensSupportingFeeOnTransferTokensCodec = t.type({
    amountIn:t.bigint,
    amountOutMin:t.bigint,
    path:t.array(t.string),
    to:t.string,
    deadline:t.bigint,
});
type swapExactTokensForTokensSupportingFeeOnTransferTokens = t.TypeOf<typeof swapExactTokensForTokensSupportingFeeOnTransferTokensCodec>;



const swapCodec = t.type({
    swapType:t.string,
    srcToken:t.string,
    dstToken:t.string,
    srcReceiver:t.string,
    dstReceiver:t.string,
    amount:t.string,
    minReturnAmount:t.string,
    channel:t.string,
    toChainID:t.string,
    wrappedNative:t.string,
});
type swap = t.TypeOf<typeof swapCodec>;
//endregion

export { DecodedAbi,DecodedAbiObject,AddLiquidityETH };

// LOAD ABI
abiDecoder.addABI(eth_config.getDexAbi());
abiDecoder.addABI(eth_config.getSwapRouterAbi());
abiDecoder.addABI(eth_config.getEthAbi());
abiDecoder.addABI(eth_config.getTokenAbi());

export class eth_abi_decoder{

    public static decodeAbiPure(input: string | null | undefined){
        if(typeof input !== "string") throw new Error("input invalid");
        return abiDecoder.decodeMethod(input);
    }

    private static decodeAbi(input: string) : DecodedAbi | false{
        try{
            let result = abiDecoder.decodeMethod(input);
            if(isValidDecodedAbi(result)){
                return result as DecodedAbi;
            }
            else{
                return false;
            }
        }catch (e){
            return false;
        }
    }

    private static convertAbiParamsToObject(methodArguments: DecodedMethodArguments[]): object{
        let obj:{[key:string]:any} = {};
        for(let x=0;x<methodArguments.length;x++){
            let methodArg = methodArguments[x];
            if(methodArg.type === "tuple"){
                let count = 0;
                let tupleStart = methodArg.value.length;
                //@ts-ignore
                for(let key in methodArg.value){
                    if(++count > tupleStart){
                        obj[key] = methodArg.value[key];
                    }
                }
                return obj;
            }else{
                let val: string|bigint|string[] = methodArg.value;

                if(
                    methodArg.type === "uint256"
                    && typeof methodArg.value === "string"
                ){
                    val = BigInt(methodArg.value);
                }
                obj[methodArg.name] = val;
            }
        }
        return obj;
    }

    public static decodeAbiObject(input: string | null): DecodedAbiObject | false {
        if(typeof input !== "string" || tools.isEmpty(input)) throw new Error("invalid input type, string expected");

        let abi = this.decodeAbi(input);
        if(!abi) return false;

        let decodedAbiObj = {} as DecodedAbiObject;
        decodedAbiObj.abi = abi;
        decodedAbiObj.argument_names = [];
        decodedAbiObj.argument_key_value = {};
        for(let x=0;x<abi.params.length;x++){
            let param:{[key:string]:any} = abi.params[x];
            decodedAbiObj.argument_names.push(param.name);
            decodedAbiObj.argument_key_value[param.name] = param.value;
        }
        return decodedAbiObj;
    }

    //region EVENT ABI GETTERS
    private static getGenericAbiTypeStrict(abiObj: DecodedAbiObject, codec: t.Type<any>, typeName:string): any | false{
        let paramAsObject = this.convertAbiParamsToObject(abiObj.abi.params);
        let decodedCodec = codec.decode(paramAsObject);
        if(d.isRight(decodedCodec)){
            return decodedCodec.right;
        }
        console.log(abiObj.abi.params);
        console.log(paramAsObject);
        throw new Error("unable to decode method "+typeName);
    }

    // TRANSFER
    public static getTransferAbiByInput(input:string): transfer | false{
        let abiObj = this.decodeAbiObject(input);
        return this.getTransferAbi(abiObj);
    }
    public static getTransferAbi(abiObj: DecodedAbiObject | false): transfer | false{
        let methodName = "transfer";
        if(typeof abiObj === "boolean" && !abiObj) return false;
        if(abiObj.abi.name.toLowerCase() !== methodName.toLowerCase()) return false;
        return this.getGenericAbiTypeStrict(abiObj, transferCodec, methodName) as transfer;
    }

    // APPROVE
    public static getApproveAbiByInput(input:string): approve | false{
        let abiObj = this.decodeAbiObject(input);
        return this.getApproveAbi(abiObj);
    }
    public static getApproveAbi(abiObj: DecodedAbiObject | false): approve | false{
        let methodName = "approve";
        if(typeof abiObj === "boolean" && !abiObj) return false;
        if(abiObj.abi.name.toLowerCase() !== methodName.toLowerCase()) return false;
        return this.getGenericAbiTypeStrict(abiObj, approveCodec, methodName) as approve;
    }


    // addLiquidityETH
    public static getAddLiquidityETHByInput(input:string): addLiquidityETH | false{
        let abiObj = this.decodeAbiObject(input);
        return this.getAddLiquidityETH(abiObj);
    }
    public static getAddLiquidityETH(abiObj: DecodedAbiObject | false): addLiquidityETH | false{
        let methodName = "addLiquidityETH";
        if(typeof abiObj === "boolean" && !abiObj) return false;
        if(abiObj.abi.name.toLowerCase() !== methodName.toLowerCase()) return false;
        return this.getGenericAbiTypeStrict(abiObj, addLiquidityETHCodec, methodName) as addLiquidityETH;
    }


    // swapETHForExactTokens
    public static getSwapETHForExactTokensByInput(input:string): swapETHForExactTokens | false{
        let abiObj = this.decodeAbiObject(input);
        return this.getSwapETHForExactTokens(abiObj);
    }
    public static getSwapETHForExactTokens(abiObj: DecodedAbiObject | false): swapETHForExactTokens | false{
        let methodName = "swapETHForExactTokens";
        if(typeof abiObj === "boolean" && !abiObj) return false;
        if(abiObj.abi.name.toLowerCase() !== methodName.toLowerCase()) return false;
        return this.getGenericAbiTypeStrict(abiObj, swapETHForExactTokensCodec, methodName) as swapETHForExactTokens;
    }


    // swapExactETHForTokens
    public static getSwapExactETHForTokensByInput(input:string): swapExactETHForTokens | false{
        let abiObj = this.decodeAbiObject(input);
        return this.getSwapExactETHForTokens(abiObj);
    }
    public static getSwapExactETHForTokens(abiObj: DecodedAbiObject | false): swapExactETHForTokens | false{
        let methodName = "swapExactETHForTokens";
        if(typeof abiObj === "boolean" && !abiObj) return false;
        if(abiObj.abi.name.toLowerCase() !== methodName.toLowerCase()) return false;
        return this.getGenericAbiTypeStrict(abiObj, swapExactETHForTokensCodec,"swapExactETHForTokens") as swapExactETHForTokens;
    }


    // excludeFromFee
    public static getExcludeFromFeeByInput(input:string): excludeFromFee | false{
        let abiObj = this.decodeAbiObject(input);
        return this.getExcludeFromFee(abiObj);
    }
    public static getExcludeFromFee(abiObj:DecodedAbiObject | false):excludeFromFee | false{
        let methodName = "excludeFromFee";
        if(typeof abiObj === "boolean" && !abiObj) return false;
        if(abiObj.abi.name.toLowerCase() !== methodName.toLowerCase()) return false;
        return this.getGenericAbiTypeStrict(abiObj, excludeFromFeeCodec,"excludeFromFee") as excludeFromFee;
    }


    // swapExactTokensForTokens
    public static getSwapExactTokensForTokensByInput(input:string):swapExactTokensForTokens|false{
        let abiObj = this.decodeAbiObject(input);
        return this.getSwapExactTokensForTokens(abiObj);
    }
    public static getSwapExactTokensForTokens(abiObj:DecodedAbiObject|false):swapExactTokensForTokens|false{
        let methodName = "swapExactTokensForTokens";
        if(typeof abiObj === "boolean" && !abiObj) return false;
        if(abiObj.abi.name.toLowerCase() !== methodName.toLowerCase()) return false;
        return this.getGenericAbiTypeStrict(abiObj,swapExactTokensForTokensCodec,"swapExactTokensForTokens") as swapExactTokensForTokens;
    }


    // setNumTokensSellToAddToLiquidity
    public static getSetNumTokensSellToAddToLiquidityByInput(input:string):setNumTokensSellToAddToLiquidity|false{
        let abiObj = this.decodeAbiObject(input);
        return this.getSetNumTokensSellToAddToLiquidity(abiObj);
    }
    public static getSetNumTokensSellToAddToLiquidity(abiObj:DecodedAbiObject|false):setNumTokensSellToAddToLiquidity|false{
        let methodName = "setNumTokensSellToAddToLiquidity";
        if(typeof abiObj === "boolean" && !abiObj) return false;
        if(abiObj.abi.name.toLowerCase() !== methodName.toLowerCase()) return false;
        return this.getGenericAbiTypeStrict(abiObj,setNumTokensSellToAddToLiquidityCodec,"setNumTokensSellToAddToLiquidity") as setNumTokensSellToAddToLiquidity;
    }


    // clearStuckBNBBalance
    public static getClearStuckBNBBalanceByInput(input:string):clearStuckBNBBalance|false{
        let abiObj = this.decodeAbiObject(input);
        return this.getClearStuckBNBBalance(abiObj);
    }
    public static getClearStuckBNBBalance(abiObj:DecodedAbiObject|false):clearStuckBNBBalance|false{
        let methodName = "clearStuckBNBBalance";
        if(typeof abiObj === "boolean" && !abiObj) return false;
        if(abiObj.abi.name.toLowerCase() !== methodName.toLowerCase()) return false;
        return this.getGenericAbiTypeStrict(abiObj,clearStuckBNBBalanceCodec,"clearStuckBNBBalance") as clearStuckBNBBalance;
    }


    // swapTokensForExactETH
    public static getSwapTokensForExactETHByInput(input:string):swapTokensForExactETH|false{
        let abiObj = this.decodeAbiObject(input);
        return this.getSwapTokensForExactETH(abiObj);
    }
    public static getSwapTokensForExactETH(abiObj:DecodedAbiObject|false):swapTokensForExactETH|false{
        let methodName = "swapTokensForExactETH";
        if(typeof abiObj === "boolean" && !abiObj) return false;
        if(abiObj.abi.name.toLowerCase() !== methodName.toLowerCase()) return false;
        return this.getGenericAbiTypeStrict(abiObj,swapTokensForExactETHCodec,"swapTokensForExactETH") as swapTokensForExactETH;
    }


    // setMarketFee
    public static getSetMarketFeeByInput(input:string):setMarketFee|false{
        let abiObj = this.decodeAbiObject(input);
        return this.getSetMarketFee(abiObj);
    }
    public static getSetMarketFee(abiObj:DecodedAbiObject|false):setMarketFee|false{
        let methodName = "setMarketFee";
        if(typeof abiObj === "boolean" && !abiObj) return false;
        if(abiObj.abi.name.toLowerCase() !== methodName.toLowerCase()) return false;
        return this.getGenericAbiTypeStrict(abiObj,setMarketFeeCodec,"setMarketFee") as setMarketFee;
    }


    // setSellFeeMultiplier
    public static getSetSellFeeMultiplierByInput(input:string):setSellFeeMultiplier|false{
        let abiObj = this.decodeAbiObject(input);
        return this.getSetSellFeeMultiplier(abiObj);
    }
    public static getSetSellFeeMultiplier(abiObj:DecodedAbiObject|false):setSellFeeMultiplier|false{
        let methodName = "setSellFeeMultiplier";
        if(typeof abiObj === "boolean" && !abiObj) return false;
        if(abiObj.abi.name.toLowerCase() !== methodName.toLowerCase()) return false;
        return this.getGenericAbiTypeStrict(abiObj,setSellFeeMultiplierCodec,"setSellFeeMultiplier") as setSellFeeMultiplier;
    }


    // setLiquidityFee
    public static getSetLiquidityFeeByInput(input:string):setLiquidityFee|false{
        let abiObj = this.decodeAbiObject(input);
        return this.setLiquidityFee(abiObj);
    }
    public static setLiquidityFee(abiObj:DecodedAbiObject|false):setLiquidityFee|false{
        let methodName = "setLiquidityFee";
        if(typeof abiObj === "boolean" && !abiObj) return false;
        if(abiObj.abi.name.toLowerCase() !== methodName.toLowerCase()) return false;
        return this.getGenericAbiTypeStrict(abiObj,setLiquidityFeeCodec,"setLiquidityFee") as setLiquidityFee;
    }


    // swapExactTokensForETHSupportingFeeOnTransferTokens
    public static getSwapExactTokensForETHSupportingFeeOnTransferTokensByInput(input:string):swapExactTokensForETHSupportingFeeOnTransferTokens|false{
        let abiObj = this.decodeAbiObject(input);
        return this.getSwapExactTokensForETHSupportingFeeOnTransferTokens(abiObj);
    }
    public static getSwapExactTokensForETHSupportingFeeOnTransferTokens(abiObj:DecodedAbiObject|false):swapExactTokensForETHSupportingFeeOnTransferTokens|false{
        let methodName = "swapExactTokensForETHSupportingFeeOnTransferTokens";
        if(typeof abiObj === "boolean" && !abiObj) return false;
        if(abiObj.abi.name.toLowerCase() !== methodName.toLowerCase()) return false;
        return this.getGenericAbiTypeStrict(abiObj,swapExactTokensForETHSupportingFeeOnTransferTokensCodec,"swapExactTokensForETHSupportingFeeOnTransferTokens") as swapExactTokensForETHSupportingFeeOnTransferTokens;
    }




    // swapExactETHForTokensSupportingFeeOnTransferTokens
    public static getSwapExactETHForTokensSupportingFeeOnTransferTokensByInput(input:string):swapExactETHForTokensSupportingFeeOnTransferTokens|false{
        let abi = this.decodeAbiObject(input);
        return this.getSwapExactETHForTokensSupportingFeeOnTransferTokens(abi);
    }
    public static getSwapExactETHForTokensSupportingFeeOnTransferTokens(abiObj:DecodedAbiObject|false):swapExactETHForTokensSupportingFeeOnTransferTokens|false{
        let methodName = "swapExactETHForTokensSupportingFeeOnTransferTokens";
        if(typeof abiObj === "boolean" && !abiObj) return false;
        if(abiObj.abi.name.toLowerCase() !== methodName.toLowerCase()) return false;
        return this.getGenericAbiTypeStrict(abiObj,swapExactETHForTokensSupportingFeeOnTransferTokensCodec,"swapExactETHForTokensSupportingFeeOnTransferTokens") as swapExactETHForTokensSupportingFeeOnTransferTokens;
    }




    // swapExactTokensForTokensSupportingFeeOnTransferTokens
    public static getSwapExactTokensForTokensSupportingFeeOnTransferTokensByInput(input:string):swapExactTokensForTokensSupportingFeeOnTransferTokens|false{
         let abi = this.decodeAbiObject(input);
         return this.getSwapExactTokensForTokensSupportingFeeOnTransferTokens(abi);
    }
    public static getSwapExactTokensForTokensSupportingFeeOnTransferTokens(abiObj:DecodedAbiObject|false):swapExactTokensForTokensSupportingFeeOnTransferTokens|false{
        let methodName = "swapExactTokensForTokensSupportingFeeOnTransferTokens";
        if(typeof abiObj === "boolean" && !abiObj) return false;
        if(abiObj.abi.name.toLowerCase() !== methodName.toLowerCase()) return false;
        return this.getGenericAbiTypeStrict(abiObj,swapExactTokensForTokensSupportingFeeOnTransferTokensCodec,"swapExactTokensForTokensSupportingFeeOnTransferTokens") as swapExactTokensForTokensSupportingFeeOnTransferTokens;
    }



    //swap
    public static getSwapByInput(input:string):swap|false{
        let abi = this.decodeAbiObject(input);
        return this.getSwap(abi);
    }
    public static getSwap(abiObj:DecodedAbiObject|false):swap|false{
        let methodName = "swap";
        if(typeof abiObj === "boolean" && !abiObj) return false;
        if(abiObj.abi.name.toLowerCase() !== methodName.toLowerCase()) return false;
        return this.getGenericAbiTypeStrict(abiObj,swapCodec,"swap") as swap;
    }



    //endregion

}