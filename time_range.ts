import dayjs, {Dayjs, ManipulateType, OpUnitType} from "dayjs";
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import {assert} from "./assert";
import {config} from "./config";
import {tools} from "./tools";

enum INTERVAL {
    HOUR = "hour",
    DAY = "day",
    MONTH = "month"
}
export { INTERVAL }

type INTERVAL_DATA = {
    from:number,
    to:number,
    format_timezone:string,
    from_dateTime_ISO:string,
    from_dateTime_MySql:string,
    to_dateTime_ISO:string,
    to_dateTime_MySql:string,
}
export { INTERVAL_DATA }

enum TIME_FORMATS {
    ISO = "YYYY-MM-DDTHH:mm:ssZ",
    MYSQL_DATE = "YYYY-MM-DD",
    MYSQL_DATE_TIME = "YYYY-MM-DD HH:mm:ss",
    READABLE = "YYYY-MM-DD hh:mm A",
}
export { TIME_FORMATS }

dayjs.extend(timezone);
dayjs.extend(utc);

export class time_range {

    public static getTimeRange(timestamp: number, range_type:INTERVAL, tz: string = "UTC"): INTERVAL_DATA {
        assert.positiveInt(timestamp, "timestamp");

        //Check if timezone is valid
        const testTimezone = dayjs().tz(tz).utcOffset();
        if (isNaN(testTimezone)) {
            throw new Error(`Invalid timezone: ${tz}`);
        }

        const startOf = dayjs.unix(timestamp).tz(tz).startOf(range_type as OpUnitType);
        const endOf = dayjs.unix(timestamp).tz(tz).endOf(range_type as OpUnitType);

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

    public static parseDateToTimestamp(dateTimeStr: string, tz: string): number {

        const parsed = dayjs.tz(dateTimeStr, tz);

        if(!parsed.isValid()) {
            throw new Error('Invalid date time string');
        }

        if(isNaN(parsed.utcOffset())) {
            throw new Error('Invalid timezone');
        }

        return parsed.unix();
    }

    public static isCurrentIntervalDataCurrent(interval_data: INTERVAL_DATA): boolean {
        // Basic checks
        assert.positiveInt(interval_data.from, "from");
        assert.positiveInt(interval_data.to, "to");
        if(interval_data.from > interval_data.to) throw new Error( "from should be less than or equal to to");

        // Get current timestamp
        const currentTimestamp = dayjs().unix();

        // Check if current time falls within the interval
        if (currentTimestamp >= interval_data.from && currentTimestamp <= interval_data.to) {
            return true;
        } else {
            return false;
        }
    }

    public static getTimeRangeByString(date_time:string, interval:INTERVAL, tz:string = "UTC"):INTERVAL_DATA{
        assert.stringNotEmpty(date_time,"date_time");
        const timestamp = this.parseDateToTimestamp(date_time, tz);
        return this.getTimeRange(timestamp, interval, tz);
    }

    public static getNextTimeRange(timestamp: number, interval: INTERVAL, tz: string = "UTC"): INTERVAL_DATA {
        assert.positiveInt(timestamp, "timestamp");

        // Check if timezone is valid
        const testTimezone = dayjs().tz(tz).utcOffset();
        if (isNaN(testTimezone)) {
            throw new Error(`Invalid timezone: ${tz}`);
        }

        // Get the start of the next interval
        const startOfNext = dayjs.unix(timestamp).tz(tz).add(1, interval as ManipulateType).startOf(interval as OpUnitType);

        // Get the end of the next interval
        const endOfNext = dayjs.unix(startOfNext.unix()).tz(tz).endOf(interval as OpUnitType);

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

    public static createCustomRange(from: string|number, to: string|number, tz: string = "UTC"): INTERVAL_DATA {
        // Parse the 'from' and 'to' dates
        const fromTimestamp = typeof from === "string" ? this.parseDateToTimestamp(from, tz) : from;
        const toTimestamp = typeof to === "string" ? this.parseDateToTimestamp(to, tz) : to;

        // Check if 'from' is after 'to'
        if (fromTimestamp > toTimestamp) {
            throw new Error("'from' should be before 'to'");
        }

        // Create the start and end of the range
        const startOf = dayjs.unix(fromTimestamp).tz(tz).startOf('day');
        const endOf = dayjs.unix(toTimestamp).tz(tz).endOf('day');

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

    public static createRanges(from: number | string, to: number | string, interval: INTERVAL, tz: string = "UTC"): INTERVAL_DATA[] {
        const ranges: INTERVAL_DATA[] = [];
        let fromTimestamp: number;
        let toTimestamp: number;

        // Convert 'from' to timestamp
        if (typeof from === 'string') {
            fromTimestamp = this.parseDateToTimestamp(from, tz);
        } else {
            fromTimestamp = from;
        }

        // Convert 'to' to timestamp
        if (to === 'now') {
            toTimestamp = dayjs().unix();
        } else if (typeof to === 'string') {
            toTimestamp = this.parseDateToTimestamp(to, tz);
        } else {
            toTimestamp = to;
        }


        // Create ranges
        let currentTimestamp = fromTimestamp;
        while (currentTimestamp < toTimestamp) {
            if(ranges.length === 0){
                let range = this.getTimeRange(currentTimestamp, interval, tz);
                ranges.push(range);
                currentTimestamp = range.to;
            }
            else{
                const nextRange = this.getNextTimeRange(currentTimestamp, interval, tz);
                ranges.push(nextRange);
                currentTimestamp = nextRange.to;
            }
        }

        return ranges;
    }
}