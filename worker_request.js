"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_request = void 0;
const process_1 = require("process");
const request_queue_1 = require("./build/request_queue");
const eth_worker_1 = require("./eth_worker");
const tools_1 = require("./tools");
const time_helper_1 = require("./time_helper");
const web3_token_1 = require("./web3_token");
const eth_config_1 = require("./eth_config");
const web3_tools_1 = require("./web3_tools");
const assert_1 = require("./assert");
const meta_options_tools_1 = require("./meta_options_tools");
const eth_token_balance_1 = require("./build/eth_token_balance");
const readline_1 = __importDefault(require("readline"));
const eth_token_balance_header_1 = require("./build/eth_token_balance_header");
const user_1 = require("./build/user");
const web3_rpc_web3_1 = require("./web3_rpc_web3");
const user_tools_1 = require("./user_tools");
const eth_token_balance_tools_1 = require("./eth_token_balance_tools");
class worker_request {
    static async run() {
        await meta_options_tools_1.meta_options_tools.updateOnlineStatus(`worker_request`);
        let requests = new request_queue_1.request_queue();
        await requests.list(" WHERE status=:open ", { open: "o" }, ` ORDER BY id ASC LIMIT ${this.batchLimit} `);
        if (requests.count() > 0)
            console.log(`total request found:${requests.count()}`);
        for (const request of requests._dataList) {
            try {
                if (typeof request.data_for !== "string")
                    throw new Error("data_for is empty");
                console.log(`processing request ${request.hash} type ${request.type} for ${request.data_for} `);
                if (request.type === "wallet_token_balance") {
                    request.data_result = await eth_worker_1.eth_worker.getTokenBalance(request.data_for);
                }
                if (request.type === "wallet_eth_balance") {
                    request.data_result = await eth_worker_1.eth_worker.getETHBalance(request.data_for);
                }
                if (request.type === "wallet_busd_balance") {
                    request.data_result = await web3_token_1.web3_token.getBalanceOf(eth_config_1.eth_config.getBusdContract(), request.data_for);
                }
                if (request.type === "is_wallet_address") {
                    const isWalletAddress = await web3_tools_1.web3_tools.isWalletAddress(request.data_for);
                    request.data_result = isWalletAddress ? "y" : "n";
                }
                if (request.type === "manual_activation") {
                    const isActivated = await worker_request.manualActivation(request.data_for);
                    request.data_result = isActivated ? "y" : "n";
                }
                if (request.type === "get_trade_wallet") {
                    const walletAddress = await worker_request.getTradeWallet(request.data_for);
                    request.data_result = walletAddress ? walletAddress : "n";
                }
                // implement manual_activation_yacht
                if (request.type === "manual_activation_yacht") {
                    request.data_result = await worker_request.manualActivationYacht(request.data_for, request.data_input);
                }
                // implement manual_activation_bot
                if (request.type === "manual_activation_bot") {
                    request.data_result = await worker_request.manualActivationTradeBot(request.data_for, request.data_input);
                }
                console.log(`--result:${request.data_result}`);
                request.status = "d";
                request.time_processed = time_helper_1.time_helper.getCurrentTimeStamp();
                await request.save();
                await tools_1.tools.sleep(150);
            }
            catch (e) {
                if (e instanceof Error) {
                    console.log(`ERROR request(${request.id}) ${e.message}`);
                }
                request.status = "e";
                request.time_processed = time_helper_1.time_helper.getCurrentTimeStamp();
                await request.save();
            }
        }
        setImmediate(() => {
            worker_request.run().finally();
        });
    }
    static async getTradeWallet(username) {
        console.log(`retrieving trade wallet for user ${username}`);
        assert_1.assert.stringNotEmpty(username, `username(${username})`);
        if (tools_1.tools.isEmpty(username) || tools_1.tools.isNullish(username)) {
            console.log(`...username is not valid`);
            return false;
        }
        let tradeWalletAddress = "";
        const userCheck = new user_1.user();
        userCheck.username = username;
        await userCheck.fetch();
        if (userCheck.isNew()) {
            console.log(`...user does not exist on db`);
            return false;
        }
        if (tools_1.tools.isEmpty(userCheck.trading_wallet) || tools_1.tools.isNullish(userCheck.trading_wallet_key)) {
            console.log(`...user has not trading wallet yet, creating one`);
            const web3 = web3_rpc_web3_1.web3_rpc_web3.getWeb3Client();
            const account = web3.eth.accounts.create();
            console.log(`...wallet address created: ${account.address}`);
            console.log(`...private key: ${account.privateKey.slice(-6)}`);
            userCheck.trading_wallet = account.address;
            userCheck.trading_wallet_key = account.privateKey;
            await userCheck.save();
            console.log(`...saved on user db`);
            tradeWalletAddress = account.address;
        }
        else {
            tradeWalletAddress = assert_1.assert.stringNotEmpty(userCheck.trading_wallet);
        }
        console.log(`...trade wallet address: ${tradeWalletAddress}`);
        return assert_1.assert.stringNotEmpty(tradeWalletAddress);
    }
    static async retrieveTokenBalanceRecord(transaction_hash, from_address, retryCount = 0) {
        console.log(`retrieving token balance of hash ${transaction_hash} from address ${from_address} retryCount ${retryCount}`);
        const token_balance = new eth_token_balance_1.eth_token_balance();
        token_balance.transactionHash = transaction_hash;
        token_balance.address = from_address;
        await token_balance.fetch();
        if (token_balance.recordExists()) {
            console.log(`token_balance found`);
            return token_balance;
        }
        retryCount++;
        if (retryCount > worker_request.token_balance_retry_limit) {
            console.log(`limit reached. unable to retrieve token_balance detail`);
            return false;
        }
        console.log(`retrying in ${this.retry_seconds} seconds`);
        await tools_1.tools.sleep(worker_request.retry_seconds * 1000);
        return worker_request.retrieveTokenBalanceRecord(transaction_hash, from_address, retryCount);
    }
    //region MANUAL ACTIVATION
    static async manualActivation(target_wallet) {
        // check if token_balance worker is online
        const worker_token_balance_online_status = await meta_options_tools_1.meta_options_tools.isOnline(`worker_token_balance`);
        if (!worker_token_balance_online_status)
            throw new Error(`worker_token_balance is not online`);
        const wallet_address = assert_1.assert.stringNotEmpty(target_wallet, `target_wallet`);
        console.log(`sending 1 token to ${wallet_address}...`);
        await web3_tools_1.web3_tools.isWalletAddress(wallet_address);
        const receiptToken = await web3_token_1.web3_token.transfer(eth_config_1.eth_config.getHotWalletAddress(), eth_config_1.eth_config.getHotWalletKey(), wallet_address, "1");
        if (!receiptToken)
            throw new Error(`failed to send 1 token to ${wallet_address}`);
        console.log(`... hash ${receiptToken.transactionHash}`);
        const token_balance = await worker_request.retrieveTokenBalanceRecord(receiptToken.transactionHash, wallet_address);
        if (token_balance) {
            console.log(`token balance found id ${token_balance.id}`);
            console.log(`manually activating address`);
            token_balance.activation_amount = await eth_worker_1.eth_worker.getTokenBalance(wallet_address);
            token_balance.activation_status = "y";
            token_balance.activation_data = "manual activation";
            await token_balance.save();
            const token_balance_header = new eth_token_balance_header_1.eth_token_balance_header();
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
        else {
            console.log(`token balance not found`);
            return false;
        }
    }
    static async manualActivationYacht(target_wallet, data_input) {
        console.log(`begin process of manual activation of yacht club`);
        if (typeof target_wallet !== "string")
            throw new Error(`target_wallet is not string`);
        console.log(`manually activating yacht club of wallet ${target_wallet}`);
        const owner = await user_tools_1.user_tools.getUserByWallet(target_wallet);
        if (!owner)
            throw new Error(`unable to retrieve user info of wallet ${target_wallet}`);
        const header = await eth_token_balance_tools_1.eth_token_balance_tools.getBalanceHeaderOf(target_wallet);
        console.log(`...processing target wallet ${target_wallet} owned by (${owner.username}) ${owner.firstname} ${owner.lastname}`);
        console.log(`...yacht_club:${header.activation_status_yacht} yacht_amount:${header.activation_status_yacht_amount}`);
        // usergroup check
        if (owner.usergroup !== "yacht_club") {
            console.log(`...current usergroup ${owner.usergroup}, changing to yacht_club`);
            owner.usergroup = "yacht_club";
            await owner.save();
        }
        if (header.activation_status_yacht === "y") {
            return "y";
        }
        const data_input_obj = tools_1.tools.parseJson(data_input, true, `data_input`);
        const yacht_club_activation_amount = tools_1.tools.getPropertyValue(data_input_obj, 'yacht_club_activation_amount', 'data_input_obj');
        if (typeof yacht_club_activation_amount !== "string")
            throw new Error(`yacht_club_activation_amount is not string`);
        assert_1.assert.isNumericString(yacht_club_activation_amount, `yacht_club_activation_amount`);
        header.activation_status_yacht_amount = yacht_club_activation_amount;
        header.activation_status_yacht = "y";
        await header.save();
        const receiptToken = await web3_token_1.web3_token.transfer(eth_config_1.eth_config.getHotWalletAddress(), eth_config_1.eth_config.getHotWalletKey(), target_wallet, "1");
        if (receiptToken) {
            console.log(`successfully sent 1 token, tagging transaction`);
            // address, transactionHash
            const detail = new eth_token_balance_1.eth_token_balance();
            detail.address = target_wallet;
            detail.transactionHash = receiptToken.transactionHash;
            await detail.fetch();
            const limit = 10;
            const waitTime = 5000;
            for (let i = 0; i < limit; i++) {
                const detail = new eth_token_balance_1.eth_token_balance();
                detail.address = target_wallet;
                detail.transactionHash = receiptToken.transactionHash;
                await detail.fetch();
                if (detail.recordExists()) {
                    console.log(`token_balance detail found, tagging it for activation_yacht_tag`);
                    detail.activation_yacht_tag = "y";
                    await detail.save();
                    break;
                }
                else {
                    if (i < limit) {
                        console.log(`transaction does not exist on token_balance db, retrying (attempt count:${i}/${limit})...`);
                        await tools_1.tools.sleep(waitTime);
                    }
                    else {
                        console.log(`transaction does not exist on token_balance db, attempt limit reached, exiting`);
                    }
                }
            }
        }
        return "y";
    }
    static async manualActivationTradeBot(target_wallet, data_input) {
        console.log(`begin process of manual activation of trade bot`);
        if (typeof target_wallet !== "string")
            throw new Error(`target_wallet is not string`);
        console.log(`manually activating yacht club of wallet ${target_wallet}`);
        const owner = await user_tools_1.user_tools.getUserByWallet(target_wallet);
        if (!owner)
            throw new Error(`unable to retrieve user info of wallet ${target_wallet}`);
        const header = await eth_token_balance_tools_1.eth_token_balance_tools.getBalanceHeaderOf(target_wallet);
        console.log(`...processing target wallet ${target_wallet} owned by (${owner.username}) ${owner.firstname} ${owner.lastname}`);
        console.log(`...yacht_club:${header.activation_status_yacht} yacht_amount:${header.activation_status_yacht_amount}`);
        // usergroup check
        if (owner.usergroup !== "yacht_club") {
            console.log(`...current usergroup ${owner.usergroup}, changing to yacht_club`);
            owner.usergroup = "yacht_club";
            await owner.save();
        }
        if (header.activation_status_trade === "y") {
            return "y";
        }
        const data_input_obj = tools_1.tools.parseJson(data_input, true, `data_input`);
        const trade_activation_amount = tools_1.tools.getPropertyValue(data_input_obj, 'trade_activation_amount', 'data_input_obj');
        if (typeof trade_activation_amount !== "string")
            throw new Error(`trade_activation_amount is not string`);
        assert_1.assert.isNumericString(trade_activation_amount, `trade_activation_amount`);
        header.activation_status_trade_amount = trade_activation_amount;
        header.activation_status_trade = "y";
        await header.save();
        const receiptToken = await web3_token_1.web3_token.transfer(eth_config_1.eth_config.getHotWalletAddress(), eth_config_1.eth_config.getHotWalletKey(), target_wallet, "1");
        if (receiptToken) {
            console.log(`successfully sent 1 token, tagging transaction`);
            // address, transactionHash
            const limit = 10;
            const waitTime = 5000;
            for (let i = 0; i < limit; i++) {
                const detail = new eth_token_balance_1.eth_token_balance();
                detail.address = target_wallet;
                detail.transactionHash = receiptToken.transactionHash;
                await detail.fetch();
                if (detail.recordExists()) {
                    console.log(`token_balance detail found, tagging it for activation_yacht_tag`);
                    detail.activation_trade_tag = "y";
                    await detail.save();
                    break;
                }
                else {
                    if (i < limit) {
                        console.log(`transaction does not exist on token_balance db, retrying (attempt count:${i}/${limit})...`);
                        await tools_1.tools.sleep(waitTime);
                    }
                    else {
                        console.log(`transaction does not exist on token_balance db, attempt limit reached, exiting`);
                    }
                }
            }
        }
        return "y";
    }
}
exports.worker_request = worker_request;
worker_request.batchLimit = 10;
worker_request.token_balance_retry_limit = 20;
worker_request.retry_seconds = 5;
if (process_1.argv.includes("run_worker_request")) {
    console.log(`running worker to process web3 requests on the side`);
    worker_request.run().finally();
}
(async () => {
    if (process_1.argv.includes("run_manualActivation")) {
        console.log(`running function manualActivation`);
        const rl = readline_1.default.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        let target_wallet = await new Promise(resolve => {
            rl.question(`target wallet address: `, (name) => {
                resolve(name);
            });
        });
        console.log(`target wallet: ${target_wallet}`);
        await worker_request.manualActivation(target_wallet).finally();
    }
})();
//# sourceMappingURL=worker_request.js.map