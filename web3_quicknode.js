"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.web3_quicknode = void 0;
const config_1 = require("./config");
const eth_rpc_1 = require("./eth_rpc");
const tools_1 = require("./tools");
//endregion TYPES
class web3_quicknode {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`web3_quicknode|${method}|${msg}`);
            if (end)
                console.log(`web3_quicknode|${method}|${tools_1.tools.LINE}`);
        }
    }
    static retryWaitDuration() {
        return 500;
    }
    static retryLimit() {
        return 20;
    }
    static async getLatestBlock() {
        const method = "getLatestBlock";
        this.log("getting latest block", method);
        let latestBlockNumber = 0;
        try {
            latestBlockNumber = await eth_rpc_1.eth_rpc.getEtherProvider().provider.getBlockNumber();
        }
        catch (e) {
            if (e instanceof Error && !tools_1.tools.isEmpty(e.message)) {
                this.log(e.message, method, true, true);
                throw new web3_quicknode_error(e.message);
            }
        }
        this.log(`latest block:${latestBlockNumber}`, method, true);
        return latestBlockNumber;
    }
    static async qn_getBlockWithReceipts(blockNumber, retry_count = 0) {
        const method = "qn_getBlockWithReceipts";
        if (retry_count >= this.retryLimit()) {
            this.log(`retry limit reached:${retry_count}/${this.retryLimit()}`, method, true);
            return false;
        }
        this.log(`retrieving block with recipts of ${blockNumber}. retry_count:${retry_count}/${this.retryLimit()}`, method);
        const blockNumberAsHex = tools_1.tools.convertNumberToHex(blockNumber);
        try {
            return await eth_rpc_1.eth_rpc.getEtherProvider().provider.send("qn_getBlockWithReceipts", [blockNumberAsHex]);
        }
        catch (e) {
            console.log(`${blockNumber} not yet on chain, retrying...`);
            await tools_1.tools.sleep(this.retryWaitDuration());
            return this.qn_getBlockWithReceipts(blockNumber, ++retry_count);
        }
    }
}
exports.web3_quicknode = web3_quicknode;
class web3_quicknode_error extends Error {
    constructor(message) {
        super(message);
    }
}
//# sourceMappingURL=web3_quicknode.js.map