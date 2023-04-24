import {argv} from "process";
import {connection} from "./connection";
import {web3_rpc_web3} from "./web3_rpc_web3";
import {LIMITER_INFO, RATE_LIMIT_INTERVAL, tools} from "./tools";
import {config} from "./config";
import {SingleFlightBlockDecoded, worker_blocks_tools} from "./worker_blocks_tools";
import {eth_worker} from "./eth_worker";
import {TIME_FORMATS, time_helper} from "./time_helper";
import {eth_block} from "./build/eth_block";
import {eth_transaction} from "./build/eth_transaction";
import {eth_receipt} from "./build/eth_receipt";
import {eth_log_sig} from "./build/eth_log_sig";
import {eth_receipt_logs} from "./build/eth_receipt_logs";


export class worker_block{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`worker_block|${method}|${msg}`);
            if(end) console.log(`worker_block|${method}|${tools.LINE}`);
        }
    }

    //region CONFIG
    private static getBatch():number{
        return 2;
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
        await connection.startTransaction();
        const startTime = tools.getCurrentTimeStamp();
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
                this.getBlockSingleFlight(blockNum).then(async (blockInfo)=>{
                    --this.blocksToProcess;
                    this.log(`...${this.blocksToProcess}/${currentBatch} block ${blockInfo.result.block.number} txns ${blockInfo.result.block.transactions.length} receipts ${blockInfo.result.receipts ? blockInfo.result.receipts.length : 0} ${blockInfo.result.block.timestamp}`,method,false,true);
                    for(const transaction of blockInfo.result.block.transactions){
                        this.log(`......${transaction.hash} ${transaction.value} ${transaction.blockNumber} ${transaction.transactionIndex}`,method);
                    }
                    if(blockInfo.result.receipts){
                        // const web3Logs = worker_blocks_tools.getLogsArray(blockInfo.result.receipts);
                        // await eth_receipt_logs_tools.analyzeLogsInvolvement(web3Logs)
                    }
                    await eth_worker.getBlockByNumber(blockNum);
                    if(this.blocksToProcess === 0){
                        await connection.commit();
                        const endTime = tools.getCurrentTimeStamp();
                        const diff = endTime - startTime;
                        const minutes = Math.floor(diff / 60);
                        const minutesInSeconds = minutes * 60;
                        const seconds = diff - minutesInSeconds;
                        const blocksPerMinute = 20;
                        const blocksPerHour = 1200;
                        let processBlocksPerHour:number|string = blocksPerHour / currentBatch;
                        processBlocksPerHour = processBlocksPerHour * diff;
                        processBlocksPerHour = (processBlocksPerHour / 60).toFixed(2);
                        const blocksPerDay = 28800;
                        let processBlocksPerDay:number|string = blocksPerDay / currentBatch;
                        processBlocksPerDay = processBlocksPerDay * diff;
                        processBlocksPerDay = (processBlocksPerDay / 60).toFixed(2);

                        console.log(`run time ${minutes} minutes ${seconds} seconds to process ${currentBatch} blocks`);
                        console.log(`estimated ${processBlocksPerHour} minutes to process 1 hour worth of blocks (${blocksPerHour})`);
                        console.log(`estimated ${processBlocksPerDay} minutes to process 1 day worth of blocks (${blocksPerDay})`);
                        const used = process.memoryUsage().heapUsed / 1024 / 1024;
                        console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
                        await worker_block.restartWorker();
                    }
                });
            }
        }catch (e){
            console.log(e);
            await connection.rollback();
        }
    }
    private static async restartWorker(){
        const method = "restartWorker";
        if(tools.lesserThan(worker_block.blocksToProcess,0)){
            throw new Error(`${method} unexpected worker_block.blocksToProcess ${worker_block.blocksToProcess} < 0`);
        }
        if(worker_block.blocksToProcess === 0){
            this.log(`committing and restarting worker...`,method);
            await tools.sleep(1000);
            setImmediate(()=>{
                worker_block.run().finally();
            });
        }
        else{
            this.log(`not time to restart worker, ${this.blocksToProcess} blocks remaining to be processed`,method);
        }
    }

    //region RPC
    public static async getBlockSingleFlight(blockNumber:number):Promise<SingleFlightBlockDecoded>{
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
    //endregion RPC

    //region TEST
    private static batchLimit:number = 100;
    private static remaining:number = 0;
    private static estimatedBlocksPerDay = 28800;
    public static async run2(){
        await connection.startTransaction();
        console.time('run2');
        const startBlock = 25285657;
        const limit = worker_block.batchLimit;
        const endBlock = startBlock + limit;
        for(let block = startBlock; block < endBlock; block++){
            const block_res = await worker_block.getBlockSingleFlight(block);
            if(block_res){
                console.log(`block ${block} txns ${block_res.result.block.transactions.length}`)
            }
        }
        console.timeEnd('run2');
        await connection.rollback();
    }
    public static async run3(){
        await connection.startTransaction();
        console.time('run2');
        const start = performance.now();
        const startBlock = 25285657;
        const limit = worker_block.batchLimit;
        const endBlock = startBlock + limit;
        worker_block.remaining = limit;
        for(let block = startBlock; block < endBlock; block++){
            console.log(`retrieving block info ${block}`);
            await tools.sleep(10);
            worker_block.getBlockSingleFlight(block).then((block_res)=>{
                console.log(`remaining ${--worker_block.remaining} block ${block_res.result.block.number} txns ${block_res.result.block.transactions.length}`);
                const dbBlock = new eth_block();
                if(typeof block_res.result.block.number === "string"){

                }

                if(worker_block.remaining === 0){
                    const end = performance.now();
                    const elapsed = (end - start) / 1000;
                    console.timeEnd('run2');
                    const batchPerDay = worker_block.estimatedBlocksPerDay / worker_block.batchLimit;
                    const totalSecPerDay = batchPerDay * elapsed;
                    const totalSecPerMonth = totalSecPerDay * 30;
                    const totalSecPerYear = totalSecPerMonth * 12;
                    console.log(`completed in ${elapsed.toFixed(3)}s Est per month: ${time_helper.formatSeconds(totalSecPerMonth)} | Est per year: ${time_helper.formatSeconds(totalSecPerYear)}`);
                }
            });
        }
        await connection.rollback();
    }
    public static async run4(){
        for(let x=0;x<1000;x++){
            worker_block.testGetBlock().then((block_num)=>{
                console.log(block_num);
            });
        }
    }
    public static async testGetBlock(){
        // await tools.sleep(3000);
        // return worker_block.getNextBlock();
    }
    private static currentBlock:number = 0;
    public static getNextBlock():number|false{
        if(++worker_block.currentBlock < worker_block.stopOnBlock){
            return worker_block.currentBlock;
        }
        return false;
    }

    private static blocksTimeStamp:{[key:number]:number} = {};
    private static stopOnBlock = 25285657;
    private static blocksProcessed = 0;
    public static async run5(){
        console.time('run5');
        const start = performance.now();
        let hasEnded = false;

        worker_block.blocksTimeStamp[0] = 0;
        worker_block.currentBlock = 25285657 - 3000;
        const worker_limit = 50;
        // launch workers
        for(let queue_id=1;queue_id<=worker_limit;queue_id++){
            await tools.sleep(20);
            worker_block.retrieveBlockInfo(queue_id).then(()=>{
                if(hasEnded) return;
                if(this.currentBlock >= this.stopOnBlock){
                    hasEnded = true;
                    const end = performance.now();
                    const elapsed = (end - start) / 1000;
                    console.timeEnd('run5');
                    const batchPerDay = worker_block.estimatedBlocksPerDay / worker_block.blocksProcessed;
                    const totalSecPerDay = batchPerDay * elapsed;
                    const totalSecPerMonth = totalSecPerDay * 30;
                    const totalSecPerYear = totalSecPerMonth * 12;
                    console.log(`${worker_block.blocksProcessed} blocks completed in ${elapsed.toFixed(3)}s Est per month: ${time_helper.formatSeconds(totalSecPerMonth)} | Est per year: ${time_helper.formatSeconds(totalSecPerYear)}`);
                }
            });
        }
    }

    public static async retrieveBlockInfo(queue_id:number):Promise<void>{
        const blockToProcess = worker_block.getNextBlock();
        if(blockToProcess){
            worker_block.blocksProcessed++;
            console.log(`${queue_id} retrieving block ${blockToProcess}`);
            if(typeof worker_block.blocksTimeStamp[blockToProcess] === "number"){
                throw new Error(`clash in block number ${blockToProcess}`);
            }
            worker_block.blocksTimeStamp[blockToProcess] = 0;
            const blockRes = await worker_block.getBlockSingleFlight(blockToProcess);
            worker_block.blocksTimeStamp[blockToProcess] = blockRes.result.block.timestamp;
            await tools.sleep(15);
            return worker_block.retrieveBlockInfo(queue_id);
        }
        else{
            // console.log(`${queue_id} done`);
        }
    }

    public static workerWaitTimeMs:number = 50;
    public static blocksProcessed6:number = 0;
    public static currentBlock6:number = 0;
    public static latestBlock6:number = 0;
    public static batchLimit6:number = 1000;
    public static workerLimit6:number = 200;
    public static blockNumberTimestamp6:{[key:number]:number} = {};

    public static async run6():Promise<void>{
        console.time('run6');
        const start = performance.now();
        await connection.startTransaction();
        worker_block.blocksProcessed6 = 0;
        worker_block.blockNumberTimestamp6 = {};
        worker_block.latestBlock6 = await eth_worker.getLatestBlockWeb3();
        worker_block.currentBlock6 = await eth_worker.getLatestBlock();
        let endCount:number = 0;
        let height = worker_block.latestBlock6 - worker_block.currentBlock6;
        if(height > worker_block.batchLimit6){
            worker_block.latestBlock6 = worker_block.currentBlock6 + worker_block.batchLimit6;
        }
        height = worker_block.latestBlock6 - worker_block.currentBlock6;
        console.log(`latest block on chain ${worker_block.latestBlock6} | latest block on db ${worker_block.currentBlock6} | height ${height}`);

        try{
            for(let queue_id=1;queue_id <= worker_block.workerLimit6; queue_id++){
                await tools.sleep(worker_block.workerWaitTimeMs);
                worker_block.retrieveBlockInfo6(queue_id).then(async ()=>{
                    if(++endCount < worker_block.workerLimit6) return;
                    await connection.commit();

                    //region PERFORMANCE INFO
                    const end = performance.now();
                    const elapsed = (end - start) / 1000;
                    console.timeEnd('run6');
                    const batchPerDay = worker_block.estimatedBlocksPerDay / worker_block.blocksProcessed6;
                    const totalSecPerDay = batchPerDay * elapsed;
                    const totalSecPerMonth = totalSecPerDay * 30;
                    const totalSecPerYear = totalSecPerMonth * 12;
                    console.log(`${worker_block.blocksProcessed6} blocks completed in ${elapsed.toFixed(3)}s Est per month: ${time_helper.formatSeconds(totalSecPerMonth)} | Est per year: ${time_helper.formatSeconds(totalSecPerYear)}`);
                    //endregion PERFORMANCE INFO

                    await tools.sleep(250);
                    setImmediate(()=>{
                        return worker_block.run6();
                    });
                });
            }
        }catch (e) {
            await connection.rollback();
            const errorMsg = e instanceof Error ? e.message : "unknown_error";
            console.log(`ERROR ${errorMsg}`);
        }
    }

    public static getNextBlock6():number|false{
        if(++worker_block.currentBlock6 < worker_block.latestBlock6){
            return worker_block.currentBlock6;
        }
        return false;
    }

    public static async retrieveBlockInfo6(queue_id:number):Promise<void>{
        const blockToProcess = worker_block.getNextBlock6();
        if(blockToProcess){
            if(typeof worker_block.blockNumberTimestamp6[blockToProcess] === "number"){
                throw new Error(`clash in block number ${blockToProcess}`);
            }
            worker_block.blockNumberTimestamp6[blockToProcess] = 0;
            const blockRes = await worker_block.getBlockSingleFlight(blockToProcess);

            if(blockRes.result.block.number === null){
                throw new Error(`returned info from rpc has no block number (block to process ${blockToProcess})`);
            }

            // add block
            const newBlock = new eth_block();
            // newBlock.blockNumber = blockRes.result.block.number;
            // await newBlock.fetch();
            // if(newBlock.recordExists()){
            //     throw new Error(`${blockToProcess} already on db`);
            // }
            newBlock.blockNumber = blockRes.result.block.number;
            newBlock.blockHash = blockRes.result.block.hash;
            newBlock.time_added = blockRes.result.block.timestamp;
            await newBlock.save();

            // add transaction
            for(const transaction of blockRes.result.block.transactions){
                const newTxn = new eth_transaction();
                // newTxn.hash = transaction.hash;
                // await newTxn.fetch();
                // if(newTxn.recordExists()) throw new Error(`${blockToProcess} ${transaction.hash} already on db`);
                newTxn.hash = transaction.hash;
                newTxn.blockHash = transaction.blockHash;
                newTxn.blockNumber = transaction.blockNumber;
                newTxn.blockTime = blockRes.result.block.timestamp;
                newTxn.fromAddress = transaction.from;
                newTxn.gas = transaction.gas+"";
                newTxn.gasPrice = transaction.gasPrice+"";
                newTxn.input = transaction.input;
                newTxn.nonce = transaction.nonce;
                newTxn.toAddress = transaction.to;
                newTxn.value = transaction.value+"";
                newTxn.type = transaction.type;
                newTxn.chainId = transaction.chainId+"";
                newTxn.v = transaction.v+"";
                newTxn.r = transaction.r;
                newTxn.s = transaction.s;
                await newTxn.save();
            }

            // add receipt
            if(blockRes.result.receipts){
                for(const receipt of blockRes.result.receipts){
                    const newReceipt = new eth_receipt();
                    // newReceipt.transactionHash = receipt.transactionHash;
                    // await newReceipt.fetch();
                    // if(newReceipt.recordExists()) throw new Error(`${blockToProcess} ${receipt.transactionHash} receipt already on db`);
                    newReceipt.blockHash = receipt.blockHash;
                    newReceipt.blockNumber = receipt.blockNumber;
                    newReceipt.contractAddress = receipt.contractAddress;
                    newReceipt.cumulativeGasUsed = receipt.cumulativeGasUsed+"";
                    newReceipt.effectiveGasPrice = receipt.effectiveGasPrice+"";
                    newReceipt.fromAddress = receipt.from;
                    newReceipt.gasUsed = receipt.gasUsed+"";
                    newReceipt.logsBloom = receipt.logsBloom;
                    newReceipt.status = receipt.status+"";
                    newReceipt.toAddress = receipt.to;
                    newReceipt.transactionHash = receipt.transactionHash;
                    newReceipt.type = receipt.type;
                    await newReceipt.save();

                    // add logs
                    for(const log of receipt.logs){
                        const newLog = new eth_receipt_logs();
                        // newLog.transactionHash = log.transactionHash;
                        // newLog.logIndex = log.logIndex;
                        // await newLog.fetch();
                        // if(newLog.recordExists()) throw new Error(`block ${blockToProcess} logIndex ${log.logIndex} log already in db`);
                        newLog.receipt_id = newReceipt.id;
                        newLog.txn_hash = log.transactionHash;
                        newLog.address = log.address;
                        newLog.topics = JSON.stringify(log.topics);
                        newLog.data = log.data;
                        newLog.blockNumber = log.blockNumber;
                        newLog.timestamp = blockRes.result.block.timestamp+"";
                        newLog.transactionHash = log.transactionHash;
                        newLog.transactionIndex = log.transactionIndex;
                        newLog.blockHash = log.blockHash;
                        newLog.logIndex = log.logIndex;
                        newLog.removed = log.removed?1:0;
                        newLog.blockTime = blockRes.result.block.timestamp;
                        await newLog.save();
                    }
                }
            }

            worker_block.blockNumberTimestamp6[blockToProcess] = blockRes.result.block.timestamp;
            console.log(`${queue_id} | ${++worker_block.blocksProcessed6} | block ${blockRes.result.block.number} ${time_helper.getAsFormat(blockRes.result.block.timestamp,TIME_FORMATS.ISO)}`)
            await tools.sleep(worker_block.workerWaitTimeMs);
            return worker_block.retrieveBlockInfo6(queue_id);
        }
    }


    // run7 - fill up blocks that are missing from eth_worker_logs
    public static from_block_count:number = 1000;
    public static heightDelay:number = 10;
    public static async run7(){
        // get latest block on db
        // start = latest block - from_block_count
        // to = latest block = heightDelay
        // loop each block and check if exists on db and add to collection = missing_blocks
        // loop each blocks and use single flight block
        console.log(`retrieving latest block on db`);
        const latestBlockDb = new eth_block();
        await latestBlockDb.list(" WHERE 1 ",{}," ORDER BY blockNumber DESC LIMIT 1 ");
        if(latestBlockDb.count() === 0) throw new Error(`no blocks on database`);
        const latest_block:number = latestBlockDb.getItem().blockNumber;
        console.log(`...latest block is ${latest_block}`);

        const start:number = latest_block - this.from_block_count;
        const to:number = latest_block - this.heightDelay;
        console.log(`...checking blocks from ${start} to ${to}`);

        const missingBlocks = [];
        for(let x=start;x<to;x++){
            console.log(`...checking block ${x} if exits on db`);
            const checkBlock = new eth_block();
            checkBlock.blockNumber = x;
            await checkBlock.fetch();
            if(checkBlock.isNew()){
                console.log(`...... does not exist on db, adding to list`);
                missingBlocks.push(x);
            }
            else{
                console.log(`...... already on db`);
            }
        }
        console.log(`...${missingBlocks.length} blocks missing, processing`);
        for(const blockNumber of missingBlocks){
            console.log(`......processing block ${blockNumber}`);
            let blockRes:SingleFlightBlockDecoded|false = false;
            try{
                blockRes = await worker_block.getBlockSingleFlight(blockNumber);
                await tools.sleep(100);
            }catch (e){
                console.log(`ERROR detected retrieving data on RPC, skipping`);
                if(e instanceof Error){
                    console.log(e.message);
                }
                await tools.sleep(3000);
            }
            if(!blockRes) continue;

            // add block
            const newBlock = new eth_block();
            newBlock.blockNumber = blockRes.result.block.number ?? 0;
            await newBlock.fetch();
            if(newBlock.recordExists()) continue;
            newBlock.blockHash = blockRes.result.block.hash;
            newBlock.time_added = blockRes.result.block.timestamp;
            await newBlock.save();

            let totalTxns = 0;
            // add transaction
            for(const transaction of blockRes.result.block.transactions){
                const newTxn = new eth_transaction();
                // newTxn.hash = transaction.hash;
                // await newTxn.fetch();
                // if(newTxn.recordExists()) throw new Error(`${blockToProcess} ${transaction.hash} already on db`);
                newTxn.hash = transaction.hash;
                newTxn.blockHash = transaction.blockHash;
                newTxn.blockNumber = transaction.blockNumber;
                newTxn.blockTime = blockRes.result.block.timestamp;
                newTxn.fromAddress = transaction.from;
                newTxn.gas = transaction.gas+"";
                newTxn.gasPrice = transaction.gasPrice+"";
                newTxn.input = transaction.input;
                newTxn.nonce = transaction.nonce;
                newTxn.toAddress = transaction.to;
                newTxn.value = transaction.value+"";
                newTxn.type = transaction.type;
                newTxn.chainId = transaction.chainId+"";
                newTxn.v = transaction.v+"";
                newTxn.r = transaction.r;
                newTxn.s = transaction.s;
                await newTxn.save();
                totalTxns++;
            }

            let totalLogs = 0;
            // add receipt
            if(blockRes.result.receipts){
                for(const receipt of blockRes.result.receipts){
                    const newReceipt = new eth_receipt();
                    // newReceipt.transactionHash = receipt.transactionHash;
                    // await newReceipt.fetch();
                    // if(newReceipt.recordExists()) throw new Error(`${blockToProcess} ${receipt.transactionHash} receipt already on db`);
                    newReceipt.blockHash = receipt.blockHash;
                    newReceipt.blockNumber = receipt.blockNumber;
                    newReceipt.contractAddress = receipt.contractAddress;
                    newReceipt.cumulativeGasUsed = receipt.cumulativeGasUsed+"";
                    newReceipt.effectiveGasPrice = receipt.effectiveGasPrice+"";
                    newReceipt.fromAddress = receipt.from;
                    newReceipt.gasUsed = receipt.gasUsed+"";
                    newReceipt.logsBloom = receipt.logsBloom;
                    newReceipt.status = receipt.status+"";
                    newReceipt.toAddress = receipt.to;
                    newReceipt.transactionHash = receipt.transactionHash;
                    newReceipt.type = receipt.type;
                    await newReceipt.save();

                    // add logs
                    for(const log of receipt.logs){
                        const newLog = new eth_receipt_logs();
                        // newLog.transactionHash = log.transactionHash;
                        // newLog.logIndex = log.logIndex;
                        // await newLog.fetch();
                        // if(newLog.recordExists()) throw new Error(`block ${blockToProcess} logIndex ${log.logIndex} log already in db`);
                        newLog.receipt_id = newReceipt.id;
                        newLog.txn_hash = log.transactionHash;
                        newLog.address = log.address;
                        newLog.topics = JSON.stringify(log.topics);
                        newLog.data = log.data;
                        newLog.blockNumber = log.blockNumber;
                        newLog.timestamp = blockRes.result.block.timestamp+"";
                        newLog.transactionHash = log.transactionHash;
                        newLog.transactionIndex = log.transactionIndex;
                        newLog.blockHash = log.blockHash;
                        newLog.logIndex = log.logIndex;
                        newLog.removed = log.removed?1:0;
                        newLog.blockTime = blockRes.result.block.timestamp;
                        await newLog.save();
                        totalLogs++;
                    }
                }
            }
            console.log(`.........${totalTxns} transacitons saved. ${totalLogs} logs saved.`);
        }
        await tools.sleep(3000);
        setImmediate(()=>{ worker_block.run7(); });
    }

    //endregion TEST
}

if(argv.includes("run_worker_block")){
    console.log(`running worker to process blocks`);
    worker_block.run().finally();
}

if(argv.includes("run_worker_block_run2")){
    console.log(`running worker to process blocks`);
    worker_block.run2().finally();
}
if(argv.includes("run_worker_block_run3")){
    console.log(`running worker to process blocks`);
    worker_block.run3().finally();
}
if(argv.includes("run_worker_block_run4")){
    console.log(`running worker to process blocks`);
    worker_block.run4().finally();
}
if(argv.includes("run_worker_block_run5")){
    console.log(`running worker to process blocks`);
    worker_block.run5().finally();
}
if(argv.includes("run_worker_block_run6")) {
    console.log(`running worker to process blocks`);
    worker_block.run6().finally();
}
if(argv.includes("run_worker_block_run7")){
    console.log(`running worker to process blocks`);
    worker_block.run7().finally();
}