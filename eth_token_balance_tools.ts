import {eth_token_balance_header} from "./build/eth_token_balance_header";
import {eth_config} from "./eth_config";
import {web3_tools} from "./web3_tools";
import {eth_contract_events} from "./build/eth_contract_events";
import {config} from "./config";
import {tools} from "./tools";
import {assert} from "./assert";
import {eth_token_balance} from "./build/eth_token_balance";
import {user} from "./build/user";
import {eth_price_track_details_tools} from "./eth_price_track_details_tools";
import {eth_receipt_logs_tools} from "./eth_receipt_logs_tools";


//region TYPES
enum ENTRY_TYPE {
    DEBIT = "debit",
    CREDIT = "credit",
}
export { ENTRY_TYPE };
//endregion TYPES

export class eth_token_balance_tools{

    private static log(msg:string,method:string,end:boolean=false,force_display:boolean=false):void{
        if(config.getConfig().verbose_log || force_display){
            console.log(`eth_token_balance_tools|${method}|${msg}`);
            if(end) console.log(`eth_token_balance_tools|${method}|${tools.LINE}`);
        }
    }

    //region UTILITIES
    private static async updatePrices(detail:eth_token_balance,token_amount:string):Promise<eth_token_balance>{
        const method = "updatePrices";
        assert.stringNotEmpty(detail.transactionHash,`${method} detail.transactionHash`);
        assert.positiveInt(detail.logIndex,`${method} detail.logIndex`);
        token_amount = assert.isNumericString(token_amount,`${method} token_amount`,0);
        const dbLog = await eth_receipt_logs_tools.getDbLog(detail.transactionHash,detail.logIndex);
        detail.bnb_usd = await eth_price_track_details_tools.getBnbUsdPrice(dbLog);
        detail.bnb_price = await eth_price_track_details_tools.getBnbTokenPrice(dbLog,eth_config.getTokenContract());
        detail.bnb_value = await eth_price_track_details_tools.getBnbTokenValue(dbLog,eth_config.getTokenContract(),token_amount);
        detail.usd_price = tools.multiply(detail.bnb_price,detail.bnb_usd);
        detail.usd_value = tools.multiply(detail.usd_price,token_amount);
        return detail;
    }

    private static updateLastValues(header:eth_token_balance_header,detail:eth_token_balance):eth_token_balance_header{
        header.last_BlockTime = detail.blockTime;
        header.last_logIndex = detail.logIndex;
        header.last_transactionHash = detail.transactionHash;
        header.last_BlockTime = detail.blockTime;
        return header;
    }

    private static async createTokenBalanceDetail(address:string|eth_token_balance_header, event:eth_contract_events):Promise<eth_token_balance>{
        const method = "createTokenBalanceDetail";
        this.log(`creating new token balance detail`,method);
        if(typeof address === "string"){
            address = await this.getBalanceHeaderOf(address);
        }
        let detail:eth_token_balance = new eth_token_balance();
        detail.address = address.address;
        detail.type = "transfer";
        detail.blockNumber = assert.positiveInt(event.blockNumber,`${method} event.blockNumber`);
        detail.logIndex = assert.positiveInt(event.logIndex,`${method} event.logIndex`);
        detail.transactionHash = assert.stringNotEmpty(event.txn_hash,`${method} event.txn_hash`);
        detail.blockTime = assert.positiveInt(event.block_time,`${method} event.block_time`);
        detail.username = "";
        this.log(`...address type ${address.type}`,method);
        if(address.type === "wallet"){
            this.log(`...attempt retrieve wallet owner`,method);
            const member = new user();
            member.walletAddress = address.address;
            await member.fetch();
            if(member.recordExists()){
                detail.username = member.username;
                this.log(`...owner found ${detail.username}`,method);
            }
            else{
                this.log(`...no wallet owner`,method);
            }
        }
        return detail;
    }
    //endregion UTILITIES

    public static async getBalanceHeaderOf(address:string):Promise<eth_token_balance_header>{
        const method = "getBalanceHeaderOf";
        this.log(`retrieving balance header of ${address}`,method);
        assert.inTransaction();
        address = assert.stringNotEmpty(address,`${method} address`);
        const query = new eth_token_balance_header();
        query.address = address;
        await query.fetch();
        if(query.isNew()){
            this.log(`...header balance not found, creating new one`,method);
            query.token_contract = eth_config.getTokenContract();
            query.token_symbol = eth_config.getTokenSymbol();
            query.address = address;
            if(await web3_tools.isWalletAddress(address)){
                query.type = "wallet";
            }
            else if(await web3_tools.isContractAddress(address)){
                query.type = "contract";
            }
            else{
                query.type = "unknown";
            }
            await query.save();
            this.log(`...saved with id: ${query.id}`,method);
        }
        this.log(`...returning header balance record with id ${query.id}`,method);
        return query;
    }

