import {eth_log_sig} from "./build/eth_log_sig";
import * as t from "io-ts";
import * as d from "fp-ts/Either";
import {Log} from "web3-core";
import { assert,eth_config,eth_worker } from "./ailab-core";

const Web3 = require("web3");
const Web3Provider = new Web3.providers.HttpProvider(eth_config.getRPCUrl());
const Web3Client = new Web3(Web3Provider);

//region Log Types

const ContractInfoCodec = t.type({
    address: t.string,
    name: t.string,
    symbol: t.string,
    decimals: t.union([t.string,t.number]),
});
type ContractInfo = t.TypeOf<typeof ContractInfoCodec>;
export { ContractInfo };

type BaseType = {
    method_name:string,
    ContractInfo:ContractInfo,
}
export { BaseType }

const TransferLogCodec = t.type({
    method_name:t.literal("Transfer"),
    ContractInfo:ContractInfoCodec,
    from:t.string,
    to:t.string,
    value:t.bigint,
},"transfer");
type TransferLog = t.TypeOf<typeof TransferLogCodec>;
export { TransferLog }

const SwapLogCodec = t.type({
    method_name:t.literal("Swap"),
    ContractInfo:ContractInfoCodec,
    sender:t.string,
    amount0In:t.bigint,
    amount1In:t.bigint,
    amount0Out:t.bigint,
    amount1Out:t.bigint,
    to:t.string,
},"swap");
type SwapLog = t.TypeOf<typeof SwapLogCodec>;
export { SwapLog }

const ApprovalLogCodec = t.type({
    method_name:t.literal("Approval"),
    ContractInfo:ContractInfoCodec,
    owner:t.string,
    spender:t.string,
    value:t.bigint,
},"approval");
type ApprovalLog = t.TypeOf<typeof ApprovalLogCodec>;
export { ApprovalLog }

const WithdrawalLogCodec = t.type({
    method_name:t.literal("Withdrawal"),
    ContractInfo:ContractInfoCodec,
    src:t.string,
    wad:t.bigint,
},"withdrawal");
type WithdrawalLog = t.TypeOf<typeof WithdrawalLogCodec>;
export { WithdrawalLog }

const SyncLogCodec = t.type({
    method_name:t.literal("Sync"),
    ContractInfo:ContractInfoCodec,
    reserve0:t.bigint,
    reserve1:t.bigint,
},"sync");
type SyncLog = t.TypeOf<typeof SyncLogCodec>;
export { SyncLog }

const DepositLogCodec = t.type({
    method_name:t.literal("Deposit"),
    ContractInfo:ContractInfoCodec,
    user:t.string,
    amount:t.bigint,
},"deposit");
type DepositLog = t.TypeOf<typeof DepositLogCodec>;
export { DepositLog }

const MintLogCodec = t.type({
    method_name:t.literal("Mint"),
    ContractInfo:ContractInfoCodec,
    sender: t.string,
    amount0: t.bigint,
    amount1: t.bigint,
},"mint");
type MintLog = t.TypeOf<typeof MintLogCodec>;
export { MintLog }

//endregion

export class eth_log_decoder{

    public static async decodeLog(log: Log): Promise<BaseType> {
        if(typeof log.topics === "undefined") throw new Error(`topics is not defined`);
        if(log.topics.length === 0) throw new Error(`there is no topics`);

        // extract signature
        let signature = log.topics[0];
        signature = signature.replace(/^(0x)/, "");
        // retrieve signature from DB
        let logSig = new eth_log_sig();
        logSig.signature = signature;
        await logSig.fetch();
        if(logSig.isNew()) {
            // console.warn(`signature not found on database for hash:${log.transactionHash} log_signature:${signature}`);
            return {ContractInfo: {
                    address: "",
                    name: "",
                    symbol: "",
                    decimals: 0,
                }, method_name: ""};
        }
        assert.notEmpty(logSig.params_names,"params_names");
        logSig.params_names = assert.isString({val:logSig.params_names,prop_name:"params_names",strict:true});

        // build data object
        // For future reference example:
        // -- Transfer(address indexed from,address indexed to,uint256 value);Transfer...
        let method_object:any = {};

        let parameters = logSig.params_names;
        let parts: string[]|string = parameters.split(";");
            parts = parts[0];
            parts = parts.split("(");
        const logMethodName = assert.isString({val:parts[0],prop_name:"log method name",strict:true});
        let args = assert.isString({val:parts[1],prop_name:"log method arguments",strict:true});
            args = args.replace(")","");

        //// get method name
        method_object.method_name = logMethodName;
        method_object.ContractInfo = {
            address: "",
            name: "",
            symbol: "",
            decimals: 0,
        } as ContractInfo;

        let contractMetaData = await eth_worker.getContractMetaData(log.address);
        assert.isset({val:contractMetaData.symbol,prop_name:"contractMetaData.symbol",strict:true});

        method_object.ContractInfo.address = log.address;
        method_object.ContractInfo.name = contractMetaData.name;
        method_object.ContractInfo.symbol = contractMetaData.symbol;
        method_object.ContractInfo.decimals = contractMetaData.decimals;

        //// segregate indexes and parameter name and values
        //     parts = parts[1].replace(")","");
        //     parts = parts.split(",");
        const arg_parts = args.split(",");

        let parameterNames:string[] = [];
        let parameterTypes:string[] = [];

        let topicLogIndex = 0;

        for(let x=0;x<arg_parts.length;x++){
            let parameter_parts = arg_parts[x].split(" ");
            let isIndex = (typeof parameter_parts[1] === "string" && parameter_parts[1] === "indexed");
            let parameter_name = parameter_parts[parameter_parts.length-1];
            let parameter_type = parameter_parts[0];
            let parameter_value:bigint|string = "";
            if(isIndex){
                parameter_value = log.topics[++topicLogIndex].replace("0x000000000000000000000000","0x");
                if(parameter_type.indexOf("uint") >= 0){
                    parameter_value = BigInt(parameter_value);
                }
            }
            else{
                parameterNames.push(parameter_name);
                parameterTypes.push(parameter_type);
            }
            method_object[parameter_name] = parameter_value;
        }

        //// decode data based on collected parameter types
        let decodedDataCollection = Web3Client.eth.abi.decodeParameters(parameterTypes, log.data);
        for(let x=0;x<parameterNames.length;x++){
            if(typeof decodedDataCollection[x] === "undefined") {
                console.log("COLLECTED PARAMETERS");
                console.log(parameterNames);
                console.log("DECODED DATA COLLECTION");
                console.log(decodedDataCollection);
                throw new Error("decoded data collection do not match collected parameters");
            }
            if(typeof decodedDataCollection[x] === "string"){
                method_object[parameterNames[x]] = decodedDataCollection[x].replace("0x000000000000000000000000","0x");
            }
            if(parameterTypes[x].indexOf("uint") >= 0){
                method_object[parameterNames[x]] = BigInt(method_object[parameterNames[x]]);
            }
        }

        return method_object;
    }

