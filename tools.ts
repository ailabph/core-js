import {assert} from "./assert";
import {config} from "./config";

import * as fs from "fs";
import fsPromise from "fs/promises";
import BigNumber from "bignumber.js";
import {Dayjs} from "dayjs";
import _ from "lodash";
import {time_helper} from "./time_helper";
import Bottleneck from 'bottleneck';

//region TYPES
type GROSS_NET_INFO = {
    gross:string,
    net:string,
    diff:string,
    percentage:number,
}
export { GROSS_NET_INFO }

enum RATE_LIMIT_INTERVAL {
    SECOND = "second",
    MINUTE ="minute",
    HOUR = "hour",
    DAY = "day",
}
export { RATE_LIMIT_INTERVAL }

type LIMITER_INFO = {
    type:RATE_LIMIT_INTERVAL,
    maxCalls:number,
    limiter:Bottleneck,
}
export { LIMITER_INFO }
//endregion TYPES

export class tools{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`tools|${method}|${msg}`);
            if(end) console.log(`tools|${method}|${tools.LINE}`);
        }
    }

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
    public static isNullish(value:any):boolean{
        if(value === null) return true;
        if(typeof value === "string" && value.toLowerCase() === "null") return true;
        return false;
    }
    public static isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
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
    public static hexToNumber(hexString: string,desc:string=""): number {
        let toReturn:number = 0;
        try{
            // remove "0x" prefix if present
            if (hexString.startsWith("0x")) {
                hexString = hexString.slice(2);
            }

            // parse hex string to integer
            toReturn = parseInt(hexString, 16);
        }catch (e){
            const errMsg = e instanceof Error ? e.message : "unknown error";
            throw new Error(`ERROR ${desc} | ${errMsg}`);
        }
        return toReturn;
    }
    public static hexToNumberAsString(hexString:string):string{
        return tools.hexToNumber(hexString).toString();
    }
    public static getPropertyValue<T>(obj: {[key:string]:any}, propName: string, object_name:string="object"): T {
        if (!(propName in obj)) {
            throw new Error(`Property '${propName}' does not exist in ${object_name}`);
        }
        return obj[propName];
    }
    public static parseJson(raw:unknown,strict:boolean,prop_name:string=""):any{
        if(typeof raw !== "string"){
            if(strict) throw new Error(`${prop_name} unable to parse json, passed argument not string`);
            return false;
        }
        if(tools.isNullish(raw)){
            if(strict) throw new Error(`${prop_name} unable to parse json, passed argument is null`);
            return false;
        }
        try{
            return JSON.parse(raw);
        }catch (e){
            if(!(e instanceof Error)) throw e;
            if(strict) throw new Error(`${prop_name} error parsing json, error_message:${e.message}`);
            return false;
        }
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
    public static toOrdinal(num: number): string {
        if (isNaN(num)) {
            throw new Error('Invalid input, expected a number.');
        }

        const j = num % 10;
        const k = num % 100;
        if (j === 1 && k !== 11) {
            return num + "st";
        }
        if (j === 2 && k !== 12) {
            return num + "nd";
        }
        if (j === 3 && k !== 13) {
            return num + "rd";
        }
        return num + "th";
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
    public static minus(from:string|number|BigNumber,to:string|number|BigNumber,decimal:number|string=18,desc:string=""):string{
        return tools.deduct(from,to,decimal,desc);
    }
    public static subtract(from:string|number|BigNumber,to:string|number|BigNumber,decimal:number|string=18,desc:string=""):string{
        return tools.deduct(from,to,decimal,desc);
    }
    public static add(from:string|number|BigNumber,to:string|number|BigNumber,decimal:number|string=18,desc:string=""):string{
        return tools.toBn(from).plus(tools.toBn(to)).toFixed(assert.naturalNumber(decimal,desc));
    }
    public static plus(from:string|number|BigNumber,to:string|number|BigNumber,decimal:number|string=18,desc:string=""):string{
        return tools.add(from,to,decimal,desc);
    }
    public static multiply(from:string|number|BigNumber,to:string|number|BigNumber,decimal:number|string=18,desc:string=""):string{
        return tools.toBn(from).multipliedBy(tools.toBn(to)).toFixed(assert.naturalNumber(decimal,desc));
    }
    public static divide(from:string|number|BigNumber,to:string|number|BigNumber,decimal:number|string=18,desc:string=""):string{
        return tools.toBn(from).dividedBy(tools.toBn(to)).toFixed(assert.naturalNumber(decimal,desc));
    }
    public static greaterThan(from:null|string|number|BigNumber,to:null|string|number|BigNumber):boolean{
        if(from === null) return false;
        if(to === null) return true;
        return tools.toBn(from).comparedTo(tools.toBn(to)) > 0;
    }
    public static greaterThanOrEqualTo(from:null|string|number|BigNumber,to:null|string|number|BigNumber,desc:string=""):boolean{
        if(from === null) throw new Error(`${desc} is null`);
        if(to === null) throw new Error(`${desc} is null`);
        return tools.toBn(from).comparedTo(to) >= 0;
    }
    public static notGreaterThan(from:string|number|BigNumber,to:string|number|BigNumber):boolean{
        return !tools.greaterThan(from,to);
    }
    public static lesserThan(from:string|number|BigNumber,to:string|number|BigNumber):boolean{
        return tools.toBn(from).comparedTo(tools.toBn(to)) < 0;
    }
    public static lesserThanOrEqualTo(from:null|string|number|BigNumber,to:null|string|number|BigNumber,desc:string=""):boolean{
        if(from === null) throw new Error(`${desc}`);
        if(to === null) throw new Error(`${desc}`);
        return tools.toBn(from).comparedTo(tools.toBn(to)) <= 0;
    }
    public static equalTo(from:string|number|BigNumber,to:string|number|BigNumber):boolean{
        return tools.toBn(from).comparedTo(tools.toBn(to)) === 0;
    }
    public static notEqualTo(from:null|string|number|BigNumber,to:null|string|number|BigNumber,desc:string=""):boolean{
        if(from === null) throw new Error(`${desc} is null`);
        if(to === null) throw new Error(`${desc} is null`);
        return tools.toBn(from).comparedTo(tools.toBn(to)) !== 0;
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
    public static percentageDifference(num1: number|string|BigNumber, num2: number|string|BigNumber,desc:string="",decimal:number=4): number {
        const method = "percentageDifference";
        if(typeof num1 === "string") assert.isNumericString(num1,desc);
        if(typeof num2 === "string") assert.isNumericString(num2,desc);

        const bigNum1 = new BigNumber(num1);
        const bigNum2 = new BigNumber(num2);
        this.log(`num1(${bigNum1.toFixed(decimal)}) num2(${bigNum2.toFixed(decimal)}) decimal(${decimal})`,method);

        // Calculate the absolute difference
        const difference = bigNum2.minus(bigNum1);
        this.log(`difference(${difference.toFixed(decimal)})`,method);

        // Calculate the percentage difference
        const percentageDifference = difference.dividedBy(bigNum1);

        // Convert the result to a number with the specified number of decimal places
        const result = Number(percentageDifference.toFixed(decimal));
        this.log(`percentageDifference(${result})`,method);
        return result;
    }
    //endregion MATH

    //region LIMITER

    public static createLimiter(maxCalls: number, intervalType: RATE_LIMIT_INTERVAL, maxConcurrent:number=25, minTime:number=50): LIMITER_INFO {
        const method = "createLimiter";
        maxCalls = assert.positiveInt(maxCalls,`${method} maxCalls`);
        let refreshInterval = 1000;
        if(intervalType === RATE_LIMIT_INTERVAL.SECOND){
            this.log(`limit ${maxCalls} every second`,method);
        }
        else if(intervalType === RATE_LIMIT_INTERVAL.MINUTE){
            refreshInterval = 60 * refreshInterval;
            this.log(`limit ${maxCalls} every minute`,method);
        }
        else if(intervalType === RATE_LIMIT_INTERVAL.HOUR){
            refreshInterval = 60 * 60 * refreshInterval;
            this.log(`limit ${maxCalls} every hour`,method);
        }
        else if(intervalType === RATE_LIMIT_INTERVAL.DAY){
            refreshInterval = 24 * 60 * 60 * refreshInterval;
            this.log(`limit ${maxCalls} every day`,method);
        }

        const limiter =  new Bottleneck({
            reservoir: maxCalls,
            reservoirRefreshAmount: maxCalls,
            reservoirRefreshInterval: refreshInterval,
            maxConcurrent: maxConcurrent,
            minTime: minTime,
        });
        return {limiter: limiter, maxCalls: maxCalls, type: intervalType};
    }

    public static async useCallLimiter(limiterInfo:LIMITER_INFO):Promise<void> {
        const method = "useCallLimiter";
        let currentReservoir = await limiterInfo.limiter.currentReservoir();
        this.log(`running tasks, allowed calls ${currentReservoir}/${limiterInfo.maxCalls} per ${limiterInfo.type}`,method);
        if (currentReservoir === 0) this.log(`${limiterInfo.maxCalls} calls limit reached for every ${limiterInfo.type}, waiting next ${limiterInfo.type} before continuing`, method, false, true);
        await limiterInfo.limiter.schedule(()=>this.placeholderFunction());
    }
    private static async placeholderFunction(){}

    //endregion LIMITER

    //region FORMAT
    public static percentageFormat(percentage:number, decimal:number = 2):string{
        return tools.multiply(percentage,100,decimal);
    }
    //endregion FORMAT
}