"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.web3_token = void 0;
const config_1 = require("./config");
const eth_config_1 = require("./eth_config");
const eth_rpc_1 = require("./eth_rpc");
const tools_1 = require("./tools");
const web3_rpc_web3_1 = require("./web3_rpc_web3");
class web3_token {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`web3_token|${method}|${msg}`);
            if (end)
                console.log(`web3_token|${method}|${tools_1.tools.LINE}`);
        }
    }
    static initContract(address) {
        return eth_rpc_1.eth_rpc.getEtherContract(address, eth_config_1.eth_config.getTokenAbi());
    }
    //region READ
    static async genericFunctionCallNoArgs(contract_address, function_name, strict = false) {
        const method = "genericFunctionCallNoArgs";
        this.log(`calling function ${function_name} on contract ${contract_address}`, method);
        try {
            return await this.initContract(contract_address)[function_name]();
        }
        catch (e) {
            this.log(`ERROR: unable to call function ${function_name} from contract ${contract_address}`, `callFunctionWithNoArgument:${function_name}`, false, false);
            if (strict) {
                if (e instanceof Error)
                    throw new web3_token_error(e.message);
                throw e;
            }
            return false;
        }
    }
    static async getName(contract_address, strict = false) {
        const method = "getName";
        this.log(`retrieving token name of ${contract_address}`, method);
        return this.genericFunctionCallNoArgs(contract_address, "name", strict);
    }
    static async getSymbol(contract_address, strict = false) {
        const method = "getSymbol";
        this.log(`retrieving token symbol of ${contract_address}`, method);
        return this.genericFunctionCallNoArgs(contract_address, "symbol");
    }
    static async getDecimals(contract_address, strict = false) {
        const method = "getDecimals";
        this.log(`retrieving token decimals of ${contract_address}`, method);
        return this.genericFunctionCallNoArgs(contract_address, "decimals", strict);
    }
    static async getNameWeb3(contract_address, strict = false) {
        const method = "getNameWeb3";
        this.log(`retrieving name of contract ${contract_address}`, method);
        const contract = web3_rpc_web3_1.web3_rpc_web3.getWeb3Contract(contract_address, [
            {
                "constant": true,
                "inputs": [],
                "name": "name",
                "outputs": [
                    {
                        "internalType": "string",
                        "name": "",
                        "type": "string"
                    }
                ],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            }
        ]);
        try {
            const name = await contract.methods.name().call();
            this.log(`... name: ${name}`, method);
            return name;
        }
        catch (e) {
            this.log(`ERROR, unable to retrieve name`, method);
            if (strict)
                throw e;
            return false;
        }
    }
    static async getSymbolWeb3(contract_address, strict = false) {
        const method = "getSymbolWeb3";
        this.log(`retrieving symbol of contract ${contract_address}`, method);
        const contract = web3_rpc_web3_1.web3_rpc_web3.getWeb3Contract(contract_address, [
            {
                "constant": true,
                "inputs": [],
                "name": "symbol",
                "outputs": [
                    {
                        "internalType": "string",
                        "name": "",
                        "type": "string"
                    }
                ],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            }
        ]);
        try {
            const symbol = await contract.methods.symbol().call();
            this.log(`... symbol: ${symbol}`, method);
            return symbol;
        }
        catch (e) {
            this.log(`ERROR, unable to retrieve symbol`, method);
            if (strict)
                throw e;
            return false;
        }
    }
    static async getDecimalsWeb3(contract_address, strict = false) {
        const method = "getDecimalsWeb3";
        this.log(`retrieving decimals of contract ${contract_address}`, method);
        const contract = web3_rpc_web3_1.web3_rpc_web3.getWeb3Contract(contract_address, [
            {
                "constant": true,
                "inputs": [],
                "name": "decimals",
                "outputs": [
                    {
                        "internalType": "uint8",
                        "name": "",
                        "type": "uint8"
                    }
                ],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            }
        ]);
        try {
            const decimals = await contract.methods.decimals().call();
            this.log(`... decimals: ${decimals}`, method);
            return decimals;
        }
        catch (e) {
            this.log(`ERROR, unable to retrieve symbol`, method);
            if (strict)
                throw e;
            return false;
        }
    }
}
exports.web3_token = web3_token;
class web3_token_error extends Error {
    constructor(message) {
        super(message);
    }
}
//# sourceMappingURL=web3_token.js.map