import { describe, expect, it } from "vitest";
import { initialWalk, stepWalk } from "./walking";

function travel(keys: string[], fps = 60, width = 800, height = 450) {
  let state = { ...initialWalk, y: 65 };
  for (let i = 0; i < fps; i++) state = stepWalk(state, keys, 1000 / fps, width, height);
  return state;
}
describe("smooth room walking", () => {
  it("crosses the room faster than the old 12%-per-second pace", () => {
    expect(travel(["d"]).x - 50).toBeGreaterThan(28);
  });
  it("normalizes diagonal speed in pixel space", () => {
    const diagonal = travel(["d", "w"], 60, 800, 900), horizontal = travel(["d"], 60, 800, 900);
    expect(Math.hypot((diagonal.x - 50) * 8, (diagonal.y - 65) * 9)).toBeCloseTo((horizontal.x - 50) * 8, 5);
  });
  it("has consistent travel at 30, 60 and 120 frames per second", () => {
    expect(Math.abs(travel(["d"], 30).x - travel(["d"], 120).x)).toBeLessThan(0.5);
  });
  it("accelerates and decelerates instead of teleporting", () => {
    const start = stepWalk(initialWalk, ["a"], 16, 800, 450);
    expect(start.vx).toBeLessThan(0);
    expect(start.vx).toBeGreaterThan(-250);
    expect(start.facing).toBe("left");
    const coast = stepWalk(start, [], 16, 800, 450);
    expect(Math.abs(coast.vx)).toBeLessThan(Math.abs(start.vx));
  });
  it("stays in the safe aisle and does not leap after a suspended frame", () => {
    const edge = stepWalk({ ...initialWalk, x: 92, y: 89 }, ["d", "s"], 10000, 800, 450);
    expect(edge.x).toBe(92); expect(edge.y).toBe(89); expect(edge.vx).toBe(0); expect(edge.vy).toBe(0);
  });
  it("stops fully and does not double speed for keyboard aliases", () => {
    expect(travel(["d", "arrowright"]).x).toBe(travel(["d"]).x);
    let state = travel(["d"]);
    for (let i = 0; i < 30; i++) state = stepWalk(state, [], 16, 800, 450);
    expect(state.vx).toBe(0);
    expect(stepWalk(state, ["d"], 16, 0, 0)).toBe(state);
  });
});
