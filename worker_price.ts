import {argv} from "process";
import {assert} from "./assert";
import {connection} from "./connection";
import {eth_config} from "./eth_config";
import {tools} from "./tools";
import {web3_log_decoder, SwapLog, SyncLog} from "./web3_log_decoder";
import {eth_receipt_logs} from "./build/eth_receipt_logs";
import {eth_price_track_header} from "./build/eth_price_track_header";
import {eth_price_track_details} from "./build/eth_price_track_details";
import {web3_pair_price_tools} from "./web3_pair_price_tools";
import {eth_price_track_header_tools} from "./eth_price_track_header_tools";
import {eth_worker} from "./eth_worker";
import {config} from "./config";
import {eth_receipt_logs_tools} from "./eth_receipt_logs_tools";

export class worker_price {

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`worker_price|${method}|${msg}`);
            if(end) console.log(`worker_price|${method}|${tools.LINE}`);
        }
    }

    //region CONFIG
    private static currentTransactionHash:string = "";
    private static currentBlockNumber:number = 0;
    private static currentLogIndex:number = 0;
    private static currentDbLogId:number = 0;
    private static lastProcessedTransactionHash:string = "";
    private static lastProcessedBlockNumber:number = 0;
    private static lastProcessedLogIndex:number = 0;
    private static lastProcessedDbLogId:number = 0;

    private static resetPointers(){
        this.lastProcessedTransactionHash = "";
        this.lastProcessedBlockNumber = 0;
        this.lastProcessedLogIndex = 0;
        this.lastProcessedDbLogId = 0;
    }
    private static retryDelayMultiplier:number = 0;
    private static getStartingDelayInSeconds():number{
        let delay = 10;
        const delayOverride = config.getCustomOption("worker_price_retry_delay",false);
        if(typeof delayOverride === "number") {
            delay = assert.positiveInt(delayOverride, `getStartingDelayInSeconds|delayOverride`);
        }
        return delay;
    }
    private static getBatch():number{
        let batch = 500;
        const batchOverride = config.getCustomOption("worker_price_batch",false);
        if(typeof batchOverride === "number"){
            batch = assert.positiveInt(batchOverride,"getBatch|batchOverride");
        }
        return batch;
    }
    //endregion CONFIG

    public static async run(){
        const method = "run";
        await connection.startTransaction();
        try{
            let someLogsAlreadyProcessed = true;
            this.log(`processing logs for its price information`,method,false);

            let latestBlockOnDb = 0;
            const checkLastBlockOnLogs = new eth_receipt_logs();
            await checkLastBlockOnLogs.list(" WHERE 1 ",{}," ORDER BY blockNumber DESC LIMIT 1 ");
            if(checkLastBlockOnLogs.count() > 0) latestBlockOnDb = assert.positiveInt(checkLastBlockOnLogs.getItem().blockNumber,`${method} checkLastBlockOnLogs.getItem().blockNumber`);

            if(!(this.lastProcessedBlockNumber > 0)){
                this.log(`first run detected, retrieving last blockNumber that is processed (heavy query)`,method,false,true);
                let check = new eth_receipt_logs();
                await check.list(" WHERE time_processed_price IS NOT NULL ",{}," ORDER BY blockNumber DESC, logIndex DESC LIMIT 1 ");
                check = check.getItem();
                if(!check){
                    this.log(`...no logs found that price has been processed`,method,false,true);
                    someLogsAlreadyProcessed = false;
                }else{
                    this.lastProcessedBlockNumber = assert.positiveInt(check.blockNumber,`${method} check.blockNumber to this.lastProcessedBlockNumber`);
                    this.log(`...found blockNumber ${check.blockNumber} logIndex ${check.logIndex} dbId ${check.id}`,method,false,true);
                }
            }
            if(!(this.lastProcessedBlockNumber > 0)){
                this.log(`retrieving first blockNumber in logs (heavy query)`,method,false,true);
                let check = new eth_receipt_logs();
                await check.list(" WHERE time_processed_price IS NULL ",{}," ORDER BY blockNumber ASC, logIndex ASC LIMIT 1 ");
                check = check.getItem();
                if(!check) {
                    this.log(`...no logs found`,method,false,true);
                }
                else{
                    this.lastProcessedBlockNumber = assert.positiveInt(check.blockNumber,`${method} check.blockNumber to this.lastProcessedBlockNumber`);
                    this.log(`...found blockNumber ${check.blockNumber} logIndex ${check.logIndex} dbId ${check.id}`,method,false,true);
                }
            }
            if(!(this.lastProcessedBlockNumber > 0)) throw new Error(`unable to run worker_price without lastProcessedBlockNumber(${this.lastProcessedBlockNumber})`);

            const blockFrom = this.lastProcessedBlockNumber;
            const blockTo = this.lastProcessedBlockNumber + this.getBatch();
            this.log(`retrieving logs between ${blockFrom} to ${blockTo} with time_processed_price IS NULL`,method,false,false);
            const unProcessedLogs = new eth_receipt_logs();
            let logsWhere = " WHERE blockNumber>=:from AND blockNumber<=:to AND time_processed_price IS NULL AND (has_bnb_usd=:y OR has_token_dex=:y OR has_token=:y) ";
            let logsParam:{[key:string]:string|number} = {};
            logsParam["from"] = blockFrom;
            logsParam["to"] = blockTo;
            logsParam["y"] = "y";
            const logsOrder = ` ORDER BY blockNumber ASC, logIndex ASC `;
            await unProcessedLogs.list(logsWhere,logsParam,logsOrder);
            if(unProcessedLogs.count() === 0){
                this.log(`...no logs found blockTo ${blockTo} latestBlockOnDb ${latestBlockOnDb}`,method);
                this.currentBlockNumber = blockTo < latestBlockOnDb ? blockTo : latestBlockOnDb;
            }
            this.log(`${unProcessedLogs.count()} unprocessed logs for sync price computation`,method);
            const logCount = unProcessedLogs.count();
            let currentCount = 0;
            for(const log of unProcessedLogs._dataList as eth_receipt_logs[]){
                currentCount++;
                this.log(`${currentCount}/${logCount}|processing log address ${log.address}`,method);
                this.currentTransactionHash = assert.stringNotEmpty(log.transactionHash,`${method} log.transactionHash to this.lastTransactionHash`);
                this.currentLogIndex = assert.naturalNumber(log.logIndex,`${method}|log.logIndex to this.lastLogIndex`);
                this.currentDbLogId = assert.positiveInt(log.id,`${method}|log.id to this.lastDbLogId`);
                this.currentBlockNumber = assert.positiveInt(log.blockNumber,`${method}|log.blockNumber to this.lastBlockNumber`);

                if(typeof log.time_processed_price === "number" && log.time_processed_price > 0){
                    this.log(`...skipping price already processed in log`,method);
                }

                const web3Log = eth_worker.convertDbLogToWeb3Log(log);
                const sync = await web3_log_decoder.getSyncLog(web3Log);
                if(sync){
                    this.log(`sync found, retrieving pair info`,method);

                    const pairHeader = await eth_price_track_header_tools.getViaIdOrContract(sync.ContractInfo.address,false);
                    if(!pairHeader){
                        this.log(`pair contract info cannot be retrieved, skipping...`,method,false,true);
                    }
                    else{
                        const pairInfo = web3_pair_price_tools.convertDbPairHeaderToPairInfo(pairHeader);

                        this.log(`creating new price detail`,method);
                        const newDetail = new eth_price_track_details();
                        newDetail.header_id = tools.parseInt({val:pairHeader.id,name:"pairHeader.id",strict:true});
                        newDetail.reserve0 = sync.reserve0.toString();
                        newDetail.reserve1 = sync.reserve1.toString();
                        newDetail.transactionHash = assert.isString({val:log.transactionHash,prop_name:"log.transactionHash",strict:true});
                        newDetail.logIndex = tools.parseInt({val:log.logIndex,name:"log.logIndex",strict:true});
                        newDetail.blockNumber = tools.parseInt({val:log.blockNumber,name:"log.blockNumber",strict:true});
                        newDetail.blockTime = tools.parseInt({val:log.blockTime,name:"log.blockTime",strict:true});
                        const base_prices_info = await web3_pair_price_tools.processBasePriceOfPairFromLog(pairHeader.pair_contract,newDetail.transactionHash,newDetail.logIndex,someLogsAlreadyProcessed);
                        if(!base_prices_info) throw new Error(`unable to compute prices`);
                        newDetail.price = "0";
                        if(await web3_pair_price_tools.pairIsUsd(pairInfo)){
                            newDetail.price = base_prices_info.usd_price;
                        }
                        else if(await web3_pair_price_tools.pairIsBnb(pairInfo)){
                            newDetail.price = base_prices_info.bnb_price;
                        }
                        newDetail.price_bnb = base_prices_info.bnb_price;
                        newDetail.price_usd = base_prices_info.usd_price;

                        assert.isNumericString(newDetail.price,`${method} newDetail.price`);
                        assert.isNumericString(newDetail.price_bnb,`${method} newDetail.price_bnb`);
                        assert.isNumericString(newDetail.price_usd,`${method} newDetail.price_usd`);
                        if(tools.toBn(newDetail.price).comparedTo(tools.toBn("0")) < 0){
                            throw new Error(`price <= 0, double check if not error ${log.transactionHash} ${log.logIndex}`);
                        }
                        await newDetail.save();
                        const dateTime = tools.getTime(newDetail.blockTime).format();
                        this.log(`${dateTime} |${currentCount}/${logCount}|${eth_price_track_header_tools.getPairSymbol(pairHeader)} price ${newDetail.price} bnb ${newDetail.price_bnb} usd ${newDetail.price_usd} at block ${log.blockNumber} log ${log.logIndex}`,method,false,true);
                    }
                }
                else{
                    this.log(`...log is not sync, skipping`,method);
                }
                log.time_processed_price = tools.getCurrentTimeStamp();
                await log.save();
                this.log(``,method,true);
            }
            await connection.commit();
            this.lastProcessedTransactionHash = this.currentTransactionHash;
            this.lastProcessedBlockNumber = this.currentBlockNumber;
            this.lastProcessedLogIndex = this.currentLogIndex;
            this.lastProcessedDbLogId = this.currentDbLogId;
            const used = process.memoryUsage().heapUsed / 1024 / 1024;
            if(unProcessedLogs.count() > 0) this.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`,method,false);
            await tools.sleep(10);
            this.retryDelayMultiplier = 0;
            setImmediate(()=>{
                worker_price.run().finally();
            });
        }catch (e) {
            await connection.rollback();
            this.log(`ERROR on TransactionHash ${this.currentTransactionHash} logIndex ${this.currentLogIndex} logDb_id ${this.currentDbLogId}`,method,false,true);
            this.resetPointers();
            if(e instanceof Error)this.log(e.message,method,false,true); else console.log(e);

            this.retryDelayMultiplier++;
            let secondDelay = this.getStartingDelayInSeconds() * this.retryDelayMultiplier;
            this.log(`...retrying after ${secondDelay} seconds`,method,true,true);
            setTimeout(()=>{
                worker_price.run();
            },secondDelay * 1000);
        }
    }

    //region GETTERS PAIR

    public static async getPairInfo(pairContract:string):Promise<eth_price_track_header>{
        const pair = new eth_price_track_header();
        pair.pair_contract = pairContract;
        await pair.fetch();
        if(pair.isNew()) throw new Error(`pair contract ${pairContract} not found in db`);
        return pair;
    }
    public static async getPairInfoByTokenContracts(token0:string,token1:string):Promise<eth_price_track_header>{
        const price_track_header = await eth_price_track_header_tools.getViaTokenContracts(token0,token1,true);
        if(!price_track_header) throw new Error(``);
        return price_track_header;
    }
    public static async getPairInfoByPairId(db_id:number):Promise<eth_price_track_header>{
        db_id = assert.positiveInt(db_id);
        const pair = new eth_price_track_header();
        pair.id = db_id;
        await pair.fetch();
        if(pair.isNew()) throw new Error(`no pair contract found from db id ${db_id}`);
        return pair;
    }
    public static async getPairDetails(id_or_pair_contract:number|string,fromTime:number=0,limit:number=1):Promise<eth_price_track_details>{
        let pair = new eth_price_track_header();
        if(tools.isNumeric(id_or_pair_contract)){
            pair = await this.getPairInfoByPairId(assert.positiveInt(id_or_pair_contract));
        }
        else if(tools.isStringAndNotEmpty(id_or_pair_contract)){
            pair = await this.getPairInfo(assert.stringNotEmpty(id_or_pair_contract));
        }
        if(pair.isNew()) throw new Error(`unable to retrieve pair with argument ${id_or_pair_contract}`);
        let where = " WHERE header_id=:header_id ";
        let param:{[key:string]:number}={};
        param["header_id"] = assert.positiveInt(pair.id);
        if(fromTime > 0){
            where += " AND blockTime<=:blockTime ";
            param["blockTime"] = fromTime;
        }
        const pair_details = new eth_price_track_details();
        await pair_details.list(where,param,` ORDER BY blockTime DESC LIMIT ${limit} `);
        return pair_details;
    }

    //endregion GETTERS PAIR

    //region BNB
    public static async getBnbPriceOfToken(token0:string,timeStamp:number):Promise<string>{
        let price = "0.0";
        const tokenBnbPair = await this.getPairInfoByTokenContracts(token0,eth_config.getEthContract());
        const details = await this.getPairDetails(assert.positiveInt(tokenBnbPair.id),timeStamp);
        if(details.count() > 0){
            price = details.getItem().price;
        }
        return price;
    }
    public static async getBnbValueOfToken(token0:string,timeStamp:number,amount:string|number,is_value:boolean=false):Promise<string>{
        const method = "getBnbValueOfToken";
        const price = await this.getBnbPriceOfToken(token0,timeStamp);
        if(is_value){
            const contract = await eth_worker.getContractMetaData(token0);
            amount = assert.naturalNumber(amount,`${method}|amount`);
            amount = eth_worker.convertValueToAmount(amount,contract.decimals);
        }
        return tools.toBn(price).multipliedBy(tools.toBn(amount)).toFixed(eth_config.getEthDecimal());
    }
    //endregion BNB

    //region BUSD
    public static async getUsdPriceOfToken(token0:string,timeStamp:number):Promise<string>{
        let price = "0.0";
        const tokenBnbPair = await this.getPairInfoByTokenContracts(token0,eth_config.getEthContract());
        const details = await this.getPairDetails(assert.positiveInt(tokenBnbPair.id),timeStamp);
        if(details.count() > 0){
            price = details.getItem().price_usd ?? "0.0";
        }
        return price;
    }
    public static async getUsdValueOfToken(token0:string,timeStamp:number,amount:string|number,is_value:boolean=false):Promise<string>{
        const method = "getUsdValueOfToken";
        const price = await this.getUsdPriceOfToken(token0,timeStamp);
        if(is_value){
            const contract = await eth_worker.getContractMetaData(token0);
            amount = assert.naturalNumber(amount,`${method}|amount`);
            amount = eth_worker.convertValueToAmount(amount,contract.decimals);
        }
        return tools.toBn(price).multipliedBy(tools.toBn(amount)).toFixed(eth_config.getBusdDecimal());
    }
    //endregion BUSD

}

if(argv.includes("run_worker_price")){
    console.log(`running worker to track and save token prices`);
    worker_price.run().finally();
}