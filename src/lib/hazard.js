// Merapi volcanic-hazard model: an anisotropic (directional) ellipse centred on
// the summit, elongated along the dominant eruption corridor (Kali Gendol,
// south-southeast — the main channel of the 2010 eruption). During an eruption the
// roads inside this zone are treated as effectively CLOSED, so they carry a very
// large extra cost and routes strongly avoid them. The closure is graded: maximum
// at the summit, decaying linearly to zero at the ellipse boundary — so the zone is
// not a hard wall (a route can still escape from inside), but crossing it is so
// costly that the search detours around it. Because the extra cost is always >= 0,
// the edge-cost multiplier stays >= 1 and the A* heuristic remains admissible.

import { M_PER_DEG } from './geo.js';

// Geometry of the hazard ellipse (independent of the activity level).
export const HAZARD = {
  bearing: 165,  // major-axis direction, degrees clockwise from north (Kali Gendol corridor)
  aspect: 0.6,   // minor/major ratio: hazard is narrower across the corridor than along it
  closure: 60,   // near-closure multiplier at the summit (decays to 0 at the boundary);
                 // large enough that routes detour rather than cross the closed zone
};

export const ERUPTION_LEVELS = [
  { id: 'waspada', label: 'Waspada (Level II)', radius: 3000 },
  { id: 'siaga',   label: 'Siaga (Level III)',  radius: 5000 },
  { id: 'awas',    label: 'Awas (Level IV)',    radius: 10000 },
];

function toLocalMeters(fromLat, fromLng, toLat, toLng) {
  const east = (toLng - fromLng) * M_PER_DEG * Math.cos((fromLat * Math.PI) / 180);
  const north = (toLat - fromLat) * M_PER_DEG;
  return [east, north];
}

// Extra cost multiplier for a point inside the closed hazard zone. `hazard` carries
// { lat, lng, bearing, aspect, radius, closure }.
export function hazardPenaltyAt(hazard, lat, lng) {
  const [east, north] = toLocalMeters(hazard.lat, hazard.lng, lat, lng);
  const b = (hazard.bearing * Math.PI) / 180;
  const along = east * Math.sin(b) + north * Math.cos(b);   // projection on major axis
  const across = -east * Math.cos(b) + north * Math.sin(b); // projection on minor axis
  const de = Math.hypot(along / hazard.radius, across / (hazard.radius * hazard.aspect));
  return hazard.closure * Math.max(0, 1 - de);
}

// Closed polygon (as [lat, lng] pairs) tracing the hazard ellipse, for rendering.
export function ellipsePath(hazard, steps = 72) {
  const { lat, lng, radius, aspect, bearing } = hazard;
  const b = (bearing * Math.PI) / 180;
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    const x = radius * Math.cos(a);           // along major axis
    const y = radius * aspect * Math.sin(a);  // along minor axis
    const east = x * Math.sin(b) - y * Math.cos(b);
    const north = x * Math.cos(b) + y * Math.sin(b);
    pts.push([lat + north / M_PER_DEG, lng + east / (M_PER_DEG * Math.cos((lat * Math.PI) / 180))]);
  }
  return pts;
}
