"use strict";
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
const tools_1 = require("./tools");
const connection_1 = require("./connection");
let timeStamp = tools_1.tools.getCurrentTimeStamp();
describe("connection spec", () => {
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield connection_1.connection.execute({ sql: " TRUNCATE TABLE meta_options " });
        connection_1.connection.reset();
    }));
    it("getConnection", () => __awaiter(void 0, void 0, void 0, function* () {
        let result = yield connection_1.connection.getConnection();
        chai_1.assert.equal(result.connection.config.database, "ailab_core");
    }));
    it("getConnection transaction", () => __awaiter(void 0, void 0, void 0, function* () {
        yield connection_1.connection.startTransaction();
        let result = yield connection_1.connection.getConnection();
        chai_1.assert.isNotEmpty(result.config.database);
    }));
    it("insert and query", () => __awaiter(void 0, void 0, void 0, function* () {
        timeStamp++;
        let result = yield connection_1.connection.execute({
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
        let query_result = yield connection_1.connection.execute({ sql: "SELECT * FROM meta_options WHERE id=:id", param: { id: result.insertId } });
        chai_1.assert.isArray(query_result);
        (0, chai_1.expect)(query_result[0]["tag"]).equal(`tag_${timeStamp}`);
    }));
    it("rollback", () => __awaiter(void 0, void 0, void 0, function* () {
        timeStamp++;
        yield connection_1.connection.startTransaction();
        yield connection_1.connection.execute({
            sql: "INSERT INTO meta_options (type,tag,value,updated_by,time_updated) VALUES (:type,:tag,:value,:updated_by,:time_updated)",
            param: {
                type: "test",
                tag: "tag_" + timeStamp,
                value: "value_" + timeStamp,
                updated_by: timeStamp,
                time_updated: timeStamp,
            }
        });
        yield connection_1.connection.rollback();
        let query_result = yield connection_1.connection.execute({ sql: "SELECT * FROM meta_options WHERE 1" });
        chai_1.assert.isArray(query_result);
        (0, chai_1.expect)(query_result.length).equal(0);
    }));
    it("commit", () => __awaiter(void 0, void 0, void 0, function* () {
        timeStamp++;
        yield connection_1.connection.startTransaction();
        yield connection_1.connection.execute({
            sql: "INSERT INTO meta_options (type,tag,value,updated_by,time_updated) VALUES (:type,:tag,:value,:updated_by,:time_updated) ",
            param: {
                type: "test",
                tag: "tag_" + timeStamp,
                value: "value_" + timeStamp,
                updated_by: timeStamp,
                time_updated: timeStamp,
            }
        });
        yield connection_1.connection.commit();
        let query_result = yield connection_1.connection.execute({ sql: "SELECT * FROM meta_options WHERE 1 ORDER BY id DESC LIMIT 1" });
        chai_1.assert.isArray(query_result);
        (0, chai_1.expect)(query_result.length).equal(1);
        (0, chai_1.expect)(query_result[0]["tag"]).equal(`tag_${timeStamp}`);
    }));
    it("bypass transaction", () => __awaiter(void 0, void 0, void 0, function* () {
        /**
         * Scenario:
         * 1) start transaction
         * 2) insert using force_pool
         * 3) insert default
         * 4) expect 2 data inserted
         * 5) rollback
         * 6) expect 1 data remaining
         */
        yield connection_1.connection.startTransaction();
        // insert using force_pool
        timeStamp++;
        let insert_1 = yield connection_1.connection.execute({
            sql: "INSERT INTO meta_options (type,tag,value,updated_by,time_updated) VALUES (:type,:tag,:value,:updated_by,:time_updated) ",
            param: {
                type: "test",
                tag: "tag_" + timeStamp,
                value: "value_" + timeStamp,
                updated_by: timeStamp,
                time_updated: timeStamp,
            },
            force_pool: true
        });
        // insert using default
        timeStamp++;
        let insert_2 = yield connection_1.connection.execute({
            sql: "INSERT INTO meta_options (type,tag,value,updated_by,time_updated) VALUES (:type,:tag,:value,:updated_by,:time_updated) ",
            param: {
                type: "test",
                tag: "tag_" + timeStamp,
                value: "value_" + timeStamp,
                updated_by: timeStamp,
                time_updated: timeStamp,
            }
        });
        // check 2 records on db
        let query_result_1 = yield connection_1.connection.execute({
            sql: "SELECT * FROM meta_options WHERE 1",
        });
        (0, chai_1.expect)(query_result_1.length).equal(2, "expect 2 records on db before rollback");
        // rollback and check 1 records on db remain
        yield connection_1.connection.rollback();
        let query_result_2 = yield connection_1.connection.execute({
            sql: "SELECT * FROM meta_options WHERE 1",
        });
        (0, chai_1.expect)(query_result_2.length).equal(1, "expect 1 record on db after rollback");
    }));
});
