import {argv} from "process";
import {config} from "./config";
import {worker_ohlc} from "./worker_ohlc";
import {eth_contract_data} from "./build/eth_contract_data";
import {tools} from "./tools";
import {eth_price_track_details} from "./build/eth_price_track_details";
import {eth_price_track_header} from "./build/eth_price_track_header";

export class worker_trades_viewer{
    private static lastId:number = 0;
    public static async run(){

        const data = new eth_price_track_details();
        await data.list(" WHERE id>:last_id ",{last_id:this.lastId}," ORDER BY id ASC LIMIT 20 ");
        for(const detail of data._dataList as eth_price_track_details[]){
            this.lastId = detail.id??0;
            if(detail.header_id > 0){
                const header = new eth_price_track_header();
                header.id = detail.header_id??0;
                await header.fetch();
                if(header.recordExists()){
                    const symbol = `${header.token0_symbol}/${header.token1_symbol}`;
                    if(symbol === "WBNB/BUSD") continue;
                    if(symbol === "WBNB/SRT") continue;
                    console.log(`TRADE:${symbol}|${detail.price_usd}`);
                    await tools.sleep(100);
                }
            }
        }

        setImmediate(()=>{
            worker_trades_viewer.run().finally();
        });
    }
}

if(argv.includes("run_worker_trades_viewer")){
    console.log(`trades viewer`);
    worker_trades_viewer.run().finally();
}