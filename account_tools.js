"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.account_tools = void 0;
const config_1 = require("./config");
const tools_1 = require("./tools");
const account_1 = require("./build/account");
const assert_1 = require("./assert");
const user_tools_1 = require("./user_tools");
const user_1 = require("./build/user");
class account_tools {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`account_tools|${method}|${msg}`);
            if (end)
                console.log(`account_tools|${method}|${tools_1.tools.LINE}`);
        }
    }
    //region UTILITIES
    static async showFullSponsorInfo(target_account) {
        const method = "showFullSponsorInfo";
        const target_account_owner = await user_tools_1.user_tools.getUserStrict(target_account.user_id, `target_account(${target_account.id}).user_id(${target_account.user_id})`);
        // UPLINE FROM SPONSOR ID
        const upline_acc_from_sponsor_id = await account_tools.getAccountStrict(target_account.sponsor_id, `target_account(${target_account.id}).sponsor_id(${target_account.sponsor_id})`);
        this.log("UPLINE FROM SPONSOR ID", method, false, true);
        await this.displaySponsorInfo(target_account, upline_acc_from_sponsor_id);
        // UPLINE FROM SPONSOR ACCOUNT CODE
        const upline_acc_from_sponsor_code = await account_tools.getAccountStrict(target_account.sponsor_account_id, `target_account(${target_account.id}).sponsor_account_id(${target_account.sponsor_account_id})`);
        this.log("UPLINE FROM SPONSOR CODE", method, false, true);
        await this.displaySponsorInfo(target_account, upline_acc_from_sponsor_code);
        // UPLINE FROM USER REFERRED BY
        const ref_user = await user_tools_1.user_tools.getUserByCodeStrict(target_account_owner.referred_by_code, `target_account_owner(${target_account_owner.id}).referred_by_code(${target_account_owner.referred_by_code})`);
        const ref_account = await account_tools.getAccountStrict(ref_user.walletAddress, `ref_user(${ref_user.id}).walletAddress(${ref_user.walletAddress})`);
        this.log("UPLINE FROM REFERRAL CODE", method, false, true);
        await this.displaySponsorInfo(target_account, ref_account);
    }
    static async displaySponsorInfo(downline, upline) {
        const method = "displaySponsorInfo";
        const upline_user = await user_tools_1.user_tools.getUserStrict(upline.user_id, `upline(${upline.id}).user_id(${upline.user_id})`);
        const downline_user = await user_tools_1.user_tools.getUserStrict(downline.user_id, `downline(${downline.id}).user_id(${downline.user_id})`);
        this.log(`UPLINE INFO`, method, false, true);
        this.log(`...account id ${upline.id}`, method, false, true);
        this.log(`...account code ${upline.account_code}`, method, false, true);
        this.log(`...owner ${upline_user.id}, ${upline_user.username}, ${upline_user.firstname} ${upline_user.lastname}, ${upline_user.qr_hash}`, method, false, true);
        this.log(`...dna ${upline.sponsor_dna}`, method, false, true);
        this.log(`DOWNLINE INFO`, method, false, true);
        this.log(`...dna ${downline.sponsor_dna}`, method, false, true);
        this.log(`...account id ${downline.id}`, method, false, true);
        this.log(`...account code ${downline.account_code}`, method, false, true);
        this.log(`...sponsor id ${downline.sponsor_id}, sponsor code ${downline.sponsor_account_id}`, method, false, true);
        this.log(`...owner ${downline_user.id}, ${downline_user.username}, ${downline_user.firstname} ${downline_user.lastname}, ${downline_user.qr_hash}, referred by code ${downline_user.referred_by_code}`, method, true, true);
    }
    //endregion UTILITIES
    //region GETTERS
    static async getAccount(account_arg) {
        const method = "getAccount";
        if (account_arg === null) {
            this.log(`unable to retrieve account, null passed as argument`, method);
            return false;
        }
        const queryAccount = new account_1.account();
        if (typeof account_arg === "number") {
            this.log(`...retrieving account via id ${account_arg}`, method);
            queryAccount.id = assert_1.assert.positiveInt(account_arg, `${method} account_arg`);
        }
        else if (typeof account_arg === "string") {
            this.log(`retrieving account via account_code ${account_arg}`, method);
            queryAccount.account_code = assert_1.assert.stringNotEmpty(account_arg, `${method} account_arg`);
        }
        else {
            this.log(`detected account object passed, checking if record exist`, method);
            if (account_arg.isNew()) {
                this.log(`passed account object with account_code ${account_arg.account_code} is not retrieved from db, cannot guarantee if account exists`, method);
                return false;
            }
            else {
                this.log(`account object retrieved from db, returning`, method);
                return account_arg;
            }
        }
        await queryAccount.fetch();
        if (queryAccount.isNew()) {
            this.log(`account not on db`, method);
            return false;
        }
        this.log(`account found with id ${queryAccount.id}`, method);
        return queryAccount;
    }
    static async getAccountStrict(account_arg, desc = "") {
        const acc = await this.getAccount(account_arg);
        if (!tools_1.tools.isEmpty(desc))
            desc = `${desc}| `;
        if (!acc)
            throw new Error(`${desc}unable to retrieve account`);
        return acc;
    }
    static countSponsorUplinesByDna(sponsor_dna) {
        sponsor_dna = assert_1.assert.stringNotEmpty(sponsor_dna, `countSponsorUplinesByDna sponsor_dna`);
        const dna_parts = sponsor_dna.split("_");
        return dna_parts.length;
    }
    static getLastAccountIdInSponsorDna(sponsor_dna) {
        sponsor_dna = assert_1.assert.stringNotEmpty(sponsor_dna, `getLastAccountIdInSponsorDna sponsor_dna`);
        const dna_parts = sponsor_dna.split("_");
        const last_account_dna = dna_parts[dna_parts.length - 1];
        return assert_1.assert.positiveInt(last_account_dna, `getLastAccountIdInSponsorDna last_account_dna`);
    }
    //endregion GETTERS
    //region CHECKER
    static checkSponsorInfoOfAccount(account_info) {
        if (account_info.sponsor_id < 0) {
            return `${account_info.account_code} invalid sponsor_id ${account_info.sponsor_id}`;
        }
        const hasSponsorIdButNoSponsorCode = account_info.sponsor_id > 0 && tools_1.tools.isEmpty(account_info.sponsor_account_id);
        const hasSponsorCodeButNotSponsorId = (tools_1.tools.isNotEmpty(account_info.sponsor_account_id) && account_info.sponsor_account_id != "null") && !(account_info.sponsor_id > 0);
        if (hasSponsorIdButNoSponsorCode || hasSponsorCodeButNotSponsorId) {
            return `account ${account_info.account_code} mismatch sponsor info sponsor_id ${account_info.sponsor_id} sponsor_account_id ${account_info.sponsor_account_id}`;
        }
        const lastAccountId = this.getLastAccountIdInSponsorDna(account_info.sponsor_dna);
        if (lastAccountId !== account_info.id) {
            return `account ${account_info.account_code} with id ${account_info.id} does not match last id of sponsor_dna ${account_info.sponsor_dna} which is ${lastAccountId}`;
        }
        if (account_info.sponsor_level === null) {
            return `account ${account_info.account_code} has no sponsor_level`;
        }
        if (account_info.sponsor_level < 0) {
            return `account ${account_info.account_code} has invalid sponsor_level ${account_info.sponsor_level}`;
        }
        return true;
    }
    static assertSponsorRelated(upline, downline) {
        const method = "assertSponsorRelated";
        const upline_sponsor_dna = assert_1.assert.stringNotEmpty(upline.sponsor_dna, `${method} upline.sponsor_dna`);
        const downline_sponsor_dna = assert_1.assert.stringNotEmpty(downline.sponsor_dna, `${method} downline.sponsor_dna`);
        if (downline_sponsor_dna.indexOf(upline_sponsor_dna) !== 0) {
            throw new Error(`upline ${upline.account_code} with sponsor_dna ${upline.sponsor_dna} is not related to downline ${downline.account_code} with sponsor_dna ${downline.sponsor_dna}`);
        }
    }
    static async verifySponsorLineOfDownline(downline, fix = false, showLogs = false) {
        const method = "verifySponsorLineOfDownline";
        if (!showLogs)
            showLogs = config_1.config.getConfig().verbose_log;
        downline = await this.getAccountStrict(downline, `${method} retrieve downline record`);
        this.log(`checking if downline sponsor structure is correct for`, method, false, showLogs);
        this.log(`...id ${downline.id}`, method, false, showLogs);
        this.log(`...account_code ${downline.account_code}`, method, false, showLogs);
        this.log(`...sponsor_dna ${downline.sponsor_dna}`, method, false, showLogs);
        this.log(`...sponsor_level ${downline.sponsor_level}`, method, false, showLogs);
        this.log(`...sponsor_id ${downline.sponsor_id}`, method, false, showLogs);
        this.log(`...sponsor_account ${downline.sponsor_account_id}`, method, false, showLogs);
        const downline_user = await user_tools_1.user_tools.getUser(downline.user_id);
        if (typeof downline_user !== "boolean") {
            this.log(`...owner user_id ${downline.user_id} username ${downline_user.username} name ${downline_user.firstname} ${downline_user.lastname}`, method, false, showLogs);
        }
        else {
            this.log(`...user_id ${downline.user_id}`, method, false, showLogs);
        }
        let invalidInfo = this.checkSponsorInfoOfAccount(downline);
        if (typeof invalidInfo === "string") {
            this.log(`ERROR ${invalidInfo}`, method, false, showLogs);
            return invalidInfo;
        }
        let sponsor_id = downline.sponsor_id;
        let sponsor_code = downline.sponsor_account_id;
        let current_downline = downline;
        while (tools_1.tools.isNotEmpty(sponsor_code) && !tools_1.tools.isNullish(sponsor_code)) {
            const upline = await this.getAccountStrict(sponsor_code, `${method} sponsor_code ${sponsor_code}`);
            const uplineUser = await user_tools_1.user_tools.getUser(upline.user_id);
            let uplineUserFromSponsorId = "no_user";
            if (typeof uplineUser !== "boolean") {
                uplineUserFromSponsorId = `${uplineUser.username} ${uplineUser.firstname} ${uplineUser.lastname}`;
            }
            this.log(`......checking upline_level:${upline.sponsor_level} upline_id: ${sponsor_id} code ${upline.account_code} (${uplineUserFromSponsorId}) of current_downline_id ${current_downline.id}`, method, false, showLogs);
            // CHECK SPONSOR ACCOUNT CODE
            if (upline.id !== current_downline.sponsor_id) {
                const uplineInfoFromId = await account_tools.getAccountStrict(current_downline.sponsor_id, `current_downline(${current_downline.id}).sponsor_id(${current_downline.sponsor_id})`);
                let uplineUserFromSponsorCodeInfo = "no_user";
                const uplineUserFromSponsorCode = await user_tools_1.user_tools.getUserStrict(uplineInfoFromId.user_id);
                uplineUserFromSponsorCodeInfo = `${uplineUserFromSponsorCode.username} ${uplineUserFromSponsorCode.firstname} ${uplineUserFromSponsorCode.lastname}`;
                let errorMsg = `${method}\n`;
                errorMsg += `sponsor_account_id(${upline.id}) account_code ${upline.account_code} owned by (${uplineUserFromSponsorId}) does not match\n`;
                errorMsg += `sponsor_id(${uplineInfoFromId.id}) ${current_downline.sponsor_id}  owned by (${uplineUserFromSponsorCodeInfo}) \n`;
                if (typeof uplineUser !== "boolean") {
                    const downlineUser = await user_tools_1.user_tools.getUserStrict(current_downline.user_id, `current_downline(${current_downline.id}).user_id(${current_downline.user_id})`);
                    const origRefUplineUser = new user_1.user();
                    origRefUplineUser.qr_hash = downlineUser.referred_by_code;
                    await origRefUplineUser.fetch();
                    errorMsg += `\n original referral upline user ${origRefUplineUser.username} ${origRefUplineUser.firstname} ${origRefUplineUser.lastname}`;
                }
                if (fix) {
                    this.log(`fix flag detected, fixing...`, method, false, true);
                    current_downline.sponsor_id = assert_1.assert.positiveInt(upline.id, `upline.id`);
                    await current_downline.save();
                    this.log(`fix applied, restart check`, method, false, true);
                }
                return errorMsg;
            }
            invalidInfo = this.checkSponsorInfoOfAccount(upline);
            if (typeof invalidInfo === "string") {
                this.log(`ERROR ${invalidInfo}`, method, false, true);
                return invalidInfo;
            }
            // CHECK SPONSOR_LEVEL
            const expected_sponsor_level = assert_1.assert.naturalNumber(upline.sponsor_level, `${method} upline.sponsor_level`) + 1;
            if (current_downline.sponsor_level != expected_sponsor_level) {
                if (fix) {
                    this.log(`...fix flag enabled, fixing data`, method, false, true);
                    current_downline.sponsor_level = expected_sponsor_level;
                    await current_downline.save();
                }
                return `invalid sponsor level ${current_downline.sponsor_level} of downline ${current_downline.id}, expected to be ${expected_sponsor_level}. upline sponsor_level is ${upline.sponsor_level}`;
            }
            this.log(`.........sponsor_level matched`, method, false, showLogs);
            // CHECK SPONSOR DNA
            const expected_dna = upline.sponsor_dna + "_" + current_downline.id;
            if (current_downline.sponsor_dna !== expected_dna) {
                const errorMsg = `current_downline(${current_downline.id}).sponsor_dna \n${current_downline.sponsor_dna} does not match expected \n${expected_dna}`;
                if (fix) {
                    this.log(`...fix flag enabled, fixing data`, method, false, true);
                    current_downline.sponsor_dna = expected_dna;
                    await current_downline.save();
                    this.log(`...data fixed, try to rerun the check`, method, false, true);
                }
                return errorMsg;
            }
            sponsor_id = upline.sponsor_id;
            sponsor_code = upline.sponsor_account_id;
            current_downline = upline;
        }
        this.log(`...${downline.account_code} sponsor structure is correct`, method, false, showLogs);
        return true;
    }
}
exports.account_tools = account_tools;
//# sourceMappingURL=account_tools.js.map