    //region Log Type Getters
    public static async getTransferLog(log: Log): Promise<TransferLog | false>{
        let decodedLog = await this.decodeLog(log);
        if(!decodedLog) return false;
        if(decodedLog.method_name.toLowerCase() !== TransferLogCodec.name.toLowerCase()) return false;
        let processedData = TransferLogCodec.decode(decodedLog);
        if(d.isRight(processedData)){
            return processedData.right as TransferLog;
        }
        console.log(decodedLog);
        console.log(processedData.left[0].context);
        throw new Error("log is transfer but unable to identify type");
    }
    public static async getSwapLog(log: Log): Promise<SwapLog | false>{
        let decodedLog = await this.decodeLog(log);
        if(!decodedLog) return false;
        if(decodedLog.method_name.toLowerCase() !== SwapLogCodec.name) return false;
        let processedData = SwapLogCodec.decode(decodedLog);
        if(d.isRight(processedData)){
            return processedData.right as SwapLog;
        }
        console.log(decodedLog);
        console.log(processedData);
        throw new Error("log is swap but unable to identify type");
    }
    public static async getApprovalLog(log: Log): Promise<ApprovalLog | false>{
        let decodedLog = await this.decodeLog(log);
        if(!decodedLog) return false;
        if(decodedLog.method_name.toLowerCase() !== ApprovalLogCodec.name) return false;
        let processedData = ApprovalLogCodec.decode(decodedLog);
        if(d.isRight(processedData)){
            return processedData.right as ApprovalLog;
        }
        console.log(decodedLog);
        console.log(processedData);
        throw new Error("log is approval but unable to identify type");
    }
    public static async getWithdrawalLog(log: Log): Promise<WithdrawalLog | false>{
        let decodedLog = await this.decodeLog(log);
        if(!decodedLog) return false;
        if(decodedLog.method_name.toLowerCase() !== WithdrawalLogCodec.name) return false;
        let processedData = WithdrawalLogCodec.decode(decodedLog);
        if(d.isRight(processedData)){
            return processedData.right as WithdrawalLog;
        }
        console.log(decodedLog);
        console.log(processedData);
        throw new Error("log is withdrawal but unable to identify type");
    }
    public static async getSyncLog(log: Log): Promise<SyncLog | false>{
        let decodedLog = await this.decodeLog(log);
        if(!decodedLog) return false;
        if(decodedLog.method_name.toLowerCase() !== SyncLogCodec.name) return false;
        let processedData = SyncLogCodec.decode(decodedLog);
        if(d.isRight(processedData)){
            return processedData.right as SyncLog;
        }
        console.log(decodedLog);
        console.log(processedData);
        throw new Error("log is sync but unable to identify type");
    }
    public static async getDepositLog(log: Log): Promise<DepositLog | false>{
        let decodedLog = await this.decodeLog(log);
        if(!decodedLog) return false;
        if(decodedLog.method_name.toLowerCase() !== DepositLogCodec.name) return false;
        let processedData = DepositLogCodec.decode(decodedLog);
        if(d.isRight(processedData)){
            return processedData.right as DepositLog;
        }
        console.log(decodedLog);
        console.log(processedData);
        throw new Error("log is Deposit but unable to identify type");
    }
    public static async getMintLog(log: Log): Promise<MintLog | false>{
        let decodedLog = await this.decodeLog(log);
        if(!decodedLog) return false;
        if(decodedLog.method_name.toLowerCase() !== MintLogCodec.name) return false;
        let processedData = MintLogCodec.decode(decodedLog);
        if(d.isRight(processedData)){
            return processedData.right as MintLog;
        }
        console.log(decodedLog);
        console.log(processedData);
        throw new Error("log is "+MintLogCodec.name+" but unable to identify type");
    }
    //endregion
}