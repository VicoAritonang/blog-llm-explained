import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { batchInstrument } from "../src/scene/batch-instrument.mjs";
const names = [
  "tokenizer-bench",
  "embedding-projector",
  "qkv-projector",
  "attention-workbench",
  "transformer-stack",
  "logits-amphitheater",
  "kv-cache-rack",
];
for (const name of names)
  test(`batching ${name} preserves every non-demo triangle`, async () => {
    const buffer = await fs.readFile(
      new URL(`../public/assets/lab-v1/${name}.glb`, import.meta.url),
    );
    const { scene } = await new GLTFLoader().parseAsync(
      buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ),
      "",
    );
    let expected = 0,
      originalMeshes = 0;
    const materialNames = new Set();
    scene.traverse((node) => {
      if (!node.isMesh) return;
      let excluded = false;
      for (let p = node; p; p = p.parent)
        if (
          p.name.startsWith("demo_") ||
          (name === "kv-cache-rack" && p.name.startsWith("slot_"))
        )
          excluded = true;
      if (excluded) return;
      expected +=
        (node.geometry.index?.count ??
          node.geometry.getAttribute("position").count) / 3;
      originalMeshes++;
      materialNames.add(node.material.name);
    });
    const batched = batchInstrument(scene, name);
    let actual = 0;
    batched.traverse((node) => {
      if (!node.isMesh) return;
      actual += node.geometry.getAttribute("position").count / 3;
      assert.ok(
        Array.from(node.geometry.getAttribute("position").array).every(
          Number.isFinite,
        ),
      );
    });
    assert.equal(actual, expected);
    assert.equal(batched.children.length, materialNames.size);
    assert.ok(batched.children.length < originalMeshes);
    assert.ok(actual > 100);
    batched.traverse((node) => {
      if (node.isMesh) node.geometry.dispose();
    });
  });
