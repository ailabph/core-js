import {eth_price_track_header} from "./build/eth_price_track_header";
import {eth_price_track_details} from "./build/eth_price_track_details";
import {eth_receipt_logs} from "./build/eth_receipt_logs";
import {assert} from "./assert";
import {config} from "./config";
import {ContractInfo} from "./eth_types";
import {eth_config} from "./eth_config";
import {tools} from "./tools";
import {eth_price_track_header_tools} from "./eth_price_track_header_tools";
import {TIME_FORMATS, time_helper} from "./time_helper";
import {eth_contract_data_tools} from "./eth_contract_data_tools";

enum ORDER{
    ASC="ASC",
    DESC="DESC"
}
export { ORDER }

interface getDetailsArgument {
    from_time?:number,
    to_time?:number,
    log?:eth_receipt_logs,
    order?:ORDER,
    limit?:number,
}

/**
 * This class is exclusive for price retrieval or computation via db only
 */
export class eth_price_track_details_tools{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`eth_price_track_details_tools|${method}|${msg}`);
            if(end) console.log(`eth_price_track_details_tools|${method}|${tools.LINE}`);
        }
    }

    public static async getDetails(
        header:number|string|eth_price_track_header,
        {from_time=0,to_time=0,log=undefined,order=ORDER.DESC,limit=1}:getDetailsArgument,
        strict:boolean=false
    ):Promise<eth_price_track_details|false>
    {
        const method = `getDetails`;
        this.log(`retrieving price details. establishing header`,method);
        const details = new eth_price_track_details();
        try{
            const retrievedHeader = await eth_price_track_header_tools.getViaIdOrContractStrict(header);
            const orderString = ` ORDER BY blockNumber ${order}, logIndex ${order} LIMIT ${limit} `;
            if(log){
                this.log(`db log passed, retrieving via blockNumber(${log.blockNumber}) and logIndex(${log.logIndex})`,method);
                const blockNumber = assert.positiveNumber(log.blockNumber,`${method}|log.blockNumber`);
                const logIndex = assert.naturalNumber(log.logIndex,`${method}|log.logIndex`);
                await details.list(
                    " WHERE header_id=:header_id AND blockNumber=:blockNumber AND logIndex<=:logIndex ",
                    {header_id:retrievedHeader.id, blockNumber:blockNumber,logIndex:logIndex},
                    orderString);
            }
            if(details.count() === 0){
                if(log){
                    this.log(`no details found via logs method, retrieving via timestamp`,method);
                }
                let where = " WHERE header_id=:header_id ";
                let param:{[key:string]:string|number} = {};
                param["header_id"] = assert.positiveNumber(retrievedHeader.id);
                if(from_time > 0){
                    const fromTimeInfo = time_helper.getTime(from_time,"UTC");
                    this.log(`from ${fromTimeInfo.format(TIME_FORMATS.READABLE)}`,method);
                    where += " AND blockTime>=:from ";
                    param["from"]=from_time;
                }
                else{
                    this.log(`no from_time info`,method);
                }
                if(to_time > 0){
                    const toTimeInfo = time_helper.getTime(to_time,"UTC");
                    this.log(`to ${toTimeInfo.format(TIME_FORMATS.READABLE)}`,method);
                    where += " AND blockTime<=:to ";
                    param["to"] = to_time;
                }
                else{
                    if(log){
                        const toTimeInfo = time_helper.getTime(log.blockTime,"UTC");
                        this.log(`no to time info specified, using time in db_log `,method);
                        this.log(`to ${toTimeInfo.format(TIME_FORMATS.READABLE)}`,method);
                        where += " AND blockTime<=:to ";
                        param["to"] = toTimeInfo.unix();
                    }
                }
                this.log(`current query ${where}`,method);
                await details.list(where,param,orderString);
            }
        }catch (e){
            if(e instanceof Error){
                this.log(e.message,method,true,true);
                if(strict) throw new eth_price_track_details_tools_error(e.message);
            }
            return false;
        }
        if(details.count() === 1){
            const item = details._dataList[0] as eth_price_track_details;
            this.log(`found blockNumber ${item.blockNumber} logIndex ${item.logIndex}`,method);
        }
        this.log(`found:${details.count()}`,method,true);
        return details;
    }
    public static async getDetail(header:number|string|eth_price_track_header,time_or_log:number|string|eth_receipt_logs,strict:boolean=false):Promise<eth_price_track_details>{
        const method = "getDetail";
        let detail = new eth_price_track_details();
        try{
            header = await eth_price_track_header_tools.getViaIdOrContractStrict(header);
            this.log(`retrieving price detail for ${eth_price_track_header_tools.getOrderedPairSymbol(header)} ${tools.lastSubstring(header.pair_contract,6)}`,method);
            const arg:{[key:string]:any} = {};
            arg["order"] = ORDER.DESC;
            arg["limit"] = 1;
            if(typeof time_or_log === "number" || typeof time_or_log === "string"){
                this.log(`time argument passed:${time_or_log}`,method);
                const timeInfo = time_helper.getTime(time_or_log,"UTC");
                arg["to_time"] = timeInfo.unix();
            }
            else{
                this.log(`db log argument passed`,method);
                arg["log"] = time_or_log;
            }
            const details = await this.getDetails(header,arg,strict);
            if(!details) throw new Error(`no price details found`);
            if(details.count() === 0)  throw new Error(`no price details found`);
            detail = details.getItem();
        }catch (e){
            if(e instanceof Error){
                this.log(e.message,method,true,true);
                if(strict) throw new eth_price_track_details_tools_error(e.message);
            }
        }
        return detail;
    }
    public static async getPrice(header:number|string|eth_price_track_header,time_or_log:number|string|eth_receipt_logs,strict:boolean=false):Promise<string>{
        const method = "getPrice";
        this.log(`retrieving price`,method);
        let price = "0.00";
        try{
            header = await eth_price_track_header_tools.getViaIdOrContractStrict(header);
            this.log(`...on pair ${eth_price_track_header_tools.getOrderedPairSymbol(header)} ${header.pair_contract}`,method);
            const detail = await this.getDetail(header,time_or_log,strict);
            if(detail.isNew()) throw new Error(`no price detail found`);
            this.log(`...price retrieved ${detail.price} on ${detail.blockNumber} ${detail.transactionHash} ${detail.logIndex} during ${time_helper.getAsFormat(detail.blockTime,TIME_FORMATS.ISO,"UTC")}`,method);
            price = assert.isNumeric<string>(detail.price,`eth_price_track_detail.price(${detail.price}) is not numeric`);
        }catch (e){
            this.log(`ERROR`,method,false,true);
            if(e instanceof Error){
                this.log(e.message,method,true,true);
                if(strict) throw new eth_price_track_details_tools_error(e.message);
            }
        }
        return price;
    }
    public static async getBnbPrice(header:number|string|eth_price_track_header,time_or_log:number|string|eth_receipt_logs,strict:boolean=false):Promise<string>{
        const method = "getBnbPrice";
        let bnb_price = "0.00";
        try{
            header = await eth_price_track_header_tools.getViaIdOrContractStrict(header);
            this.log(`retrieving bnb price of pair ${eth_price_track_header_tools.getOrderedPairSymbol(header)} ${header.pair_contract}`,method);
            const detail = await this.getDetail(header,time_or_log,strict);
            if(detail.isNew()) throw new Error(`no price detail found`);
            const price_bnb = assert.stringNotEmpty(detail.price_bnb,"detail.price_bnb");
            bnb_price = assert.isNumeric<string>(price_bnb,`eth_price_track_detail.price_bnb(${detail.price_bnb}) is not numeric`);
        }
        catch (e) {
            if(e instanceof Error){
                this.log(e.message,method,true,true);
                if(strict) throw new eth_price_track_details_tools_error(e.message);
            }
        }
        return bnb_price;

    }
    public static async getUsdPrice(header:number|string|eth_price_track_header,time_or_log:number|string|eth_receipt_logs,strict:boolean=false):Promise<string>{
        const method = "getUsdPrice";
        let usd_price = "0.00";
        try{
            header = await eth_price_track_header_tools.getViaIdOrContractStrict(header);
            this.log(`retrieving usd price of pair ${eth_price_track_header_tools.getOrderedPairSymbol(header)} ${header.pair_contract}`,method);
            const detail = await this.getDetail(header,time_or_log,strict);
            if(detail.isNew()) throw new Error(`no price detail found`);
            const price_usd = assert.stringNotEmpty(detail.price_usd,"detail.price_usd");
            usd_price = assert.isNumeric<string>(price_usd,`eth_price_track_detail.price_usd(${detail.price_usd}) is not numeric`);
        }
        catch (e){
            if(e instanceof Error){
                this.log(e.message,method,true,true);
                if(strict) throw new eth_price_track_details_tools_error(e.message);
            }
        }
        return usd_price;
    }

    public static async getBnbUsdPrice(time_or_log:number|string|eth_receipt_logs):Promise<string>{
        return this.getPrice(eth_config.getBnbUsdPairContract(),time_or_log);
    }
    public static async getBnbUsdValue(time_or_log:number|string|eth_receipt_logs,token_amount:string):Promise<string>{
        const bnbUsdPrice = await this.getBnbUsdPrice(time_or_log);
        return tools.toBn(bnbUsdPrice).multipliedBy(tools.toBn(token_amount)).toFixed(eth_config.getBusdDecimal());
    }

    public static async getBnbTokenPrice(time_or_log:number|string|eth_receipt_logs,token:string|ContractInfo):Promise<string>{
        const method = "getBnbTokenPrice";
        let price = "0.00";
        token = await eth_contract_data_tools.getContractDynamicStrict(token);
        this.log(`token symbol:${token.symbol} ${token.address}`,method);
        const tokenBnbPair = await eth_price_track_header_tools.getViaTokenContracts(eth_config.getEthContract(),token.address,false);
        if(!tokenBnbPair){
            this.log(`WBNB${token.symbol.toUpperCase()} pair does not exists`,method);
        }
        else{
            this.log(`bnb pair found:${tokenBnbPair.pair_contract}`,method);
            price = await this.getBnbPrice(tokenBnbPair,time_or_log,false);
        }

        return assert.isNumeric<string>(price,`${method}|price`);
    }
    public static async getBnbTokenValue(time_or_log:number|string|eth_receipt_logs,token:string|ContractInfo,token_amount:string):Promise<string>{
        const method = "getBnbTokenValue";
        token_amount = assert.isNumeric<string>(token_amount);
        token = await eth_contract_data_tools.getContractDynamicStrict(token);
        this.log(`retrieving bnb token value of ${token_amount} ${token.symbol}`,method);
        const bnbTokenPrice = await this.getBnbTokenPrice(time_or_log,token);
        return tools.toBn(bnbTokenPrice).multipliedBy(tools.toBn(token_amount)).toFixed(eth_config.getEthDecimal());
    }

}

class eth_price_track_details_tools_error extends Error{
    constructor(message:string) {
        super(message);
    }
}