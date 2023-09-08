import {staking} from "./build/staking";
import {assert} from "./assert";
import {user} from "./build/user";

export class staking_tools{
    public static async getStakingByAddress(address:unknown):Promise<staking>{
        const method = "staking_tools.getStakingByAddress";
        const stakingRecord = new staking();
        stakingRecord.staking_wallet_address = assert.stringNotEmpty(address,`${method}|address`);
        await stakingRecord.fetch();
        if(stakingRecord.isNew()) throw new Error(`${method}|staking address ${stakingRecord.staking_wallet_address} does not exist`);
        return stakingRecord;
    }
    public static async getStakingById(staking_id:unknown):Promise<staking>{
        const method = "staking_tools.getStakingById";
        const stakingRecord = new staking();
        stakingRecord.id = assert.positiveInt(staking_id,`${method}|staking_id`);
        await stakingRecord.fetch();
        if(stakingRecord.isNew()) throw new Error(`${method}|no staking record with id ${stakingRecord.id}`);
        return stakingRecord;
    }
    public static async getStakingByHash(staking_hash:unknown):Promise<staking>{
        const method = "getStakingByHash";
        const stakingRecord = new staking();
        stakingRecord.hash = assert.stringNotEmpty(staking_hash,`${method}|staking_hash`);
        await stakingRecord.fetch();
        if(stakingRecord.isNew()) throw new Error(`${method}|no staking record with hash ${stakingRecord.hash}`);
        return stakingRecord;
    }

    public static async getStakingByUserId(user_id:unknown,context:string=""):Promise<staking[]>{
        if(typeof user_id !== "number") throw new Error(`${context}|invalid user_id`);
        const stakings = new staking();
        await stakings.list(" WHERE user_id=:id ",{id:user_id});
        return stakings._dataList as staking[];
    }
}