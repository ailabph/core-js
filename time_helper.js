"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.time_helper = exports.TIME_FORMATS = exports.INTERVAL = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const timezone_1 = __importDefault(require("dayjs/plugin/timezone"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const assert_1 = require("./assert");
const config_1 = require("./config");
const tools_1 = require("./tools");
var INTERVAL;
(function (INTERVAL) {
    INTERVAL["HOUR"] = "h";
    INTERVAL["DAY"] = "d";
    // MONTH = "M",
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
class time_helper {
    static timeInit() {
        if (this.hasTimeInit)
            return;
        dayjs_1.default.extend(utc_1.default);
        dayjs_1.default.extend(timezone_1.default);
        this.hasTimeInit = true;
    }
    static getTimeZone(timezone_override = "") {
        if (tools_1.tools.isStringAndNotEmpty(timezone_override)) {
            return timezone_override;
        }
        const timezone = config_1.config.getCustomOption("timezone");
        if (!tools_1.tools.isEmpty(timezone))
            return timezone;
        return "Asia/Manila";
    }
    static getTime(time = null, timezone_override = "") {
        this.timeInit();
        let to_return = undefined;
        if (time === null) {
            to_return = (0, dayjs_1.default)();
        }
        else if (typeof time === "number" || typeof time === "string") {
            if (tools_1.tools.isUnixTimestamp(time)) {
                to_return = dayjs_1.default.unix(assert_1.assert.isNumber(time, "time", 0));
            }
            else if (tools_1.tools.isMilliseconds(time)) {
                to_return = dayjs_1.default.unix(assert_1.assert.isNumber(time, "time", 0));
            }
            else {
                to_return = dayjs_1.default.tz(time, this.getTimeZone(timezone_override));
            }
            if (to_return === undefined)
                throw new Error(`unable to create time object from passed argument:${time}`);
        }
        else {
            to_return = time;
        }
        to_return = (0, dayjs_1.default)(to_return.format()).tz(this.getTimeZone(timezone_override));
        return to_return;
    }
    static getTimeStampOf(dateTime, timezone_override = "") {
        assert_1.assert.isValidDate(dateTime);
        return this.getTime(dateTime, timezone_override).unix();
    }
    static getCurrentTimeStamp() {
        return time_helper.getTime().unix();
    }
    static getCurrentTimeStampMs() {
        return Date.now();
    }
    static getCurrentHrTime() {
        const timestamp = time_helper.getCurrentTimeStamp();
        const partHrTime = process.hrtime()[1];
        return parseInt(timestamp + "" + partHrTime);
    }
    static getAsFormat(current_time, format, timezone_override = "") {
        if (!format) {
            format = TIME_FORMATS.READABLE;
        }
        return this.getTime(current_time, timezone_override).format(format);
    }
    static getTimeIntervals(interval, from, to, timezone_override = "") {
        if (typeof from === "string")
            from = time_helper.getTime(from, timezone_override).unix();
        else
            assert_1.assert.positiveInt(from);
        if (typeof to === "string")
            to = time_helper.getTime(to, timezone_override).unix();
        else
            assert_1.assert.positiveInt(to);
        if (from > to)
            throw new Error(`from${from} is greater than to${to}`);
        timezone_override = tools_1.tools.isEmpty(timezone_override) ? this.getTimeZone() : timezone_override;
        const fromTime = this.getTime(from, timezone_override).startOf(interval).tz(timezone_override);
        const toTime = this.getTime(to, timezone_override).endOf(interval).tz(timezone_override);
        let collection = [];
        let currentStart = this.getTime(fromTime.unix(), timezone_override);
        let currentEnd = this.getTime(fromTime.unix(), timezone_override).endOf(interval).tz(timezone_override);
        while (currentEnd.unix() <= toTime.unix()) {
            collection.push({
                from: currentStart.unix(),
                from_dateTime: currentStart.format(TIME_FORMATS.ISO),
                to: currentEnd.unix(),
                to_dateTime: currentEnd.format(TIME_FORMATS.ISO)
            });
            currentStart = currentStart.add(1, interval).tz(timezone_override);
            currentEnd = currentStart.endOf(interval).tz(timezone_override);
        }
        return collection;
    }
    //region UTILITIES
    static getStartOfDay(time = null, is_utc = false) {
        this.timeInit();
        const parsedTime = this.getTime(time);
        if (is_utc) {
            return this.getTime(parsedTime.format("YYYY-MM-DD") + "T00:00:00+00:00");
        }
        else {
            return parsedTime.startOf("D");
        }
    }
    static formatSeconds(seconds) {
        const yearSeconds = 365 * 24 * 60 * 60;
        const monthSeconds = 30 * 24 * 60 * 60;
        const daySeconds = 24 * 60 * 60;
        const hourSeconds = 60 * 60;
        const minuteSeconds = 60;
        let remainingSeconds = seconds;
        let years = Math.floor(remainingSeconds / yearSeconds);
        remainingSeconds -= years * yearSeconds;
        let months = Math.floor(remainingSeconds / monthSeconds);
        remainingSeconds -= months * monthSeconds;
        let days = Math.floor(remainingSeconds / daySeconds);
        remainingSeconds -= days * daySeconds;
        let hours = Math.floor(remainingSeconds / hourSeconds);
        remainingSeconds -= hours * hourSeconds;
        let minutes = Math.floor(remainingSeconds / minuteSeconds);
        remainingSeconds -= minutes * minuteSeconds;
        let result = '';
        if (years > 0) {
            result += `${years} year${years > 1 ? 's' : ''}, `;
        }
        if (months > 0) {
            result += `${months} month${months > 1 ? 's' : ''}, `;
        }
        if (days > 0) {
            result += `${days} day${days > 1 ? 's' : ''}, `;
        }
        if (hours > 0) {
            result += `${hours} hour${hours > 1 ? 's' : ''}, `;
        }
        if (minutes > 0) {
            result += `${minutes} minute${minutes > 1 ? 's' : ''}`;
        }
        if (result === '') {
            result = '0 minutes';
        }
        return result;
    }
}
exports.time_helper = time_helper;
time_helper.hasTimeInit = false;
//# sourceMappingURL=time_helper.js.map