// Small hand-rolled force simulation - no d3-force dependency. Runs a fixed
// number of iterations synchronously (not animated frame-by-frame) since
// note-link graphs here are small (a personal note-taking tool, not a
// social graph) and a settled layout in one pass is both simpler and
// cheaper than keeping a live physics loop running.

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
}

interface Point {
  x: number;
  y: number;
}

const ITERATIONS = 260;
const REPULSION = 2600;
const SPRING_LENGTH = 110;
const SPRING_STRENGTH = 0.02;
const CENTERING_STRENGTH = 0.01;
const DAMPING = 0.85;
const MAX_VELOCITY = 40;

// Deterministic pseudo-random so the same graph always lays out the same
// way between reloads (a plain Math.random() seed would reshuffle every
// render, which reads as "broken" for something the user expects to be
// stable while they're navigating it).
function seededRandom(seed: number): () => number {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function computeForceLayout(
  nodeIds: string[],
  edges: { sourceId: string; targetId: string }[],
  width: number,
  height: number,
): Map<string, Point> {
  const random = seededRandom(nodeIds.length * 7919 + edges.length * 104729 + 17);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2.5;

  const positions = new Map<string, Point>();
  const velocities = new Map<string, Point>();

  nodeIds.forEach((id, i) => {
    const angle = (i / Math.max(1, nodeIds.length)) * Math.PI * 2;
    const jitter = 0.6 + random() * 0.4;
    positions.set(id, {
      x: centerX + Math.cos(angle) * radius * jitter,
      y: centerY + Math.sin(angle) * radius * jitter,
    });
    velocities.set(id, { x: 0, y: 0 });
  });

  const edgePairs = edges
    .filter((e) => positions.has(e.sourceId) && positions.has(e.targetId))
    .map((e) => [e.sourceId, e.targetId] as const);

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Repulsion between every pair - O(n^2), fine for the expected node counts.
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const a = positions.get(nodeIds[i])!;
        const b = positions.get(nodeIds[j])!;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 1) {
          dx = random() - 0.5;
          dy = random() - 0.5;
          distSq = 1;
        }
        const force = REPULSION / distSq;
        const dist = Math.sqrt(distSq);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        const va = velocities.get(nodeIds[i])!;
        const vb = velocities.get(nodeIds[j])!;
        va.x += fx;
        va.y += fy;
        vb.x -= fx;
        vb.y -= fy;
      }
    }

    // Spring attraction along edges.
    for (const [sourceId, targetId] of edgePairs) {
      const a = positions.get(sourceId)!;
      const b = positions.get(targetId)!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const force = (dist - SPRING_LENGTH) * SPRING_STRENGTH;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      const va = velocities.get(sourceId)!;
      const vb = velocities.get(targetId)!;
      va.x += fx;
      va.y += fy;
      vb.x -= fx;
      vb.y -= fy;
    }

    // Gentle centering so the whole graph doesn't drift off-canvas.
    for (const id of nodeIds) {
      const p = positions.get(id)!;
      const v = velocities.get(id)!;
      v.x += (centerX - p.x) * CENTERING_STRENGTH;
      v.y += (centerY - p.y) * CENTERING_STRENGTH;
    }

    // Integrate + damp.
    for (const id of nodeIds) {
      const p = positions.get(id)!;
      const v = velocities.get(id)!;
      v.x = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, v.x * DAMPING));
      v.y = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, v.y * DAMPING));
      p.x += v.x;
      p.y += v.y;
    }
  }

  return positions;
}
