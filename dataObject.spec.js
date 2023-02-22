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
const meta_options_1 = require("./build/meta_options");
const assert = __importStar(require("assert"));
const connection_1 = require("./connection");
const tools_1 = require("./tools");
let timeStamp = tools_1.tools.getCurrentTimeStamp();
describe("dataObject spec orm", () => {
    before(async () => {
        await connection_1.connection.execute({ sql: "TRUNCATE TABLE meta_options" });
    });
    beforeEach(async () => {
        await connection_1.connection.startTransaction();
    });
    afterEach(async () => {
        await connection_1.connection.rollback();
    });
    it("dataObject test insert", async () => {
        let m = new meta_options_1.meta_options();
        assert.equal(m._isNew, true, "_isNew must be true");
        m.type = "test";
        m.tag = "tag_" + tools_1.tools.generateRandomNumber(1000, 9999);
        m.value = "value_" + tools_1.tools.generateRandomNumber(1000, 9999);
        m.time_updated = 0;
        m.updated_by = 0;
        await m.save();
        assert.equal(m._isNew, false, "_isNew must be false");
    });
    it("dataObject test query", async () => {
        let m = new meta_options_1.meta_options();
        m.type = "test";
        m.tag = "tag_" + tools_1.tools.generateRandomNumber(1000, 9999);
        m.value = "value_" + tools_1.tools.generateRandomNumber(1000, 9999);
        m.time_updated = 0;
        m.updated_by = 0;
        await m.save();
        let check = new meta_options_1.meta_options();
        check.tag = m.tag;
        await check.fetch();
        assert.equal(check.isNew(), false, "is not new");
        assert.equal(check.id, m.id, "id match");
        assert.equal(check.tag, m.tag, "tag match");
        assert.equal(check.value, m.value, "value match");
        let nonRecord = new meta_options_1.meta_options();
        nonRecord.tag = "non_tag_" + tools_1.tools.generateRandomNumber(1000, 9999);
        await nonRecord.fetch();
        assert.equal(nonRecord.isNew(), true, "is new, record does not exist");
    });
    it("dataObject test update", async () => {
        let m = new meta_options_1.meta_options();
        m.type = "test";
        m.tag = "tag_" + tools_1.tools.generateRandomNumber(1000, 9999);
        m.value = "value_" + tools_1.tools.generateRandomNumber(1000, 9999);
        m.time_updated = 0;
        m.updated_by = 0;
        await m.save();
        (0, chai_1.expect)(m.id).greaterThan(0, `id(${m.id}) > 0`);
        m.tag = "new_tag_456";
        await m.save();
        assert.equal(m.tag, "new_tag_456", "updated tag");
        let check = new meta_options_1.meta_options();
        check.id = m.id;
        await check.fetch();
        assert.equal(check.recordExists(), true, `record exists with id:${m.id}`);
        assert.equal(m.value, check.value, "value match");
    });
    it("dataObject test list", async () => {
        let tags = [];
        for (let i = 0; i < 5; i++) {
            let m = new meta_options_1.meta_options();
            m.type = "test";
            m.tag = "tag_" + tools_1.tools.generateRandomNumber(100000, 999999);
            m.value = "value_" + tools_1.tools.generateRandomNumber(100000, 999999);
            m.time_updated = 0;
            m.updated_by = 0;
            await m.save();
            tags.push(m.tag);
        }
        let l = new meta_options_1.meta_options();
        await l.list(" WHERE 1 ");
        assert.equal(l.count(), 5, "5 records");
        let x = new meta_options_1.meta_options();
        while (x = l.getItem()) {
            assert.equal(tags.includes(x.tag), true, `tag found in ${x.tag}`);
        }
    });
    it("dataObject test delete", async () => {
        let m = new meta_options_1.meta_options();
        m.type = "test";
        m.tag = "tag_" + tools_1.tools.generateRandomNumber(100000, 999999);
        m.value = "value_" + tools_1.tools.generateRandomNumber(100000, 999999);
        m.time_updated = 0;
        m.updated_by = 0;
        await m.save();
        let originalId = m.id;
        await m.delete();
        let check = new meta_options_1.meta_options();
        check.id = originalId;
        await check.fetch();
        assert.equal(check.isNew(), true, "record deleted, not on db");
    });
});
describe("dataObject spec transaction", () => {
    it("dataObject test commit", async () => {
        await connection_1.connection.startTransaction();
        const meta = new meta_options_1.meta_options();
        const tag = `tag_${tools_1.tools.generateRandomNumber(1000, 9999)}`;
        const value = `value_${tools_1.tools.generateRandomNumber(1000, 9999)}`;
        meta.tag = tag;
        meta.value = value;
        await meta.save();
        await connection_1.connection.commit();
        const check = new meta_options_1.meta_options();
        check.tag = tag;
        await check.fetch();
        assert.equal(check.value, value, "expected value");
        await check.delete(true);
    });
    it("dataObject test rollback", async () => {
        await connection_1.connection.startTransaction();
        const meta = new meta_options_1.meta_options();
        const tag = `tag_${tools_1.tools.generateRandomNumber(1000, 9999)}`;
        const value = `value_${tools_1.tools.generateRandomNumber(1000, 9999)}`;
        meta.tag = tag;
        meta.value = value;
        await meta.save();
        const check = new meta_options_1.meta_options();
        check.tag = tag;
        await check.fetch();
        assert.equal(check.value, value, "expected value before rollback");
        await connection_1.connection.rollback();
        const check2 = new meta_options_1.meta_options();
        check2.tag = tag;
        await check2.fetch();
        assert.equal(check2.isNew(), true, "record should not exist on db");
    });
    it("dataObject test bypass transaction", async () => {
        await connection_1.connection.startTransaction();
        const tag1 = `tag1_${tools_1.tools.generateRandomNumber(1000, 9999)}`;
        const value1 = `value1_${tools_1.tools.generateRandomNumber(1000, 9999)}`;
        const meta1 = new meta_options_1.meta_options();
        meta1.tag = tag1;
        meta1.value = value1;
        await meta1.save();
        const tag2 = `tag2_${tools_1.tools.generateRandomNumber(1000, 9999)}`;
        const value2 = `value2_${tools_1.tools.generateRandomNumber(1000, 9999)}`;
        const meta2 = new meta_options_1.meta_options(true);
        meta2.tag = tag2;
        meta2.value = value2;
        await meta2.save();
        await connection_1.connection.rollback();
        const check1 = new meta_options_1.meta_options();
        check1.tag = tag1;
        await check1.fetch();
        assert.equal(check1.isNew(), true, `tag1:${tag1} should not exist`);
        const check2 = new meta_options_1.meta_options();
        check2.tag = tag2;
        await check2.fetch();
        assert.equal(check2.value, value2, `value2:${value2} should persist after rollback`);
    });
});
describe("dataObject spec methods", () => {
    it("propertyExists returns true", () => {
        let m = new meta_options_1.meta_options();
        let result = m.propertyExists("tag");
        assert.equal(result, true, "has tag property");
    });
    it("propertyExists throws error", () => {
        let m = new meta_options_1.meta_options();
        try {
            m.propertyExists("age");
        }
        catch (err) {
            assert.ok(err instanceof Error);
        }
    });
    // it("getDefault",()=>{
    //     let m = new meta_options();
    //     let default_value = m.getDefault("type");
    //     assert.equal(default_value,"default_value");
    // });
    //
    // it("getOrig",()=>{
    //     let m = new meta_options();
    //     let orig_value = m.getOrig("type");
    //     assert.equal(orig_value,"orig_value");
    // });
    it("buildWhereParamForQuery", async () => {
        let m = new meta_options_1.meta_options();
        // m.id = 1;
        // m.tag = "tag_value";
        m.value = "value_123";
        m.type = "test";
        let result = m.buildWhereParamForQuery(false);
        console.log(result);
    });
});
//# sourceMappingURL=dataObject.spec.js.map