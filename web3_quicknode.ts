import {config} from "./config";
import {eth_rpc} from "./eth_rpc";
import {tools} from "./tools";
import {TransactionReceipt} from "web3-eth";
import {BlockTransactionObject} from "web3-eth/types";

//region TYPES
type BLOCK_WITH_RECEIPTS = {
    block:BlockTransactionObject,
    receipts:TransactionReceipt[],
}
//endregion TYPES

export class web3_quicknode{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`web3_quicknode|${method}|${msg}`);
            if(end) console.log(`web3_quicknode|${method}|${tools.LINE}`);
        }
    }
    private static retryWaitDuration():number{
        return 500;
    }
    private static retryLimit():number{
        return 20;
    }

    public static async getLatestBlock():Promise<number>{
        const method = "getLatestBlock";
        this.log("getting latest block",method);
        let latestBlockNumber = 0;
        try{
            latestBlockNumber = await eth_rpc.getEtherProvider().provider.getBlockNumber();
        }
        catch (e){
            if(e instanceof Error && !tools.isEmpty(e.message)){
                this.log(e.message,method,true,true);
                throw new web3_quicknode_error(e.message);
            }
        }
        this.log(`latest block:${latestBlockNumber}`,method,true);
        return latestBlockNumber;
    }

    public static async qn_getBlockWithReceipts(blockNumber:number, retry_count:number=0):Promise<BLOCK_WITH_RECEIPTS|false>{
        const method = "qn_getBlockWithReceipts";
        if(retry_count >= this.retryLimit()){
            this.log(`retry limit reached:${retry_count}/${this.retryLimit()}`,method,true);
            return false;
        }
        this.log(`retrieving block with recipts of ${blockNumber}. retry_count:${retry_count}/${this.retryLimit()}`,method);
        const blockNumberAsHex = tools.convertNumberToHex(blockNumber);
        try{
            return await eth_rpc.getEtherProvider().provider.send("qn_getBlockWithReceipts", [blockNumberAsHex]) as BLOCK_WITH_RECEIPTS;
        }catch (e){
            console.log(`${blockNumber} not yet on chain, retrying...`);
            await tools.sleep(this.retryWaitDuration());
            return this.qn_getBlockWithReceipts(blockNumber,++retry_count);
        }
    }

}

class web3_quicknode_error extends Error{
    constructor(message:string) {
        super(message);
    }
}