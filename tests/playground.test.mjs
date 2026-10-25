import test from "node:test";
import assert from "node:assert/strict";
import {
  missions,
  evaluateTrial,
  candidateFixtures,
} from "../src/simulation/playground.mjs";

test("each mission requires both the target configuration and the causal prediction", () => {
  const expected = {
    pieces: [1, 0],
    positions: [1, 1],
    causal: [1, 0],
    residual: [1, 1],
    temperature: [2, 0],
    memory: [1, 1],
  };
  for (const [id, [setting, answer]] of Object.entries(expected)) {
    assert.equal(evaluateTrial(id, setting, answer).passed, true, id);
    assert.equal(
      evaluateTrial(id, 0, answer).passed,
      false,
      `${id}: default condition is not solved`,
    );
    assert.equal(
      evaluateTrial(id, setting, 1 - answer).passed,
      false,
      `${id}: wrong reasoning`,
    );
    assert.equal(
      evaluateTrial(id, setting, null).passed,
      false,
      `${id}: no prediction`,
    );
  }
});
test("invalid trials never unlock a discovery", () => {
  for (const trial of [
    ["unknown", 1, 0],
    ["causal", NaN, 0],
    ["causal", -1, 0],
    ["causal", 2, 0],
    ["causal", 1, 7],
  ])
    assert.equal(evaluateTrial(...trial).passed, false);
});
test("sampling fixtures conserve probability mass and become less concentrated", () => {
  for (const row of candidateFixtures)
    assert.ok(Math.abs(row.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.ok(
    candidateFixtures[0][0] > candidateFixtures[1][0] &&
      candidateFixtures[1][0] > candidateFixtures[2][0],
  );
  assert.equal(new Set(missions.map((m) => m.id)).size, 6);
});
