import {HttpProvider} from "web3-core";
import Web3 from "web3";
import {eth_config} from "./eth_config";
import {Contract} from "web3-eth-contract";

export class web3_rpc_web3{
    private static web3Provider:HttpProvider|undefined;
    private static web3Client:Web3|undefined;

    public static getWeb3Provider():HttpProvider{
        if(typeof web3_rpc_web3.web3Provider !== "undefined") return web3_rpc_web3.web3Provider;
        web3_rpc_web3.web3Provider = new Web3.providers.HttpProvider(eth_config.getRPCUrl());
        return web3_rpc_web3.web3Provider;
    }

    public static getWeb3Client():Web3{
        if(typeof web3_rpc_web3.web3Client !== "undefined") return web3_rpc_web3.web3Client;
        web3_rpc_web3.web3Client = new Web3(web3_rpc_web3.getWeb3Provider());
        return web3_rpc_web3.web3Client;
    }

    public static getWeb3Contract(contract_address:string, abi:any):Contract{
        const client = this.getWeb3Client();
        return new client.eth.Contract(abi,contract_address);
    }
}