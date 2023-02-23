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

export class web3_startup_checks{

    public static async run(){
        console.log(`running checks for web3`);

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
        //endregion

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
        assert.naturalNumber(eth_config.getConfirmationNeeded(),"getConfirmationNeeded");

        console.log(`check complete`);
    }

}

if(argv.includes("run_web3_check")){

    web3_startup_checks.run().finally();

}