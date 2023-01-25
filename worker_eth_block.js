"use strict";
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
const ailab_core_1 = require("./ailab-core");
const eth_block_1 = require("./build/eth_block");
let lastBlock = 0;
let startBlock = ailab_core_1.config.getCustomOption("STARTING_BLOCK", true);
console.log("starting worker to track blocks");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let from = 0;
        let to = yield ailab_core_1.eth_worker.getLatestBlockWeb3();
        let updateNeeded = false;
        if (lastBlock !== to) {
            console.log("Latest Block:%s", to);
        }
        let blocks = new eth_block_1.eth_block();
        yield blocks.list(" WHERE 1 ", [], " ORDER BY blockNumber DESC LIMIT 1 ");
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
                yield new_block.save();
                console.log("...added blockNumber:%s to db", x);
            }
        }
        yield new Promise((r) => { setTimeout(run, 1000); });
    });
}
run().finally();
