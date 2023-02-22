import {connection} from "./connection";
import {eth_config} from "./eth_config";
import {eth_worker} from "./eth_worker";
import {tools} from "./tools";

let lastBlockProcessed = 0;
let latestBlock = 0;
let totalLogs = 0;
async function run(){
    await connection.startTransaction();
    try{
        let logsFound = 0;
        latestBlock = await eth_worker.getLatestBlockWeb3();
        if(lastBlockProcessed === 0){
            const genesisBlock = tools.parseInt({val:eth_config.getTokenGenesisBlock(),strict:true});
            const dbBlock = await eth_worker.getBlockByNumber(genesisBlock);
            lastBlockProcessed = dbBlock.blockNumber;
        }
        else{
            lastBlockProcessed++;
            const dbBlock = await eth_worker.getBlockByNumber(lastBlockProcessed);
            lastBlockProcessed = dbBlock.blockNumber;
            // const logs = await eth_worker.getLogsByBlockNumber(dbBlock.blockNumber);
            // logsFound = logs.length;
        }

        const height = latestBlock - lastBlockProcessed;
        console.log(`current:${lastBlockProcessed} latest:${latestBlock} height: ${height} | logs found: ${logsFound}`);
        await connection.commit();
        // await tools.sleep(150);
        await run();
    }catch (e){
        await connection.rollback();
        console.log(e);
    }
}


(async()=>{
    console.log(`running block worker`);
    await run();
})();