"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tools = void 0;
class tools {
    static getCurrentTimeStamp() {
        return new Date() / 1000 | 0;
    }
    static isset(obj, prop) {
        return obj.hasOwnProperty(prop) && typeof obj[prop] !== "undefined" && obj[prop] != null;
    }
    static isEmpty(val) {
        if (val === undefined || val === null) {
            return true;
        }
        if (typeof val === 'number') {
            return val === 0;
        }
        if (typeof val === 'string' || Array.isArray(val)) {
            return val.length === 0;
        }
        return Object.keys(val).length === 0;
    }
    static getTypeFromSqlType(sql_type) {
        if (tools.isEmpty(sql_type))
            throw new Error("sql_type is empty");
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
        if (int_types.includes(base_sql_type))
            type = tools.NUMBER;
        if (base_sql_type === "boolean")
            type = tools.BOOLEAN;
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
        if (string_types.includes(base_sql_type))
            type = tools.STRING;
        return type;
    }
    static generateRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    static convertArrayOfStringToString(data, separator, data_wrapper = "", preserve_keys = false) {
        let to_return = "";
        for (let property in data) {
            let value = data[property];
            if (preserve_keys) {
                if (!tools.isEmpty(to_return))
                    to_return += ", ";
                to_return += `${data_wrapper}${property}${data_wrapper}:"${data_wrapper}${value}${data_wrapper}"`;
            }
            else {
                if (!tools.isEmpty(to_return))
                    to_return += separator;
                if (!tools.isEmpty(data_wrapper)) {
                    value = `${data_wrapper}${value}${data_wrapper}`;
                }
                to_return += value;
            }
        }
        return to_return;
    }
}
exports.tools = tools;
tools.BASE_DIR = "..";
tools.STRING = "string";
tools.NUMBER = "number";
tools.BOOLEAN = "boolean";
