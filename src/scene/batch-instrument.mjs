import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** Cache owns materials; this group owns only its cloned/merged geometry. */
export function batchInstrument(scene, modelName) {
  const source = scene.clone(true);
  source.updateMatrixWorld(true);
  const buckets = new Map();
  source.traverse((node) => {
    if (!node.isMesh) return;
    for (let parent = node; parent; parent = parent.parent) {
      if (
        !parent.visible ||
        parent.name.startsWith("demo_") ||
        (modelName === "kv-cache-rack" && parent.name.startsWith("slot_"))
      )
        return;
    }
    const material = Array.isArray(node.material)
      ? node.material[0]
      : node.material;
    const copy = node.geometry.clone().applyMatrix4(node.matrixWorld);
    // RoundedBoxGeometry is non-indexed; ordinary boxes/cylinders are indexed.
    // All geometries in one merge must have the same indexing convention.
    const geometry = copy.index ? copy.toNonIndexed() : copy;
    if (geometry !== copy) copy.dispose();
    buckets.set(material, [...(buckets.get(material) ?? []), geometry]);
  });
  const group = new T.Group();
  for (const [material, parts] of buckets) {
    const merged = mergeGeometries(parts);
    parts.forEach((part) => part.dispose());
    if (!merged) {
      group.traverse((node) => {
        if (node.isMesh) node.geometry.dispose();
      });
      throw new Error(
        `Tidak dapat menggabungkan material ${material.name} pada ${modelName}`,
      );
    }
    const mesh = new T.Mesh(merged, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
