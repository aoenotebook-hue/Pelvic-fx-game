import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {afterEach,describe,expect,it,vi} from "vitest";
import {FacultyWorkspace} from "./FacultyWorkspace";
import {learningJourney} from "../test/journeys";
const put=vi.hoisted(()=>vi.fn(async(_store:string,_value:unknown)=>undefined));
vi.mock("../storage/db",()=>({getDb:async()=>({get:async()=>undefined,put})}));
afterEach(cleanup);
describe("teacher evidence and observation",()=>{
 it("shows actual learner notes and saves a separate rubric record without changing events",async()=>{const events=learningJourney(false),snapshot=JSON.stringify(events);render(<FacultyWorkspace events={events} attemptId="attempt"/>);expect(await screen.findByText("Corrected after feedback. Your first answer remains preserved.").catch(()=>null)).toBeNull();expect(screen.getByText("Individual evidence")).toBeInTheDocument();expect(screen.getAllByText(/Findings, priorities and uncertainty./).length).toBeGreaterThanOrEqual(3);fireEvent.change(screen.getByLabelText("Observation"),{target:{value:"Explained the uncertainty with prompting."}});fireEvent.click(screen.getByRole("button",{name:"Save teacher observation"}));await waitFor(()=>expect(put).toHaveBeenCalled());expect(JSON.stringify(events)).toBe(snapshot);expect(put.mock.calls.at(-1)?.[1]).toMatchObject({key:"teacher-demo:attempt"});});
});
