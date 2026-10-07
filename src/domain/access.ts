/** PostgREST embeds may be an object or an array; reject unknown shapes. */
export function belongsToCourse(embedded:unknown,courseId:string):boolean {
 const entries=Array.isArray(embedded)?embedded:[embedded];
 return entries.some(entry=>entry!==null&&typeof entry==="object"&&"course_id" in entry&&entry.course_id===courseId);
}
