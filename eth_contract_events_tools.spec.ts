import * as assert from "assert";
import { BAR_COLOR } from "./eth_ohlc_tool";
import { connection } from "./connection";
import { eth_config } from "./eth_config";
import { eth_ohlc_tool } from "./eth_ohlc_tool";
import { tools } from "./tools";
import {eth_contract_events} from "./build/eth_contract_events";
import {TRADE_TYPE} from "./eth_worker_trade";
import {INTERVAL, time_helper} from "./time_helper";
import {Dayjs} from "dayjs";
import {eth_receipt_logs} from "./build/eth_receipt_logs";
import {eth_contract_events_tools} from "./eth_contract_events_tools";

describe("contract_events_tools spec",()=> {

    beforeEach(async ()=>{
        await connection.startTransaction();
    });

    afterEach(async ()=>{
        await connection.rollback();
    });

    it("contract_events_tools isTokenRelated token address", () => {
        const log = new eth_receipt_logs();
        log.address = eth_config.getTokenContract();
        const result = eth_contract_events_tools.isTokenRelated(log);
        assert.equal(result,true);
    });

    it("contract_events_tools isTokenRelated token_bnb pair address", () => {
        const log = new eth_receipt_logs();
        log.address = eth_config.getTokenBnbPairContract();
        const result = eth_contract_events_tools.isTokenRelated(log);
        assert.equal(result,true);
    });

    // it("contract_events_tools isTokenRelated token_usd pair address", () => {
    //     const log = new eth_receipt_logs();
    //     log.address = eth_config.getTokenUsdPairContract();
    //     const result = eth_contract_events_tools.isTokenRelated(log);
    //     assert.equal(result,true);
    // });

    it("contract_events_tools isTokenRelated false", () => {
        const log = new eth_receipt_logs();
        log.address = eth_config.getDexContract();
        const result = eth_contract_events_tools.isTokenRelated(log);
        assert.equal(result,false);
    });

    // get unprocessed receipt_logs no last_id
    // get unprocessed receipt_logs with last_id
    // is Trade
    // is Buy
    // is Sell
});