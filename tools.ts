import * as fs from "fs";
import {assert} from "./assert";
import fsPromise from "fs/promises";
import BigNumber from "bignumber.js";

export class tools{

    public static BASE_DIR = "..";

    public static getCurrentTimeStamp():number{
        return (new Date() as unknown as number) / 1000 | 0;
    }

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

    public static isNumeric(value: any): boolean {
        if(typeof value === 'string' && /^0x[0-9a-fA-F]+$/.test(value)) return false;
        return !isNaN(value - parseFloat(value));
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

    public static toBn(value:string|number):BigNumber{
        return new BigNumber(value);
    }

}