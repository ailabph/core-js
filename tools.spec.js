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
const chai_1 = require("chai");
const assert = __importStar(require("assert"));
const tools_1 = require("./tools");
const u = require("underscore");
describe("tools spec", () => {
    it("isset return true", () => {
        let obj = { name: "bob" };
        let result = tools_1.tools.isset(obj, "name");
        assert.equal(result, true, "property exist");
    });
    it("isset return false", () => {
        let obj = {};
        let result = tools_1.tools.isset(obj, "name");
        assert.equal(result, false, "property does not exist");
    });
    it("isEmpty return true", () => {
        assert.equal(tools_1.tools.isEmpty(''), true);
        assert.equal(tools_1.tools.isEmpty([]), true);
        assert.equal(tools_1.tools.isEmpty({}), true);
        assert.equal(tools_1.tools.isEmpty(null), true);
        assert.equal(tools_1.tools.isEmpty(undefined), true);
        assert.equal(tools_1.tools.isEmpty(0), true);
    });
    it("isEmpty return false", () => {
        assert.equal(tools_1.tools.isEmpty(-1), false);
        assert.equal(tools_1.tools.isEmpty(1), false);
        assert.equal(tools_1.tools.isEmpty('hello'), false);
        assert.equal(tools_1.tools.isEmpty([1, 2, 3]), false);
        assert.equal(tools_1.tools.isEmpty({ a: 1, b: 2 }), false);
    });
    it("convertArrayOfStringToString array", () => {
        let x = ["a", "b", "c"];
        assert.equal(tools_1.tools.convertArrayOfStringToString(x, ",", ""), "a,b,c");
    });
    it("convertArrayOfStringToString object", () => {
        let x = { name: "bob", age: 23 };
        assert.equal(tools_1.tools.convertArrayOfStringToString(x, ",", "", true), `name:"bob", age:"23"`);
    });
    it("import object values", () => {
        let x = { name: "bob", age: 23 };
        let y = { name: "jane", address: "street" };
        x = tools_1.tools.importObjectValuesInto(y, x);
        assert.equal(x.name, "jane");
        assert.equal(x['address'], undefined);
    });
    it('isNumeric should return true for numeric values', () => {
        (0, chai_1.expect)(tools_1.tools.isNumeric(5)).to.be.true;
        (0, chai_1.expect)(tools_1.tools.isNumeric(-3.14)).to.be.true;
        (0, chai_1.expect)(tools_1.tools.isNumeric('5')).to.be.true;
        (0, chai_1.expect)(tools_1.tools.isNumeric('123')).to.be.true;
    });
    it('isNumeric should return false for non-numeric values', () => {
        (0, chai_1.expect)(tools_1.tools.isNumeric('hello')).to.be.false;
        (0, chai_1.expect)(tools_1.tools.isNumeric('0x10e6d5099c5')).to.be.false;
        (0, chai_1.expect)(tools_1.tools.isNumeric('0x')).to.be.false;
        (0, chai_1.expect)(tools_1.tools.isNumeric([1, 2, 3])).to.be.false;
        (0, chai_1.expect)(tools_1.tools.isNumeric({})).to.be.false;
    });
    it('stringFoundInStringOrArray should return true', () => {
        (0, chai_1.expect)(tools_1.tools.stringFoundInStringOrArray('hello', 'HE')).to.be.true;
        (0, chai_1.expect)(tools_1.tools.stringFoundInStringOrArray(['jane', 'doe'], 'jan')).to.be.true;
    });
    it('stringFoundInStringOrArray should return false', () => {
        (0, chai_1.expect)(tools_1.tools.stringFoundInStringOrArray('hello', 'HELLOTHERE')).to.be.false;
        (0, chai_1.expect)(tools_1.tools.stringFoundInStringOrArray(['jane', 'doe'], 'JANUARY')).to.be.false;
    });
});
