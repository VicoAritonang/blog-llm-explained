// The walker's state lives outside React so movement never re-renders the tree.
import * as THREE from "three";
import { SPAWN } from "./world";

export const player = {
  pos: new THREE.Vector3(SPAWN[0], 0, SPAWN[1]),
  target: null as THREE.Vector3 | null,
  keys: new Set<string>(),
  heading: Math.PI,
  speed: 0,
  /** First-person look: yaw about y (0 looks towards -z) and pitch. */
  yaw: 0,
  pitch: -0.08,
  /** Height above the ground and vertical speed, for jumping. */
  y: 0,
  vy: 0,
};
