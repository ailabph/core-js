"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.time_range = exports.TIME_FORMATS = exports.INTERVAL = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const timezone_1 = __importDefault(require("dayjs/plugin/timezone"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const assert_1 = require("./assert");
var INTERVAL;
(function (INTERVAL) {
    INTERVAL["HOUR"] = "hour";
    INTERVAL["DAY"] = "day";
    INTERVAL["MONTH"] = "month";
})(INTERVAL || (INTERVAL = {}));
exports.INTERVAL = INTERVAL;
var TIME_FORMATS;
(function (TIME_FORMATS) {
    TIME_FORMATS["ISO"] = "YYYY-MM-DDTHH:mm:ssZ";
    TIME_FORMATS["MYSQL_DATE"] = "YYYY-MM-DD";
    TIME_FORMATS["MYSQL_DATE_TIME"] = "YYYY-MM-DD HH:mm:ss";
    TIME_FORMATS["READABLE"] = "YYYY-MM-DD hh:mm A";
})(TIME_FORMATS || (TIME_FORMATS = {}));
exports.TIME_FORMATS = TIME_FORMATS;
dayjs_1.default.extend(timezone_1.default);
dayjs_1.default.extend(utc_1.default);
class time_range {
    static getTimeRange(timestamp, range_type, tz = "UTC") {
        assert_1.assert.positiveInt(timestamp, "timestamp");
        //Check if timezone is valid
        const testTimezone = (0, dayjs_1.default)().tz(tz).utcOffset();
        if (isNaN(testTimezone)) {
            throw new Error(`Invalid timezone: ${tz}`);
        }
        const startOf = dayjs_1.default.unix(timestamp).tz(tz).startOf(range_type);
        const endOf = dayjs_1.default.unix(timestamp).tz(tz).endOf(range_type);
        const from = startOf.unix();
        const to = endOf.unix();
        const from_dateTime_ISO = startOf.utc().format(TIME_FORMATS.ISO);
        const from_dateTime_MySql = startOf.tz(tz).format(TIME_FORMATS.MYSQL_DATE_TIME);
        const to_dateTime_ISO = endOf.utc().format(TIME_FORMATS.ISO);
        const to_dateTime_MySql = endOf.tz(tz).format(TIME_FORMATS.MYSQL_DATE_TIME);
        const format_timezone = tz;
        return {
            from,
            to,
            format_timezone,
            from_dateTime_ISO,
            from_dateTime_MySql,
            to_dateTime_ISO,
            to_dateTime_MySql
        };
    }
    static parseDateToTimestamp(dateTimeStr, tz) {
        const parsed = dayjs_1.default.tz(dateTimeStr, tz);
        if (!parsed.isValid()) {
            throw new Error('Invalid date time string');
        }
        if (isNaN(parsed.utcOffset())) {
            throw new Error('Invalid timezone');
        }
        return parsed.unix();
    }
    static isCurrentIntervalDataCurrent(interval_data) {
        // Basic checks
        assert_1.assert.positiveInt(interval_data.from, "from");
        assert_1.assert.positiveInt(interval_data.to, "to");
        if (interval_data.from > interval_data.to)
            throw new Error("from should be less than or equal to to");
        // Get current timestamp
        const currentTimestamp = (0, dayjs_1.default)().unix();
        // Check if current time falls within the interval
        if (currentTimestamp >= interval_data.from && currentTimestamp <= interval_data.to) {
            return true;
        }
        else {
            return false;
        }
    }
    static getTimeRangeByString(date_time, interval, tz = "UTC") {
        assert_1.assert.stringNotEmpty(date_time, "date_time");
        const timestamp = this.parseDateToTimestamp(date_time, tz);
        return this.getTimeRange(timestamp, interval, tz);
    }
    static getNextTimeRange(timestamp, interval, tz = "UTC") {
        assert_1.assert.positiveInt(timestamp, "timestamp");
        // Check if timezone is valid
        const testTimezone = (0, dayjs_1.default)().tz(tz).utcOffset();
        if (isNaN(testTimezone)) {
            throw new Error(`Invalid timezone: ${tz}`);
        }
        // Get the start of the next interval
        const startOfNext = dayjs_1.default.unix(timestamp).tz(tz).add(1, interval).startOf(interval);
        // Get the end of the next interval
        const endOfNext = dayjs_1.default.unix(startOfNext.unix()).tz(tz).endOf(interval);
        const from = startOfNext.unix();
        const to = endOfNext.unix();
        const from_dateTime_ISO = startOfNext.utc().format(TIME_FORMATS.ISO);
        const from_dateTime_MySql = startOfNext.tz(tz).format(TIME_FORMATS.MYSQL_DATE_TIME);
        const to_dateTime_ISO = endOfNext.utc().format(TIME_FORMATS.ISO);
        const to_dateTime_MySql = endOfNext.tz(tz).format(TIME_FORMATS.MYSQL_DATE_TIME);
        const format_timezone = tz;
        return {
            from,
            to,
            format_timezone,
            from_dateTime_ISO,
            from_dateTime_MySql,
            to_dateTime_ISO,
            to_dateTime_MySql
        };
    }
    static createCustomRange(from, to, tz = "UTC") {
        // Parse the 'from' and 'to' dates
        const fromTimestamp = typeof from === "string" ? this.parseDateToTimestamp(from, tz) : from;
        const toTimestamp = typeof to === "string" ? this.parseDateToTimestamp(to, tz) : to;
        // Check if 'from' is after 'to'
        if (fromTimestamp > toTimestamp) {
            throw new Error("'from' should be before 'to'");
        }
        // Create the start and end of the range
        const startOf = dayjs_1.default.unix(fromTimestamp).tz(tz).startOf('day');
        const endOf = dayjs_1.default.unix(toTimestamp).tz(tz).endOf('day');
        // Convert the start and end to Unix timestamps
        const fromUnix = startOf.unix();
        const toUnix = endOf.unix();
        // Format the start and end as ISO and MySQL date strings
        const fromDateTimeISO = startOf.utc().format(TIME_FORMATS.ISO);
        const fromDateTimeMySql = startOf.tz(tz).format(TIME_FORMATS.MYSQL_DATE_TIME);
        const toDateTimeISO = endOf.utc().format(TIME_FORMATS.ISO);
        const toDateTimeMySql = endOf.tz(tz).format(TIME_FORMATS.MYSQL_DATE_TIME);
        // Return the interval data
        return {
            from: fromUnix,
            to: toUnix,
            format_timezone: tz,
            from_dateTime_ISO: fromDateTimeISO,
            from_dateTime_MySql: fromDateTimeMySql,
            to_dateTime_ISO: toDateTimeISO,
            to_dateTime_MySql: toDateTimeMySql
        };
    }
    static createRanges(from, to, interval, tz = "UTC") {
        const ranges = [];
        let fromTimestamp;
        let toTimestamp;
        // Convert 'from' to timestamp
        if (typeof from === 'string') {
            fromTimestamp = this.parseDateToTimestamp(from, tz);
        }
        else {
            fromTimestamp = from;
        }
        // Convert 'to' to timestamp
        if (to === 'now') {
            toTimestamp = (0, dayjs_1.default)().unix();
        }
        else if (typeof to === 'string') {
            toTimestamp = this.parseDateToTimestamp(to, tz);
        }
        else {
            toTimestamp = to;
        }
        // Create ranges
        let currentTimestamp = fromTimestamp;
        while (currentTimestamp < toTimestamp) {
            if (ranges.length === 0) {
                let range = this.getTimeRange(currentTimestamp, interval, tz);
                ranges.push(range);
                currentTimestamp = range.to;
            }
            else {
                const nextRange = this.getNextTimeRange(currentTimestamp, interval, tz);
                ranges.push(nextRange);
                currentTimestamp = nextRange.to;
            }
        }
        return ranges;
    }
}
exports.time_range = time_range;
//# sourceMappingURL=time_range.js.map