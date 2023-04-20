"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meta_options_tools = void 0;
const assert_1 = require("./assert");
const meta_options_1 = require("./build/meta_options");
const time_helper_1 = require("./time_helper");
class meta_options_tools {
    static async updateOnlineStatus(worker_name) {
        assert_1.assert.stringNotEmpty(worker_name, `worker_name`);
        const option = new meta_options_1.meta_options();
        option.tag = `online_status_${worker_name}`;
        await option.fetch();
        option.type = `online_status`;
        option.time_updated = time_helper_1.time_helper.getCurrentTimeStamp();
        await option.save();
    }
    static async isOnline(worker_name) {
        const look_back = time_helper_1.time_helper.getCurrentTimeStamp() - this.seconds_online_threshold;
        const worker_status = new meta_options_1.meta_options();
        worker_status.tag = `online_status_${worker_name}`;
        await worker_status.fetch();
        if (worker_status.isNew())
            return false;
        if (worker_status.time_updated === null)
            return false;
        return worker_status.time_updated >= look_back;
    }
}
exports.meta_options_tools = meta_options_tools;
meta_options_tools.seconds_online_threshold = 10;
//# sourceMappingURL=meta_options_tools.js.map