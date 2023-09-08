import * as assert from "assert";
import { config } from "../config";
import sinon from "ts-sinon";
import {expect} from "chai";
import {tools} from "../tools";
import {user} from "../build/user";
import {user_tools} from "../user_tools";

describe("user tools spec",()=>{
    it("user has walletAddress",()=>{
        const u = new user();
        u.walletAddress = "abc123";
        assert.equal(user_tools.hasWalletAddress(u),true);
    });
    it("user has no walletAddress",()=>{
        const u = new user();
        assert.equal(user_tools.hasWalletAddress(u),false);
        u.walletAddress = "";
        assert.equal(user_tools.hasWalletAddress(u),false);
        u.walletAddress = "null";
        assert.equal(user_tools.hasWalletAddress(u),false);
        u.walletAddress = "NULL";
        assert.equal(user_tools.hasWalletAddress(u),false);
    });
});