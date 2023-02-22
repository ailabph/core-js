import Web3 from "web3";
import {ethers, JsonRpcProvider} from "ethers";
import {AbstractProvider, HttpProvider} from "web3-core";
import {eth_config} from "./eth_config";
export class eth_rpc {
    private static web3Provider:HttpProvider|undefined;
    private static web3Client:Web3|undefined;

    public static getWeb3Provider():HttpProvider{
        if(typeof eth_rpc.web3Provider !== "undefined") return eth_rpc.web3Provider;
        eth_rpc.web3Provider = new Web3.providers.HttpProvider(eth_config.getRPCUrl());
        return eth_rpc.web3Provider;
    }

    public static getWeb3Client():Web3{
        if(typeof eth_rpc.web3Client !== "undefined") return eth_rpc.web3Client;
        eth_rpc.web3Client = new Web3(eth_rpc.getWeb3Provider());
        return eth_rpc.web3Client;
    }

    private static etherRpcProvider:JsonRpcProvider|undefined;
    public static getEtherProvider(){
        if(typeof this.etherRpcProvider !== "undefined") return this.etherRpcProvider;
        this.etherRpcProvider = new ethers.JsonRpcProvider(eth_config.getRPCUrl());
        return this.etherRpcProvider;
    }
    public static getEtherContract(contract_address:string, abi:any): ethers.Contract{
        return new ethers.Contract(contract_address, abi, this.getEtherProvider());
    }
}