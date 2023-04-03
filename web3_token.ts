import {config} from "./config";
import {eth_config} from "./eth_config";
import {eth_rpc} from "./eth_rpc";
import {tools} from "./tools";
import {Contract} from "ethers";
import {web3_rpc_web3} from "./web3_rpc_web3";
import {web3_tools} from "./web3_tools";
import {assert} from "./assert";
import {eth_worker} from "./eth_worker";
import {TransactionReceipt} from "web3-eth/types";

export class web3_token{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`web3_token|${method}|${msg}`);
            if(end) console.log(`web3_token|${method}|${tools.LINE}`);
        }
    }
    private static initContract(address:string):Contract{
        return eth_rpc.getEtherContract(address,eth_config.getTokenAbi());
    }

    //region READ
    public static async genericFunctionCallNoArgs<T>(contract_address:string, function_name:string, strict:boolean=false):Promise<T|false>{
        const method = "genericFunctionCallNoArgs";
        this.log(`calling function ${function_name} on contract ${contract_address}`,method);

        try{
            return await this.initContract(contract_address)[function_name]() as T;
        }catch (e) {
            this.log(`ERROR: unable to call function ${function_name} from contract ${contract_address}`,`callFunctionWithNoArgument:${function_name}`,false,false);
            if(strict){
                if(e instanceof Error) throw new web3_token_error(e.message);
                throw e;
            }
            return false;
        }
    }
    public static async getName(contract_address:string,strict:boolean=false):Promise<string|false>{
        const method = "getName";
        this.log(`retrieving token name of ${contract_address}`,method);
        return this.genericFunctionCallNoArgs<string>(contract_address,"name",strict);
    }
    public static async getSymbol(contract_address:string,strict:boolean=false):Promise<string|false>{
        const method = "getSymbol";
        this.log(`retrieving token symbol of ${contract_address}`,method);
        return this.genericFunctionCallNoArgs<string>(contract_address,"symbol");
    }
    public static async getDecimals(contract_address:string,strict:boolean=false):Promise<bigint|false>{
        const method = "getDecimals";
        this.log(`retrieving token decimals of ${contract_address}`,method);
        return this.genericFunctionCallNoArgs<bigint>(contract_address,"decimals",strict);
    }

    public static async getNameWeb3(contract_address:string,strict:boolean=false):Promise<string|false>{
        const method = "getNameWeb3";
        this.log(`retrieving name of contract ${contract_address}`,method);
        const contract = web3_rpc_web3.getWeb3Contract(contract_address,[
            {
                "constant": true,
                "inputs": [],
                "name": "name",
                "outputs": [
                    {
                        "internalType": "string",
                        "name": "",
                        "type": "string"
                    }
                ],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            }
        ]);
        try{
            const name = await contract.methods.name().call();
            this.log(`... name: ${name}`,method);
            return name;
        }
        catch (e){
            this.log(`ERROR, unable to retrieve name`,method);
            if(strict) throw e;
            return false;
        }
    }
    public static async getSymbolWeb3(contract_address:string,strict:boolean=false):Promise<string|false>{
        const method = "getSymbolWeb3";
        this.log(`retrieving symbol of contract ${contract_address}`,method);
        const contract = web3_rpc_web3.getWeb3Contract(contract_address,[
            {
                "constant": true,
                "inputs": [],
                "name": "symbol",
                "outputs": [
                    {
                        "internalType": "string",
                        "name": "",
                        "type": "string"
                    }
                ],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            }
        ]);
        try{
            const symbol = await contract.methods.symbol().call();
            this.log(`... symbol: ${symbol}`,method);
            return symbol;
        }
        catch (e){
            this.log(`ERROR, unable to retrieve symbol`,method);
            if(strict) throw e;
            return false;
        }
    }
    public static async getDecimalsWeb3(contract_address:string,strict:boolean=false):Promise<bigint|false>{
        const method = "getDecimalsWeb3";
        this.log(`retrieving decimals of contract ${contract_address}`,method);
        const contract = web3_rpc_web3.getWeb3Contract(contract_address,[
            {
                "constant": true,
                "inputs": [],
                "name": "decimals",
                "outputs": [
                    {
                        "internalType": "uint8",
                        "name": "",
                        "type": "uint8"
                    }
                ],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            }
        ]);
        try{
            const decimals = await contract.methods.decimals().call();
            this.log(`... decimals: ${decimals}`,method);
            return decimals;
        }
        catch (e){
            this.log(`ERROR, unable to retrieve symbol`,method);
            if(strict) throw e;
            return false;
        }
    }
    public static async getBalanceOf(contract_address:string,wallet_address:string):Promise<string>{
        const method = "getBalanceOf";
        if(!await web3_tools.isContractAddress(contract_address)) throw new Error(`${method} contract_address(${contract_address}) is not a valid contract`);
        if(!await web3_tools.isWalletAddress(wallet_address)) throw new Error(`${method} wallet_address(${wallet_address}) is not a valid wallet address`);
        const balanceABI = [
            {
                constant: true,
                inputs: [
                    {
                        name: '_owner',
                        type: 'address',
                    },
                ],
                name: 'balanceOf',
                outputs: [
                    {
                        name: 'balance',
                        type: 'uint256',
                    },
                ],
                type: 'function',
            },
        ];
        const contract = web3_rpc_web3.getWeb3Contract(contract_address,balanceABI);
        try{
            let balance:string = await contract.methods.balanceOf(wallet_address).call();
            assert.isNumericString(balance,`${method} balance(${balance})`);
            return balance;
        }catch (e){
            if(e instanceof Error){
                this.log(`ERROR ${e.message}`,method,false,true);
            }
            throw e;
        }
    }
    //endregion READ

    //region CHECKS

    //endregion CHECKS

    //region WRITE
    public static async transfer(fromAddress:string, privateKey:string,toAddress:string,tokenAmount:string,gasMultiplier:number=0):Promise<TransactionReceipt|false>{
        const method = "transfer";
        this.log(`transferring ${tokenAmount} from ${fromAddress} to ${toAddress}`,method,false,true);

        if(gasMultiplier <= 0) gasMultiplier = eth_config.getGasMultiplier();
        gasMultiplier = assert.positiveInt(gasMultiplier,`${method} gasMultiplier`);

        const fromAddressIsWallet = await web3_tools.isWalletAddress(fromAddress);
        if(!fromAddressIsWallet) throw new Error(`${method}| fromAddress ${fromAddress} is not detected as a wallet`);
        assert.stringNotEmpty(privateKey,`${method} privateKey`);

        const toAddressIsWallet = await web3_tools.isWalletAddress(toAddress);
        if(!toAddressIsWallet) throw new Error(`${method}| toAddress ${toAddress} is not detected as a wallet`);
        assert.isNumericString(tokenAmount,`${method} tokenAmount`, 0);

        this.log(`...all wallets seem to be valid`,method,false,true);

        const web3 = web3_rpc_web3.getWeb3Client();
        const contract = web3_rpc_web3.getWeb3Contract(eth_config.getTokenContract(),eth_config.getTokenAbi());

        const nonce = await web3.eth.getTransactionCount(fromAddress);
        this.log(`...transaction count of ${fromAddress} is ${nonce}`,method,false,true);

        const gasPrice = await web3.eth.getGasPrice();
        this.log(`...current gas price is ${gasPrice}`,method,false,true);

        this.log(`...encoding transfer ABI`,method,false,true);
        const tokenValue = eth_worker.convertTokenToValue(tokenAmount);
        const txData = contract.methods.transfer(toAddress,tokenValue).encodeABI();

        this.log(`...estimating gas required`,method,false,true);
        const gasLimit = await web3.eth.estimateGas({from:fromAddress,to:toAddress, data:txData});
        this.log(`...estimated gas limit ${gasLimit}`,method,false,true);
        const adjustedGasLimit = tools.parseIntSimple(tools.multiply(gasLimit,gasMultiplier,0));
        this.log(`...adjusted gas limit ${adjustedGasLimit}`,method,false,true);

        const rawTx: any = {
            nonce: nonce,
            gasPrice: gasPrice,
            gasLimit: adjustedGasLimit,
            from: fromAddress,
            to: eth_config.getTokenContract(),
            value: "0x0",
            data: txData
        };

        this.log(`...signing transaction`,method,false,true);
        const signedTx = await web3.eth.accounts.signTransaction(rawTx, privateKey);
        if(signedTx.rawTransaction === undefined) throw new Error(`${method}| unable to sign transaction fromAddress ${fromAddress} to contract ${eth_config.getTokenContract()}`);
        this.log(`...sending signed transaction`,method,false,true);

        try{
            const transactionReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            this.log(`...result`,method,false,true);
            this.log(`......transactionHash ${transactionReceipt.transactionHash}`,method,false,true);
            this.log(`......blockNumber ${transactionReceipt.blockNumber}`,method,false,true);
            this.log(`......gasUsed ${transactionReceipt.gasUsed}`,method,false,true);
            this.log(`......logs ${transactionReceipt.logs.length}`,method,false,true);
            this.log(`......status ${transactionReceipt.status?"success":"failed"}`,method,false,true);
            return transactionReceipt;
        }catch (e){
            const errorMessage = e instanceof Error ? e.message : "unknown error";
            this.log(`...send failed: ${errorMessage}`,method,false,true);
            this.log(`...skipping`,method,false,true);
            const waitForSeconds = 4;
            await tools.sleep(waitForSeconds * 1000);
            return false;
            
            // if(errorMessage.indexOf("replacement transaction underpriced") >= 0){
            //     const waitForSeconds = 4;
            //     this.log(`...seems something wrong with the nonce, waiting for ${waitForSeconds} seconds before retrying`,method,false,true);
            //     await tools.sleep(waitForSeconds * 1000);
            //     return this.transfer(fromAddress,privateKey,toAddress,tokenAmount,gasMultiplier);
            // }
            // else{
            //     const newGasMultiplier = gasMultiplier + 1;
            //     this.log(`...failed to send, attempting to resend with increase of gas multiplier from ${gasMultiplier} to ${newGasMultiplier}`,method,false,true);
            //     return this.transfer(fromAddress,privateKey,toAddress,tokenAmount,newGasMultiplier);
            // }
        }
    }
    public static async sendBNB(fromAddress: string, privateKey: string, toAddress: string, amount_to_send: string, gasMultiplier:number=0):Promise<TransactionReceipt>{
        const method = "sendBNB";
        this.log(`transferring bnb ${amount_to_send} from ${fromAddress} to ${toAddress}`,method,false,true);

        if(gasMultiplier <= 0) gasMultiplier = eth_config.getGasMultiplierForBnb();
        gasMultiplier = assert.positiveInt(gasMultiplier,`${method} gasMultiplier`);

        const fromAddressIsWallet = await web3_tools.isWalletAddress(fromAddress);
        if(!fromAddressIsWallet) throw new Error(`${method}| fromAddress ${fromAddress} is not detected as a wallet`);
        assert.stringNotEmpty(privateKey,`${method} privateKey`);

        const toAddressIsWallet = await web3_tools.isWalletAddress(toAddress);
        if(!toAddressIsWallet) throw new Error(`${method}| toAddress ${toAddress} is not detected as a wallet`);
        assert.isNumericString(amount_to_send,`${method} amount_to_send`, 0);
        const value_to_send = eth_worker.convertEthToValue(amount_to_send);

        this.log(`...all wallets seem to be valid`,method,false,true);

        const web3 = web3_rpc_web3.getWeb3Client();
        const nonce = await web3.eth.getTransactionCount(fromAddress);
        this.log(`...transaction count of ${fromAddress} is ${nonce}`,method,false,true);

        this.log(`...estimating gas for this bnb transfer`,method,false,true);
        const gasLimit = await web3.eth.estimateGas({value:value_to_send, to:toAddress, from:fromAddress });
        this.log(`...estimated gas is ${gasLimit}`,method,false,true);
        const adjustedGasLimit = gasLimit * 2;
        this.log(`...adjusted gas limit is ${adjustedGasLimit}`,method,false,true);

        const gasPrice = await web3.eth.getGasPrice();
        this.log(`...current gas price is ${gasPrice}`,method,false,true);


        const rawTx: any = {
            nonce: nonce,
            gas:adjustedGasLimit,
            gasPrice: gasPrice,
            from: fromAddress,
            to: toAddress,
            value: value_to_send,
        };

        this.log(`...signing transaction`,method,false,true);
        const signedTx = await web3.eth.accounts.signTransaction(rawTx, privateKey);
        if(signedTx.rawTransaction === undefined) throw new Error(`${method}| unable to sign transaction fromAddress ${fromAddress} to contract ${eth_config.getTokenContract()}`);
        this.log(`...sending signed transaction`,method,false,true);

        try{
            const transactionReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            this.log(`...result`,method,false,true);
            this.log(`......transactionHash ${transactionReceipt.transactionHash}`,method,false,true);
            this.log(`......blockNumber ${transactionReceipt.blockNumber}`,method,false,true);
            this.log(`......gasUsed ${transactionReceipt.gasUsed}`,method,false,true);
            this.log(`......logs ${transactionReceipt.logs.length}`,method,false,true);
            this.log(`......status ${transactionReceipt.status?"success":"failed"}`,method,false,true);
            return transactionReceipt;
        }catch (e){
            const errorMessage = e instanceof Error ? e.message : "unknown error";
            if(errorMessage.indexOf("replacement transaction underpriced") >= 0){
                const waitForSeconds = 4;
                this.log(`...seems something wrong with the nonce, waiting for ${waitForSeconds} seconds before retrying`,method,false,true);
                await tools.sleep(waitForSeconds * 1000);
                return this.sendBNB(fromAddress,privateKey,toAddress,amount_to_send,gasMultiplier);
            }
            else{
                const newGasMultiplier = gasMultiplier + 1;
                this.log(`...failed to send, attempting to resend with increase of gas multiplier from ${gasMultiplier} to ${newGasMultiplier}`,method,false,true);
                return this.sendBNB(fromAddress,privateKey,toAddress,amount_to_send,newGasMultiplier);
            }
        }
    }
    //endregion
}

class web3_token_error extends Error{
    constructor(message:string) {
        super(message);
    }
}