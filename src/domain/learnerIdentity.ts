export function normalizedLearnerIdentity(email:unknown,studentId:unknown){
 if(typeof email!=="string"||typeof studentId!=="string")return null;
 const normalized=email.trim().toLowerCase(),id=studentId.trim();
 if(normalized.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(normalized)||! /^[A-Za-z0-9_-]{1,40}$/.test(id))return null;
 return {email:normalized,studentId:id};
}
export function learnerRolesOnly(roles:Array<{role:string}>){return roles.every(row=>row.role==="learner");}

/** Student entry: a student ID plus a self-chosen 4-digit code. IDs are case-insensitive. */
export function normalizedStudentEntry(studentId:unknown,code:unknown){
 if(typeof studentId!=="string"||typeof code!=="string")return null;
 const id=studentId.trim().toUpperCase(),pin=code.trim();
 if(!/^[A-Z0-9_-]{1,40}$/.test(id)||!/^\d{4}$/.test(pin))return null;
 return {studentId:id,code:pin};
}
export const CODE_MAX_FAILURES=5, CODE_LOCK_MINUTES=15;
const CODE_ITERATIONS=150000;
const hex=(bytes:Uint8Array)=>Array.from(bytes).map(n=>n.toString(16).padStart(2,"0")).join("");
const unhex=(text:string):Uint8Array<ArrayBuffer>=>new Uint8Array((text.match(/../g)??[]).map(pair=>parseInt(pair,16)));
async function derive(code:string,salt:Uint8Array<ArrayBuffer>,iterations:number){
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(code),"PBKDF2",false,["deriveBits"]);
 return new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations},key,256));
}
/** Salted PBKDF2-SHA256 hash, stored as pbkdf2$iterations$salt$hash. The code itself is never stored. */
export async function hashCode(code:string){
 const salt=crypto.getRandomValues(new Uint8Array(16));
 return `pbkdf2$${CODE_ITERATIONS}$${hex(salt)}$${hex(await derive(code,salt,CODE_ITERATIONS))}`;
}
export async function verifyCode(code:string,stored:string|null|undefined){
 const [scheme,rounds,salt,expected]=(stored??"").split("$");
 if(scheme!=="pbkdf2"||!rounds||!salt||!expected)return false;
 const actual=hex(await derive(code,unhex(salt),Number(rounds)));
 let difference=actual.length^expected.length;
 for(let i=0;i<Math.min(actual.length,expected.length);i++)difference|=actual.charCodeAt(i)^expected.charCodeAt(i);
 return difference===0;
}
/** After a wrong code: the new failure count and, at the limit, when the lock ends. */
export function afterFailure(failures:number,now=Date.now()){
 const next=failures+1;
 return next>=CODE_MAX_FAILURES?{failures:0,lockedUntil:new Date(now+CODE_LOCK_MINUTES*60000).toISOString()}:{failures:next,lockedUntil:null};
}
