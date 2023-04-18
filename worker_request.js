"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_request = void 0;
const process_1 = require("process");
const request_queue_1 = require("./build/request_queue");
const eth_worker_1 = require("./eth_worker");
const tools_1 = require("./tools");
const time_helper_1 = require("./time_helper");
const web3_token_1 = require("./web3_token");
const eth_config_1 = require("./eth_config");
const web3_tools_1 = require("./web3_tools");
class worker_request {
    static async run() {
        let requests = new request_queue_1.request_queue();
        await requests.list(" WHERE status=:open ", { open: "o" }, ` ORDER BY id ASC LIMIT ${this.batchLimit} `);
        if (requests.count() > 0)
            console.log(`total request found:${requests.count()}`);
        for (const request of requests._dataList) {
            try {
                if (typeof request.data_for !== "string")
                    throw new Error("data_for is empty");
                console.log(`processing request ${request.hash} type ${request.type} for ${request.data_for} `);
                if (request.type === "wallet_token_balance") {
                    request.data_result = await eth_worker_1.eth_worker.getTokenBalance(request.data_for);
                }
                if (request.type === "wallet_eth_balance") {
                    request.data_result = await eth_worker_1.eth_worker.getETHBalance(request.data_for);
                }
                if (request.type === "wallet_busd_balance") {
                    request.data_result = await web3_token_1.web3_token.getBalanceOf(eth_config_1.eth_config.getBusdContract(), request.data_for);
                }
                if (request.type === "is_wallet_address") {
                    const isWalletAddress = await web3_tools_1.web3_tools.isWalletAddress(request.data_for);
                    request.data_result = isWalletAddress ? "y" : "n";
                }
                console.log(`--result:${request.data_result}`);
                request.status = "d";
                request.time_processed = time_helper_1.time_helper.getCurrentTimeStamp();
                await request.save();
                await tools_1.tools.sleep(150);
            }
            catch (e) {
                if (e instanceof Error) {
                    console.log(`ERROR request(${request.id}) ${e.message}`);
                }
                request.status = "e";
                request.time_processed = time_helper_1.time_helper.getCurrentTimeStamp();
                await request.save();
            }
        }
        setImmediate(() => {
            worker_request.run().finally();
        });
    }
}
exports.worker_request = worker_request;
worker_request.batchLimit = 10;
if (process_1.argv.includes("run_worker_request")) {
    console.log(`running worker to process web3 requests on the side`);
    worker_request.run().finally();
}
//# sourceMappingURL=worker_request.js.map