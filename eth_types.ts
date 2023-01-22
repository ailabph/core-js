import {TransactionReceipt} from "web3-eth/types";
import {Account, AddedAccount, EncryptedKeystoreV3Json} from "web3-core/types";
import {eth_transaction} from "./build/eth_transaction";
import {tools} from "./tools";
import {assert} from "./assert";

export class eth_types{

    public static getDefaultAnalysisResult(eth?:eth_transaction|undefined):AnalysisResult{
        let result:AnalysisResult = {
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
            taxPerc:"0",
            taxAmount:"0",
            type: ""
        };
        if(eth){
            result = tools.importObjectValuesInto<eth_transaction,AnalysisResult>(eth,result);
            result.hash = assert.isString({val:eth.hash,prop_name:"eth.hash"});
            result.blockNumber = assert.isNumber(eth.blockNumber,"result.blockNumber",0);
            result.fromAddress = assert.isString({val:eth.fromAddress,prop_name:"eth.fromAddress"});
            result.toAddress = assert.isString({val:eth.toAddress ?? "",prop_name:"eth.toAddress"});
        }
        return result;
    }

    public static getDefaultTransactionReceipt():TransactionReceipt{
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

type AnalysisResult = {
    hash: string,
    blockNumber: number,
    block_time: number | string,
    status: RESULT_STATUS,
    type: string,
    tag: string,
    method: string,
    fromAddress: string,
    fromContract: string,
    fromSymbol: string,
    fromDecimal: number|string,
    fromValue: string,
    fromAmount: string,
    fromAmountGross: string,
    fromTaxAmount: string,
    fromTaxPerc: string,
    toAddress: string,
    toContract: string,
    toSymbol: string,
    toDecimal: number|string,
    toValue: string,
    toAmount: string,
    toAmountGross: string,
    toTaxAmount: string,
    toTaxPerc: string,
    taxPerc: string,
    taxAmount: string,
    abiDecodeStatus: string,
    sendStatus: RESULT_SEND_STATUS,
}
export { AnalysisResult };

enum RESULT_STATUS {
    INVOLVED = "involved",
    NOT_INVOLVED = "not_involved",
}
export { RESULT_STATUS }

enum RESULT_SEND_STATUS {
    NOT_CHECKED = "not_checked",
    SUCCESS = "success",
    FAILED = "failed",
}
export { RESULT_SEND_STATUS }

type GasInfo = {
    gasPrice: string,
    estimateGas: number,
    gasLimit: number,
}
export { GasInfo };

type ContractInfo = {
    address: string,
    name: string,
    symbol: string,
    decimals: number|string,
}
export { ContractInfo };

type LogData = {
    contract: string,
    symbol: string,
    decimal: number|string,
    method_name: string,
    indexArgs: any[],
    indexArgsObj: any,
    parameters: any[],
    parametersObj: any,
    arguments: any,
}
export { LogData };

type LogSigArgs = {
    type:string,
    name:string,
    value:any,
}
export { LogSigArgs };

type AnalyzeLogsResult = {
    result: LogData[],
    receipt: TransactionReceipt
}
export { AnalyzeLogsResult };

type WalletInfo = {
    account: Account,
    wallet: AddedAccount,
    keystore: EncryptedKeystoreV3Json
}
export { WalletInfo };

type BnbUsdReserve = {
    bnb:bigint,
    usd:bigint
}
export { BnbUsdReserve };

type TokenBnbReserve = {
    bnb:bigint,
    token:bigint
}
export { TokenBnbReserve };

// export { GasInfo, ContractInfo, DecodedAbi, LogData, LogSigArgs, AnalyzeLogsResult, WalletInfo }