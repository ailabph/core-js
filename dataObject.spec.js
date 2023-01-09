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
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
// @ts-ignore
const meta_options_1 = require("./build/meta_options");
const assert = __importStar(require("assert"));
const tools_1 = require("./tools");
const connection_1 = require("./connection");
let timeStamp = tools_1.tools.getCurrentTimeStamp();
tools_1.tools.BASE_DIR = "";
describe("dataObject spec orm", () => {
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        yield connection_1.connection.execute({ sql: "TRUNCATE TABLE meta_options" });
    }));
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield connection_1.connection.startTransaction();
    }));
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield connection_1.connection.rollback();
    }));
    it("dataObject test insert", () => __awaiter(void 0, void 0, void 0, function* () {
        let m = new meta_options_1.meta_options();
        assert.equal(m._isNew, true, "_isNew must be true");
        m.type = "test";
        m.tag = "tag_" + tools_1.tools.generateRandomNumber(1000, 9999);
        m.value = "value_" + tools_1.tools.generateRandomNumber(1000, 9999);
        m.time_updated = 0;
        m.updated_by = 0;
        yield m.save();
        assert.equal(m._isNew, false, "_isNew must be false");
    }));
    it("dataObject test query", () => __awaiter(void 0, void 0, void 0, function* () {
        let m = new meta_options_1.meta_options();
        m.type = "test";
        m.tag = "tag_" + tools_1.tools.generateRandomNumber(1000, 9999);
        m.value = "value_" + tools_1.tools.generateRandomNumber(1000, 9999);
        m.time_updated = 0;
        m.updated_by = 0;
        yield m.save();
        let check = new meta_options_1.meta_options();
        check.tag = m.tag;
        yield check.fetch();
        assert.equal(check.isNew(), false, "is not new");
        assert.equal(check.id, m.id, "id match");
        assert.equal(check.tag, m.tag, "tag match");
        assert.equal(check.value, m.value, "value match");
        let nonRecord = new meta_options_1.meta_options();
        nonRecord.tag = "non_tag_" + tools_1.tools.generateRandomNumber(1000, 9999);
        yield nonRecord.fetch();
        assert.equal(nonRecord.isNew(), true, "is new, record does not exist");
    }));
    it("dataObject test update", () => __awaiter(void 0, void 0, void 0, function* () {
        let m = new meta_options_1.meta_options();
        m.type = "test";
        m.tag = "tag_" + tools_1.tools.generateRandomNumber(1000, 9999);
        m.value = "value_" + tools_1.tools.generateRandomNumber(1000, 9999);
        m.time_updated = 0;
        m.updated_by = 0;
        yield m.save();
        (0, chai_1.expect)(m.id).greaterThan(0, `id(${m.id}) > 0`);
        m.tag = "new_tag_456";
        yield m.save();
        assert.equal(m.tag, "new_tag_456", "updated tag");
        let check = new meta_options_1.meta_options();
        check.id = m.id;
        yield check.fetch();
        assert.equal(check.recordExists(), true, `record exists with id:${m.id}`);
        assert.equal(m.value, check.value, "value match");
    }));
    it("dataObject test list", () => __awaiter(void 0, void 0, void 0, function* () {
        let tags = [];
        for (let i = 0; i < 5; i++) {
            let m = new meta_options_1.meta_options();
            m.type = "test";
            m.tag = "tag_" + tools_1.tools.generateRandomNumber(100000, 999999);
            m.value = "value_" + tools_1.tools.generateRandomNumber(100000, 999999);
            m.time_updated = 0;
            m.updated_by = 0;
            yield m.save();
            tags.push(m.tag);
        }
        let l = new meta_options_1.meta_options();
        yield l.list(" WHERE 1 ");
        assert.equal(l.count(), 5, "5 records");
        let x = new meta_options_1.meta_options();
        while (x = l.getItem()) {
            assert.equal(tags.includes(x.tag), true, `tag found in ${x.tag}`);
        }
    }));
    it("dataObject test delete", () => __awaiter(void 0, void 0, void 0, function* () {
        let m = new meta_options_1.meta_options();
        m.type = "test";
        m.tag = "tag_" + tools_1.tools.generateRandomNumber(100000, 999999);
        m.value = "value_" + tools_1.tools.generateRandomNumber(100000, 999999);
        m.time_updated = 0;
        m.updated_by = 0;
        yield m.save();
        let originalId = m.id;
        yield m.delete();
        let check = new meta_options_1.meta_options();
        check.id = originalId;
        yield check.fetch();
        assert.equal(check.isNew(), true, "record deleted, not on db");
    }));
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
    it("buildWhereParamForQuery", () => __awaiter(void 0, void 0, void 0, function* () {
        let m = new meta_options_1.meta_options();
        // m.id = 1;
        // m.tag = "tag_value";
        m.value = "value_123";
        m.type = "test";
        let result = m.buildWhereParamForQuery(false);
        console.log(result);
    }));
});
