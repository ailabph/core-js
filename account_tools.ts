import {config} from "./config";
import {tools} from "./tools";
import {account} from "./build/account";
import {assert} from "./assert";
import {user_tools} from "./user_tools";
import {user} from "./build/user";
import exp from "constants";
import {time_helper} from "./time_helper";

export class account_tools{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`account_tools|${method}|${msg}`);
            if(end) console.log(`account_tools|${method}|${tools.LINE}`);
        }
    }

    //region UTILITIES
    public static async showFullSponsorInfo(target_account:account){
        const method = "showFullSponsorInfo";
        const target_account_owner:user = await user_tools.getUserStrict(target_account.user_id,`target_account(${target_account.id}).user_id(${target_account.user_id})`);

        // UPLINE FROM SPONSOR ID
        const upline_acc_from_sponsor_id:account = await account_tools.getAccountStrict(target_account.sponsor_id, `target_account(${target_account.id}).sponsor_id(${target_account.sponsor_id})`);
        this.log("UPLINE FROM SPONSOR ID",method,false,true);
        await this.displaySponsorInfo(target_account,upline_acc_from_sponsor_id);

        // UPLINE FROM SPONSOR ACCOUNT CODE
        const upline_acc_from_sponsor_code:account = await account_tools.getAccountStrict(target_account.sponsor_account_id,`target_account(${target_account.id}).sponsor_account_id(${target_account.sponsor_account_id})`);
        this.log("UPLINE FROM SPONSOR CODE",method,false,true);
        await this.displaySponsorInfo(target_account,upline_acc_from_sponsor_code);

        // UPLINE FROM USER REFERRED BY
        const ref_user = await user_tools.getUserByCodeStrict(target_account_owner.referred_by_code,`target_account_owner(${target_account_owner.id}).referred_by_code(${target_account_owner.referred_by_code})`);
        const ref_account = await account_tools.getAccountStrict(ref_user.walletAddress,`ref_user(${ref_user.id}).walletAddress(${ref_user.walletAddress})`);
        this.log("UPLINE FROM REFERRAL CODE",method,false,true);
        await this.displaySponsorInfo(target_account,ref_account);
    }
    private static async displaySponsorInfo(downline:account, upline:account):Promise<void>{
        const method = "displaySponsorInfo";
        const upline_user = await user_tools.getUserStrict(upline.user_id,`upline(${upline.id}).user_id(${upline.user_id})`);
        const downline_user = await user_tools.getUserStrict(downline.user_id,`downline(${downline.id}).user_id(${downline.user_id})`);
        this.log(`UPLINE INFO`,method,false,true);
        this.log(`...account id ${upline.id}`,method,false,true);
        this.log(`...account code ${upline.account_code}`,method,false,true);
        this.log(`...owner ${upline_user.id}, ${upline_user.username}, ${upline_user.firstname} ${upline_user.lastname}, ${upline_user.qr_hash}`,method,false,true);
        this.log(`...dna ${upline.sponsor_dna}`,method,false,true);
        this.log(`DOWNLINE INFO`,method,false,true);
        this.log(`...dna ${downline.sponsor_dna}`,method,false,true);
        this.log(`...account id ${downline.id}`,method,false,true);
        this.log(`...account code ${downline.account_code}`,method,false,true);
        this.log(`...sponsor id ${downline.sponsor_id}, sponsor code ${downline.sponsor_account_id}`,method,false,true);
        this.log(`...owner ${downline_user.id}, ${downline_user.username}, ${downline_user.firstname} ${downline_user.lastname}, ${downline_user.qr_hash}, referred by code ${downline_user.referred_by_code}`,method,true,true);
    }
    //endregion UTILITIES

    //region GETTERS
    public static async getAccount(account_arg:null|number|string|account):Promise<account|false>{
        const method = "getAccount";
        if(account_arg === null){
            this.log(`unable to retrieve account, null passed as argument`,method);
            return false;
        }
        const queryAccount = new account();
        if(typeof account_arg === "number"){
            this.log(`...retrieving account via id ${account_arg}`,method);
            queryAccount.id = assert.positiveInt(account_arg,`${method} account_arg`);
        }
        else if(typeof account_arg === "string"){
            this.log(`retrieving account via account_code ${account_arg}`,method);
            queryAccount.account_code = assert.stringNotEmpty(account_arg,`${method} account_arg`);
        }
        else{
            this.log(`detected account object passed, checking if record exist`,method);
            if(account_arg.isNew()){
                this.log(`passed account object with account_code ${account_arg.account_code} is not retrieved from db, cannot guarantee if account exists`,method);
                return false;
            }
            else{
                this.log(`account object retrieved from db, returning`,method);
                return account_arg;
            }
        }
        await queryAccount.fetch();
        if(queryAccount.isNew()){
            this.log(`account not on db`,method);
            return false;
        }
        this.log(`account found with id ${queryAccount.id}`,method);
        return queryAccount;
    }
    public static async getAccountStrict(account_arg:null|number|string|account,desc:string=""):Promise<account>{
        const acc = await this.getAccount(account_arg);
        if(!tools.isEmpty(desc)) desc = `${desc}| `;
        if(!acc) throw new Error(`${desc}unable to retrieve account`);
        return acc;
    }
    public static countSponsorUplinesByDna(sponsor_dna:null|string):number{
        sponsor_dna = assert.stringNotEmpty(sponsor_dna,`countSponsorUplinesByDna sponsor_dna`);
        const dna_parts = sponsor_dna.split("_");
        return dna_parts.length;
    }
    public static getLastAccountIdInSponsorDna(sponsor_dna:null|string):number{
        sponsor_dna = assert.stringNotEmpty(sponsor_dna,`getLastAccountIdInSponsorDna sponsor_dna`);
        const dna_parts = sponsor_dna.split("_");
        const last_account_dna = dna_parts[dna_parts.length-1];
        return assert.positiveInt(last_account_dna,`getLastAccountIdInSponsorDna last_account_dna`);
    }

    public static async getAccountsByUserId(user_id:unknown):Promise<account[]>{
        if(typeof user_id !== "number") throw new Error(`user_id is not a number`);
        if(!(user_id > 0)) throw new Error(`invalid user_id(${user_id}), must be > 0`);
        const a = new account();
        await a.list(" WHERE user_id=:id ",{id:user_id});
        return a._dataList as account[];
    }
    public static async getAccountsBySponsorId(sponsor_id:unknown, context:string = ''):Promise<account[]>{
        if(typeof sponsor_id !== "number") throw new Error(`${context}|unable to retrieve accounts by sponsor_id, sponsor_id is not a number`);
        const accounts = new account();
        await accounts.list(" WHERE sponsor_id=:id ",{id:sponsor_id});
        return accounts._dataList as account[];
    }
    //endregion GETTERS

    //region CHECKER
    public static checkSponsorInfoOfAccount(account_info:account):true|string{
        if(account_info.sponsor_id < 0){
            return `${account_info.account_code} invalid sponsor_id ${account_info.sponsor_id}`;
        }
        const hasSponsorIdButNoSponsorCode = account_info.sponsor_id > 0 && tools.isEmpty(account_info.sponsor_account_id);
        const hasSponsorCodeButNotSponsorId = (tools.isNotEmpty(account_info.sponsor_account_id) && account_info.sponsor_account_id != "null") && !(account_info.sponsor_id > 0);
        if(hasSponsorIdButNoSponsorCode || hasSponsorCodeButNotSponsorId){
            return `account ${account_info.account_code} mismatch sponsor info sponsor_id ${account_info.sponsor_id} sponsor_account_id ${account_info.sponsor_account_id}`;
        }
        const lastAccountId = this.getLastAccountIdInSponsorDna(account_info.sponsor_dna);
        if(lastAccountId !== account_info.id){
            return `account ${account_info.account_code} with id ${account_info.id} does not match last id of sponsor_dna ${account_info.sponsor_dna} which is ${lastAccountId}`;
        }
        if(account_info.sponsor_level === null){
            return `account ${account_info.account_code} has no sponsor_level`;
        }
        if(account_info.sponsor_level < 0){
            return `account ${account_info.account_code} has invalid sponsor_level ${account_info.sponsor_level}`;
        }
        return true;
    }
    public static assertSponsorRelated(upline:account,downline:account){
        const method = "assertSponsorRelated";
        const upline_sponsor_dna = assert.stringNotEmpty(upline.sponsor_dna,`${method} upline.sponsor_dna`);
        const downline_sponsor_dna = assert.stringNotEmpty(downline.sponsor_dna,`${method} downline.sponsor_dna`);
        if(downline_sponsor_dna.indexOf(upline_sponsor_dna) !== 0){
            throw new Error(`upline ${upline.account_code} with sponsor_dna ${upline.sponsor_dna} is not related to downline ${downline.account_code} with sponsor_dna ${downline.sponsor_dna}`);
        }
    }

    public static async verifySponsorLineOfDownline(downline:null|number|string|account, fix:boolean=false, showLogs:boolean=false):Promise<true|string>{
        const method = "verifySponsorLineOfDownline";
        if(!showLogs) showLogs = config.getConfig().verbose_log;

        downline = await this.getAccountStrict(downline,`${method} retrieve downline record`);
        this.log(`checking if downline sponsor structure is correct for`,method,false,showLogs);
        this.log(`...id ${downline.id}`,method,false,showLogs);
        this.log(`...account_code ${downline.account_code}`,method,false,showLogs);
        this.log(`...sponsor_dna ${downline.sponsor_dna}`,method,false,showLogs);
        this.log(`...sponsor_level ${downline.sponsor_level}`,method,false,showLogs);
        this.log(`...sponsor_id ${downline.sponsor_id}`,method,false,showLogs);
        this.log(`...sponsor_account ${downline.sponsor_account_id}`,method,false,showLogs);
        const downline_user = await user_tools.getUser(downline.user_id,`downline.id:${downline.id} downline.user_id:${downline.user_id}`);
        if(typeof downline_user !== "boolean"){
            this.log(`...owner user_id ${downline.user_id} username ${downline_user.username} name ${downline_user.firstname} ${downline_user.lastname}`,method,false,showLogs);
        }
        else{
            this.log(`...user_id ${downline.user_id}`,method,false,showLogs);
        }

        let invalidInfo = this.checkSponsorInfoOfAccount(downline);
        if(typeof invalidInfo === "string") {
            this.log(`ERROR ${invalidInfo}`,method,false,showLogs);
            return invalidInfo;
        }

        let sponsor_id = downline.sponsor_id;
        let sponsor_code = downline.sponsor_account_id;
        let current_downline:account = downline;
        while(tools.isNotEmpty(sponsor_code) && !tools.isNullish(sponsor_code)){
            const upline = await this.getAccountStrict(sponsor_code,`${method} sponsor_code ${sponsor_code}`);

            const uplineUser = await user_tools.getUser(upline.user_id);
            let uplineUserFromSponsorId = "no_user";
            if(typeof uplineUser !== "boolean"){
                uplineUserFromSponsorId = `${uplineUser.username} ${uplineUser.firstname} ${uplineUser.lastname}`;
            }
            this.log(`......checking upline_level:${upline.sponsor_level} upline_id: ${sponsor_id} code ${upline.account_code} (${uplineUserFromSponsorId}) of current_downline_id ${current_downline.id}`,method,false,showLogs);

            // CHECK SPONSOR ACCOUNT CODE
            if(upline.id !== current_downline.sponsor_id) {

                const uplineInfoFromId = await account_tools.getAccountStrict(current_downline.sponsor_id,`current_downline(${current_downline.id}).sponsor_id(${current_downline.sponsor_id})`);
                let uplineUserFromSponsorCodeInfo = "no_user";
                const uplineUserFromSponsorCode = await user_tools.getUserStrict(uplineInfoFromId.user_id);
                uplineUserFromSponsorCodeInfo = `${uplineUserFromSponsorCode.username} ${uplineUserFromSponsorCode.firstname} ${uplineUserFromSponsorCode.lastname}`;
                let errorMsg = `${method}\n`;
                errorMsg += `sponsor_account_id(${upline.id}) account_code ${upline.account_code} owned by (${uplineUserFromSponsorId}) does not match\n`;
                errorMsg += `sponsor_id(${uplineInfoFromId.id}) ${current_downline.sponsor_id}  owned by (${uplineUserFromSponsorCodeInfo}) \n`;


                if(typeof uplineUser !== "boolean"){
                    const downlineUser = await user_tools.getUserStrict(current_downline.user_id,`current_downline(${current_downline.id}).user_id(${current_downline.user_id})`);
                    const origRefUplineUser = new user();
                    origRefUplineUser.qr_hash = downlineUser.referred_by_code;
                    await origRefUplineUser.fetch();
                    errorMsg += `\n original referral upline user ${origRefUplineUser.username} ${origRefUplineUser.firstname} ${origRefUplineUser.lastname}`;
                }

                if(fix){
                    this.log(`fix flag detected, fixing...`,method,false,true);
                    current_downline.sponsor_id = assert.positiveInt(upline.id,`upline.id`);
                    await current_downline.save();
                    this.log(`fix applied, restart check`,method,false,true);
                }
                return errorMsg;
            }

            invalidInfo = this.checkSponsorInfoOfAccount(upline);
            if(typeof invalidInfo === "string") {
                this.log(`ERROR ${invalidInfo}`,method,false,true);
                return invalidInfo;
            }

            // CHECK SPONSOR_LEVEL
            const expected_sponsor_level:number = assert.naturalNumber(upline.sponsor_level,`${method} upline.sponsor_level`) + 1;
            if(current_downline.sponsor_level != expected_sponsor_level){
                if(fix){
                    this.log(`...fix flag enabled, fixing data`,method,false,true);
                    current_downline.sponsor_level = expected_sponsor_level;
                    await current_downline.save();
                }
                return `invalid sponsor level ${current_downline.sponsor_level} of downline ${current_downline.id}, expected to be ${expected_sponsor_level}. upline sponsor_level is ${upline.sponsor_level}`;
            }
            this.log(`.........sponsor_level matched`,method,false,showLogs);

            // CHECK SPONSOR DNA
            const expected_dna = upline.sponsor_dna + "_" + current_downline.id;
            if(current_downline.sponsor_dna !== expected_dna){
                const errorMsg = `current_downline(${current_downline.id}).sponsor_dna \n${current_downline.sponsor_dna} does not match expected \n${expected_dna}`;
                if(fix){
                    this.log(`...fix flag enabled, fixing data`,method,false,true);
                    current_downline.sponsor_dna = expected_dna;
                    await current_downline.save();
                    this.log(`...data fixed, try to rerun the check`,method,false,true);
                }
                return errorMsg;
            }

            sponsor_id = upline.sponsor_id;
            sponsor_code = upline.sponsor_account_id;
            current_downline = upline;
        }
        this.log(`...${downline.account_code} sponsor structure is correct`,method,false,showLogs);
        return true;
    }

    //endregion CHECKER

    //region PROCESS
    public static async createAccountFromUser(u:user){
        const method = "create account from user";

        // user must have wallet address
        if(!user_tools.hasWalletAddress(u)) throw new Error(`unable to ${method}, user(${u.username}) has no wallet address`);

        // user must have no account
        const checkAccounts = await account_tools.getAccountsByUserId(u.id);
        if(checkAccounts.length > 0) throw new Error(`unable to ${method}, user(${u.username}) has an account`);

        // user must have a referred_by_code
        if(typeof u.referred_by_code !== "string") throw new Error(`unable to ${method}, user(${u.username}) has no referred_by_code`);
        if(u.referred_by_code === "") throw new Error(`unable to ${method}, user(${u.username}).referred_by_code is empty`);
        if(u.referred_by_code.toLowerCase() === "null") throw new Error(`unable to ${method}, user(${u.username}).referred_by_code is null`);

        // retrieve referral user
        const sponsor_user = await user_tools.getUserByCodeStrict(u.referred_by_code,`${method}|user(${u.username}).referred_by_code(${u.referred_by_code})`);
        // retrieve account
        const sponsor_accounts = await this.getAccountsByUserId(sponsor_user.id);
        if(sponsor_accounts.length === 0) throw new Error(`unable to ${method}, sponsor(${sponsor_user.username}) of user(${u.username}) has no account`);
        const sponsor_account = sponsor_accounts[0];
        // check account and user wallet match
        if(sponsor_user.walletAddress?.toLowerCase() !== sponsor_account.account_code?.toLowerCase()) throw new Error(`unable to ${method}, user(${sponsor_user.username}) wallet does not match account(${sponsor_user.id})`);
        const sponsor_dna = assert.stringNotEmpty(sponsor_account.sponsor_dna,`unable to ${method}, sponsor_account(${sponsor_account.id}).sponsor_dna is empty`)

        const newAccount = new account();
        newAccount.user_id = assert.positiveInt(u.id,`unable to ${method}, user(${u.username}) has no id`);
        newAccount.account_code = u.walletAddress;
        newAccount.account_type = "wallet";
        newAccount.rank = "basic";
        newAccount.is_top = "n";
        newAccount.time_created = time_helper.getCurrentTimeStamp();
        newAccount.sponsor_account_id = sponsor_account.account_code;
        newAccount.sponsor_id = assert.positiveInt(sponsor_account.id,`${method}|sponsor_account(${sponsor_account.account_code}).id`);
        newAccount.placement_id = 0;
        newAccount.sponsor_level = assert.positiveInt(sponsor_account.sponsor_level,`${method}|sponsor_account(${sponsor_account.id}).sponsor_level(${sponsor_account.sponsor_level})`) + 1;
        newAccount.sponsor_dna = "to_build";
        newAccount.status = "o";
        newAccount.eth_total_community_bonus = "0.00";
        await newAccount.save();
        newAccount.sponsor_dna = sponsor_dna + "_" + newAccount.id;
        await newAccount.save();
    }
    //endregion PROCESS
}