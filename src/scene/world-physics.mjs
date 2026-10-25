/** Resolve a horizontal move against the lab boundary and circular plinths.
 * Axis separation allows sliding instead of getting stuck on an obstacle. */
export function moveInLab(x, z, dx, dz, obstacles) {
  const allowed = (px, pz) =>
    obstacles.every(([ox, oz]) => Math.hypot(px - ox, pz - oz) >= 2.65);
  const targetX = Math.max(-18.8, Math.min(18.8, x + dx));
  if (allowed(targetX, z)) x = targetX;
  const targetZ = Math.max(-11.8, Math.min(12.8, z + dz));
  if (allowed(x, targetZ)) z = targetZ;
  return [x, z];
}
