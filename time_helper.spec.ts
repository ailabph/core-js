import {expect} from "chai";
import * as assert from "assert";
import {INTERVAL, INTERVAL_DATA, TIME_FORMATS, time_helper} from "./time_helper";

describe("time_helper spec",()=> {
    it("getTime using unix", () => {
        const time = time_helper.getTime(1675197808);
        assert.equal(time.unix(),1675197808);
    });

    it("getCurrentTimeStamp",()=>{
        const timeStamp = time_helper.getCurrentTimeStamp();
        expect(timeStamp).to.be.greaterThan(0);
    });

    it("getTimeIntervals",()=>{
        const result = time_helper.getTimeIntervals(INTERVAL.DAY, 1672610261, 1673560661);
        assert.equal(result.length,12);
        assert.equal(result[0].from,1672588800);
        assert.equal(result[result.length-1].to,1673625599);
    });

    it("getTimeIntervals UTC",()=>{
        const result = time_helper.getTimeIntervals(INTERVAL.DAY, 1672610261, 1673560661,"UTC");
        assert.equal(result.length,12);
        assert.equal(result[0].from,1672531200);
        assert.equal(result[0].from_dateTime,"2023-01-01T00:00:00+00:00");
        assert.equal(result[result.length-1].to,1673567999);
        assert.equal(result[result.length-1].to_dateTime,"2023-01-12T23:59:59+00:00");
    });

    it("timeZone",()=>{
        const time1 = time_helper.getTime(1673658158);
        const time2 = time_helper.getTime(1673658158,"UTC");
        assert.equal(time1.format(TIME_FORMATS.ISO),"2023-01-14T09:02:38+08:00");
        assert.equal(time2.format(TIME_FORMATS.ISO),"2023-01-14T01:02:38+00:00");
    });

    it("getTimeStampOf",()=>{
        const time = time_helper.getTimeStampOf("2022-01-01");
        assert.equal(time,1640966400);
    });
    it("getTimeStampOf UTC",()=>{
        const time = time_helper.getTimeStampOf("2022-01-01","UTC");
        assert.equal(time,1640995200);
    });
});