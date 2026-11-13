import test from "node:test";
import assert from "node:assert/strict";
import {
  UNSURE,
  allTasks,
  findMission,
  isLevel,
  levelOrder,
  levels,
  missions,
  nextLevel,
  nextQuestion,
  postNotes,
  questions,
  recommendLevel,
} from "../src/content/paths.ts";
import { lessons } from "../src/content/investigation.ts";

const right = (id) =>
  questions
    .find((q) => q.id === id)
    .options.findIndex((option) => option.correct);
const unsure = (id) =>
  questions
    .find((q) => q.id === id)
    .options.findIndex((option) => option.label === UNSURE);

test("every question has one correct option and an honest way out", () => {
  for (const q of questions) {
    assert.equal(q.options.filter((o) => o.correct).length, 1, q.id);
    assert.ok(unsure(q.id) >= 0, q.id);
  }
  const positions = questions.map((q) => right(q.id));
  assert.ok(new Set(positions).size > 1, "correct answer never moves");
});
test("a non-technical visitor stops after two questions", () => {
  const answers = { kode: unsure("kode"), sistem: unsure("sistem") };
  assert.equal(nextQuestion(answers), null);
  assert.equal(recommendLevel(answers), "pemula");
});
test("one correct software answer is enough to reach the ML question", () => {
  const answers = { kode: unsure("kode"), sistem: right("sistem") };
  assert.equal(nextQuestion(answers).id, "ml");
});
test("the Transformer question only follows a correct ML answer", () => {
  const base = { kode: right("kode"), sistem: right("sistem") };
  const missed = { ...base, ml: unsure("ml") };
  assert.equal(nextQuestion(missed), null);
  assert.equal(recommendLevel(missed), "menengah");
  assert.equal(nextQuestion({ ...base, ml: right("ml") }).id, "transformer");
});
test("Mahir needs both the ML and the Transformer answer", () => {
  const base = {
    kode: right("kode"),
    sistem: right("sistem"),
    ml: right("ml"),
  };
  assert.equal(
    recommendLevel({ ...base, transformer: unsure("transformer") }),
    "menengah",
  );
  assert.equal(
    recommendLevel({ ...base, transformer: right("transformer") }),
    "mahir",
  );
});
test("task ids are unique across levels, so progress cannot collide", () => {
  const ids = levelOrder.flatMap((level) =>
    allTasks(level).map((task) => task.id),
  );
  assert.equal(new Set(ids).size, ids.length);
});
test("missions are well formed and every checklist item can be completed", () => {
  for (const level of levelOrder)
    for (const mission of missions[level]) {
      assert.ok(mission.lab || mission.posts, mission.id);
      assert.ok(mission.tasks.length > 0, mission.id);
      assert.ok(mission.goal && mission.wrap, mission.id);
      for (const task of mission.tasks) {
        assert.ok(task.guide.length > 20, task.id);
        if (task.post !== undefined)
          assert.ok(mission.posts?.includes(task.post), task.id);
        else assert.ok(mission.lab, task.id);
      }
      for (const post of mission.posts ?? [])
        assert.ok(
          mission.tasks.some((t) => t.post === post),
          `${mission.id}/${post}`,
        );
    }
});
test("the level cards state the real mission counts", () => {
  for (const level of levelOrder)
    assert.match(
      levels[level].duration,
      new RegExp(`^${missions[level].length} misi`),
    );
});
test("Pemula never leans on the investigation or on unexplained jargon", () => {
  for (const mission of missions.pemula) {
    assert.equal(mission.posts, undefined, mission.id);
    const copy = [
      mission.title,
      mission.goal,
      mission.wrap,
      ...mission.tasks.flatMap((t) => [t.label, t.guide]),
    ].join(" ");
    assert.doesNotMatch(
      copy,
      /logits?|embedding|attention|gradien|softmax|vektor|parameter|transformer/i,
      mission.id,
    );
  }
});
test("Menengah covers every post from tokenizer to transfer", () => {
  const posts = missions.menengah.flatMap((m) => m.posts ?? []);
  assert.deepEqual(posts, lessons.map((_, i) => i).slice(1));
});
test("every post a guided level opens has its own note", () => {
  for (const level of ["menengah", "mahir"])
    for (const mission of missions[level])
      for (const post of mission.posts ?? [])
        assert.ok(postNotes[level][post], `${level} post ${post}`);
});
test("level helpers reject unknown input and walk upward", () => {
  assert.equal(isLevel("salah"), false);
  assert.equal(isLevel(null), false);
  assert.equal(findMission("pemula", "tidak-ada"), null);
  assert.equal(nextLevel("pemula"), "menengah");
  assert.equal(nextLevel("mahir"), null);
});
