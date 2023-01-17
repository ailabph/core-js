import {expect} from "chai";
// @ts-ignore
import {meta_options} from "./build/meta_options";
import * as assert from "assert";
import {tools} from "./tools";
import {connection} from "./connection";

let timeStamp = tools.getCurrentTimeStamp();

describe("dataObject spec orm",()=>{
    before(async ()=>{
        await connection.execute({sql:"TRUNCATE TABLE meta_options"});
    });

    beforeEach(async ()=>{
        await connection.startTransaction();
    });

    afterEach(async ()=>{
        await connection.rollback();
    });

    it("dataObject test insert", async()=>{
        let m = new meta_options();
        assert.equal(m._isNew, true,"_isNew must be true");
        m.type = "test";
        m.tag = "tag_"+tools.generateRandomNumber(1000,9999);
        m.value = "value_"+tools.generateRandomNumber(1000,9999);
        m.time_updated = 0;
        m.updated_by = 0;
        await m.save();
        assert.equal(m._isNew,false,"_isNew must be false");
    });

    it("dataObject test query", async()=>{
        let m = new meta_options();
        m.type = "test";
        m.tag = "tag_"+tools.generateRandomNumber(1000,9999);
        m.value = "value_"+tools.generateRandomNumber(1000,9999);
        m.time_updated = 0;
        m.updated_by = 0;
        await m.save();

        let check = new meta_options();
        check.tag = m.tag;
        await check.fetch();
        assert.equal(check.isNew(),false,"is not new");
        assert.equal(check.id,m.id,"id match");
        assert.equal(check.tag,m.tag,"tag match");
        assert.equal(check.value,m.value,"value match");

        let nonRecord = new meta_options();
        nonRecord.tag = "non_tag_"+tools.generateRandomNumber(1000,9999);
        await nonRecord.fetch();
        assert.equal(nonRecord.isNew(),true,"is new, record does not exist");
    });

    it("dataObject test update", async()=>{
        let m = new meta_options();
        m.type = "test";
        m.tag = "tag_"+tools.generateRandomNumber(1000,9999);
        m.value = "value_"+tools.generateRandomNumber(1000,9999);
        m.time_updated = 0;
        m.updated_by = 0;
        await m.save();
        expect(m.id).greaterThan(0,`id(${m.id}) > 0`);

        m.tag = "new_tag_456";
        await m.save();
        assert.equal(m.tag,"new_tag_456","updated tag");

        let check = new meta_options();
        check.id = m.id;
        await check.fetch();
        assert.equal(check.recordExists(),true,`record exists with id:${m.id}`);
        assert.equal(m.value,check.value,"value match");
    });

    it("dataObject test list",async()=>{
        let tags = [];
        for(let i=0; i<5; i++){
            let m = new meta_options();
            m.type = "test";
            m.tag = "tag_"+tools.generateRandomNumber(100000,999999);
            m.value = "value_"+tools.generateRandomNumber(100000,999999);
            m.time_updated = 0;
            m.updated_by = 0;
            await m.save();
            tags.push(m.tag);
        }
        let l = new meta_options();
        await l.list(" WHERE 1 ");
        assert.equal(l.count(),5,"5 records");
        let x = new meta_options();
        while(x = l.getItem()){
            assert.equal(tags.includes(x.tag as string),true,`tag found in ${x.tag}`);
        }
    });

    it("dataObject test delete",async()=>{
        let m = new meta_options();
        m.type = "test";
        m.tag = "tag_"+tools.generateRandomNumber(100000,999999);
        m.value = "value_"+tools.generateRandomNumber(100000,999999);
        m.time_updated = 0;
        m.updated_by = 0;
        await m.save();
        let originalId = m.id;

        await m.delete();
        let check = new meta_options();
        check.id = originalId;
        await check.fetch();

        assert.equal(check.isNew(),true,"record deleted, not on db");
    });
});

describe("dataObject spec methods",()=>{

    it("propertyExists returns true",()=>{
        let m = new meta_options();
        let result = m.propertyExists("tag");
        assert.equal(result,true,"has tag property");
    });

    it("propertyExists throws error",()=>{
        let m = new meta_options();
        try{
            m.propertyExists("age");
        }catch(err){
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

    it("buildWhereParamForQuery",async ()=>{
        let m = new meta_options();
        // m.id = 1;
        // m.tag = "tag_value";
        m.value = "value_123";
        m.type = "test";
        let result = m.buildWhereParamForQuery(false);
        console.log(result);
    });
});

