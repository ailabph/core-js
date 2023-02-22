
//region TYPE
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

}