import {config} from "./config";
import {tools} from "./tools";
import {assert} from "./assert";
import {user} from "./build/user";


export class user_tools{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`user_tools|${method}|${msg}`);
            if(end) console.log(`user_tools|${method}|${tools.LINE}`);
        }
    }

    //region GETTERS
    public static async getUser(id_or_username:null|string|number):Promise<user|false>{
        const method = "getUser";
        if(id_or_username === null){
            this.log(`unable to retrieve user, null passed`,method);
            return false;
        }
        const queryUser = new user();

        if(typeof id_or_username === "number"){
            this.log(`...retrieving by user id ${id_or_username}`,method);
            queryUser.id = assert.positiveInt(id_or_username,`${method} id_or_username`);
        }
        else{
            this.log(`...retrieving by username ${id_or_username}`,method);
            queryUser.username = assert.stringNotEmpty(id_or_username,`${method} id_or_username`);
        }
        await queryUser.fetch();

        if(queryUser.isNew()){
            this.log(`...user not on db`,method);
            return false;
        }
        this.log(`...user found with id ${queryUser.id} username ${queryUser.username}`,method);
        return queryUser;
    }
    public static async getUserStrict(id_or_username:null|string|number,desc:string=""):Promise<user>{
        if(!tools.isEmpty(desc)) desc = `${desc}|`;
        const query = await this.getUser(id_or_username);
        if(!query) throw new Error(`${desc}user not found`);
        return query;
    }
    public static async getUserByWallet(wallet_address:string):Promise<user|false>{
        const method = "getUserByWallet";
        wallet_address = assert.stringNotEmpty(wallet_address,`${method} wallet_address`);
        const queryUser = new user();
        await queryUser.list(
            " WHERE walletAddress=:address AND usergroup!=:claimed ",
            {address:wallet_address,claimed:"claimed"});
        if(queryUser.count() > 1) throw new Error(`multiple users found ${queryUser.count()}, with address ${wallet_address}`);
        return queryUser.getItem();
    }
    public static async getUserByCode(code:string|null):Promise<user|false>{
        if(tools.isEmpty(code) || tools.isNullish(code)) return false;
        const queryUser = new user();
        queryUser.qr_hash = code;
        await queryUser.fetch();
        if(queryUser.recordExists()) return queryUser;
        else return false;
    }
    public static async getUserByCodeStrict(code:string|null,desc:string=""):Promise<user>{
        const queryUser = await this.getUserByCode(code);
        if(typeof queryUser === "boolean"){
            if(tools.isNotEmpty(desc)) desc = desc + "|";
            throw new Error(`${desc}user not found with qr_hash code ${code}`);
        }
        else{
            return queryUser;
        }
    }
    //endregion GETTERS

}