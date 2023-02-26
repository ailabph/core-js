import {assert} from "./assert";
import {config} from "./config";

import * as fs from "fs";
import fsPromise from "fs/promises";
import BigNumber from "bignumber.js";
import dayjs, {Dayjs} from "dayjs";
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import _ from "lodash";
import {time_helper} from "./time_helper";

//region TYPES
type GROSS_NET_INFO = {
    gross:string,
    net:string,
    diff:string,
    percentage:number,
}
export { GROSS_NET_INFO }
//endregion TYPES

export class tools{

    public static BASE_DIR = "..";
    public static readonly LINE = "---------------------";

    //region TIME
    public static getTime(time:number|string|Dayjs|null = null):Dayjs{
        return time_helper.getTime(time);
    }
    public static isUnixTimestamp(timestamp: any): boolean {
        return Number.isInteger(timestamp) && timestamp >= 0;
    }
    public static isMilliseconds(timestamp: any): boolean {
        return Number.isInteger(timestamp) && timestamp >= 0 && timestamp % 1000 === 0;
    }
    public static getCurrentTimeStamp():number{
        return time_helper.getCurrentTimeStamp();
    }
    //endregion END TIME

    public static isset(obj:{[key:string]:any}, prop:string): boolean{
        return obj.hasOwnProperty(prop) && typeof obj[prop] !== "undefined" && obj[prop] != null;
    }

    public static isEmpty(val:any): boolean{
        if (val === undefined || val === null) {
            return true;
        }
        if(typeof val === 'number'){
            return val === 0;
        }
        if (typeof val === 'string' || Array.isArray(val)) {
            return val.length === 0;
        }
        return Object.keys(val).length === 0;
    }
    public static isNotEmpty(val:any):boolean{
        return !this.isEmpty(val);
    }

    public static readonly STRING = "string";
    public static readonly NUMBER = "number";
    public static readonly BOOLEAN = "boolean";

    public static getTypeFromSqlType(sql_type:string): string{
        if(tools.isEmpty(sql_type)) throw new Error("sql_type is empty");
        let sql_type_parts = sql_type.split("(");
        let base_sql_type = sql_type_parts[0].toLowerCase();

        let type = "";

        let int_types = [
            "tinyint",
            "smallint",
            "mediumint",
            "int",
            "bigint",
            "bit",
            "serial",
            "timestamp",
            "decimal",
            "float",
            "double",
            "real"
        ];
        if(int_types.includes(base_sql_type)) type = tools.NUMBER;

        if(base_sql_type === "boolean") type = tools.BOOLEAN;

        let string_types = [
            "date",
            "datetime",
            "time",
            "year",
            "char",
            "varchar",
            "tinytext",
            "text",
            "mediumtext",
            "longtext",
            "binary",
            "varbinary",
            "tinyblob",
            "blob",
            "mediumblob",
            "longblob",
            "json",
        ];
        if(string_types.includes(base_sql_type)) type = tools.STRING;

        return type;
    }

