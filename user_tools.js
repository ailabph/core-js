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
    static async getUser(id_or_username, context = "") {
        const method = "getUser ";
        if (id_or_username === null) {
            this.log(`unable to retrieve user, null passed`, method);
            return false;
        }
        const queryUser = new user_1.user();
        if (typeof id_or_username === "number") {
            this.log(`...retrieving by user id ${id_or_username}`, method);
            queryUser.id = assert_1.assert.positiveInt(id_or_username, `${method} id_or_username ${context}`);
        }
        else {
            this.log(`...retrieving by username ${id_or_username}`, method);
            queryUser.username = assert_1.assert.stringNotEmpty(id_or_username, `${method} id_or_username ${context}`);
        }
        await queryUser.fetch();
        if (queryUser.isNew()) {
            this.log(`...user not on db`, method);
            return false;
        }
        this.log(`...user found with id ${queryUser.id} username ${queryUser.username}`, method);
        return queryUser;
    }
    static async getUserStrict(id_or_username, desc = "") {
        if (!tools_1.tools.isEmpty(desc))
            desc = `${desc}|`;
        const query = await this.getUser(id_or_username);
        if (!query)
            throw new Error(`${desc}user not found`);
        return query;
    }
    static async getUserByWallet(wallet_address) {
        const method = "getUserByWallet";
        wallet_address = assert_1.assert.stringNotEmpty(wallet_address, `${method} wallet_address`);
        const queryUser = new user_1.user();
        await queryUser.list(" WHERE walletAddress=:address AND usergroup!=:claimed ", { address: wallet_address, claimed: "claimed" });
        if (queryUser.count() > 1)
            throw new Error(`multiple users found ${queryUser.count()}, with address ${wallet_address}`);
        return queryUser.getItem();
    }
    static async getUserByCode(code) {
        if (tools_1.tools.isEmpty(code) || tools_1.tools.isNullish(code))
            return false;
        const queryUser = new user_1.user();
        queryUser.qr_hash = code;
        await queryUser.fetch();
        if (queryUser.recordExists())
            return queryUser;
        else
            return false;
    }
    static async getUserByCodeStrict(code, desc = "") {
        const queryUser = await this.getUserByCode(code);
        if (typeof queryUser === "boolean") {
            if (tools_1.tools.isNotEmpty(desc))
                desc = desc + "|";
            throw new Error(`${desc}user not found with qr_hash code ${code}`);
        }
        else {
            return queryUser;
        }
    }
    static async getUsersByWalletAddress(address) {
        if (typeof address !== "string")
            throw new Error(`invalid wallet address, must be a string`);
        if (address === "")
            throw new Error(`invalid wallet address, must not be empty`);
        if (address.toLowerCase() === "null")
            throw new Error(`invalid wallet address, is null`);
        const users = new user_1.user();
        await users.list(" WHERE walletAddress=:walletAddress ", { walletAddress: address });
        return users._dataList;
    }
    //endregion GETTERS
    //region CHECKS
    static hasWalletAddress(u) {
        if (typeof u.walletAddress !== "string")
            return false;
        if (u.walletAddress === "")
            return false;
        if (u.walletAddress.toLowerCase() === "null")
            return false;
        return true;
    }
    static isPhUser(u) {
        return u.country_id === 173;
    }
}
exports.user_tools = user_tools;
//# sourceMappingURL=user_tools.js.map