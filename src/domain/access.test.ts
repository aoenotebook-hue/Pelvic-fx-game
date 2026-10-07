import {describe,expect,it} from "vitest";
import {belongsToCourse} from "./access";
describe("course membership embed",()=>{
 it("accepts either supported relation shape only for the requested course",()=>{expect(belongsToCourse({course_id:"a"},"a")).toBe(true);expect(belongsToCourse([{course_id:"a"}],"a")).toBe(true);expect(belongsToCourse({course_id:"b"},"a")).toBe(false);expect(belongsToCourse([{course_id:"b"}],"a")).toBe(false);});
 it("rejects missing and malformed relations",()=>{for(const value of [null,undefined,[],"a",{course_id:null},[null,{}]])expect(belongsToCourse(value,"a")).toBe(false);});
});
