import { expect } from "chai";
import * as assert2 from "assert";
import {connection} from "../connection";
import {eth_worker} from "../eth_worker";

describe("eth_worker spec",()=> {
    beforeEach(async () => {
        await connection.startTransaction();
    });
    afterEach(async () => {
        await connection.rollback();
    });

    it("eth_worker spec getBnbUsdValue",async()=>{
        const bnb_value = eth_worker.getBnbUsdValue("0.111111111111111111","0.666666666666666666");
        assert2.equal(bnb_value,"0.074074074074074074", `bnb_value:${bnb_value}`);
    });

    it("eth_worker spec getTokenBnbValue",async()=>{
        const bnb_value = eth_worker.getTokenBnbValue("2","0.5");
        assert2.equal(bnb_value,"1.000000000000000000", `bnb_value:${bnb_value}`);
    });

    it("eth_worker spec getTokenUsdValue",async()=>{
        const token_bnb_value = eth_worker.getTokenBnbValue("2","0.5");
        const token_usd_value = eth_worker.getTokenUsdValue(2,300,"0.5");
        assert2.equal(token_usd_value,"300.000000000000000000", `token_usd_value:${token_usd_value}`);
    });
});