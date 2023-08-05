"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const tools_1 = require("../tools");
const connection_1 = require("../connection");
const meta_options_1 = require("../build/meta_options");
let timeStamp = tools_1.tools.getCurrentTimeStamp();
describe("connection spec", () => {
    afterEach(async () => {
        await connection_1.connection.execute({ sql: " TRUNCATE TABLE meta_options " });
        connection_1.connection.reset();
    });
    it("getConnection", async () => {
        let result = await connection_1.connection.getConnection();
        chai_1.assert.isNotEmpty(result.connection.config.database ?? "");
    });
    it("getConnection transaction", async () => {
        await connection_1.connection.startTransaction();
        let result = await connection_1.connection.getConnection();
        chai_1.assert.isNotEmpty(result.config.database);
        await connection_1.connection.rollback();
    });
    it("insert and query", async () => {
        timeStamp++;
        let result = await connection_1.connection.execute({
            sql: "INSERT INTO meta_options (type,tag,value,updated_by,time_updated) VALUES (:type,:tag,:value,:updated_by,:time_updated)",
            param: {
                type: "test",
                tag: "tag_" + timeStamp,
                value: "value_" + timeStamp,
                updated_by: timeStamp,
                time_updated: timeStamp,
            }
        });
        (0, chai_1.expect)(result.insertId).greaterThan(0);
        let query_result = await connection_1.connection.execute({ sql: "SELECT * FROM meta_options WHERE id=:id", param: { id: result.insertId } });
        chai_1.assert.isArray(query_result);
        (0, chai_1.expect)(query_result[0]["tag"]).equal(`tag_${timeStamp}`);
    });
    it("rollback", async () => {
        timeStamp++;
        await connection_1.connection.startTransaction();
        await connection_1.connection.execute({
            sql: "INSERT INTO meta_options (type,tag,value,updated_by,time_updated) VALUES (:type,:tag,:value,:updated_by,:time_updated)",
            param: {
                type: "test",
                tag: "tag_" + timeStamp,
                value: "value_" + timeStamp,
                updated_by: timeStamp,
                time_updated: timeStamp,
            }
        });
        await connection_1.connection.rollback();
        let query_result = await connection_1.connection.execute({ sql: "SELECT * FROM meta_options WHERE 1" });
        chai_1.assert.isArray(query_result);
        (0, chai_1.expect)(query_result.length).equal(0);
    });
    it("commit", async () => {
        timeStamp++;
        await connection_1.connection.startTransaction();
        await connection_1.connection.execute({
            sql: "INSERT INTO meta_options (type,tag,value,updated_by,time_updated) VALUES (:type,:tag,:value,:updated_by,:time_updated) ",
            param: {
                type: "test",
                tag: "tag_" + timeStamp,
                value: "value_" + timeStamp,
                updated_by: timeStamp,
                time_updated: timeStamp,
            }
        });
        await connection_1.connection.commit();
        let query_result = await connection_1.connection.execute({ sql: "SELECT * FROM meta_options WHERE 1 ORDER BY id DESC LIMIT 1" });
        chai_1.assert.isArray(query_result);
        (0, chai_1.expect)(query_result.length).equal(1);
        (0, chai_1.expect)(query_result[0]["tag"]).equal(`tag_${timeStamp}`);
    });
    it("bypass transaction", async () => {
        /**
         * Scenario:
         * 1) start transaction
         * 2) insert using force_pool
         * 3) insert default
         * 4) expect 2 data inserted
         * 5) rollback
         * 6) expect 1 data remaining
         */
        await connection_1.connection.startTransaction();
        // insert using force_pool
        timeStamp++;
        const insert_1_tag = `tag1_${tools_1.tools.generateRandomNumber(1000, 9999)}`;
        const insert_1_value = `value1_${tools_1.tools.generateRandomNumber(1000, 9999)}`;
        let insert_1 = await connection_1.connection.execute({
            sql: "INSERT INTO meta_options (type,tag,value,updated_by,time_updated) VALUES (:type,:tag,:value,:updated_by,:time_updated) ",
            param: {
                type: "test",
                tag: insert_1_tag,
                value: insert_1_value,
                updated_by: timeStamp,
                time_updated: timeStamp,
            },
            force_pool: true
        });
        // insert using default
        timeStamp++;
        const insert_2_tag = `tag2_${tools_1.tools.generateRandomNumber(1000, 9999)}`;
        const insert_2_value = `value2_${tools_1.tools.generateRandomNumber(1000, 9999)}`;
        let insert_2 = await connection_1.connection.execute({
            sql: "INSERT INTO meta_options (type,tag,value,updated_by,time_updated) VALUES (:type,:tag,:value,:updated_by,:time_updated) ",
            param: {
                type: "test",
                tag: insert_2_tag,
                value: insert_2_value,
                updated_by: timeStamp,
                time_updated: timeStamp,
            }
        });
        // check 2 records on db
        let query_result_1 = await connection_1.connection.execute({
            sql: "SELECT * FROM meta_options WHERE 1",
        });
        (0, chai_1.expect)(query_result_1.length).equal(2, "expect 2 records on db before rollback");
        // rollback and check 1 records on db remain
        await connection_1.connection.rollback();
        let query_result_2 = await connection_1.connection.execute({
            sql: "SELECT * FROM meta_options WHERE 1",
        });
        (0, chai_1.expect)(query_result_2.length).equal(1, "expect 1 record on db after rollback");
        let check = new meta_options_1.meta_options();
        await check.list(" WHERE 1 ");
        check = check.getItem();
        (0, chai_1.expect)(check.tag).equal(insert_1_tag, "tag");
    });
});
//# sourceMappingURL=connection.spec.js.map