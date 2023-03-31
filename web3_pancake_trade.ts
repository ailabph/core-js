import {TransactionReceipt} from "web3-eth";
import {eth_config} from "./eth_config";
import Web3 from "web3";
import {assert} from "./assert";
import {eth_worker} from "./eth_worker";
import {web3_rpc_web3} from "./web3_rpc_web3";
import {tools} from "./tools";
import {config} from "./config";
import {web3_abi_decoder} from "./web3_abi_decoder";
import {web3_log_decoder} from "./web3_log_decoder";
import {web3_tools} from "./web3_tools";

export class web3_pancake_trade{
    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`web3_pancake_trade|${method}|${msg}`);
            if(end) console.log(`web3_pancake_trade|${method}|${tools.LINE}`);
        }
    }

    //region TRADE
    public static async buyTokenFromExactBnb2(bnb_amount:number|string): Promise<TransactionReceipt|string> {
        const method = "swapExactETHForTokens";
        bnb_amount = tools.parseNumber(bnb_amount,`${method}|bnb_amount(${bnb_amount})`,true);
        assert.isNumber(bnb_amount,`${method}|bnb_amount(${bnb_amount})`,0);

        const Web3Client = web3_rpc_web3.getWeb3Client();
        this.log(`swapping ${bnb_amount} BNB for ${eth_config.getTokenSymbol()}`,method,false,true);

        const bnb_value = eth_worker.convertEthToValue(bnb_amount);

        this.log(`encoding swapExactETHForTokens data`,method,false,true);
        const dex_contract = await new Web3Client.eth.Contract(eth_config.getDexAbi(), eth_config.getDexContract());
        let data = dex_contract.methods.swapExactETHForTokens(
            bnb_value,
            [eth_config.getEthContract(), eth_config.getTokenContract()],
            eth_config.getHotWalletAddress(),
            Web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 20)
        ).encodeABI();

        let _nonce = await Web3Client.eth.getTransactionCount(eth_config.getHotWalletAddress());
        this.log(`estimating gas ${bnb_value}`,method,false,true);
        let estimateGas = await Web3Client.eth.estimateGas({
            value: bnb_value
            , data: data
            , to: eth_config.getDexContract()
            , from: eth_config.getHotWalletAddress()
        });
        this.log(`estimated gas ${bnb_value} nonce ${_nonce}, signing transaction`,method,false,true);
        const signedTransaction = await Web3Client.eth.accounts.signTransaction({
            nonce: _nonce,
            data: data,
            to: eth_config.getDexContract(),
            value: bnb_value,
            gas: estimateGas,
            gasPrice: await Web3Client.eth.getGasPrice(),
        }, eth_config.getHotWalletKey());

        this.log(`executing swap`,method,false,true);
        assert.notEmpty(signedTransaction.rawTransaction);
        try{
            const result = await Web3Client.eth.sendSignedTransaction(signedTransaction.rawTransaction as string);
            this.log(`receipt received hash ${result.transactionHash} block ${result.blockNumber}, retrieving transaction`,method,false,true);
            const txn = await eth_worker.getTxnByHashWeb3(result.transactionHash);
            const decodedInput = web3_abi_decoder.decodeAbiObject(txn.input);
            const decodedSwap = web3_abi_decoder.getSwapExactETHForTokens(decodedInput);
            if(!decodedSwap){
                throw new Error(`unable to decode swapExactETHForTokens from input of ${result.transactionHash}`);
            }

            return result;
        }catch (e) {
            if(!(e instanceof Error)) throw e;
            this.log(`ERROR ${e.message}`,method,false,true);
            return e.message;
        }
    }

    public static async buyTokensFromExactBnb(bnb_amount:number|string, slippage:number = 3.5):Promise<TransactionReceipt|string>{
        const method = "buyTokensFromExactBnb";
        bnb_amount = tools.parseNumber(bnb_amount,`bnb_amount(${bnb_amount})`,true);
        this.log(`purchasing tokens with bnb: ${bnb_amount}`,method,false,true);

        const web3 = web3_rpc_web3.getWeb3Client();
        const account = web3.eth.accounts.privateKeyToAccount(eth_config.getHotWalletKey());
        const routerContract = new web3.eth.Contract(eth_config.getDexAbi(),eth_config.getDexContract());
        try{
            const amountIn = eth_worker.convertEthToValue(bnb_amount);
            const path = [eth_config.getEthContract(),eth_config.getTokenContract()];
            const to = eth_config.getHotWalletAddress();
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

            const amounts = await routerContract.methods.getAmountsOut(amountIn, path).call();
            const tokenOutAmount = amounts[1];
            let percValue = tools.divide(slippage,100,6);
            percValue = tools.deduct(1,percValue);
            const tokenOutMinAmount = tools.multiply(percValue,tokenOutAmount,0);
            // const tokenOutMinAmount = (1 - slippage / 100) * tokenOutAmount;
            this.log(`tokenOutAmount: ${tokenOutAmount} after slippage(${slippage}): ${tokenOutMinAmount}`,method,false,true);

            const swapData = routerContract.methods.swapExactETHForTokens(tokenOutMinAmount.toString(), path, to, deadline).encodeABI();
            this.log(`estimating gas...`,method,false,true);
            let estimateGas = await web3.eth.estimateGas({
                from: account.address,
                to: eth_config.getDexContract(),
                value: amountIn,
                data: swapData
            });
            const gasPrice = await web3.eth.getGasPrice()
            this.log(`estimated gas ${estimateGas} gasPrice ${gasPrice}`,method,false,true);

            const _nonce = await web3.eth.getTransactionCount(eth_config.getHotWalletAddress());
            this.log(`nonce: ${_nonce}`,method,false,true);

            const swapTransaction = {
                nonce: _nonce,
                from: account.address,
                to: eth_config.getDexContract(),
                gas: estimateGas,
                gasPrice: gasPrice,
                value: amountIn,
                data: swapData,
            };

            this.log(`signing transaction and swapping...`,method,false,true);
            const signedSwapTx = await web3.eth.accounts.signTransaction(swapTransaction, eth_config.getHotWalletKey());
            signedSwapTx.rawTransaction = assert.stringNotEmpty(signedSwapTx.rawTransaction,`signedSwapTx.rawTransaction`);
            const swapReceipt = await web3.eth.sendSignedTransaction(signedSwapTx.rawTransaction);
            this.log(`swap tx receipt hash ${swapReceipt.transactionHash}`,method,false,true);
            return swapReceipt;
        }catch (e){
            if(!(e instanceof Error)) throw e;
            this.log(`ERROR ${e.message}`,method,false,true);
            return e.message;
        }
    }

    public static async sellExactTokenForBnb(tokenAmount:number|string, slippage:number = 3.5):Promise<TransactionReceipt|string>{
        const method = "sellExactTokenForBnb";
        const web3 = web3_rpc_web3.getWeb3Client();
        const account = web3.eth.accounts.privateKeyToAccount(eth_config.getHotWalletKey());
        const routerAddress = eth_config.getDexContract();
        const tokenInAddress = eth_config.getTokenContract();
        const routerContract = new web3.eth.Contract(eth_config.getDexAbi(),routerAddress);
        const tokenInContract = new web3.eth.Contract(eth_config.getTokenAbi(),tokenInAddress);
        const amountIn = eth_worker.convertTokenToValue(tokenAmount);
        const path = [tokenInAddress, eth_config.getEthContract()];
        let percValue = tools.divide(slippage,100,6);
        percValue = tools.deduct(1,percValue);
        const amounts = await routerContract.methods.getAmountsOut(amountIn, path).call();
        const bnbOutAmount = amounts[1];
        const amountsOutMin = tools.multiply(percValue,bnbOutAmount,0);
        this.log(`bnbOutAmount: ${bnbOutAmount} with slippage(${slippage}): ${amountsOutMin}`,method,false,true);

        const to = account.address;
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        try{
            this.log(`approving transaction...`,method,false,true);
            const approveData = tokenInContract.methods.approve(routerAddress, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').encodeABI();
            const approveTransaction = {
                from: account.address,
                to: tokenInAddress,
                gas: 200000,
                data: approveData,
            };
            const signedApproveTx = await web3.eth.accounts.signTransaction(approveTransaction, eth_config.getHotWalletKey());
            signedApproveTx.rawTransaction = assert.stringNotEmpty(signedApproveTx.rawTransaction,`signedApproveTx.rawTransaction`);
            const approveReceipt = await web3.eth.sendSignedTransaction(signedApproveTx.rawTransaction);
            this.log(`approval receipt hash ${approveReceipt.transactionHash}`,method,false,true);

            this.log(`estimating gas...`,method,false,true);
            const swapData = routerContract.methods.swapExactTokensForETH(amountIn, amountsOutMin, path, to, deadline).encodeABI();
            let estimateGas = await web3.eth.estimateGas({
                from: account.address,
                to: routerAddress,
                data: swapData
            });
            const gasPrice = await web3.eth.getGasPrice()
            this.log(`estimated gas ${estimateGas} gasPrice ${gasPrice}`,method,false,true);

            const _nonce = await web3.eth.getTransactionCount(eth_config.getHotWalletAddress());
            this.log(`nonce: ${_nonce}`,method,false,true);

            this.log(`executing swap sell...`,method,false,true);
            const swapTransaction = {
                nonce: _nonce,
                from: account.address,
                to: routerAddress,
                data: swapData,
                gas: estimateGas,
                gasPrice: gasPrice,
            };
            const signedSwapTx = await web3.eth.accounts.signTransaction(swapTransaction, eth_config.getHotWalletKey());
            signedSwapTx.rawTransaction = assert.stringNotEmpty(signedSwapTx.rawTransaction,`signedSwapTx.rawTransaction`);
            const swapReceipt = await web3.eth.sendSignedTransaction(signedSwapTx.rawTransaction);
            this.log(`swap tx receipt hash ${swapReceipt.transactionHash}`,method,false,true);
            return swapReceipt;
        }catch (e) {
            if(!(e instanceof Error)) throw e;
            this.log(`ERROR ${e.message}`,method,false,true);
            return e.message;
        }
    }
    //endregion TRADE

    //region UTILITY
    public static async getReceivedTokenFromSwap(txn_hash:string,receiver:string):Promise<string> {
        const method = "getReceivedTokenFromSwap";
        const isWalletAddress = await web3_tools.isWalletAddress(receiver);
        if (!isWalletAddress) throw new Error(`${method} ${receiver} is not a wallet address`);
        const receipt = await eth_worker.getReceiptByTxnHashWeb3(txn_hash);
        this.log(`${receipt.logs.length} logs found in ${txn_hash}`, method, false, true);
        let amountReceived = "0";
        for (const log of receipt.logs) {
            const decodedLog = await web3_log_decoder.decodeLog(log);
            this.log(`logIndex ${log.logIndex} method ${decodedLog.method_name} ${decodedLog.ContractInfo.name}`, method, false, true);
            const decodedTransfer = await web3_log_decoder.getTransferLog(log);
            if (
                decodedTransfer
                && decodedTransfer.ContractInfo.address.toLowerCase() === eth_config.getTokenContract().toLowerCase()
                && decodedTransfer.to.toLowerCase() === receiver.toLowerCase()
            ) {
                console.log(`...value: ${decodedTransfer.value}`);
                amountReceived = eth_worker.convertValueToToken(decodedTransfer.value.toString());
                console.log(`...amount: ${amountReceived}`);
                console.log(`...to: ${decodedTransfer.to}`);
            }
        }
        if (amountReceived === "0") throw new Error(`${method}|unable to retrieve token received from swap`);
        return amountReceived;
    }
    //endregion UTILITY

}