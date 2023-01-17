
export class assert_eth{
    public static isLikelyTransactionHash(str:string):boolean{
        const regex = /^0x[a-fA-F0-9]{60,120}$/;
        if(!regex.test(str)) throw new Error(`hash:${str} is not likely a valid hash transaction string`);
        return true;
    }
}