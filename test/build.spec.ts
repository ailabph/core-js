
import {build} from "../build";
import {connection} from "../connection";

describe("build spec",()=>{

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