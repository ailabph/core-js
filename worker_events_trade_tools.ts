import {SwapLog} from "./web3_log_decoder";
import {eth_receipt_logs_tools} from "./eth_receipt_logs_tools";
import {assert} from "./assert";
import BigNumber from "bignumber.js";
import {tools} from "./tools";

export class worker_events_trade_tools{
    public static calculateBnbPerTokenFromSwap(token_amount:string, busd_received:string, bnb_usd:string){
        assert.isNumericString(token_amount,`token_amount(${token_amount})`);
        assert.isNumericString(busd_received,`busd_received(${busd_received})`);
        assert.isNumericString(bnb_usd,`bnb_usd(${bnb_usd})`);

        if(tools.lesserThanOrEqualTo(token_amount,0)) return "0";
        if(tools.lesserThanOrEqualTo(busd_received,0)) return "0";
        if(tools.lesserThanOrEqualTo(bnb_usd,0)) return "0";

        const tokenAmountBN = new BigNumber(token_amount);
        const busdReceivedBN = new BigNumber(busd_received);
        const bnbUsdBN = new BigNumber(bnb_usd);

        const busdToBnbRate = bnbUsdBN;
        const totalBnbValue = busdReceivedBN.div(busdToBnbRate);
        const bnbValuePerToken = totalBnbValue.div(tokenAmountBN);

        return bnbValuePerToken.toFixed(18);
    }
    public static calculateBusdPerTokenFromSwap(token_amount: string, bnb_received: string, bnb_usd: string): string {
        assert.isNumericString(token_amount,`token_amount(${token_amount})`);
        assert.isNumericString(bnb_received,`token_amount(${bnb_received})`);
        assert.isNumericString(bnb_usd,`token_amount(${bnb_usd})`);

        if(tools.lesserThanOrEqualTo(token_amount,0)) return "0.000000000000000000";
        if(tools.lesserThanOrEqualTo(bnb_received,0)) return "0.000000000000000000";
        if(tools.lesserThanOrEqualTo(bnb_usd,0)) return "0.000000000000000000";

        const tokenAmountBN = new BigNumber(token_amount);
        const bnbReceivedBN = new BigNumber(bnb_received);
        const bnbUsdBN = new BigNumber(bnb_usd);

        const totalBusdValue = bnbReceivedBN.multipliedBy(bnbUsdBN);
        const busdValuePerToken = totalBusdValue.div(tokenAmountBN);

        return busdValuePerToken.toFixed(18);
    }
}