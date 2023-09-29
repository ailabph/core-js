import {describe, expect, test} from '@jest/globals';
// @ts-ignore
import {meta_options} from "../build/meta_options";
import {tools} from "../tools";
jest.useFakeTimers();

// test("no tests",()=>{});

// beforeAll(() => {
// });

afterAll(() => {});

afterEach(() => {});



// test("dummy test",()=>{
//     expect(true).toBe(true);
// });

test("test insert",async ()=>{
    let m = new meta_options();
    expect(m._isNew).toBe(true);
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