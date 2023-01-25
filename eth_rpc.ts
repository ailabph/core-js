import Web3 from "web3";

import { HttpProvider } from "web3-core";
import {eth_config} from "./ailab-core";
export class eth_rpc{
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
}