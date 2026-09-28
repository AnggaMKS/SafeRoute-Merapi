import fs from 'node:fs';
import { createGraph, nearestNode } from '../src/lib/graph.js';
import { generateDensity, buildCosts, mulberry32 } from '../src/lib/density.js';
import { search } from '../src/lib/search.js';
import { haversine } from '../src/lib/geo.js';
import { SHELTERS, SUMMIT } from '../src/data/shelters.js';

const g = createGraph(JSON.parse(fs.readFileSync('public/data/graph.json', 'utf8')));
const goals = SHELTERS.map((s) => nearestNode(g, s.lat, s.lng));
const { density } = generateDensity(g, 42);
const costs = buildCosts(g, density, { alpha: 3 });

const RUNS = 200, rnd = mulberry32(7);
const acc = { ucs: { exp: 0, ms: 0 }, astar: { exp: 0, ms: 0 } };
let mismatch = 0, done = 0;
while (done < RUNS) {
  const s = Math.floor(rnd() * g.n);
  if (haversine(g.lat[s], g.lng[s], SUMMIT.lat, SUMMIT.lng) > 12000) continue; // near the volcano only
  const a = search(g, costs, density, s, goals, 'ucs');
  const b = search(g, costs, density, s, goals, 'astar');
  if (Math.abs(a.cost - b.cost) > 1) mismatch++;
  acc.ucs.exp += a.expanded; acc.ucs.ms += a.ms;
  acc.astar.exp += b.expanded; acc.astar.ms += b.ms;
  done++;
}
for (const k of ['ucs', 'astar'])
  console.log(k.padEnd(6), 'avg expanded:', Math.round(acc[k].exp / RUNS), '| avg ms:', (acc[k].ms / RUNS).toFixed(2));
console.log('cost mismatches (should be 0):', mismatch);