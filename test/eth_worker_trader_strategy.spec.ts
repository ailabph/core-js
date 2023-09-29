import { expect } from "chai";
import * as assert2 from "assert";
import { connection} from "../connection";
import {eth_contract_events} from "../build/eth_contract_events";
import {eth_trade} from "../build/eth_trade";
import {TRADE_BUY_SELL_STATUS} from "../eth_worker_trade_strategy";

describe("eth_worker_trader_strategy spec trade logic",()=>{
    beforeEach(async()=>{
        await connection.startTransaction();
    });
    afterEach(async()=>{
        await connection.rollback();
    });

    it("placeholder test",()=>{
        assert2.equal(true,true);
    });


    // async function buy(bnb_amount:number|string,bnb_usd:number|string,bnb_token:number|string):Promise<eth_contract_events>{
    //     bnb_amount = tools.numericToString({val:bnb_amount});
    //     bnb_usd = tools.numericToString({val:bnb_usd});
    //     bnb_token = tools.numericToString({val:bnb_token});
    //
    //     const token_amount = tools.toBn(bnb_amount).multipliedBy(tools.toBn(bnb_token)).toFixed(18);
    //     const token_usd = eth_worker.getTokenUsd(bnb_usd,bnb_token);
    //     const token_usd_value = eth_worker.getTokenUsdValue(token_amount,bnb_usd,bnb_token);
    //
    //     let event = new eth_contract_events();
    //     event.txn_hash = `hash_${tools.generateRandomNumber(10000,99999)}`;
    //     event.blockNumber = tools.getCurrentTimeStamp();
    //     event.type = "buy";
    //     event.tag = "tag";
    //     event.method = "swapExactETHForTokens";
    //     event.fromAddress = "buyer_address";
    //     event.fromContract = "bnb_contract";
    //     event.fromSymbol = "bnb";
    //     event.fromDecimal = 18;
    //     event.fromValue = eth_worker.convertEthToValue(bnb_amount);
    //     event.fromAmount = bnb_amount;
    //     event.fromAmountGross = bnb_amount;
    //     event.fromTaxAmount = "0.00";
    //     event.fromTaxPerc = "0";
    //     event.toAddress = "buyer_address";
    //     event.toContract = "token_contract";
    //     event.toSymbol = "token";
    //     event.toDecimal = 18;
    //     event.toValue = eth_worker.convertTokenToValue(token_amount);
    //     event.toAmount = token_amount;
    //     event.toAmountGross = token_amount;
    //     event.toTaxAmount = "0";
    //     event.toTaxPerc = "0";
    //     event.tax_amount = "0";
    //     event.tax_percentage = 0;
    //     event.block_time = tools.getCurrentTimeStamp();
    //     event.bnb_price = bnb_usd;
    //     event.token_bnb_price_estimate = bnb_usd;
    //     event.bnb_usd = bnb_usd;
    //     event.token_bnb = bnb_token;
    //     event.token_usd = token_usd;
    //     event.token_bnb_value = bnb_amount;
    //     event.token_usd_value = token_usd_value;
    //     await event.save();
    //     return event;
    // }
    // async function sell(token_amount:number|string,bnb_usd:number|string,bnb_token:number|string):Promise<eth_contract_events>{
    //     token_amount = tools.numericToString({val:token_amount,dec:18,name:"token_amount",strict:true});
    //     bnb_usd = tools.numericToString({val:bnb_usd});
    //     bnb_token = tools.numericToString({val:bnb_token});
    //     const token_bnb_amount = eth_worker.getTokenBnbValue(token_amount,bnb_token);
    //     const token_usd = eth_worker.getTokenUsd(bnb_usd,bnb_token);
    //     const token_usd_value = eth_worker.getTokenUsdValue(token_amount,bnb_usd,bnb_token);
    //
    //     let event = new eth_contract_events();
    //     event.txn_hash = `hash_${tools.generateRandomNumber(10000,99999)}`;
    //     event.blockNumber = tools.getCurrentTimeStamp();
    //     event.type = "sell";
    //     event.tag = "tag";
    //     event.method = "swapExactTokensForETH";
    //     event.fromAddress = "seller_address";
    //     event.fromContract = "token_contract";
    //     event.fromSymbol = "token";
    //     event.fromDecimal = 18;
    //     event.fromValue = eth_worker.convertTokenToValue(token_amount);
    //     event.fromAmount = token_amount;
    //     event.fromAmountGross = token_amount;
    //     event.fromTaxAmount = "0.00";
    //     event.fromTaxPerc = "0";
    //     event.toAddress = "seller_address";
    //     event.toContract = "seller_contract";
    //     event.toSymbol = "bnb";
    //     event.toDecimal = 18;
    //     event.toValue = eth_worker.convertEthToValue(token_bnb_amount);
    //     event.toAmount = token_bnb_amount;
    //     event.toAmountGross = token_bnb_amount;
    //     event.toTaxAmount = "0";
    //     event.toTaxPerc = "0";
    //     event.tax_amount = "0";
    //     event.tax_percentage = 0;
    //     event.block_time = tools.getCurrentTimeStamp();
    //     event.bnb_price = bnb_usd;
    //     event.token_bnb_price_estimate = bnb_usd;
    //     event.bnb_usd = bnb_usd;
    //     event.token_bnb = bnb_token;
    //     event.token_usd = token_usd;
    //     event.token_bnb_value = token_bnb_amount;
    //     event.token_usd_value = token_usd_value;
    //     await event.save();
    //     return event;
    // }
    //
    // it("eth_worker_trader_strategy spec trigger buy 1",async()=>{
    //     await sell(1,300,0.1);
    //     await eth_worker_trade_strategy.run(false,tools.getCurrentTimeStamp(),false);
    //     const checkEthTrade = new eth_trade();
    //     await checkEthTrade.list(" WHERE 1 ");
    //     assert2.equal(checkEthTrade.count(),1,"total eth_trade");
    // });
    // it("eth_worker_trader_strategy spec trigger buy 3",async()=>{
    //     await sell(3,300,0.1);
    //     await eth_worker_trade_strategy.run(false,tools.getCurrentTimeStamp(),false);
    //     const checkEthTrade = new eth_trade();
    //     await checkEthTrade.list(" WHERE 1 ");
    //     assert2.equal(checkEthTrade.count(),3,"total eth_trade");
    // });
    //
    // it("eth_worker_trader_strategy spec trade profit",async()=>{
    //     await sell(1,300,0.1);
    //     await eth_worker_trade_strategy.run(false,tools.getCurrentTimeStamp(),false);
    //
    //     // set trade to complete
    //     let openTrades = new eth_trade();
    //     await openTrades.list(" WHERE 1 ");
    //     let eth_trade_id = 0;
    //     for(const trade of openTrades._dataList as eth_trade[]){
    //         trade.open_actual_usd_value = eth_worker.getTokenUsdValue(1,300,0.1);
    //         trade.open_bnb_usd = "300";
    //         trade.open_bnb_token = "0.1";
    //         trade.open_quote_amount = "1";
    //         trade.open_status = TRADE_BUY_SELL_STATUS.DONE;
    //         await trade.save();
    //         eth_trade_id = tools.parseInt({val:trade.id});
    //     }
    //
    //     await buy(1,300,0.2);
    //     await eth_worker_trade_strategy.run(false,tools.getCurrentTimeStamp(),false);
    //
    //     // close trade
    //     let closeTrade = new eth_trade();
    //     closeTrade.id = eth_trade_id;
    //     await closeTrade.fetch();
    //     closeTrade.close_actual_usd_value = eth_worker.getTokenUsdValue(1,300,0.2);
    //     closeTrade.close_bnb_usd = "300";
    //     closeTrade.close_bnb_token = "0.2";
    //     closeTrade.close_base_amount = eth_worker.getTokenBnbValue(1,0.2);
    //     closeTrade.profit_amount = tools.toBn(closeTrade.close_base_amount).minus(tools.toBn(closeTrade.open_base_amount)).toFixed(18);
    //     await closeTrade.save();
    //     console.log(closeTrade);
    //
    //     const checkEthTrade = new eth_trade();
    //     await checkEthTrade.list(" WHERE 1 ");
    //     assert2.equal(checkEthTrade.count(),1,"total eth_trade");
    //     const trade = checkEthTrade.getItem();
    //     assert2.equal("",trade.profit_amount,`${trade.profit_amount}`);
    // });
    //
    // it("eth_worker_trader_strategy spec excludes own trade",async()=>{
    //     // simulate sell from bot
    //     // const sell_eth_trade = new eth_trade();
    //     // const sell_event = await sell(1,300,0.1);
    // });
    //
    //
    //
    // it("eth_worker_trader_strategy spec trade stop loss",async()=>{});
});