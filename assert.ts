import {connection, tools} from "./ailab-core";
import * as fs from "fs";

interface AssertArguments {
    val:any,
    prop_name?:string,
    strict?:boolean,
}

export class assert{
    public static inTransaction(): boolean{
        if(!connection.inTransactionMode()) throw new Error("not in transaction mode");
        return true;
    }

    public static isset({val,prop_name="",strict=true}:AssertArguments):boolean{
        if(typeof val === "undefined") {
            if(strict) throw new Error(`${prop_name} is undefined`);
            return false;
        }
        return true;
    }

    public static notEmpty(value:any, property_name:string = ""):boolean{
        if(tools.isEmpty(value)) throw new Error(`${property_name} is empty`);
        return true;
    }

    public static fileExists(file_path:string, throwError:boolean = true):boolean{
        assert.notEmpty(file_path,"file_path");
        if (!fs.existsSync(file_path)) {
            if(throwError) throw new Error(`file does not exist in ${file_path}`);
            return false;
        }
        return true;
    }

    public static isString({val,prop_name="",strict=false}:AssertArguments):string{
        const value_type = typeof val;
        if(value_type !== "string") {
            console.log(val);
            throw new Error(`${prop_name} is expected to be string, not ${value_type}`);
        }
        if(strict) assert.notEmpty(val,prop_name);
        return val;
    }

    public static isNumber(value:any, property_name:string = "", greaterThan:number|undefined):number{
        const value_type = typeof value;
        if(value_type !== "number") throw new Error(`${property_name} is expected to be a number, not ${value_type}`);
        if(typeof greaterThan === "number"){
            if(greaterThan > value) throw new Error(`${property_name} expected to be greater than ${greaterThan}`);
        }
        return value;
    }
}