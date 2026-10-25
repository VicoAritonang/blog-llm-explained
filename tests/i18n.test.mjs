import test from "node:test";
import assert from "node:assert/strict";
import english from "../src/i18n/en.mjs";
import { translate, languagePath } from "../src/i18n/core.mjs";
test("English translations retain every dynamic placeholder", () => {
  const placeholders = (value) =>
    [...value.matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort();
  for (const [key, value] of Object.entries(english)) {
    assert.deepEqual(placeholders(value), placeholders(key), key);
    assert.ok(!value.includes("\u2014"), key);
  }
});
test("translations preserve the Indonesian source and machine identifiers", () => {
  assert.equal(translate("Peta fasilitas", "en"), "Facility map");
  assert.equal(translate("Peta fasilitas", "id"), "Peta fasilitas");
  assert.equal(translate("cache", "en"), "cache");
  assert.equal(
    translate("Pergi ke {0}", "en", "Attention"),
    "Travel to Attention",
  );
  assert.equal(languagePath("en", "#station=cache"), "/en/#station=cache");
});
