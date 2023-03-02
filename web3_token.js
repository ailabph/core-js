"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.web3_token = void 0;
const config_1 = require("./config");
const eth_config_1 = require("./eth_config");
const eth_rpc_1 = require("./eth_rpc");
const tools_1 = require("./tools");
const web3_rpc_web3_1 = require("./web3_rpc_web3");
const web3_tools_1 = require("./web3_tools");
const assert_1 = require("./assert");
const eth_worker_1 = require("./eth_worker");
class web3_token {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`web3_token|${method}|${msg}`);
            if (end)
                console.log(`web3_token|${method}|${tools_1.tools.LINE}`);
        }
    }
    static initContract(address) {
        return eth_rpc_1.eth_rpc.getEtherContract(address, eth_config_1.eth_config.getTokenAbi());
    }
    //region READ
    static async genericFunctionCallNoArgs(contract_address, function_name, strict = false) {
        const method = "genericFunctionCallNoArgs";
        this.log(`calling function ${function_name} on contract ${contract_address}`, method);
        try {
            return await this.initContract(contract_address)[function_name]();
        }
        catch (e) {
            this.log(`ERROR: unable to call function ${function_name} from contract ${contract_address}`, `callFunctionWithNoArgument:${function_name}`, false, false);
            if (strict) {
                if (e instanceof Error)
                    throw new web3_token_error(e.message);
                throw e;
            }
            return false;
        }
    }
    static async getName(contract_address, strict = false) {
        const method = "getName";
        this.log(`retrieving token name of ${contract_address}`, method);
        return this.genericFunctionCallNoArgs(contract_address, "name", strict);
    }
    static async getSymbol(contract_address, strict = false) {
        const method = "getSymbol";
        this.log(`retrieving token symbol of ${contract_address}`, method);
        return this.genericFunctionCallNoArgs(contract_address, "symbol");
    }
    static async getDecimals(contract_address, strict = false) {
        const method = "getDecimals";
        this.log(`retrieving token decimals of ${contract_address}`, method);
        return this.genericFunctionCallNoArgs(contract_address, "decimals", strict);
    }
    static async getNameWeb3(contract_address, strict = false) {
        const method = "getNameWeb3";
        this.log(`retrieving name of contract ${contract_address}`, method);
        const contract = web3_rpc_web3_1.web3_rpc_web3.getWeb3Contract(contract_address, [
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
        try {
            const name = await contract.methods.name().call();
            this.log(`... name: ${name}`, method);
            return name;
        }
        catch (e) {
            this.log(`ERROR, unable to retrieve name`, method);
            if (strict)
                throw e;
            return false;
        }
    }
    static async getSymbolWeb3(contract_address, strict = false) {
        const method = "getSymbolWeb3";
        this.log(`retrieving symbol of contract ${contract_address}`, method);
        const contract = web3_rpc_web3_1.web3_rpc_web3.getWeb3Contract(contract_address, [
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
        try {
            const symbol = await contract.methods.symbol().call();
            this.log(`... symbol: ${symbol}`, method);
            return symbol;
        }
        catch (e) {
            this.log(`ERROR, unable to retrieve symbol`, method);
            if (strict)
                throw e;
            return false;
        }
    }
    static async getDecimalsWeb3(contract_address, strict = false) {
        const method = "getDecimalsWeb3";
        this.log(`retrieving decimals of contract ${contract_address}`, method);
        const contract = web3_rpc_web3_1.web3_rpc_web3.getWeb3Contract(contract_address, [
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
        try {
            const decimals = await contract.methods.decimals().call();
            this.log(`... decimals: ${decimals}`, method);
            return decimals;
        }
        catch (e) {
            this.log(`ERROR, unable to retrieve symbol`, method);
            if (strict)
                throw e;
            return false;
        }
    }
    //endregion READ
    //region CHECKS
    //endregion CHECKS
    //region WRITE
    static async transfer(fromAddress, privateKey, toAddress, tokenAmount, gasMultiplier = 0) {
        const method = "transfer";
        this.log(`transferring ${tokenAmount} from ${fromAddress} to ${toAddress}`, method, false, true);
        if (gasMultiplier <= 0)
            gasMultiplier = eth_config_1.eth_config.getGasMultiplier();
        gasMultiplier = assert_1.assert.positiveInt(gasMultiplier, `${method} gasMultiplier`);
        const fromAddressIsWallet = await web3_tools_1.web3_tools.isWalletAddress(fromAddress);
        if (!fromAddressIsWallet)
            throw new Error(`${method}| fromAddress ${fromAddress} is not detected as a wallet`);
        assert_1.assert.stringNotEmpty(privateKey, `${method} privateKey`);
        const toAddressIsWallet = await web3_tools_1.web3_tools.isWalletAddress(toAddress);
        if (!toAddressIsWallet)
            throw new Error(`${method}| toAddress ${toAddress} is not detected as a wallet`);
        assert_1.assert.isNumericString(tokenAmount, `${method} tokenAmount`, 0);
        this.log(`...all wallets seem to be valid`, method, false, true);
        const web3 = web3_rpc_web3_1.web3_rpc_web3.getWeb3Client();
        const contract = web3_rpc_web3_1.web3_rpc_web3.getWeb3Contract(eth_config_1.eth_config.getTokenContract(), eth_config_1.eth_config.getTokenAbi());
        const nonce = await web3.eth.getTransactionCount(fromAddress);
        this.log(`...transaction count of ${fromAddress} is ${nonce}`, method, false, true);
        const gasPrice = await web3.eth.getGasPrice();
        this.log(`...current gas price is ${gasPrice}`, method, false, true);
        this.log(`...encoding transfer ABI`, method, false, true);
        const tokenValue = eth_worker_1.eth_worker.convertTokenToValue(tokenAmount);
        const txData = contract.methods.transfer(toAddress, tokenValue).encodeABI();
        this.log(`...estimating gas required`, method, false, true);
        const gasLimit = await web3.eth.estimateGas({ from: fromAddress, to: toAddress, data: txData });
        this.log(`...estimated gas limit ${gasLimit}`, method, false, true);
        const adjustedGasLimit = tools_1.tools.parseIntSimple(tools_1.tools.multiply(gasLimit, gasMultiplier, 0));
        this.log(`...adjusted gas limit ${adjustedGasLimit}`, method, false, true);
        const rawTx = {
            nonce: nonce,
            gasPrice: gasPrice,
            gasLimit: adjustedGasLimit,
            from: fromAddress,
            to: eth_config_1.eth_config.getTokenContract(),
            value: "0x0",
            data: txData
        };
        this.log(`...signing transaction`, method, false, true);
        const signedTx = await web3.eth.accounts.signTransaction(rawTx, privateKey);
        if (signedTx.rawTransaction === undefined)
            throw new Error(`${method}| unable to sign transaction fromAddress ${fromAddress} to contract ${eth_config_1.eth_config.getTokenContract()}`);
        this.log(`...sending signed transaction`, method, false, true);
        try {
            const transactionReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            this.log(`...result`, method, false, true);
            this.log(`......transactionHash ${transactionReceipt.transactionHash}`, method, false, true);
            this.log(`......blockNumber ${transactionReceipt.blockNumber}`, method, false, true);
            this.log(`......gasUsed ${transactionReceipt.gasUsed}`, method, false, true);
            this.log(`......logs ${transactionReceipt.logs.length}`, method, false, true);
            this.log(`......status ${transactionReceipt.status ? "success" : "failed"}`, method, false, true);
            return transactionReceipt;
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : "unknown error";
            this.log(`...send failed: ${errorMessage}`, method, false, true);
            this.log(`...skipping`, method, false, true);
            const waitForSeconds = 4;
            await tools_1.tools.sleep(waitForSeconds * 1000);
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
    static async sendBNB(fromAddress, privateKey, toAddress, amount_to_send, gasMultiplier = 0) {
        const method = "sendBNB";
        this.log(`transferring bnb ${amount_to_send} from ${fromAddress} to ${toAddress}`, method, false, true);
        if (gasMultiplier <= 0)
            gasMultiplier = eth_config_1.eth_config.getGasMultiplierForBnb();
        gasMultiplier = assert_1.assert.positiveInt(gasMultiplier, `${method} gasMultiplier`);
        const fromAddressIsWallet = await web3_tools_1.web3_tools.isWalletAddress(fromAddress);
        if (!fromAddressIsWallet)
            throw new Error(`${method}| fromAddress ${fromAddress} is not detected as a wallet`);
        assert_1.assert.stringNotEmpty(privateKey, `${method} privateKey`);
        const toAddressIsWallet = await web3_tools_1.web3_tools.isWalletAddress(toAddress);
        if (!toAddressIsWallet)
            throw new Error(`${method}| toAddress ${toAddress} is not detected as a wallet`);
        assert_1.assert.isNumericString(amount_to_send, `${method} amount_to_send`, 0);
        const value_to_send = eth_worker_1.eth_worker.convertEthToValue(amount_to_send);
        this.log(`...all wallets seem to be valid`, method, false, true);
        const web3 = web3_rpc_web3_1.web3_rpc_web3.getWeb3Client();
        const nonce = await web3.eth.getTransactionCount(fromAddress);
        this.log(`...transaction count of ${fromAddress} is ${nonce}`, method, false, true);
        this.log(`...estimating gas for this bnb transfer`, method, false, true);
        const gasLimit = await web3.eth.estimateGas({ value: value_to_send, to: toAddress, from: fromAddress });
        this.log(`...estimated gas is ${gasLimit}`, method, false, true);
        const adjustedGasLimit = gasLimit * 2;
        this.log(`...adjusted gas limit is ${adjustedGasLimit}`, method, false, true);
        const gasPrice = await web3.eth.getGasPrice();
        this.log(`...current gas price is ${gasPrice}`, method, false, true);
        const rawTx = {
            nonce: nonce,
            gas: adjustedGasLimit,
            gasPrice: gasPrice,
            from: fromAddress,
            to: toAddress,
            value: value_to_send,
        };
        this.log(`...signing transaction`, method, false, true);
        const signedTx = await web3.eth.accounts.signTransaction(rawTx, privateKey);
        if (signedTx.rawTransaction === undefined)
            throw new Error(`${method}| unable to sign transaction fromAddress ${fromAddress} to contract ${eth_config_1.eth_config.getTokenContract()}`);
        this.log(`...sending signed transaction`, method, false, true);
        try {
            const transactionReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            this.log(`...result`, method, false, true);
            this.log(`......transactionHash ${transactionReceipt.transactionHash}`, method, false, true);
            this.log(`......blockNumber ${transactionReceipt.blockNumber}`, method, false, true);
            this.log(`......gasUsed ${transactionReceipt.gasUsed}`, method, false, true);
            this.log(`......logs ${transactionReceipt.logs.length}`, method, false, true);
            this.log(`......status ${transactionReceipt.status ? "success" : "failed"}`, method, false, true);
            return transactionReceipt;
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : "unknown error";
            if (errorMessage.indexOf("replacement transaction underpriced") >= 0) {
                const waitForSeconds = 4;
                this.log(`...seems something wrong with the nonce, waiting for ${waitForSeconds} seconds before retrying`, method, false, true);
                await tools_1.tools.sleep(waitForSeconds * 1000);
                return this.sendBNB(fromAddress, privateKey, toAddress, amount_to_send, gasMultiplier);
            }
            else {
                const newGasMultiplier = gasMultiplier + 1;
                this.log(`...failed to send, attempting to resend with increase of gas multiplier from ${gasMultiplier} to ${newGasMultiplier}`, method, false, true);
                return this.sendBNB(fromAddress, privateKey, toAddress, amount_to_send, newGasMultiplier);
            }
        }
    }
}
exports.web3_token = web3_token;
class web3_token_error extends Error {
    constructor(message) {
        super(message);
    }
}
//# sourceMappingURL=web3_token.js.map