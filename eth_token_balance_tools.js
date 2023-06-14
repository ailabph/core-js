"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoTransferLogCounterPart = exports.eth_token_balance_tools = exports.ENTRY_TYPE = void 0;
const eth_token_balance_header_1 = require("./build/eth_token_balance_header");
const eth_config_1 = require("./eth_config");
const web3_tools_1 = require("./web3_tools");
const config_1 = require("./config");
const tools_1 = require("./tools");
const assert_1 = require("./assert");
const eth_token_balance_1 = require("./build/eth_token_balance");
const user_1 = require("./build/user");
const eth_price_track_details_tools_1 = require("./eth_price_track_details_tools");
const eth_receipt_logs_tools_1 = require("./eth_receipt_logs_tools");
const time_helper_1 = require("./time_helper");
//region TYPES
var ENTRY_TYPE;
(function (ENTRY_TYPE) {
    ENTRY_TYPE["DEBIT"] = "debit";
    ENTRY_TYPE["CREDIT"] = "credit";
})(ENTRY_TYPE || (ENTRY_TYPE = {}));
exports.ENTRY_TYPE = ENTRY_TYPE;
//endregion TYPES
class eth_token_balance_tools {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`eth_token_balance_tools|${method}|${msg}`);
            if (end)
                console.log(`eth_token_balance_tools|${method}|${tools_1.tools.LINE}`);
        }
    }
    //region UTILITIES
    static async updatePrices(detail, token_amount) {
        const method = "updatePrices";
        assert_1.assert.stringNotEmpty(detail.transactionHash, `${method} detail.transactionHash`);
        assert_1.assert.positiveInt(detail.logIndex, `${method} detail.logIndex`);
        token_amount = assert_1.assert.isNumericString(token_amount, `${method} token_amount`, 0);
        const dbLog = await eth_receipt_logs_tools_1.eth_receipt_logs_tools.getDbLog(detail.transactionHash, detail.logIndex);
        detail.bnb_usd = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbUsdPrice(dbLog);
        detail.bnb_price = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbTokenPrice(dbLog, eth_config_1.eth_config.getTokenContract());
        detail.bnb_value = await eth_price_track_details_tools_1.eth_price_track_details_tools.getBnbTokenValue(dbLog, eth_config_1.eth_config.getTokenContract(), token_amount);
        detail.usd_price = tools_1.tools.multiply(detail.bnb_price, detail.bnb_usd);
        detail.usd_value = tools_1.tools.multiply(detail.usd_price, token_amount);
        return detail;
    }
    static updateLastValues(header, detail) {
        header.last_BlockTime = detail.blockTime;
        header.last_logIndex = detail.logIndex;
        header.last_transactionHash = detail.transactionHash;
        header.last_BlockTime = detail.blockTime;
        return header;
    }
    static async createTokenBalanceDetail(address, event) {
        const method = "createTokenBalanceDetail";
        this.log(`creating new token balance detail`, method);
        if (typeof address === "string") {
            address = await this.getBalanceHeaderOf(address);
        }
        let detail = new eth_token_balance_1.eth_token_balance();
        detail.address = address.address;
        detail.type = "transfer";
        detail.blockNumber = assert_1.assert.positiveInt(event.blockNumber, `${method} event.blockNumber`);
        detail.logIndex = assert_1.assert.positiveInt(event.logIndex, `${method} event.logIndex`);
        detail.transactionHash = assert_1.assert.stringNotEmpty(event.txn_hash, `${method} event.txn_hash`);
        detail.blockTime = assert_1.assert.positiveInt(event.block_time, `${method} event.block_time`);
        detail.username = "";
        this.log(`...address type ${address.type}`, method);
        if (address.type === "wallet") {
            this.log(`...attempt retrieve wallet owner`, method);
            const member = new user_1.user();
            member.walletAddress = address.address;
            await member.fetch();
            if (member.recordExists()) {
                detail.username = member.username;
                this.log(`...owner found ${detail.username}`, method);
            }
            else {
                this.log(`...no wallet owner`, method);
            }
        }
        return detail;
    }
    //endregion UTILITIES
    static async getBalanceHeaderOf(address) {
        const method = "getBalanceHeaderOf";
        this.log(`retrieving balance header of ${address}`, method);
        // assert.inTransaction();
        address = assert_1.assert.stringNotEmpty(address, `${method} address`);
        const query = new eth_token_balance_header_1.eth_token_balance_header();
        query.address = address;
        await query.fetch();
        if (query.isNew()) {
            this.log(`...header balance not found, creating new one`, method);
            query.token_contract = eth_config_1.eth_config.getTokenContract();
            query.token_symbol = eth_config_1.eth_config.getTokenSymbol();
            query.address = address;
            if (await web3_tools_1.web3_tools.isWalletAddress(address)) {
                query.type = "wallet";
            }
            else if (await web3_tools_1.web3_tools.isContractAddress(address)) {
                query.type = "contract";
            }
            else {
                query.type = "unknown";
            }
            await query.save();
            this.log(`...saved with id: ${query.id}`, method);
        }
        this.log(`...returning header balance record with id ${query.id}`, method);
        return query;
    }
    static async addBalanceEntryForTransfer(address, entry_type, token_amount, event) {
        const method = "addBalanceEntry";
        this.log(`adding balance entry for ${address}`, method);
        assert_1.assert.inTransaction();
        if (event.log_method?.toLowerCase() !== "transfer")
            throw new Error(`${method} unable to add balance entry for transfer, log method is not transfer`);
        token_amount = assert_1.assert.isNumericString(token_amount, `${method} token_amount`, 0);
        let balanceHeader = await this.getBalanceHeaderOf(address);
        let newEntry = await this.createTokenBalanceDetail(balanceHeader, event);
        if (entry_type === ENTRY_TYPE.DEBIT) {
            this.log(`... DEBIT ${token_amount} to current balance ${balanceHeader.current_balance}`, method);
            newEntry.debit = token_amount;
            balanceHeader.total_debit = tools_1.tools.add(balanceHeader.total_debit, token_amount, eth_config_1.eth_config.getTokenDecimal());
            balanceHeader.current_balance = tools_1.tools.add(balanceHeader.current_balance, token_amount, eth_config_1.eth_config.getTokenDecimal());
        }
        else {
            this.log(`... CREDIT ${token_amount} to current balance ${balanceHeader.current_balance}`, method);
            newEntry.credit = token_amount;
            balanceHeader.total_credit = tools_1.tools.add(balanceHeader.total_credit, token_amount, eth_config_1.eth_config.getTokenDecimal());
            balanceHeader.current_balance = tools_1.tools.deduct(balanceHeader.current_balance, token_amount, eth_config_1.eth_config.getTokenDecimal());
        }
        newEntry.token_amount = balanceHeader.current_balance;
        newEntry = await this.updatePrices(newEntry, token_amount);
        await newEntry.save();
        balanceHeader = this.updateLastValues(balanceHeader, newEntry);
        await balanceHeader.save();
        this.log(`...current token balance is ${balanceHeader.current_balance}`, method);
        return newEntry;
    }
    static async addBalanceEntryForTrade(event) {
        const method = "addBalanceEntryForTrade";
        this.log(`adding balance entry for trade`, method, false, true);
        assert_1.assert.inTransaction();
        if (event.log_method?.toLowerCase() !== "swap")
            throw new Error(`${method} unable to add balance entry for trade, log method is not swap`);
        const transactionHash = assert_1.assert.stringNotEmpty(event.txn_hash, `${method} event.txn_hash`);
        const logIndex = assert_1.assert.positiveInt(event.logIndex, `${method} event.logIndex`);
        /**
         * at this point, swap owner is not known, retrieving the transfer counterpart of this transaction
         * transactionHash, type=:transfer, logIndex < logIndex and (buy debit > 0)
         */
        this.log(`...retrieving transfer balance detail with hash ${transactionHash} and logIndex < ${logIndex} `, method);
        let where = " WHERE transactionHash=:hash AND type=:transfer AND logIndex<:swapLogIndex ";
        const param = {};
        param["hash"] = transactionHash;
        param["transfer"] = "transfer";
        param["swapLogIndex"] = logIndex;
        param["zero"] = 0;
        if (event.type === "buy") {
            this.log(`...buy detected, retrieving balance detail with debit > 0`, method);
            where += " AND debit>:zero ";
        }
        else if (event.type === "sell") {
            this.log(`...sell detected, retrieving balance detail with credit > 0`, method);
            where += " AND credit>:zero ";
        }
        else {
            throw new Error(`${method} unexpected event.type ${event.type}, expected to be buy or sell`);
        }
        const balanceDetails = new eth_token_balance_1.eth_token_balance();
        await balanceDetails.list(where, param, " ORDER BY logIndex DESC LIMIT 1 ");
        if (balanceDetails.count() === 0) {
            if (event.method?.toLowerCase() === "unknown") {
                this.log(`...no transfer counterpart found for this trade and transaction method is unknown, skipping process...`, method, false, true);
                return false;
            }
            // throw new NoTransferLogCounterPart("swap log no transfer counterpart yet");
        }
        if (balanceDetails.count() !== 1)
            throw new Error(`${method} expected balance detail transfer count to be 1, found ${balanceDetails.count()}`);
        let transferDetail = balanceDetails.getItem();
        const originalLogIndex = transferDetail.logIndex;
        let balanceHeader = await this.getBalanceHeaderOf(transferDetail.address);
        /*
        from this transfer bonus detail, we can now retrieve who is the swapper. we also need to change the details of this
        detail to swap
         */
        transferDetail.logIndex = logIndex;
        transferDetail.type = event.type;
        const eventTokenAmount = event.type === "buy" ? event.toAmount : event.fromAmount;
        let token_amount = "0";
        if (event.type === "buy") {
            transferDetail.other_token = event.fromSymbol;
            transferDetail.other_token_amount = event.fromAmountGross;
            token_amount = assert_1.assert.isNumericString(transferDetail.debit, `${method} transferDetail.debit`);
            balanceHeader.total_buy = tools_1.tools.add(balanceHeader.total_buy, token_amount);
        }
        else if (event.type === "sell") {
            transferDetail.other_token = event.toSymbol;
            transferDetail.other_token_amount = event.toAmount;
            token_amount = assert_1.assert.isNumericString(transferDetail.credit, `${method} transferDetail.credit`);
            balanceHeader.total_sell = tools_1.tools.add(balanceHeader.total_sell, token_amount);
        }
        if (tools_1.tools.notEqualTo(token_amount, eventTokenAmount, `${method} token_amount != eventTokenAmount`)) {
            throw new Error(`${method} balance detail debit/credit amount ${token_amount} != event token amount ${eventTokenAmount}`);
        }
        this.log(`...other_token ${transferDetail.other_token} other_token_amount ${transferDetail.other_token_amount}`, method);
        transferDetail.other_token = assert_1.assert.stringNotEmpty(transferDetail.other_token, `${method} transferDetail.other_token`);
        transferDetail.other_token_amount = assert_1.assert.isNumericString(transferDetail.other_token_amount, `${method} transferDetail.other_token_amount`, 0);
        transferDetail = await this.updatePrices(transferDetail, token_amount);
        await transferDetail.save();
        balanceHeader = this.updateLastValues(balanceHeader, transferDetail);
        await balanceHeader.save();
        this.log(`...updated balance detail ${transferDetail.id} logIndex from ${originalLogIndex} to ${transferDetail.logIndex}, updated type to ${event.type}`, method, false, true);
        return transferDetail;
    }
    //region GETTERS
    static async getBalanceDetailAsOf(address, during) {
        const method = "getBalanceDetailAsOf";
        this.log(`retrieving balance of ${address} on ${during}`, method);
        if (tools_1.tools.isNullish(address)) {
            this.log(`...address ${address} passed is null`, method);
            return false;
        }
        address = assert_1.assert.stringNotEmpty(address, `${method} address`);
        during = assert_1.assert.positiveInt(during, `${method} during`);
        const timeFormat = time_helper_1.time_helper.getAsFormat(during, time_helper_1.TIME_FORMATS.READABLE);
        const balances = new eth_token_balance_1.eth_token_balance();
        await balances.list(" WHERE address=:address AND blockTime <= :time ", { address: address, time: during }, " ORDER BY blockNumber DESC, logIndex DESC LIMIT 1 ");
        if (balances.count() > 0) {
            const balance = balances.getItem();
            this.log(`...found balance ${balance.token_amount} as of ${timeFormat}`, method);
            return balance;
        }
        this.log(`...no balance info found on db as of ${timeFormat}`, method);
        return false;
    }
}
exports.eth_token_balance_tools = eth_token_balance_tools;
class NoTransferLogCounterPart extends Error {
    constructor(message) {
        super(message);
        this.name = "NoTransferLogCounterPart";
    }
}
exports.NoTransferLogCounterPart = NoTransferLogCounterPart;
//# sourceMappingURL=eth_token_balance_tools.js.map