"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.binance_api = void 0;
const binance_api_node_1 = __importDefault(require("binance-api-node"));
const openai_1 = require("openai");
const config_1 = require("./config");
const process_1 = require("process");
// @ts-ignore
class binance_api {
    static getOpenAiApiKey() {
        return config_1.config.getCustomOption("open_ai_api_key", true);
    }
    constructor(apiKey, apiSecret) {
        this.openaiModelId = 'text-davinci-003';
        this.openai = new openai_1.OpenAIApi(new openai_1.Configuration({
            apiKey: binance_api.getOpenAiApiKey()
        }));
        this.client = (0, binance_api_node_1.default)({ apiKey, apiSecret });
        this.apiKey = apiKey;
    }
    async getTopPairs(numPairs) {
        const tickers = await this.client.allBookTickers();
        // Convert the object of tickers to an array of ticker objects
        const tickerArray = Object.values(tickers);
        // Sort the tickers by descending bid quantity
        // @ts-ignore
        const sortedTickers = tickerArray.sort((a, b) => parseFloat(b.bidQty) - parseFloat(a.bidQty));
        // Extract the top `numPairs` symbols and return the selected ticker data for each pair
        // @ts-ignore
        return sortedTickers.slice(0, numPairs).map(({ askPrice, askQty, bidPrice, bidQty, symbol }) => ({
            symbol: symbol,
            bidPrice: bidPrice,
            bidQty: bidQty,
            askPrice: askPrice,
            askQty: askQty,
        }));
    }
    async getKlinesData(symbol, interval, numMonths) {
        // Calculate the start time for the query based on the current time and the number of months to look back
        const startTime = new Date();
        startTime.setMonth(startTime.getMonth() - numMonths);
        // Query the klines data from the Binance API
        const klines = await this.client.candles({
            symbol,
            interval,
            startTime: startTime.getTime(),
        });
        // Convert the raw klines data to an array of Candlestick objects
        // @ts-ignore
        return klines.map((kline) => ({
            openTime: kline.openTime,
            open: kline.open,
            high: kline.high,
            low: kline.low,
            close: kline.close,
            volume: kline.volume,
            closeTime: kline.closeTime,
            quoteAssetVolume: kline.quoteAssetVolume,
            numTrades: kline.trades,
            takerBuyBaseAssetVolume: kline.buyVolume,
            takerBuyQuoteAssetVolume: kline.quoteVolume,
        }));
    }
    async getTechnicalAnalysisSummary(pair) {
        const interval = '1d';
        const numMonths = 3;
        // Retrieve the klines data for the last 3 months
        const klinesData = await this.getKlinesData(pair, interval, numMonths);
        // Calculate basic statistics from the klines data
        const highest = Math.max(...klinesData.map((kline) => parseFloat(kline.high)));
        const lowest = Math.min(...klinesData.map((kline) => parseFloat(kline.low)));
        const average = klinesData
            .map((kline) => parseFloat(kline.close))
            .reduce((a, b) => a + b) / klinesData.length;
        // Construct the input prompt for the OpenAI API
        const prompt = `Summarize the last 3 months of 1-day kline data for the trading pair ${pair} and provide a brief summary of 5 to 10 technical analyses, along with an accumulated summary at the end. The AI can choose which technical analyses to use. Over the last 3 months, the highest price was ${highest.toFixed(2)}, the lowest price was ${lowest.toFixed(2)}, and the average price was ${average.toFixed(2)}.`;
        // Send the prompt to the OpenAI API
        const response = await this.openai.createCompletion({
            model: this.openaiModelId,
            prompt: prompt,
            max_tokens: 400,
            n: 1,
            stop: null,
            temperature: 0.5,
        });
        // Return the generated summary
        // @ts-ignore
        return response.data.choices[0].text;
    }
}
exports.binance_api = binance_api;
(async () => {
    const b = new binance_api("2JHwfSknxdh6148rv9iWY4851fOOPgX7ngdgMqXhQATPN0cHgjcq9N7M2PK2yB0Y", "0MkIrNKf0ERp6Qf9Uqu9LaTFov4JhIZp2h4m8PC1RG2HlX61IMTJEb1eUfyvkQjc");
    const result = await b.getTopPairs(10);
    console.log(result);
    console.log(result.length);
    if (process_1.argv.includes("analyze_top")) {
        const d = await b.getTechnicalAnalysisSummary(result[0].symbol);
        console.log(d);
    }
    // const e = await b.getAssetInfo("FLOKI");
    // console.log(e);
})();
//# sourceMappingURL=binance_api.js.map