import Binance, { Ticker, CandleChartInterval } from 'binance-api-node';
import { Configuration, OpenAIApi} from "openai"
import {config} from "./config";
import {argv} from "process";
import {worker_token_balance} from "./worker_token_balance";

interface AssetInfo {
    name: string;
    decimal: number;
}

interface PairInfo {
    symbol: string;
    baseAsset: AssetInfo;
    quoteAsset: AssetInfo;
}

declare module 'binance-api-node' {
    interface Ticker {
        quoteVolume: string;
        // Add any other missing properties here
    }
}

interface TradingPairInfo {
    symbol: string;
    baseAsset: string;
    baseName: string;
    baseDecimals: number;
    quoteAsset: string;
    quoteName: string;
    quoteDecimals: number;
}


interface Candlestick {
    openTime: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    closeTime: number;
    quoteAssetVolume: string;
    numTrades: number;
    takerBuyBaseAssetVolume: string;
    takerBuyQuoteAssetVolume: string;
}

// @ts-ignore

export class binance_api{
    // @ts-ignore
    private client: Binance;
    private apiKey: string;

    private static getOpenAiApiKey():string{
        return config.getCustomOption("open_ai_api_key",true) as string;
    }
    private openaiModelId = 'text-davinci-003';

    private openai = new OpenAIApi(
        new Configuration({
            apiKey: binance_api.getOpenAiApiKey()
        })
    );

    constructor(apiKey: string, apiSecret: string) {
        this.client = Binance({ apiKey, apiSecret });
        this.apiKey = apiKey;
    }

    public async getTopPairs(numPairs: number): Promise<{ symbol: string; askPrice: any; askQty: any; bidQty: any; bidPrice: any }[]> {
        const tickers = await this.client.allBookTickers();

        // Convert the object of tickers to an array of ticker objects
        const tickerArray = Object.values(tickers);

        // Sort the tickers by descending bid quantity
        // @ts-ignore
        const sortedTickers = tickerArray.sort((a, b) => parseFloat(b.bidQty) - parseFloat(a.bidQty));

        // Extract the top `numPairs` symbols and return the selected ticker data for each pair
        // @ts-ignore
        return sortedTickers.slice(0, numPairs).map(({askPrice, askQty, bidPrice, bidQty, symbol}) => ({
            symbol: symbol,
            bidPrice: bidPrice,
            bidQty: bidQty,
            askPrice: askPrice,
            askQty: askQty,
        }));
    }

    public async getKlinesData(symbol: string, interval: string, numMonths: number): Promise<Candlestick[]> {
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

    public async getTechnicalAnalysisSummary(pair: string): Promise<string> {
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
            max_tokens: 600,
            n: 1,
            stop: null,
            temperature: 0.5,
        });

        // Return the generated summary
        // @ts-ignore
        return response.data.choices[0].text;
    }

}
//
// (async()=>{
//     const b = new binance_api(
//         "2JHwfSknxdh6148rv9iWY4851fOOPgX7ngdgMqXhQATPN0cHgjcq9N7M2PK2yB0Y",
//         "0MkIrNKf0ERp6Qf9Uqu9LaTFov4JhIZp2h4m8PC1RG2HlX61IMTJEb1eUfyvkQjc");
//     const result = await b.getTopPairs(10);
//     console.log(result);
//     console.log(result.length);
//
//     if(argv.includes("analyze_top")){
//         const d = await b.getTechnicalAnalysisSummary(result[0].symbol);
//         console.log(d);
//     }
//
// })();


