import dayjs, {Dayjs} from "dayjs";
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import {assert} from "./assert";
import {config} from "./config";
import {tools} from "./tools";

enum INTERVAL {
    HOUR = "h",
    DAY = "d",
    // MONTH = "M",
}
export { INTERVAL }

type INTERVAL_DATA = {
    from:number,
    from_dateTime:string,
    to:number,
    to_dateTime:string,
}
export { INTERVAL_DATA }

enum TIME_FORMATS {
    ISO = "YYYY-MM-DDTHH:mm:ssZ",
    MYSQL_DATE = "YYYY-MM-DD",
    MYSQL_DATE_TIME = "YYYY-MM-DD HH:mm:ss",
    READABLE = "YYYY-MM-DD hh:mm A",
}
export { TIME_FORMATS }

export class time_helper{

    private static hasTimeInit:boolean = false;
    private static timeInit(){
        if(this.hasTimeInit) return;
        dayjs.extend(utc);
        dayjs.extend(timezone);
        this.hasTimeInit = true;
    }
    private static getTimeZone(timezone_override:string = ""):string{
        if(tools.isStringAndNotEmpty(timezone_override)){
            return timezone_override;
        }
        const timezone = config.getCustomOption("timezone") as string;
        if(!tools.isEmpty(timezone)) return timezone;
        return "Asia/Manila";
    }
    public static getTime(time:number|string|Dayjs|null = null, timezone_override:string = "", desc:string=""):Dayjs{
        this.timeInit();
        let to_return:Dayjs|undefined = undefined;
        if(time === null){
            to_return = dayjs();
        }
        else if(typeof time === "number" || typeof time === "string"){
            if(tools.isUnixTimestamp(time)){
                to_return = dayjs.unix(assert.isNumber( time,"time",0));
            }
            else if(tools.isMilliseconds(time)){
                to_return = dayjs.unix(assert.isNumber(time,"time",0));
            }
            else{
                to_return = dayjs.tz(time,this.getTimeZone(timezone_override));
            }
            if(to_return === undefined) throw new Error(`${desc} unable to create time object from passed argument:${time}`);
        }
        else{
            to_return = time;
        }
        to_return = dayjs(to_return.format()).tz(this.getTimeZone(timezone_override));
        return to_return;
    }
    public static getTimeStampOf(dateTime:string, timezone_override:string = ""):number{
        assert.isValidDate(dateTime);
        return this.getTime(dateTime,timezone_override).unix();
    }
    public static getCurrentTimeStamp():number{
        return time_helper.getTime().unix();
    }
    public static getCurrentTimeStampMs():number{
        return Date.now();
    }
    public static getCurrentHrTime():number{
        const timestamp = time_helper.getCurrentTimeStamp();
        const partHrTime = process.hrtime()[1];
        return parseInt(timestamp+""+partHrTime);
    }
    public static getAsFormat(current_time:number|string, format?:TIME_FORMATS, timezone_override:string = ""):string{
        if(!format){
            format = TIME_FORMATS.READABLE;
        }
        return this.getTime(current_time,timezone_override).format(format);
    }
    public static getTimeIntervals(interval:INTERVAL,from:number|string,to:number|string,timezone_override:string = ""):INTERVAL_DATA[]{
        if(typeof from === "string") from = time_helper.getTime(from,timezone_override).unix();
        else assert.positiveInt(from);
        if(typeof to === "string") to = time_helper.getTime(to,timezone_override).unix();
        else assert.positiveInt(to);
        if(from > to) throw new Error(`from${from} is greater than to${to}`);

        timezone_override = tools.isEmpty(timezone_override) ? this.getTimeZone() : timezone_override;

        const fromTime = this.getTime(from,timezone_override).startOf(interval).tz(timezone_override);
        const toTime = this.getTime(to,timezone_override).endOf(interval).tz(timezone_override);

        let collection:INTERVAL_DATA[] = [];

        let currentStart = this.getTime(fromTime.unix() ,timezone_override);
        let currentEnd = this.getTime(fromTime.unix(),timezone_override).endOf(interval).tz(timezone_override);
        while(currentEnd.unix() <= toTime.unix()){
            collection.push({
                from: currentStart.unix(),
                from_dateTime: currentStart.format(TIME_FORMATS.ISO),
                to: currentEnd.unix(),
                to_dateTime: currentEnd.format(TIME_FORMATS.ISO)});
            currentStart = currentStart.add(1,interval).tz(timezone_override);
            currentEnd = currentStart.endOf(interval).tz(timezone_override);
        }

        return collection;
    }

    //region UTILITIES
    public static getStartOfDay(time:number|string|Dayjs|null = null, is_utc:boolean = false):Dayjs{
        this.timeInit();
        const parsedTime = this.getTime(time);
        if(is_utc){
            return this.getTime(parsedTime.format("YYYY-MM-DD")+"T00:00:00+00:00");
        }
        else{
            return parsedTime.startOf("D");
        }
    }
    public static formatSeconds(seconds: number): string {
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
    public static startOfHour(time:number|string|Dayjs|null = null, timezone = "UTC"):Dayjs{
        this.timeInit();
        time = this.getTime(time,timezone);
        const startOfHour = time.startOf("h");
        return this.getTime(startOfHour.unix(),timezone);
    }
    public static endOfHour(time:number|string|Dayjs|null = null, timezone = "UTC"):Dayjs{
        this.timeInit();
        time = this.getTime(time,timezone);
        const endOfHour = time.endOf("h");
        return this.getTime(endOfHour.unix(),timezone);
    }
    //endregion UTILITIES
}