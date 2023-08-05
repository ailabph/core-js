import * as assert from "assert";
import { connection } from "../connection";
import { eth_config } from "../eth_config";
import {eth_receipt_logs} from "../build/eth_receipt_logs";
import {eth_contract_events_tools} from "../eth_contract_events_tools";

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


    it("contract_events_tools isTokenRelated false", () => {
        const log = new eth_receipt_logs();
        log.address = eth_config.getDexContract();
        const result = eth_contract_events_tools.isTokenRelated(log);
        assert.equal(result,false);
    });

});