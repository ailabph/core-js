import {assert} from "./assert";
import {meta_options} from "./build/meta_options";
import {time_helper} from "./time_helper";

export class meta_options_tools{
    private static seconds_online_threshold:number = 10;
    public static async updateOnlineStatus(worker_name:string):Promise<void>{
        assert.stringNotEmpty(worker_name,`worker_name`);
        const option = new meta_options();
        option.tag = `online_status_${worker_name}`;
        await option.fetch();
        option.type = `online_status`;
        option.time_updated = time_helper.getCurrentTimeStamp();
        await option.save();
    }
    public static async isOnline(worker_name:string):Promise<boolean> {
        const look_back = time_helper.getCurrentTimeStamp() - this.seconds_online_threshold;
        const worker_status = new meta_options();
        worker_status.tag = `online_status_${worker_name}`;
        await worker_status.fetch();
        if (worker_status.isNew()) return false;
        if (worker_status.time_updated === null) return false;
        return worker_status.time_updated >= look_back;
    }
}