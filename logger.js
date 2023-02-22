"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const log_message_1 = require("./build/log_message");
const tools_1 = require("./tools");
class logger {
    static async add(message, category = "none", print = false) {
        const newLog = new log_message_1.log_message(true);
        newLog.category = category;
        newLog.message = message;
        newLog.time_added = tools_1.tools.getCurrentTimeStamp();
        await newLog.save();
        if (print) {
            console.log(`${tools_1.tools.getTime().format()}|${category}|${message}`);
        }
        return newLog;
    }
}
exports.logger = logger;
//# sourceMappingURL=logger.js.map