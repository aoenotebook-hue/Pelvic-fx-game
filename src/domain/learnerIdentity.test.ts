import {describe,it,expect} from "vitest";
import {learnerRolesOnly,normalizedLearnerIdentity} from "./learnerIdentity";
describe("self-reported learner identity",()=>{
 it("normalizes email and preserves text IDs",()=>expect(normalizedLearnerIdentity(" Student@Example.edu "," 001234 ")).toEqual({email:"student@example.edu",studentId:"001234"}));
 it("rejects malformed and oversized identities",()=>{for(const pair of [[null,"123"],["bad","123"],["a@b.c","="],["a@b.c","x".repeat(41)],["a@b.c",123]])expect(normalizedLearnerIdentity(...pair as [unknown,unknown])).toBeNull();});
 it("never allows staff identities through learner entry",()=>{expect(learnerRolesOnly([{role:"learner"}])).toBe(true);for(const role of ["faculty","editor","admin"])expect(learnerRolesOnly([{role:"learner"},{role}])).toBe(false);});
});
