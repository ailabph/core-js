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
class web3_startup_checks {
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
        const auto_fix = true;
        const allAccounts = new account_1.account();
        await allAccounts.list(" WHERE 1 ");
        console.log(`${allAccounts.count()} accounts found, checking sponsor structure integrity...`);
        let issuesFound = 0;
        for (const acc of allAccounts._dataList) {
            const errorInfo = await account_tools_1.account_tools.verifySponsorLineOfDownline(acc, auto_fix);
            if (typeof errorInfo === "string") {
                issuesFound++;
                console.log(`...INVALID ${errorInfo}`);
            }
        }
        console.log(`...sponsor structure issues found:${issuesFound}`);
        if (issuesFound > 0)
            throw new Error(`...sponsor structure issues found:${issuesFound}. auto_fix:${tools_1.tools.convertBoolToYesNo(auto_fix)}`);
        //endregion SPONSOR STRUCTURE
        //region HOT WALLET
        console.log(`checking hot wallet bnb balance`);
        const hotWalletBnb = await eth_worker_1.eth_worker.getETHBalance(eth_config_1.eth_config.getHotWalletAddress());
        if (tools_1.tools.lesserThanOrEqualTo(hotWalletBnb, 0))
            throw new Error(`hot wallet bnb balance is ${hotWalletBnb}`);
        console.log(`...hot wallet bnb balance is ${hotWalletBnb}`);
        console.log(`checking hot wallet token balance`);
        const hotWalletToken = await eth_worker_1.eth_worker.getTokenBalance(eth_config_1.eth_config.getHotWalletAddress());
        if (tools_1.tools.lesserThan(hotWalletToken, "1000000"))
            throw new Error(`hot wallet token balance is below 1M, currently ${hotWalletToken}`);
        console.log(`... hot wallet bnb balance is ${hotWalletToken}`);
        console.log(`checking sending of token`);
        const receiptToken = await web3_token_1.web3_token.transfer(eth_config_1.eth_config.getHotWalletAddress(), eth_config_1.eth_config.getHotWalletKey(), admin.walletAddress ?? "", "1");
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
}
exports.web3_startup_checks = web3_startup_checks;
if (process_1.argv.includes("run_web3_startup_checks")) {
    web3_startup_checks.run().finally();
}
//# sourceMappingURL=web3_startup_checks.js.map