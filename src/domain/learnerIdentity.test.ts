import {describe,it,expect} from "vitest";
import {learnerRolesOnly,normalizedLearnerIdentity} from "./learnerIdentity";
describe("self-reported learner identity",()=>{
 it("normalizes email and preserves text IDs",()=>expect(normalizedLearnerIdentity(" Student@Example.edu "," 001234 ")).toEqual({email:"student@example.edu",studentId:"001234"}));
 it("rejects malformed and oversized identities",()=>{for(const pair of [[null,"123"],["bad","123"],["a@b.c","="],["a@b.c","x".repeat(41)],["a@b.c",123]])expect(normalizedLearnerIdentity(...pair as [unknown,unknown])).toBeNull();});
 it("never allows staff identities through learner entry",()=>{expect(learnerRolesOnly([{role:"learner"}])).toBe(true);for(const role of ["faculty","editor","admin"])expect(learnerRolesOnly([{role:"learner"},{role}])).toBe(false);});
});
import {afterFailure,hashCode,normalizedStudentEntry,verifyCode,CODE_MAX_FAILURES} from "./learnerIdentity";
describe("student ID + 4-digit code",()=>{
 it("accepts a student ID and exactly four digits",()=>{
  expect(normalizedStudentEntry(" 6501234a ","0042")).toEqual({studentId:"6501234A",code:"0042"});
  for(const pair of [["6501234","123"],["6501234","12345"],["6501234","12a4"],["","1234"],["a b","1234"],["=1","1234"],[123,"1234"]])expect(normalizedStudentEntry(...pair as [unknown,unknown])).toBeNull();
 });
 it("stores only a salted hash and verifies the right code",async()=>{
  const stored=await hashCode("0042");
  expect(stored).toMatch(/^pbkdf2\$\d+\$[0-9a-f]{32}\$[0-9a-f]{64}$/);expect(stored).not.toContain("0042$");
  expect(await verifyCode("0042",stored)).toBe(true);expect(await verifyCode("0043",stored)).toBe(false);
  expect(await hashCode("0042")).not.toBe(stored);expect(await verifyCode("0042",null)).toBe(false);
 });
 it("locks for 15 minutes after five wrong codes",()=>{
  let state={failures:0,lockedUntil:null as string|null};
  for(let i=1;i<CODE_MAX_FAILURES;i++){state=afterFailure(state.failures,0);expect(state.lockedUntil).toBeNull();}
  state=afterFailure(state.failures,0);expect(state).toEqual({failures:0,lockedUntil:new Date(15*60000).toISOString()});
 });
});
