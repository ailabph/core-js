import {expect} from "chai";
// import * as assert from "assert";
import { assert } from 'chai';
import {tools} from "../tools";
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

    it('percentageDifference should return the correct percentage difference', () => {
        const num1 = 100;
        const num2 = 110;
        const result = tools.percentageDifference(num1, num2, "",4);
        expect(result).to.equal(0.1);
    });

    it('percentageDifference should return the correct negative percentage difference', () => {
        const num1 = 100;
        const num2 = 90;
        const result = tools.percentageDifference(num1, num2, "",4);
        expect(result).to.equal(-0.1);
    });

    it('percentageDifference should throw an error for non-numeric input', () => {
        expect(() => tools.percentageDifference('abc', 100)).to.throw();
        expect(() => tools.percentageDifference(100, 'abc')).to.throw();
    });

    it('percentageDifference should return the correct percentage difference for numeric strings', () => {
        const num1 = '100';
        const num2 = '110';
        const result = tools.percentageDifference(num1, num2, "",4);
        expect(result).to.equal(0.1);
    });
});


describe('stringModifier', () => {
    it('replaces placeholders with corresponding keys', () => {
        const template = 'Hello {{name}}, you are {{age}} years old.';
        const keys = {name: 'Bob', age: 26.123456789};
        expect(tools.stringModifier(template, keys)).to.equal('Hello Bob, you are 26.123457 years old.');
    });

    it('throws an error when a placeholder has not been replaced', () => {
        const template = 'Hello {{name}}, you are {{age}} years old.';
        const keys = {name: 'Bob'};
        expect(() => tools.stringModifier(template, keys)).to.throw('All placeholders have not been replaced');
    });
});

test('validates contact numbers', () => {
    expect(tools.isValidContactNumber('+639171234567')).to.equal('+639171234567');
    expect(tools.isValidContactNumber('09171234567')).to.equal('09171234567');
    expect(tools.isValidContactNumber('+63(917)1234567')).to.equal('+63(917)1234567');
    expect(tools.isValidContactNumber('0917-123-1234')).to.equal('0917-123-1234');
    expect(tools.isValidContactNumber('123456')).to.equal(false);
    expect(tools.isValidContactNumber('abc')).to.equal(false);
    expect(tools.isValidContactNumber(null)).to.equal(false);
    expect(tools.isValidContactNumber(undefined)).to.equal(false);
});

describe('tools.check_properties_not_empty', () => {
    it('should throw an error if a property does not exist', () => {
        expect(() => tools.check_properties_not_empty({}, ['missingProperty'])).to.throw('Property missingProperty does not exist');
    });

    it('should throw an error if a string property is empty', () => {
        expect(() => tools.check_properties_not_empty({ emptyString: '' }, ['emptyString'])).to.throw('Property emptyString must have a value');
    });

    it('should throw an error if a string property is null', () => {
        expect(() => tools.check_properties_not_empty({ nullString: 'null' }, ['nullString'])).to.throw('Property nullString must have a value');
    });

    it('should throw an error if a date property is not a valid date string', () => {
        expect(() => tools.check_properties_not_empty({ date: 'invalidDate' }, ['date'])).to.throw('Property date must be a valid date string');
    });

    it('should throw an error if a time property is not a numeric string', () => {
        expect(() => tools.check_properties_not_empty({ time: 'notNumeric' }, ['time'])).to.throw('Property time must be a numeric string and greater than 0');
    });

    it('should throw an error if a number property is not greater than 0', () => {
        expect(() => tools.check_properties_not_empty({ number: 0 }, ['number'])).to.throw('Property number must be greater than 0');
    });

    it('should throw an error if a perc number property is not greater than 0', () => {
        expect(() => tools.check_properties_not_empty({ sample_perc: 0 }, ['sample_perc'])).to.throw('Property sample_perc must be greater than 0');
    });

    it('should return true if all properties are valid', () => {
        expect(tools.check_properties_not_empty({ validString: 'value', validNumber: 1, validDate: '2022-01-01', validTime1: '1', validTime2:2, validBonus1:'1', validBonus2:2 }, ['validString', 'validNumber', 'validDate', 'validTime1', 'validTime2', 'validBonus1', 'validBonus2'])).to.equal(true);
    });
});

describe('tools', () => {
    describe('copy_values', () => {
        it('should copy values from one object to another based on the provided property list', () => {
            const copy_from = { a: 1, b: 2, c: 3 };
            const copy_to = { a: 0, b: 0, d: 0 };
            const prop_list = ['a', 'b'];
            tools.copy_values(copy_from, copy_to, prop_list);
            expect(copy_to).to.deep.equal({ a: 1, b: 2, d: 0 });
        });

        it('should not modify the original objects', () => {
            const copy_from = { a: 1, b: 2, c: 3 };
            const copy_to = { a: 0, b: 0, d: 0 };
            const prop_list = ['a', 'b'];
            tools.copy_values(copy_from, copy_to, prop_list);
            expect(copy_from).to.deep.equal({ a: 1, b: 2, c: 3 });
            expect(copy_to).to.deep.equal({ a: 1, b: 2, d: 0 });
        });

        it('should throw an error if either copy_from does not contain the property', () => {
            const copy_from = { a: 1, b: 2, c: 3 };
            const copy_to = { a: 0, b: 0, d: 0 };
            const prop_list = ['e'];
            expect(()=>{tools.copy_values(copy_from,copy_to,prop_list)}).to.throw('|copy_from does not contain property e');
        });

        it('should throw an error if either copy_to does not contain the property', () => {
            const copy_from = { a: 1, b: 2, c: 3, f:4 };
            const copy_to = { a: 0, b: 0, d: 0 };
            const prop_list = ['f'];
            expect(()=>{tools.copy_values(copy_from,copy_to,prop_list)}).to.throw('|copy_to does not contain property f');
        });
    });
});

describe('compareObjects', () => {
    it('should throw an error if at least one property value does not match', () => {
        const obj1 = { name: 'bob', age: 24 };
        const obj2 = { name: 'alice', age: 24 };
        const props = ['name', 'age'];
        expect(() => tools.compare_objects(obj1, obj2, props)).to.throw('|Value mismatch found in property name');
    });

    it('should throw an error if at least one property type does not match', () => {
        const obj1 = { name: 'bob', age: 24 };
        const obj2 = { name: 'bob', age: '24' };
        const props = ['name', 'age'];
        expect(() => tools.compare_objects(obj1, obj2, props)).to.throw('|Type mismatch found in property age');
    });

    it('should not throw an error if all properties match', () => {
        const obj1 = { name: 'bob', age: 24 };
        const obj2 = { name: 'bob', age: 24 };
        const props = ['name', 'age'];
        expect(() => tools.compare_objects(obj1, obj2, props)).not.to.throw();
    });
});