import {config} from "./ailab-core";

export class eth_config {

    //region ETH
    public static getEthAbi(): any[] {
        return [{
            "constant": true,
            "inputs": [],
            "name": "name",
            "outputs": [{"name": "", "type": "string"}],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        }, {
            "constant": false,
            "inputs": [{"name": "guy", "type": "address"}, {"name": "wad", "type": "uint256"}],
            "name": "approve",
            "outputs": [{"name": "", "type": "bool"}],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "constant": true,
            "inputs": [],
            "name": "totalSupply",
            "outputs": [{"name": "", "type": "uint256"}],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        }, {
            "constant": false,
            "inputs": [{"name": "src", "type": "address"}, {"name": "dst", "type": "address"}, {
                "name": "wad",
                "type": "uint256"
            }],
            "name": "transferFrom",
            "outputs": [{"name": "", "type": "bool"}],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "constant": false,
            "inputs": [{"name": "wad", "type": "uint256"}],
            "name": "withdraw",
            "outputs": [],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "constant": true,
            "inputs": [],
            "name": "decimals",
            "outputs": [{"name": "", "type": "uint8"}],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        }, {
            "constant": true,
            "inputs": [{"name": "", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "", "type": "uint256"}],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        }, {
            "constant": true,
            "inputs": [],
            "name": "symbol",
            "outputs": [{"name": "", "type": "string"}],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        }, {
            "constant": false,
            "inputs": [{"name": "dst", "type": "address"}, {"name": "wad", "type": "uint256"}],
            "name": "transfer",
            "outputs": [{"name": "", "type": "bool"}],
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
            "inputs": [{"name": "", "type": "address"}, {"name": "", "type": "address"}],
            "name": "allowance",
            "outputs": [{"name": "", "type": "uint256"}],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        }, {"payable": true, "stateMutability": "payable", "type": "fallback"}, {
            "anonymous": false,
            "inputs": [{"indexed": true, "name": "src", "type": "address"}, {
                "indexed": true,
                "name": "guy",
                "type": "address"
            }, {"indexed": false, "name": "wad", "type": "uint256"}],
            "name": "Approval",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{"indexed": true, "name": "src", "type": "address"}, {
                "indexed": true,
                "name": "dst",
                "type": "address"
            }, {"indexed": false, "name": "wad", "type": "uint256"}],
            "name": "Transfer",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{"indexed": true, "name": "dst", "type": "address"}, {
                "indexed": false,
                "name": "wad",
                "type": "uint256"
            }],
            "name": "Deposit",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{"indexed": true, "name": "src", "type": "address"}, {
                "indexed": false,
                "name": "wad",
                "type": "uint256"
            }],
            "name": "Withdrawal",
            "type": "event"
        }];
    }

    public static getEthContract(): string {
        return config.getCustomOption("ETH_CONTRACT", true) as string;
    }

    public static getEthSymbol(): string {
        return config.getCustomOption("ETH_SYMBOL", true) as string;
    }

    public static getEthDecimal(): number {
        return config.getCustomOption("ETH_DECIMAL", true) as number;
    }

    //endregion

    //region TOKEN
    public static getTokenAbi(): any[] {
        return [{
            "inputs": [],
            "stateMutability": "nonpayable",
            "type": "constructor"
        }, {
            "anonymous": false,
            "inputs": [{"indexed": true, "internalType": "address", "name": "owner", "type": "address"}, {
                "indexed": true,
                "internalType": "address",
                "name": "spender",
                "type": "address"
            }, {"indexed": false, "internalType": "uint256", "name": "value", "type": "uint256"}],
            "name": "Approval",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{"indexed": false, "internalType": "address", "name": "account", "type": "address"}, {
                "indexed": false,
                "internalType": "bool",
                "name": "status",
                "type": "bool"
            }],
            "name": "ExcludedFromFee",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{"indexed": false, "internalType": "uint256", "name": "minTokensBeforeSwap", "type": "uint256"}],
            "name": "MinTokensBeforeSwapUpdated",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{
                "indexed": true,
                "internalType": "address",
                "name": "previousOwner",
                "type": "address"
            }, {"indexed": true, "internalType": "address", "name": "newOwner", "type": "address"}],
            "name": "OwnershipTransferred",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{
                "indexed": false,
                "internalType": "uint256",
                "name": "newPercent",
                "type": "uint256"
            }, {"indexed": false, "internalType": "string", "name": "feeType", "type": "string"}],
            "name": "SetFee",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{"indexed": false, "internalType": "address", "name": "oldWallet", "type": "address"}, {
                "indexed": false,
                "internalType": "address",
                "name": "newWallet",
                "type": "address"
            }],
            "name": "SetMarketingWallet",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{"indexed": false, "internalType": "uint256", "name": "oldAmount", "type": "uint256"}, {
                "indexed": false,
                "internalType": "uint256",
                "name": "newAmount",
                "type": "uint256"
            }],
            "name": "SetMaxTxPercent",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{"indexed": false, "internalType": "uint256", "name": "oldAmount", "type": "uint256"}, {
                "indexed": false,
                "internalType": "uint256",
                "name": "newAmount",
                "type": "uint256"
            }],
            "name": "SetNumTokensSellToAddToLiquidity",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{
                "indexed": false,
                "internalType": "uint256",
                "name": "tokensSwapped",
                "type": "uint256"
            }, {"indexed": false, "internalType": "uint256", "name": "ethReceived", "type": "uint256"}, {
                "indexed": false,
                "internalType": "uint256",
                "name": "tokensIntoLiqudity",
                "type": "uint256"
            }],
            "name": "SwapAndLiquify",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{"indexed": false, "internalType": "bool", "name": "enabled", "type": "bool"}],
            "name": "SwapAndLiquifyEnabledUpdated",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{"indexed": true, "internalType": "address", "name": "from", "type": "address"}, {
                "indexed": true,
                "internalType": "address",
                "name": "to",
                "type": "address"
            }, {"indexed": false, "internalType": "uint256", "name": "value", "type": "uint256"}],
            "name": "Transfer",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{
                "indexed": false,
                "internalType": "uint256",
                "name": "oldSellFeeMultiplier",
                "type": "uint256"
            }, {"indexed": false, "internalType": "uint256", "name": "newSellFeeMultiplier", "type": "uint256"}],
            "name": "UpdateSellFeeMultiplier",
            "type": "event"
        }, {
            "inputs": [],
            "name": "DENOMINATOR",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "SELLFEEDENOM",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "_liquidityFee",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "_marketFee",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "_maxTxAmount",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "_sellFeeMultiplier",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "_taxFee",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            }],
            "name": "allowance",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }],
            "name": "approve",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "to", "type": "address"}, {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }], "name": "clearStuckBNBBalance", "outputs": [], "stateMutability": "nonpayable", "type": "function"
        }, {
            "inputs": [],
            "name": "decimals",
            "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {
                "internalType": "uint256",
                "name": "subtractedValue",
                "type": "uint256"
            }],
            "name": "decreaseAllowance",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "tAmount", "type": "uint256"}],
            "name": "deliver",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [],
            "name": "disableAllFees",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [],
            "name": "enableAllFees",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
            "name": "excludeFromFee",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
            "name": "excludeFromReward",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [],
            "name": "getOwner",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
            "name": "includeInFee",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
            "name": "includeInReward",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {
                "internalType": "uint256",
                "name": "addedValue",
                "type": "uint256"
            }],
            "name": "increaseAllowance",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
            "name": "isExcludedFromFee",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
            "name": "isExcludedFromReward",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "marketingWallet",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "name",
            "outputs": [{"internalType": "string", "name": "", "type": "string"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "owner",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "tAmount", "type": "uint256"}, {
                "internalType": "bool",
                "name": "deductTransferFee",
                "type": "bool"
            }],
            "name": "reflectionFromToken",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "renounceOwnership",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "liquidityFee", "type": "uint256"}],
            "name": "setLiquidityFee",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "marketFee", "type": "uint256"}],
            "name": "setMarketFee",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "newWallet", "type": "address"}],
            "name": "setMarketingWallet",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "maxTxAmount", "type": "uint256"}],
            "name": "setMaxTxPercent",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "numTokensSellToAddToLiquidity", "type": "uint256"}],
            "name": "setNumTokensSellToAddToLiquidity",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "newSellFeeMultiplier", "type": "uint256"}],
            "name": "setSellFeeMultiplier",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "bool", "name": "_enabled", "type": "bool"}],
            "name": "setSwapAndLiquifyEnabled",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "taxFee", "type": "uint256"}],
            "name": "setTaxFee",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [],
            "name": "swapAndLiquifyEnabled",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "symbol",
            "outputs": [{"internalType": "string", "name": "", "type": "string"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "rAmount", "type": "uint256"}],
            "name": "tokenFromReflection",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "totalFees",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "totalSupply",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "recipient", "type": "address"}, {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }],
            "name": "transfer",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "sender", "type": "address"}, {
                "internalType": "address",
                "name": "recipient",
                "type": "address"
            }, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
            "name": "transferFrom",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "newOwner", "type": "address"}],
            "name": "transferOwnership",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [],
            "name": "uniswapV2Pair",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "uniswapV2Router",
            "outputs": [{"internalType": "contract IUniswapV2Router02", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "token", "type": "address"}, {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }], "name": "withdrawStuckTokens", "outputs": [], "stateMutability": "nonpayable", "type": "function"
        }, {"stateMutability": "payable", "type": "receive"}];
    }

    public static getTransferAbi(): any[] {
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

    public static getBalanceAbi(): any[] {
        return [
            // balanceOf
            {
                constant: true,
                inputs: [{name: "_owner", type: "address"}],
                name: "balanceOf",
                outputs: [{name: "balance", type: "uint256"}],
                type: "function",
            },
        ];
    }

    public static getTokenContract(): string {
        return config.getCustomOption("TOKEN_TO_TRACK", true) as string;
    }

    public static getTokenSymbol(): string {
        return config.getCustomOption("TOKEN_TO_TRACK_SYMBOL", true) as string;
    }

    public static getTokenDecimal(): number {
        return config.getCustomOption("TOKEN_TO_TRACK_DECIMAL", true) as number;
    }

    public static getTokenGenesisHash(): string {
        return config.getCustomOption("TOKEN_CREATION_HASH", true) as string;
    }

    public static getTokenGenesisBlock(): number {
        return config.getCustomOption("STARTING_BLOCK", true) as number;
    }

    public static getTokenOwner(): string {
        return config.getCustomOption("OWNER_WALLET", true) as string;
    }

    //endregion

    //region DEX
    public static getDexAbi(): any[] {
        return [{
            "inputs": [{
                "internalType": "address",
                "name": "_factory",
                "type": "address"
            }, {"internalType": "address", "name": "_WETH", "type": "address"}],
            "stateMutability": "nonpayable",
            "type": "constructor"
        }, {
            "inputs": [],
            "name": "WETH",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "tokenA", "type": "address"}, {
                "internalType": "address",
                "name": "tokenB",
                "type": "address"
            }, {"internalType": "uint256", "name": "amountADesired", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountBDesired",
                "type": "uint256"
            }, {"internalType": "uint256", "name": "amountAMin", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountBMin",
                "type": "uint256"
            }, {"internalType": "address", "name": "to", "type": "address"}, {
                "internalType": "uint256",
                "name": "deadline",
                "type": "uint256"
            }],
            "name": "addLiquidity",
            "outputs": [{"internalType": "uint256", "name": "amountA", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountB",
                "type": "uint256"
            }, {"internalType": "uint256", "name": "liquidity", "type": "uint256"}],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "token", "type": "address"}, {
                "internalType": "uint256",
                "name": "amountTokenDesired",
                "type": "uint256"
            }, {"internalType": "uint256", "name": "amountTokenMin", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountETHMin",
                "type": "uint256"
            }, {"internalType": "address", "name": "to", "type": "address"}, {
                "internalType": "uint256",
                "name": "deadline",
                "type": "uint256"
            }],
            "name": "addLiquidityETH",
            "outputs": [{"internalType": "uint256", "name": "amountToken", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountETH",
                "type": "uint256"
            }, {"internalType": "uint256", "name": "liquidity", "type": "uint256"}],
            "stateMutability": "payable",
            "type": "function"
        }, {
            "inputs": [],
            "name": "factory",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "reserveIn",
                "type": "uint256"
            }, {"internalType": "uint256", "name": "reserveOut", "type": "uint256"}],
            "name": "getAmountIn",
            "outputs": [{"internalType": "uint256", "name": "amountIn", "type": "uint256"}],
            "stateMutability": "pure",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "amountIn", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "reserveIn",
                "type": "uint256"
            }, {"internalType": "uint256", "name": "reserveOut", "type": "uint256"}],
            "name": "getAmountOut",
            "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
            "stateMutability": "pure",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}, {
                "internalType": "address[]",
                "name": "path",
                "type": "address[]"
            }],
            "name": "getAmountsIn",
            "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "amountIn", "type": "uint256"}, {
                "internalType": "address[]",
                "name": "path",
                "type": "address[]"
            }],
            "name": "getAmountsOut",
            "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "amountA", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "reserveA",
                "type": "uint256"
            }, {"internalType": "uint256", "name": "reserveB", "type": "uint256"}],
            "name": "quote",
            "outputs": [{"internalType": "uint256", "name": "amountB", "type": "uint256"}],
            "stateMutability": "pure",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "tokenA", "type": "address"}, {
                "internalType": "address",
                "name": "tokenB",
                "type": "address"
            }, {"internalType": "uint256", "name": "liquidity", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountAMin",
                "type": "uint256"
            }, {"internalType": "uint256", "name": "amountBMin", "type": "uint256"}, {
                "internalType": "address",
                "name": "to",
                "type": "address"
            }, {"internalType": "uint256", "name": "deadline", "type": "uint256"}],
            "name": "removeLiquidity",
            "outputs": [{"internalType": "uint256", "name": "amountA", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountB",
                "type": "uint256"
            }],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "token", "type": "address"}, {
                "internalType": "uint256",
                "name": "liquidity",
                "type": "uint256"
            }, {"internalType": "uint256", "name": "amountTokenMin", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountETHMin",
                "type": "uint256"
            }, {"internalType": "address", "name": "to", "type": "address"}, {
                "internalType": "uint256",
                "name": "deadline",
                "type": "uint256"
            }],
            "name": "removeLiquidityETH",
            "outputs": [{"internalType": "uint256", "name": "amountToken", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountETH",
                "type": "uint256"
            }],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "token", "type": "address"}, {
                "internalType": "uint256",
                "name": "liquidity",
                "type": "uint256"
            }, {"internalType": "uint256", "name": "amountTokenMin", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountETHMin",
                "type": "uint256"
            }, {"internalType": "address", "name": "to", "type": "address"}, {
                "internalType": "uint256",
                "name": "deadline",
                "type": "uint256"
            }],
            "name": "removeLiquidityETHSupportingFeeOnTransferTokens",
            "outputs": [{"internalType": "uint256", "name": "amountETH", "type": "uint256"}],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "token", "type": "address"}, {
                "internalType": "uint256",
                "name": "liquidity",
                "type": "uint256"
            }, {"internalType": "uint256", "name": "amountTokenMin", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountETHMin",
                "type": "uint256"
            }, {"internalType": "address", "name": "to", "type": "address"}, {
                "internalType": "uint256",
                "name": "deadline",
                "type": "uint256"
            }, {"internalType": "bool", "name": "approveMax", "type": "bool"}, {
                "internalType": "uint8",
                "name": "v",
                "type": "uint8"
            }, {"internalType": "bytes32", "name": "r", "type": "bytes32"}, {
                "internalType": "bytes32",
                "name": "s",
                "type": "bytes32"
            }],
            "name": "removeLiquidityETHWithPermit",
            "outputs": [{"internalType": "uint256", "name": "amountToken", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountETH",
                "type": "uint256"
            }],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "token", "type": "address"}, {
                "internalType": "uint256",
                "name": "liquidity",
                "type": "uint256"
            }, {"internalType": "uint256", "name": "amountTokenMin", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountETHMin",
                "type": "uint256"
            }, {"internalType": "address", "name": "to", "type": "address"}, {
                "internalType": "uint256",
                "name": "deadline",
                "type": "uint256"
            }, {"internalType": "bool", "name": "approveMax", "type": "bool"}, {
                "internalType": "uint8",
                "name": "v",
                "type": "uint8"
            }, {"internalType": "bytes32", "name": "r", "type": "bytes32"}, {
                "internalType": "bytes32",
                "name": "s",
                "type": "bytes32"
            }],
            "name": "removeLiquidityETHWithPermitSupportingFeeOnTransferTokens",
            "outputs": [{"internalType": "uint256", "name": "amountETH", "type": "uint256"}],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "tokenA", "type": "address"}, {
                "internalType": "address",
                "name": "tokenB",
                "type": "address"
            }, {"internalType": "uint256", "name": "liquidity", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountAMin",
                "type": "uint256"
            }, {"internalType": "uint256", "name": "amountBMin", "type": "uint256"}, {
                "internalType": "address",
                "name": "to",
                "type": "address"
            }, {"internalType": "uint256", "name": "deadline", "type": "uint256"}, {
                "internalType": "bool",
                "name": "approveMax",
                "type": "bool"
            }, {"internalType": "uint8", "name": "v", "type": "uint8"}, {
                "internalType": "bytes32",
                "name": "r",
                "type": "bytes32"
            }, {"internalType": "bytes32", "name": "s", "type": "bytes32"}],
            "name": "removeLiquidityWithPermit",
            "outputs": [{"internalType": "uint256", "name": "amountA", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountB",
                "type": "uint256"
            }],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}, {
                "internalType": "address[]",
                "name": "path",
                "type": "address[]"
            }, {"internalType": "address", "name": "to", "type": "address"}, {
                "internalType": "uint256",
                "name": "deadline",
                "type": "uint256"
            }],
            "name": "swapETHForExactTokens",
            "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}],
            "stateMutability": "payable",
            "type": "function"
        }, {
            "inputs": [
                {"internalType": "uint256", "name": "amountOutMin", "type": "uint256"},
                {
                    "internalType": "address[]",
                    "name": "path",
                    "type": "address[]"
                }, {"internalType": "address", "name": "to", "type": "address"}, {
                    "internalType": "uint256",
                    "name": "deadline",
                    "type": "uint256"
                }],
            "name": "swapExactETHForTokens",
            "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}],
            "stateMutability": "payable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "amountOutMin", "type": "uint256"}, {
                "internalType": "address[]",
                "name": "path",
                "type": "address[]"
            }, {"internalType": "address", "name": "to", "type": "address"}, {
                "internalType": "uint256",
                "name": "deadline",
                "type": "uint256"
            }],
            "name": "swapExactETHForTokensSupportingFeeOnTransferTokens",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "amountIn", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountOutMin",
                "type": "uint256"
            }, {"internalType": "address[]", "name": "path", "type": "address[]"}, {
                "internalType": "address",
                "name": "to",
                "type": "address"
            }, {"internalType": "uint256", "name": "deadline", "type": "uint256"}],
            "name": "swapExactTokensForETH",
            "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "amountIn", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountOutMin",
                "type": "uint256"
            }, {"internalType": "address[]", "name": "path", "type": "address[]"}, {
                "internalType": "address",
                "name": "to",
                "type": "address"
            }, {"internalType": "uint256", "name": "deadline", "type": "uint256"}],
            "name": "swapExactTokensForETHSupportingFeeOnTransferTokens",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "amountIn", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountOutMin",
                "type": "uint256"
            }, {"internalType": "address[]", "name": "path", "type": "address[]"}, {
                "internalType": "address",
                "name": "to",
                "type": "address"
            }, {"internalType": "uint256", "name": "deadline", "type": "uint256"}],
            "name": "swapExactTokensForTokens",
            "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "amountIn", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountOutMin",
                "type": "uint256"
            }, {"internalType": "address[]", "name": "path", "type": "address[]"}, {
                "internalType": "address",
                "name": "to",
                "type": "address"
            }, {"internalType": "uint256", "name": "deadline", "type": "uint256"}],
            "name": "swapExactTokensForTokensSupportingFeeOnTransferTokens",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountInMax",
                "type": "uint256"
            }, {"internalType": "address[]", "name": "path", "type": "address[]"}, {
                "internalType": "address",
                "name": "to",
                "type": "address"
            }, {"internalType": "uint256", "name": "deadline", "type": "uint256"}],
            "name": "swapTokensForExactETH",
            "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}, {
                "internalType": "uint256",
                "name": "amountInMax",
                "type": "uint256"
            }, {"internalType": "address[]", "name": "path", "type": "address[]"}, {
                "internalType": "address",
                "name": "to",
                "type": "address"
            }, {"internalType": "uint256", "name": "deadline", "type": "uint256"}],
            "name": "swapTokensForExactTokens",
            "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {"stateMutability": "payable", "type": "receive"}];
    }

    public static getSwapRouterAbi(): any[] {
        return [{
            "inputs": [{
                "internalType": "address",
                "name": "transitSwap_",
                "type": "address"
            }, {"internalType": "address", "name": "transitCross_", "type": "address"}, {
                "internalType": "address",
                "name": "transitFees_",
                "type": "address"
            }, {"internalType": "address", "name": "executor", "type": "address"}],
            "stateMutability": "nonpayable",
            "type": "constructor"
        }, {
            "anonymous": false,
            "inputs": [{
                "indexed": false,
                "internalType": "uint8[]",
                "name": "types",
                "type": "uint8[]"
            }, {"indexed": false, "internalType": "bool[]", "name": "newModes", "type": "bool[]"}],
            "name": "ChangeSwapTypeMode",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{
                "indexed": true,
                "internalType": "address",
                "name": "previousTransit",
                "type": "address"
            }, {"indexed": true, "internalType": "address", "name": "newTransit", "type": "address"}],
            "name": "ChangeTransitCross",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{
                "indexed": true,
                "internalType": "address",
                "name": "previousTransitFees",
                "type": "address"
            }, {"indexed": true, "internalType": "address", "name": "newTransitFees", "type": "address"}],
            "name": "ChangeTransitFees",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{
                "indexed": true,
                "internalType": "address",
                "name": "previousTransit",
                "type": "address"
            }, {"indexed": true, "internalType": "address", "name": "newTransit", "type": "address"}],
            "name": "ChangeTransitSwap",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{
                "indexed": true,
                "internalType": "address",
                "name": "previousExecutor",
                "type": "address"
            }, {"indexed": true, "internalType": "address", "name": "newExecutor", "type": "address"}],
            "name": "ExecutorshipTransferStarted",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{
                "indexed": true,
                "internalType": "address",
                "name": "previousExecutor",
                "type": "address"
            }, {"indexed": true, "internalType": "address", "name": "newExecutor", "type": "address"}],
            "name": "ExecutorshipTransferred",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{
                "indexed": true,
                "internalType": "address",
                "name": "previousOwner",
                "type": "address"
            }, {"indexed": true, "internalType": "address", "name": "newOwner", "type": "address"}],
            "name": "OwnershipTransferStarted",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{
                "indexed": true,
                "internalType": "address",
                "name": "previousOwner",
                "type": "address"
            }, {"indexed": true, "internalType": "address", "name": "newOwner", "type": "address"}],
            "name": "OwnershipTransferred",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{"indexed": false, "internalType": "address", "name": "account", "type": "address"}],
            "name": "Paused",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{
                "indexed": false,
                "internalType": "address",
                "name": "from",
                "type": "address"
            }, {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}],
            "name": "Receipt",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{
                "indexed": true,
                "internalType": "address",
                "name": "srcToken",
                "type": "address"
            }, {"indexed": true, "internalType": "address", "name": "dstToken", "type": "address"}, {
                "indexed": true,
                "internalType": "address",
                "name": "dstReceiver",
                "type": "address"
            }, {"indexed": false, "internalType": "address", "name": "trader", "type": "address"}, {
                "indexed": false,
                "internalType": "bool",
                "name": "feeMode",
                "type": "bool"
            }, {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}, {
                "indexed": false,
                "internalType": "uint256",
                "name": "returnAmount",
                "type": "uint256"
            }, {
                "indexed": false,
                "internalType": "uint256",
                "name": "minReturnAmount",
                "type": "uint256"
            }, {"indexed": false, "internalType": "uint256", "name": "fee", "type": "uint256"}, {
                "indexed": false,
                "internalType": "uint256",
                "name": "toChainID",
                "type": "uint256"
            }, {"indexed": false, "internalType": "string", "name": "channel", "type": "string"}, {
                "indexed": false,
                "internalType": "uint256",
                "name": "time",
                "type": "uint256"
            }],
            "name": "TransitSwapped",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{"indexed": false, "internalType": "address", "name": "account", "type": "address"}],
            "name": "Unpaused",
            "type": "event"
        }, {
            "anonymous": false,
            "inputs": [{
                "indexed": true,
                "internalType": "address",
                "name": "token",
                "type": "address"
            }, {"indexed": true, "internalType": "address", "name": "executor", "type": "address"}, {
                "indexed": true,
                "internalType": "address",
                "name": "recipient",
                "type": "address"
            }, {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}],
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
            "inputs": [{"internalType": "bool", "name": "paused", "type": "bool"}],
            "name": "changePause",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint8[]", "name": "swapTypes", "type": "uint8[]"}],
            "name": "changeSwapTypeMode",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "newTransit", "type": "address"}],
            "name": "changeTransitCross",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "newTransitFees", "type": "address"}],
            "name": "changeTransitFees",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "newTransit", "type": "address"}],
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
                }, {"internalType": "address", "name": "srcToken", "type": "address"}, {
                    "internalType": "address",
                    "name": "dstToken",
                    "type": "address"
                }, {"internalType": "address", "name": "srcReceiver", "type": "address"}, {
                    "internalType": "address",
                    "name": "dstReceiver",
                    "type": "address"
                }, {"internalType": "uint256", "name": "amount", "type": "uint256"}, {
                    "internalType": "uint256",
                    "name": "minReturnAmount",
                    "type": "uint256"
                }, {"internalType": "string", "name": "channel", "type": "string"}, {
                    "internalType": "uint256",
                    "name": "toChainID",
                    "type": "uint256"
                }, {"internalType": "address", "name": "wrappedNative", "type": "address"}],
                "internalType": "struct TransitStructs.TransitSwapDescription",
                "name": "desc",
                "type": "tuple"
            }, {
                "components": [{"internalType": "uint8", "name": "flag", "type": "uint8"}, {
                    "internalType": "address",
                    "name": "srcToken",
                    "type": "address"
                }, {"internalType": "bytes", "name": "calldatas", "type": "bytes"}],
                "internalType": "struct TransitStructs.CallbytesDescription",
                "name": "callbytesDesc",
                "type": "tuple"
            }], "name": "cross", "outputs": [], "stateMutability": "payable", "type": "function"
        }, {
            "inputs": [],
            "name": "executor",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "owner",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "paused",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "pendingExecutor",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "pendingOwner",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
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
                }, {"internalType": "address", "name": "srcToken", "type": "address"}, {
                    "internalType": "address",
                    "name": "dstToken",
                    "type": "address"
                }, {"internalType": "address", "name": "srcReceiver", "type": "address"}, {
                    "internalType": "address",
                    "name": "dstReceiver",
                    "type": "address"
                }, {"internalType": "uint256", "name": "amount", "type": "uint256"}, {
                    "internalType": "uint256",
                    "name": "minReturnAmount",
                    "type": "uint256"
                }, {"internalType": "string", "name": "channel", "type": "string"}, {
                    "internalType": "uint256",
                    "name": "toChainID",
                    "type": "uint256"
                }, {"internalType": "address", "name": "wrappedNative", "type": "address"}],
                "internalType": "struct TransitStructs.TransitSwapDescription",
                "name": "desc",
                "type": "tuple"
            }, {
                "components": [{"internalType": "uint8", "name": "flag", "type": "uint8"}, {
                    "internalType": "address",
                    "name": "srcToken",
                    "type": "address"
                }, {"internalType": "bytes", "name": "calldatas", "type": "bytes"}],
                "internalType": "struct TransitStructs.CallbytesDescription",
                "name": "callbytesDesc",
                "type": "tuple"
            }], "name": "swap", "outputs": [], "stateMutability": "payable", "type": "function"
        }, {
            "inputs": [{"internalType": "uint8", "name": "swapType", "type": "uint8"}],
            "name": "swapTypeMode",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "newExecutor", "type": "address"}],
            "name": "transferExecutorship",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address", "name": "newOwner", "type": "address"}],
            "name": "transferOwnership",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [],
            "name": "transitCross",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "transitFees",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "transitSwap",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [{"internalType": "address[]", "name": "tokens", "type": "address[]"}, {
                "internalType": "address",
                "name": "recipient",
                "type": "address"
            }], "name": "withdrawTokens", "outputs": [], "stateMutability": "nonpayable", "type": "function"
        }, {"stateMutability": "payable", "type": "receive"}];
    }

    public static getDexContract(): string {
        return config.getCustomOption("LIQUIDITY_CONTRACT", true) as string;
    }

    //endregion

    //region HOT WALLET
    public static getHotWalletAddress(): string {
        return config.getCustomOption("HOT_WALLET_ADDRESS", true) as string;
    }

    public static getHotWalletKey(): string {
        return config.getCustomOption("HOT_WALLET_ADDRESS_KEY", true) as string;
    }

    //endregion

    //region GAS SETTINGS
    public static getGasMultiplier(): number {
        return 7;
    }

    public static getConfirmationNeeded(): number {
        return 2;
    }

    //endregion

    //region RPC
    public static getRPCUrl(): string {
        let rpc_url = config.getCustomOption("RPC_URL", true);
        if (typeof rpc_url !== "string") throw new Error("rpc_url is not retrieved");
        if (rpc_url === "") throw new Error("rpc_url is empty");
        return rpc_url
    }

    //endregion

    //region WORKER
    public static default_worker_wait_ms:number = 250;
    public static default_worker_batch:number = 100;
    //endregion END WORKER

}