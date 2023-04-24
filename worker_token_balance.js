"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_token_balance = void 0;
const process_1 = require("process");
const eth_contract_events_1 = require("./build/eth_contract_events");
const connection_1 = require("./connection");
const config_1 = require("./config");
const tools_1 = require("./tools");
const time_helper_1 = require("./time_helper");
const assert_1 = require("./assert");
const eth_receipt_logs_tools_1 = require("./eth_receipt_logs_tools");
const eth_config_1 = require("./eth_config");
const eth_token_balance_tools_1 = require("./eth_token_balance_tools");
const eth_worker_1 = require("./eth_worker");
const eth_price_track_details_tools_1 = require("./eth_price_track_details_tools");
const web3_log_decoder_1 = require("./web3_log_decoder");
const meta_options_tools_1 = require("./meta_options_tools");
//endregion TYPES
class worker_token_balance {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`worker_token_balance|${method}|${msg}`);
            if (end)
                console.log(`worker_token_balance|${method}|${tools_1.tools.LINE}`);
        }
    }
    static async run() {
        await meta_options_tools_1.meta_options_tools.updateOnlineStatus(`worker_token_balance`);
        const method = "run";
        await connection_1.connection.startTransaction();
        try {
            let events = await this.getUnprocessedEvent();
            if (events.count() === 0) {
                this.log(`no more new unprocessed events, checking on events for retry`, method);
                events = await this.getEventsForRetry();
                const event = events.getItem();
                if (event) {
                    this.log(`checking logs of ${event.txn_hash}`, method, false, true);
                    // check logs transfer count, if more less than 2, skip this purchase
                    let transferLogCount = 0;
                    let transferFromTokenFound = false;
                    const receipt = await eth_worker_1.eth_worker.getReceiptByTxnHashWeb3(event.txn_hash ?? "");
                    for (const log of receipt.logs) {
                        const transferLog = await web3_log_decoder_1.web3_log_decoder.getTransferLog(log);
                        if (transferLog && transferLog.ContractInfo.address.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                            transferFromTokenFound = true;
                        }
                    }
                    this.log(`${transferLogCount} transfer logs detected`, method, false, true);
                    if (transferFromTokenFound) {
                        this.log(`...transfer log count valid, continuing process`, method, false, true);
                    }
                    else {
                        this.log(`...no transfer from token found, skipping this purchase`, method, false, true);
                        event.time_balance_processed = 0;
                        await event.save();
                        this.log(`resetting events collection to process`, method, false, true);
                        events = new eth_contract_events_1.eth_contract_events();
                    }
                }
            }
            for (const event of events._dataList) {
                let retryLater = false;
                const logIndex = assert_1.assert.positiveInt(event.logIndex, `${method} event.logIndex`);
                const transactionHash = assert_1.assert.stringNotEmpty(event.txn_hash, `${method} event.txn_hash`);
                const type = assert_1.assert.stringNotEmpty(event.type, `${method} event.type`);
                const log_method = assert_1.assert.stringNotEmpty(event.log_method, `${method} event.log_method`);
                const fromAddress = assert_1.assert.stringNotEmpty(event.fromAddress, `${method} event.fromAddress`);
                const fromContract = assert_1.assert.stringNotEmpty(event.fromContract, `${method} event.fromContract`);
                const fromAmountGross = assert_1.assert.isNumericString(event.fromAmountGross, `${method} event.fromAmountGross`);
                const toAddress = assert_1.assert.stringNotEmpty(event.toAddress, `${method} event.toAddress`);
                const toContract = assert_1.assert.stringNotEmpty(event.toContract, `${method} event.toContract`);
                const toAmount = assert_1.assert.stringNotEmpty(event.toAmount, `${method} event.toAmount`);
                if (typeof event.block_time !== "number") {
                    this.log(`event has no block_time, fixing...`, method);
                    const dbLog = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getDbLog(transactionHash, logIndex);
                    event.block_time = dbLog.blockTime;
                    await event.save();
                }
                const blockTime = assert_1.assert.positiveInt(event.block_time, `${method} event.block_time`);
                const timeInfo = time_helper_1.time_helper.getAsFormat(blockTime, time_helper_1.TIME_FORMATS.ISO, "UTC");
                this.log(`${timeInfo}|processing ${event.blockNumber} ${event.logIndex} hash ${event.txn_hash} block ${event.blockNumber} log ${event.logIndex} log_method ${event.log_method}`, method, false, true);
                this.log(`...from:...${tools_1.tools.lastSubstring(fromAddress, 6)} to:...${tools_1.tools.lastSubstring(toAddress, 6)}`, method, false, true);
                if (log_method.toLowerCase() !== "swap" && log_method.toLowerCase() !== "transfer") {
                    this.log(`...event not swap or transfer, skipping`, method, false, true);
                    event.time_balance_processed = tools_1.tools.getCurrentTimeStamp();
                    await event.save();
                    continue;
                }
                let activation_status = "unknown";
                let min_token_required = "0";
                if (log_method.toLowerCase() === "transfer") {
                    this.log(`...transfer event detected`, method, false, true);
                    this.log(`...processing sender`, method, false, true);
                    if (fromContract.toLowerCase() !== eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                        this.log(`...from contract is ${eth_config_1.eth_config.getTokenSymbol()} token`, method, false, true);
                    }
                    else {
                        const fromBalanceDetail = await eth_token_balance_tools_1.eth_token_balance_tools.addBalanceEntryForTransfer(fromAddress, eth_token_balance_tools_1.ENTRY_TYPE.CREDIT, fromAmountGross, event);
                        this.log(`...current balance of sender ...${tools_1.tools.lastSubstring(fromBalanceDetail.address, 6)}(${fromBalanceDetail.username}) is ${fromBalanceDetail.token_amount}`, method, false, true);
                        const activationInfo = await this.updateActivationInfo(fromBalanceDetail);
                        activation_status = fromBalanceDetail.activation_status;
                        min_token_required = activationInfo.current_minimum_token;
                    }
                    this.log(`...processing receiver`, method);
                    if (toContract.toLowerCase() !== eth_config_1.eth_config.getTokenContract().toLowerCase()) {
                        this.log(`...to contract is ${eth_config_1.eth_config.getTokenSymbol()} token`, method, false, true);
                    }
                    else {
                        const toBalanceDetail = await eth_token_balance_tools_1.eth_token_balance_tools.addBalanceEntryForTransfer(toAddress, eth_token_balance_tools_1.ENTRY_TYPE.DEBIT, toAmount, event);
                        this.log(`...current balance of receiver ...${tools_1.tools.lastSubstring(toBalanceDetail.address, 6)}(${toBalanceDetail.username}) is ${toBalanceDetail.token_amount}`, method, false, true);
                        const activationInfo = await this.updateActivationInfo(toBalanceDetail);
                        activation_status = toBalanceDetail.activation_status;
                        min_token_required = activationInfo.current_minimum_token;
                    }
                }
                if (log_method.toLowerCase() === "swap") {
                    let balanceDetail = await eth_token_balance_tools_1.eth_token_balance_tools.addBalanceEntryForTrade(event);
                    if (balanceDetail) {
                        const activationInfo = await this.updateActivationInfo(balanceDetail);
                        activation_status = balanceDetail.activation_status;
                        min_token_required = activationInfo.current_minimum_token;
                    }
                    else {
                        retryLater = true;
                    }
                }
                this.log(`...activation status ${activation_status} minimum token required ${min_token_required}`, method, false, true);
                if (retryLater) {
                    this.log(`...detected to retry`, method, false, true);
                    event.time_balance_processed = -1;
                }
                else {
                    this.log('...successfully processed event', method, false, true);
                    event.time_balance_processed = tools_1.tools.getCurrentTimeStamp();
                }
                await event.save();
            }
            await connection_1.connection.commit();
            await tools_1.tools.sleep(250);
            setImmediate(() => {
                worker_token_balance.run().finally();
            });
        }
        catch (e) {
            await connection_1.connection.rollback();
            const errorMsg = e instanceof Error ? e.message : "unknown";
            this.log(`ERROR ${errorMsg}`, method, false, true);
            if (e instanceof eth_token_balance_tools_1.NoTransferLogCounterPart) {
                this.log(`probably race issue`, method, false, true);
            }
            this.log(`...retrying in 3 seconds`, method, false, true);
            await tools_1.tools.sleep(3000);
            setImmediate(() => {
                worker_token_balance.run().finally();
            });
        }
    }
    static async getUnprocessedEvent() {
        const events = new eth_contract_events_1.eth_contract_events();
        await events.list(` WHERE time_balance_processed IS NULL `, {}, ` ORDER BY blockNumber ASC, logIndex ASC LIMIT 1 `);
        return events;
    }
    static async getEventsForRetry() {
        const events = new eth_contract_events_1.eth_contract_events();
        await events.list(" WHERE time_balance_processed < :zero ", { zero: 0 }, " ORDER BY blockNumber ASC, logIndex ASC LIMIT 1 ");
        return events;
    }
    static async updateActivationInfo(balanceDetail) {
        const method = "updateActivationInfo";
        this.log(`updating info regarding activation`, method);
        assert_1.assert.inTransaction();
        const balanceHeader = await eth_token_balance_tools_1.eth_token_balance_tools.getBalanceHeaderOf(balanceDetail.address);
        balanceDetail.activation_status = balanceHeader.activation_status;
        const activation_amount = assert_1.assert.isNumericString(balanceHeader.minimum_balance, `${method} balanceHeader.minimum_balance`);
        balanceDetail.activation_amount = activation_amount;
        // ESTABLISH PRICE INFO
        const dbLog = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getDbLog(balanceDetail.transactionHash, balanceDetail.logIndex);
        const currentBnbUsdPrice = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbUsdPrice(dbLog);
        this.log(`...current bnb_usd price ${currentBnbUsdPrice}`, method);
        const currentTokenBnbPrice = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbTokenPrice(dbLog, eth_config_1.eth_config.getTokenContract());
        this.log(`...current token_bnb price ${currentTokenBnbPrice}`, method);
        const currentTokenBusdPrice = tools_1.tools.multiply(currentTokenBnbPrice, currentBnbUsdPrice, eth_config_1.eth_config.getBusdDecimal(), `${method} multiplying currentTokenPrice(${currentTokenBnbPrice}) and currentBnbUsdPrice(${currentBnbUsdPrice})`);
        this.log(`...current token_busd price ${currentTokenBusdPrice}`, method);
        let currentMinimumToken = tools_1.tools.divide(this.getMinimumBusdForActivation(), currentTokenBusdPrice, eth_config_1.eth_config.getTokenDecimal(), `${method} currentMinimumToken = ${this.getMinimumBusdForActivation()} / ${currentTokenBusdPrice}`);
        this.log(`...current minimum token ${currentMinimumToken} worth ${this.getMinimumBusdForActivation()}`, method);
        // probably need to add margin, like 2.5% for the fee from dex
        if (balanceHeader.activation_status === "y") {
            this.log(`...address currently is active. current balance ${balanceDetail.token_amount} minimum balance ${balanceHeader.minimum_balance}`, method);
            if (tools_1.tools.lesserThanOrEqualTo(balanceHeader.minimum_balance, 0, `${method} balanceHeader.minimum_balance <= 0`)) {
                throw new Error(`${method} unexpected minimum_balance <= 0 when activation_status is ${balanceHeader.activation_status}`);
            }
            if (tools_1.tools.lesserThan(balanceDetail.token_amount, activation_amount)) {
                this.log(`...detected that current balance went below minimum balance`, method);
                balanceHeader.activation_status = "n";
                balanceHeader.deactivation_count++;
                balanceHeader.minimum_balance = "0";
                balanceHeader.last_deactivation_transaction = balanceDetail.transactionHash;
                balanceDetail.activation_data = `token balance ${balanceDetail.token_amount} went below the minimum amount ${activation_amount} to maintain active status. current minimum token activation is ${currentMinimumToken}`;
                this.log(`...deactivated address. deactivation_count ${balanceHeader.deactivation_count}`, method);
            }
        }
        else {
            if (tools_1.tools.greaterThanOrEqualTo(balanceDetail.token_amount, currentMinimumToken, `${method} balanceDetail.token_amount >= currentMinimumToken`)) {
                if (balanceDetail.type === "buy") {
                    this.log(`...detected that balance ${balanceDetail.token_amount} is >= minimum token ${currentMinimumToken}`, method);
                    balanceHeader.activation_status = "y";
                    balanceHeader.activation_count++;
                    balanceHeader.minimum_balance = currentMinimumToken;
                    balanceHeader.last_activated_transaction = balanceDetail.transactionHash;
                    balanceDetail.activation_data = `token balance ${balanceDetail.token_amount} met minimum token amount ${currentMinimumToken} worth ${this.getMinimumBusdForActivation()} busd`;
                }
                else {
                    this.log(`...detected that balance ${balanceDetail.token_amount} is >= minimum token ${currentMinimumToken} but type is not buy, current type ${balanceDetail.type}`, method);
                }
            }
        }
        balanceDetail.activation_status = balanceHeader.activation_status;
        balanceDetail.activation_amount = balanceHeader.minimum_balance;
        await balanceDetail.save();
        await balanceHeader.save();
        return {
            balance_detail: balanceDetail,
            balance_header: balanceHeader,
            current_minimum_busd_value: this.getMinimumBusdForActivation(),
            current_minimum_token: currentMinimumToken,
            timestamp: balanceDetail.blockTime
        };
    }
    static getMinimumBusdForActivation() {
        return 50;
    }
}
exports.worker_token_balance = worker_token_balance;
if (process_1.argv.includes("run_worker_token_balance")) {
    console.log(`running worker to track token events`);
    worker_token_balance.run().finally();
}
//# sourceMappingURL=worker_token_balance.js.map