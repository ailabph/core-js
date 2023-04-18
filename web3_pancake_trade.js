"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.web3_pancake_trade = void 0;
const eth_config_1 = require("./eth_config");
const assert_1 = require("./assert");
const eth_worker_1 = require("./eth_worker");
const web3_rpc_web3_1 = require("./web3_rpc_web3");
const tools_1 = require("./tools");
const config_1 = require("./config");
const web3_log_decoder_1 = require("./web3_log_decoder");
const web3_tools_1 = require("./web3_tools");
class web3_pancake_trade {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`web3_pancake_trade|${method}|${msg}`);
            if (end)
                console.log(`web3_pancake_trade|${method}|${tools_1.tools.LINE}`);
        }
    }
    //region TRADE
    static async buyTokensFromExactBnb(bnb_amount, slippage = 3.5) {
        const method = "buyTokensFromExactBnb";
        bnb_amount = tools_1.tools.parseNumber(bnb_amount, `bnb_amount(${bnb_amount})`, true);
        this.log(`purchasing tokens with bnb: ${bnb_amount}`, method, false, true);
        const web3 = web3_rpc_web3_1.web3_rpc_web3.getWeb3Client();
        const account = web3.eth.accounts.privateKeyToAccount(eth_config_1.eth_config.getHotWalletKey());
        const routerContract = new web3.eth.Contract(eth_config_1.eth_config.getDexAbi(), eth_config_1.eth_config.getDexContract());
        try {
            const amountIn = eth_worker_1.eth_worker.convertEthToValue(bnb_amount);
            const path = [eth_config_1.eth_config.getEthContract(), eth_config_1.eth_config.getTokenContract()];
            const to = eth_config_1.eth_config.getHotWalletAddress();
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            const amounts = await routerContract.methods.getAmountsOut(amountIn, path).call();
            const tokenOutAmount = amounts[1];
            let percValue = tools_1.tools.divide(slippage, 100, 6);
            percValue = tools_1.tools.deduct(1, percValue);
            const tokenOutMinAmount = tools_1.tools.multiply(percValue, tokenOutAmount, 0);
            // const tokenOutMinAmount = (1 - slippage / 100) * tokenOutAmount;
            this.log(`tokenOutAmount: ${tokenOutAmount} after slippage(${slippage}): ${tokenOutMinAmount}`, method, false, true);
            const swapData = routerContract.methods.swapExactETHForTokens(tokenOutMinAmount.toString(), path, to, deadline).encodeABI();
            this.log(`estimating gas...`, method, false, true);
            let estimateGas = await web3.eth.estimateGas({
                from: account.address,
                to: eth_config_1.eth_config.getDexContract(),
                value: amountIn,
                data: swapData
            });
            const gasPrice = await web3.eth.getGasPrice();
            this.log(`estimated gas ${estimateGas} gasPrice ${gasPrice}`, method, false, true);
            const _nonce = await web3.eth.getTransactionCount(eth_config_1.eth_config.getHotWalletAddress());
            this.log(`nonce: ${_nonce}`, method, false, true);
            const swapTransaction = {
                nonce: _nonce,
                from: account.address,
                to: eth_config_1.eth_config.getDexContract(),
                gas: estimateGas,
                gasPrice: gasPrice,
                value: amountIn,
                data: swapData,
            };
            this.log(`signing transaction and swapping...`, method, false, true);
            const signedSwapTx = await web3.eth.accounts.signTransaction(swapTransaction, eth_config_1.eth_config.getHotWalletKey());
            signedSwapTx.rawTransaction = assert_1.assert.stringNotEmpty(signedSwapTx.rawTransaction, `signedSwapTx.rawTransaction`);
            const swapReceipt = await web3.eth.sendSignedTransaction(signedSwapTx.rawTransaction);
            this.log(`swap tx receipt hash ${swapReceipt.transactionHash}`, method, false, true);
            return swapReceipt;
        }
        catch (e) {
            if (!(e instanceof Error))
                throw e;
            this.log(`ERROR ${e.message}`, method, false, true);
            return e.message;
        }
    }
    static async sellExactTokenForBnb(tokenAmount, slippage = 3.5, wallet = "", key = "") {
        const method = "sellExactTokenForBnb";
        const web3 = web3_rpc_web3_1.web3_rpc_web3.getWeb3Client();
        if (tools_1.tools.isEmpty(wallet))
            wallet = eth_config_1.eth_config.getHotWalletAddress();
        if (tools_1.tools.isEmpty(key))
            key = eth_config_1.eth_config.getHotWalletKey();
        const account = web3.eth.accounts.privateKeyToAccount(key);
        console.log(`selling from wallet ${account.address}`);
        const routerAddress = eth_config_1.eth_config.getDexContract();
        const tokenInAddress = eth_config_1.eth_config.getTokenContract();
        const routerContract = new web3.eth.Contract(eth_config_1.eth_config.getDexAbi(), routerAddress);
        const tokenInContract = new web3.eth.Contract(eth_config_1.eth_config.getTokenAbi(), tokenInAddress);
        const amountIn = eth_worker_1.eth_worker.convertTokenToValue(tokenAmount);
        const path = [tokenInAddress, eth_config_1.eth_config.getEthContract()];
        let percValue = tools_1.tools.divide(slippage, 100, 6);
        percValue = tools_1.tools.deduct(1, percValue);
        const amounts = await routerContract.methods.getAmountsOut(amountIn, path).call();
        const bnbOutAmount = amounts[1];
        const amountsOutMin = tools_1.tools.multiply(percValue, bnbOutAmount, 0);
        this.log(`bnbOutAmount: ${bnbOutAmount} with slippage(${slippage}): ${amountsOutMin}`, method, false, true);
        const to = account.address;
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        try {
            this.log(`approving transaction...`, method, false, true);
            const approveData = tokenInContract.methods.approve(routerAddress, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').encodeABI();
            const approveTransaction = {
                from: account.address,
                to: tokenInAddress,
                gas: 200000,
                data: approveData,
            };
            const signedApproveTx = await web3.eth.accounts.signTransaction(approveTransaction, key);
            signedApproveTx.rawTransaction = assert_1.assert.stringNotEmpty(signedApproveTx.rawTransaction, `signedApproveTx.rawTransaction`);
            const approveReceipt = await web3.eth.sendSignedTransaction(signedApproveTx.rawTransaction);
            this.log(`approval receipt hash ${approveReceipt.transactionHash}`, method, false, true);
            this.log(`estimating gas...`, method, false, true);
            const swapData = routerContract.methods.swapExactTokensForETH(amountIn, amountsOutMin, path, to, deadline).encodeABI();
            let estimateGas = await web3.eth.estimateGas({
                from: account.address,
                to: routerAddress,
                data: swapData
            });
            const gasPrice = await web3.eth.getGasPrice();
            this.log(`estimated gas ${estimateGas} gasPrice ${gasPrice}`, method, false, true);
            const _nonce = await web3.eth.getTransactionCount(wallet);
            this.log(`nonce: ${_nonce}`, method, false, true);
            this.log(`executing swap sell...`, method, false, true);
            const swapTransaction = {
                nonce: _nonce,
                from: account.address,
                to: routerAddress,
                data: swapData,
                gas: estimateGas,
                gasPrice: gasPrice,
            };
            const signedSwapTx = await web3.eth.accounts.signTransaction(swapTransaction, key);
            signedSwapTx.rawTransaction = assert_1.assert.stringNotEmpty(signedSwapTx.rawTransaction, `signedSwapTx.rawTransaction`);
            const swapReceipt = await web3.eth.sendSignedTransaction(signedSwapTx.rawTransaction);
            this.log(`swap tx receipt hash ${swapReceipt.transactionHash}`, method, false, true);
            return swapReceipt;
        }
        catch (e) {
            if (!(e instanceof Error))
                throw e;
            this.log(`ERROR ${e.message}`, method, false, true);
            return e.message;
        }
    }
    //endregion TRADE
    //region UTILITY
    static async getReceivedTokenFromSwap(txn_hash, receiver) {
        const method = "getReceivedTokenFromSwap";
        const isWalletAddress = await web3_tools_1.web3_tools.isWalletAddress(receiver);
        if (!isWalletAddress)
            throw new Error(`${method} ${receiver} is not a wallet address`);
        const receipt = await eth_worker_1.eth_worker.getReceiptByTxnHashWeb3(txn_hash);
        this.log(`${receipt.logs.length} logs found in ${txn_hash}`, method, false, true);
        let amountReceived = "0";
        for (const log of receipt.logs) {
            const decodedLog = await web3_log_decoder_1.web3_log_decoder.decodeLog(log);
            this.log(`logIndex ${log.logIndex} method ${decodedLog.method_name} ${decodedLog.ContractInfo.name}`, method, false, true);
            const decodedTransfer = await web3_log_decoder_1.web3_log_decoder.getTransferLog(log);
            if (decodedTransfer
                && decodedTransfer.ContractInfo.address.toLowerCase() === eth_config_1.eth_config.getTokenContract().toLowerCase()
                && decodedTransfer.to.toLowerCase() === receiver.toLowerCase()) {
                console.log(`...value: ${decodedTransfer.value}`);
                amountReceived = eth_worker_1.eth_worker.convertValueToToken(decodedTransfer.value.toString());
                console.log(`...amount: ${amountReceived}`);
                console.log(`...to: ${decodedTransfer.to}`);
            }
        }
        if (amountReceived === "0")
            throw new Error(`${method}|unable to retrieve token received from swap`);
        return amountReceived;
    }
    //endregion UTILITY
    static async sellTokenForBnb(tokenAmount, wallet, key, slippage = 3.5) {
        const web3 = web3_rpc_web3_1.web3_rpc_web3.getWeb3Client();
        const account = web3.eth.accounts.privateKeyToAccount(key);
        console.log(`setting up router and token contract`);
        const routerContract = new web3.eth.Contract(eth_config_1.eth_config.getDexAbi(), eth_config_1.eth_config.getDexContract());
        const tokenContract = new web3.eth.Contract(eth_config_1.eth_config.getTokenAbi(), eth_config_1.eth_config.getTokenContract());
        const amountIn = web3.utils.toWei(tokenAmount.toString(), 'ether');
        const approveAmount = web3.utils.toWei((parseFloat(tokenAmount.toString()) * 1.2).toString(), // 20% higher than tokenAmount
        'ether');
        console.log(`converting tokenAmount ${tokenAmount} to amountIn ${amountIn}`);
        const path = [eth_config_1.eth_config.getTokenContract(), eth_config_1.eth_config.getEthContract()];
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        // Approve spending of tokens
        console.log(`approving transaction`);
        const approveData = tokenContract.methods
            .approve(eth_config_1.eth_config.getDexContract(), approveAmount)
            .encodeABI();
        const approveTransaction = {
            from: wallet,
            to: eth_config_1.eth_config.getTokenContract(),
            gas: 200000,
            data: approveData,
        };
        const signedApproveTx = await web3.eth.accounts.signTransaction(approveTransaction, key);
        console.log(`sending signed transaction for approval`);
        const receipt = await web3.eth.sendSignedTransaction(signedApproveTx.rawTransaction);
        console.log(`approved, receipt ${receipt.transactionHash}`);
        // Estimate received BNB amount
        console.log(`estimated bnb out amount`);
        const amountsOut = await routerContract.methods
            .getAmountsOut(amountIn, path)
            .call();
        const bnbOutAmount = amountsOut[1];
        console.log(`bnb out amount ${bnbOutAmount}`);
        // Calculate minimum BNB amount based on slippage
        const minBnbAmount = web3.utils.toBN(bnbOutAmount).mul(web3.utils.toBN((1 - slippage / 100) * 1e6)).div(web3.utils.toBN(1e6));
        // Execute token swap
        const gasPrice = await web3.eth.getGasPrice();
        console.log(`executing swap`);
        const swapData = routerContract.methods
            .swapExactTokensForETH(amountIn, minBnbAmount, path, wallet, deadline)
            .encodeABI();
        const swapTransaction = {
            from: wallet,
            to: eth_config_1.eth_config.getDexContract(),
            gas: 200000,
            gasPrice: gasPrice,
            data: swapData,
        };
        console.log(`signing swap transaction`);
        const signedSwapTx = await web3.eth.accounts.signTransaction(swapTransaction, key);
        console.log(`sending signed swap transaction`);
        const swapReceipt = await web3.eth.sendSignedTransaction(signedSwapTx.rawTransaction);
        console.log(`swap successful, receipt ${swapReceipt.transactionHash}, bnb received ${web3.utils.fromWei(bnbOutAmount, 'ether')}`);
        return {
            txHash: swapReceipt.transactionHash,
            bnbReceived: web3.utils.fromWei(bnbOutAmount, 'ether'),
        };
    }
    static async getTokenAllowance(tokenAddress, tokenABI, walletAddress, spenderAddress) {
        const web3 = web3_rpc_web3_1.web3_rpc_web3.getWeb3Client();
        const tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);
        const allowance = await tokenContract.methods
            .allowance(walletAddress, spenderAddress)
            .call();
        const allowanceInTokens = web3.utils.fromWei(allowance, 'ether');
        console.log(`Allowance for ${spenderAddress}: ${allowanceInTokens} tokens`);
        return allowanceInTokens;
    }
}
exports.web3_pancake_trade = web3_pancake_trade;
//# sourceMappingURL=web3_pancake_trade.js.map