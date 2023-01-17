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
const ailab_core_1 = require("./ailab-core");
const fs = __importStar(require("fs"));
class assert {
    static inTransaction() {
        if (!ailab_core_1.connection.inTransactionMode())
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
    static notEmpty(value, property_name = "") {
        if (ailab_core_1.tools.isEmpty(value))
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
    static isNumber(value, property_name = "", greaterThan) {
        const value_type = typeof value;
        if (value_type !== "number")
            throw new Error(`${property_name} is expected to be a number, not ${value_type}`);
        if (typeof greaterThan === "number") {
            if (greaterThan > value)
                throw new Error(`${property_name} expected to be greater than ${greaterThan}`);
        }
        return value;
    }
}
exports.assert = assert;
