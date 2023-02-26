"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_block = void 0;
const process_1 = require("process");
const worker_events_token_1 = require("./worker_events_token");
const connection_1 = require("./connection");
const web3_rpc_web3_1 = require("./web3_rpc_web3");
const tools_1 = require("./tools");
const config_1 = require("./config");
class worker_block {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`worker_block|${method}|${msg}`);
            if (end)
                console.log(`worker_block|${method}|${tools_1.tools.LINE}`);
        }
    }
    //region CONFIG
    static getBatch() {
        return 50;
    }
    //endregion CONFIG
    static async run() {
        /*
        process:
        blocks
        from = get last block on db + 1
        to = get latest block
        to = to > limit ? limit : to;

        loop from to
            process++
        single flight block
        scan logs

        if process is zero restart
         */
        await connection_1.connection.startTransaction();
        try {
            this.getBlockSingleFlight(123).then(() => {
            });
            await connection_1.connection.commit();
        }
        catch (e) {
            await connection_1.connection.rollback();
        }
    }
    static async getBlockSingleFlight(blockNumber) {
        const method = "getBlockSingleFlight";
        const blockNumberAsHex = tools_1.tools.convertNumberToHex(blockNumber);
        this.log(`retrieving single flight block of ${blockNumber} as ${blockNumberAsHex}`, method);
        return new Promise((resolve, reject) => {
            web3_rpc_web3_1.web3_rpc_web3.getWeb3Provider().send({ jsonrpc: "2.0", method: "qn_getBlockWithReceipts", params: [blockNumberAsHex] }, (error, result) => {
                if (error) {
                    reject(error);
                }
                if (result) {
                    resolve(result);
                }
            });
        });
    }
}
exports.worker_block = worker_block;
if (process_1.argv.includes("run_worker_block")) {
    console.log(`running worker to track token events`);
    worker_events_token_1.worker_events_token.run().finally();
}
//# sourceMappingURL=worker_block.js.map