"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
// import * as assert from "assert";
const chai_2 = require("chai");
const tools_1 = require("./tools");
const u = require("underscore");
describe("tools spec", () => {
    it("isset return true", () => {
        let obj = { name: "bob" };
        let result = tools_1.tools.isset(obj, "name");
        chai_2.assert.equal(result, true, "property exist");
    });
    it("isset return false", () => {
        let obj = {};
        let result = tools_1.tools.isset(obj, "name");
        chai_2.assert.equal(result, false, "property does not exist");
    });
    it("isEmpty return true", () => {
        chai_2.assert.equal(tools_1.tools.isEmpty(''), true);
        chai_2.assert.equal(tools_1.tools.isEmpty([]), true);
        chai_2.assert.equal(tools_1.tools.isEmpty({}), true);
        chai_2.assert.equal(tools_1.tools.isEmpty(null), true);
        chai_2.assert.equal(tools_1.tools.isEmpty(undefined), true);
        chai_2.assert.equal(tools_1.tools.isEmpty(0), true);
    });
    it("isEmpty return false", () => {
        chai_2.assert.equal(tools_1.tools.isEmpty(-1), false);
        chai_2.assert.equal(tools_1.tools.isEmpty(1), false);
        chai_2.assert.equal(tools_1.tools.isEmpty('hello'), false);
        chai_2.assert.equal(tools_1.tools.isEmpty([1, 2, 3]), false);
        chai_2.assert.equal(tools_1.tools.isEmpty({ a: 1, b: 2 }), false);
    });
    it("isWholeNumber return true", () => {
        (0, chai_1.expect)(tools_1.tools.isWholeNumber(1)).to.be.true;
        (0, chai_1.expect)(tools_1.tools.isWholeNumber("123")).to.be.true;
        (0, chai_1.expect)(tools_1.tools.isWholeNumber("-456")).to.be.true;
    });
    it("isWholeNumber return false", () => {
        (0, chai_1.expect)(tools_1.tools.isWholeNumber(1.123)).to.be.false;
        (0, chai_1.expect)(tools_1.tools.isWholeNumber("123.456")).to.be.false;
        (0, chai_1.expect)(tools_1.tools.isWholeNumber("-456.789")).to.be.false;
        (0, chai_1.expect)(tools_1.tools.isWholeNumber("abc")).to.be.false;
    });
    it("convertArrayOfStringToString array", () => {
        let x = ["a", "b", "c"];
        chai_2.assert.equal(tools_1.tools.convertArrayOfStringToString(x, ",", ""), "a,b,c");
    });
    it("convertArrayOfStringToString object", () => {
        let x = { name: "bob", age: 23 };
        chai_2.assert.equal(tools_1.tools.convertArrayOfStringToString(x, ",", "", true), `name:"bob", age:"23"`);
    });
    it("import object values", () => {
        let x = { name: "bob", age: 23 };
        let y = { name: "jane", address: "street" };
        x = tools_1.tools.importObjectValuesInto(y, x);
        chai_2.assert.equal(x.name, "jane");
        chai_2.assert.equal(x['address'], undefined);
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
    it('parseInt should return an integer for numeric values', () => {
        (0, chai_1.expect)(tools_1.tools.parseInt({ val: 3, strict: true })).to.be.equal(3);
        (0, chai_1.expect)(tools_1.tools.parseInt({ val: '5', strict: true })).to.be.equal(5);
        (0, chai_1.expect)(tools_1.tools.parseInt({ val: '123', strict: true })).to.be.equal(123);
    });
    it('parseInt should return an integer for numeric non whole number', () => {
        (0, chai_1.expect)(tools_1.tools.parseInt({ val: 3.1, strict: false })).to.be.equal(3);
        (0, chai_1.expect)(tools_1.tools.parseInt({ val: '5.12', strict: false })).to.be.equal(5);
        (0, chai_1.expect)(tools_1.tools.parseInt({ val: '-3.14', strict: false })).to.be.equal(-3);
    });
    it('parseInt should throw an error', () => {
        (0, chai_1.expect)(() => { tools_1.tools.parseInt({ val: "abc", strict: true }); }).to.throw(" is not numeric");
        (0, chai_1.expect)(() => { tools_1.tools.parseInt({ val: { name: "abc" }, strict: true }); }).to.throw(" is not numeric");
        (0, chai_1.expect)(() => { tools_1.tools.parseInt({ val: '5.12', strict: true }); }).to.throw(" is not a whole number");
    });
    it('stringFoundInStringOrArray should return true', () => {
        (0, chai_1.expect)(tools_1.tools.stringFoundInStringOrArray('hello', 'HE')).to.be.true;
        (0, chai_1.expect)(tools_1.tools.stringFoundInStringOrArray(['jane', 'doe'], 'jan')).to.be.true;
    });
    it('stringFoundInStringOrArray should return false', () => {
        (0, chai_1.expect)(tools_1.tools.stringFoundInStringOrArray('hello', 'HELLOTHERE')).to.be.false;
        (0, chai_1.expect)(tools_1.tools.stringFoundInStringOrArray(['jane', 'doe'], 'JANUARY')).to.be.false;
    });
    it('numericToString should return a numeric string', () => {
        (0, chai_1.expect)(tools_1.tools.numericToString({ val: 123, dec: 18 })).to.be.string("123.000000000000000000");
        (0, chai_1.expect)(tools_1.tools.numericToString({ val: "456.1234567890", dec: 8 })).to.be.string("456.12345678");
    });
    it('numericToString should return a zero', () => {
        (0, chai_1.expect)(tools_1.tools.numericToString({ val: "abc", strict: false })).to.be.string("0.00");
        (0, chai_1.expect)(tools_1.tools.numericToString({ val: { name: "john", age: 23 }, strict: false })).to.be.string("0.00");
    });
    it('numericToString should throws error', () => {
        (0, chai_1.expect)(() => {
            tools_1.tools.numericToString({ val: "abc", strict: true });
        }).to.throw(" is not numeric");
        (0, chai_1.expect)(() => {
            tools_1.tools.numericToString({ val: undefined, name: "number", strict: true });
        }).to.throw("number is undefined");
    });
    it('caseInsensitiveIncludes should return true if search element is included in the array ignoring case sensitivity', () => {
        const arr = ["Hello", "WORLD"];
        const searchElement = "world";
        const result = tools_1.tools.caseInsensitiveIncludes(arr, searchElement);
        chai_2.assert.isTrue(result);
    });
    it('caseInsensitiveIncludes should return false if search element is not included in the array', () => {
        const arr = ["Hello", "WORLD"];
        const searchElement = "Universe";
        const result = tools_1.tools.caseInsensitiveIncludes(arr, searchElement);
        chai_2.assert.isFalse(result);
    });
    it('getPropertyValue should return the value of an existing property', () => {
        const obj = { name: 'John', age: 30 };
        const name = tools_1.tools.getPropertyValue(obj, 'name');
        (0, chai_1.expect)(name).to.equal('John');
    });
    it('getPropertyValue should throw an error for a non-existing property', () => {
        const obj = { name: 'John', age: 30 };
        (0, chai_1.expect)(() => tools_1.tools.getPropertyValue(obj, 'address')).to.throw("Property 'address' does not exist in object");
    });
    it("toOrdinal return '1st' when given 1", () => {
        (0, chai_1.expect)(tools_1.tools.toOrdinal(1)).to.equal("1st");
    });
    it("toOrdinal return '2nd' when given 2", () => {
        (0, chai_1.expect)(tools_1.tools.toOrdinal(2)).to.equal("2nd");
    });
    it("toOrdinal return '3rd' when given 3", () => {
        (0, chai_1.expect)(tools_1.tools.toOrdinal(3)).to.equal("3rd");
    });
    it("toOrdinal return '4th' when given 4", () => {
        (0, chai_1.expect)(tools_1.tools.toOrdinal(4)).to.equal("4th");
    });
    it("toOrdinal return '5th' when given 5", () => {
        (0, chai_1.expect)(tools_1.tools.toOrdinal(5)).to.equal("5th");
    });
    it("toOrdinal return '11th' when given 11", () => {
        (0, chai_1.expect)(tools_1.tools.toOrdinal(11)).to.equal("11th");
    });
    it("toOrdinal return '21st' when given 21", () => {
        (0, chai_1.expect)(tools_1.tools.toOrdinal(21)).to.equal("21st");
    });
    it("toOrdinal return '22nd' when given 22", () => {
        (0, chai_1.expect)(tools_1.tools.toOrdinal(22)).to.equal("22nd");
    });
    it("toOrdinal return '111th' when given 111", () => {
        (0, chai_1.expect)(tools_1.tools.toOrdinal(111)).to.equal("111th");
    });
    it("toOrdinal return '112th' when given 112", () => {
        (0, chai_1.expect)(tools_1.tools.toOrdinal(112)).to.equal("112th");
    });
    it("toOrdinal return '113th' when given 113", () => {
        (0, chai_1.expect)(tools_1.tools.toOrdinal(113)).to.equal("113th");
    });
    it('percentageDifference should return the correct percentage difference', () => {
        const num1 = 100;
        const num2 = 110;
        const result = tools_1.tools.percentageDifference(num1, num2, "", 4);
        (0, chai_1.expect)(result).to.equal(0.1);
    });
    it('percentageDifference should return the correct negative percentage difference', () => {
        const num1 = 100;
        const num2 = 90;
        const result = tools_1.tools.percentageDifference(num1, num2, "", 4);
        (0, chai_1.expect)(result).to.equal(-0.1);
    });
    it('percentageDifference should throw an error for non-numeric input', () => {
        (0, chai_1.expect)(() => tools_1.tools.percentageDifference('abc', 100)).to.throw();
        (0, chai_1.expect)(() => tools_1.tools.percentageDifference(100, 'abc')).to.throw();
    });
    it('percentageDifference should return the correct percentage difference for numeric strings', () => {
        const num1 = '100';
        const num2 = '110';
        const result = tools_1.tools.percentageDifference(num1, num2, "", 4);
        (0, chai_1.expect)(result).to.equal(0.1);
    });
});
//# sourceMappingURL=tools.spec.js.map