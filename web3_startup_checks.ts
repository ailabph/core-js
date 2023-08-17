import {eth_config} from "./eth_config";
import {assert} from "./assert";
import {argv} from "process";
import {web3_token} from "./web3_token";
import {eth_worker} from "./eth_worker";
import {eth_contract_data_tools} from "./eth_contract_data_tools";
import {eth_receipt_logs_tools} from "./eth_receipt_logs_tools";
import {web3_pancake_router} from "./web3_pancake_router";
import {web3_pancake_pair} from "./web3_pancake_pair";
import {tools} from "./tools";
import {eth_log_sig} from "./build/eth_log_sig";
import {account} from "./build/account";
import {account_tools} from "./account_tools";
import {worker_sms} from "./worker_sms";
import {user} from "./build/user";
import {TIME_FORMATS, time_helper} from "./time_helper";
import {config} from "./config";
import {worker_email} from "./worker_email";

export class web3_startup_checks{

    public static async run(){
        console.log(`running checks for web3`);

        const testId = tools.generateRandomNumber(1000000,9999999);
        const currentTime = time_helper.getTime().format(TIME_FORMATS.READABLE);

        const admin = new user();
        admin.username = "admin";
        await admin.fetch();
        if(admin.isNew()) throw new Error(`unable to retrieve admin user for further tests`);

        const rpc = assert.stringNotEmpty(eth_config.getRPCUrl(),"getRPCUrl");
        console.log(`rpc:${rpc}`);

        //region BUSD
        const busdContract = assert.stringNotEmpty(eth_config.getBusdContract(),"getBusdContract");
        const busdSymbol = assert.stringNotEmpty(eth_config.getBusdSymbol(),"getBusdSymbol");
        const busdDecimal = assert.naturalNumber(eth_config.getBusdDecimal(),"getBusdDecimal");
        console.log(`checking busd contract`);
        const busdInfo = await eth_contract_data_tools.getContractViaAddress(busdContract);
        if(!busdInfo) throw new Error(`unable to retrieve busd contract on chain`);
        if(busdSymbol.toLowerCase() !== busdInfo.symbol.toLowerCase()) throw new Error(`config busd symbol(${busdSymbol}) does not match chain symbol(${busdInfo.symbol})`);
        if(busdDecimal !== assert.naturalNumber(busdInfo.decimals,"busd decimal")) throw new Error(`config busd Decimal(${busdDecimal}) does not match chain Decimal(${busdInfo.decimals})`);

        //endregion BUSD

        //region BNB
        const bnbContract = assert.stringNotEmpty(eth_config.getEthContract(),"getEthContract");
        const bnbSymbol = assert.stringNotEmpty(eth_config.getEthSymbol(),"getEthSymbol");
        const bnbDecimal = assert.naturalNumber(eth_config.getEthDecimal(),"getEthDecimal");
        console.log(`checking bnb contract`);
        const bnbInfo = await eth_contract_data_tools.getContractViaAddress(bnbContract);
        if(!bnbInfo) throw new Error(`unable to retrieve bnb contract on chain`);
        if(bnbSymbol.toLowerCase() !== bnbInfo.symbol.toLowerCase()) throw new Error(`config bnb symbol(${bnbSymbol}) does not match chain symbol(${bnbInfo.symbol})`);
        if(bnbDecimal !== assert.naturalNumber(bnbInfo.decimals,"bnb decimal")) throw new Error(`config bnb Decimal(${bnbDecimal}) does not match chain Decimal(${bnbInfo.decimals})`);
        //endregion BNB

        //region TRACKED TOKEN
        const tokenAddress = assert.stringNotEmpty(eth_config.getTokenContract(),"getTokenContract");
        const tokenSymbol = assert.stringNotEmpty(eth_config.getTokenSymbol(),"getTokenSymbol");
        const tokenDecimal = assert.naturalNumber(eth_config.getTokenDecimal(),"getTokenDecimal");
        console.log(`checking tracked token`);
        const tokenInfo = await eth_contract_data_tools.getContractViaAddress(tokenAddress);
        if(!tokenInfo) throw new Error(`unable to retrieve token info on chain`);
        if(tokenSymbol.toLowerCase() !== tokenInfo.symbol.toLowerCase()) throw new Error(`config token symbol(${tokenSymbol}) does not match chain symbol(${tokenInfo.symbol})`);
        if(tokenDecimal !== assert.naturalNumber(tokenInfo.decimals,"token decimal")) throw new Error(`config token Decimal(${tokenDecimal}) does not match chain Decimal(${tokenInfo.decimals})`);
        //endregion TRACKED TOKEN

        const genesisHash = assert.stringNotEmpty(eth_config.getTokenGenesisHash(),"getTokenGenesisHash");
        const genesisHashDb = await eth_worker.getDbTxnByHash(genesisHash);
        if(genesisHashDb.isNew()) throw new Error(`invalid genesis hash`);
        const genesisBlock = assert.naturalNumber(eth_config.getTokenGenesisBlock(),"getTokenGenesisBlock");
        if(assert.positiveNumber(genesisHashDb.blockNumber) !== genesisBlock)
            throw new Error(`genesis hash block number(${genesisHashDb.blockNumber}) does not match genesis block on config(${genesisBlock}) `);
        assert.stringNotEmpty(eth_config.getTokenOwner(),"getTokenOwner");

        assert.stringNotEmpty(eth_config.getDexContract(),"getDexContract");
        const factoryAddress = await web3_pancake_router.getFactory();
        const configFactoryAddress = assert.stringNotEmpty(eth_config.getPancakeFactoryContract(),"getPancakeFactoryContract");
        if(factoryAddress.toLowerCase() !== configFactoryAddress.toLowerCase())
            throw new Error(`chain factory address(${factoryAddress}) do not match config(${configFactoryAddress})`);

        const tokenBnbPairAddress = assert.stringNotEmpty(eth_config.getTokenBnbPairContract(),"getTokenBnbPairContract");
        // get token0, get token1
        const token0 = await web3_pancake_pair.token0Strict(tokenBnbPairAddress);
        const token1 = await web3_pancake_pair.token1Strict(tokenBnbPairAddress);
        const bnbTokenPair = [token0.toLowerCase(),token1.toLowerCase()];
        if(!bnbTokenPair.includes(bnbContract.toLowerCase())) throw new Error(`bnb not found in token bnb pair`);
        if(!bnbTokenPair.includes(tokenAddress.toLowerCase())) throw new Error(`token not found in token bnb pair`);
        //optional
        const tokenBusdPairAddress = eth_config.getTokenUsdPairContract();
        if(tools.isNotEmpty(tokenBusdPairAddress)){
            const tokenBusdToken0 = await web3_pancake_pair.token0Strict(tokenBusdPairAddress);
            const tokenBusdToken1 = await web3_pancake_pair.token1Strict(tokenBusdPairAddress);
            const busdTokenPair = [tokenBusdToken0.toLowerCase(),tokenBusdToken1.toLowerCase()];
            if(!busdTokenPair.includes(busdContract.toLowerCase())) throw new Error(`busd not found in token busd pair`);
            if(!busdTokenPair.includes(tokenAddress.toLowerCase())) throw new Error(`token not found in token busd pair`);
        }

        const bnbUsdPairAddress = assert.stringNotEmpty(eth_config.getBnbUsdPairContract(),"getBnbUsdPairContract");
        const bnbUsdToken0 = await web3_pancake_pair.token0Strict(bnbUsdPairAddress);
        const bnbUsdToken1 = await web3_pancake_pair.token1Strict(bnbUsdPairAddress);
        const bnbUsdPair = [bnbUsdToken0.toLowerCase(),bnbUsdToken1.toLowerCase()];
        if(!bnbUsdPair.includes(bnbContract.toLowerCase())) throw new Error(`bnb not found in bnb usd pair ${bnbUsdToken0} ${bnbUsdToken1}`);
        if(!bnbUsdPair.includes(busdContract.toLowerCase())) throw new Error(`busd not found in bnb usd pair ${bnbUsdToken0} ${bnbUsdToken1}`);

        const syncLogSig = assert.stringNotEmpty(eth_config.getSyncTopicSig(),"getSyncTopicSig");
        const syncLogSigDb = new eth_log_sig();
        syncLogSigDb.signature = syncLogSig.replace("0x","");
        await syncLogSigDb.fetch();
        if(syncLogSigDb.isNew()) throw new Error(`unable to retrieve sync log from signature collection`);

        assert.stringNotEmpty(eth_config.getHotWalletAddress(),"getHotWalletAddress");
        assert.stringNotEmpty(eth_config.getHotWalletKey(),"getHotWalletKey");

        assert.naturalNumber(eth_config.getGasMultiplier(),"getGasMultiplier");
        assert.naturalNumber(eth_config.getGasMultiplierForBnb(),"getGasMultiplierForBnb");
        assert.naturalNumber(eth_config.getConfirmationNeeded(),"getConfirmationNeeded");

        //region SPONSOR STRUCTURE
        await web3_startup_checks.structure_check();
        //endregion SPONSOR STRUCTURE

        //region HOT WALLET
        console.log(`checking hot wallet bnb balance`);
        const hotWalletBnb = await eth_worker.getETHBalance(eth_config.getHotWalletAddress());
        if(tools.lesserThanOrEqualTo(hotWalletBnb,"0.3000")) throw new Error(`hot wallet bnb balance is ${hotWalletBnb}, which is low`);
        console.log(`...hot wallet bnb balance is ${hotWalletBnb}`);

        console.log(`checking hot wallet token balance`);
        const hotWalletToken = await eth_worker.getTokenBalance(eth_config.getHotWalletAddress());
        if(tools.lesserThan(hotWalletToken,"1000000")) throw new Error(`hot wallet token balance is below 1M, currently ${hotWalletToken}`);
        console.log(`... hot wallet bnb balance is ${hotWalletToken}`);


        console.log(`checking sending of token`);
        const receiptToken = await web3_token.transfer(eth_config.getHotWalletAddress(),eth_config.getHotWalletKey(),admin.walletAddress??"","1");
        if(!receiptToken) throw new Error(`unable to transfer token`);
        console.log(`...send of token successful with hash ${receiptToken.transactionHash}`);

        // console.log(`checking sending of bnb`);
        const receiptBnb = await web3_token.sendBNB(eth_config.getHotWalletAddress(),eth_config.getHotWalletKey(),admin.walletAddress??"","0.0001");
        console.log(`...send of bnb successful with hash ${receiptBnb.transactionHash}`);

        //endregion HOT WALLET

        //region SMS
        console.log(`checking sms if working...`);
        const smsRes = await worker_sms.sendSms(
            assert.isNumericString(admin.contact,`admin.contact`),
            `sms check id ${testId} as of ${currentTime}`
        );
        if(typeof smsRes === "string")throw new Error(`...sms error ${smsRes}`);
        console.log(`...send successful`);
        const data = smsRes.data[0];
        if(data.sender_name !== config.getCustomOption("sender_name",true)) throw new Error(`sender name do not match`);
        //endregion SMS

        //region EMAIL
        console.log(`checking email...`);
        const emailRes = await worker_email.sendEmail(
            assert.stringNotEmpty(admin.email,`admin.email`),
            `Email Check Id ${testId}`,
            `as of ${currentTime}`
        );
        if(typeof emailRes === "string") throw new Error(`email send failed: ${emailRes}`);
        console.log(`...email send successful`);
        //endregion EMAIL

        console.log(`check complete`);
    }

    public static async structure_check(){
        const auto_fix = true;
        const allAccounts = new account();
        await allAccounts.list(" WHERE 1 ");
        console.log(`${allAccounts.count()} accounts found, checking sponsor structure integrity...`);
        let issuesFound = 0;
        for(const acc of allAccounts._dataList as account[]){
            if(typeof acc.user_id === "number" && acc.user_id > 0){
                const errorInfo = await account_tools.verifySponsorLineOfDownline(acc,auto_fix);
                if(typeof errorInfo === "string"){
                    issuesFound++;
                    console.log(`...INVALID ${errorInfo}`);
                }
            }
            else{
                console.log(`...Skipping, account ${acc.id} has invalid user_id ${acc.user_id}`);
            }
        }
        console.log(`...sponsor structure issues found:${issuesFound}`);
        if(issuesFound > 0) throw new Error(`...sponsor structure issues found:${issuesFound}. auto_fix:${tools.convertBoolToYesNo(auto_fix)}`);
    }
}

if(argv.includes("run_web3_startup_checks")){
    web3_startup_checks.run().finally();
}
if(argv.includes("run_structure_check")){
    web3_startup_checks.structure_check().finally();
}