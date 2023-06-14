"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_trade_process = void 0;
const time_helper_1 = require("./time_helper");
const trade_days_1 = require("./build/trade_days");
const assert_1 = require("./assert");
const tools_1 = require("./tools");
const user_1 = require("./build/user");
class worker_trade_process {
    static async summary(from, to) {
        const fromTime = time_helper_1.time_helper.getTime(from);
        const fromTimeUnix = fromTime.startOf("D").unix();
        const toTime = time_helper_1.time_helper.getTime(to);
        const toTimeUnix = toTime.endOf("D").unix() + 1;
        const tradeDays = new trade_days_1.trade_days();
        await tradeDays.list(" WHERE from_time>=:from AND to_time<=:to ", { from: fromTimeUnix, to: toTimeUnix }, " ORDER BY date_period ASC ");
        let total_gross_profit = 0;
        for (const trade of tradeDays._dataList) {
            console.log(`${trade.date_period} est profit ${trade.est_profit_percentage}`);
            assert_1.assert.isNumeric(trade.est_profit_percentage);
            const parsed_est_profit_percentage = tools_1.tools.parseNumber(trade.est_profit_percentage);
            total_gross_profit = total_gross_profit + parsed_est_profit_percentage;
        }
        let total_trade_fund = 0;
        const participants = new user_1.user();
        await participants.list(" WHERE trade_bnb_balance > :zero ", { zero: 0 }, " ORDER BY trade_bnb_balance ASC ");
        for (const participant of participants._dataList) {
            console.log(`${participant.username} ${participant.trade_bnb_balance}`);
            const parsed_trade_bnb_balance = tools_1.tools.parseNumber(participant.trade_bnb_balance, "trade_bnb_balance", true);
            total_trade_fund = total_trade_fund + parsed_trade_bnb_balance;
        }
        const bnb_usd = 307;
        let profit_bnb = total_trade_fund * total_gross_profit;
        const trader_fee = profit_bnb * 0.1;
        const buy_back = profit_bnb * 0.1;
        const marketing = profit_bnb * 0.3;
        const participant_bnb = profit_bnb * 0.25;
        const participant_srt = profit_bnb * 0.25;
        const check_total_bnb = trader_fee + buy_back + marketing + participant_bnb + participant_srt;
        console.log(`trades from ${fromTime.format(time_helper_1.TIME_FORMATS.ISO)} to ${toTime.format(time_helper_1.TIME_FORMATS.ISO)}`);
        console.log(`total gross profit ${total_gross_profit}`);
        console.log(`total participants ${participants.count()}`);
        console.log(`total trade fund ${total_trade_fund} bnb ${total_trade_fund * bnb_usd} usd`);
        console.log(`gross profit ${profit_bnb} bnb ${profit_bnb * bnb_usd} usd`);
        console.log(`--50% company:`);
        console.log(`----10% trader fee ${trader_fee} bnb ${trader_fee * bnb_usd} usd`);
        console.log(`----10% buy back burn ${buy_back} bnb ${buy_back * bnb_usd} usd`);
        console.log(`----30% marketing ${marketing} bnb ${marketing * bnb_usd} usd`);
        console.log(`--50% participants:`);
        console.log(`----25% bnb trade fund ${participant_bnb} bnb ${participant_bnb * bnb_usd} usd`);
        console.log(`----25% srt tokens fund ${participant_srt} bnb ${participant_srt * bnb_usd} usd`);
        console.log(`check total profit ${check_total_bnb}`);
    }
}
exports.worker_trade_process = worker_trade_process;
//# sourceMappingURL=worker_trade_process.js.map