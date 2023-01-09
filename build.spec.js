"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const build_1 = require("./build");
const connection_1 = require("./connection");
const tools_1 = require("./tools");
describe("build spec", () => {
    tools_1.tools.BASE_DIR = "";
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield connection_1.connection.startTransaction();
    }));
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield connection_1.connection.rollback();
    }));
    it("test tables info", () => __awaiter(void 0, void 0, void 0, function* () {
        yield build_1.build.run("build", "../dataObject");
    }));
});