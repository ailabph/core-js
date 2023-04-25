

import {argv} from "process";
import {request_queue} from "./build/request_queue";
import {connection} from "./connection";
import {eth_worker} from "./eth_worker";
import {tools} from "./tools";
import {time_helper} from "./time_helper";
import {web3_token} from "./web3_token";
import {eth_config} from "./eth_config";
import {web3_tools} from "./web3_tools";
import {assert} from "./assert";
import {meta_options_tools} from "./meta_options_tools";
import {eth_token_balance} from "./build/eth_token_balance";
import readline from "readline";
import {eth_token_balance_header} from "./build/eth_token_balance_header";
import {user} from "./build/user";
import {web3_rpc_web3} from "./web3_rpc_web3";

export class worker_request{

    private static batchLimit:number = 10;

    public static async run(){
        await meta_options_tools.updateOnlineStatus(`worker_request`);
        let requests = new request_queue();
        await requests.list(" WHERE status=:open ",{open:"o"},` ORDER BY id ASC LIMIT ${this.batchLimit} `);
        if(requests.count()>0) console.log(`total request found:${requests.count()}`);
        for(const request of requests._dataList as request_queue[]){
            try{
                if (typeof request.data_for !== "string") throw new Error("data_for is empty");
                console.log(`processing request ${request.hash} type ${request.type} for ${request.data_for} `);
                if (request.type === "wallet_token_balance") {
                    request.data_result = await eth_worker.getTokenBalance(request.data_for);
                }
                if (request.type === "wallet_eth_balance") {
                    request.data_result = await eth_worker.getETHBalance(request.data_for);
                }
                if (request.type === "wallet_busd_balance") {
                    request.data_result = await web3_token.getBalanceOf(eth_config.getBusdContract(),request.data_for);
                }
                if (request.type === "is_wallet_address") {
                    const isWalletAddress = await web3_tools.isWalletAddress(request.data_for);
                    request.data_result = isWalletAddress ? "y" : "n";
                }
                if(request.type === "manual_activation"){
                    const isActivated = await worker_request.manualActivation(request.data_for);
                    request.data_result = isActivated ? "y" : "n";
                }
                if(request.type === "get_trade_wallet"){
                   const walletAddress = await worker_request.getTradeWallet(request.data_for);
                   request.data_result = walletAddress ? walletAddress : "n";
                }
                console.log(`--result:${request.data_result}`);
                request.status = "d";
                request.time_processed = time_helper.getCurrentTimeStamp();
                await request.save();
                await tools.sleep(150);
            }catch (e){
                if(e instanceof Error){
                    console.log(`ERROR request(${request.id}) ${e.message}`);
                }
                request.status = "e";
                request.time_processed = time_helper.getCurrentTimeStamp();
                await request.save();
            }
        }
        setImmediate(()=>{
            worker_request.run().finally();
        });
    }

    public static async manualActivation(target_wallet:string|null):Promise<boolean>{
        // check if token_balance worker is online
        const worker_token_balance_online_status = await meta_options_tools.isOnline(`worker_token_balance`);
        if(!worker_token_balance_online_status) throw new Error(`worker_token_balance is not online`);

        const wallet_address = assert.stringNotEmpty(target_wallet,`target_wallet`);
        console.log(`sending 1 token to ${wallet_address}...`);
        await web3_tools.isWalletAddress(wallet_address);
        const receiptToken = await web3_token.transfer(eth_config.getHotWalletAddress(),eth_config.getHotWalletKey(),wallet_address,"1");
        if(!receiptToken) throw new Error(`failed to send 1 token to ${wallet_address}`);
        console.log(`... hash ${receiptToken.transactionHash}`);

        const token_balance = await worker_request.retrieveTokenBalanceRecord(receiptToken.transactionHash,wallet_address);
        if(token_balance){
            console.log(`token balance found id ${token_balance.id}`);
            console.log(`manually activating address`);
            token_balance.activation_amount = await eth_worker.getTokenBalance(wallet_address);
            token_balance.activation_status = "y";
            token_balance.activation_data = "manual activation";
            await token_balance.save();

            const token_balance_header = new eth_token_balance_header();
            token_balance_header.address = wallet_address;
            await token_balance_header.fetch();
            token_balance_header.activation_status = "y";
            token_balance_header.minimum_balance = token_balance.activation_amount;
            token_balance_header.activation_count++;
            token_balance_header.last_activated_transaction = token_balance.transactionHash;
            await token_balance_header.save();
            console.log(`successfully activated account`);
            return true;
        }
        else{
            console.log(`token balance not found`);
            return false;
        }
    }

    public static async getTradeWallet(username:string):Promise<string|false>{
        console.log(`retrieving trade wallet for user ${username}`);
        assert.stringNotEmpty(username,`username(${username})`);
        if(tools.isEmpty(username) || tools.isNullish(username)){
            console.log(`...username is not valid`);
            return false;
        }
        let tradeWalletAddress = "";
        const userCheck = new user();
        userCheck.username = username;
        await userCheck.fetch();
        if(userCheck.isNew()){
            console.log(`...user does not exist on db`);
            return false;
        }
        if(tools.isEmpty(userCheck.trading_wallet) || tools.isNullish(userCheck.trading_wallet_key)){
            console.log(`...user has not trading wallet yet, creating one`);
            const web3 = web3_rpc_web3.getWeb3Client();
            const account = web3.eth.accounts.create();
            console.log(`...wallet address created: ${account.address}`);
            console.log(`...private key: ${account.privateKey.slice(-6)}`);
            userCheck.trading_wallet = account.address;
            userCheck.trading_wallet_key = account.privateKey;
            await userCheck.save();
            console.log(`...saved on user db`);
            tradeWalletAddress = account.address;
        }
        else{
            tradeWalletAddress = assert.stringNotEmpty(userCheck.trading_wallet);
        }
        console.log(`...trade wallet address: ${tradeWalletAddress}`);
        return assert.stringNotEmpty(tradeWalletAddress);
    }

    private static token_balance_retry_limit = 20;
    private static retry_seconds = 5;
    private static async retrieveTokenBalanceRecord(transaction_hash:string, from_address:string, retryCount:number = 0):Promise<eth_token_balance|false>{
        console.log(`retrieving token balance of hash ${transaction_hash} from address ${from_address} retryCount ${retryCount}`);
        const token_balance = new eth_token_balance();
        token_balance.transactionHash = transaction_hash;
        token_balance.address = from_address;
        await token_balance.fetch();
        if(token_balance.recordExists()) {
            console.log(`token_balance found`);
            return token_balance;
        }
        retryCount++;
        if(retryCount > worker_request.token_balance_retry_limit){
            console.log(`limit reached. unable to retrieve token_balance detail`);
            return false;
        }
        console.log(`retrying in ${this.retry_seconds} seconds`);
        await tools.sleep(worker_request.retry_seconds * 1000);
        return worker_request.retrieveTokenBalanceRecord(transaction_hash,from_address,retryCount);
    }
}

if(argv.includes("run_worker_request")){
    console.log(`running worker to process web3 requests on the side`);
    worker_request.run().finally();
}

(async()=>{
    if(argv.includes("run_manualActivation")){
        console.log(`running function manualActivation`);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        let target_wallet = await new Promise<string>(resolve => {
            rl.question(`target wallet address: `, (name: string | PromiseLike<string>) => {
                resolve(name);
            });
        });
        console.log(`target wallet: ${target_wallet}`);
        await worker_request.manualActivation(target_wallet).finally();
    }
})();
