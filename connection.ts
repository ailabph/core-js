import {config} from "./config";
import * as mysql from "mysql2/promise";
import { Connection, Pool, PoolConnection} from "mysql2/promise";
import * as t from "io-ts";
import * as d from "fp-ts/Either";

type ConnectionConfig = {
    connectionLimit:number,
    user:string,
    password:string,
    database:string,
    host:string,
    port:number,
    namedPlaceholders:boolean,
}

const ResultSetHeaderCodec = t.type({
    fieldCount:t.number,
    affectedRows:t.number,
    insertId:t.number,
    info:t.string,
    serverStatus:t.number,
    warningStatus:t.number,
});
type ResultSetHeader = t.TypeOf<typeof ResultSetHeaderCodec>;
export {ResultSetHeader};

export class connection{

    private static pool: Pool | undefined;

    private static lastPoolConnection: PoolConnection | undefined;

    private static singleConnection: Connection | undefined;

    private static inTransaction: boolean = false;

    private static getConfig(): ConnectionConfig{
        return {
            connectionLimit:10,
            user: config.getConfig().db_user,
            password: config.getConfig().db_pass,
            database: config.getConfig().db_name,
            host: config.getConfig().db_host,
            port: config.getConfig().db_port,
            namedPlaceholders:true,
        };
    }

    private static setQueryConfig(conn: Connection | undefined):PoolConnection | Connection{
        if(typeof conn === "undefined") throw new Error("connection is undefined");
        conn.config.queryFormat = function (query:string, values:{[key:string]:any}) {
            if (!values) {
                return query;
            }
            return query.replace(/\:(\w+)/g, function (txt: string, key: string) {
                if (values.hasOwnProperty(key)) {
                    //@ts-ignore
                    return this.escape(values[key]);
                }
                return txt;
            }.bind(this));
        };
        return conn;
    }

    private static async init(){
        await connection.initiatePoolConnection();
        await connection.initiateSingleConnection();
    }

    private static async initiatePoolConnection(){
        if(typeof this.pool === "undefined"){
            this.pool = await mysql.createPool(this.getConfig());
        }
    }

    private static async initiateSingleConnection(){
        if(typeof this.singleConnection === "undefined"){
            this.singleConnection = await mysql.createConnection(this.getConfig());
            this.singleConnection = this.setQueryConfig(this.singleConnection);
        }
    }


    public static async getConnection(force_pool:boolean = false): Promise<PoolConnection | Connection>{
        await this.init();
        if(force_pool || !this.inTransaction){
            // await this.initiatePoolConnection();
            if(typeof this.pool === "undefined") throw new Error("pool not connected");
            this.lastPoolConnection = await this.pool.getConnection();
            this.lastPoolConnection = this.setQueryConfig(this.lastPoolConnection) as PoolConnection;
            return this.lastPoolConnection;
        }
        else{
            // this.singleConnection = await this.initiateSingleConnection();
            if(typeof this.singleConnection === "undefined"){
                throw new Error("singleConnection is undefined");
            }
            return this.singleConnection;
        }
    }

    public static async execute({ sql, param = {}, force_pool = false }:{ sql:string, param?:object, force_pool?:boolean }): Promise<ResultSetHeader | object[]>{
        if(config.getConfig().verbose_log) console.log(`retrieving connection`);
        let conn = await this.getConnection(force_pool);
        if(config.getConfig().verbose_log) console.log(`connection retrieved, executing sql:${sql}`);
        let result = await conn.execute(sql,param);
        if(config.getConfig().verbose_log) console.log(`query executed`);
        return result[0] as ResultSetHeader;
    }

    public static async startTransaction(){
        this.inTransaction = true;
        await this.init();
        if(typeof this.singleConnection === "undefined"){
            throw new Error("singleConnection is undefined");
        }
        await this.singleConnection.beginTransaction();
    }

    public static async commit(){
        if(!this.inTransaction) throw new Error("unable to commit, not in transaction mode");
        if(typeof this.singleConnection === "undefined") throw new Error("singleConnection is undefined");
        // this.singleConnection = await this.initiateSingleConnection();
        await this.singleConnection.commit();
    }

    public static async rollback(){
        if(!this.inTransaction) throw new Error("unable to rollback, not in transaction mode");
        if(typeof this.singleConnection === "undefined") throw new Error("singleConnection is undefined");
        // this.singleConnection = await this.initiateSingleConnection();
        await this.singleConnection.rollback();
    }


    //#region PARSERS
    public static parseResultSetHeader(result:object): ResultSetHeader | false{
        let decodedCodec = ResultSetHeaderCodec.decode(result);
        if(d.isRight(decodedCodec)){
            return decodedCodec.right as ResultSetHeader;
        }
        return false;
    }
    //#endregion END PARSERS


    //#region UTILITIES
    public static reset(){
        this.pool = undefined;
        this.singleConnection = undefined;
    }
    //#endregion END UTILITIES

}
