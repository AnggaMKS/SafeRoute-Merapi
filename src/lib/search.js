import { MinHeap } from './heap.js';
import { haversine } from './geo.js';

const SPEED = [50, 40, 30, 25].map((k) => k / 3.6); // m/s free-flow by road class

// algo: 'ucs' (h = 0) or 'astar' (h = haversine to nearest shelter)
export function search(g, costs, density, start, goalNodes, algo = 'astar') {
  const t0 = performance.now();

  const goalIndex = new Map();
  goalNodes.forEach((n, i) => { if (!goalIndex.has(n)) goalIndex.set(n, i); });
  const goals = [...goalIndex.keys()].map((n) => [g.lat[n], g.lng[n]]);

  const hCache = new Float64Array(g.n).fill(-1);
  const h = (n) => {
    if (algo !== 'astar') return 0;
    if (hCache[n] >= 0) return hCache[n];
    let best = Infinity;
    for (const [la, lo] of goals) {
      const d = haversine(g.lat[n], g.lng[n], la, lo);
      if (d < best) best = d;
    }
    return (hCache[n] = best);
  };

  const dist = new Float64Array(g.n).fill(Infinity);
  const prev = new Int32Array(g.n).fill(-1);
  const prevEdge = new Int32Array(g.n).fill(-1);
  const closed = new Uint8Array(g.n);
  const order = [];
  const heap = new MinHeap();

  dist[start] = 0;
  heap.push(h(start), start);
  let goal = -1;

  while (heap.size) {
    const u = heap.pop();
    if (closed[u]) continue;          // lazy deletion
    closed[u] = 1; order.push(u);
    if (goalIndex.has(u)) { goal = u; break; }

    for (let i = g.off[u]; i < g.off[u + 1]; i++) {
      const v = g.to[i];
      if (closed[v]) continue;
      const nd = dist[u] + costs[g.eid[i]];
      if (nd < dist[v]) {
        dist[v] = nd; prev[v] = u; prevEdge[v] = g.eid[i];
        heap.push(nd + h(v), v);
      }
    }
  }

  const ms = performance.now() - t0;
  if (goal < 0) return { algo, found: false, expanded: order.length, ms, order };

  const path = [], edges = [];
  for (let n = goal; n !== -1; n = prev[n]) {
    path.push(n);
    if (prevEdge[n] !== -1) edges.push(prevEdge[n]);
  }
  path.reverse(); edges.reverse();

  let distance = 0, eta = 0;
  for (const e of edges) {
    distance += g.len[e];
    eta += g.len[e] / (SPEED[g.cls[e]] * (1 - 0.75 * density[e]));
  }
  return {
    algo, found: true, goal, shelterIndex: goalIndex.get(goal),
    path, edges, cost: dist[goal], distance, eta,
    expanded: order.length, ms, order,
  };
}