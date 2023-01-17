import {AnalysisResult, RESULT_SEND_STATUS, RESULT_STATUS} from "./eth_types";

export class eth_tools{
    public static getDefaultResult(): AnalysisResult{
        let result = {} as AnalysisResult;

        result.hash = "";
        result.blockNumber = 0;
        result.block_time = 0;
        result.status = RESULT_STATUS.NOT_INVOLVED;
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
        result.sendStatus = RESULT_SEND_STATUS.FAILED;
        
        return result;
    }

    public static async wait(ms:number){
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}