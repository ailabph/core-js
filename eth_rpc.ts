import Web3 from "web3";
import {ethers, JsonRpcProvider} from "ethers";
import {AbstractProvider, HttpProvider} from "web3-core";
import {eth_config} from "./eth_config";
export class eth_rpc {
    private static web3Provider:HttpProvider|undefined;
    private static web3Client:Web3|undefined;

    //region ETHER
    private static etherRpcProvider:JsonRpcProvider|undefined;
    public static getEtherProvider(){
        if(typeof this.etherRpcProvider !== "undefined") return this.etherRpcProvider;
        this.etherRpcProvider = new ethers.JsonRpcProvider(eth_config.getRPCUrl());
        return this.etherRpcProvider;
    }
    public static getEtherContract(contract_address:string, abi:any): ethers.Contract{
        return new ethers.Contract(contract_address, abi, this.getEtherProvider());
    }
    //endregion ETHER
}