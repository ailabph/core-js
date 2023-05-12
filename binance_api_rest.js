"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const express_1 = __importDefault(require("express"));
// @ts-ignore
const body_parser_1 = __importDefault(require("body-parser"));
// @ts-ignore
const cors_1 = __importDefault(require("cors"));
const binance_api_1 = require("./binance_api");
const config_1 = require("./config"); // Assuming this is the file containing the binance_api class
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const apiKey = config_1.config.getCustomOption("binance_api_key", true);
const apiSecret = config_1.config.getCustomOption("binance_api_secret", true);
const app = (0, express_1.default)();
const port = 3000;
// Add CORS middleware
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
const binanceApi = new binance_api_1.binance_api(apiKey, apiSecret);
// Create a market router and set the base path as '/market'
const market = express_1.default.Router();
app.use('/market', market);
// @ts-ignore
market.get('/top-pairs', async (req, res) => {
    const numPairs = req.query.numPairs || 10;
    try {
        const topPairs = await binanceApi.getTopPairs(numPairs);
        res.status(200).json(topPairs);
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
        // @ts-ignore
        res.status(500).json({ error: error.message });
    }
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
//# sourceMappingURL=binance_api_rest.js.map