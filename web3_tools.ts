
//region TYPE
import {web3_rpc_web3} from "./web3_rpc_web3";

enum PAIR_POSITION {
    zero,
    one,
}
//endregion TYPE

export class web3_tools{

    public static getOrderedPair(token0:string,token1:string,position:PAIR_POSITION,separator:string=""):string{
        if(position === PAIR_POSITION.zero) return `${token0.toUpperCase()}${separator}${token1.toUpperCase()}`;
        else return `${token1.toUpperCase()}${separator}${token0.toUpperCase()}`;
    }

    public static async isContractAddress(address:string):Promise<boolean>{
        const code = await web3_rpc_web3.getWeb3Client().eth.getCode(address);
        return code !== '0x' && code !== '0x0';
    }
    public static async isContractAddressStrict(address:string,context:string="address"){
        const isContract = await this.isContractAddress(address);
        if(!isContract) throw new Error(`${context} is not a contract`);
    }
    public static async isWalletAddress(address:string):Promise<boolean>{
        return web3_rpc_web3.getWeb3Client().utils.isAddress(address) && !(await this.isContractAddress(address));
    }
    public static async assertWalletAddress(address:string,context:string="address"){
        const isWallet = await this.isWalletAddress(address);
        if(!isWallet) throw new Error(`${context} is not a wallet`);
    }

}