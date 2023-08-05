
import {connection} from "./connection";
import {tools} from "./tools";
import { dataObject } from "./dataObject";
import * as fs from "fs";
import _ from "lodash";

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
    public static isDefined<T>(val:T|undefined, description:string=""):T{
        if(typeof val === "undefined"){
            const errorMessage = tools.isNotEmpty(description) ? description : "value is undefined";
            throw new Error(errorMessage);
        }
        return val as T;
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

    public static stringNotEmpty(val:any,prop_name:string=""):string{
        return assert.isString({val:val,prop_name:prop_name,strict:true});
    }

    public static positiveInt(val:any,prop_name:string=""):number{
        const parsed_val = tools.parseInt({val:val,name:prop_name,strict:true});
        if(parsed_val < 1) throw new Error(`${prop_name} must be greater than zero`);
        return parsed_val;
    }

    public static positiveNumber(val:any,prop_name:string=""):number{
        if(typeof val !== "number"){
            if(!tools.isNumeric(val)) throw new Error(`${prop_name} ${val} is not numeric`);
            val = Number.parseFloat(val);
        }
        if(!(val > 0)) throw new Error(`${prop_name} ${val} must be greater than zero`);
        return val;
    }

    public static naturalNumber(val:any,prop_name:string=""):number{
        val = tools.parseIntSimple(val,prop_name);
        prop_name = tools.isEmpty(prop_name) ? "" : `(${prop_name})`;
        if(val < 0) throw new Error(`${val}${prop_name} must not be lesser than zero`);
        return val;
    }

    public static isNumber(value:any, property_name:string = "", greaterThan?:number|undefined):number{
        const value_type = typeof value;
        if(value_type !== "number") {
            const stack = new Error().stack;
            throw new Error(`${property_name} is expected to be a number, not ${value_type} value:${value} | ${stack}`);
        }
        if(typeof greaterThan === "number"){
            const stack = new Error().stack;
            if(greaterThan > value) throw new Error(`${property_name} expected to be greater than ${greaterThan} | ${stack}`);
        }
        return value;
    }

    public static isNumeric<T>(value:T, desc:string="", greaterThan?:number|undefined):T{
        if(!tools.isNumeric(value)){
            throw new Error(`${desc} ${value} is not numeric`);
        }
        return value;
    }

    public static isNumericString(value:unknown, desc:string="", greaterThan?:number|undefined):string{
        if(typeof value === "string"){
            assert.isNumeric<string>(value,desc);
            if(typeof greaterThan === "number" && tools.notGreaterThan(value,greaterThan)){
                throw new Error(`${desc} is not greater than ${greaterThan}`);
            }
            return value;
        }
        else{
            throw new Error(`${desc} is not a numeric string`);
        }
    }

    public static isValidDate(val:string):string{
        if(!tools.isValidDate(val)) throw new Error(`${val} is not a valid date`);
        return val;
    }

    public static recordExist(db:dataObject,moreInfo:string = "record does not exist"):boolean{
        if(db.isNew()) throw new Error(`${moreInfo} is not a db record`);
        return true;
    }

    public static recordsFound(db:dataObject,moreInfo:string = "records do not exist"):boolean{
        if(db.count() === 0) throw new Error(moreInfo);
        return true;
    }

    public static validEmail(email:string|null,desc:string=""):string{
        if(typeof email !== "string") throw new Error(`${desc} is empty`);
        if(!tools.isValidEmail(email)){
            throw new Error(`${desc} is not a valid email`);
        }
        return email;
    }
}