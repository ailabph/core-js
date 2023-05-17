import axios from 'axios';
import {config} from "./config";
import {Transaction} from "ethers";

const apiKey = config.getCustomOption("bscscan_api",true);
const apiUrl = `https://api.bscscan.com/api?module=account&action=txlist&address=<wallet-address>&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
const balanceUrl = `https://api.bscscan.com/api?module=account&action=balancehistory&address=<wallet-address>&blockno=<block-number>&apikey=${apiKey}`;


export class web3_bscscan_tools {
    static async getTransactions(walletAddress: string): Promise<Transaction[]> {
        const url = apiUrl.replace('<wallet-address>', walletAddress);
        const response = await axios.get(url);
        const transactions = response.data.result;
        await new Promise(resolve => setTimeout(resolve, 250)); // Add a delay of 250ms
        return transactions as Transaction[];
    }

    static async getBalanceAtTimestamp(walletAddress: string, timestamp: number): Promise<number> {
        const blockNumber = await this.getBlockNumberAtTimestamp(timestamp);
        const url = balanceUrl.replace('<wallet-address>', walletAddress).replace('<block-number>', String(blockNumber));
        const response = await axios.get(url);
        console.log(response.data.result);
        const balance = response.data.result[0]?.value ?? '0';
        console.log(balance);
        return parseFloat(balance);
    }

    static async getBlockNumberAtTimestamp(timestamp: number): Promise<number> {
        const url = `https://api.bscscan.com/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${apiKey}`;
        const response = await axios.get(url);
        const blockNumber = parseInt(response.data.result);
        await new Promise(resolve => setTimeout(resolve, 250)); // Add a delay of 250ms
        return blockNumber;
    }

    static async computeBalance(transactions: Transaction[], timestamp: number): Promise<number> {
        const walletAddress = transactions.length > 0 ? transactions[0].from : '';
        const blockNumber = await this.getBlockNumberAtTimestamp(timestamp);
        let balance = 0;
        for (const tx of transactions) {
            // @ts-ignore
            if (tx.from === walletAddress && tx.blockNumber <= blockNumber) {
                // @ts-ignore
                balance -= parseFloat(tx.value);
            }
            // @ts-ignore
            if (tx.to === walletAddress && tx.blockNumber <= blockNumber) {
                // @ts-ignore
                balance += parseFloat(tx.value);
            }
        }
        return balance;
    }
}
