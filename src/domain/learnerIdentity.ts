export function normalizedLearnerIdentity(email:unknown,studentId:unknown){
 if(typeof email!=="string"||typeof studentId!=="string")return null;
 const normalized=email.trim().toLowerCase(),id=studentId.trim();
 if(normalized.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(normalized)||! /^[A-Za-z0-9_-]{1,40}$/.test(id))return null;
 return {email:normalized,studentId:id};
}
export function learnerRolesOnly(roles:Array<{role:string}>){return roles.every(row=>row.role==="learner");}
