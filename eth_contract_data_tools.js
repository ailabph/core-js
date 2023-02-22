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
    static async getContractViaAddress(contract_address, strict = false) {
        const method = "getContractViaAddress";
        if (tools_1.tools.isEmpty(contract_address))
            throw new eth_contract_data_tools_error(`contract_address must not be empty in ${method}`);
        this.log(`retrieving db contract ${contract_address}`, method);
        const contractInfo = eth_types_1.eth_types.getDefaultContractInfo();
        const db_contract = new eth_contract_data_1.eth_contract_data();
        db_contract.contract = contract_address;
        await db_contract.fetch();
        if (db_contract.isNew()) {
            this.log(`contract not on db, retrieving on chain`, method);
            db_contract.contract = contract_address;
            const token_name = await web3_token_1.web3_token.getName(contract_address, strict);
            db_contract.name = token_name ? token_name : "";
            const token_symbol = await web3_token_1.web3_token.getSymbol(contract_address, strict);
            db_contract.symbol = token_symbol ? token_symbol : "";
            const token_decimals = tools_1.tools.parseIntSimple(await web3_token_1.web3_token.getDecimals(contract_address, strict));
            db_contract.decimals = token_decimals ? tools_1.tools.parseIntSimple(token_decimals.toString()) : -1;
            if (db_contract.decimals < 0) {
                const errorMessage = `unable to retrieve token name,symbol,decimals info on chain with address:${contract_address}`;
                this.log(errorMessage, method, true, true);
                if (strict)
                    throw new eth_contract_data_tools_error(errorMessage);
                return false;
            }
            else {
                this.log(`retrieved contract info on chain, saving on db`, method, true);
                await db_contract.save();
            }
        }
        contractInfo.name = assert_1.assert.stringNotEmpty(db_contract.name);
        contractInfo.symbol = assert_1.assert.stringNotEmpty(db_contract.symbol);
        contractInfo.decimals = assert_1.assert.naturalNumber(db_contract.decimals);
        return contractInfo;
    }
    static async getContractViaAddressStrict(contract_address) {
        return await this.getContractViaAddress(contract_address, true);
    }
}
exports.eth_contract_data_tools = eth_contract_data_tools;
class eth_contract_data_tools_error extends Error {
    constructor(message) {
        super(message);
    }
}
//# sourceMappingURL=eth_contract_data_tools.js.map