    public static async addBalanceEntryForTransfer(address:string, entry_type:ENTRY_TYPE, token_amount:string, event:eth_contract_events):Promise<eth_token_balance>{
        const method = "addBalanceEntry";
        this.log(`adding balance entry for ${address}`,method);
        assert.inTransaction();
        if(event.log_method?.toLowerCase() !== "transfer") throw new Error(`${method} unable to add balance entry for transfer, log method is not transfer`);
        token_amount = assert.isNumericString(token_amount,`${method} token_amount`,0);
        let balanceHeader:eth_token_balance_header  = await this.getBalanceHeaderOf(address);
        let newEntry:eth_token_balance = await this.createTokenBalanceDetail(balanceHeader,event);
        
        if(entry_type === ENTRY_TYPE.DEBIT){
            this.log(`... DEBIT ${token_amount} to current balance ${balanceHeader.current_balance}`,method);
            newEntry.debit = token_amount;
            balanceHeader.total_debit = tools.add(balanceHeader.total_debit,token_amount,eth_config.getTokenDecimal());
            balanceHeader.current_balance = tools.add(balanceHeader.current_balance,token_amount,eth_config.getTokenDecimal());
        }
        else{
            this.log(`... CREDIT ${token_amount} to current balance ${balanceHeader.current_balance}`,method);
            newEntry.credit = token_amount;
            balanceHeader.total_credit = tools.add(balanceHeader.total_credit,token_amount,eth_config.getTokenDecimal());
            balanceHeader.current_balance = tools.deduct(balanceHeader.current_balance,token_amount,eth_config.getTokenDecimal());
        }
        newEntry.token_amount = balanceHeader.current_balance;
        newEntry = await this.updatePrices(newEntry,token_amount);
        await newEntry.save();
        balanceHeader = this.updateLastValues(balanceHeader,newEntry);
        await balanceHeader.save();
        this.log(`...current token balance is ${balanceHeader.current_balance}`,method);
        return newEntry;
    }

    public static async addBalanceEntryForTrade(event:eth_contract_events):Promise<eth_token_balance|false>{
        const method = "addBalanceEntryForTrade";
        this.log(`adding balance entry for trade`,method);
        assert.inTransaction();
        if(event.log_method?.toLowerCase() !== "swap") throw new Error(`${method} unable to add balance entry for trade, log method is not swap`);
        const transactionHash = assert.stringNotEmpty(event.txn_hash,`${method} event.txn_hash`);
        const logIndex = assert.positiveInt(event.logIndex,`${method} event.logIndex`);

        /**
         * at this point, swap owner is not known, retrieving the transfer counterpart of this transaction
         * transactionHash, type=:transfer, logIndex < logIndex and (buy debit > 0)
         */

        this.log(`...retrieving transfer balance detail with hash ${transactionHash} and logIndex < ${logIndex} `,method);
        let where = " WHERE transactionHash=:hash AND type=:transfer AND logIndex<:swapLogIndex ";
        const param:{[key:string]:string|number} = {};
        param["hash"] = transactionHash;
        param["transfer"] = "transfer";
        param["swapLogIndex"] = logIndex;
        param["zero"] = 0;
        if(event.type === "buy"){
            this.log(`...buy detected, retrieving balance detail with debit > 0`,method);
            where += " AND debit>:zero ";
        }
        else if(event.type === "sell"){
            this.log(`...sell detected, retrieving balance detail with credit > 0`,method);
            where += " AND credit>:zero ";
        }
        else{
            throw new Error(`${method} unexpected event.type ${event.type}, expected to be buy or sell`);
        }
        const balanceDetails = new eth_token_balance();
        await balanceDetails.list(where,param," ORDER BY logIndex DESC LIMIT 1 ");
        if(balanceDetails.count() === 0 && event.method?.toLowerCase() === "unknown"){
            this.log(`...no transfer counterpart found for this trade and transaction method is unknown, skipping process...`,method);
            return false;
        }
        if(balanceDetails.count() !== 1) throw new Error(`${method} expected balance detail transfer count to be 1, found ${balanceDetails.count()}`);

        let transferDetail:eth_token_balance = balanceDetails.getItem();
        const originalLogIndex = transferDetail.logIndex;

        let balanceHeader:eth_token_balance_header = await this.getBalanceHeaderOf(transferDetail.address);

        /*
        from this transfer bonus detail, we can now retrieve who is the swapper. we also need to change the details of this
        detail to swap
         */
        transferDetail.logIndex = logIndex;
        transferDetail.type = event.type;
        const eventTokenAmount = event.type === "buy" ? event.toAmount : event.fromAmount;
        let token_amount = "0";
        if(event.type === "buy"){
            transferDetail.other_token = event.fromSymbol;
            transferDetail.other_token_amount = event.fromAmountGross;
            token_amount = assert.isNumericString(transferDetail.debit,`${method} transferDetail.debit`);
            balanceHeader.total_buy = tools.add(balanceHeader.total_buy,token_amount);
        }
        else if(event.type === "sell"){
            transferDetail.other_token = event.toSymbol;
            transferDetail.other_token_amount = event.toAmount;
            token_amount = assert.isNumericString(transferDetail.credit,`${method} transferDetail.credit`);
            balanceHeader.total_sell = tools.add(balanceHeader.total_sell,token_amount);
        }

        if(tools.notEqualTo(token_amount,eventTokenAmount,`${method} token_amount != eventTokenAmount`)){
            throw new Error(`${method} balance detail debit/credit amount ${token_amount} != event token amount ${eventTokenAmount}`);
        }

        this.log(`...other_token ${transferDetail.other_token} other_token_amount ${transferDetail.other_token_amount}`,method);
        transferDetail.other_token = assert.stringNotEmpty(transferDetail.other_token,`${method} transferDetail.other_token`);
        transferDetail.other_token_amount = assert.isNumericString(transferDetail.other_token_amount,`${method} transferDetail.other_token_amount`,0);

        transferDetail = await this.updatePrices(transferDetail,token_amount);
        await transferDetail.save();

        balanceHeader = this.updateLastValues(balanceHeader,transferDetail);
        await balanceHeader.save();

        this.log(`...updated balance detail ${transferDetail.id} logIndex from ${originalLogIndex} to ${transferDetail.logIndex}, updated type to ${event.type}`,method);
        return transferDetail;
    }



}