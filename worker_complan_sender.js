"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_complan_sender = void 0;
const process_1 = require("process");
const config_1 = require("./config");
const tools_1 = require("./tools");
//region TYPES
//endregion TYPES
class worker_complan_sender {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`${this.name}|${method}|${msg}`);
            if (end)
                console.log(`${this.name}|${method}|${tools_1.tools.LINE}`);
        }
    }
    static async run() {
        /**
         * get points_log not yet processed for sending
         * check if wallet has user owner
         * check if owner is PH
         * else send email
         */
    }
}
exports.worker_complan_sender = worker_complan_sender;
if (process_1.argv.includes("run_worker_complan_sender")) {
    console.log(`running worker to process points to token send request...`);
    worker_complan_sender.run().finally();
}
//# sourceMappingURL=worker_complan_sender.js.map