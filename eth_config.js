"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eth_config = void 0;
const config_1 = require("./config");
const tools_1 = require("./tools");
class eth_config {
    //region BUSD
    static getBusdContract() {
        return config_1.config.getCustomOption("BUSD_CONTRACT", true);
    }
    static getBusdSymbol() {
        return config_1.config.getCustomOption("BUSD_SYMBOL", true);
    }
    static getBusdDecimal() {
        return tools_1.tools.parseIntSimple(config_1.config.getCustomOption("BUSD_DECIMAL", true));
    }
    //endregion END BUSD
    //region ETH
    static getEthAbi() {
        return [{
                "constant": true,
                "inputs": [],
                "name": "name",
                "outputs": [{ "name": "", "type": "string" }],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            }, {
                "constant": false,
                "inputs": [{ "name": "guy", "type": "address" }, { "name": "wad", "type": "uint256" }],
                "name": "approve",
                "outputs": [{ "name": "", "type": "bool" }],
                "payable": false,
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "constant": true,
                "inputs": [],
                "name": "totalSupply",
                "outputs": [{ "name": "", "type": "uint256" }],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            }, {
                "constant": false,
                "inputs": [{ "name": "src", "type": "address" }, { "name": "dst", "type": "address" }, {
                        "name": "wad",
                        "type": "uint256"
                    }],
                "name": "transferFrom",
                "outputs": [{ "name": "", "type": "bool" }],
                "payable": false,
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "constant": false,
                "inputs": [{ "name": "wad", "type": "uint256" }],
                "name": "withdraw",
                "outputs": [],
                "payable": false,
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "constant": true,
                "inputs": [],
                "name": "decimals",
                "outputs": [{ "name": "", "type": "uint8" }],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            }, {
                "constant": true,
                "inputs": [{ "name": "", "type": "address" }],
                "name": "balanceOf",
                "outputs": [{ "name": "", "type": "uint256" }],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            }, {
                "constant": true,
                "inputs": [],
                "name": "symbol",
                "outputs": [{ "name": "", "type": "string" }],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            }, {
                "constant": false,
                "inputs": [{ "name": "dst", "type": "address" }, { "name": "wad", "type": "uint256" }],
                "name": "transfer",
                "outputs": [{ "name": "", "type": "bool" }],
                "payable": false,
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "constant": false,
                "inputs": [],
                "name": "deposit",
                "outputs": [],
                "payable": true,
                "stateMutability": "payable",
                "type": "function"
            }, {
                "constant": true,
                "inputs": [{ "name": "", "type": "address" }, { "name": "", "type": "address" }],
                "name": "allowance",
                "outputs": [{ "name": "", "type": "uint256" }],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            }, { "payable": true, "stateMutability": "payable", "type": "fallback" }, {
                "anonymous": false,
                "inputs": [{ "indexed": true, "name": "src", "type": "address" }, {
                        "indexed": true,
                        "name": "guy",
                        "type": "address"
                    }, { "indexed": false, "name": "wad", "type": "uint256" }],
                "name": "Approval",
                "type": "event"
            }, {
                "anonymous": false,
                "inputs": [{ "indexed": true, "name": "src", "type": "address" }, {
                        "indexed": true,
                        "name": "dst",
                        "type": "address"
                    }, { "indexed": false, "name": "wad", "type": "uint256" }],
                "name": "Transfer",
                "type": "event"
            }, {
                "anonymous": false,
                "inputs": [{ "indexed": true, "name": "dst", "type": "address" }, {
                        "indexed": false,
                        "name": "wad",
                        "type": "uint256"
                    }],
                "name": "Deposit",
                "type": "event"
            }, {
                "anonymous": false,
                "inputs": [{ "indexed": true, "name": "src", "type": "address" }, {
                        "indexed": false,
                        "name": "wad",
                        "type": "uint256"
                    }],
                "name": "Withdrawal",
                "type": "event"
            }];
    }
    static getEthContract() {
        return config_1.config.getCustomOption("ETH_CONTRACT", true);
    }
    static getEthSymbol() {
        return config_1.config.getCustomOption("ETH_SYMBOL", true);
    }
    static getEthDecimal() {
        const eth_decimal = config_1.config.getCustomOption("ETH_DECIMAL", true);
        return tools_1.tools.parseInt({ val: eth_decimal, name: "eth_decimal", strict: true });
    }
    //endregion
    //region TOKEN
    static getTokenAbi() {
        return [{ "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "spender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Approval", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "delegator", "type": "address" }, { "indexed": true, "internalType": "address", "name": "fromDelegate", "type": "address" }, { "indexed": true, "internalType": "address", "name": "toDelegate", "type": "address" }], "name": "DelegateChanged", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "delegate", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "previousBalance", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "newBalance", "type": "uint256" }], "name": "DelegateVotesChanged", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }], "name": "OwnershipTransferred", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Transfer", "type": "event" }, { "inputs": [], "name": "DELEGATION_TYPEHASH", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "DOMAIN_TYPEHASH", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint32", "name": "", "type": "uint32" }], "name": "checkpoints", "outputs": [{ "internalType": "uint32", "name": "fromBlock", "type": "uint32" }, { "internalType": "uint256", "name": "votes", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "subtractedValue", "type": "uint256" }], "name": "decreaseAllowance", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "delegatee", "type": "address" }], "name": "delegate", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "delegatee", "type": "address" }, { "internalType": "uint256", "name": "nonce", "type": "uint256" }, { "internalType": "uint256", "name": "expiry", "type": "uint256" }, { "internalType": "uint8", "name": "v", "type": "uint8" }, { "internalType": "bytes32", "name": "r", "type": "bytes32" }, { "internalType": "bytes32", "name": "s", "type": "bytes32" }], "name": "delegateBySig", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "delegator", "type": "address" }], "name": "delegates", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "getCurrentVotes", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getOwner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }, { "internalType": "uint256", "name": "blockNumber", "type": "uint256" }], "name": "getPriorVotes", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "addedValue", "type": "uint256" }], "name": "increaseAllowance", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_to", "type": "address" }, { "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "mint", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "mint", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "nonces", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "numCheckpoints", "outputs": [{ "internalType": "uint32", "name": "", "type": "uint32" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "renounceOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "sender", "type": "address" }, { "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" }];
    }
    static getTransferAbi() {
        return [
            {
                constant: false,
                inputs: [
                    {
                        name: 'to',
                        type: 'address',
                    },
                    {
                        name: 'value',
                        type: 'uint256',
                    },
                ],
                name: 'transfer',
                outputs: [
                    {
                        name: '',
                        type: 'bool',
                    },
                ],
                type: 'function',
            },
        ];
    }
    static getBalanceAbi() {
        return [
            // balanceOf
            {
                constant: true,
                inputs: [{ name: "_owner", type: "address" }],
                name: "balanceOf",
                outputs: [{ name: "balance", type: "uint256" }],
                type: "function",
            },
        ];
    }
    static getTokenContract() {
        return config_1.config.getCustomOption("TOKEN_TO_TRACK", true);
    }
    static getTokenSymbol() {
        return config_1.config.getCustomOption("TOKEN_TO_TRACK_SYMBOL", true);
    }
    static getTokenDecimal() {
        let token_decimal = config_1.config.getCustomOption("TOKEN_TO_TRACK_DECIMAL", true);
        return tools_1.tools.parseInt({ val: token_decimal, name: "token_decimal", strict: true });
    }
    static getTokenGenesisHash() {
        return config_1.config.getCustomOption("TOKEN_CREATION_HASH", true);
    }
    static getTokenGenesisBlock() {
        return config_1.config.getCustomOption("STARTING_BLOCK", true);
    }
    static getTokenOwner() {
        return config_1.config.getCustomOption("OWNER_WALLET", true);
    }
    //endregion
    //region DEX
    static getDexAbi() {
        return [{
                "inputs": [{
                        "internalType": "address",
                        "name": "_factory",
                        "type": "address"
                    }, { "internalType": "address", "name": "_WETH", "type": "address" }],
                "stateMutability": "nonpayable",
                "type": "constructor"
            }, {
                "inputs": [],
                "name": "WETH",
                "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
                "stateMutability": "view",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "address", "name": "tokenA", "type": "address" }, {
                        "internalType": "address",
                        "name": "tokenB",
                        "type": "address"
                    }, { "internalType": "uint256", "name": "amountADesired", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountBDesired",
                        "type": "uint256"
                    }, { "internalType": "uint256", "name": "amountAMin", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountBMin",
                        "type": "uint256"
                    }, { "internalType": "address", "name": "to", "type": "address" }, {
                        "internalType": "uint256",
                        "name": "deadline",
                        "type": "uint256"
                    }],
                "name": "addLiquidity",
                "outputs": [{ "internalType": "uint256", "name": "amountA", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountB",
                        "type": "uint256"
                    }, { "internalType": "uint256", "name": "liquidity", "type": "uint256" }],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, {
                        "internalType": "uint256",
                        "name": "amountTokenDesired",
                        "type": "uint256"
                    }, { "internalType": "uint256", "name": "amountTokenMin", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountETHMin",
                        "type": "uint256"
                    }, { "internalType": "address", "name": "to", "type": "address" }, {
                        "internalType": "uint256",
                        "name": "deadline",
                        "type": "uint256"
                    }],
                "name": "addLiquidityETH",
                "outputs": [{ "internalType": "uint256", "name": "amountToken", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountETH",
                        "type": "uint256"
                    }, { "internalType": "uint256", "name": "liquidity", "type": "uint256" }],
                "stateMutability": "payable",
                "type": "function"
            }, {
                "inputs": [],
                "name": "factory",
                "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
                "stateMutability": "view",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "reserveIn",
                        "type": "uint256"
                    }, { "internalType": "uint256", "name": "reserveOut", "type": "uint256" }],
                "name": "getAmountIn",
                "outputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }],
                "stateMutability": "pure",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "reserveIn",
                        "type": "uint256"
                    }, { "internalType": "uint256", "name": "reserveOut", "type": "uint256" }],
                "name": "getAmountOut",
                "outputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }],
                "stateMutability": "pure",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }, {
                        "internalType": "address[]",
                        "name": "path",
                        "type": "address[]"
                    }],
                "name": "getAmountsIn",
                "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
                "stateMutability": "view",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, {
                        "internalType": "address[]",
                        "name": "path",
                        "type": "address[]"
                    }],
                "name": "getAmountsOut",
                "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
                "stateMutability": "view",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "uint256", "name": "amountA", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "reserveA",
                        "type": "uint256"
                    }, { "internalType": "uint256", "name": "reserveB", "type": "uint256" }],
                "name": "quote",
                "outputs": [{ "internalType": "uint256", "name": "amountB", "type": "uint256" }],
                "stateMutability": "pure",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "address", "name": "tokenA", "type": "address" }, {
                        "internalType": "address",
                        "name": "tokenB",
                        "type": "address"
                    }, { "internalType": "uint256", "name": "liquidity", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountAMin",
                        "type": "uint256"
                    }, { "internalType": "uint256", "name": "amountBMin", "type": "uint256" }, {
                        "internalType": "address",
                        "name": "to",
                        "type": "address"
                    }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }],
                "name": "removeLiquidity",
                "outputs": [{ "internalType": "uint256", "name": "amountA", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountB",
                        "type": "uint256"
                    }],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, {
                        "internalType": "uint256",
                        "name": "liquidity",
                        "type": "uint256"
                    }, { "internalType": "uint256", "name": "amountTokenMin", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountETHMin",
                        "type": "uint256"
                    }, { "internalType": "address", "name": "to", "type": "address" }, {
                        "internalType": "uint256",
                        "name": "deadline",
                        "type": "uint256"
                    }],
                "name": "removeLiquidityETH",
                "outputs": [{ "internalType": "uint256", "name": "amountToken", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountETH",
                        "type": "uint256"
                    }],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, {
                        "internalType": "uint256",
                        "name": "liquidity",
                        "type": "uint256"
                    }, { "internalType": "uint256", "name": "amountTokenMin", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountETHMin",
                        "type": "uint256"
                    }, { "internalType": "address", "name": "to", "type": "address" }, {
                        "internalType": "uint256",
                        "name": "deadline",
                        "type": "uint256"
                    }],
                "name": "removeLiquidityETHSupportingFeeOnTransferTokens",
                "outputs": [{ "internalType": "uint256", "name": "amountETH", "type": "uint256" }],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, {
                        "internalType": "uint256",
                        "name": "liquidity",
                        "type": "uint256"
                    }, { "internalType": "uint256", "name": "amountTokenMin", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountETHMin",
                        "type": "uint256"
                    }, { "internalType": "address", "name": "to", "type": "address" }, {
                        "internalType": "uint256",
                        "name": "deadline",
                        "type": "uint256"
                    }, { "internalType": "bool", "name": "approveMax", "type": "bool" }, {
                        "internalType": "uint8",
                        "name": "v",
                        "type": "uint8"
                    }, { "internalType": "bytes32", "name": "r", "type": "bytes32" }, {
                        "internalType": "bytes32",
                        "name": "s",
                        "type": "bytes32"
                    }],
                "name": "removeLiquidityETHWithPermit",
                "outputs": [{ "internalType": "uint256", "name": "amountToken", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountETH",
                        "type": "uint256"
                    }],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, {
                        "internalType": "uint256",
                        "name": "liquidity",
                        "type": "uint256"
                    }, { "internalType": "uint256", "name": "amountTokenMin", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountETHMin",
                        "type": "uint256"
                    }, { "internalType": "address", "name": "to", "type": "address" }, {
                        "internalType": "uint256",
                        "name": "deadline",
                        "type": "uint256"
                    }, { "internalType": "bool", "name": "approveMax", "type": "bool" }, {
                        "internalType": "uint8",
                        "name": "v",
                        "type": "uint8"
                    }, { "internalType": "bytes32", "name": "r", "type": "bytes32" }, {
                        "internalType": "bytes32",
                        "name": "s",
                        "type": "bytes32"
                    }],
                "name": "removeLiquidityETHWithPermitSupportingFeeOnTransferTokens",
                "outputs": [{ "internalType": "uint256", "name": "amountETH", "type": "uint256" }],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "address", "name": "tokenA", "type": "address" }, {
                        "internalType": "address",
                        "name": "tokenB",
                        "type": "address"
                    }, { "internalType": "uint256", "name": "liquidity", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountAMin",
                        "type": "uint256"
                    }, { "internalType": "uint256", "name": "amountBMin", "type": "uint256" }, {
                        "internalType": "address",
                        "name": "to",
                        "type": "address"
                    }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }, {
                        "internalType": "bool",
                        "name": "approveMax",
                        "type": "bool"
                    }, { "internalType": "uint8", "name": "v", "type": "uint8" }, {
                        "internalType": "bytes32",
                        "name": "r",
                        "type": "bytes32"
                    }, { "internalType": "bytes32", "name": "s", "type": "bytes32" }],
                "name": "removeLiquidityWithPermit",
                "outputs": [{ "internalType": "uint256", "name": "amountA", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountB",
                        "type": "uint256"
                    }],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }, {
                        "internalType": "address[]",
                        "name": "path",
                        "type": "address[]"
                    }, { "internalType": "address", "name": "to", "type": "address" }, {
                        "internalType": "uint256",
                        "name": "deadline",
                        "type": "uint256"
                    }],
                "name": "swapETHForExactTokens",
                "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
                "stateMutability": "payable",
                "type": "function"
            }, {
                "inputs": [
                    { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
                    {
                        "internalType": "address[]",
                        "name": "path",
                        "type": "address[]"
                    }, { "internalType": "address", "name": "to", "type": "address" }, {
                        "internalType": "uint256",
                        "name": "deadline",
                        "type": "uint256"
                    }
                ],
                "name": "swapExactETHForTokens",
                "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
                "stateMutability": "payable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "uint256", "name": "amountOutMin", "type": "uint256" }, {
                        "internalType": "address[]",
                        "name": "path",
                        "type": "address[]"
                    }, { "internalType": "address", "name": "to", "type": "address" }, {
                        "internalType": "uint256",
                        "name": "deadline",
                        "type": "uint256"
                    }],
                "name": "swapExactETHForTokensSupportingFeeOnTransferTokens",
                "outputs": [],
                "stateMutability": "payable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountOutMin",
                        "type": "uint256"
                    }, { "internalType": "address[]", "name": "path", "type": "address[]" }, {
                        "internalType": "address",
                        "name": "to",
                        "type": "address"
                    }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }],
                "name": "swapExactTokensForETH",
                "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountOutMin",
                        "type": "uint256"
                    }, { "internalType": "address[]", "name": "path", "type": "address[]" }, {
                        "internalType": "address",
                        "name": "to",
                        "type": "address"
                    }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }],
                "name": "swapExactTokensForETHSupportingFeeOnTransferTokens",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountOutMin",
                        "type": "uint256"
                    }, { "internalType": "address[]", "name": "path", "type": "address[]" }, {
                        "internalType": "address",
                        "name": "to",
                        "type": "address"
                    }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }],
                "name": "swapExactTokensForTokens",
                "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountOutMin",
                        "type": "uint256"
                    }, { "internalType": "address[]", "name": "path", "type": "address[]" }, {
                        "internalType": "address",
                        "name": "to",
                        "type": "address"
                    }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }],
                "name": "swapExactTokensForTokensSupportingFeeOnTransferTokens",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountInMax",
                        "type": "uint256"
                    }, { "internalType": "address[]", "name": "path", "type": "address[]" }, {
                        "internalType": "address",
                        "name": "to",
                        "type": "address"
                    }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }],
                "name": "swapTokensForExactETH",
                "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }, {
                        "internalType": "uint256",
                        "name": "amountInMax",
                        "type": "uint256"
                    }, { "internalType": "address[]", "name": "path", "type": "address[]" }, {
                        "internalType": "address",
                        "name": "to",
                        "type": "address"
                    }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }],
                "name": "swapTokensForExactTokens",
                "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
                "stateMutability": "nonpayable",
                "type": "function"
            }, { "stateMutability": "payable", "type": "receive" }];
    }
    static getSwapRouterAbi() {
        return [{
                "inputs": [{
                        "internalType": "address",
                        "name": "transitSwap_",
                        "type": "address"
                    }, { "internalType": "address", "name": "transitCross_", "type": "address" }, {
                        "internalType": "address",
                        "name": "transitFees_",
                        "type": "address"
                    }, { "internalType": "address", "name": "executor", "type": "address" }],
                "stateMutability": "nonpayable",
                "type": "constructor"
            }, {
                "anonymous": false,
                "inputs": [{
                        "indexed": false,
                        "internalType": "uint8[]",
                        "name": "types",
                        "type": "uint8[]"
                    }, { "indexed": false, "internalType": "bool[]", "name": "newModes", "type": "bool[]" }],
                "name": "ChangeSwapTypeMode",
                "type": "event"
            }, {
                "anonymous": false,
                "inputs": [{
                        "indexed": true,
                        "internalType": "address",
                        "name": "previousTransit",
                        "type": "address"
                    }, { "indexed": true, "internalType": "address", "name": "newTransit", "type": "address" }],
                "name": "ChangeTransitCross",
                "type": "event"
            }, {
                "anonymous": false,
                "inputs": [{
                        "indexed": true,
                        "internalType": "address",
                        "name": "previousTransitFees",
                        "type": "address"
                    }, { "indexed": true, "internalType": "address", "name": "newTransitFees", "type": "address" }],
                "name": "ChangeTransitFees",
                "type": "event"
            }, {
                "anonymous": false,
                "inputs": [{
                        "indexed": true,
                        "internalType": "address",
                        "name": "previousTransit",
                        "type": "address"
                    }, { "indexed": true, "internalType": "address", "name": "newTransit", "type": "address" }],
                "name": "ChangeTransitSwap",
                "type": "event"
            }, {
                "anonymous": false,
                "inputs": [{
                        "indexed": true,
                        "internalType": "address",
                        "name": "previousExecutor",
                        "type": "address"
                    }, { "indexed": true, "internalType": "address", "name": "newExecutor", "type": "address" }],
                "name": "ExecutorshipTransferStarted",
                "type": "event"
            }, {
                "anonymous": false,
                "inputs": [{
                        "indexed": true,
                        "internalType": "address",
                        "name": "previousExecutor",
                        "type": "address"
                    }, { "indexed": true, "internalType": "address", "name": "newExecutor", "type": "address" }],
                "name": "ExecutorshipTransferred",
                "type": "event"
            }, {
                "anonymous": false,
                "inputs": [{
                        "indexed": true,
                        "internalType": "address",
                        "name": "previousOwner",
                        "type": "address"
                    }, { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }],
                "name": "OwnershipTransferStarted",
                "type": "event"
            }, {
                "anonymous": false,
                "inputs": [{
                        "indexed": true,
                        "internalType": "address",
                        "name": "previousOwner",
                        "type": "address"
                    }, { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }],
                "name": "OwnershipTransferred",
                "type": "event"
            }, {
                "anonymous": false,
                "inputs": [{ "indexed": false, "internalType": "address", "name": "account", "type": "address" }],
                "name": "Paused",
                "type": "event"
            }, {
                "anonymous": false,
                "inputs": [{
                        "indexed": false,
                        "internalType": "address",
                        "name": "from",
                        "type": "address"
                    }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }],
                "name": "Receipt",
                "type": "event"
            }, {
                "anonymous": false,
                "inputs": [{
                        "indexed": true,
                        "internalType": "address",
                        "name": "srcToken",
                        "type": "address"
                    }, { "indexed": true, "internalType": "address", "name": "dstToken", "type": "address" }, {
                        "indexed": true,
                        "internalType": "address",
                        "name": "dstReceiver",
                        "type": "address"
                    }, { "indexed": false, "internalType": "address", "name": "trader", "type": "address" }, {
                        "indexed": false,
                        "internalType": "bool",
                        "name": "feeMode",
                        "type": "bool"
                    }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "returnAmount",
                        "type": "uint256"
                    }, {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "minReturnAmount",
                        "type": "uint256"
                    }, { "indexed": false, "internalType": "uint256", "name": "fee", "type": "uint256" }, {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "toChainID",
                        "type": "uint256"
                    }, { "indexed": false, "internalType": "string", "name": "channel", "type": "string" }, {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "time",
                        "type": "uint256"
                    }],
                "name": "TransitSwapped",
                "type": "event"
            }, {
                "anonymous": false,
                "inputs": [{ "indexed": false, "internalType": "address", "name": "account", "type": "address" }],
                "name": "Unpaused",
                "type": "event"
            }, {
                "anonymous": false,
                "inputs": [{
                        "indexed": true,
                        "internalType": "address",
                        "name": "token",
                        "type": "address"
                    }, { "indexed": true, "internalType": "address", "name": "executor", "type": "address" }, {
                        "indexed": true,
                        "internalType": "address",
                        "name": "recipient",
                        "type": "address"
                    }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }],
                "name": "Withdraw",
                "type": "event"
            }, {
                "inputs": [],
                "name": "acceptExecutorship",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [],
                "name": "acceptOwnership",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "bool", "name": "paused", "type": "bool" }],
                "name": "changePause",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "uint8[]", "name": "swapTypes", "type": "uint8[]" }],
                "name": "changeSwapTypeMode",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "address", "name": "newTransit", "type": "address" }],
                "name": "changeTransitCross",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "address", "name": "newTransitFees", "type": "address" }],
                "name": "changeTransitFees",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "address", "name": "newTransit", "type": "address" }],
                "name": "changeTransitSwap",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{
                        "components": [{
                                "internalType": "uint8",
                                "name": "swapType",
                                "type": "uint8"
                            }, { "internalType": "address", "name": "srcToken", "type": "address" }, {
                                "internalType": "address",
                                "name": "dstToken",
                                "type": "address"
                            }, { "internalType": "address", "name": "srcReceiver", "type": "address" }, {
                                "internalType": "address",
                                "name": "dstReceiver",
                                "type": "address"
                            }, { "internalType": "uint256", "name": "amount", "type": "uint256" }, {
                                "internalType": "uint256",
                                "name": "minReturnAmount",
                                "type": "uint256"
                            }, { "internalType": "string", "name": "channel", "type": "string" }, {
                                "internalType": "uint256",
                                "name": "toChainID",
                                "type": "uint256"
                            }, { "internalType": "address", "name": "wrappedNative", "type": "address" }],
                        "internalType": "struct TransitStructs.TransitSwapDescription",
                        "name": "desc",
                        "type": "tuple"
                    }, {
                        "components": [{ "internalType": "uint8", "name": "flag", "type": "uint8" }, {
                                "internalType": "address",
                                "name": "srcToken",
                                "type": "address"
                            }, { "internalType": "bytes", "name": "calldatas", "type": "bytes" }],
                        "internalType": "struct TransitStructs.CallbytesDescription",
                        "name": "callbytesDesc",
                        "type": "tuple"
                    }], "name": "cross", "outputs": [], "stateMutability": "payable", "type": "function"
            }, {
                "inputs": [],
                "name": "executor",
                "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
                "stateMutability": "view",
                "type": "function"
            }, {
                "inputs": [],
                "name": "owner",
                "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
                "stateMutability": "view",
                "type": "function"
            }, {
                "inputs": [],
                "name": "paused",
                "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
                "stateMutability": "view",
                "type": "function"
            }, {
                "inputs": [],
                "name": "pendingExecutor",
                "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
                "stateMutability": "view",
                "type": "function"
            }, {
                "inputs": [],
                "name": "pendingOwner",
                "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
                "stateMutability": "view",
                "type": "function"
            }, {
                "inputs": [],
                "name": "renounceOwnership",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{
                        "components": [{
                                "internalType": "uint8",
                                "name": "swapType",
                                "type": "uint8"
                            }, { "internalType": "address", "name": "srcToken", "type": "address" }, {
                                "internalType": "address",
                                "name": "dstToken",
                                "type": "address"
                            }, { "internalType": "address", "name": "srcReceiver", "type": "address" }, {
                                "internalType": "address",
                                "name": "dstReceiver",
                                "type": "address"
                            }, { "internalType": "uint256", "name": "amount", "type": "uint256" }, {
                                "internalType": "uint256",
                                "name": "minReturnAmount",
                                "type": "uint256"
                            }, { "internalType": "string", "name": "channel", "type": "string" }, {
                                "internalType": "uint256",
                                "name": "toChainID",
                                "type": "uint256"
                            }, { "internalType": "address", "name": "wrappedNative", "type": "address" }],
                        "internalType": "struct TransitStructs.TransitSwapDescription",
                        "name": "desc",
                        "type": "tuple"
                    }, {
                        "components": [{ "internalType": "uint8", "name": "flag", "type": "uint8" }, {
                                "internalType": "address",
                                "name": "srcToken",
                                "type": "address"
                            }, { "internalType": "bytes", "name": "calldatas", "type": "bytes" }],
                        "internalType": "struct TransitStructs.CallbytesDescription",
                        "name": "callbytesDesc",
                        "type": "tuple"
                    }], "name": "swap", "outputs": [], "stateMutability": "payable", "type": "function"
            }, {
                "inputs": [{ "internalType": "uint8", "name": "swapType", "type": "uint8" }],
                "name": "swapTypeMode",
                "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
                "stateMutability": "view",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "address", "name": "newExecutor", "type": "address" }],
                "name": "transferExecutorship",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }],
                "name": "transferOwnership",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }, {
                "inputs": [],
                "name": "transitCross",
                "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
                "stateMutability": "view",
                "type": "function"
            }, {
                "inputs": [],
                "name": "transitFees",
                "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
                "stateMutability": "view",
                "type": "function"
            }, {
                "inputs": [],
                "name": "transitSwap",
                "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
                "stateMutability": "view",
                "type": "function"
            }, {
                "inputs": [{ "internalType": "address[]", "name": "tokens", "type": "address[]" }, {
                        "internalType": "address",
                        "name": "recipient",
                        "type": "address"
                    }], "name": "withdrawTokens", "outputs": [], "stateMutability": "nonpayable", "type": "function"
            }, { "stateMutability": "payable", "type": "receive" }];
    }
    static getDexContract() {
        return config_1.config.getCustomOption("LIQUIDITY_CONTRACT", true);
    }
    static getPancakePairAbi() {
        return [{ "inputs": [], "payable": false, "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "spender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Approval", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "sender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount0", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "amount1", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }], "name": "Burn", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "sender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount0", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "amount1", "type": "uint256" }], "name": "Mint", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "sender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount0In", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "amount1In", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "amount0Out", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "amount1Out", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }], "name": "Swap", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint112", "name": "reserve0", "type": "uint112" }, { "indexed": false, "internalType": "uint112", "name": "reserve1", "type": "uint112" }], "name": "Sync", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Transfer", "type": "event" }, { "constant": true, "inputs": [], "name": "DOMAIN_SEPARATOR", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "MINIMUM_LIQUIDITY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "PERMIT_TYPEHASH", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "address", "name": "", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "to", "type": "address" }], "name": "burn", "outputs": [{ "internalType": "uint256", "name": "amount0", "type": "uint256" }, { "internalType": "uint256", "name": "amount1", "type": "uint256" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "factory", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "getReserves", "outputs": [{ "internalType": "uint112", "name": "_reserve0", "type": "uint112" }, { "internalType": "uint112", "name": "_reserve1", "type": "uint112" }, { "internalType": "uint32", "name": "_blockTimestampLast", "type": "uint32" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "_token0", "type": "address" }, { "internalType": "address", "name": "_token1", "type": "address" }], "name": "initialize", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "kLast", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "to", "type": "address" }], "name": "mint", "outputs": [{ "internalType": "uint256", "name": "liquidity", "type": "uint256" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "nonces", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }, { "internalType": "uint8", "name": "v", "type": "uint8" }, { "internalType": "bytes32", "name": "r", "type": "bytes32" }, { "internalType": "bytes32", "name": "s", "type": "bytes32" }], "name": "permit", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "price0CumulativeLast", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "price1CumulativeLast", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "to", "type": "address" }], "name": "skim", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "uint256", "name": "amount0Out", "type": "uint256" }, { "internalType": "uint256", "name": "amount1Out", "type": "uint256" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "bytes", "name": "data", "type": "bytes" }], "name": "swap", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [], "name": "sync", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "token0", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "token1", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "transfer", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }];
    }
    static getTokenBnbPairContract() {
        return config_1.config.getCustomOption("TOKEN_BNB_PAIR_CONTRACT", true);
    }
    static getTokenUsdPairContract() {
        return config_1.config.getCustomOption("TOKEN_USD_PAIR_CONTRACT");
    }
    static getPancakeFactoryAbi() {
        return [{ "inputs": [{ "internalType": "address", "name": "_feeToSetter", "type": "address" }], "payable": false, "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "token0", "type": "address" }, { "indexed": true, "internalType": "address", "name": "token1", "type": "address" }, { "indexed": false, "internalType": "address", "name": "pair", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "", "type": "uint256" }], "name": "PairCreated", "type": "event" }, { "constant": true, "inputs": [], "name": "INIT_CODE_PAIR_HASH", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "allPairs", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "allPairsLength", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "tokenA", "type": "address" }, { "internalType": "address", "name": "tokenB", "type": "address" }], "name": "createPair", "outputs": [{ "internalType": "address", "name": "pair", "type": "address" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "feeTo", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "feeToSetter", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "address", "name": "", "type": "address" }], "name": "getPair", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "_feeTo", "type": "address" }], "name": "setFeeTo", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "_feeToSetter", "type": "address" }], "name": "setFeeToSetter", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }];
    }
    static getPancakeFactoryContract() {
        return config_1.config.getCustomOption("PANCAKE_FACTORY_CONTRACT", true);
    }
    static getBnbUsdPairContract() {
        return config_1.config.getCustomOption("BNB_USD_PAIR_CONTRACT", true);
    }
    static getSyncTopicSig() {
        return config_1.config.getCustomOption("SYNC_TOPIC_SIG", true);
    }
    static getTradingPairs() {
        let pairs = [];
        pairs.push(eth_config.getTokenBnbPairContract());
        const tokenUsdPair = this.getTokenUsdPairContract();
        if (!tools_1.tools.isEmpty(tokenUsdPair)) {
            pairs.push((tokenUsdPair));
        }
        return pairs;
    }
    //endregion
    //region HOT WALLET
    static getHotWalletAddress() {
        return config_1.config.getCustomOption("HOT_WALLET_ADDRESS", true);
    }
    static getHotWalletKey() {
        return config_1.config.getCustomOption("HOT_WALLET_ADDRESS_KEY", true);
    }
    //endregion
    //region GAS SETTINGS
    static getGasMultiplier() {
        return 5;
    }
    static getGasMultiplierForBnb() {
        return 2;
    }
    static getConfirmationNeeded() {
        return 2;
    }
    //endregion
    //region RPC
    static getRPCUrl() {
        let rpc_url = config_1.config.getCustomOption("RPC_URL", true);
        if (typeof rpc_url !== "string")
            throw new Error("rpc_url is not retrieved");
        if (rpc_url === "")
            throw new Error("rpc_url is empty");
        return rpc_url;
    }
}
exports.eth_config = eth_config;
//endregion
//region WORKER
eth_config.default_worker_wait_ms = 250;
eth_config.default_worker_batch = 100;
//# sourceMappingURL=eth_config.js.map