import {log_message} from "./build/log_message";
import {tools} from "./ailab-core";

export class logger{

    public static async add(message:string, category:string = "none", print:boolean = false):Promise<log_message>{
        const newLog = new log_message(true);
        newLog.category = category;
        newLog.message = message;
        newLog.time_added = tools.getCurrentTimeStamp();
        await newLog.save();
        if(print){
            console.log(`${tools.getTime().format()}|${category}|${message}`);
        }
        return newLog;
    }

}