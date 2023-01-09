import {assert, expect} from "chai";
import {tools} from "./tools";
import {connection, ResultSetHeader} from "./connection";
import {Connection, PoolConnection} from "mysql2/promise";

let timeStamp = tools.getCurrentTimeStamp();
tools.BASE_DIR = "";

describe("connection spec",()=>{

    afterEach(async()=>{
        await connection.execute({sql:" TRUNCATE TABLE meta_options "});
        connection.reset();
    });

    it("getConnection",async()=>{
        let result = await connection.getConnection() as PoolConnection;
        assert.equal(result.connection.config.database,"ailab_core");
    });

    it("getConnection transaction",async()=>{
        await connection.startTransaction();
        let result = await connection.getConnection() as Connection;
        assert.isNotEmpty(result.config.database);
    });

    it("insert and query",async()=>{
        timeStamp++;
        let result = await connection.execute({
            sql:"INSERT INTO meta_options (type,tag,value,updated_by,time_updated) VALUES (:type,:tag,:value,:updated_by,:time_updated)",
            param:{
                type:"test",
                tag:"tag_"+timeStamp,
                value:"value_"+timeStamp,
                updated_by:timeStamp,
                time_updated:timeStamp,
            }
        }) as ResultSetHeader;
        expect(result.insertId).greaterThan(0);
        let query_result = await connection.execute({ sql:"SELECT * FROM meta_options WHERE id=:id", param:{id:result.insertId} }) as any[];
        assert.isArray(query_result);
        expect(query_result[0]["tag"]).equal(`tag_${timeStamp}`);
    });

    it("rollback",async()=>{
        timeStamp++;
        await connection.startTransaction();
        await connection.execute({
            sql:"INSERT INTO meta_options (type,tag,value,updated_by,time_updated) VALUES (:type,:tag,:value,:updated_by,:time_updated)",
            param:{
                type:"test",
                tag: "tag_" + timeStamp,
                value: "value_" + timeStamp,
                updated_by: timeStamp,
                time_updated: timeStamp,
            }
        });
        await connection.rollback();
        let query_result = await connection.execute({sql:"SELECT * FROM meta_options WHERE 1"}) as any[];
        assert.isArray(query_result);
        expect(query_result.length).equal(0);
    });

    it("commit",async()=>{
        timeStamp++;
        await connection.startTransaction();
        await connection.execute({
            sql:"INSERT INTO meta_options (type,tag,value,updated_by,time_updated) VALUES (:type,:tag,:value,:updated_by,:time_updated) ",
            param:{
                type:"test",
                tag:"tag_"+timeStamp,
                value:"value_"+timeStamp,
                updated_by:timeStamp,
                time_updated:timeStamp,
            }
        });
        await connection.commit();
        let query_result = await connection.execute({sql:"SELECT * FROM meta_options WHERE 1 ORDER BY id DESC LIMIT 1"}) as any[];
        assert.isArray(query_result);
        expect(query_result.length).equal(1);
        expect(query_result[0]["tag"]).equal(`tag_${timeStamp}`);
    });

    it("bypass transaction",async()=>{
        /**
         * Scenario:
         * 1) start transaction
         * 2) insert using force_pool
         * 3) insert default
         * 4) expect 2 data inserted
         * 5) rollback
         * 6) expect 1 data remaining
         */

        await connection.startTransaction();

        // insert using force_pool
        timeStamp++;
        let insert_1 = await connection.execute({
            sql:"INSERT INTO meta_options (type,tag,value,updated_by,time_updated) VALUES (:type,:tag,:value,:updated_by,:time_updated) ",
            param:{
                type:"test",
                tag:"tag_"+timeStamp,
                value:"value_"+timeStamp,
                updated_by:timeStamp,
                time_updated:timeStamp,
            },
            force_pool:true
        }) as ResultSetHeader;

        // insert using default
        timeStamp++;
        let insert_2 = await connection.execute({
            sql:"INSERT INTO meta_options (type,tag,value,updated_by,time_updated) VALUES (:type,:tag,:value,:updated_by,:time_updated) ",
            param:{
                type:"test",
                tag:"tag_"+timeStamp,
                value:"value_"+timeStamp,
                updated_by:timeStamp,
                time_updated:timeStamp,
            }
        }) as ResultSetHeader;

        // check 2 records on db
        let query_result_1 = await connection.execute({
            sql:"SELECT * FROM meta_options WHERE 1",
        }) as any[];
        expect(query_result_1.length).equal(2,"expect 2 records on db before rollback");

        // rollback and check 1 records on db remain
        await connection.rollback();
        let query_result_2 = await connection.execute({
            sql:"SELECT * FROM meta_options WHERE 1",
        }) as any[];
        expect(query_result_2.length).equal(1,"expect 1 record on db after rollback");
    });

});