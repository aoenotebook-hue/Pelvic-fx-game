export function assignedFaculty(roleAssignments:Array<{role:string;cohort_id:string|null}>,cohortId:string) {
 return roleAssignments.some(role=>role.role==="admin"&&role.cohort_id===null || role.role==="faculty"&&role.cohort_id===cohortId);
}
