import {argv} from "process";
import {eth_contract_events} from "./build/eth_contract_events";
import {config} from "./config";
import {INTERVAL, TIME_FORMATS, time_helper} from "./time_helper";
import {assert} from "./assert";
import {web3_pair_price_tools} from "./web3_pair_price_tools";
import {eth_ohlc_tool} from "./eth_ohlc_tool";
import {ohlc_details} from "./build/ohlc_details";
import {tools} from "./tools";
import {eth_price_track_header_tools} from "./eth_price_track_header_tools";

export class worker_ohlc{
    public static async run():Promise<void>{

        // get events where time_ohlc_processed order by blockNo, logIndex ASC
        const events = new eth_contract_events();
        await events.list(
            " WHERE tag=:tag AND time_ohlc_processed IS NULL ",
            {tag:"trade"},
            " ORDER BY blockNumber ASC, logIndex ASC LIMIT 1 ");
        if(events.count() > 0){
            const event = events.getItem();
            const blockTimeFormat = time_helper.getAsFormat(event.block_time ?? 0,TIME_FORMATS.READABLE);
            event.pair_contract = assert.stringNotEmpty(event.pair_contract,`event(${event.id}).pair_contract`);
            const pairInfo = await web3_pair_price_tools.getPairInfo(event.pair_contract);
            console.log(`${blockTimeFormat} | ${pairInfo.orderedPairSymbol} | ${event.pair_contract}`);
            console.log(`... trade for processing hash(${event.txn_hash}) block(${event.blockNumber}) log(${event.logIndex}) type(${event.type})`);

            let fromTime = time_helper.startOfHour(event.block_time);
            let lastPrice:number = 0;
            let lastPriceUsd:number = 0;
            const checkLastOhlc = new ohlc_details();
            await checkLastOhlc.list(" WHERE ohlc_details.to<:to AND pair=:pair ",{to:fromTime.unix(),pair:event.pair_contract},
                " ORDER BY ohlc_details.to DESC LIMIT 1 ");
            const lastOhlc = checkLastOhlc.getItem();
            if(lastOhlc){
                fromTime = time_helper.getTime(lastOhlc.to + 1);
                lastPrice = tools.parseNumber(lastOhlc.close);
                lastPriceUsd = tools.parseNumber(lastOhlc.close_usd);
            }

            // 24 hours after from
            let toLimit = fromTime.add(15,"days");
            toLimit = time_helper.endOfHour(toLimit.unix(),"UTC");
            // if greater than current time, currentTime
            let toTime = time_helper.endOfHour(time_helper.getCurrentTimeStamp(),"UTC");
                toTime = toLimit.unix() > toTime.unix() ? toTime : toLimit;

            console.log(`... retrieving trades from(${fromTime.format(TIME_FORMATS.READABLE)}) to(${toTime.format(TIME_FORMATS.READABLE)})`);

            const ohlc_list = await eth_ohlc_tool.getCandles(event.pair_contract,INTERVAL.HOUR, fromTime.unix(), toTime.unix(),lastPrice,lastPriceUsd);
            for(const ohlc of ohlc_list){
                console.log(`${pairInfo.orderedPairSymbol} ${ohlc.intervalInfo.from_dateTime} ${ohlc.intervalInfo.to_dateTime}`);
                console.log(`...${ohlc.ohlc.open} ${ohlc.ohlc.high} ${ohlc.ohlc.low} ${ohlc.ohlc.close}`);
                console.log(`...${ohlc.ohlc.open_usd} ${ohlc.ohlc.high_usd} ${ohlc.ohlc.low_usd} ${ohlc.ohlc.close_usd}`);
                console.log(`...volume(usd)${ohlc.ohlc.volume_usd} volume(bnb)${ohlc.ohlc.volume}`);
                console.log(`...volume(token)${ohlc.ohlc.volume_token}`);
                
                const ohlc_db = new ohlc_details();
                ohlc_db.pair = event.pair_contract;
                ohlc_db.interval = INTERVAL.HOUR;
                ohlc_db.datetime = time_helper.getAsFormat(ohlc.intervalInfo.from,TIME_FORMATS.MYSQL_DATE_TIME,"UTC");
                await ohlc_db.fetch();
                ohlc_db.symbol = pairInfo.orderedPairSymbol;
                ohlc_db.from = ohlc.intervalInfo.from;
                ohlc_db.to = ohlc.intervalInfo.to;
                ohlc_db.open = ohlc.ohlc.open;
                ohlc_db.open_usd = ohlc.ohlc.open_usd;
                ohlc_db.high = ohlc.ohlc.high;
                ohlc_db.high_usd = ohlc.ohlc.high_usd;
                ohlc_db.low = ohlc.ohlc.low;
                ohlc_db.low_usd = ohlc.ohlc.low_usd;
                ohlc_db.close = ohlc.ohlc.close;
                ohlc_db.close_usd = ohlc.ohlc.close_usd;
                ohlc_db.volume_buy = ohlc.ohlc.volume_buy;
                ohlc_db.volume_sell = ohlc.ohlc.volume_sell;
                ohlc_db.volume_total = ohlc.ohlc.volume;
                ohlc_db.volume_buy_usd = ohlc.ohlc.volume_buy_usd;
                ohlc_db.volume_sell_usd = ohlc.ohlc.volume_sell_usd;
                ohlc_db.volume_total_usd = ohlc.ohlc.volume_usd;
                ohlc_db.volume_buy_token = ohlc.ohlc.volume_token_buy;
                ohlc_db.volume_sell_token = ohlc.ohlc.volume_token_sell;
                ohlc_db.volume_total_token = ohlc.ohlc.volume_token;
                ohlc_db.time_updated = time_helper.getCurrentTimeStamp();
                ohlc_db.status = ohlc_db.to < time_helper.getCurrentTimeStamp() ? "d" : "o";
                await ohlc_db.save();
                console.log(`...saved with id ${ohlc_db.id}`);

                let totalTradeUpdated = 0;
                for(const trade of ohlc.trades){
                    trade.time_ohlc_processed = time_helper.getCurrentTimeStamp();
                    await trade.save();
                    totalTradeUpdated++;
                }
                console.log(`...${totalTradeUpdated} total trades updated`);
            }
        }
        await tools.sleep(250);
        setImmediate(()=>{
            worker_ohlc.run().finally();
        });
    }
}

if(argv.includes("run_worker_ohlc")){
    console.log(`starting worker to process ohlc, db:${config.getConfig().db_name}`);
    worker_ohlc.run().finally();
}