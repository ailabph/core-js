"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tools = exports.RATE_LIMIT_INTERVAL = void 0;
const assert_1 = require("./assert");
const config_1 = require("./config");
const fs = __importStar(require("fs"));
const promises_1 = __importDefault(require("fs/promises"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const lodash_1 = __importDefault(require("lodash"));
const time_helper_1 = require("./time_helper");
const bottleneck_1 = __importDefault(require("bottleneck"));
var RATE_LIMIT_INTERVAL;
(function (RATE_LIMIT_INTERVAL) {
    RATE_LIMIT_INTERVAL["SECOND"] = "second";
    RATE_LIMIT_INTERVAL["MINUTE"] = "minute";
    RATE_LIMIT_INTERVAL["HOUR"] = "hour";
    RATE_LIMIT_INTERVAL["DAY"] = "day";
})(RATE_LIMIT_INTERVAL || (RATE_LIMIT_INTERVAL = {}));
exports.RATE_LIMIT_INTERVAL = RATE_LIMIT_INTERVAL;
//endregion TYPES
class tools {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`tools|${method}|${msg}`);
            if (end)
                console.log(`tools|${method}|${tools.LINE}`);
        }
    }
    //region TIME
    static getTime(time = null) {
        return time_helper_1.time_helper.getTime(time);
    }
    static isUnixTimestamp(timestamp) {
        return Number.isInteger(timestamp) && timestamp >= 0;
    }
    static isMilliseconds(timestamp) {
        return Number.isInteger(timestamp) && timestamp >= 0 && timestamp % 1000 === 0;
    }
    static getCurrentTimeStamp() {
        return time_helper_1.time_helper.getCurrentTimeStamp();
    }
    //endregion END TIME
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
    static isNotEmpty(val) {
        return !this.isEmpty(val);
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
    static async sleep(ms = 1000) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    static async restructureDataFile(sourceFilePath, targetFilePath, separator, targetIndex) {
        assert_1.assert.fileExists(sourceFilePath);
        const file = await promises_1.default.open(sourceFilePath, 'r');
        let data = [];
        for await (const line of file.readLines()) {
            const parts = line.split(separator);
            data.push(parts[targetIndex]);
        }
        await tools.writeIntoFileArrayOfStrings(targetFilePath, data);
        console.log(`${data.length} lines processed. restructured data from ${sourceFilePath} to ${targetFilePath} `);
    }
    static importObjectValuesInto(from, to) {
        for (const key in from) {
            if (to.hasOwnProperty(key)) {
                to[key] = from[key];
            }
        }
        return to;
    }
    static toFixed(num, decimal = 2) {
        let bn = new bignumber_js_1.default(num);
        return bn.decimalPlaces(decimal).toString();
    }
    static stringFoundInStringOrArray(target, find) {
        if (typeof target === "string") {
            return target.toLowerCase().indexOf(find.toLowerCase()) !== -1;
        }
        if (Array.isArray(target)) {
            for (const value of target) {
                if (typeof value !== "string")
                    continue;
                if (value.toLowerCase().indexOf(find.toLowerCase()) !== -1) {
                    return true;
                }
            }
        }
        return false;
    }
    //region CHECK
    static isNull(val) {
        return val === null || val === undefined;
    }
    static isWholeNumber(val) {
        if (!tools.isNumeric(val))
            return false;
        if (typeof val === "string") {
            val = tools.toBn(val).toNumber();
        }
        if (typeof val === "number") {
            return val % 1 === 0;
        }
        return false;
    }
    static isNumber(val) {
        return typeof val === "number";
    }
    static isValidDate(dateString) {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }
    static isNumeric(value) {
        if (typeof value === 'string' && /^0x[0-9a-fA-F]+$/.test(value))
            return false;
        return !isNaN(value - parseFloat(value));
    }
    static isStringAndNotEmpty(value) {
        return typeof value === "string" && !this.isEmpty(value);
    }
    static isNullish(value) {
        if (value === null)
            return true;
        if (typeof value === "string" && value.toLowerCase() === "null")
            return true;
        return false;
    }
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    static isValidContactNumber(contact) {
        if (typeof contact !== 'string' && typeof contact !== 'number') {
            return false;
        }
        const contactStr = String(contact);
        const contactRegex = /^\+?[1-9]\d{1,14}(\(\d{1,4}\))?\d{6,10}$|^0\d{9,10}$|^\d{4}-\d{3}-\d{4}$/;
        return contactRegex.test(contactStr) ? contactStr : false;
    }
    //endregion CHECK
    //region GETTER
    static parseInt({ val, name = "", strict = true }) {
        let result = 0;
        if (!tools.isNumeric(val)) {
            if (strict)
                throw new Error(`${name} is not numeric`);
        }
        else {
            if (!tools.isWholeNumber(val) && strict)
                throw new Error(`${name} is not a whole number`);
            if (typeof val === "number") {
                if (lodash_1.default.isInteger(val)) {
                    result = val;
                }
                else {
                    result = Math.floor(val);
                }
            }
            else if (typeof val === "string") {
                result = lodash_1.default.parseInt(val);
            }
            else {
                if (strict)
                    throw new Error(`${name} is not of type number or string`);
            }
        }
        return result;
    }
    static parseIntSimple(val, prop_name = "") {
        return this.parseInt({ val: val, name: prop_name, strict: true });
    }
    static parseNumber(val, desc = "", strict = false) {
        let result = 0;
        if (tools.isNumeric(val)) {
            result = Number(val);
        }
        else {
            if (strict)
                throw new Error(`${desc} is not numeric`);
        }
        return result;
    }
    static getNumber(val, decimal) {
        let to_return = this.parseNumber({ val: val, strict: true });
        if (typeof decimal === "number" && decimal > 0) {
            to_return = Number.parseFloat(tools.toBn(to_return.toString()).toFixed(decimal));
        }
        return to_return;
    }
    static numericToString({ val, dec = 18, name = "", strict = true }) {
        let result = "0.00";
        if (val === undefined && strict)
            throw new Error(`${name} is undefined`);
        if (typeof val === "number" || typeof val === "string") {
            if (!tools.isNumeric(val)) {
                if (strict)
                    throw new Error(`${name} is not numeric`);
            }
            else {
                result = tools.toBn(val).toFixed(18);
            }
        }
        else if (strict) {
            throw new Error(`${name} type must be string or number`);
        }
        return result;
    }
    static convertNumberToHex(num) {
        return "0x" + num.toString(16);
    }
    static hexToNumber(hexString, desc = "") {
        let toReturn = 0;
        try {
            // remove "0x" prefix if present
            if (hexString.startsWith("0x")) {
                hexString = hexString.slice(2);
            }
            // parse hex string to integer
            toReturn = parseInt(hexString, 16);
        }
        catch (e) {
            const errMsg = e instanceof Error ? e.message : "unknown error";
            throw new Error(`ERROR ${desc} | ${errMsg}`);
        }
        return toReturn;
    }
    static hexToNumberAsString(hexString) {
        return tools.hexToNumber(hexString).toString();
    }
    static getPropertyValue(obj, propName, object_name = "object") {
        if (!(propName in obj)) {
            throw new Error(`Property '${propName}' does not exist in ${object_name}`);
        }
        return obj[propName];
    }
    static parseJson(raw, strict, prop_name = "") {
        if (typeof raw !== "string") {
            if (strict)
                throw new Error(`${prop_name} unable to parse json, passed argument not string`);
            return false;
        }
        if (tools.isNullish(raw)) {
            if (strict)
                throw new Error(`${prop_name} unable to parse json, passed argument is null`);
            return false;
        }
        try {
            return JSON.parse(raw);
        }
        catch (e) {
            if (!(e instanceof Error))
                throw e;
            if (strict)
                throw new Error(`${prop_name} error parsing json, error_message:${e.message}`);
            return false;
        }
    }
    //endregion END GETTER
    //region FILE
    static async writeIntoFileArrayOfStrings(filePath, lines) {
        if (assert_1.assert.fileExists(filePath, false)) {
            await fs.promises.writeFile(filePath, '');
        }
        else {
            await fs.promises.writeFile(filePath, '');
        }
        for (const line of lines) {
            await fs.promises.appendFile(filePath, line + '\n');
        }
    }
    static async writeJsonToFile(data, fileName) {
        try {
            const jsonData = JSON.stringify(data, null, 4);
            await fs.promises.writeFile(fileName, jsonData);
            console.log(`Data written to ${fileName}`);
        }
        catch (err) {
            console.error(err);
        }
    }
    //endregion
    //region UTILITIES
    static caseInsensitiveIncludes(arr, searchElement) {
        return arr.map(s => s.toLowerCase()).includes(searchElement.toLowerCase());
    }
    static lastSubstring(val, last_len) {
        if (last_len > val.length)
            throw new Error(`last len ${last_len} is greater than string length ${val.length}`);
        return val.substr(val.length - last_len, val.length);
    }
    static convertBoolToYesNo(val) {
        return val ? "yes" : "no";
    }
    static toOrdinal(num) {
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
    static toBn(value) {
        if (typeof value === "string" || typeof value === "number") {
            return new bignumber_js_1.default(value);
        }
        return value;
    }
    static deduct(from, to, decimal = 18, desc = "") {
        return tools.toBn(from).minus(tools.toBn(to)).toFixed(assert_1.assert.naturalNumber(decimal, desc));
    }
    static minus(from, to, decimal = 18, desc = "") {
        return tools.deduct(from, to, decimal, desc);
    }
    static subtract(from, to, decimal = 18, desc = "") {
        return tools.deduct(from, to, decimal, desc);
    }
    static add(from, to, decimal = 18, desc = "") {
        return tools.toBn(from).plus(tools.toBn(to)).toFixed(assert_1.assert.naturalNumber(decimal, desc));
    }
    static plus(from, to, decimal = 18, desc = "") {
        return tools.add(from, to, decimal, desc);
    }
    static multiply(from, to, decimal = 18, desc = "") {
        return tools.toBn(from).multipliedBy(tools.toBn(to)).toFixed(assert_1.assert.naturalNumber(decimal, desc));
    }
    static divide(from, to, decimal = 18, desc = "") {
        return tools.toBn(from).dividedBy(tools.toBn(to)).toFixed(assert_1.assert.naturalNumber(decimal, desc));
    }
    static greaterThan(from, to) {
        if (from === null)
            return false;
        if (to === null)
            return true;
        return tools.toBn(from).comparedTo(tools.toBn(to)) > 0;
    }
    static greaterThanOrEqualTo(from, to, desc = "") {
        if (from === null)
            throw new Error(`${desc} is null`);
        if (to === null)
            throw new Error(`${desc} is null`);
        return tools.toBn(from).comparedTo(to) >= 0;
    }
    static notGreaterThan(from, to) {
        return !tools.greaterThan(from, to);
    }
    static lesserThan(from, to) {
        return tools.toBn(from).comparedTo(tools.toBn(to)) < 0;
    }
    static lesserThanOrEqualTo(from, to, desc = "") {
        if (from === null)
            throw new Error(`${desc}`);
        if (to === null)
            throw new Error(`${desc}`);
        return tools.toBn(from).comparedTo(tools.toBn(to)) <= 0;
    }
    static equalTo(from, to) {
        return tools.toBn(from).comparedTo(tools.toBn(to)) === 0;
    }
    static notEqualTo(from, to, desc = "") {
        if (from === null)
            throw new Error(`${desc} is null`);
        if (to === null)
            throw new Error(`${desc} is null`);
        return tools.toBn(from).comparedTo(tools.toBn(to)) !== 0;
    }
    static getGrossNetInfo(gross, net, desc = "", decimal = 18) {
        const toReturn = { diff: "0", gross: "0", net: "0", percentage: 0 };
        if (typeof gross === "number")
            gross = gross.toString();
        toReturn.gross = assert_1.assert.isNumericString(gross, desc);
        if (typeof net === "number")
            net = net.toString();
        toReturn.net = assert_1.assert.isNumericString(net, desc);
        if (tools.greaterThan(toReturn.net, toReturn.gross))
            throw new Error(`${desc} net ${toReturn.net} is greater than gross ${toReturn.gross}`);
        toReturn.diff = tools.deduct(toReturn.gross, toReturn.net, decimal, desc);
        const percentage = tools.divide(toReturn.diff, toReturn.gross, decimal, desc);
        toReturn.percentage = tools.parseNumber(percentage, desc);
        return toReturn;
    }
    static percentageDifference(num1, num2, desc = "", decimal = 4) {
        const method = "percentageDifference";
        if (typeof num1 === "string")
            assert_1.assert.isNumericString(num1, desc);
        if (typeof num2 === "string")
            assert_1.assert.isNumericString(num2, desc);
        const bigNum1 = new bignumber_js_1.default(num1);
        const bigNum2 = new bignumber_js_1.default(num2);
        this.log(`num1(${bigNum1.toFixed(decimal)}) num2(${bigNum2.toFixed(decimal)}) decimal(${decimal})`, method);
        // Calculate the absolute difference
        const difference = bigNum2.minus(bigNum1);
        this.log(`difference(${difference.toFixed(decimal)})`, method);
        // Calculate the percentage difference
        const percentageDifference = difference.dividedBy(bigNum1);
        // Convert the result to a number with the specified number of decimal places
        const result = Number(percentageDifference.toFixed(decimal));
        this.log(`percentageDifference(${result})`, method);
        return result;
    }
    //endregion MATH
    //region LIMITER
    static createLimiter(maxCalls, intervalType, maxConcurrent = 25, minTime = 50) {
        const method = "createLimiter";
        maxCalls = assert_1.assert.positiveInt(maxCalls, `${method} maxCalls`);
        let refreshInterval = 1000;
        if (intervalType === RATE_LIMIT_INTERVAL.SECOND) {
            this.log(`limit ${maxCalls} every second`, method);
        }
        else if (intervalType === RATE_LIMIT_INTERVAL.MINUTE) {
            refreshInterval = 60 * refreshInterval;
            this.log(`limit ${maxCalls} every minute`, method);
        }
        else if (intervalType === RATE_LIMIT_INTERVAL.HOUR) {
            refreshInterval = 60 * 60 * refreshInterval;
            this.log(`limit ${maxCalls} every hour`, method);
        }
        else if (intervalType === RATE_LIMIT_INTERVAL.DAY) {
            refreshInterval = 24 * 60 * 60 * refreshInterval;
            this.log(`limit ${maxCalls} every day`, method);
        }
        const limiter = new bottleneck_1.default({
            reservoir: maxCalls,
            reservoirRefreshAmount: maxCalls,
            reservoirRefreshInterval: refreshInterval,
            maxConcurrent: maxConcurrent,
            minTime: minTime,
        });
        return { limiter: limiter, maxCalls: maxCalls, type: intervalType };
    }
    static async useCallLimiter(limiterInfo) {
        const method = "useCallLimiter";
        let currentReservoir = await limiterInfo.limiter.currentReservoir();
        this.log(`running tasks, allowed calls ${currentReservoir}/${limiterInfo.maxCalls} per ${limiterInfo.type}`, method);
        if (currentReservoir === 0)
            this.log(`${limiterInfo.maxCalls} calls limit reached for every ${limiterInfo.type}, waiting next ${limiterInfo.type} before continuing`, method, false, true);
        await limiterInfo.limiter.schedule(() => this.placeholderFunction());
    }
    static async placeholderFunction() { }
    //endregion LIMITER
    //region FORMAT
    static percentageFormat(percentage, decimal = 2) {
        return tools.multiply(percentage, 100, decimal);
    }
    static stringModifier(template, keys) {
        let result = template;
        for (let key in keys) {
            let value = keys[key];
            if (typeof value === 'number' || !isNaN(Number(value))) {
                value = Number(value).toFixed(6);
            }
            let regex = new RegExp('{{' + key + '}}', 'g');
            result = result.replace(regex, value.toString());
        }
        if (result.includes('{{')) {
            throw new Error('All placeholders have not been replaced');
        }
        return result;
    }
    //endregion FORMAT
    static copy_values(copy_from, copy_to, prop_list, context = "") {
        prop_list.forEach(prop => {
            if (!copy_from.hasOwnProperty(prop))
                throw new Error(`${context}|copy_from does not contain property ${prop}`);
            if (!copy_to.hasOwnProperty(prop))
                throw new Error(`${context}|copy_to does not contain property ${prop}`);
            if (copy_from.hasOwnProperty(prop) && copy_to.hasOwnProperty(prop)) {
                // @ts-ignore
                copy_to[prop] = copy_from[prop];
            }
        });
    }
    static compare_objects(obj1, obj2, props, context = "") {
        for (let prop of props) {
            if (typeof obj1[prop] !== typeof obj2[prop]) {
                throw new Error(`${context}|Type mismatch found in property ${prop}`);
            }
            if (obj1[prop] !== obj2[prop]) {
                throw new Error(`${context}|Value mismatch found in property ${prop}`);
            }
        }
    }
    static check_properties_not_empty(obj, props) {
        props.forEach(prop => {
            if (!obj.hasOwnProperty(prop)) {
                throw new Error(`Property ${prop} does not exist`);
            }
            const value = obj[prop];
            if (typeof value === 'string') {
                if (value === '' || value.toLowerCase() === 'null') {
                    throw new Error(`Property ${prop} must have a value`);
                }
                if (prop.includes('date')) {
                    if (isNaN(Date.parse(value))) {
                        throw new Error(`Property ${prop} must be a valid date string`);
                    }
                }
                if (prop.includes('time') || prop.includes('bonus') || prop.includes('perc')) {
                    if (isNaN(Number(value)) || Number(value) <= 0) {
                        throw new Error(`Property ${prop} must be a numeric string and greater than 0`);
                    }
                }
            }
            else if (typeof value === 'number') {
                if (value <= 0) {
                    throw new Error(`Property ${prop} must be greater than 0`);
                }
            }
        });
        return true;
    }
}
exports.tools = tools;
tools.BASE_DIR = "..";
tools.LINE = "---------------------";
tools.STRING = "string";
tools.NUMBER = "number";
tools.BOOLEAN = "boolean";
//# sourceMappingURL=tools.js.map