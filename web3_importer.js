"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.web3_importer = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const config_1 = require("./config");
const tools_1 = require("./tools");
const eth_config_1 = require("./eth_config");
const process_1 = require("process");
const eth_transaction_known_1 = require("./build/eth_transaction_known");
const eth_worker_1 = require("./eth_worker");
const assert_1 = require("./assert");
class web3_importer {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`${this.name}|${method}|${msg}`);
            if (end)
                console.log(`${this.name}|${method}|${tools_1.tools.LINE}`);
        }
    }
    static async scrapeAll(asc = false) {
        const method = "scrapeAll";
        this.log(`opening browser`, method, false, true);
        const browser = await puppeteer_1.default.launch();
        const page = await browser.newPage();
        this.log(`opening ${eth_config_1.eth_config.getTokenSymbol()} on ${config_1.config.getCustomOption("BLOCKCHAIN_BROWSER")}`, method, false, true);
        const tokenPageUrl = `${config_1.config.getCustomOption("BLOCKCHAIN_BROWSER")}/token/${eth_config_1.eth_config.getTokenContract()}`;
        this.log(`loading ${tokenPageUrl}`, method, false, true);
        await page.goto(tokenPageUrl, { waitUntil: 'networkidle2' });
        this.log(`page title: ${await page.title()}`, method, false, true);
        this.log(`retrieving iframe link for token transactions`, method, false, true);
        const iframeSrc = await this.getSrc(page, '#tokentxnsiframe');
        this.log(`...${iframeSrc}, opening page`, method, false, true);
        await page.goto(iframeSrc);
        let pageInfo = await this.getText(page, this.paginationInfoSelector);
        if (asc) {
            this.log(`ascending mode detected`, method, false, true);
            let endOfLoop = true;
            do {
                endOfLoop = true;
                const rowCount = await this.getElementLength(page, this.dataTableTrSelector);
                this.log(`${rowCount} table row found`, method, false, true);
                // EXTRACT AND PROCESS KNOWN HASH
                for (let row = rowCount; row > 0; row--) {
                    const hashSelector = this.hashSelector.replace("{row_num}", row + "");
                    const hash = await this.getText(page, hashSelector);
                    this.log(`${row} | ${hash}`, method, false, true);
                    this.log(`...checking if hash added to known`, method, false, true);
                    const known = new eth_transaction_known_1.eth_transaction_known();
                    known.hash = hash;
                    await known.fetch();
                    if (known.recordExists()) {
                        this.log(`...already added to known, skipping`, method, false, true);
                    }
                    else {
                        this.log(`...not yet on db, adding`, method, false, true);
                        known.hash = hash;
                        await known.save();
                        this.log(`...saved on db with id ${known.id}`, method, false, true);
                    }
                }
                if (await this.checkElementExists(page, this.nextPageSelector)) {
                    this.log(`next page link found, retrieving url`, method, false, true);
                    const waitingMs = tools_1.tools.generateRandomNumber(2000, 5000);
                    this.log(`current page: ${pageInfo}`, method, false, true);
                    this.log(`waiting for ${waitingMs}ms`, method, false, true);
                    await tools_1.tools.sleep(waitingMs);
                    let nextLinkHref = await this.getHref(page, this.nextPageSelector);
                    nextLinkHref = `${config_1.config.getCustomOption("BLOCKCHAIN_BROWSER")}/token/${nextLinkHref}`;
                    this.log(`...loading page ${nextLinkHref}`, method, false, true);
                    await page.goto(nextLinkHref);
                    pageInfo = await this.getText(page, this.paginationInfoSelector);
                    this.log(`...page loaded: ${pageInfo}`, method, false, true);
                    endOfLoop = false;
                }
                else {
                    this.log(`next page link not found`, method, false, true);
                    endOfLoop = true;
                }
            } while (!endOfLoop);
        }
        else {
            this.log(`page info ${pageInfo}, going to the first page...`, method, false, true);
            // GO TO THE BEGINNING OF THE TRANSACTIONS
            const lastPageExist = await this.checkElementExists(page, this.lastPageSelector);
            if (!lastPageExist) {
                this.log(`last page link not found using selector ${this.lastPageSelector}`, method, false, true);
                this.log(`...exiting`, method, true, true);
                return;
            }
            let lastPageUrl = await this.getHref(page, this.lastPageSelector);
            lastPageUrl = `${config_1.config.getCustomOption("BLOCKCHAIN_BROWSER")}/token/${lastPageUrl}`;
            this.log(`loading page ${lastPageUrl}`, method, false, true);
            await page.goto(lastPageUrl);
            pageInfo = await this.getText(page, this.paginationInfoSelector);
            this.log(`...${pageInfo}, begin scraping`, method, false, true);
            let prevLinkHref = "";
            let knownHashes = [];
            do {
                prevLinkHref = "";
                const rowCount = await this.getElementLength(page, this.dataTableTrSelector);
                this.log(`${rowCount} table row found`, method, false, true);
                // EXTRACT AND PROCESS KNOWN HASH
                for (let row = rowCount; row > 0; row--) {
                    const hashSelector = this.hashSelector.replace("{row_num}", row + "");
                    const hash = await this.getText(page, hashSelector);
                    this.log(`${row} | ${hash}`, method, false, true);
                    this.log(`...checking if hash added to known`, method, false, true);
                    const known = new eth_transaction_known_1.eth_transaction_known();
                    known.hash = hash;
                    await known.fetch();
                    if (known.recordExists()) {
                        this.log(`...already added to known, skipping`, method, false, true);
                    }
                    else {
                        this.log(`...not yet on db, adding`, method, false, true);
                        known.hash = hash;
                        await known.save();
                        this.log(`...saved on db with id ${known.id}`, method, false, true);
                    }
                }
                if (await this.checkElementExists(page, this.previousPageSelector)) {
                    this.log(`previous page link found, retrieving url`, method, false, true);
                    const waitingMs = tools_1.tools.generateRandomNumber(2000, 5000);
                    this.log(`current page: ${pageInfo}`, method, false, true);
                    this.log(`waiting for ${waitingMs}ms`, method, false, true);
                    await tools_1.tools.sleep(waitingMs);
                    prevLinkHref = await this.getHref(page, this.previousPageSelector);
                    prevLinkHref = `${config_1.config.getCustomOption("BLOCKCHAIN_BROWSER")}/token/${prevLinkHref}`;
                    this.log(`...loading page ${prevLinkHref}`, method, false, true);
                    await page.goto(prevLinkHref);
                    pageInfo = await this.getText(page, this.paginationInfoSelector);
                    this.log(`...page loaded: ${pageInfo}`, method, false, true);
                }
                else {
                    this.log(`previous page link not found`, method, false, true);
                }
            } while (prevLinkHref !== "");
        }
        this.log(``, method, true, true);
    }
    //region BROWSER UTILITIES
    static async getElementLength(page, selector) {
        // @ts-ignore
        const length = await page.$$eval(selector, el => el.length);
        if (typeof length !== "number")
            throw new Error(`length of ${selector} is expected to be a number, found ${typeof length} instead`);
        return length;
    }
    static async checkElementExists(page, selector) {
        return (await this.getElementLength(page, selector)) > 0;
    }
    static async getText(page, selector) {
        // @ts-ignore
        const textContent = await page.$eval(selector, el => el.textContent);
        if (typeof textContent !== "string")
            throw new Error(`text content of ${selector} is expected to be string, found ${typeof textContent}`);
        return textContent;
    }
    static async getSrc(page, selector) {
        //@ts-ignore
        const src = await page.$eval('#tokentxnsiframe', iframe => iframe.src);
        if (typeof src !== "string")
            throw new Error(`src of ${selector} is not string`);
        return src;
    }
    static async getHref(page, selector) {
        const method = "getHref";
        this.log(`retrieving href of ${selector}`, method, false, true);
        // @ts-ignore
        const hrefRaw = await page.$eval(selector, el => el.href);
        if (typeof hrefRaw !== "string")
            throw new Error(`href of ${selector} is expected to be string, found ${typeof hrefRaw} instead`);
        this.log(`...raw href ${hrefRaw}`, method, false, true);
        let href = hrefRaw.replace(`javascript:move('`, "");
        href = href.replace(`%27)`, "");
        this.log(`...extracted ${href}`, method, false, true);
        return href;
    }
    //endregion BROWSER UTILITIES
    static async addBlockNoInKnown() {
        const method = "addBlockNoInKnown";
        const knownTransactions = new eth_transaction_known_1.eth_transaction_known();
        await knownTransactions.list(" WHERE time_processed IS NULL AND blockNo IS NULL ");
        const count = knownTransactions.count();
        let progress = 0;
        this.log(`${count} found known txns without blockNo`, method, false, true);
        for (const txn of knownTransactions._dataList) {
            txn.hash = assert_1.assert.stringNotEmpty(txn.hash, `${method} txn.hash`);
            this.log(`${++progress}/${count} processing ${txn.hash}`, method, false, true);
            const receipt = await eth_worker_1.eth_worker.getReceiptByTxnHashWeb3(txn.hash);
            this.log(`---- blockNo found ${receipt.blockNumber}, updating...`, method, false, true);
            txn.blockNo = receipt.blockNumber;
            await txn.save();
            this.log(`---- updated`, method, false, true);
            await tools_1.tools.sleep(100);
        }
        this.log(``, method, true, true);
    }
}
exports.web3_importer = web3_importer;
web3_importer.lastPageSelector = "ul.pagination li:last-child a";
web3_importer.previousPageSelector = "nav ul.pagination li:nth-child(2) a.page-link";
web3_importer.paginationInfoSelector = "nav ul.pagination li:nth-child(3) span";
web3_importer.nextPageSelector = "nav ul.pagination li:nth-child(4) a.page-link";
web3_importer.dataTableTrSelector = "#maindiv table tbody tr";
web3_importer.hashSelector = "#maindiv table tbody tr:nth-child({row_num}) td:first-child a";
if (process_1.argv.includes("run_scrapeAll")) {
    const asc = process_1.argv.includes("asc");
    web3_importer.scrapeAll(asc).finally();
}
if (process_1.argv.includes("run_addBlockNoInKnown")) {
    web3_importer.addBlockNoInKnown().finally();
}
//# sourceMappingURL=web3_importer.js.map