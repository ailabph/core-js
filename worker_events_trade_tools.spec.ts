import * as assert from "assert";
import {config} from "./config";
import {connection} from "./connection";
import {expect} from "chai";
import {worker_events_trade_tools} from "./worker_events_trade_tools";

describe("worker_events_trade_tools spec",()=> {
    before(async () => {
        config.resetCache();
        connection.reset();
        config.ENV_OVERRIDE = config.ENV["test"];
    });
    beforeEach(async () => {
        await connection.startTransaction();
    });
    afterEach(async () => {
        await connection.rollback();
    });

    //region calculateBnbPerTokenFromSwap
    it("calculateBnbPerTokenFromSwap should correctly calculate BNB value per token when divided by 18 decimals", () => {
        const token_amount = "790";
        const busd_received = "13.148";
        const bnb_usd = "312.71";

        const expected = "0.000053221956364311";
        const result = worker_events_trade_tools.calculateBnbPerTokenFromSwap(token_amount, busd_received, bnb_usd);

        expect(result).to.equal(expected);
    });

    it("calculateBnbPerTokenFromSwap should return '0' when token amount is '0'", () => {
        const token_amount = "0";
        const busd_received = "13.148";
        const bnb_usd = "312.71";

        const expected = "0";
        const result = worker_events_trade_tools.calculateBnbPerTokenFromSwap(token_amount, busd_received, bnb_usd);

        expect(result).to.equal(expected);
    });

    it("calculateBnbPerTokenFromSwap should return '0' when BUSD received is '0'", () => {
        const token_amount = "790";
        const busd_received = "0";
        const bnb_usd = "312.71";

        const expected = "0";
        const result = worker_events_trade_tools.calculateBnbPerTokenFromSwap(token_amount, busd_received, bnb_usd);

        expect(result).to.equal(expected);
    });

    it("calculateBnbPerTokenFromSwap should return '0' when BNB-USD rate is '0'", () => {
        const token_amount = "790";
        const busd_received = "13.148";
        const bnb_usd = "0";

        const expected = "0";
        const result = worker_events_trade_tools.calculateBnbPerTokenFromSwap(token_amount, busd_received, bnb_usd);

        expect(result).to.equal(expected);
    });

    it("calculateBnbPerTokenFromSwap should handle large values", () => {
        const token_amount = "1000000000000";
        const busd_received = "5000000000";
        const bnb_usd = "1000";

        const expected = "0.000005000000000000";
        const result = worker_events_trade_tools.calculateBnbPerTokenFromSwap(token_amount, busd_received, bnb_usd);

        expect(result).to.equal(expected);
    });
    //endregion calculateBnbPerTokenFromSwap

    //region calculateBusdPerTokenFromSwap
    it('calculateBusdPerTokenFromSwap should correctly calculate BUSD value per token', () => {
        const tokenAmount = '790';
        const bnbReceived = '0.042062';
        const bnbUsd = '312.71';

        const result = worker_events_trade_tools.calculateBusdPerTokenFromSwap(tokenAmount, bnbReceived, bnbUsd);
        const expectedResult = '0.016649630405063291';

        assert.equal(result, expectedResult);
    });

    it('calculateBusdPerTokenFromSwap should correctly handle large values for token amount, BNB received, and BNB to USD rate', () => {
        const tokenAmount = '1000000000';
        const bnbReceived = '1000';
        const bnbUsd = '500';

        const result = worker_events_trade_tools.calculateBusdPerTokenFromSwap(tokenAmount, bnbReceived, bnbUsd);
        const expectedResult = '0.000500000000000000';

        assert.equal(result, expectedResult);
    });

    it('calculateBusdPerTokenFromSwap should return 0 when token amount is 0', () => {
        const tokenAmount = '0';
        const bnbReceived = '0.042062';
        const bnbUsd = '312.71';

        const result = worker_events_trade_tools.calculateBusdPerTokenFromSwap(tokenAmount, bnbReceived, bnbUsd);
        const expectedResult = '0.000000000000000000';

        assert.equal(result, expectedResult);
    });
    //endregion calculateBusdPerTokenFromSwap

});