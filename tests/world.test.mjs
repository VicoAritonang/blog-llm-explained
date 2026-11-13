import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  SPAWN,
  approachTiles,
  beltTokens,
  bookObjects,
  buildFloor,
  buildSolids,
  findPath,
  gates,
  interactables,
  key,
  objects,
  questObjects,
  zones,
} from "../src/world/map.ts";
import { books } from "../src/world/books.ts";
import { exams } from "../src/world/exams.ts";
import { missions } from "../src/content/paths.ts";

const floor = buildFloor();
const solids = buildSolids();
const walkable = (open) => (x, y) => {
  if (!floor[y]?.[x] || solids.has(key(x, y))) return false;
  const gate = gates.find((g) => g.x === x && g.ys.includes(y));
  return gate ? open.includes(gate.id) : true;
};
const start = { x: Math.floor(SPAWN.x), y: Math.floor(SPAWN.y) };
const reachable = (o, open) =>
  findPath(walkable(open), start, approachTiles(o)) !== null;

test("every mission has exactly one machine in its level's zone", () => {
  for (const [level, list] of Object.entries(missions))
    for (const m of list) {
      const machines = questObjects.filter(
        (q) => q.level === level && q.mission === m.id,
      );
      assert.equal(machines.length, 1, `${level}/${m.id}`);
      assert.equal(zones[machines[0].zone].level, level);
    }
  assert.equal(
    questObjects.length,
    Object.values(missions).reduce((n, l) => n + l.length, 0),
  );
});

test("objects sit on floor, inside their zone, without overlapping", () => {
  const seen = new Map();
  for (const o of objects) {
    const w = o.kind === "decor" ? (o.w ?? 1) : 1,
      h = o.kind === "decor" ? (o.h ?? 1) : 1;
    const z = zones[o.zone];
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++) {
        const x = o.x + dx,
          y = o.y + dy;
        assert.ok(floor[y][x], `${o.id} on a wall at ${x},${y}`);
        assert.ok(x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1, `${o.id} outside zone`);
        assert.ok(!seen.has(key(x, y)), `${o.id} overlaps ${seen.get(key(x, y))}`);
        seen.set(key(x, y), o.id);
      }
  }
  assert.ok(!solids.has(key(start.x, start.y)), "spawn is blocked");
});

test("gates lock zones: closed gates keep later zones out of reach", () => {
  for (const o of interactables) {
    assert.ok(reachable(o, [0, 1, 2]), `${o.id} unreachable with gates open`);
    assert.equal(reachable(o, []), o.zone === 0, `${o.id} with gates closed`);
    assert.equal(reachable(o, [0]), o.zone <= 1, `${o.id} with gate 0 open`);
  }
});

test("each zone gets a guide, a skip exam (except the hall) and books", () => {
  for (const z of zones) {
    assert.ok(interactables.some((o) => o.kind === "npc" && o.zone === z.id));
    assert.ok(bookObjects.some((o) => o.zone === z.id), `${z.name} has books`);
    if (z.id < 3)
      assert.ok(interactables.some((o) => o.kind === "exam" && o.gate === z.id));
  }
});

test("books and exams are well formed", () => {
  for (const b of bookObjects) assert.ok(books[b.book], b.book);
  assert.equal(new Set(bookObjects.map((b) => b.book)).size, bookObjects.length);
  assert.equal(Object.keys(books).length, bookObjects.length, "every book is placed");
  const quizzes = Object.values(books)
    .map((b) => b.quiz)
    .filter(Boolean);
  for (const [id, book] of Object.entries(books)) {
    assert.ok(book.pages.length >= 2, `${id} has pages`);
    for (const page of book.pages) assert.ok(page.body.length > 0, `${id}: ${page.heading}`);
  }
  assert.equal(exams.length, gates.length);
  for (const q of [...quizzes, ...exams.flat()]) {
    assert.ok(q.answer >= 0 && q.answer < q.options.length, q.q);
    assert.equal(new Set(q.options).size, q.options.length, q.q);
  }
});

test("tokens on the factory belt are the checkpoint's own ids", () => {
  const model = JSON.parse(
    fs.readFileSync(new URL("../src/simulation/story/checkpoint.json", import.meta.url)),
  );
  for (const [text, id] of beltTokens) assert.equal(model.vocab[id], text);
});
