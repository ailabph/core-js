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
exports.connection = void 0;
const config_1 = require("./config");
const mysql = __importStar(require("mysql2/promise"));
const t = __importStar(require("io-ts"));
const d = __importStar(require("fp-ts/Either"));
const ResultSetHeaderCodec = t.type({
    fieldCount: t.number,
    affectedRows: t.number,
    insertId: t.number,
    info: t.string,
    serverStatus: t.number,
    warningStatus: t.number,
});
class connection {
    static getConfig() {
        return {
            connectionLimit: 10,
            user: config_1.config.getConfig().db_user,
            password: config_1.config.getConfig().db_pass,
            database: config_1.config.getConfig().db_name,
            host: config_1.config.getConfig().db_host,
            port: config_1.config.getConfig().db_port,
            namedPlaceholders: true,
        };
    }
    static setQueryConfig(conn) {
        if (typeof conn === "undefined")
            throw new Error("connection is undefined");
        conn.config.queryFormat = function (query, values) {
            if (!values) {
                return query;
            }
            return query.replace(/\:(\w+)/g, function (txt, key) {
                if (values.hasOwnProperty(key)) {
                    //@ts-ignore
                    return this.escape(values[key]);
                }
                return txt;
            }.bind(this));
        };
        return conn;
    }
    static async init() {
        await connection.initiatePoolConnection();
        await connection.initiateSingleConnection();
    }
    static async initiatePoolConnection() {
        if (typeof this.pool === "undefined") {
            this.pool = await mysql.createPool(this.getConfig());
        }
    }
    static async initiateSingleConnection() {
        if (typeof this.singleConnection === "undefined") {
            this.singleConnection = await mysql.createConnection(this.getConfig());
            this.singleConnection = this.setQueryConfig(this.singleConnection);
        }
    }
    static async getConnection(force_pool = false) {
        await this.init();
        if (force_pool || !this.inTransaction) {
            if (typeof this.pool === "undefined")
                throw new Error("pool not connected");
            if (typeof this.lastPoolConnection !== "undefined")
                return this.lastPoolConnection;
            this.lastPoolConnection = await this.pool.getConnection();
            this.lastPoolConnection = this.setQueryConfig(this.lastPoolConnection);
            return this.lastPoolConnection;
        }
        else {
            if (typeof this.singleConnection === "undefined") {
                throw new Error("singleConnection is undefined");
            }
            return this.singleConnection;
        }
    }
    static async execute({ sql, param = {}, force_pool = false }) {
        if (config_1.config.getConfig().verbose_sql_log)
            console.log(`retrieving connection`);
        let conn = await this.getConnection(force_pool);
        if (config_1.config.getConfig().verbose_sql_log)
            console.log(`connection retrieved, executing sql:${sql}`);
        let result = await conn.execute(sql, param);
        if (config_1.config.getConfig().verbose_sql_log)
            console.log(`query executed`);
        return result[0];
    }
    static async startTransaction() {
        if (this.inTransaction)
            throw new Error(`already in transaction`);
        this.inTransaction = true;
        await this.init();
        if (typeof this.singleConnection === "undefined") {
            throw new Error("singleConnection is undefined");
        }
        await this.singleConnection.beginTransaction();
    }
    static async commit() {
        if (!this.inTransaction)
            throw new Error("unable to commit, not in transaction mode");
        if (typeof this.singleConnection === "undefined")
            throw new Error("singleConnection is undefined");
        // this.singleConnection = await this.initiateSingleConnection();
        await this.singleConnection.commit();
        this.inTransaction = false;
    }
    static async rollback() {
        if (!this.inTransaction)
            throw new Error("unable to rollback, not in transaction mode");
        if (typeof this.singleConnection === "undefined")
            throw new Error("singleConnection is undefined");
        // this.singleConnection = await this.initiateSingleConnection();
        await this.singleConnection.rollback();
        this.inTransaction = false;
    }
    //#region PARSERS
    static parseResultSetHeader(result) {
        let decodedCodec = ResultSetHeaderCodec.decode(result);
        if (d.isRight(decodedCodec)) {
            return decodedCodec.right;
        }
        return false;
    }
    //#endregion END PARSERS
    //#region UTILITIES
    static reset() {
        this.pool = undefined;
        this.singleConnection = undefined;
    }
    //#endregion END UTILITIES
    //#region GETTERS
    static inTransactionMode() {
        return this.inTransaction;
    }
}
exports.connection = connection;
connection.inTransaction = false;
//# sourceMappingURL=connection.js.map