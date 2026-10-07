export interface WalkState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: "left" | "right";
}

export const initialWalk: WalkState = { x: 50, y: 76, vx: 0, vy: 0, facing: "right" };

/** Pixel-space velocity keeps diagonal and vertical walking natural on wide rooms. */
export function stepWalk(state: WalkState, keys: Iterable<string>, elapsed: number, width: number, height: number): WalkState {
  if (width <= 0 || height <= 0) return state;
  const dt = Math.max(0, Math.min(0.05, elapsed / 1000));
  const pressed = new Set(keys);
  const dx = Number(pressed.has("arrowright") || pressed.has("d")) - Number(pressed.has("arrowleft") || pressed.has("a"));
  const dy = Number(pressed.has("arrowdown") || pressed.has("s")) - Number(pressed.has("arrowup") || pressed.has("w"));
  const length = Math.hypot(dx, dy);
  const speed = Math.max(145, Math.min(250, width * 0.32));
  const smoothing = 1 - Math.exp(-dt / (length ? 0.055 : 0.045));
  let vx = state.vx + ((length ? dx / length * speed : 0) - state.vx) * smoothing;
  let vy = state.vy + ((length ? dy / length * speed : 0) - state.vy) * smoothing;
  if (!length && Math.hypot(vx, vy) < 2) vx = vy = 0;
  const x = Math.max(8, Math.min(92, state.x + vx * dt / width * 100));
  const y = Math.max(45, Math.min(89, state.y + vy * dt / height * 100));
  if (x === 8 && vx < 0 || x === 92 && vx > 0) vx = 0;
  if (y === 45 && vy < 0 || y === 89 && vy > 0) vy = 0;
  return { x, y, vx, vy, facing: dx ? (dx < 0 ? "left" : "right") : state.facing };
}
