"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tools_1 = require("./tools");
tools_1.tools.BASE_DIR = "";
const config_1 = require("./config");
const params = {
    host: 'localhost',
    user: config_1.config.getConfig().db_user,
    password: config_1.config.getConfig().db_pass,
    database: config_1.config.getConfig().db_name,
    port: config_1.config.getConfig().db_port,
};
const mysql = require('mysql2/promise');
const pool = mysql.createPool(params);
pool.getConnection();
// class connectionPool{
//     constructor(param){}
//     async getConn(){
//         return await pool
//     }
// }
// const connection = () => pool.getConnection();
// async function getConnection(){
//     return await pool.getConnection(function(err,conn){
//         if(!err){
//             return conn;
//         }else{
//             console.log("failed to initialize connection!");
//             return false;
//         }
//     })
// }
// const connection = await getConnection()();
// var getConnection = function(callback) {
//     pool.getConnection(function(err, connection) {
//         callback(err, connection);
//     });
// };
module.exports = pool;
// import mysql from 'mysql2/promise';
// const pool = mysql.createPool(params);
// const getConnection = () => pool.getConnection();
// export { getConnection }
