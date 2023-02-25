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
Object.defineProperty(exports, "__esModule", { value: true });
exports.assert = void 0;
const connection_1 = require("./connection");
const tools_1 = require("./tools");
const fs = __importStar(require("fs"));
class assert {
    static inTransaction() {
        if (!connection_1.connection.inTransactionMode())
            throw new Error("not in transaction mode");
        return true;
    }
    static isset({ val, prop_name = "", strict = true }) {
        if (typeof val === "undefined") {
            if (strict)
                throw new Error(`${prop_name} is undefined`);
            return false;
        }
        return true;
    }
    static isDefined(val, description = "") {
        if (typeof val === "undefined") {
            const errorMessage = tools_1.tools.isNotEmpty(description) ? description : "value is undefined";
            throw new Error(errorMessage);
        }
        return val;
    }
    static notEmpty(value, property_name = "") {
        if (tools_1.tools.isEmpty(value))
            throw new Error(`${property_name} is empty`);
        return true;
    }
    static fileExists(file_path, throwError = true) {
        assert.notEmpty(file_path, "file_path");
        if (!fs.existsSync(file_path)) {
            if (throwError)
                throw new Error(`file does not exist in ${file_path}`);
            return false;
        }
        return true;
    }
    static isString({ val, prop_name = "", strict = false }) {
        const value_type = typeof val;
        if (value_type !== "string") {
            console.log(val);
            throw new Error(`${prop_name} is expected to be string, not ${value_type}`);
        }
        if (strict)
            assert.notEmpty(val, prop_name);
        return val;
    }
    static stringNotEmpty(val, prop_name = "") {
        return assert.isString({ val: val, prop_name: prop_name, strict: true });
    }
    static positiveInt(val, prop_name = "") {
        return tools_1.tools.parseInt({ val: val, name: prop_name, strict: true });
    }
    static positiveNumber(val, prop_name = "") {
        if (typeof val !== "number") {
            if (!tools_1.tools.isNumeric(val))
                throw new Error(`${prop_name} ${val} is not numeric`);
            val = Number.parseFloat(val);
        }
        if (!(val > 0))
            throw new Error(`${prop_name} ${val} must be greater than zero`);
        return val;
    }
    static naturalNumber(val, prop_name = "") {
        val = tools_1.tools.parseIntSimple(val, prop_name);
        prop_name = tools_1.tools.isEmpty(prop_name) ? "" : `(${prop_name})`;
        if (val < 0)
            throw new Error(`${val}${prop_name} must not be lesser than zero`);
        return val;
    }
    static isNumber(value, property_name = "", greaterThan) {
        const value_type = typeof value;
        if (value_type !== "number") {
            const stack = new Error().stack;
            throw new Error(`${property_name} is expected to be a number, not ${value_type} value:${value} | ${stack}`);
        }
        if (typeof greaterThan === "number") {
            const stack = new Error().stack;
            if (greaterThan > value)
                throw new Error(`${property_name} expected to be greater than ${greaterThan} | ${stack}`);
        }
        return value;
    }
    static isNumeric(value, desc = "", greaterThan) {
        if (!tools_1.tools.isNumeric(value)) {
            throw new Error(`${desc} ${value} is not numeric`);
        }
        return value;
    }
    static isNumericString(value, desc = "", greaterThan) {
        assert.isNumeric(value, desc);
        if (typeof greaterThan === "number" && tools_1.tools.notGreaterThan(value, greaterThan)) {
            throw new Error(`${desc} is not greater than ${greaterThan}`);
        }
        return value;
    }
    static isValidDate(val) {
        if (!tools_1.tools.isValidDate(val))
            throw new Error(`${val} is not a valid date`);
        return val;
    }
    static recordExist(db, moreInfo = "record does not exist") {
        if (db.isNew())
            throw new Error(moreInfo);
        return true;
    }
    static recordsFound(db, moreInfo = "records do not exist") {
        if (db.count() === 0)
            throw new Error(moreInfo);
        return true;
    }
}
exports.assert = assert;
//# sourceMappingURL=assert.js.map