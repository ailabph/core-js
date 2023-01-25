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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tools = void 0;
const ailab_core_1 = require("./ailab-core");
const fs = __importStar(require("fs"));
const promises_1 = __importDefault(require("fs/promises"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const dayjs_1 = __importDefault(require("dayjs"));
const timezone_1 = __importDefault(require("dayjs/plugin/timezone"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
class tools {
    static timeInit() {
        if (tools.hasTimeInit)
            return;
        dayjs_1.default.extend(utc_1.default);
        dayjs_1.default.extend(timezone_1.default);
        tools.hasTimeInit = true;
    }
    static getTimeZone() {
        const timezone = ailab_core_1.config.getCustomOption("timezone");
        if (!tools.isEmpty(timezone))
            return timezone;
        return "Asia/Manila";
    }
    static getTime(time = null) {
        tools.timeInit();
        let to_return = undefined;
        if (time === null) {
            to_return = (0, dayjs_1.default)();
        }
        else if (typeof time === "number" || typeof time === "string") {
            if (tools.isUnixTimestamp(time)) {
                to_return = dayjs_1.default.unix(ailab_core_1.assert.isNumber(time, "time", 0));
            }
            else if (tools.isMilliseconds(time)) {
                to_return = dayjs_1.default.unix(ailab_core_1.assert.isNumber(time, "time", 0));
            }
            else {
                to_return = (0, dayjs_1.default)(time);
            }
            if (to_return === undefined)
                throw new Error(`unable to create time object from passed argument:${time}`);
        }
        else {
            to_return = time;
        }
        to_return.tz(tools.getTimeZone());
        return to_return;
    }
    static isUnixTimestamp(timestamp) {
        return Number.isInteger(timestamp) && timestamp >= 0;
    }
    static isMilliseconds(timestamp) {
        return Number.isInteger(timestamp) && timestamp >= 0 && timestamp % 1000 === 0;
    }
    static getCurrentTimeStamp() {
        return tools.getTime().unix();
        // return (new Date() as unknown as number) / 1000 | 0;
    }
    //region END TIME
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
    static sleep(ms = 1000) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => setTimeout(resolve, ms));
        });
    }
    static restructureDataFile(sourceFilePath, targetFilePath, separator, targetIndex) {
        var _a, e_1, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            ailab_core_1.assert.fileExists(sourceFilePath);
            const file = yield promises_1.default.open(sourceFilePath, 'r');
            let data = [];
            try {
                for (var _d = true, _e = __asyncValues(file.readLines()), _f; _f = yield _e.next(), _a = _f.done, !_a;) {
                    _c = _f.value;
                    _d = false;
                    try {
                        const line = _c;
                        const parts = line.split(separator);
                        data.push(parts[targetIndex]);
                    }
                    finally {
                        _d = true;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
            yield tools.writeIntoFileArrayOfStrings(targetFilePath, data);
            console.log(`${data.length} lines processed. restructured data from ${sourceFilePath} to ${targetFilePath} `);
        });
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
    static isNumeric(value) {
        if (typeof value === 'string' && /^0x[0-9a-fA-F]+$/.test(value))
            return false;
        return !isNaN(value - parseFloat(value));
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
    static toBn(value) {
        return new bignumber_js_1.default(value);
    }
    //region CHECKER
    static isNull(val) {
        return val === null || val === undefined;
    }
    //endregion
    //region GETTER
    static parseInt(val, name = "", strict = false) {
        if (tools.isNull(val))
            throw new Error(`${name} must not be null or undefined`);
        let to_return = -123456789;
        if (typeof val === "number") {
            to_return = Math.floor(val);
        }
        else if (typeof val === "string") {
            to_return = parseInt(val);
        }
        if (to_return === -123456789)
            throw new Error(`unable to parse int of ${name}:${val}`);
        return to_return;
    }
    //endregion END GETTER
    //region FILE
    static writeIntoFileArrayOfStrings(filePath, lines) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ailab_core_1.assert.fileExists(filePath, false)) {
                yield fs.promises.writeFile(filePath, '');
            }
            else {
                yield fs.promises.writeFile(filePath, '');
            }
            for (const line of lines) {
                yield fs.promises.appendFile(filePath, line + '\n');
            }
        });
    }
    static writeJsonToFile(data, fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const jsonData = JSON.stringify(data, null, 4);
                yield fs.promises.writeFile(fileName, jsonData);
                console.log(`Data written to ${fileName}`);
            }
            catch (err) {
                console.error(err);
            }
        });
    }
}
exports.tools = tools;
tools.BASE_DIR = "..";
//region TIME
tools.hasTimeInit = false;
tools.STRING = "string";
tools.NUMBER = "number";
tools.BOOLEAN = "boolean";
