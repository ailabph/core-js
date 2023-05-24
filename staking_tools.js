"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staking_tools = void 0;
const staking_1 = require("./build/staking");
const assert_1 = require("./assert");
class staking_tools {
    static async getStakingByAddress(address) {
        const method = "staking_tools.getStakingByAddress";
        const stakingRecord = new staking_1.staking();
        stakingRecord.staking_wallet_address = assert_1.assert.stringNotEmpty(address, `${method}|address`);
        await stakingRecord.fetch();
        if (stakingRecord.isNew())
            throw new Error(`${method}|staking address ${stakingRecord.staking_wallet_address} does not exist`);
        return stakingRecord;
    }
    static async getStakingById(staking_id) {
        const method = "staking_tools.getStakingById";
        const stakingRecord = new staking_1.staking();
        stakingRecord.id = assert_1.assert.positiveInt(staking_id, `${method}|staking_id`);
        await stakingRecord.fetch();
        if (stakingRecord.isNew())
            throw new Error(`${method}|no staking record with id ${stakingRecord.id}`);
        return stakingRecord;
    }
    static async getStakingByHash(staking_hash) {
        const method = "getStakingByHash";
        const stakingRecord = new staking_1.staking();
        stakingRecord.hash = assert_1.assert.stringNotEmpty(staking_hash, `${method}|staking_hash`);
        await stakingRecord.fetch();
        if (stakingRecord.isNew())
            throw new Error(`${method}|no staking record with hash ${stakingRecord.hash}`);
        return stakingRecord;
    }
}
exports.staking_tools = staking_tools;
//# sourceMappingURL=staking_tools.js.map