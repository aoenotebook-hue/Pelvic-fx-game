import {render,fireEvent,cleanup} from "@testing-library/react";
import {afterEach,describe,expect,it,vi} from "vitest";
import {Joystick,joystickVector} from "./Joystick";
import {stepWalk,initialWalk} from "./walking";
afterEach(cleanup);
describe("analogue joystick",()=>{
 it("has a central dead zone and caps diagonal speed",()=>{expect(joystickVector(3,3,40)).toEqual({x:0,y:0});const v=joystickVector(100,100,40);expect(Math.hypot(v.x,v.y)).toBeCloseTo(1);expect(joystickVector(20,0,40).x).toBeGreaterThan(0);expect(joystickVector(20,0,40).x).toBeLessThan(1);});
 it("changes speed with drag distance and preserves keyboard movement",()=>{const slow=stepWalk(initialWalk,[],16,800,450,{x:.3,y:0}),fast=stepWalk(initialWalk,[],16,800,450,{x:1,y:0});expect(fast.vx).toBeGreaterThan(slow.vx*2);expect(stepWalk(initialWalk,["d"],16,800,450,{x:0,y:0}).vx).toBe(fast.vx);});
 it("stops on touch cancellation, focus loss and unmount",()=>{const onMove=vi.fn(),view=render(<Joystick label="Move" onMove={onMove}/>);fireEvent.pointerCancel(view.getByRole("group"));expect(onMove).toHaveBeenLastCalledWith({x:0,y:0});fireEvent.blur(window);expect(onMove).toHaveBeenLastCalledWith({x:0,y:0});view.unmount();expect(onMove).toHaveBeenLastCalledWith({x:0,y:0});});
});
