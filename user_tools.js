"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.user_tools = void 0;
const config_1 = require("./config");
const tools_1 = require("./tools");
const assert_1 = require("./assert");
const user_1 = require("./build/user");
class user_tools {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`user_tools|${method}|${msg}`);
            if (end)
                console.log(`user_tools|${method}|${tools_1.tools.LINE}`);
        }
    }
    //region GETTERS
    static async getUser(id_or_username) {
        const method = "getUser";
        if (id_or_username === null) {
            this.log(`unable to retrieve user, null passed`, method);
            return false;
        }
        const queryUser = new user_1.user();
        if (typeof id_or_username === "number") {
            this.log(`...retrieving by user id ${id_or_username}`, method);
            queryUser.id = assert_1.assert.positiveInt(id_or_username, `${method} id_or_username`);
        }
        else {
            this.log(`...retrieving by username ${id_or_username}`, method);
            queryUser.username = assert_1.assert.stringNotEmpty(id_or_username, `${method} id_or_username`);
        }
        await queryUser.fetch();
        if (queryUser.isNew()) {
            this.log(`...user not on db`, method);
            return false;
        }
        this.log(`...user found with id ${queryUser.id} username ${queryUser.username}`, method);
        return queryUser;
    }
}
exports.user_tools = user_tools;
//# sourceMappingURL=user_tools.js.map