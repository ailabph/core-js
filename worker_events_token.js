"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_events_token = void 0;
const process_1 = require("process");
const config_1 = require("./config");
const tools_1 = require("./tools");
const assert_1 = require("./assert");
const connection_1 = require("./connection");
const eth_receipt_logs_1 = require("./build/eth_receipt_logs");
const time_helper_1 = require("./time_helper");
const eth_worker_1 = require("./eth_worker");
const web3_abi_decoder_1 = require("./web3_abi_decoder");
const web3_log_decoder_1 = require("./web3_log_decoder");
const eth_contract_events_1 = require("./build/eth_contract_events");
const eth_config_1 = require("./eth_config");
const user_1 = require("./build/user");
const eth_price_track_details_tools_1 = require("./eth_price_track_details_tools");
const eth_contract_data_tools_1 = require("./eth_contract_data_tools");
class worker_events_token {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`worker_events_token|${method}|${msg}`);
            if (end)
                console.log(`worker_events_token|${method}|${tools_1.tools.LINE}`);
        }
    }
    static getBatch() {
        return 250;
    }
    static async run() {
        const method = "run";
        await connection_1.connection.startTransaction();
        try {
            const unprocessedTokenEvents = new eth_receipt_logs_1.eth_receipt_logs();
            await unprocessedTokenEvents.list(" WHERE id>:last_id AND time_processed_price>:zero AND has_token=:y AND  time_processed_events IS NULL ", { last_id: this.last_id, zero: 0, y: "y" }, ` ORDER BY blockNumber ASC, logIndex ASC LIMIT ${this.getBatch()} `);
            const total = unprocessedTokenEvents.count();
            let count = 0;
            for (const log of unprocessedTokenEvents._dataList) {
                const transactionHash = assert_1.assert.stringNotEmpty(log.transactionHash, "log.transactionHash");
                this.last_hash = transactionHash;
                const logIndex = assert_1.assert.positiveInt(log.logIndex, "log.logIndex");
                this.last_logIndex = logIndex;
                count++;
                const logFormat = `${count}/${total}|${time_helper_1.time_helper.getAsFormat(assert_1.assert.positiveInt(log.blockTime, "log.blockTime"), time_helper_1.TIME_FORMATS.ISO)}|`;
                this.log(`${logFormat} ${this.last_hash} ${this.last_logIndex}`, method, false, true);
                // check if already on event
                const checkEvent = new eth_contract_events_1.eth_contract_events();
                await checkEvent.list(" WHERE txn_hash=:hash AND logIndex=:logIndex ", { hash: transactionHash, logIndex: logIndex });
                if (checkEvent.count() > 0) {
                    this.log(`${logFormat}---- already on db, updating log`, method, false, true);
                    log.time_processed_events = tools_1.tools.getCurrentTimeStamp();
                    await log.save();
                }
                // get txn and decode
                const transaction = await eth_worker_1.eth_worker.getDbTxnByHash(transactionHash);
                const decodedTransaction = await web3_abi_decoder_1.web3_abi_decoder.decodeAbiObject(transaction.input);
                const txnMethod = decodedTransaction ? decodedTransaction.abi.name : "unknown";
                const transferTransaction = await web3_abi_decoder_1.web3_abi_decoder.getTransferAbi(decodedTransaction);
                // decode log
                const web3Log = eth_worker_1.eth_worker.convertDbLogToWeb3Log(log);
                const decodedLog = await web3_log_decoder_1.web3_log_decoder.decodeLog(web3Log);
                const logMethod = decodedLog.method_name;
                const transferLog = await web3_log_decoder_1.web3_log_decoder.getTransferLog(web3Log);
                const tokenContractInfo = await eth_contract_data_tools_1.eth_contract_data_tools.getContractDynamicStrict(eth_config_1.eth_config.getTokenContract());
                const newEvent = new eth_contract_events_1.eth_contract_events();
                newEvent.txn_hash = transactionHash;
                newEvent.blockNumber = log.blockNumber;
                newEvent.block_time = log.blockTime;
                newEvent.logIndex = log.logIndex;
                newEvent.method = txnMethod;
                newEvent.log_method = logMethod;
                if (transferLog) {
                    this.log(`${logFormat}---- transfer detected, setting values`, method, false, true);
                    newEvent.fromContract = tokenContractInfo.address;
                    newEvent.fromSymbol = tokenContractInfo.symbol;
                    newEvent.fromDecimal = assert_1.assert.naturalNumber(tokenContractInfo.decimals, `tokenContractInfo.decimals`);
                    newEvent.toContract = tokenContractInfo.address;
                    newEvent.toSymbol = tokenContractInfo.symbol;
                    newEvent.toDecimal = assert_1.assert.naturalNumber(tokenContractInfo.decimals, `tokenContractInfo.decimals`);
                    newEvent.fromAddress = transferLog.from;
                    newEvent.toAddress = transferLog.to;
                    newEvent.fromAmountGross = eth_worker_1.eth_worker.convertValueToAmount(transferLog.value.toString(), transferLog.ContractInfo.decimals);
                    newEvent.fromAmount = newEvent.fromAmountGross;
                    newEvent.toAmountGross = newEvent.fromAmountGross;
                    newEvent.toAmount = newEvent.fromAmountGross;
                    if (transferTransaction) {
                        this.log(`${logFormat}---- transfer transaction detected, checking if the same sender or receiver`, method, false, true);
                        if (transferTransaction.recipient.toLowerCase() === newEvent.fromAddress.toLowerCase()
                            || transferTransaction.recipient.toLowerCase() === newEvent.toAddress.toLowerCase()) {
                            newEvent.fromAmountGross = eth_worker_1.eth_worker.convertValueToAmount(transferTransaction.amount.toString(), transferLog.ContractInfo.decimals);
                            this.log(`${logFormat}---- setting from amount gross value based on transaction method amount ${newEvent.fromAmountGross}`, method, false, true);
                        }
                    }
                    // Check from User and To User
                    let fromUsername = "";
                    const fromMember = new user_1.user();
                    fromMember.walletAddress = newEvent.fromAddress;
                    await fromMember.fetch();
                    if (fromMember.recordExists()) {
                        fromUsername = fromMember.username;
                    }
                    this.log(`${logFormat}---- FROM AMOUNT GROSS ${newEvent.fromAmountGross} NET ${newEvent.fromAmount} ${fromUsername}`, method, false, true);
                    // Check from User and To User
                    let toUsername = "";
                    const toMember = new user_1.user();
                    toMember.walletAddress = newEvent.toAddress;
                    await toMember.fetch();
                    if (toMember.recordExists()) {
                        toUsername = toMember.username;
                    }
                    this.log(`${logFormat}---- TO AMOUNT GROSS ${newEvent.toAmountGross} NET ${newEvent.toAmount} ${toUsername}`, method, false, true);
                    // TAX
                    if (tools_1.tools.greaterThan(newEvent.fromAmount, newEvent.fromAmountGross))
                        throw new Error(`unexpected fromAmount(${newEvent.fromAmount}) > fromAmountGross(${newEvent.fromAmountGross})`);
                    if (tools_1.tools.greaterThan(newEvent.toAmount, newEvent.toAmountGross))
                        throw new Error(`unexpected toAmount(${newEvent.toAmount}) > toAmountGross(${newEvent.toAmountGross})`);
                    if (tools_1.tools.greaterThan(newEvent.toAmount, newEvent.fromAmount))
                        throw new Error(`unexpected toAmount(${newEvent.toAmount}) > fromAmount(${newEvent.fromAmount})`);
                    newEvent.tax_amount = tools_1.tools.deduct(newEvent.fromAmountGross, newEvent.toAmount, tokenContractInfo.decimals, `fromAmountGross(${newEvent.fromAmountGross}) - toAmount(${newEvent.toAmount}) = tax_amount`);
                    newEvent.tax_percentage = 0;
                    if (tools_1.tools.greaterThan(newEvent.tax_amount, "0")) {
                        const tax_perc = tools_1.tools.divide(newEvent.tax_amount, newEvent.fromAmountGross, tokenContractInfo.decimals);
                        newEvent.tax_percentage = tools_1.tools.getNumber(tax_perc, 4);
                    }
                    if (newEvent.tax_percentage && newEvent.tax_percentage >= 0.4)
                        throw new Error(`unexpected tax >= 0.4`);
                    this.log(`${logFormat}---- TAX AMOUNT ${newEvent.tax_amount} ${newEvent.tax_percentage}%`, method, false, true);
                    // PRICES
                    newEvent.token_bnb = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbTokenPrice(log, tokenContractInfo);
                    newEvent.token_bnb_value = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbTokenValue(log, tokenContractInfo, newEvent.fromAmountGross);
                    newEvent.bnb_usd = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbUsdPrice(log);
                    newEvent.token_usd = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbUsdValue(log, newEvent.token_bnb);
                    newEvent.token_usd_value = tools_1.tools.toBn(newEvent.token_usd).multipliedBy(tools_1.tools.toBn(newEvent.fromAmountGross)).toFixed(eth_config_1.eth_config.getBusdDecimal());
                    this.log(`${logFormat}---- BNB USD ${newEvent.bnb_usd}`, method, false, true);
                    this.log(`${logFormat}---- BNB PRICE ${newEvent.token_bnb} VALUE ${newEvent.token_bnb_value}`, method, false, true);
                    this.log(`${logFormat}---- USD PRICE ${newEvent.token_usd} VALUE ${newEvent.token_usd_value}`, method, false, true);
                    await newEvent.save();
                    this.log(`${logFormat}---- saved with id ${newEvent.id}`, method, false, true);
                }
                else {
                    this.log(`${logFormat}---- not a transfer, saving data to be processed in the future`, method, false, true);
                    newEvent.fromAddress = transaction.fromAddress;
                }
                this.log(`${logFormat}---- txn method ${txnMethod} logMethod ${logMethod}`, method, false, true);
                log.time_processed_events = time_helper_1.time_helper.getCurrentTimeStamp();
                await log.save();
                this.log(`${logFormat}---- db log updated`, method, false, true);
                this.last_id = assert_1.assert.positiveInt(log.id, "log.id for last_id");
            }
            // process
            await connection_1.connection.commit();
            await tools_1.tools.sleep(50);
            setImmediate(() => {
                worker_events_token.run();
            });
        }
        catch (e) {
            await connection_1.connection.rollback();
            this.log(`ERROR on hash ${this.last_hash} ${this.last_logIndex}`, method, false, true);
            console.log(e);
            this.log(`worker stopped`, method, true, true);
        }
    }
}
exports.worker_events_token = worker_events_token;
worker_events_token.last_id = 0;
worker_events_token.last_hash = "";
worker_events_token.last_logIndex = 0;
class worker_events_token_error extends Error {
    constructor(message) {
        super(message);
    }
}
if (process_1.argv.includes("run_worker_events_token")) {
    console.log(`running worker to track token events`);
    worker_events_token.run().finally();
}
//# sourceMappingURL=worker_events_token.js.map