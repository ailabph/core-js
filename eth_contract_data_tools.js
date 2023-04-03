"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_contract_data_tools = void 0;
const eth_types_1 = require("./eth_types");
const eth_contract_data_1 = require("./build/eth_contract_data");
const assert_1 = require("./assert");
const config_1 = require("./config");
const tools_1 = require("./tools");
const web3_token_1 = require("./web3_token");
class eth_contract_data_tools {
    static log(msg, method, end = false, force_display = false) {
        if (config_1.config.getConfig().verbose_log || force_display) {
            console.log(`eth_contract_data_tools|${method}|${msg}`);
            if (end)
                console.log(`eth_contract_data_tools|${method}|${tools_1.tools.LINE}`);
        }
    }
    //region READ
    static async getContractViaAddress(contract_address, strict = false, context = "") {
        const method = "getContractViaAddress";
        if (tools_1.tools.isNotEmpty(context))
            context = `${context}|`;
        contract_address = assert_1.assert.stringNotEmpty(contract_address, `${method} contract_address`);
        this.log(`retrieving db contract ${contract_address}`, method);
        const contractInfo = eth_types_1.eth_types.getDefaultContractInfo();
        const db_contract = new eth_contract_data_1.eth_contract_data();
        db_contract.contract = contract_address;
        await db_contract.fetch();
        if (db_contract.isNew()) {
            this.log(`contract not on db, retrieving on chain`, method);
            db_contract.contract = contract_address;
            const token_name = await web3_token_1.web3_token.getNameWeb3(contract_address, strict);
            if (!token_name)
                return false;
            db_contract.name = token_name;
            const token_symbol = await web3_token_1.web3_token.getSymbolWeb3(contract_address, strict);
            if (!token_symbol)
                return false;
            db_contract.symbol = token_symbol;
            const token_decimalsBn = await web3_token_1.web3_token.getDecimalsWeb3(contract_address, strict);
            if (!token_decimalsBn)
                return false;
            db_contract.decimals = tools_1.tools.parseIntSimple(token_decimalsBn.toString(), "token_decimalsBn.toString");
            await db_contract.save();
            this.log(`...saved contract on db with id ${db_contract.id}`, method);
        }
        else {
            this.log(`...record on db`, method);
        }
        contractInfo.name = db_contract.name;
        contractInfo.symbol = db_contract.symbol;
        contractInfo.decimals = assert_1.assert.naturalNumber(db_contract.decimals, `${method} db_contract.decimals`);
        contractInfo.address = assert_1.assert.stringNotEmpty(db_contract.contract, `${method} contract_address`);
        this.log(`...returning ${contractInfo.name} ${contractInfo.symbol} ${contractInfo.decimals}`, method);
        return contractInfo;
    }
    static async getContractViaAddressStrict(contract_address) {
        return await this.getContractViaAddress(contract_address, true);
    }
    static async getContractDynamicStrict(contract) {
        if (typeof contract !== "string")
            return contract;
        return this.getContractViaAddressStrict(contract);
    }
}
exports.eth_contract_data_tools = eth_contract_data_tools;
class eth_contract_data_tools_error extends Error {
    constructor(message) {
        super(message);
    }
}
//# sourceMappingURL=eth_contract_data_tools.js.map