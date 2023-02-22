"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const assert = __importStar(require("assert"));
const time_helper_1 = require("./time_helper");
describe("time_helper spec", () => {
    it("getTime using unix", () => {
        const time = time_helper_1.time_helper.getTime(1675197808);
        assert.equal(time.unix(), 1675197808);
    });
    it("getCurrentTimeStamp", () => {
        const timeStamp = time_helper_1.time_helper.getCurrentTimeStamp();
        (0, chai_1.expect)(timeStamp).to.be.greaterThan(0);
    });
    it("getTimeIntervals", () => {
        const result = time_helper_1.time_helper.getTimeIntervals(time_helper_1.INTERVAL.DAY, 1672610261, 1673560661);
        assert.equal(result.length, 12);
        assert.equal(result[0].from, 1672588800);
        assert.equal(result[result.length - 1].to, 1673625599);
    });
    it("getTimeIntervals UTC", () => {
        const result = time_helper_1.time_helper.getTimeIntervals(time_helper_1.INTERVAL.DAY, 1672610261, 1673560661, "UTC");
        assert.equal(result.length, 12);
        assert.equal(result[0].from, 1672531200);
        assert.equal(result[0].from_dateTime, "2023-01-01T00:00:00+00:00");
        assert.equal(result[result.length - 1].to, 1673567999);
        assert.equal(result[result.length - 1].to_dateTime, "2023-01-12T23:59:59+00:00");
    });
    it("timeZone", () => {
        const time1 = time_helper_1.time_helper.getTime(1673658158);
        const time2 = time_helper_1.time_helper.getTime(1673658158, "UTC");
        assert.equal(time1.format(time_helper_1.TIME_FORMATS.ISO), "2023-01-14T09:02:38+08:00");
        assert.equal(time2.format(time_helper_1.TIME_FORMATS.ISO), "2023-01-14T01:02:38+00:00");
    });
    it("getTimeStampOf", () => {
        const time = time_helper_1.time_helper.getTimeStampOf("2022-01-01");
        assert.equal(time, 1640966400);
    });
    it("getTimeStampOf UTC", () => {
        const time = time_helper_1.time_helper.getTimeStampOf("2022-01-01", "UTC");
        assert.equal(time, 1640995200);
    });
});
//# sourceMappingURL=time_helper.spec.js.map