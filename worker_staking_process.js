"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_staking_process = void 0;
const tools_1 = require("./tools");
const assert_1 = require("./assert");
const eth_worker_1 = require("./eth_worker");
const eth_wallet_tools_1 = require("./eth_wallet_tools");
const staking_tools_1 = require("./staking_tools");
const t = __importStar(require("io-ts"));
const d = __importStar(require("fp-ts/Either"));
const time_helper_1 = require("./time_helper");
const web3_rpc_web3_1 = require("./web3_rpc_web3");
const eth_config_1 = require("./eth_config");
const staking_1 = require("./build/staking");
const web3_token_1 = require("./web3_token");
const user_1 = require("./build/user");
const eth_send_token_1 = require("./build/eth_send_token");
const sms_queue_1 = require("./build/sms_queue");
const worker_sms_1 = require("./worker_sms");
const email_queue_1 = require("./build/email_queue");
const worker_email_1 = require("./worker_email");
const process_1 = require("process");
const DecodedClaimData = t.type({
    logs: t.array(t.string),
    status: t.string,
});
var CLAIM_STATUS;
(function (CLAIM_STATUS) {
    CLAIM_STATUS["claim_init"] = "claim_init";
    CLAIM_STATUS["claim_init_done"] = "claim_init_done";
    CLAIM_STATUS["claim_send_gas"] = "claim_send_gas";
    CLAIM_STATUS["claim_send_gas_done"] = "claim_send_gas_done";
    CLAIM_STATUS["claim_token_send"] = "claim_token_send";
    CLAIM_STATUS["claim_token_send_done"] = "claim_token_send_done";
    CLAIM_STATUS["claim_return_bnb"] = "claim_return_bnb";
    CLAIM_STATUS["claim_return_bnb_done"] = "claim_return_bnb_done";
    CLAIM_STATUS["claim_complete"] = "claim_complete";
})(CLAIM_STATUS || (CLAIM_STATUS = {}));
class worker_staking_process {
    static log(msg, method) {
        msg = `${time_helper_1.time_helper.getAsFormat(time_helper_1.time_helper.getCurrentTimeStamp(), time_helper_1.TIME_FORMATS.READABLE)}|${msg}`;
        console.log(`worker_staking_process|${method}|${msg}`);
        return msg;
    }
    /*
    parameters for matured staking
    - status:ongoing
    - time_mature<now()
    - time_token_bonus_sent is null

parameters for eth_token_send
    - stake_bonus
    - community_stake_bonus

SMS/Email
    Congratulations {name}, you have just received {total_token} SRT from the maturity of your staked tokens.
    Congratulations! You have just receive {total_token} SRT from the maturity of the staked token under your community.
     */
    static async run() {
        const method = "run";
        // purpose of this function is to add matured staking to token_sender
        // get all matured type:staking and staking_lock
        const matured_staking = new staking_1.staking();
        await matured_staking.list(" WHERE staking.status=:ongoing AND staking.time_mature<:current_time AND time_token_bonus_sent IS NULL AND type!=:community_staking ", { ongoing: "ongoing", current_time: time_helper_1.time_helper.getCurrentTimeStamp(), community_staking: "community_staking" }, " ORDER BY time_mature ASC ");
        this.log(`${matured_staking.count()} total of matured staking`, method);
        if (matured_staking.count() > 0) {
            const staking_to_process = matured_staking.getItem();
            //region INIT CHECKS
            const owner = new user_1.user();
            owner.id = staking_to_process.user_id;
            await owner.fetch();
            if (owner.isNew())
                throw new Error(`unable to retrieve user(${owner.id}) of staked address ${staking_to_process.staking_wallet_address}`);
            const staking_wallet_address = assert_1.assert.stringNotEmpty(staking_to_process.staking_wallet_address, `${method}|staking_to_process(${staking_to_process.id}).staking_wallet_address`);
            const staking_hash = assert_1.assert.stringNotEmpty(staking_to_process.hash, `${method}|staking_to_process(${staking_to_process.id}).hash`);
            const time_start = assert_1.assert.positiveNumber(staking_to_process.time_start, `${method}|staking_to_process(${staking_to_process.id}).time_start`);
            const time_start_format = time_helper_1.time_helper.getAsFormat(time_start, time_helper_1.TIME_FORMATS.READABLE);
            const time_mature = assert_1.assert.positiveNumber(staking_to_process.time_mature, `${method}|staking_to_process(${staking_to_process.id}).time_mature`);
            const time_mature_format = time_helper_1.time_helper.getAsFormat(time_mature, time_helper_1.TIME_FORMATS.READABLE);
            const token_received = assert_1.assert.isNumericString(staking_to_process.token_received, `${method}|staking_to_process(${staking_to_process.id}).token_received`, 0);
            const is_vip = assert_1.assert.stringNotEmpty(staking_to_process.is_vip, `${method}|staking_to_process(${staking_to_process.id}).is_vip`);
            const apr = assert_1.assert.positiveNumber(staking_to_process.apr, `${method}|staking_to_process(${staking_to_process.id}).apr`);
            const maturity_token_bonus = assert_1.assert.isNumericString(staking_to_process.maturity_token_bonus, `${method}|staking_to_process(${staking_to_process.id}).maturity_token_bonus`, 0);
            const user_wallet_address = assert_1.assert.stringNotEmpty(staking_to_process.user_wallet_address, `${method}|staking_to_process(${staking_to_process.id}).user_wallet_address`);
            this.log(`processing staking address ${staking_wallet_address} hash ${staking_hash} owned by ${owner.username} ${owner.firstname} ${owner.lastname}`, method);
            this.log(`...token_received ${token_received} is_vip ${is_vip} apr ${apr}`, method);
            this.log(`...time_started ${time_start_format} time_mature ${time_mature_format}`, method);
            await worker_staking_process.claimTokens(staking_wallet_address);
            this.log(`...checking if token already sent via checking eth_send_token staking_hash`, method);
            const checkSendToken = new eth_send_token_1.eth_send_token();
            await checkSendToken.list(" WHERE staking_hash=:hash ", { hash: staking_hash });
            if (checkSendToken.count() > 0) {
                throw new Error("token already sent");
            }
            // check apr computation
            this.log(`...checking apr computation`, method);
            const expected_maturity_token_bonus = tools_1.tools.multiply(token_received, apr, 18);
            if (tools_1.tools.notEqualTo(maturity_token_bonus, expected_maturity_token_bonus)) {
                throw new Error(`maturity_token_bonus(${maturity_token_bonus}) does not match expected_maturity_token_bonus(${expected_maturity_token_bonus})`);
            }
            //endregion INIT CHECKS
            const token_to_send = tools_1.tools.add(token_received, maturity_token_bonus, 18);
            this.log(`...total to send ${token_to_send}`, method);
            // compose sms / email and add as pending
            const message = `Congratulations ${owner.firstname?.toUpperCase()}, you have just received ${token_to_send} SRT from the maturity of your staked tokens`;
            let sms_id = 0, email_id = 0;
            if (owner.country_code === "ph") {
                const sms = new sms_queue_1.sms_queue();
                sms.message = message;
                sms.number = assert_1.assert.isNumericString(owner.contact, `${method}|owner(${owner.id}).contact`, 0);
                sms.timeadded = tools_1.tools.getCurrentTimeStamp();
                sms.status = worker_sms_1.SMS_STATUS.PENDING;
                await sms.save();
                sms_id = sms.id ?? 0;
            }
            else {
                const emailRequest = new email_queue_1.email_queue();
                emailRequest.email = assert_1.assert.validEmail(owner.email, `${method}|owner${owner.id}.email`);
                emailRequest.subject = `Staking Maturity Bonus`;
                emailRequest.message = message;
                emailRequest.status = worker_email_1.STATUS_EMAIL.PENDING;
                await emailRequest.save();
                email_id = emailRequest.id ?? 0;
            }
            this.log(`...composed message: ${message}`, method);
            // add eth_send_token
            this.log(`...sending...`, method);
            const sendTokenRequest = new eth_send_token_1.eth_send_token();
            sendTokenRequest.user_id = owner.id;
            sendTokenRequest.toAddress = user_wallet_address;
            sendTokenRequest.amount = token_to_send;
            sendTokenRequest.time_added = tools_1.tools.getCurrentTimeStamp();
            sendTokenRequest.tag = "stake_bonus";
            sendTokenRequest.status = "o";
            sendTokenRequest.staking_hash = staking_hash;
            sendTokenRequest.sms_queue_id = sms_id;
            sendTokenRequest.email_queue_id = email_id;
            await sendTokenRequest.save();
            this.log(`...send request id ${sendTokenRequest.id}`, method);
            staking_to_process.status = "matured_sending";
            await staking_to_process.save();
            // process the community bonus of this stake
            this.log(`...processing community stake`, method);
            await worker_staking_process.processCommunityStake(staking_hash);
            await tools_1.tools.sleep(3000);
            setImmediate(() => {
                worker_staking_process.run().finally();
            });
        }
        else {
            this.log(`...nothing to process, rechecking after 10 minutes`, method);
            const minutes_before_retry = 10;
            await tools_1.tools.sleep(minutes_before_retry * 60 * 1000);
            setImmediate(() => {
                worker_staking_process.run().finally();
            });
        }
    }
    //region CLAIM TOKENS
    static decodeDataClaim(json_raw) {
        const method = "decodeDataClaim";
        const defaultClaimData = {
            logs: [],
            status: "claim_init",
        };
        if (typeof json_raw !== "string" || tools_1.tools.isNullish(json_raw)) {
            return defaultClaimData;
        }
        const decodedDataClaim = DecodedClaimData.decode(JSON.parse(json_raw));
        if (d.isRight(decodedDataClaim)) {
            return decodedDataClaim.right;
        }
        throw new Error(`${method}|passed json is not valid claim data structure`);
    }
    static async claimTokens(staking_address, retry_count = 0) {
        const method = "claimTokens";
        const stakingWallet = await eth_wallet_tools_1.eth_wallet_tools.getWallet(staking_address, true);
        let stakingRecord = await staking_tools_1.staking_tools.getStakingById(stakingWallet.staking_id);
        let claim_data = this.decodeDataClaim(stakingRecord.claim_data);
        try {
            let staking_token_balance = "0";
            [stakingRecord, claim_data, staking_token_balance] = await this.claimTokenInitialization(stakingRecord, claim_data);
            [stakingRecord, claim_data] = await this.sendGasAllowanceForTokenRetrieval(stakingRecord, claim_data, staking_token_balance);
            [stakingRecord, claim_data] = await this.claimTokenToMainWallet(stakingRecord, stakingWallet, claim_data, staking_token_balance);
            // [claim_data] = await this.sendRemainingBnbBackToHotWallet(stakingWallet,claim_data);
            // check token and bnb balance
            claim_data.logs.push(this.log(`checking token and bnb balance of staking wallet`, method));
            staking_token_balance = await eth_worker_1.eth_worker.getTokenBalance(stakingWallet.wallet_address ?? "");
            const staking_bnb_balance = await eth_worker_1.eth_worker.getETHBalance(stakingWallet.wallet_address ?? "");
            claim_data.logs.push(this.log(`token balance ${staking_token_balance}, bnb balance ${staking_bnb_balance}`, method));
            if (tools_1.tools.equalTo(staking_token_balance, 0)
            // && tools.equalTo(staking_bnb_balance,0)
            ) {
                claim_data.logs.push(this.log(`staking address empty, claim completed`, method));
                claim_data.status = CLAIM_STATUS.claim_complete;
                if (typeof stakingRecord.time_claimed !== "number") {
                    stakingRecord.time_claimed = time_helper_1.time_helper.getCurrentTimeStamp();
                    await stakingRecord.save();
                }
            }
            else {
                claim_data.logs.push(this.log(`staking address balances not empty`, method));
            }
        }
        catch (e) {
            if (!(e instanceof Error))
                throw e;
            this.log(`ERROR ${e.message}`, method);
        }
        stakingRecord.claim_data = JSON.stringify(claim_data);
        await stakingRecord.save();
        return stakingRecord;
    }
    static async claimTokenInitialization(stakeRecord, claim_data) {
        const method = "claimTokenInitialization";
        // 1) check bnb balance of hot wallet, throw error if no balance
        claim_data.logs.push(this.log(`checking hot wallet bnb balance is more then threshold ${this.hot_wallet_bnb_threshold}`, method));
        const hot_wallet_bnb_balance = await eth_worker_1.eth_worker.getETHBalance(eth_config_1.eth_config.getHotWalletAddress());
        claim_data.logs.push(this.log(`...bnb balance ${hot_wallet_bnb_balance}`, method));
        if (tools_1.tools.lesserThan(hot_wallet_bnb_balance, this.hot_wallet_bnb_threshold)) {
            throw new Error(`${method}|not enough bnb balance`);
        }
        // 2) check token of staking wallet
        claim_data.logs.push(this.log(`checking staking wallet ${stakeRecord.staking_wallet_address} has token to retrieve`, method));
        const staking_token_balance = await eth_worker_1.eth_worker.getTokenBalance(stakeRecord.staking_wallet_address ?? "");
        claim_data.logs.push(this.log(`token balance ${staking_token_balance}`, method));
        if (!(tools_1.tools.greaterThan(staking_token_balance, 0))) {
            claim_data.logs.push(this.log(`staking wallet has no token to claim, setting status to complete`, method));
            claim_data.status = CLAIM_STATUS.claim_complete;
        }
        else {
            claim_data.logs.push(this.log(`claim token init done`, method));
            claim_data.status = CLAIM_STATUS.claim_init_done;
        }
        return [stakeRecord, claim_data, staking_token_balance];
    }
    static async sendGasAllowanceForTokenRetrieval(stakeRecord, claim_data, token_balance) {
        const method = "sendGasAllowanceForTokenRetrieval";
        assert_1.assert.isNumericString(token_balance, `${method}|token_balance`, 0);
        if (claim_data.status === CLAIM_STATUS.claim_init_done) {
            const web3 = web3_rpc_web3_1.web3_rpc_web3.getWeb3Client();
            const contract = web3_rpc_web3_1.web3_rpc_web3.getWeb3Contract(eth_config_1.eth_config.getTokenContract(), eth_config_1.eth_config.getTokenAbi());
            claim_data.status = CLAIM_STATUS.claim_send_gas;
            claim_data.logs.push(this.log(`estimating gas to send token ${token_balance}`, method));
            const tokenValue = eth_worker_1.eth_worker.convertTokenToValue(token_balance);
            const txData = contract.methods.transfer(eth_config_1.eth_config.getHotWalletAddress(), tokenValue).encodeABI();
            const gasPrice = await web3.eth.getGasPrice();
            const gasEstimate = await web3.eth.estimateGas({ from: stakeRecord.staking_wallet_address ?? "", to: eth_config_1.eth_config.getHotWalletAddress(), data: txData });
            claim_data.logs.push(this.log(`gasPrice ${gasPrice} gasFeeEstimate ${gasEstimate}`, method));
            const gasFeeEstimateValue = tools_1.tools.multiply(gasPrice, gasEstimate, 0);
            const gasFeeEstimateAmount = eth_worker_1.eth_worker.convertValueToETH(gasFeeEstimateValue);
            claim_data.logs.push(this.log(`gas fee estimate ${gasFeeEstimateAmount}`, method));
            const gasFeeEstimateValueWithAllowance = tools_1.tools.multiply(gasFeeEstimateValue, this.gasMultiplier, 0);
            const gasFeeEstimateAmountWithAllowance = tools_1.tools.multiply(gasFeeEstimateAmount, this.gasMultiplier);
            claim_data.logs.push(this.log(`gas fee estimate with allowance (${this.gasMultiplier} multiplier) ${gasFeeEstimateAmountWithAllowance}`, method));
            claim_data.logs.push(this.log(`sending bnb to staking wallet`, method));
            // check bnb balance of staking wallet
            const staking_bnb_balance = await eth_worker_1.eth_worker.getETHBalance(stakeRecord.staking_wallet_address ?? "");
            claim_data.logs.push(this.log(`staking address bnb balance ${staking_bnb_balance}`, method));
            if (tools_1.tools.lesserThan(staking_bnb_balance, gasFeeEstimateAmountWithAllowance)) {
                claim_data.logs.push(this.log(`not enough bnb for gas, sending gas from main wallet`, method));
                const txReceipt = await web3_token_1.web3_token.sendBNB(eth_config_1.eth_config.getHotWalletAddress(), eth_config_1.eth_config.getHotWalletKey(), stakeRecord.staking_wallet_address ?? "", gasFeeEstimateAmountWithAllowance);
                claim_data.logs.push(this.log(`send successful, hash ${txReceipt.transactionHash}`, method));
            }
            else {
                claim_data.logs.push(this.log(`has enough bnb balance`, method));
            }
            claim_data.status = CLAIM_STATUS.claim_send_gas_done;
        }
        return [stakeRecord, claim_data];
    }
    static async claimTokenToMainWallet(stakingRecord, stakingWallet, claim_data, staking_token_balance) {
        const method = "claimTokenToMainWallet";
        assert_1.assert.isNumericString(staking_token_balance, `${method}|staking_token_balance`, 0);
        claim_data.logs.push(this.log(`sending token ${staking_token_balance} to main wallet`, method));
        claim_data.status = CLAIM_STATUS.claim_token_send;
        const staking_wallet_address = assert_1.assert.stringNotEmpty(stakingWallet.wallet_address, `${method}|stakingWallet.wallet_address`);
        const staking_wallet_key = assert_1.assert.stringNotEmpty(stakingWallet.private_key, `${method}|stakingWallet.private_key`);
        const receipt = await web3_token_1.web3_token.transfer(staking_wallet_address, staking_wallet_key, eth_config_1.eth_config.getHotWalletAddress(), staking_token_balance);
        if (receipt) {
            claim_data.logs.push(this.log(`successfully sent token to main wallet, hash ${receipt.transactionHash}`, method));
            claim_data.status = CLAIM_STATUS.claim_token_send_done;
            stakingRecord.time_claimed = time_helper_1.time_helper.getCurrentTimeStamp();
            stakingRecord.token_claimed = staking_token_balance;
            await stakingRecord.save();
        }
        else {
            claim_data.logs.push(this.log(`failed to send token to main wallet`, method));
        }
        return [stakingRecord, claim_data];
    }
    static async sendRemainingBnbBackToHotWallet(stakingWallet, claim_data) {
        const method = "sendRemainingBnbBackToHotWallet";
        const staking_wallet_address = assert_1.assert.stringNotEmpty(stakingWallet.wallet_address, `${method}|stakingWallet.wallet_address`);
        const staking_wallet_key = assert_1.assert.stringNotEmpty(stakingWallet.private_key, `${method}|stakingWallet.private_key`);
        const bnb_balance = await eth_worker_1.eth_worker.getETHBalance(staking_wallet_address);
        claim_data.logs.push(this.log(`bnb balance of ${stakingWallet.wallet_address} is ${bnb_balance}`, method));
        if (tools_1.tools.greaterThan(bnb_balance, 0)) {
            claim_data.logs.push(this.log(`sending remaining bnb to main wallet`, method));
            claim_data.status = CLAIM_STATUS.claim_return_bnb;
            const receipt = await web3_token_1.web3_token.sendBNB(staking_wallet_address, staking_wallet_key, eth_config_1.eth_config.getHotWalletAddress(), bnb_balance, 1);
            if (receipt) {
                claim_data.logs.push(this.log(`send successful, hash ${receipt.transactionHash}`, method));
                claim_data.status = CLAIM_STATUS.claim_return_bnb_done;
            }
            else {
                claim_data.logs.push(this.log(`failed to send bnb`, method));
            }
        }
        else {
            claim_data.logs.push(this.log(`no bnb to return`, method));
        }
        return [claim_data];
    }
    //endregion CLAIM TOKENS
    //region COMMUNITY STAKE
    static async processCommunityStake(staking_hash) {
        const method = "processCommunityStake";
        const source_staking = await staking_tools_1.staking_tools.getStakingByHash(staking_hash);
        if (source_staking.type === "community_staking")
            throw new Error(`${method}|invalid stake source(${staking_hash}), must not be community_staking`);
        const community_stakings = new staking_1.staking();
        await community_stakings.list(" WHERE downline_staking_hash=:staking_hash ", { staking_hash: source_staking.hash });
        this.log(`...${community_stakings.count()} community staking found`, method);
        let community_level_sent = [];
        for (const community_stake of community_stakings._dataList) {
            const community_stake_owner = new user_1.user();
            community_stake_owner.id = community_stake.user_id;
            await community_stake_owner.fetch();
            if (community_stake_owner.isNew())
                throw new Error(`unable to retrieve owner of community stake  ${community_stake.id}`);
            const community_owner_wallet_address = assert_1.assert.stringNotEmpty(community_stake.user_wallet_address, `${method}|community_stake(${community_stake.id}).user_wallet_address`);
            const community_staking_hash = assert_1.assert.stringNotEmpty(community_stake.hash, `${method}|community_stake${community_stake.id}.hash`);
            const community_maturity_token_bonus = assert_1.assert.isNumericString(community_stake.maturity_token_bonus, `${method}|community_stake(${community_stake.id}).maturity_token_bonus`);
            const community_apr = assert_1.assert.positiveNumber(community_stake.apr, `${method}|community_stake(${community_stake.id}).apr`);
            const source_maturity_token_bonus = assert_1.assert.isNumericString(community_stake.source_maturity_token_bonus, `${method}|community_stake(${community_stake.id}).maturity_token_bonus`);
            const community_level = assert_1.assert.positiveInt(community_stake.community_level, `${method}|community_stake(${community_stake.id}).community_level`);
            this.log(`...processing community staking hash ${community_staking_hash} owned by ${community_stake_owner.username} ${community_stake_owner.firstname} ${community_stake_owner.lastname}`, method);
            this.log(`......level ${community_level} source ${source_maturity_token_bonus} apr ${community_apr} bonus ${community_maturity_token_bonus}`, method);
            this.log(`......doing final checks`, method);
            // check proper level
            if (community_level > 5)
                throw new Error(`unexpected level greater than 5`);
            // check duplicate level
            if (community_level_sent.includes(community_level))
                throw new Error(`community level ${community_level} already sent`);
            // verify same amount from parent stake
            if (tools_1.tools.notEqualTo(source_staking.maturity_token_bonus, source_maturity_token_bonus)) {
                throw new Error(`expected source_maturity_token_bonus(${community_maturity_token_bonus}) of community stake is equal to source_staking.maturity_token_bonus(${source_staking.maturity_token_bonus}) `);
            }
            // check if already sent
            const checkSendToken = new eth_send_token_1.eth_send_token();
            await checkSendToken.list(" WHERE staking_hash=:hash ", { hash: community_staking_hash });
            if (checkSendToken.count() > 0)
                throw new Error(`community token already sent`);
            // double check apr
            const expected_maturity_bonus = tools_1.tools.multiply(community_apr, source_maturity_token_bonus, 18);
            if (tools_1.tools.notEqualTo(expected_maturity_bonus, community_maturity_token_bonus)) {
                throw new Error(`expected_maturity_bonus(${expected_maturity_bonus}) not equal to community_maturity_token_bonus(${community_maturity_token_bonus})`);
            }
            community_level_sent.push(community_level);
            this.log(`......preparing message`, method);
            // set message
            let community_sms_queue_id = 0, community_email_queue_id = 0;
            const community_message = `Congratulations ${community_stake_owner.firstname?.toUpperCase()}! You have just receive ${community_maturity_token_bonus} SRT from the maturity of the staked token under your community.`;
            if (community_stake_owner.country_code === "ph") {
                const community_sms = new sms_queue_1.sms_queue();
                community_sms.message = community_message;
                community_sms.number = assert_1.assert.isNumericString(community_stake_owner.contact, `${method}|community_stake_owner(${community_stake_owner.id}).contact`, 0);
                community_sms.timeadded = tools_1.tools.getCurrentTimeStamp();
                community_sms.status = worker_sms_1.SMS_STATUS.PENDING;
                await community_sms.save();
                community_sms_queue_id = community_sms.id ?? 0;
            }
            else {
                const community_emailRequest = new email_queue_1.email_queue();
                community_emailRequest.email = assert_1.assert.validEmail(community_stake_owner.email, `${method}|community_stake_owner${community_stake_owner.id}.email`);
                community_emailRequest.subject = `Community Staking Maturity Bonus`;
                community_emailRequest.message = community_message;
                community_emailRequest.status = worker_email_1.STATUS_EMAIL.PENDING;
                await community_emailRequest.save();
                community_email_queue_id = community_emailRequest.id ?? 0;
            }
            // add eth_send_token
            this.log(`......add to send queue`, method);
            const community_sendTokenRequest = new eth_send_token_1.eth_send_token();
            community_sendTokenRequest.user_id = community_stake_owner.id;
            community_sendTokenRequest.toAddress = community_owner_wallet_address;
            community_sendTokenRequest.amount = community_maturity_token_bonus;
            community_sendTokenRequest.time_added = tools_1.tools.getCurrentTimeStamp();
            community_sendTokenRequest.tag = "community_stake_bonus";
            community_sendTokenRequest.status = "o";
            community_sendTokenRequest.staking_hash = community_staking_hash;
            community_sendTokenRequest.sms_queue_id = community_sms_queue_id;
            community_sendTokenRequest.email_queue_id = community_email_queue_id;
            await community_sendTokenRequest.save();
        }
        this.log(`...done processing community stake bonus`, method);
    }
}
exports.worker_staking_process = worker_staking_process;
worker_staking_process.hot_wallet_bnb_threshold = 0.2;
worker_staking_process.gasMultiplier = 14;
if (process_1.argv.includes("run_worker_staking_process")) {
    console.log(`running worker_staking_process`);
    worker_staking_process.run().finally();
}
//# sourceMappingURL=worker_staking_process.js.map