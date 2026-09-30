import { haversine, M_PER_DEG } from './geo.js';
import { hazardPenaltyAt } from './hazard.js';
import { SUMMIT } from '../data/shelters.js';
import { POPULATION_CENTERS } from '../data/population.js';

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

const BASE = [0.45, 0.35, 0.25, 0.15]; // main roads carry more traffic
const ESCAPE_BOOST = 0.25;             // extra load on roads aligned with the escape direction

function radialAlignment(g, u, v, mlat, mlng) {
  const k = Math.cos((mlat * Math.PI) / 180);
  const eEast = (g.lng[v] - g.lng[u]) * k * M_PER_DEG;
  const eNorth = (g.lat[v] - g.lat[u]) * M_PER_DEG;
  const eLen = Math.hypot(eEast, eNorth);
  const rEast = (mlng - SUMMIT.lng) * k * M_PER_DEG;
  const rNorth = (mlat - SUMMIT.lat) * M_PER_DEG;
  const rLen = Math.hypot(rEast, rNorth);
  if (eLen === 0 || rLen === 0) return 0;
  return Math.abs((eEast * rEast + eNorth * rNorth) / (eLen * rLen));
}

export function generateDensity(g, seed) {
  const rnd = mulberry32(seed);

  const hotspots = POPULATION_CENTERS.map((c) => ({
    lat: c.lat, lng: c.lng,
    radius: 600 + c.weight * 400,      // footprint grows with (relative) population
    strength: 0.30 + c.weight * 0.08,  // max extra density at the centre
  }));

  const density = new Float32Array(g.m);
  for (let e = 0; e < g.m; e++) {
    const u = g.eu[e], v = g.ev[e];
    const mlat = (g.lat[u] + g.lat[v]) / 2, mlng = (g.lng[u] + g.lng[v]) / 2;

    let d = BASE[g.cls[e]] + ESCAPE_BOOST * radialAlignment(g, u, v, mlat, mlng);

    for (const h of hotspots) {
      const dist = haversine(mlat, mlng, h.lat, h.lng);
      if (dist < h.radius) d += h.strength * (1 - dist / h.radius);
    }

    d += (rnd() - 0.5) * 0.3;

    density[e] = Math.min(1, Math.max(0, d));
  }
  return { density, hotspots };
}

// cost = length × (1 + α·density [+ hazard penalty]). pengali >= 1 menjaga A* heuristic admissible.
export function buildCosts(g, density, { alpha = 3, hazard = null } = {}) {
  const costs = new Float32Array(g.m);
  for (let e = 0; e < g.m; e++) {
    let mult = 1 + alpha * density[e];
    if (hazard) {
      const u = g.eu[e], v = g.ev[e];
      mult += hazardPenaltyAt(hazard, (g.lat[u] + g.lat[v]) / 2, (g.lng[u] + g.lng[v]) / 2);
    }
    costs[e] = g.len[e] * mult;
  }
  return costs;
}

export const densityColor = (d) => `hsl(${Math.round((1 - d) * 120)}, 85%, 45%)`;

export function routeCostBreakdown(g, edges, density, { alpha = 3, hazard = null } = {}) {
  let length = 0, densityTerm = 0, hazardTerm = 0, inZone = 0;
  for (const e of edges) {
    const L = g.len[e];
    length += L;
    densityTerm += alpha * L * density[e];
    if (hazard) {
      const u = g.eu[e], v = g.ev[e];
      const hp = hazardPenaltyAt(hazard, (g.lat[u] + g.lat[v]) / 2, (g.lng[u] + g.lng[v]) / 2);
      hazardTerm += L * hp;
      if (hp > 0) inZone++;
    }
  }
  return { length, densityTerm, hazardTerm, inZone, segments: edges.length, cost: length + densityTerm + hazardTerm };
}

export function explainRoute(g, route, density, { alpha = 3, hazard = null, goalNodes = [] } = {}) {
  const goals = goalNodes.map((n) => [g.lat[n], g.lng[n]]);
  const hAt = (n) => {
    let best = Infinity;
    for (const [la, lo] of goals) {
      const d = haversine(g.lat[n], g.lng[n], la, lo);
      if (d < best) best = d;
    }
    return best;
  };

  const segments = [];
  const nodes = [{ g: 0, h: hAt(route.path[0]) }];
  let acc = 0;
  for (let i = 0; i < route.edges.length; i++) {
    const e = route.edges[i];
    const L = g.len[e];
    const k = density[e];
    let closure = 0;
    if (hazard) {
      const u = g.eu[e], v = g.ev[e];
      closure = hazardPenaltyAt(hazard, (g.lat[u] + g.lat[v]) / 2, (g.lng[u] + g.lng[v]) / 2);
    }
    const cost = L * (1 + alpha * k + closure);
    segments.push({ L, k, closure, cost });
    acc += cost;
    nodes.push({ g: acc, h: hAt(route.path[i + 1]) });
  }
  return { segments, nodes, total: acc };
}