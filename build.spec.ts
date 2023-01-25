import {build, connection} from "./ailab-core";

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