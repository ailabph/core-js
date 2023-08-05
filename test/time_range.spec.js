"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const time_range_1 = require("../time_range");
const dayjs_1 = __importDefault(require("dayjs"));
describe('time_helper', () => {
    describe('getTimeRange', () => {
        it('should return the start and end of the day for a given timestamp in UTC', () => {
            const timestamp = 1675905600; //Represents February 9, 2023 1:20:00 AM
            const expected_start_of_day = 1675900800; //  Thursday, February 9, 2023 12:00:00 AM
            const expected_end_of_day = 1675987199; // Thursday, February 9, 2023 11:59:59 PM
            const tz = 'UTC';
            const result = time_range_1.time_range.getTimeRange(timestamp, time_range_1.INTERVAL.DAY, tz);
            //Check that the 'from' timestamp is at the start of the day in UTC
            (0, chai_1.expect)(result.from).to.equal(expected_start_of_day);
            //Check that the 'to' timestamp is at the end of the day in UTC
            (0, chai_1.expect)(result.to).to.equal(expected_end_of_day);
            (0, chai_1.expect)(result).to.have.property('format_timezone', tz);
            (0, chai_1.expect)(result).to.have.property('from_dateTime_ISO').that.matches(/\d{4}-\d{2}-\d{2}T00:00:00/);
            (0, chai_1.expect)(result).to.have.property('from_dateTime_MySql').that.matches(/\d{4}-\d{2}-\d{2} 00:00:00/);
            (0, chai_1.expect)(result).to.have.property('to_dateTime_ISO').that.matches(/\d{4}-\d{2}-\d{2}T23:59:59/);
            (0, chai_1.expect)(result).to.have.property('to_dateTime_MySql').that.matches(/\d{4}-\d{2}-\d{2} 23:59:59/);
        });
        it('should throw an error for a negative timestamp', () => {
            const timestamp = -1675905600;
            const tz = 'UTC';
            (0, chai_1.expect)(() => time_range_1.time_range.getTimeRange(timestamp, time_range_1.INTERVAL.DAY, tz)).to.throw();
        });
        it('should throw an error for an invalid timezone', () => {
            const timestamp = 1675905600;
            const tz = 'Invalid/Timezone';
            (0, chai_1.expect)(() => time_range_1.time_range.getTimeRange(timestamp, time_range_1.INTERVAL.DAY, tz)).to.throw();
        });
        it('should return the start and end of the day for a given timestamp in Asia/Manila', () => {
            const timestamp = 1681030523; //Represents Sunday, April 9, 2023 4:55:23 PM GMT+08:00
            const expected_start_of_day = 1680969600; //  Sunday, April 9, 2023 12:00:00 AM GMT+08:00
            const expected_end_of_day = 1681055999; // Sunday, April 9, 2023 11:59:59 PM GMT+08:00
            const tz = 'Asia/Manila';
            const result = time_range_1.time_range.getTimeRange(timestamp, time_range_1.INTERVAL.DAY, tz);
            //Check that the 'from' timestamp is at the start of the day in UTC
            (0, chai_1.expect)(result.from).to.equal(expected_start_of_day);
            //Check that the 'to' timestamp is at the end of the day in UTC
            (0, chai_1.expect)(result.to).to.equal(expected_end_of_day);
            (0, chai_1.expect)(result).to.have.property('format_timezone', tz);
            (0, chai_1.expect)(result).to.have.property('from_dateTime_ISO').that.matches(/\d{4}-\d{2}-08T16:00:00/);
            (0, chai_1.expect)(result).to.have.property('from_dateTime_MySql').that.matches(/\d{4}-\d{2}-\d{2} 00:00:00/);
            (0, chai_1.expect)(result).to.have.property('to_dateTime_ISO').that.matches(/\d{4}-\d{2}-\d{2}T15:59:59/);
            (0, chai_1.expect)(result).to.have.property('to_dateTime_MySql').that.matches(/\d{4}-\d{2}-\d{2} 23:59:59/);
        });
        it('should return the start and end of the month for a given timestamp in UTC', () => {
            const timestamp = 1678723199; //Represents Monday, March 13, 2023 3:59:59 PM
            const expected_start_of_day = 1677628800; //  Wednesday, March 1, 2023 12:00:00 AM
            const expected_end_of_day = 1680307199; // Friday, March 31, 2023 11:59:59 PM
            const tz = 'UTC';
            const result = time_range_1.time_range.getTimeRange(timestamp, time_range_1.INTERVAL.MONTH, tz);
            //Check that the 'from' timestamp is at the start of the day in UTC
            (0, chai_1.expect)(result.from).to.equal(expected_start_of_day);
            //Check that the 'to' timestamp is at the end of the day in UTC
            (0, chai_1.expect)(result.to).to.equal(expected_end_of_day);
            (0, chai_1.expect)(result).to.have.property('format_timezone', tz);
            (0, chai_1.expect)(result).to.have.property('from_dateTime_ISO').that.matches(/\d{4}-\d{2}-\d{2}T00:00:00/);
            (0, chai_1.expect)(result).to.have.property('from_dateTime_MySql').that.matches(/\d{4}-\d{2}-\d{2} 00:00:00/);
            (0, chai_1.expect)(result).to.have.property('to_dateTime_ISO').that.matches(/\d{4}-\d{2}-\d{2}T23:59:59/);
            (0, chai_1.expect)(result).to.have.property('to_dateTime_MySql').that.matches(/\d{4}-\d{2}-\d{2} 23:59:59/);
        });
        it('should return the start and end of the month for a given timestamp in Asia/Manila', () => {
            const timestamp = 1678723199; //Represents Monday, March 13, 2023 3:59:59 PM
            const expected_start_of_month = 1677600000; // March 1, 2023 12:00:00 AM GMT+8
            const expected_end_of_month = 1680278399; // March 31, 2023 11:59:59 PM GMT+8
            const tz = 'Asia/Manila';
            const result = time_range_1.time_range.getTimeRange(timestamp, time_range_1.INTERVAL.MONTH, tz);
            (0, chai_1.expect)(result.from).to.equal(expected_start_of_month);
            (0, chai_1.expect)(result.to).to.equal(expected_end_of_month);
            (0, chai_1.expect)(result).to.have.property('format_timezone', tz);
            (0, chai_1.expect)(result).to.have.property('from_dateTime_ISO').that.matches(/2023-02-28T16:00:00/);
            (0, chai_1.expect)(result).to.have.property('from_dateTime_MySql').that.matches(/\d{4}-\d{2}-01 00:00:00/);
            (0, chai_1.expect)(result).to.have.property('to_dateTime_ISO').that.matches(/\d{4}-\d{2}-\d{2}T15:59:59/);
            (0, chai_1.expect)(result).to.have.property('to_dateTime_MySql').that.matches(/\d{4}-\d{2}-\d{2} 23:59:59/);
        });
        it('should throw error if date time string is invalid', () => {
            const invalidDateTime = 'invalid';
            const tz = 'UTC';
            (0, chai_1.expect)(() => {
                time_range_1.time_range.parseDateToTimestamp(invalidDateTime, tz);
            }).to.throw();
        });
        it('should throw error if timezone is invalid', () => {
            const validDateTime = '2023-03-01T12:00:00Z';
            const invalidTz = 'Invalid/Timezone';
            (0, chai_1.expect)(() => {
                time_range_1.time_range.parseDateToTimestamp(validDateTime, invalidTz);
            }).to.throw();
        });
        it('should parse valid UTC date time string to timestamp', () => {
            const validDateTime = '2023-03-01T18:40:00Z';
            const tz = 'UTC';
            const expected = 1677696000;
            (0, chai_1.expect)(time_range_1.time_range.parseDateToTimestamp(validDateTime, tz)).to.equal(expected);
        });
        it('should parse valid Asia/Manila date time string with ISO Standard to timestamp', () => {
            const validDateTime = '2023-03-02T02:40:00';
            const tz = 'Asia/Manila';
            const expected = 1677696000;
            (0, chai_1.expect)(time_range_1.time_range.parseDateToTimestamp(validDateTime, tz)).to.equal(expected);
        });
    });
    describe('isCurrentIntervalDataCurrent', () => {
        it('should throw an error if "from" timestamp is greater than "to" timestamp', () => {
            const interval_data = {
                from: 1675987200,
                to: 1675900800,
                format_timezone: 'UTC',
                from_dateTime_ISO: '',
                from_dateTime_MySql: '',
                to_dateTime_ISO: '',
                to_dateTime_MySql: ''
            };
            (0, chai_1.expect)(() => time_range_1.time_range.isCurrentIntervalDataCurrent(interval_data)).to.throw();
        });
        it('should return true if current time is within the interval', () => {
            const currentTimestamp = (0, dayjs_1.default)().unix();
            const interval_data = {
                from: currentTimestamp - 100,
                to: currentTimestamp + 100,
                format_timezone: 'UTC',
                from_dateTime_ISO: '',
                from_dateTime_MySql: '',
                to_dateTime_ISO: '',
                to_dateTime_MySql: ''
            };
            (0, chai_1.expect)(time_range_1.time_range.isCurrentIntervalDataCurrent(interval_data)).to.be.true;
        });
        it('should return false if current time is not within the interval', () => {
            const interval_data = {
                from: 1675900800,
                to: 1675987199,
                format_timezone: 'UTC',
                from_dateTime_ISO: '',
                from_dateTime_MySql: '',
                to_dateTime_ISO: '',
                to_dateTime_MySql: ''
            };
            (0, chai_1.expect)(time_range_1.time_range.isCurrentIntervalDataCurrent(interval_data)).to.be.false;
        });
    });
    describe('getTimeRangeByString', () => {
        it('should return the start and end of the day for a given date time string in UTC', () => {
            const dateTime = '2023-02-09T01:20:00';
            const expected_start_of_day = 1675900800; // Thursday, February 9, 2023 12:00:00 AM
            const expected_end_of_day = 1675987199; // Thursday, February 9, 2023 11:59:59 PM
            const tz = 'UTC';
            const result = time_range_1.time_range.getTimeRangeByString(dateTime, time_range_1.INTERVAL.DAY, tz);
            (0, chai_1.expect)(result.from).to.equal(expected_start_of_day);
            (0, chai_1.expect)(result.to).to.equal(expected_end_of_day);
            (0, chai_1.expect)(result).to.have.property('format_timezone', tz);
            (0, chai_1.expect)(result).to.have.property('from_dateTime_ISO').that.matches(/\d{4}-\d{2}-\d{2}T00:00:00/);
            (0, chai_1.expect)(result).to.have.property('from_dateTime_MySql').that.matches(/\d{4}-\d{2}-\d{2} 00:00:00/);
            (0, chai_1.expect)(result).to.have.property('to_dateTime_ISO').that.matches(/\d{4}-\d{2}-\d{2}T23:59:59/);
            (0, chai_1.expect)(result).to.have.property('to_dateTime_MySql').that.matches(/\d{4}-\d{2}-\d{2} 23:59:59/);
        });
        it('should return the start and end of the month for a given date time string in Asia/Manila', () => {
            const dateTime = '2023-04-13T14:40:00';
            const expected_start_of_day = 1680278400; // Saturday, April 1, 2023 12:00:00 AM GMT+08:00
            const expected_end_of_day = 1682870399; // Sunday, April 30, 2023 11:59:59 PM GMT+08:00
            const tz = 'Asia/Manila';
            const result = time_range_1.time_range.getTimeRangeByString(dateTime, time_range_1.INTERVAL.MONTH, tz);
            (0, chai_1.expect)(result.from).to.equal(expected_start_of_day);
            (0, chai_1.expect)(result.to).to.equal(expected_end_of_day);
            (0, chai_1.expect)(result).to.have.property('format_timezone', tz);
            (0, chai_1.expect)(result).to.have.property('from_dateTime_ISO').that.matches(/\d{4}-03-31T16:00:00/);
            (0, chai_1.expect)(result).to.have.property('from_dateTime_MySql').that.matches(/\d{4}-\d{2}-\d{2} 00:00:00/);
            (0, chai_1.expect)(result).to.have.property('to_dateTime_ISO').that.matches(/\d{4}-\d{2}-\d{2}T15:59:59/);
            (0, chai_1.expect)(result).to.have.property('to_dateTime_MySql').that.matches(/\d{4}-\d{2}-\d{2} 23:59:59/);
        });
    });
    describe('getNextTimeRange', () => {
        it('should return the start and end of the next month for a given timestamp in UTC', () => {
            const timestamp = 1682265599; // Represents April 23, 2023 3:59:59 PM
            const expected_start_of_next_month = 1682899200; // May 1, 2023 12:00:00 AM
            const expected_end_of_next_month = 1685577599; // May 31, 2023 11:59:59 PM
            const tz = 'UTC';
            const result = time_range_1.time_range.getNextTimeRange(timestamp, time_range_1.INTERVAL.MONTH, tz);
            (0, chai_1.expect)(result.from).to.equal(expected_start_of_next_month);
            (0, chai_1.expect)(result.to).to.equal(expected_end_of_next_month);
            (0, chai_1.expect)(result).to.have.property('format_timezone', tz);
        });
        it('should return the start and end of the next day for a given timestamp in Asia/Manila', () => {
            const timestamp = 1685944984; // Represents Monday, June 5, 2023 2:03:04 PM GMT+08:00
            const expected_start_of_next_day = 1685980800; // Tuesday, June 6, 2023 12:00:00 AM GMT+08:00
            const expected_end_of_next_day = 1686067199; // Tuesday, June 6, 2023 11:59:59 PM GMT+08:00
            const tz = 'Asia/Manila';
            const result = time_range_1.time_range.getNextTimeRange(timestamp, time_range_1.INTERVAL.DAY, tz);
            (0, chai_1.expect)(result.from).to.equal(expected_start_of_next_day);
            (0, chai_1.expect)(result.to).to.equal(expected_end_of_next_day);
            (0, chai_1.expect)(result).to.have.property('format_timezone', tz);
        });
    });
    describe('createCustomRange', () => {
        it('should return the start and end of the custom range for given dates in Asia/Manila', () => {
            const from = '2023-04-21';
            const to = '2023-05-31';
            const tz = 'Asia/Manila';
            const expectedStart = 1682006400; // April 21, 2023 12:00:00 AM GMT+08:00
            const expectedEnd = 1685548799; // May 31, 2023 11:59:59 PM GMT+08:00
            const result = time_range_1.time_range.createCustomRange(from, to, tz);
            (0, chai_1.expect)(result.from).to.equal(expectedStart);
            (0, chai_1.expect)(result.to).to.equal(expectedEnd);
            (0, chai_1.expect)(result).to.have.property('format_timezone', tz);
            (0, chai_1.expect)(result).to.have.property('from_dateTime_ISO').that.matches(/\d{4}-\d{2}-\d{2}T16:00:00/);
            (0, chai_1.expect)(result).to.have.property('from_dateTime_MySql').that.matches(/\d{4}-\d{2}-\d{2} 00:00:00/);
            (0, chai_1.expect)(result).to.have.property('to_dateTime_ISO').that.matches(/\d{4}-\d{2}-\d{2}T15:59:59/);
            (0, chai_1.expect)(result).to.have.property('to_dateTime_MySql').that.matches(/\d{4}-\d{2}-\d{2} 23:59:59/);
        });
    });
    describe('createRanges', () => {
        it('should return monthly ranges from February 2023 to July 2023', () => {
            const from = '2023-02-01T00:00:00';
            const to = '2023-07-31T23:59:59';
            const tz = 'UTC';
            const interval = time_range_1.INTERVAL.MONTH;
            const result = time_range_1.time_range.createRanges(from, to, interval, tz);
            (0, chai_1.expect)(result.length).to.equal(6); // 6 months from February to July inclusive
            result.forEach((range, index) => {
                const expected_range = time_range_1.time_range.getTimeRange(range.from, time_range_1.INTERVAL.MONTH, tz);
                (0, chai_1.expect)(range.from).to.equal(expected_range.from);
                (0, chai_1.expect)(range.to).to.equal(expected_range.to);
            });
        });
        it('should return daily ranges from March 1, 2023 to March 31, 2023', () => {
            const from = '2023-03-01T00:00:00';
            const to = '2023-03-31T23:59:59';
            const tz = 'UTC';
            const interval = time_range_1.INTERVAL.DAY;
            const result = time_range_1.time_range.createRanges(from, to, interval, tz);
            (0, chai_1.expect)(result.length).to.equal(31); // 31 days in March
            result.forEach((range, index) => {
                const expected_range = time_range_1.time_range.getTimeRange(range.from, time_range_1.INTERVAL.DAY, tz);
                (0, chai_1.expect)(range.from).to.equal(expected_range.from);
                (0, chai_1.expect)(range.to).to.equal(expected_range.to);
            });
        });
    });
});
//# sourceMappingURL=time_range.spec.js.map