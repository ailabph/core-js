import {eth_worker} from "./eth_worker";
import {eth_block} from "./build/eth_block";
import {config} from "./ailab-core";

let lastBlock = 0;
let startBlock:number = config.getCustomOption("STARTING_BLOCK",true) as number;

console.log("starting worker to track blocks");
async function run(){
    let from = 0;
    let to = await eth_worker.getLatestBlock();
    let updateNeeded = false;
    if(lastBlock !== to){
        console.log("Latest Block:%s",to);
    }


    let blocks = new eth_block();
    await blocks.list(" WHERE 1 ",[]," ORDER BY blockNumber DESC LIMIT 1 ");
    if(blocks.count() === 0){
        from = startBlock;
        updateNeeded = true;
    }
    else{
        let current_block = blocks.getItem();
        if(to > current_block.blockNumber){
            from = current_block.blockNumber + 1;
            updateNeeded = true;
        }
    }

    if(updateNeeded){
        console.log(`...adding block record from:${from} to:${to}`);
        for(let x=from;x<to;x++){
            let new_block = new eth_block();
            new_block.blockNumber = x;
            new_block.time_added = Date.now() / 1000 | 0;
            await new_block.save();
            console.log("...added blockNumber:%s to db",x);
        }
    }
    await new Promise((r)=>{ setTimeout(run,1000); });
}
run().finally();