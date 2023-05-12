// @ts-ignore
import express from 'express';
// @ts-ignore
import bodyParser from 'body-parser';
// @ts-ignore
import cors from 'cors';
import { binance_api } from './binance_api';
import {config} from "./config"; // Assuming this is the file containing the binance_api class

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


const apiKey = config.getCustomOption("binance_api_key",true) as string;
const apiSecret = config.getCustomOption("binance_api_secret",true) as string;

const app = express();
const port = 3000;

// Add CORS middleware
app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const binanceApi = new binance_api(apiKey, apiSecret);

// Create a market router and set the base path as '/market'
const market = express.Router();
app.use('/market', market);

// @ts-ignore
market.get('/top-pairs', async (req, res) => {
    const numPairs = req.query.numPairs || 10;
    try {
        const topPairs = await binanceApi.getTopPairs(numPairs);
        res.status(200).json(topPairs);
    } catch (error) {
        // @ts-ignore
        res.status(500).json({ error: error.message });
    }
});

// @ts-ignore
market.get('/klines-data', async (req, res) => {
    const { symbol, interval, numMonths } = req.query;
    try {
        const klinesData = await binanceApi.getKlinesData(symbol, interval, numMonths);
        res.status(200).json(klinesData);
    } catch (error) {
        // @ts-ignore
        res.status(500).json({ error: error.message });
    }
});

// @ts-ignore
market.get('/technical-analysis-summary', async (req, res) => {
    const pair = req.query.pair;
    try {
        const summary = await binanceApi.getTechnicalAnalysisSummary(pair);
        res.status(200).json({ summary });
    } catch (error) {
        // @ts-ignore
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
