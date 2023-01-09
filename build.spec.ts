import * as assert from "assert";
import {expect} from "chai";
import {config} from "./config";
import {build} from "./build";
import {connection} from "./connection";
import {tools} from "./tools";

describe("build spec",()=>{
    tools.BASE_DIR = "";

    beforeEach(async()=>{
        await connection.startTransaction();
    });

    afterEach(async()=>{
        await connection.rollback();
    });

    it("test tables info",async()=>{
        await build.run("build","../dataObject");
    });
});