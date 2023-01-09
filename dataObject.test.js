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
const globals_1 = require("@jest/globals");
// @ts-ignore
const meta_options_1 = require("./meta_options");
jest.useFakeTimers();
// test("no tests",()=>{});
// beforeAll(() => {
// });
afterAll(() => { });
afterEach(() => { });
// test("dummy test",()=>{
//     expect(true).toBe(true);
// });
(0, globals_1.test)("test insert", () => __awaiter(void 0, void 0, void 0, function* () {
    let m = new meta_options_1.meta_options();
    (0, globals_1.expect)(m._isNew).toBe(true);
    // m.type = "test";
    // m.tag = "tag_"+tools.getCurrentTimeStamp();
    // m.value = "value_"+tools.getCurrentTimeStamp();
    // m.updated_by = 0;
    // m.time_updated = 0;
    // await m.save();
    // console.log("id inserted:"+m.id);
    // expect(m._isNew).toBe(false);
    // let check = new meta_options();
    // check.id = m.id;
    // await check.fetch();
    // expect(check._isNew).toBe(false);
    // expect(check.tag).toBe("new_tag_123");
}));
