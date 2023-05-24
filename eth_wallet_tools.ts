import {eth_wallet} from "./build/eth_wallet";
import {assert} from "./assert";
import {staking} from "./build/staking";

export class eth_wallet_tools{
    public static async getWallet(address:unknown, for_staking:boolean):Promise<eth_wallet>{
        const method = "eth_wallet_tools.getWallet";
        const wallet = new eth_wallet();
        wallet.wallet_address = assert.stringNotEmpty(address,`${method}|address`);
        await wallet.fetch();
        if(wallet.isNew()) throw new Error(`${method}|wallet ${wallet.wallet_address} does not exist in db`);
        if(for_staking && typeof wallet.staking_id !== "number") throw new Error(`${method}|wallet ${wallet.wallet_address} has no staking_id`);
        return wallet;
    }
}