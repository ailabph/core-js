import {config} from "./config";
import {tools} from "./tools";
import {account} from "./build/account";
import {assert} from "./assert";

export class account_tools{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`account_tools|${method}|${msg}`);
            if(end) console.log(`account_tools|${method}|${tools.LINE}`);
        }
    }

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
            this.log(`...retrieving account via account_code ${account_arg}`,method);
            queryAccount.account_code = assert.stringNotEmpty(account_arg,`${method} account_arg`);
        }
        else{
            this.log(`...detected account object passed, checking if record exist`,method);
            if(account_arg.isNew()){
                this.log(`...passed account object with account_code ${account_arg.account_code} is not retrieved from db, cannot guarantee if account exists`,method);
                return false;
            }
            else{
                this.log(`...account object retrieved from db, returning`,method);
                return account_arg;
            }
        }
        await queryAccount.fetch();
        if(queryAccount.isNew()){
            this.log(`...account not on db`,method);
            return false;
        }
        this.log(`...account found with id ${queryAccount.id}`,method);
        return queryAccount;
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
    //endregion GETTERS

    //region CHECKER
    public static async verifySponsorLineOfDownline(downline:null|number|string|account,fix:boolean=false):Promise<true|string>{
        const method = "verifySponsorLineOfDownline";
        this.log(`checking if downline sponsor structure is correct`,method);
        const downlineObject = await this.getAccount(downline);
        if(!downlineObject) throw new Error(`${method} unable to retrieve downline`);
        this.log(`...checking account sponsor info ${downlineObject.account_code} as sponsor level ${downlineObject.sponsor_level}`,method);
        let invalidInfo = this.checkSponsorInfoOfAccount(downlineObject);
        if(typeof invalidInfo === "string") return invalidInfo;
        this.log(`...downline ${downlineObject.account_code} verified`,method);

        let sponsor_id = downlineObject.sponsor_id;
        let current_downline:account = downlineObject;
        while(sponsor_id > 0){
            this.log(`...checking sponsor_id ${sponsor_id} of current_downline_id ${current_downline.id}`,method);
            const upline = await this.getAccount(sponsor_id);
            if(!upline) return `unable to retrieve upline account via sponsor_id ${sponsor_id} of current_downline_id ${current_downline.id}`;
            invalidInfo = this.checkSponsorInfoOfAccount(upline);
            if(typeof invalidInfo === "string") return invalidInfo;
            this.log(`...upline ${upline.id} ${upline.account_code} sponsor info is verified`,method);
            const expected_sponsor_level:number = assert.naturalNumber(upline.sponsor_level,`${method} upline.sponsor_level`) + 1;
            if(current_downline.sponsor_level != expected_sponsor_level){
                if(fix){
                    this.log(`...fix flag enabled, fixing data`,method);
                    current_downline.sponsor_level = expected_sponsor_level;
                    await current_downline.save();
                }
                return `current downline ${current_downline.account_code} invalid sponsor level ${current_downline.sponsor_level}, expected to be ${expected_sponsor_level}. upline sponsor_level is ${upline.sponsor_level}`;
            }
            this.log(`...downline correct sponsor level ${current_downline.sponsor_level}`,method);
            sponsor_id = upline.sponsor_id;
            current_downline = upline;
        }
        this.log(`...${downlineObject.account_code} sponsor structure is correct`,method);
        return true;
    }
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
    //endregion CHECKER

}