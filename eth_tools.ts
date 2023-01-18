import {AnalysisResult, eth_types, RESULT_SEND_STATUS, RESULT_STATUS} from "./eth_types";
import {eth_transaction} from "./build/eth_transaction";

export class eth_tools{
    public static getDefaultResult(eth_txn:eth_transaction|undefined): AnalysisResult{
        return eth_types.getDefaultAnalysisResult(eth_txn);
    }

    public static async wait(ms:number){
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}