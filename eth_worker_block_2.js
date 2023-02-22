"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = require("./connection");
const eth_config_1 = require("./eth_config");
const eth_worker_1 = require("./eth_worker");
const tools_1 = require("./tools");
let lastBlockProcessed = 0;
let latestBlock = 0;
let totalLogs = 0;
async function run() {
    await connection_1.connection.startTransaction();
    try {
        let logsFound = 0;
        latestBlock = await eth_worker_1.eth_worker.getLatestBlockWeb3();
        if (lastBlockProcessed === 0) {
            const genesisBlock = tools_1.tools.parseInt({ val: eth_config_1.eth_config.getTokenGenesisBlock(), strict: true });
            const dbBlock = await eth_worker_1.eth_worker.getBlockByNumber(genesisBlock);
            lastBlockProcessed = dbBlock.blockNumber;
        }
        else {
            lastBlockProcessed++;
            const dbBlock = await eth_worker_1.eth_worker.getBlockByNumber(lastBlockProcessed);
            lastBlockProcessed = dbBlock.blockNumber;
            // const logs = await eth_worker.getLogsByBlockNumber(dbBlock.blockNumber);
            // logsFound = logs.length;
        }
        const height = latestBlock - lastBlockProcessed;
        console.log(`current:${lastBlockProcessed} latest:${latestBlock} height: ${height} | logs found: ${logsFound}`);
        await connection_1.connection.commit();
        // await tools.sleep(150);
        await run();
    }
    catch (e) {
        await connection_1.connection.rollback();
        console.log(e);
    }
}
(async () => {
    console.log(`running block worker`);
    await run();
})();
//# sourceMappingURL=eth_worker_block_2.js.map