import {expect} from "chai";
// import * as assert from "assert";
import { assert } from 'chai';
import {tools} from "./tools";
const u = require("underscore");

describe("tools spec",()=>{
    it("isset return true", () => {
        let obj = {name:"bob"};
        let result = tools.isset(obj,"name");
        assert.equal(result,true,"property exist");
    });
    it("isset return false", () => {
        let obj = {};
        let result = tools.isset(obj,"name");
        assert.equal(result,false,"property does not exist");
    });
    it("isEmpty return true",()=>{
        assert.equal(tools.isEmpty(''),true);
        assert.equal(tools.isEmpty([]),true);
        assert.equal(tools.isEmpty({}),true);
        assert.equal(tools.isEmpty(null),true);
        assert.equal(tools.isEmpty(undefined),true);
        assert.equal(tools.isEmpty(0),true);
    });
    it("isEmpty return false",()=>{
        assert.equal(tools.isEmpty(-1),false);
        assert.equal(tools.isEmpty(1),false);
        assert.equal(tools.isEmpty('hello'),false);
        assert.equal(tools.isEmpty([1, 2, 3]),false);
        assert.equal(tools.isEmpty({ a: 1, b: 2 }),false);
    });
    it("isWholeNumber return true",()=>{
        expect(tools.isWholeNumber(1)).to.be.true;
        expect(tools.isWholeNumber("123")).to.be.true;
        expect(tools.isWholeNumber("-456")).to.be.true;
    });
    it("isWholeNumber return false",()=>{
        expect(tools.isWholeNumber(1.123)).to.be.false;
        expect(tools.isWholeNumber("123.456")).to.be.false;
        expect(tools.isWholeNumber("-456.789")).to.be.false;
        expect(tools.isWholeNumber("abc")).to.be.false;
    });
    it("convertArrayOfStringToString array",()=>{
        let x = ["a","b","c"];
        assert.equal(tools.convertArrayOfStringToString(x,",",""),"a,b,c");
    });
    it("convertArrayOfStringToString object",()=>{
        let x = {name:"bob",age:23};
        assert.equal(tools.convertArrayOfStringToString(x,",","",true),`name:"bob", age:"23"`);
    });
    it("import object values",()=>{
        let x = {name:"bob",age:23};
        let y = {name:"jane",address:"street"};
        x = tools.importObjectValuesInto(y,x);
        assert.equal(x.name,"jane");
        assert.equal((x as any)['address'],undefined);
    });

    it('isNumeric should return true for numeric values', () => {
        expect(tools.isNumeric(5)).to.be.true;
        expect(tools.isNumeric(-3.14)).to.be.true;
        expect(tools.isNumeric('5')).to.be.true;
        expect(tools.isNumeric('123')).to.be.true;
    });

    it('isNumeric should return false for non-numeric values', () => {
        expect(tools.isNumeric('hello')).to.be.false;
        expect(tools.isNumeric('0x10e6d5099c5')).to.be.false;
        expect(tools.isNumeric('0x')).to.be.false;
        expect(tools.isNumeric([1, 2, 3])).to.be.false;
        expect(tools.isNumeric({})).to.be.false;
    });

    it('parseInt should return an integer for numeric values', () => {
        expect(tools.parseInt({val:3,strict:true})).to.be.equal(3);
        expect(tools.parseInt({val:'5',strict:true})).to.be.equal(5);
        expect(tools.parseInt({val:'123',strict:true})).to.be.equal(123);
    });

    it('parseInt should return an integer for numeric non whole number', () => {
        expect(tools.parseInt({val:3.1,strict:false})).to.be.equal(3);
        expect(tools.parseInt({val:'5.12',strict:false})).to.be.equal(5);
        expect(tools.parseInt({val:'-3.14',strict:false})).to.be.equal(-3);
    });
    it('parseInt should throw an error', () => {
        expect(()=>{tools.parseInt({val: "abc", strict: true})}).to.throw(" is not numeric");
        expect(()=>{tools.parseInt({val: {name:"abc"}, strict: true})}).to.throw(" is not numeric");
        expect(()=>{tools.parseInt({val: '5.12', strict: true})}).to.throw(" is not a whole number");

    });

    it('stringFoundInStringOrArray should return true', () => {
        expect(tools.stringFoundInStringOrArray('hello','HE')).to.be.true;
        expect(tools.stringFoundInStringOrArray(['jane','doe'],'jan')).to.be.true;
    });

    it('stringFoundInStringOrArray should return false', () => {
        expect(tools.stringFoundInStringOrArray('hello','HELLOTHERE')).to.be.false;
        expect(tools.stringFoundInStringOrArray(['jane','doe'],'JANUARY')).to.be.false;
    });

    it('numericToString should return a numeric string', () => {
        expect(tools.numericToString({val:123,dec:18})).to.be.string("123.000000000000000000");
        expect(tools.numericToString({val:"456.1234567890",dec:8})).to.be.string("456.12345678");
    });
    it('numericToString should return a zero', () => {
        expect(tools.numericToString({val:"abc",strict:false})).to.be.string("0.00");
        expect(tools.numericToString({val:{name:"john",age:23},strict:false})).to.be.string("0.00");
    });
    it('numericToString should throws error', () => {
        expect(()=> {
            tools.numericToString({val: "abc", strict: true})
        }).to.throw(" is not numeric");
        expect(()=> {
            tools.numericToString({val: undefined,name:"number", strict: true})
        }).to.throw("number is undefined");
    });

    it('caseInsensitiveIncludes should return true if search element is included in the array ignoring case sensitivity', () => {
        const arr = ["Hello", "WORLD"];
        const searchElement = "world";
        const result = tools.caseInsensitiveIncludes(arr, searchElement);

        assert.isTrue(result);
    });

    it('caseInsensitiveIncludes should return false if search element is not included in the array', () => {
        const arr = ["Hello", "WORLD"];
        const searchElement = "Universe";
        const result = tools.caseInsensitiveIncludes(arr, searchElement);

        assert.isFalse(result);
    });

    it('getPropertyValue should return the value of an existing property', () => {
        const obj = { name: 'John', age: 30 };
        const name: string = tools.getPropertyValue<string>(obj, 'name');
        expect(name).to.equal('John');
    });

    it('getPropertyValue should throw an error for a non-existing property', () => {
        const obj = { name: 'John', age: 30 };
        expect(() => tools.getPropertyValue<string>(obj, 'address')).to.throw(
            "Property 'address' does not exist in object"
        );
    });

    it("toOrdinal return '1st' when given 1", () => {
        expect(tools.toOrdinal(1)).to.equal("1st");
    });

    it("toOrdinal return '2nd' when given 2", () => {
        expect(tools.toOrdinal(2)).to.equal("2nd");
    });

    it("toOrdinal return '3rd' when given 3", () => {
        expect(tools.toOrdinal(3)).to.equal("3rd");
    });

    it("toOrdinal return '4th' when given 4", () => {
        expect(tools.toOrdinal(4)).to.equal("4th");
    });

    it("toOrdinal return '5th' when given 5", () => {
        expect(tools.toOrdinal(5)).to.equal("5th");
    });

    it("toOrdinal return '11th' when given 11", () => {
        expect(tools.toOrdinal(11)).to.equal("11th");
    });

    it("toOrdinal return '21st' when given 21", () => {
        expect(tools.toOrdinal(21)).to.equal("21st");
    });

    it("toOrdinal return '22nd' when given 22", () => {
        expect(tools.toOrdinal(22)).to.equal("22nd");
    });

    it("toOrdinal return '111th' when given 111", () => {
        expect(tools.toOrdinal(111)).to.equal("111th");
    });

    it("toOrdinal return '112th' when given 112", () => {
        expect(tools.toOrdinal(112)).to.equal("112th");
    });

    it("toOrdinal return '113th' when given 113", () => {
        expect(tools.toOrdinal(113)).to.equal("113th");
    });
});