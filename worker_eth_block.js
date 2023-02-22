"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const eth_worker_1 = require("./eth_worker");
const config_1 = require("./config");
const eth_block_1 = require("./build/eth_block");
let lastBlock = 0;
let startBlock = config_1.config.getCustomOption("STARTING_BLOCK", true);
console.log("starting worker to track blocks");
async function run() {
    let from = 0;
    let to = await eth_worker_1.eth_worker.getLatestBlockWeb3();
    let updateNeeded = false;
    if (lastBlock !== to) {
        console.log("Latest Block:%s", to);
    }
    let blocks = new eth_block_1.eth_block();
    await blocks.list(" WHERE 1 ", [], " ORDER BY blockNumber DESC LIMIT 1 ");
    if (blocks.count() === 0) {
        from = startBlock;
        updateNeeded = true;
    }
    else {
        let current_block = blocks.getItem();
        if (to > current_block.blockNumber) {
            from = current_block.blockNumber + 1;
            updateNeeded = true;
        }
    }
    if (updateNeeded) {
        console.log(`...adding block record from:${from} to:${to}`);
        for (let x = from; x < to; x++) {
            let new_block = new eth_block_1.eth_block();
            new_block.blockNumber = x;
            new_block.time_added = Date.now() / 1000 | 0;
            await new_block.save();
            console.log("...added blockNumber:%s to db", x);
        }
    }
    await new Promise((r) => { setTimeout(run, 1000); });
}
run().finally();
//# sourceMappingURL=worker_eth_block.js.map