"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const log_message_1 = require("./build/log_message");
const ailab_core_1 = require("./ailab-core");
class logger {
    static add(message, category = "none", print = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const newLog = new log_message_1.log_message(true);
            newLog.category = category;
            newLog.message = message;
            newLog.time_added = ailab_core_1.tools.getCurrentTimeStamp();
            yield newLog.save();
            if (print) {
                console.log(`${ailab_core_1.tools.getTime().format()}|${category}|${message}`);
            }
            return newLog;
        });
    }
}
exports.logger = logger;
