import {argv} from "process";
import {config} from "./config";
import {worker_ohlc} from "./worker_ohlc";
import {eth_contract_data} from "./build/eth_contract_data";
import {tools} from "./tools";

export class worker_contract_viewer{
    private static lastId:number = 0;
    public static async run(){

        const data = new eth_contract_data();
        await data.list(" WHERE id>:last_id ",{last_id:this.lastId}," ORDER BY id ASC LIMIT 20 ");
        for(const contract of data._dataList as eth_contract_data[]){
            this.lastId = contract.id??0;
            if(contract.name.includes("Pancake")) continue;
            if(tools.isEmpty(contract.name)) continue;
            console.log(`${contract.name}|${contract.symbol}|${contract.decimals}|${contract.contract}`);
            await tools.sleep(250);
        }

        setImmediate(()=>{
            worker_contract_viewer.run().finally();
        });
    }
}

if(argv.includes("run_worker_contract_viewer")){
    console.log(`contract viewer`);
    worker_contract_viewer.run().finally();
}