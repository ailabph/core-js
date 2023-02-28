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
    //endregion GETTERS

}