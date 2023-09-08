"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.web3_startup_checks = void 0;
const eth_config_1 = require("./eth_config");
const assert_1 = require("./assert");
const process_1 = require("process");
const web3_token_1 = require("./web3_token");
const eth_worker_1 = require("./eth_worker");
const eth_contract_data_tools_1 = require("./eth_contract_data_tools");
const web3_pancake_router_1 = require("./web3_pancake_router");
const web3_pancake_pair_1 = require("./web3_pancake_pair");
const tools_1 = require("./tools");
const eth_log_sig_1 = require("./build/eth_log_sig");
const account_1 = require("./build/account");
const account_tools_1 = require("./account_tools");
const worker_sms_1 = require("./worker_sms");
const user_1 = require("./build/user");
const time_helper_1 = require("./time_helper");
const config_1 = require("./config");
const worker_email_1 = require("./worker_email");
const staking_1 = require("./build/staking");
const user_tools_1 = require("./user_tools");
class web3_startup_checks {
    constructor() {
        this.error_count = 0;
        this.error_logs = [];
        this.verbose = false;
        //endregion PATCH
    }
    static async run() {
        console.log(`running checks for web3`);
        const testId = tools_1.tools.generateRandomNumber(1000000, 9999999);
        const currentTime = time_helper_1.time_helper.getTime().format(time_helper_1.TIME_FORMATS.READABLE);
        const admin = new user_1.user();
        admin.username = "admin";
        await admin.fetch();
        if (admin.isNew())
            throw new Error(`unable to retrieve admin user for further tests`);
        const rpc = assert_1.assert.stringNotEmpty(eth_config_1.eth_config.getRPCUrl(), "getRPCUrl");
        console.log(`rpc:${rpc}`);
        //region BUSD
        const busdContract = assert_1.assert.stringNotEmpty(eth_config_1.eth_config.getBusdContract(), "getBusdContract");
        const busdSymbol = assert_1.assert.stringNotEmpty(eth_config_1.eth_config.getBusdSymbol(), "getBusdSymbol");
        const busdDecimal = assert_1.assert.naturalNumber(eth_config_1.eth_config.getBusdDecimal(), "getBusdDecimal");
        console.log(`checking busd contract`);
        const busdInfo = await eth_contract_data_tools_1.eth_contract_data_tools.getContractViaAddress(busdContract);
        if (!busdInfo)
            throw new Error(`unable to retrieve busd contract on chain`);
        if (busdSymbol.toLowerCase() !== busdInfo.symbol.toLowerCase())
            throw new Error(`config busd symbol(${busdSymbol}) does not match chain symbol(${busdInfo.symbol})`);
        if (busdDecimal !== assert_1.assert.naturalNumber(busdInfo.decimals, "busd decimal"))
            throw new Error(`config busd Decimal(${busdDecimal}) does not match chain Decimal(${busdInfo.decimals})`);
        //endregion BUSD
        //region BNB
        const bnbContract = assert_1.assert.stringNotEmpty(eth_config_1.eth_config.getEthContract(), "getEthContract");
        const bnbSymbol = assert_1.assert.stringNotEmpty(eth_config_1.eth_config.getEthSymbol(), "getEthSymbol");
        const bnbDecimal = assert_1.assert.naturalNumber(eth_config_1.eth_config.getEthDecimal(), "getEthDecimal");
        console.log(`checking bnb contract`);
        const bnbInfo = await eth_contract_data_tools_1.eth_contract_data_tools.getContractViaAddress(bnbContract);
        if (!bnbInfo)
            throw new Error(`unable to retrieve bnb contract on chain`);
        if (bnbSymbol.toLowerCase() !== bnbInfo.symbol.toLowerCase())
            throw new Error(`config bnb symbol(${bnbSymbol}) does not match chain symbol(${bnbInfo.symbol})`);
        if (bnbDecimal !== assert_1.assert.naturalNumber(bnbInfo.decimals, "bnb decimal"))
            throw new Error(`config bnb Decimal(${bnbDecimal}) does not match chain Decimal(${bnbInfo.decimals})`);
        //endregion BNB
        //region TRACKED TOKEN
        const tokenAddress = assert_1.assert.stringNotEmpty(eth_config_1.eth_config.getTokenContract(), "getTokenContract");
        const tokenSymbol = assert_1.assert.stringNotEmpty(eth_config_1.eth_config.getTokenSymbol(), "getTokenSymbol");
        const tokenDecimal = assert_1.assert.naturalNumber(eth_config_1.eth_config.getTokenDecimal(), "getTokenDecimal");
        console.log(`checking tracked token`);
        const tokenInfo = await eth_contract_data_tools_1.eth_contract_data_tools.getContractViaAddress(tokenAddress);
        if (!tokenInfo)
            throw new Error(`unable to retrieve token info on chain`);
        if (tokenSymbol.toLowerCase() !== tokenInfo.symbol.toLowerCase())
            throw new Error(`config token symbol(${tokenSymbol}) does not match chain symbol(${tokenInfo.symbol})`);
        if (tokenDecimal !== assert_1.assert.naturalNumber(tokenInfo.decimals, "token decimal"))
            throw new Error(`config token Decimal(${tokenDecimal}) does not match chain Decimal(${tokenInfo.decimals})`);
        //endregion TRACKED TOKEN
        const genesisHash = assert_1.assert.stringNotEmpty(eth_config_1.eth_config.getTokenGenesisHash(), "getTokenGenesisHash");
        const genesisHashDb = await eth_worker_1.eth_worker.getDbTxnByHash(genesisHash);
        if (genesisHashDb.isNew())
            throw new Error(`invalid genesis hash`);
        const genesisBlock = assert_1.assert.naturalNumber(eth_config_1.eth_config.getTokenGenesisBlock(), "getTokenGenesisBlock");
        if (assert_1.assert.positiveNumber(genesisHashDb.blockNumber) !== genesisBlock)
            throw new Error(`genesis hash block number(${genesisHashDb.blockNumber}) does not match genesis block on config(${genesisBlock}) `);
        assert_1.assert.stringNotEmpty(eth_config_1.eth_config.getTokenOwner(), "getTokenOwner");
        assert_1.assert.stringNotEmpty(eth_config_1.eth_config.getDexContract(), "getDexContract");
        const factoryAddress = await web3_pancake_router_1.web3_pancake_router.getFactory();
        const configFactoryAddress = assert_1.assert.stringNotEmpty(eth_config_1.eth_config.getPancakeFactoryContract(), "getPancakeFactoryContract");
        if (factoryAddress.toLowerCase() !== configFactoryAddress.toLowerCase())
            throw new Error(`chain factory address(${factoryAddress}) do not match config(${configFactoryAddress})`);
        const tokenBnbPairAddress = assert_1.assert.stringNotEmpty(eth_config_1.eth_config.getTokenBnbPairContract(), "getTokenBnbPairContract");
        // get token0, get token1
        const token0 = await web3_pancake_pair_1.web3_pancake_pair.token0Strict(tokenBnbPairAddress);
        const token1 = await web3_pancake_pair_1.web3_pancake_pair.token1Strict(tokenBnbPairAddress);
        const bnbTokenPair = [token0.toLowerCase(), token1.toLowerCase()];
        if (!bnbTokenPair.includes(bnbContract.toLowerCase()))
            throw new Error(`bnb not found in token bnb pair`);
        if (!bnbTokenPair.includes(tokenAddress.toLowerCase()))
            throw new Error(`token not found in token bnb pair`);
        //optional
        const tokenBusdPairAddress = eth_config_1.eth_config.getTokenUsdPairContract();
        if (tools_1.tools.isNotEmpty(tokenBusdPairAddress)) {
            const tokenBusdToken0 = await web3_pancake_pair_1.web3_pancake_pair.token0Strict(tokenBusdPairAddress);
            const tokenBusdToken1 = await web3_pancake_pair_1.web3_pancake_pair.token1Strict(tokenBusdPairAddress);
            const busdTokenPair = [tokenBusdToken0.toLowerCase(), tokenBusdToken1.toLowerCase()];
            if (!busdTokenPair.includes(busdContract.toLowerCase()))
                throw new Error(`busd not found in token busd pair`);
            if (!busdTokenPair.includes(tokenAddress.toLowerCase()))
                throw new Error(`token not found in token busd pair`);
        }
        const bnbUsdPairAddress = assert_1.assert.stringNotEmpty(eth_config_1.eth_config.getBnbUsdPairContract(), "getBnbUsdPairContract");
        const bnbUsdToken0 = await web3_pancake_pair_1.web3_pancake_pair.token0Strict(bnbUsdPairAddress);
        const bnbUsdToken1 = await web3_pancake_pair_1.web3_pancake_pair.token1Strict(bnbUsdPairAddress);
        const bnbUsdPair = [bnbUsdToken0.toLowerCase(), bnbUsdToken1.toLowerCase()];
        if (!bnbUsdPair.includes(bnbContract.toLowerCase()))
            throw new Error(`bnb not found in bnb usd pair ${bnbUsdToken0} ${bnbUsdToken1}`);
        if (!bnbUsdPair.includes(busdContract.toLowerCase()))
            throw new Error(`busd not found in bnb usd pair ${bnbUsdToken0} ${bnbUsdToken1}`);
        const syncLogSig = assert_1.assert.stringNotEmpty(eth_config_1.eth_config.getSyncTopicSig(), "getSyncTopicSig");
        const syncLogSigDb = new eth_log_sig_1.eth_log_sig();
        syncLogSigDb.signature = syncLogSig.replace("0x", "");
        await syncLogSigDb.fetch();
        if (syncLogSigDb.isNew())
            throw new Error(`unable to retrieve sync log from signature collection`);
        assert_1.assert.stringNotEmpty(eth_config_1.eth_config.getHotWalletAddress(), "getHotWalletAddress");
        assert_1.assert.stringNotEmpty(eth_config_1.eth_config.getHotWalletKey(), "getHotWalletKey");
        assert_1.assert.naturalNumber(eth_config_1.eth_config.getGasMultiplier(), "getGasMultiplier");
        assert_1.assert.naturalNumber(eth_config_1.eth_config.getGasMultiplierForBnb(), "getGasMultiplierForBnb");
        assert_1.assert.naturalNumber(eth_config_1.eth_config.getConfirmationNeeded(), "getConfirmationNeeded");
        //region SPONSOR STRUCTURE
        await web3_startup_checks.structure_check();
        //endregion SPONSOR STRUCTURE
        //region HOT WALLET
        console.log(`checking hot wallet bnb balance`);
        const hotWalletBnb = await eth_worker_1.eth_worker.getETHBalance(eth_config_1.eth_config.getHotWalletAddress());
        if (tools_1.tools.lesserThanOrEqualTo(hotWalletBnb, "0.3000"))
            throw new Error(`hot wallet bnb balance is ${hotWalletBnb}, which is low`);
        console.log(`...hot wallet bnb balance is ${hotWalletBnb}`);
        console.log(`checking hot wallet token balance`);
        const hotWalletToken = await eth_worker_1.eth_worker.getTokenBalance(eth_config_1.eth_config.getHotWalletAddress());
        if (tools_1.tools.lesserThan(hotWalletToken, "1000000"))
            throw new Error(`hot wallet token balance is below 1M, currently ${hotWalletToken}`);
        console.log(`... hot wallet bnb balance is ${hotWalletToken}`);
        console.log(`checking sending of token`);
        const receiptToken = await web3_token_1.web3_token.transfer(eth_config_1.eth_config.getHotWalletAddress(), eth_config_1.eth_config.getHotWalletKey(), admin.walletAddress ?? "", "1");
        if (!receiptToken)
            throw new Error(`unable to transfer token`);
        console.log(`...send of token successful with hash ${receiptToken.transactionHash}`);
        // console.log(`checking sending of bnb`);
        const receiptBnb = await web3_token_1.web3_token.sendBNB(eth_config_1.eth_config.getHotWalletAddress(), eth_config_1.eth_config.getHotWalletKey(), admin.walletAddress ?? "", "0.0001");
        console.log(`...send of bnb successful with hash ${receiptBnb.transactionHash}`);
        //endregion HOT WALLET
        //region SMS
        console.log(`checking sms if working...`);
        const smsRes = await worker_sms_1.worker_sms.sendSms(assert_1.assert.isNumericString(admin.contact, `admin.contact`), `sms check id ${testId} as of ${currentTime}`);
        if (typeof smsRes === "string")
            throw new Error(`...sms error ${smsRes}`);
        console.log(`...send successful`);
        const data = smsRes.data[0];
        if (data.sender_name !== config_1.config.getCustomOption("sender_name", true))
            throw new Error(`sender name do not match`);
        //endregion SMS
        //region EMAIL
        console.log(`checking email...`);
        const emailRes = await worker_email_1.worker_email.sendEmail(assert_1.assert.stringNotEmpty(admin.email, `admin.email`), `Email Check Id ${testId}`, `as of ${currentTime}`);
        if (typeof emailRes === "string")
            throw new Error(`email send failed: ${emailRes}`);
        console.log(`...email send successful`);
        //endregion EMAIL
        console.log(`check complete`);
    }
    static async structure_check() {
        const auto_fix = true;
        const allAccounts = new account_1.account();
        await allAccounts.list(" WHERE 1 ");
        console.log(`${allAccounts.count()} accounts found, checking sponsor structure integrity...`);
        let issuesFound = 0;
        for (const acc of allAccounts._dataList) {
            if (typeof acc.user_id === "number" && acc.user_id > 0) {
                const errorInfo = await account_tools_1.account_tools.verifySponsorLineOfDownline(acc, auto_fix);
                if (typeof errorInfo === "string") {
                    issuesFound++;
                    console.log(`...INVALID ${errorInfo}`);
                }
            }
            else {
                console.log(`...Skipping, account ${acc.id} has invalid user_id ${acc.user_id}`);
            }
        }
        console.log(`...sponsor structure issues found:${issuesFound}`);
        if (issuesFound > 0)
            throw new Error(`...sponsor structure issues found:${issuesFound}. auto_fix:${tools_1.tools.convertBoolToYesNo(auto_fix)}`);
    }
    async structure_check_v2() {
        try {
            await this.check_user_with_valid_accounts();
            await this.check_accounts_with_valid_users();
            await this.check_accounts_structure();
            await this.check_staking_wallet();
        }
        catch (e) {
        }
    }
    async check_user_with_valid_accounts() {
        console.log(`--------------------------------------------------`);
        console.log(`SEQUENCE INITIATED: USER WALLET CHECK`);
        console.log(`--------------------------------------------------`);
        const users_with_wallet_address = await this.get_users_with_wallet_address_not_empty();
        console.log(`...${users_with_wallet_address.length} users with walletAddress not empty`);
        for (const u of users_with_wallet_address) {
            const userWalletAddress = assert_1.assert.stringNotEmpty(u.walletAddress, `user(${u.username}).walletAddress(${u.walletAddress})`);
            this.addLog(`......${u.username} ${userWalletAddress}`);
            this.addLog(`.........checking if wallet is valid`);
            const isValidWallet = eth_worker_1.eth_worker.isValidAddress(userWalletAddress);
            if (!isValidWallet)
                this.addError(`wallet(${userWalletAddress}) of ${u.username} is not valid`);
            this.addLog(`.........checking if wallet has account created`);
            const acc = await this.get_account_by_wallet_address(userWalletAddress, `user(${u.username}).walletAddress(${userWalletAddress})`);
            if (typeof acc === "string") {
                this.addError(acc);
                continue;
            }
            this.addLog(`.........checking if user has multiple accounts`);
            if (acc.length > 1) {
                this.addError(`user(${u.username}) has multiple accounts with wallet ${userWalletAddress}`);
            }
        }
    }
    async check_accounts_with_valid_users() {
        console.log(`--------------------------------------------------`);
        console.log(`SEQUENCE INITIATED: ACCOUNT -> USER CHECK`);
        console.log(`--------------------------------------------------`);
        const accounts_with_valid_users = await this.get_accounts_with_user_ids();
        console.log(`...${accounts_with_valid_users.length} accounts with ids`);
        for (const acc of accounts_with_valid_users) {
            const owner = await this.get_user_by_id(acc.user_id, `acc(${acc.id}).user_id(${acc.user_id})`);
            if (typeof owner === "string") {
                this.addError(owner);
                continue;
            }
            this.addLog(`......check account_code(${acc.account_code}) matches user(${owner.username}).walletAddress`);
            if (acc.account_code !== owner.walletAddress) {
                this.addError(`account_code(${acc.account_code}) does not match user(${owner.username}).walletAddress(${owner.walletAddress})`);
            }
        }
    }
    async check_accounts_structure() {
        console.log(`--------------------------------------------------`);
        console.log(`SEQUENCE INITIATED: ACCOUNT STRUCTURE CHECK`);
        console.log(`--------------------------------------------------`);
        const accounts_with_valid_users = await this.get_accounts_with_user_ids();
        for (const acc of accounts_with_valid_users) {
            if (acc.sponsor_id <= 0)
                continue;
            const sponsor = await this.get_account_by_id(acc.sponsor_id, `account(${acc.id}).sponsor_id(${acc.sponsor_id})`);
            if (typeof sponsor === "string") {
                this.addError(sponsor);
                continue;
            }
            if (sponsor.id !== acc.sponsor_id) {
                this.addError(`account(${acc.id}).sponsor_id(${acc.sponsor_id}) does not match sponsor.id(${sponsor.id})`);
            }
            if (sponsor.account_code !== acc.sponsor_account_id) {
                this.addError(`account(${acc.id}).sponsor_account_id(${acc.sponsor_account_id}) does not match sponsor.account_code(${sponsor.account_code})`);
            }
            if (typeof sponsor.sponsor_dna !== "string") {
                this.addError(`sponsor(${acc.id}).sponsor_dna(${sponsor.sponsor_dna}) is not string`);
                continue;
            }
            if (typeof acc.sponsor_dna !== "string") {
                this.addError(`account(${acc.id}).sponsor_dna(${acc.sponsor_dna}) is not string`);
                continue;
            }
            const expected_sponsor_dna = sponsor.sponsor_dna + "_" + acc.id;
            if (acc.sponsor_dna !== expected_sponsor_dna) {
                this.addError(`account(${acc.id}).sponsor_dna(${acc.sponsor_dna}) does not match expected_sponsor_dna(${expected_sponsor_dna})`);
            }
        }
    }
    async check_staking_wallet() {
        console.log(`--------------------------------------------------`);
        console.log(`SEQUENCE INITIATED: CHECK STAKING WALLET`);
        console.log(`--------------------------------------------------`);
        const stakings = await this.get_ongoing_staking();
        console.log(`...${stakings.length} ongoing staking found`);
        for (const s of stakings) {
            const owner = await this.get_user_by_id(s.user_id, `staking(${s.id}).user_id(${s.user_id})`);
            if (typeof owner === "string") {
                this.addError(owner);
                continue;
            }
            if (s.user_wallet_address !== owner.walletAddress) {
                this.addError(`stake(${s.id}).user_wallet_address(${s.user_wallet_address}) does not match owner(${owner.username}).walletAddress(${owner.walletAddress})`);
            }
        }
    }
    async run_checks_v3() {
        try {
            const users = new user_1.user();
            await users.list(" WHERE 1 ", {});
            console.log(`checking ${users.count()} users...`);
            for (const u of users._dataList) {
                await this.check_user_duplicate_account(u);
                await this.check_user_with_duplicate_wallets_with_other_users(u);
                await this.check_user_account_wallet_match(u);
            }
            const accounts = new account_1.account();
            await accounts.list(" WHERE 1 ");
            console.log(`checking ${accounts.count()} accounts...`);
            for (const a of accounts._dataList) {
                await this.check_account_user_wallet_match(a);
                await this.check_upline_sponsor_relationship(a);
                await this.check_downline_sponsor_relationship(a);
            }
        }
        catch (e) {
            throw e;
        }
    }
    //region CHECKS
    async check_user_duplicate_account(u) {
        const accounts = await account_tools_1.account_tools.getAccountsByUserId(u.id);
        if (accounts.length > 1)
            throw new Error(`user(${u.username}) has multiple accounts`);
    }
    async check_user_with_duplicate_wallets_with_other_users(u) {
        const temp_usergroups = ["temp", "claimed"];
        if (user_tools_1.user_tools.hasWalletAddress(u) && !temp_usergroups.includes(u.usergroup.toLowerCase())) {
            const users = await user_tools_1.user_tools.getUsersByWalletAddress(u.walletAddress);
            let duplicate_user_wallets = 0;
            let duplicate_user_wallets_username = "";
            for (const u2 of users) {
                if (u2.id === u.id)
                    continue;
                if (temp_usergroups.includes(u2.usergroup.toLowerCase()))
                    continue;
                console.log(`${u2.username} ${u2.usergroup}`);
                duplicate_user_wallets++;
                duplicate_user_wallets_username = duplicate_user_wallets_username + " | " + u2.username;
            }
            if (duplicate_user_wallets > 0)
                throw new Error(`user(${u.username}) wallet_address has other users with same address. ${duplicate_user_wallets_username}`);
        }
    }
    async check_user_account_wallet_match(u) {
        const temp_usergroups = ["temp", "claimed"];
        if (user_tools_1.user_tools.hasWalletAddress(u) && !temp_usergroups.includes(u.usergroup)) {
            const accounts = await account_tools_1.account_tools.getAccountsByUserId(u.id);
            if (accounts.length === 0)
                throw new Error(`user(${u.username}) has no accounts`);
            const a = accounts[0];
            if (u.walletAddress?.toLowerCase() !== a.account_code?.toLowerCase())
                throw new Error(`user(${u.username}) wallet does not match account(${a.id})`);
        }
    }
    async check_account_user_wallet_match(a) {
        if (a.user_id === 0)
            return;
        const owner = await user_tools_1.user_tools.getUserStrict(a.user_id, `a(${a.id}).user_id(${a.user_id})`);
        if (!user_tools_1.user_tools.hasWalletAddress(owner))
            throw new Error(`owner(${owner.username}) of account(${a.id}) expected to have a wallet address`);
        if (owner.walletAddress?.toLowerCase() !== a.account_code?.toLowerCase())
            throw new Error(`account(${a.id}).account_code(${a.account_code}) does not match owner(${owner.username}).walletAddress(${owner.walletAddress})`);
    }
    async check_upline_sponsor_relationship(a) {
        const method = "check_upline_sponsor_relationship";
        let logs = [];
        try {
            if (a.sponsor_id <= 0)
                return;
            const upline = await account_tools_1.account_tools.getAccountStrict(a.sponsor_id, `${method}|a(${a.id}).sponsor_id(${a.sponsor_id})`);
            this.check_upline_downline_relationship(upline, a);
        }
        catch (e) {
            for (const l in logs)
                console.log(l);
            throw e;
        }
    }
    check_upline_downline_relationship(upline, downline) {
        // sponsor_account_id and upline.account_code must match
        if (upline.account_code?.toLowerCase() !== downline.sponsor_account_id?.toLowerCase())
            throw new Error(`downline(${downline.id}).sponsor_account_id does not match upline(${upline.id}).account_code`);
        // sponsor_dna must be related
        const expected_sponsor_dna = upline.sponsor_dna + "_" + downline.id;
        if (downline.sponsor_dna !== expected_sponsor_dna)
            throw new Error(`downline(${downline.id}).sponsor_dna(${downline.sponsor_dna}) expected to be ${expected_sponsor_dna}`);
        // sponsor_level must be +1 of upline sponsor_level
        const expected_sponsor_level = (upline.sponsor_level ?? 0) + 1;
        if (downline.sponsor_level !== expected_sponsor_level)
            throw new Error(`account(${downline.id}).sponsor_level(${downline.sponsor_level}) expected to be ${expected_sponsor_level}`);
    }
    async check_downline_sponsor_relationship(upline) {
        const downlines = await account_tools_1.account_tools.getAccountsBySponsorId(upline.id);
        for (const downline of downlines) {
            this.check_upline_downline_relationship(upline, downline);
        }
    }
    //endregion CHECKS
    // region GETTERS
    // ACCOUNTS
    async get_accounts_with_user_ids() {
        const accounts_with_user_ids = new account_1.account();
        await accounts_with_user_ids.list(` WHERE user_id > :zero `, { zero: 0 }, ` ORDER BY sponsor_level ASC, id ASC `);
        return accounts_with_user_ids._dataList;
    }
    async get_account_by_wallet_address(wallet_address, context) {
        if (typeof wallet_address !== "string")
            return `${context}|wallet_address must be string`;
        if (wallet_address === "")
            return `${context}|wallet_address must not be empty`;
        const account_by_wallet_address = new account_1.account();
        await account_by_wallet_address.list(` WHERE account_code = :wallet_address`, { wallet_address: wallet_address });
        if (account_by_wallet_address.count() === 0)
            return `${context}|no account found with wallet address ${wallet_address}`;
        return account_by_wallet_address._dataList;
    }
    async get_account_by_id(account_id, context) {
        if (typeof account_id !== "number")
            return `${context}|get_account_by_id.account_id must be number`;
        if (account_id <= 0)
            return `${context}|unable to retrieve account with account_id ${account_id}`;
        const account_by_id = new account_1.account();
        account_by_id.id = account_id;
        await account_by_id.fetch();
        if (account_by_id.isNew())
            return `${context}|account with account_id ${account_id} not found`;
        return account_by_id;
    }
    // USERS
    async get_users_with_wallet_address_not_empty() {
        const users_with_wallet_address = new user_1.user();
        await users_with_wallet_address.list(` WHERE walletAddress <> :empty `, { empty: "" });
        return users_with_wallet_address._dataList;
    }
    async get_user_by_id(user_id, context) {
        if (typeof user_id !== "number")
            return `${context}|get_user_by_id.user_id must be number`;
        if (user_id <= 0)
            return `${context}|unable to retrieve user with user_id ${user_id}`;
        const user_by_id = new user_1.user();
        user_by_id.id = user_id;
        await user_by_id.fetch();
        if (user_by_id.isNew())
            return `${context}|user with user_id ${user_id} not found`;
        return user_by_id;
    }
    async get_ongoing_staking() {
        const ongoing_staking = new staking_1.staking();
        await ongoing_staking.list(" WHERE status=:ongoing", { ongoing: "ongoing" });
        return ongoing_staking._dataList;
    }
    //endregion GETTERS
    //region UTILS
    addLog(msg) {
        if (this.verbose)
            console.log(msg);
    }
    addError(msg) {
        console.log(msg);
        this.error_logs.push(msg);
    }
    //endregion UTILS
    //region PATCH
    async run_all_patches() {
        await this.patch1();
        await this.patch2();
        await this.patch3();
        await this.patch4();
        await this.patch5();
        await this.patch6();
        await this.patch7();
        await this.patch8();
        await this.patch9();
        await this.patch10();
        await this.patch11();
        await this.patch12();
        await this.patch13();
        await this.patch14();
        await this.patch15();
        await this.patch16();
        await this.patch17();
        await this.patch18();
        await this.patch19();
        await this.patch20();
        await this.patch21();
        await this.patch22();
        await this.patch23();
        await this.patch24();
        await this.patch25();
        await this.patch26();
        await this.patch27();
        await this.patch28();
        await this.patch29();
        await this.patch30();
        await this.patch31();
        await this.patch32();
        await this.patch33();
        await this.patch34();
        await this.patch35();
        await this.patch36();
        await this.patch37();
        await this.patch38();
        await this.patch39();
    }
    async patch1() {
        console.log(`creating account for Christian06`);
        const u = await user_tools_1.user_tools.getUserStrict("Christian06");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch2() {
        console.log(`creating account for Dondon08`);
        const u = await user_tools_1.user_tools.getUserStrict("Dondon08");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch3() {
        console.log(`creating account for Joseph090976`);
        const u = await user_tools_1.user_tools.getUserStrict("Joseph090976");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch4() {
        console.log(`creating account for Ailyn`);
        const u = await user_tools_1.user_tools.getUserStrict("Ailyn");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch5() {
        console.log(`creating account for ajbelizar`);
        const u = await user_tools_1.user_tools.getUserStrict("ajbelizar");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch6() {
        console.log(`creating account for Wynne67`);
        const u = await user_tools_1.user_tools.getUserStrict("Wynne67");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch7() {
        console.log(`creating account for Caziavanya06`);
        const u = await user_tools_1.user_tools.getUserStrict("Caziavanya06");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch8() {
        console.log(`creating account for levy14`);
        const u = await user_tools_1.user_tools.getUserStrict("levy14");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch9() {
        console.log(`creating account for CjMinaCamp`);
        const u = await user_tools_1.user_tools.getUserStrict("CjMinaCamp");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch10() {
        console.log(`creating account for RomelEugenio20`);
        const u = await user_tools_1.user_tools.getUserStrict("RomelEugenio20");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch11() {
        console.log(`creating account for Clark190516`);
        const u = await user_tools_1.user_tools.getUserStrict("Clark190516");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch12() {
        console.log(`creating account for Betty01`);
        const u = await user_tools_1.user_tools.getUserStrict("Betty01");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch13() {
        console.log(`creating account for Glo310`);
        const u = await user_tools_1.user_tools.getUserStrict("Glo310");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch14() {
        console.log(`creating account for Donking`);
        const u = await user_tools_1.user_tools.getUserStrict("Donking");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch15() {
        console.log(`creating account for kilong`);
        const u = await user_tools_1.user_tools.getUserStrict("kilong");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch16() {
        console.log(`creating account for Jsoriano`);
        const u = await user_tools_1.user_tools.getUserStrict("Jsoriano");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch17() {
        console.log(`creating account for Ernan`);
        const u = await user_tools_1.user_tools.getUserStrict("Ernan");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch18() {
        console.log(`creating account for Gpenna`);
        const u = await user_tools_1.user_tools.getUserStrict("Gpenna");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch19() {
        console.log(`creating account for Battaliones`);
        const u = await user_tools_1.user_tools.getUserStrict("Battaliones");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch20() {
        console.log(`creating account for Ptrlito`);
        const u = await user_tools_1.user_tools.getUserStrict("Ptrlito");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch21() {
        console.log(`creating account for JamJewelsJ`);
        const u = await user_tools_1.user_tools.getUserStrict("JamJewelsJ");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch22() {
        console.log(`creating account for jolyenna`);
        const u = await user_tools_1.user_tools.getUserStrict("jolyenna");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch23() {
        console.log(`creating account for Azure01`);
        const u = await user_tools_1.user_tools.getUserStrict("Azure01");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch24() {
        console.log(`creating account for MariaAndrea`);
        const u = await user_tools_1.user_tools.getUserStrict("MariaAndrea");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch25() {
        console.log(`creating account for ArielAlfonso`);
        const u = await user_tools_1.user_tools.getUserStrict("ArielAlfonso");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch26() {
        console.log(`creating account for jfilarde`);
        const u = await user_tools_1.user_tools.getUserStrict("jfilarde");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch27() {
        console.log(`creating account for Lizzieboy`);
        const u = await user_tools_1.user_tools.getUserStrict("Lizzieboy");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch28() {
        console.log(`creating account for Boy01`);
        const u = await user_tools_1.user_tools.getUserStrict("Boy01");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch29() {
        console.log(`creating account for Nikahjones`);
        const u = await user_tools_1.user_tools.getUserStrict("Nikahjones");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch30() {
        console.log(`creating account for Nikki`);
        const u = await user_tools_1.user_tools.getUserStrict("Nikki");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch31() {
        console.log(`creating account for Niks`);
        const u = await user_tools_1.user_tools.getUserStrict("Niks");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch32() {
        console.log(`creating account for daluz1020`);
        const u = await user_tools_1.user_tools.getUserStrict("daluz1020");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch33() {
        console.log(`creating account for Nene06`);
        const u = await user_tools_1.user_tools.getUserStrict("Nene06");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch34() {
        console.log(`creating account for SOLID`);
        const u = await user_tools_1.user_tools.getUserStrict("SOLID");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch35() {
        console.log(`creating account for Ymbel92`);
        const u = await user_tools_1.user_tools.getUserStrict("Ymbel92");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch36() {
        console.log(`creating account for Ngng76`);
        const u = await user_tools_1.user_tools.getUserStrict("Ngng76");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch37() {
        console.log(`creating account for Poseidon08`);
        const u = await user_tools_1.user_tools.getUserStrict("Poseidon08");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch38() {
        console.log(`creating account for radsdesign`);
        const u = await user_tools_1.user_tools.getUserStrict("radsdesign");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
    async patch39() {
        console.log(`creating account for yoonhee26`);
        const u = await user_tools_1.user_tools.getUserStrict("yoonhee26");
        const a = await account_tools_1.account_tools.createAccountFromUser(u);
    }
}
exports.web3_startup_checks = web3_startup_checks;
if (process_1.argv.includes("run_web3_startup_checks")) {
    web3_startup_checks.run().finally();
}
if (process_1.argv.includes("run_structure_check")) {
    web3_startup_checks.structure_check().finally();
}
if (process_1.argv.includes("run_web3_startup_checks_test")) {
    const checks = new web3_startup_checks();
    if (process_1.argv.includes(`--verbose`))
        checks.verbose = true;
    // checks.structure_check_v2().finally(()=>{
    //     console.log(`total errors ${checks.error_logs.length}`);
    // });
    checks.run_checks_v3().finally(() => {
        console.log(`...checks completed`);
    });
}
if (process_1.argv.includes("run_web3_startup_checks_apply_patch")) {
    const checks = new web3_startup_checks();
    console.log(`applying patch...`);
    checks.run_all_patches().finally(() => {
        console.log(`...patch done`);
    });
}
//# sourceMappingURL=web3_startup_checks.js.map