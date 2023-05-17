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
import {eth_price_track_details_tools} from "./eth_price_track_details_tools";
import {eth_token_balance_header} from "./build/eth_token_balance_header";
import {web3_log_decoder} from "./web3_log_decoder";
import {meta_options} from "./build/meta_options";
import {meta_options_tools} from "./meta_options_tools";
import {user} from "./build/user";
import {eth_price_track_header_tools} from "./eth_price_track_header_tools";
import {eth_price_track_details} from "./build/eth_price_track_details";

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
        await meta_options_tools.updateOnlineStatus(`worker_token_balance`);
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
                    let transferFromTokenFound = false;
                    const receipt = await eth_worker.getReceiptByTxnHashWeb3(event.txn_hash??"");
                    for(const log of receipt.logs){
                        const transferLog = await web3_log_decoder.getTransferLog(log);
                        if(transferLog && transferLog.ContractInfo.address.toLowerCase() === eth_config.getTokenContract().toLowerCase()){
                            transferFromTokenFound = true;
                        }
                    }
                    this.log(`${transferLogCount} transfer logs detected`,method,false,true);
                    if(transferFromTokenFound){
                        this.log(`...transfer log count valid, continuing process`,method,false,true);
                    }
                    else{
                        this.log(`...no transfer from token found, skipping this purchase`,method,false,true);
                        event.time_balance_processed = 0;
                        await event.save();
                        this.log(`resetting events collection to process`,method,false,true);
                        events = new eth_contract_events();
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
        await this.processYachtClubActivation(balanceDetail);
        await this.processTradeActivation(balanceDetail);
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

    private static async processYachtClubActivation(balanceDetail:eth_token_balance){
        const method = "processYachtClubActivation";
        assert.inTransaction();
        const balanceHeader = await eth_token_balance_tools.getBalanceHeaderOf(balanceDetail.address);
        const owner = new user();
        owner.walletAddress = balanceDetail.address;
        await owner.fetch();
        if(owner.recordExists() && owner.usergroup === "yacht_club"){
            this.log(`owner(${owner.username}) of wallet is yacht club member, processing activation info`,method,false,true);

            if(tools.isNullish(balanceHeader.activation_status_yacht_amount) || tools.isEmpty(balanceHeader.activation_status_yacht_amount)){
                this.log(`...no yacht club activation info, initializing`,method,false,true);
                const yacht_club_activation_usd = await this.getYachtClubActivationUsd();
                this.log(`...activation usd value ${yacht_club_activation_usd}`,method,false,true);

                if(!(owner.time_created > 0)) throw new Error(`${method}|yacht club owner time_created(${owner.time_created}) invalid`);
                const time_createdInfo = time_helper.getTime(owner.time_created,"UTC");
                this.log(`...user created on ${time_createdInfo.format(TIME_FORMATS.READABLE)}`,method,false,true);

                this.log(`...retrieving price`,method,false,true);
                const tokenBnbPairHeader = await eth_price_track_header_tools.getViaIdOrContractStrict(eth_config.getTokenBnbPairContract());
                let price_string = await eth_price_track_details_tools.getUsdPrice(tokenBnbPairHeader,owner.time_created);
                this.log(`...price ${price_string}`,method,false,true);
                const price_number = tools.parseNumber(price_string);

                if(price_number <= 0){
                    this.log(`...no price, retrieving first price of pair`,method,false,true);
                    const pairHeader = await eth_price_track_header_tools.getViaIdOrContractStrict(eth_config.getTokenBnbPairContract());
                    const details = new eth_price_track_details();
                    await details.list(" WHERE header_id=:header_id ",{header_id:pairHeader.id}," ORDER BY blockNumber ASC, logIndex ASC LIMIT 1 ")
                    if(details.count() == 0) throw new Error(`${method}| no price details found for token bnb pair`);
                    const detail = details.getItem();
                    price_string = assert.isNumericString(detail.price_usd,`${method}|detail.price_usd`,0);
                    this.log(`...first price retrieved ${price_string}`,method,false,true);
                }
                assert.positiveNumber(price_string,`${method}|price_string`);
                const tokenAmount = tools.divide(yacht_club_activation_usd,price_string,16,`computing yacht activation token amount`);
                this.log(`...token activation amount ${tokenAmount}`,method,false,true);

                balanceHeader.activation_status_yacht_amount = tokenAmount;
                await balanceHeader.save();
            }
            balanceHeader.activation_status_yacht_amount = assert.stringNotEmpty(balanceHeader.activation_status_yacht_amount,`balanceHeader.activation_status_yacht_amount(${balanceHeader.activation_status_yacht_amount})`);

            this.log(`...find any buy that is equal or more to ${balanceHeader.activation_status_yacht_amount}`,method,false,true);
            const searchBuys = new eth_token_balance();
            await searchBuys.list(
                " WHERE address=:address AND type=:buy",
                {address:balanceHeader.address,buy:"buy"},
                " ORDER BY blockNumber ASC, logIndex ASC ");
            this.log(`...puchased found ${searchBuys.count()}`,method,false,true);
            let foundYachtActivation = false;
            for(const log of searchBuys._dataList as eth_token_balance[]){
                if(!foundYachtActivation){
                    if(tools.greaterThanOrEqualTo(log.debit,balanceHeader.activation_status_yacht_amount)){
                        foundYachtActivation = true;
                        this.log(`...found purchase, hash ${log.transactionHash}`,method,false,true);
                        if(log.activation_yacht_tag != "y") {
                            log.activation_yacht_tag = "y";
                            log.activation_status_yacht_amount = balanceHeader.activation_status_yacht_amount;
                            log.activation_status_yacht = "y";
                            await log.save();
                        }
                        break;
                    }
                }
            }

            // exclude old yacht club members from purchase check
            if(!foundYachtActivation && owner.time_created >= time_helper.getTime("2023-01-01","Asia/Manila").startOf("D").unix()){
                this.log(`...this user has not purchased enough token to activate the yacht club`,method,false,true);
                this.log(`...disabling yacht club status`,method,false,true);
                balanceHeader.activation_status_yacht = "n";
            }
            else{
                this.log(`...retrieving current token balance`,method,false,true);
                const current_token_bal = await eth_worker.getTokenBalance(owner.walletAddress);

                this.log(`...current token bal: ${current_token_bal}`,method,false,true);
                this.log(`...min bal req: ${balanceHeader.activation_status_yacht_amount}`,method,false,true);

                if(tools.lesserThan(current_token_bal,balanceHeader.activation_status_yacht_amount)){
                    this.log(`...yacht user balance is below min, deactivating yacht status`,method,false,true);
                    balanceHeader.activation_status_yacht = "n";
                }
                else{
                    this.log(`...yacht user status is active`,method,false,true);
                    balanceHeader.activation_status_yacht = "y";
                }
            }

            await balanceHeader.save();
            balanceDetail.activation_status_yacht = balanceHeader.activation_status_yacht;
            balanceDetail.activation_status_yacht_amount = balanceHeader.activation_status_yacht_amount;
            await balanceDetail.save();
        }
    }

    private static async getYachtClubActivationUsd():Promise<number>{
        let yachtClubActivationValue = 500;
        const yacht_club_activation = new meta_options();
        yacht_club_activation.tag = "yacht_club_activation";
        await yacht_club_activation.fetch();
        if(yacht_club_activation.recordExists()){
            yachtClubActivationValue = assert.positiveNumber(yacht_club_activation.value,`yacht_club_activation.value`);
        }
        return yachtClubActivationValue;
    }

    private static async processTradeActivation(balanceDetail:eth_token_balance){
        const method = "processTradeActivation";
        assert.inTransaction();
        const balanceHeader = await eth_token_balance_tools.getBalanceHeaderOf(balanceDetail.address);
        const owner = new user();
        owner.walletAddress = balanceDetail.address;
        await owner.fetch();
        if(owner.recordExists() && owner.usergroup === "yacht_club"){
            // find token purchases after april 1, 2023
            const validPurchaseDateFrom = time_helper.getTime('2023-04-01','Asia/Manila').startOf("D").unix();
            this.log(`...find any buy that is after april 1 2023`,method,false,true);
            const searchBuys = new eth_token_balance();
            await searchBuys.list(
                " WHERE address=:address AND type=:buy AND blockTime>=:from ",
                {address:balanceHeader.address,buy:"buy",from:validPurchaseDateFrom},
                " ORDER BY blockNumber ASC, logIndex ASC ");
            this.log(`...purchases found ${searchBuys.count()}`,method,false,true);
            let foundTradeActivation = false;
            let lastTradeActivationReq = "0.00";
            for(const log of searchBuys._dataList as eth_token_balance[]){
                // if tagged already with yacht club activation, deduct it form consideration
                this.log(`...check buy from block ${log.blockNumber} log ${log.logIndex} on ${time_helper.getAsFormat(log.blockTime,TIME_FORMATS.READABLE)} amount ${log.debit}`,method,false,true);
                const tradeActivationUsd = this.getTradeActivationUsd(log.blockTime);
                this.log(`...trade activation usd amount during this time is ${tradeActivationUsd}`,method,false,true)
                this.log(`...retrieving price during this time`,method,false,true);
                const tokenBnbHeader = await eth_price_track_header_tools.getViaIdOrContractStrict(eth_config.getTokenBnbPairContract());
                const price_string = await eth_price_track_details_tools.getUsdPrice(tokenBnbHeader,log.blockTime);
                this.log(`...price of token during this time is ${price_string}`,method,false,true);
                const price_number = assert.positiveNumber(price_string,`${method}|price_string(${price_string})`);
                if(price_number <= 0) throw new Error(`expected usd price for token on time ${time_helper.getAsFormat(log.blockTime,TIME_FORMATS.READABLE)}`);
                const token_trade_activation_req = tools.divide(tradeActivationUsd,price_string);
                assert.isNumericString(token_trade_activation_req,`${method}|token_trade_activation_req(${token_trade_activation_req})`,0);
                this.log(`...token equivalent for trade activation is ${token_trade_activation_req}`,method,false,true);
                if(tradeActivationUsd > 0){
                    let token_bought = assert.isNumericString(log.debit,`${method}|log.debit(${log.debit})`,0);
                    this.log(`...token_bought ${token_bought}`,method,false,true);
                    if(log.activation_yacht_tag === "y") {
                        this.log(`...transaction already used for yacht club activation, deducting activation_status_yacht_amount ${log.activation_status_yacht_amount}`,method,false,true);
                        token_bought = tools.subtract(token_bought, assert.isNumericString(log.activation_status_yacht_amount));
                        this.log(`...adjusted token_bought ${token_bought}`,method,false,true);
                    }
                    if (tools.lesserThan(token_bought, 0)) {
                        this.log(`...error, token_bought(${token_bought}) is less than 0`, method, false, true);
                    }
                    else{
                        if(tools.greaterThanOrEqualTo(token_bought,token_trade_activation_req)){
                            foundTradeActivation = true;
                            this.log(`...trade activation detected for this transaction`,method,false,true);
                            log.activation_status_trade = "y";
                            log.activation_trade_tag = "y";
                            log.activation_status_trade_amount = token_trade_activation_req;
                            lastTradeActivationReq = token_trade_activation_req;
                            await log.save();
                            balanceHeader.activation_status_trade_hash = log.transactionHash;
                            await balanceHeader.save();
                            break;
                        }
                    }
                }
            }
            if(foundTradeActivation){
                this.log(`...found valid trade purchase, proceeding with the next steps`,method,false,true);
                this.log(`...check if still yacht club active`,method,false,true);
                if(balanceDetail.activation_status_yacht === "y"){
                    this.log(`...still yacht club active, proceeding`,method,false,true);
                    this.log(`...retrieving current token balance`,method,false,true);
                    const current_token_bal = await eth_worker.getTokenBalance(owner.walletAddress);
                    if(tools.greaterThanOrEqualTo(current_token_bal,lastTradeActivationReq)){
                        this.log(`...trade activated, updating`,method,false,true);
                        balanceDetail.activation_status_trade_amount = lastTradeActivationReq;
                        balanceDetail.activation_status_trade = "y";
                        await balanceDetail.save();
                        balanceHeader.activation_status_trade = "y";
                        balanceHeader.activation_status_trade_amount = lastTradeActivationReq;
                        await balanceHeader.save();
                    }
                    else{
                        this.log(`...not enough balance, deactivating`,method,false,true);
                        balanceDetail.activation_status_trade_amount = lastTradeActivationReq;
                        balanceDetail.activation_status_trade = "n";
                        await balanceDetail.save();
                        balanceHeader.activation_status_trade = "n";
                        balanceHeader.activation_status_trade_amount = lastTradeActivationReq;
                        await balanceHeader.save();
                    }
                }
                else{
                    this.log(`...not yacht club active, deactivating`,method,false,true);
                    balanceDetail.activation_status_trade_amount = lastTradeActivationReq;
                    balanceDetail.activation_status_trade = "n";
                    await balanceDetail.save();
                    balanceHeader.activation_status_trade = "n";
                    balanceHeader.activation_status_trade_amount = lastTradeActivationReq;
                    await balanceHeader.save();
                }
            }
            else{
                this.log(`...no token purchased that is greater than ${lastTradeActivationReq}`,method,false,true);
            }
        }
    }

    private static getTradeActivationUsd(time:number):number{
        const fromTimeFor100Usd = time_helper.getTime('2023-04-01','Asia/Manila').startOf("D").unix();
        const endTimeFor100Usd = time_helper.getTime('2023-04-07','Asia/Manila').endOf("D").unix();
        if(time >= fromTimeFor100Usd && time <= endTimeFor100Usd) return 100;

        const fromTimeFor150Usd = time_helper.getTime('2023-04-08','Asia/Manila').startOf("D").unix();
        const endTimeFor150Usd = time_helper.getTime('2023-04-17','Asia/Manila').endOf("D").unix();
        if(time >= fromTimeFor150Usd && time <= endTimeFor150Usd) return 150;

        const fromTimeFor200Usd = time_helper.getTime('2023-04-18','Asia/Manila').startOf("D").unix();
        const endTimeFor200Usd = time_helper.getTime('2023-04-21','Asia/Manila').endOf("D").unix();
        if(time >= fromTimeFor200Usd && time <= endTimeFor200Usd) return 200;

        const fromTimeFor250Usd = time_helper.getTime('2023-04-22','Asia/Manila').startOf("D").unix();
        if(time >= fromTimeFor250Usd) return 250;
        else return 0;
    }

}

 if(argv.includes("run_worker_token_balance")){
    console.log(`running worker to track token events`);
     worker_token_balance.run().finally();
}