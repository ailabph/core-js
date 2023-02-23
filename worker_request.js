"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_request = void 0;
const process_1 = require("process");
const request_queue_1 = require("./build/request_queue");
const connection_1 = require("./connection");
const eth_worker_1 = require("./eth_worker");
const tools_1 = require("./tools");
const time_helper_1 = require("./time_helper");
class worker_request {
    static async run() {
        await connection_1.connection.startTransaction();
        try {
            let requests = new request_queue_1.request_queue();
            await requests.list(" WHERE status!=:done ", { done: "d" }, ` ORDER BY id ASC LIMIT ${this.batchLimit} `);
            if (requests.count() > 0)
                console.log(`total request found:${requests.count()}`);
            for (const request of requests._dataList) {
                if (typeof request.data_for !== "string")
                    throw new Error("data_for is empty");
                console.log(`processing request ${request.hash} type ${request.type} for ${request.data_for} `);
                if (request.type === "wallet_token_balance") {
                    request.data_result = await eth_worker_1.eth_worker.getTokenBalance(request.data_for);
                }
                if (request.type === "wallet_eth_balance") {
                    request.data_result = await eth_worker_1.eth_worker.getETHBalance(request.data_for);
                }
                console.log(`--result:${request.data_result}`);
                request.status = "d";
                request.time_processed = time_helper_1.time_helper.getCurrentTimeStamp();
                await request.save();
            }
            await connection_1.connection.commit();
            await tools_1.tools.sleep(150);
            setImmediate(() => {
                worker_request.run();
            });
        }
        catch (e) {
            await connection_1.connection.rollback();
            console.log(`ERROR`);
            console.log(e);
        }
    }
}
exports.worker_request = worker_request;
worker_request.batchLimit = 10;
if (process_1.argv.includes("run_worker_request")) {
    console.log(`running worker to process web3 requests on the side`);
    worker_request.run().finally();
}
//# sourceMappingURL=worker_request.js.map