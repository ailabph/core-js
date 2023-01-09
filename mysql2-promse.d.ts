
declare module "mysql2-promise"{
    import {Connection, Pool, PoolConnection} from "mysql2/promise";
    import * as mysql from "mysql2-promise";
    export { Connection, Pool, PoolConnection };
}