    public static generateRandomNumber(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    public static convertArrayOfStringToString(data:{[key:string]:any},separator:string,data_wrapper:string="",preserve_keys:boolean = false):string{
        let to_return = "";
        for(let property in data){
            let value = data[property];
            if(preserve_keys){
                if(!tools.isEmpty(to_return)) to_return += ", ";
                to_return += `${data_wrapper}${property}${data_wrapper}:"${data_wrapper}${value}${data_wrapper}"`;
            }
            else{
                if(!tools.isEmpty(to_return)) to_return += separator;
                if(!tools.isEmpty(data_wrapper)){
                    value = `${data_wrapper}${value}${data_wrapper}`;
                }
                to_return += value;
            }
        }
        return to_return;
    }

    public static async sleep(ms:number = 1000){
        return new Promise( resolve => setTimeout(resolve, ms) );
    }

    public static async restructureDataFile(sourceFilePath:string, targetFilePath:string, separator:string, targetIndex:number){
        assert.fileExists(sourceFilePath);
        const file = await fsPromise.open(sourceFilePath, 'r');
        let data:string[] = [];
        for await (const line of file.readLines()) {
            const parts = line.split(separator);
            data.push(parts[targetIndex]);
        }
        await tools.writeIntoFileArrayOfStrings(targetFilePath,data);
        console.log(`${data.length} lines processed. restructured data from ${sourceFilePath} to ${targetFilePath} `);
    }

    public static importObjectValuesInto<T extends object,U extends object>(from:T, to:U):U{
        for(const key in from){
            if(to.hasOwnProperty(key)){
                (to as any)[key] = (from as any)[key];
            }
        }
        return to;
    }

    public static toFixed(num:string|number,decimal:number = 2):string{
        let bn = new BigNumber(num);
        return bn.decimalPlaces(decimal).toString();
    }



    public static stringFoundInStringOrArray(target:string|any[], find:string): boolean{
        if(typeof target === "string"){
            return target.toLowerCase().indexOf(find.toLowerCase()) !== -1;
        }
        if(Array.isArray(target)){
            for(const value of target){
                if(typeof value !== "string") continue;
                if(value.toLowerCase().indexOf(find.toLowerCase()) !== -1){
                    return true;
                }
            }
        }
        return false;
    }

    //region CHECK
    public static isNull(val:any):boolean{
        return val === null || val === undefined;
    }
    public static isWholeNumber(val:unknown):boolean{
        if(!tools.isNumeric(val)) return false;
        if(typeof val === "string"){
            val = tools.toBn(val).toNumber();
        }
        if(typeof val === "number"){
            return val%1 === 0;
        }
        return false;
    }
    public static isNumber(val:any):boolean{
        return typeof val === "number";
    }
    public static isValidDate(dateString: string): boolean {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }
    public static isNumeric(value: any): boolean {
        if(typeof value === 'string' && /^0x[0-9a-fA-F]+$/.test(value)) return false;
        return !isNaN(value - parseFloat(value));
    }
    public static isStringAndNotEmpty(value:any):boolean {
        return typeof value === "string" && !this.isEmpty(value);
    }
    //endregion CHECK

    //region GETTER
    public static parseInt({val,name="",strict=true}:{val:unknown,name?:string,strict?:boolean}):number{
        let result:number = 0;
        if(!tools.isNumeric(val)){
            if(strict) throw new Error(`${name} is not numeric`);
        }
        else{
            if(!tools.isWholeNumber(val) && strict) throw new Error(`${name} is not a whole number`);
            if(typeof val === "number"){
                if(_.isInteger(val)){
                    result = val;
                }
                else{
                    result = Math.floor(val);
                }
            }
            else if(typeof val === "string"){
                result = _.parseInt(val);
            }
            else{
                if(strict) throw new Error(`${name} is not of type number or string`);
            }
        }
        return result;
    }
    public static parseIntSimple(val:any,prop_name:string=""):number{
        return this.parseInt({val:val,name:prop_name,strict:true});
    }
    public static parseNumber(val:unknown,desc:string="",strict:boolean=false):number{
        let result:number = 0;
        if(tools.isNumeric(val)){
            result = Number(val);
        }
        else{
            if(strict) throw new Error(`${desc} is not numeric`);
        }
        return result;
    }
    public static getNumber(val:any,decimal?:number):number{
        let to_return = this.parseNumber({val:val,strict:true});
        if(typeof decimal === "number" && decimal > 0){
            to_return = Number.parseFloat(tools.toBn(to_return.toString()).toFixed(decimal));
        }
        return to_return;
    }
    public static numericToString({val,dec=18,name="",strict=true}:{val:unknown,dec?:number,name?:string,strict?:boolean}):string{
        let result = "0.00";
        if(val === undefined && strict) throw new Error(`${name} is undefined`);
        if(typeof val === "number" || typeof val === "string"){
            if(!tools.isNumeric(val)) {
                if(strict) throw new Error(`${name} is not numeric`);
            }
            else{
                result = tools.toBn(val).toFixed(18);
            }
        }
        else if(strict){
            throw new Error(`${name} type must be string or number`);
        }
        return result;
    }
    public static convertNumberToHex(num:number):string{
        return "0x"+num.toString(16);
    }
    public static getPropertyValue<T>(obj: {[key:string]:any}, propName: string, object_name:string="object"): T {
        if (!(propName in obj)) {
            throw new Error(`Property '${propName}' does not exist in ${object_name}`);
        }
        return obj[propName];
    }
    //endregion END GETTER

    //region FILE
    public static async writeIntoFileArrayOfStrings(filePath: string, lines: string[]): Promise<void> {
        if (assert.fileExists(filePath,false)) {
            await fs.promises.writeFile(filePath, '');
        } else {
            await fs.promises.writeFile(filePath, '');
        }
        for (const line of lines) {
            await fs.promises.appendFile(filePath, line + '\n');
        }
    }

    public static async writeJsonToFile(data: object | any[], fileName: string) {
        try {
            const jsonData = JSON.stringify(data,null,4);
            await fs.promises.writeFile(fileName, jsonData);
            console.log(`Data written to ${fileName}`);
        } catch (err) {
            console.error(err);
        }
    }
    //endregion

    //region UTILITIES
    public static caseInsensitiveIncludes(arr: string[], searchElement: string) {
        return arr.map(s => s.toLowerCase()).includes(searchElement.toLowerCase());
    }
    public static lastSubstring(val:string,last_len:number):string{
        if(last_len > val.length) throw new Error(`last len ${last_len} is greater than string length ${val.length}`);
        return val.substr(val.length-last_len, val.length);
    }
    public static convertBoolToYesNo(val:boolean):string{
        return val ? "yes" : "no";
    }
    //endregion

    //region MATH
    public static toBn(value:string|number|BigNumber):BigNumber{
        if(typeof value === "string" || typeof value === "number"){
            return new BigNumber(value);
        }
        return value;
    }
    public static deduct(from:string|number|BigNumber,to:string|number|BigNumber,decimal:number|string=18,desc:string=""):string{
        return tools.toBn(from).minus(tools.toBn(to)).toFixed(assert.naturalNumber(decimal,desc));
    }
    public static add(from:string|number|BigNumber,to:string|number|BigNumber,decimal:number|string=18,desc:string=""):string{
        return tools.toBn(from).plus(tools.toBn(to)).toFixed(assert.naturalNumber(decimal,desc));
    }
    public static multiply(from:string|number|BigNumber,to:string|number|BigNumber,decimal:number|string=18,desc:string=""):string{
        return tools.toBn(from).multipliedBy(tools.toBn(to)).toFixed(assert.naturalNumber(decimal,desc));
    }
    public static divide(from:string|number|BigNumber,to:string|number|BigNumber,decimal:number|string=18,desc:string=""):string{
        return tools.toBn(from).dividedBy(tools.toBn(to)).toFixed(assert.naturalNumber(decimal,desc));
    }
    public static greaterThan(from:string|number|BigNumber,to:string|number|BigNumber):boolean{
        return tools.toBn(from).comparedTo(tools.toBn(to)) > 0;
    }
    public static notGreaterThan(from:string|number|BigNumber,to:string|number|BigNumber):boolean{
        return !tools.greaterThan(from,to);
    }
    public static lesserThan(from:string|number|BigNumber,to:string|number|BigNumber):boolean{
        return tools.toBn(from).comparedTo(tools.toBn(to)) < 0;
    }
    public static equalTo(from:string|number|BigNumber,to:string|number|BigNumber):boolean{
        return tools.toBn(from).comparedTo(tools.toBn(to)) === 0;
    }
    public static getGrossNetInfo(gross:unknown,net:unknown,desc:string="",decimal:number=18):GROSS_NET_INFO {
        const toReturn:GROSS_NET_INFO = {diff: "0", gross: "0", net: "0", percentage: 0};
        if (typeof gross === "number") gross = gross.toString();
        toReturn.gross = assert.isNumericString(gross, desc);
        if (typeof net === "number") net = net.toString();
        toReturn.net = assert.isNumericString(net, desc);
        if (tools.greaterThan(toReturn.net, toReturn.gross)) throw new Error(`${desc} net ${toReturn.net} is greater than gross ${toReturn.gross}`);
        toReturn.diff = tools.deduct(toReturn.gross,toReturn.net,decimal,desc);
        const percentage:string = tools.divide(toReturn.diff,toReturn.gross,decimal,desc);
        toReturn.percentage = tools.parseNumber(percentage,desc);
        return toReturn;
    }

    //endregion MATH
}