import fs from 'node:fs/promises';
import { fixture, PRESETS, validateFixture } from '../src/simulation/engine.mjs';
await fs.mkdir(new URL('../src/scenarios/', import.meta.url), { recursive: true });
for (const [name, ids] of Object.entries(PRESETS)) {
  const data = validateFixture(fixture(ids));
  await fs.writeFile(new URL(`../src/scenarios/${name}.json`, import.meta.url), JSON.stringify(data));
  console.log(`${name}: ${data.tensors.length} tensors; seed ${data.seed}`);
}
