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
    static init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield connection.initiatePoolConnection();
            yield connection.initiateSingleConnection();
        });
    }
    static initiatePoolConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof this.pool === "undefined") {
                this.pool = yield mysql.createPool(this.getConfig());
            }
        });
    }
    static initiateSingleConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof this.singleConnection === "undefined") {
                this.singleConnection = yield mysql.createConnection(this.getConfig());
                this.singleConnection = this.setQueryConfig(this.singleConnection);
            }
        });
    }
    static getConnection(force_pool = false) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.init();
            if (force_pool || !this.inTransaction) {
                if (typeof this.pool === "undefined")
                    throw new Error("pool not connected");
                if (typeof this.lastPoolConnection !== "undefined")
                    return this.lastPoolConnection;
                this.lastPoolConnection = yield this.pool.getConnection();
                this.lastPoolConnection = this.setQueryConfig(this.lastPoolConnection);
                return this.lastPoolConnection;
            }
            else {
                if (typeof this.singleConnection === "undefined") {
                    throw new Error("singleConnection is undefined");
                }
                return this.singleConnection;
            }
        });
    }
    static execute({ sql, param = {}, force_pool = false }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (config_1.config.getConfig().verbose_log)
                console.log(`retrieving connection`);
            let conn = yield this.getConnection(force_pool);
            if (config_1.config.getConfig().verbose_log)
                console.log(`connection retrieved, executing sql:${sql}`);
            let result = yield conn.execute(sql, param);
            if (config_1.config.getConfig().verbose_log)
                console.log(`query executed`);
            return result[0];
        });
    }
    static startTransaction() {
        return __awaiter(this, void 0, void 0, function* () {
            this.inTransaction = true;
            yield this.init();
            if (typeof this.singleConnection === "undefined") {
                throw new Error("singleConnection is undefined");
            }
            yield this.singleConnection.beginTransaction();
        });
    }
    static commit() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.inTransaction)
                throw new Error("unable to commit, not in transaction mode");
            if (typeof this.singleConnection === "undefined")
                throw new Error("singleConnection is undefined");
            // this.singleConnection = await this.initiateSingleConnection();
            yield this.singleConnection.commit();
        });
    }
    static rollback() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.inTransaction)
                throw new Error("unable to rollback, not in transaction mode");
            if (typeof this.singleConnection === "undefined")
                throw new Error("singleConnection is undefined");
            // this.singleConnection = await this.initiateSingleConnection();
            yield this.singleConnection.rollback();
        });
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
}
exports.connection = connection;
connection.inTransaction = false;
