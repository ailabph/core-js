import {expect} from "chai";
import * as assert from "assert";
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

    it('stringFoundInStringOrArray should return true', () => {
        expect(tools.stringFoundInStringOrArray('hello','HE')).to.be.true;
        expect(tools.stringFoundInStringOrArray(['jane','doe'],'jan')).to.be.true;
    });

    it('stringFoundInStringOrArray should return false', () => {
        expect(tools.stringFoundInStringOrArray('hello','HELLOTHERE')).to.be.false;
        expect(tools.stringFoundInStringOrArray(['jane','doe'],'JANUARY')).to.be.false;
    });
});