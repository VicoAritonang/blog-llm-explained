import test from "node:test";
import assert from "node:assert/strict";
import { moveInLab } from "../src/scene/world-physics.mjs";

test("player remains inside the laboratory boundary", () => {
  assert.deepEqual(moveInLab(18.7, 12.7, 0.2, 0.2, []), [18.8, 12.8]);
  assert.deepEqual(moveInLab(-18.7, -11.7, -0.2, -0.2, []), [-18.8, -11.8]);
});
test("walking toward an instrument cannot enter its plinth", () => {
  let position = [0, 5];
  for (let i = 0; i < 100; i++)
    position = moveInLab(...position, 0, -0.17, [[0, 0]]);
  assert.ok(Math.hypot(...position) >= 2.65);
  assert.ok(position[1] < 2.85);
});
test("a blocked player can slide sideways past an instrument", () => {
  const [x, z] = moveInLab(0, 2.7, 0.1, -0.2, [[0, 0]]);
  assert.equal(x, 0.1);
  assert.equal(z, 2.7);
});
