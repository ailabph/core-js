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
const fs = __importStar(require("fs"));
const assert_1 = require("./assert");
const promises_1 = __importDefault(require("fs/promises"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
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
    static sleep(ms = 1000) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => setTimeout(resolve, ms));
        });
    }
    static writeIntoFileArrayOfStrings(filePath, lines) {
        return __awaiter(this, void 0, void 0, function* () {
            if (assert_1.assert.fileExists(filePath, false)) {
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
    static restructureDataFile(sourceFilePath, targetFilePath, separator, targetIndex) {
        var e_1, _a;
        return __awaiter(this, void 0, void 0, function* () {
            assert_1.assert.fileExists(sourceFilePath);
            const file = yield promises_1.default.open(sourceFilePath, 'r');
            let data = [];
            try {
                for (var _b = __asyncValues(file.readLines()), _c; _c = yield _b.next(), !_c.done;) {
                    const line = _c.value;
                    const parts = line.split(separator);
                    data.push(parts[targetIndex]);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
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
}
exports.tools = tools;
tools.BASE_DIR = "..";
tools.STRING = "string";
tools.NUMBER = "number";
tools.BOOLEAN = "boolean";
