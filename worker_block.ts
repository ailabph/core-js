import {argv} from "process";
import {worker_events_token} from "./worker_events_token";
import {connection} from "./connection";
import {eth_rpc} from "./eth_rpc";
import {web3_rpc_web3} from "./web3_rpc_web3";
import {LIMITER_INFO, RATE_LIMIT_INTERVAL, tools} from "./tools";
import {config} from "./config";
import {SingleFlightBlock, worker_blocks_tools} from "./worker_blocks_tools";
import {eth_worker} from "./eth_worker";


export class worker_block{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`worker_block|${method}|${msg}`);
            if(end) console.log(`worker_block|${method}|${tools.LINE}`);
        }
    }

    //region CONFIG
    private static getBatch():number{
        return 150;
    }
    private static getHeightAllowance():number{
        return 8;
    }
    //endregion CONFIG

    //region INIT
    private static blocksToProcess:number = 0;
    private static limiterInfo:LIMITER_INFO;
    private static init(){
        if(typeof this.limiterInfo === "undefined"){
            this.limiterInfo = tools.createLimiter(25,RATE_LIMIT_INTERVAL.SECOND);
        }
    }
    //endregion

    public static async run(token_specific:boolean=true){
        const method = "run";
        this.init();
        // await connection.startTransaction();
        try{
            // from = get latest block on db
            // to = from + batch
            const latestDbBlock = await eth_worker.getLatestBlock();
            const latestBlockWeb3 = await eth_worker.getLatestBlockWeb3();
            const adjustedLatestBlockOnChain = latestBlockWeb3 - this.getHeightAllowance();
            const fromBlock = latestDbBlock + 1;
            let toBlock = fromBlock + this.getBatch();
            toBlock = toBlock > adjustedLatestBlockOnChain ? adjustedLatestBlockOnChain : toBlock;
            this.blocksToProcess = toBlock - fromBlock;
            let currentBatch = this.blocksToProcess;
            this.log(`process block from ${fromBlock} to ${toBlock} blocks to process ${this.blocksToProcess}`,method,false,true);

            for(let blockNum = fromBlock; blockNum < toBlock; blockNum++){
                await tools.useCallLimiter(this.limiterInfo);
                this.log(`...retrieving block info ${blockNum}`,method,false,true);
                this.getBlockSingleFlight(blockNum).then((blockInfo)=>{
                    --this.blocksToProcess;
                    this.log(`...${this.blocksToProcess}/${currentBatch} block ${blockInfo.result.block.number} txns ${blockInfo.result.block.transactions.length} receipts ${blockInfo.result.receipts ? blockInfo.result.receipts.length : 0} ${blockInfo.result.block.timestamp}`,method,false,true);
                    // this.restartWorker();
                });
            }

        }catch (e){
            console.log(e);
        }
        /*
        process:
        blocks
        from = get last block on db + 1
        to = get latest block
        to = to > limit ? limit : to;

        loop from to
            process++
        single flight block
        scan logs

        if process is zero restart
         */
    }
    private static async restartWorker(){
        const method = "restartWorker";
        if(tools.lesserThan(worker_block.blocksToProcess,0)){
            throw new Error(`${method} unexpected worker_block.blocksToProcess ${worker_block.blocksToProcess} < 0`);
        }
        if(worker_block.blocksToProcess === 0){
            this.log(`restarting worker...`,method);
            await tools.sleep(1000);
            setImmediate(()=>{
                this.run();
            });
        }
        else{
            this.log(`not time to restart worker, ${this.blocksToProcess} blocks remaining to be processed`,method);
        }
    }

    public static async getBlockSingleFlight(blockNumber:number):Promise<SingleFlightBlock>{
        const method = "getBlockSingleFlight";
        const blockNumberAsHex = tools.convertNumberToHex(blockNumber);
        this.log(`retrieving single flight block of ${blockNumber} as ${blockNumberAsHex}`,method);
        const response = await (new Promise((resolve, reject)=>{
            web3_rpc_web3.getWeb3Provider().send({jsonrpc:"2.0",method:"qn_getBlockWithReceipts",params:[blockNumberAsHex]},(error,result)=>{
                if(error){
                    reject(error);
                }
                if(result){
                    resolve(result);
                }
            });
        }));
        const decodedResponse = worker_blocks_tools.getSingleFlightBlockResult(response);
        if(decodedResponse){
            return decodedResponse;
        }
        const decodedError = worker_blocks_tools.getSingleFlightError(response);
        if(decodedError){
            this.log(`...response for blockNum ${blockNumber}`,method);
            this.log(`...error ${decodedError.code} ${decodedError.msg}, retrying...`,method);
            await tools.sleep(250);
            return this.getBlockSingleFlight(blockNumber);
        }
        else{
            this.log(`unexpected return from rpc, retrying...`,method);
            await tools.sleep(250);
            return this.getBlockSingleFlight(blockNumber);
        }
    }
}

if(argv.includes("run_worker_block")){
    console.log(`running worker to process blocks`);
    worker_block.run().finally();
}