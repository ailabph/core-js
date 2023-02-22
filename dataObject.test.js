"use strict";
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
(0, globals_1.test)("test insert", async () => {
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
});
//# sourceMappingURL=dataObject.test.js.map