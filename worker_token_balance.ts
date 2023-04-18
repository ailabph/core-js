import {argv} from "process";
import {eth_contract_events} from "./build/eth_contract_events";
import {connection} from "./connection";
import {config} from "./config";
import {tools} from "./tools";
import {TIME_FORMATS, time_helper} from "./time_helper";
import {assert} from "./assert";
import {eth_token_balance} from "./build/eth_token_balance";
import {eth_receipt_logs_tools} from "./eth_receipt_logs_tools";
import {eth_config} from "./eth_config";
import {ENTRY_TYPE, eth_token_balance_tools, NoTransferLogCounterPart} from "./eth_token_balance_tools";
import {eth_worker} from "./eth_worker";
import {web3_pair_price_tools} from "./web3_pair_price_tools";
import {eth_price_track_details_tools} from "./eth_price_track_details_tools";
import {eth_token_balance_header} from "./build/eth_token_balance_header";
import {web3_log_decoder} from "./web3_log_decoder";

//region TYPES
type ACTIVATION_INFO = {
    timestamp:number,
    current_minimum_busd_value:number,
    current_minimum_token:string,
    balance_detail:eth_token_balance
    balance_header:eth_token_balance_header
}
export { ACTIVATION_INFO }
//endregion TYPES

export class worker_token_balance{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`worker_token_balance|${method}|${msg}`);
            if(end) console.log(`worker_token_balance|${method}|${tools.LINE}`);
        }
    }

    public static async run(){
        const method = "run";
        await connection.startTransaction();
        try{
            let events = await this.getUnprocessedEvent();
            if(events.count() === 0){
                this.log(`no more new unprocessed events, checking on events for retry`,method);
                events = await this.getEventsForRetry();
                const event = events.getItem();
                if(event){
                    this.log(`checking logs of ${event.txn_hash}`,method,false,true);
                    // check logs transfer count, if more less than 2, skip this purchase
                    let transferLogCount = 0;
                    const receipt = await eth_worker.getReceiptByTxnHashWeb3(event.txn_hash??"");
                    for(const log of receipt.logs){
                        const transferLog = await web3_log_decoder.getTransferLog(log);
                        if(transferLog){
                            transferLogCount++;
                        }
                    }
                    this.log(`${transferLogCount} transfer logs detected`,method,false,true);
                    if(transferLogCount < 2){
                        this.log(`...less then 2 transfer logs detected, skipping this purchase`,method,false,true);
                        event.time_balance_processed = 0;
                        await event.save();
                        this.log(`resetting events collection to process`,method,false,true);
                        events = new eth_contract_events();
                    }
                    else{
                        this.log(`...transfer log count valid, continuing process`,method,false,true);
                    }
                }
            }
            for(const event of events._dataList as eth_contract_events[]){
                let retryLater = false;

                const logIndex = assert.positiveInt(event.logIndex,`${method} event.logIndex`);
                const transactionHash = assert.stringNotEmpty(event.txn_hash,`${method} event.txn_hash`);
                const type = assert.stringNotEmpty(event.type,`${method} event.type`);
                const log_method = assert.stringNotEmpty(event.log_method,`${method} event.log_method`);
                const fromAddress = assert.stringNotEmpty(event.fromAddress,`${method} event.fromAddress`);
                const fromContract = assert.stringNotEmpty(event.fromContract,`${method} event.fromContract`);
                const fromAmountGross = assert.isNumericString(event.fromAmountGross,`${method} event.fromAmountGross`);
                const toAddress = assert.stringNotEmpty(event.toAddress,`${method} event.toAddress`);
                const toContract = assert.stringNotEmpty(event.toContract,`${method} event.toContract`);
                const toAmount = assert.stringNotEmpty(event.toAmount,`${method} event.toAmount`);

                if(typeof event.block_time !== "number"){
                    this.log(`event has no block_time, fixing...`,method);
                    const dbLog = await eth_receipt_logs_tools.getDbLog(transactionHash,logIndex);
                    event.block_time = dbLog.blockTime;
                    await event.save();
                }
                const blockTime = assert.positiveInt(event.block_time,`${method} event.block_time`);
                const timeInfo = time_helper.getAsFormat(blockTime,TIME_FORMATS.ISO,"UTC");
                this.log(`${timeInfo}|processing ${event.blockNumber} ${event.logIndex} hash ${event.txn_hash} block ${event.blockNumber} log ${event.logIndex} log_method ${event.log_method}`,method,false,true);
                this.log(`...from:...${tools.lastSubstring(fromAddress,6)} to:...${tools.lastSubstring(toAddress,6)}`,method,false,true);

                if(log_method.toLowerCase() !== "swap" && log_method.toLowerCase() !== "transfer"){
                    this.log(`...event not swap or transfer, skipping`,method,false,true);
                    event.time_balance_processed = tools.getCurrentTimeStamp();
                    await event.save();
                    continue;
                }

                let activation_status = "unknown";
                let min_token_required = "0";
                if(log_method.toLowerCase() === "transfer"){
                    this.log(`...transfer event detected`,method,false,true);
                    this.log(`...processing sender`,method,false,true);
                    if(fromContract.toLowerCase() !== eth_config.getTokenContract().toLowerCase()){
                        this.log(`...from contract is ${eth_config.getTokenSymbol()} token`,method,false,true);
                    }
                    else{
                        const fromBalanceDetail = await eth_token_balance_tools.addBalanceEntryForTransfer(fromAddress,ENTRY_TYPE.CREDIT,fromAmountGross,event);
                        this.log(`...current balance of sender ...${tools.lastSubstring(fromBalanceDetail.address,6)}(${fromBalanceDetail.username}) is ${fromBalanceDetail.token_amount}`,method,false,true);
                        const activationInfo = await this.updateActivationInfo(fromBalanceDetail);
                        activation_status = fromBalanceDetail.activation_status as string;
                        min_token_required = activationInfo.current_minimum_token as string;
                    }

                    this.log(`...processing receiver`,method);
                    if(toContract.toLowerCase() !== eth_config.getTokenContract().toLowerCase()){
                        this.log(`...to contract is ${eth_config.getTokenSymbol()} token`,method,false,true);
                    }
                    else{
                        const toBalanceDetail = await eth_token_balance_tools.addBalanceEntryForTransfer(toAddress,ENTRY_TYPE.DEBIT,toAmount,event);
                        this.log(`...current balance of receiver ...${tools.lastSubstring(toBalanceDetail.address,6)}(${toBalanceDetail.username}) is ${toBalanceDetail.token_amount}`,method,false,true);
                        const activationInfo = await this.updateActivationInfo(toBalanceDetail);
                        activation_status = toBalanceDetail.activation_status as string;
                        min_token_required = activationInfo.current_minimum_token as string;
                    }
                }
                if(log_method.toLowerCase() === "swap"){
                    let balanceDetail:eth_token_balance|false = await eth_token_balance_tools.addBalanceEntryForTrade(event);
                    if(balanceDetail){
                        const activationInfo = await this.updateActivationInfo(balanceDetail);
                        activation_status = balanceDetail.activation_status as string;
                        min_token_required = activationInfo.current_minimum_token as string;
                    }
                    else{
                        retryLater = true;
                    }
                }
                this.log(`...activation status ${activation_status} minimum token required ${min_token_required}`,method,false,true);
                if(retryLater){
                    this.log(`...detected to retry`,method,false,true);
                    event.time_balance_processed = -1;
                }
                else{
                    this.log('...successfully processed event',method,false,true);
                    event.time_balance_processed = tools.getCurrentTimeStamp();
                }
                await event.save();
            }
            await connection.commit();
            await tools.sleep(250);
            setImmediate(()=>{
                worker_token_balance.run().finally();
            });
        }catch (e) {
            await connection.rollback();
            const errorMsg = e instanceof Error ? e.message : "unknown";
            this.log(`ERROR ${errorMsg}`,method,false,true);
            if(e instanceof NoTransferLogCounterPart){
                this.log(`probably race issue`,method,false,true);
            }
            this.log(`...retrying in 3 seconds`,method,false,true);
            await tools.sleep(3000);
            setImmediate(()=>{
                worker_token_balance.run().finally();
            });
        }
    }

    private static async getUnprocessedEvent():Promise<eth_contract_events>{
        const events = new eth_contract_events();
        await events.list(
            ` WHERE time_balance_processed IS NULL `,
            {},` ORDER BY blockNumber ASC, logIndex ASC LIMIT 1 `);
        return events;
    }

    private static async getEventsForRetry():Promise<eth_contract_events>{
        const events = new eth_contract_events();
        await events.list(
            " WHERE time_balance_processed < :zero ",
            {zero:0}," ORDER BY blockNumber ASC, logIndex ASC LIMIT 1 ");
        return events;
    }


    private static async updateActivationInfo(balanceDetail:eth_token_balance):Promise<ACTIVATION_INFO>{
        const method = "updateActivationInfo";
        this.log(`updating info regarding activation`,method);
        assert.inTransaction();
        const balanceHeader = await eth_token_balance_tools.getBalanceHeaderOf(balanceDetail.address);
        balanceDetail.activation_status = balanceHeader.activation_status;
        const activation_amount = assert.isNumericString(balanceHeader.minimum_balance,`${method} balanceHeader.minimum_balance`);
        balanceDetail.activation_amount = activation_amount;

        // ESTABLISH PRICE INFO
        const dbLog = await eth_receipt_logs_tools.getDbLog(balanceDetail.transactionHash,balanceDetail.logIndex);
        const currentBnbUsdPrice = await eth_price_track_details_tools.getBnbUsdPrice(dbLog);
        this.log(`...current bnb_usd price ${currentBnbUsdPrice}`,method);
        const currentTokenBnbPrice = await eth_price_track_details_tools.getBnbTokenPrice(dbLog,eth_config.getTokenContract());
        this.log(`...current token_bnb price ${currentTokenBnbPrice}`,method);
        const currentTokenBusdPrice = tools.multiply(currentTokenBnbPrice,currentBnbUsdPrice,eth_config.getBusdDecimal(),`${method} multiplying currentTokenPrice(${currentTokenBnbPrice}) and currentBnbUsdPrice(${currentBnbUsdPrice})`);
        this.log(`...current token_busd price ${currentTokenBusdPrice}`,method);
        let currentMinimumToken:string = tools.divide(this.getMinimumBusdForActivation(),currentTokenBusdPrice,eth_config.getTokenDecimal(),`${method} currentMinimumToken = ${this.getMinimumBusdForActivation()} / ${currentTokenBusdPrice}`);
        this.log(`...current minimum token ${currentMinimumToken} worth ${this.getMinimumBusdForActivation()}`,method);
        // probably need to add margin, like 2.5% for the fee from dex

        if(balanceHeader.activation_status === "y"){
            this.log(`...address currently is active. current balance ${balanceDetail.token_amount} minimum balance ${balanceHeader.minimum_balance}`,method);
            if(tools.lesserThanOrEqualTo(balanceHeader.minimum_balance,0,`${method} balanceHeader.minimum_balance <= 0`)){
                throw new Error(`${method} unexpected minimum_balance <= 0 when activation_status is ${balanceHeader.activation_status}`);
            }
            if(tools.lesserThan(balanceDetail.token_amount,activation_amount)){
                this.log(`...detected that current balance went below minimum balance`,method);
                balanceHeader.activation_status = "n";
                balanceHeader.deactivation_count++;
                balanceHeader.minimum_balance = "0";
                balanceHeader.last_deactivation_transaction = balanceDetail.transactionHash;
                balanceDetail.activation_data = `token balance ${balanceDetail.token_amount} went below the minimum amount ${activation_amount} to maintain active status. current minimum token activation is ${currentMinimumToken}`;
                this.log(`...deactivated address. deactivation_count ${balanceHeader.deactivation_count}`,method);
            }
        }
        else{
            if(tools.greaterThanOrEqualTo(balanceDetail.token_amount,currentMinimumToken,`${method} balanceDetail.token_amount >= currentMinimumToken`)){
                if(balanceDetail.type === "buy"){
                    this.log(`...detected that balance ${balanceDetail.token_amount} is >= minimum token ${currentMinimumToken}`,method);
                    balanceHeader.activation_status = "y";
                    balanceHeader.activation_count++;
                    balanceHeader.minimum_balance = currentMinimumToken;
                    balanceHeader.last_activated_transaction = balanceDetail.transactionHash;
                    balanceDetail.activation_data = `token balance ${balanceDetail.token_amount} met minimum token amount ${currentMinimumToken} worth ${this.getMinimumBusdForActivation()} busd`;
                }
                else{
                    this.log(`...detected that balance ${balanceDetail.token_amount} is >= minimum token ${currentMinimumToken} but type is not buy, current type ${balanceDetail.type}`,method);
                }
            }
        }
        balanceDetail.activation_status = balanceHeader.activation_status;
        balanceDetail.activation_amount = balanceHeader.minimum_balance;
        await balanceDetail.save()
        await balanceHeader.save();
        return {
            balance_detail: balanceDetail,
            balance_header: balanceHeader,
            current_minimum_busd_value: this.getMinimumBusdForActivation(),
            current_minimum_token: currentMinimumToken,
            timestamp: balanceDetail.blockTime
        };
    }

    public static getMinimumBusdForActivation():number{
        return 50;
    }

}

 if(argv.includes("run_worker_token_balance")){
    console.log(`running worker to track token events`);
     worker_token_balance.run().finally();
}