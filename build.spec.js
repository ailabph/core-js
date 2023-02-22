"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const build_1 = require("./build");
const connection_1 = require("./connection");
describe("build spec", () => {
    beforeEach(async () => {
        await connection_1.connection.startTransaction();
    });
    afterEach(async () => {
        await connection_1.connection.rollback();
    });
    it("test tables info", async () => {
        await build_1.build.run("build", "../dataObject");
    });
});
//# sourceMappingURL=build.spec.js.map