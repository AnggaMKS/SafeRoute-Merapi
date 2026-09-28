import { haversine } from './geo.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE = [0.45, 0.35, 0.25, 0.15]; // jalan raya lebih padat

export function generateDensity(g, seed, nHotspots = 8) {
  const rnd = mulberry32(seed);
  const hotspots = [];
  for (let i = 0; i < nHotspots; i++) {
    const n = Math.floor(rnd() * g.n);
    hotspots.push({ lat: g.lat[n], lng: g.lng[n], radius: 800 + rnd() * 1700, strength: 0.35 + rnd() * 0.4 });
  }
  const density = new Float32Array(g.m);
  for (let e = 0; e < g.m; e++) {
    const u = g.eu[e], v = g.ev[e];
    const mlat = (g.lat[u] + g.lat[v]) / 2, mlng = (g.lng[u] + g.lng[v]) / 2;
    let d = BASE[g.cls[e]] + (rnd() - 0.5) * 0.4;
    for (const h of hotspots) {
      const dist = haversine(mlat, mlng, h.lat, h.lng);
      if (dist < h.radius) d += h.strength * (1 - dist / h.radius);
    }
    density[e] = Math.min(1, Math.max(0, d));
  }
  return { density, hotspots };
}

// cost = length × (1 + α·density [+ hazard penalty]). pengali >= 1 menjaga A* heuristic admissible.
export function buildCosts(g, density, { alpha = 3, hazard = null, hazardPenalty = 4 } = {}) {
  const costs = new Float32Array(g.m);
  for (let e = 0; e < g.m; e++) {
    let mult = 1 + alpha * density[e];
    if (hazard) {
      const u = g.eu[e], v = g.ev[e];
      const d = haversine((g.lat[u] + g.lat[v]) / 2, (g.lng[u] + g.lng[v]) / 2, hazard.lat, hazard.lng);
      if (d < hazard.radius) mult += hazardPenalty;
    }
    costs[e] = g.len[e] * mult;
  }
  return costs;
}

export const densityColor = (d) => `hsl(${Math.round((1 - d) * 120)}, 85%, 45%)`;