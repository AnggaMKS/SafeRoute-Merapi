import fs from 'node:fs';
import { haversine } from '../src/lib/geo.js';

const BBOX = { south: -7.76, west: 110.34, north: -7.52, east: 110.52 };
const HIGHWAYS = [
  'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street',
  'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link',
];
const CLASS = { motorway: 0, trunk: 0, primary: 0, motorway_link: 0, trunk_link: 0, primary_link: 0,
                secondary: 1, secondary_link: 1, tertiary: 2, tertiary_link: 2 }; // others = 3

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const UA = 'JalurAmanMerapi/1.0 (student project; contact: your-email@example.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOverpass(query) {
  for (let round = 1; round <= 4; round++) {
    for (const url of ENDPOINTS) {
      try {
        console.log('  →', url);
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': UA,
          },
          body: 'data=' + encodeURIComponent(query),
        });
        if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 150)}`);
        return await res.json();
      } catch (e) {
        console.warn('    failed:', e.message, e.cause ? `(${e.cause.code || e.cause.message})` : '');
      }
    }
    console.log(`  round ${round} failed, waiting ${round * 20}s...`);
    await sleep(round * 20000);
  }
  throw new Error('All Overpass endpoints failed after retries. Try again later.');
}

// Split BBOX into COLS x ROWS tiles; each tile is a small, cheap request.
const COLS = 3, ROWS = 3;
const hw = HIGHWAYS.join('|');
const tileQuery = (s, w, n, e) => `[out:json][timeout:120];
way["highway"~"^(${hw})$"](${s},${w},${n},${e});
out body;
>;
out skel qt;`;

fs.mkdirSync('scripts/cache', { recursive: true });
const merged = new Map();
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const dS = (BBOX.north - BBOX.south) / ROWS, dW = (BBOX.east - BBOX.west) / COLS;
    const s = +(BBOX.south + r * dS).toFixed(4), n = +(BBOX.south + (r + 1) * dS).toFixed(4);
    const w = +(BBOX.west + c * dW).toFixed(4), e = +(BBOX.west + (c + 1) * dW).toFixed(4);
    const file = `scripts/cache/tile-${r}-${c}.json`;
    let json;
    if (fs.existsSync(file)) {
      console.log(`tile ${r},${c}: cached`);
      json = JSON.parse(fs.readFileSync(file, 'utf8'));
    } else {
      console.log(`tile ${r},${c}: downloading`);
      json = await fetchOverpass(tileQuery(s, w, n, e));
      fs.writeFileSync(file, JSON.stringify(json));
      await sleep(3000);
    }
    for (const el of json.elements) merged.set(el.type + el.id, el);
  }
}
const data = { elements: [...merged.values()] };

//buat graoh e
const coords = new Map(), ways = [];
for (const el of data.elements) {
  if (el.type === 'node') coords.set(el.id, [el.lat, el.lon]);
  else if (el.type === 'way') ways.push(el);
}
console.log(`ways: ${ways.length}, nodes: ${coords.size}`);

// Undirected graph 
const idMap = new Map(), nodes = [];
const getId = (osm) => {
  let i = idMap.get(osm);
  if (i === undefined) { i = nodes.length; idMap.set(osm, i); nodes.push(coords.get(osm)); }
  return i;
};
const edges = [];
for (const w of ways) {
  const cls = CLASS[w.tags.highway] ?? 3;
  for (let i = 0; i < w.nodes.length - 1; i++) {
    const a = w.nodes[i], b = w.nodes[i + 1];
    if (!coords.has(a) || !coords.has(b)) continue;
    const [la, oa] = coords.get(a), [lb, ob] = coords.get(b);
    const len = Math.ceil(haversine(la, oa, lb, ob) * 10) / 10; // ceil keeps h admissible
    edges.push([getId(a), getId(b), len, cls]);
  }
}

// simpan hanya largest connected component
const n = nodes.length;
const adj = Array.from({ length: n }, () => []);
for (const [u, v] of edges) { adj[u].push(v); adj[v].push(u); }
const comp = new Int32Array(n).fill(-1);
let best = -1, bestSize = 0, c = 0;
for (let s = 0; s < n; s++) {
  if (comp[s] !== -1) continue;
  const stack = [s]; comp[s] = c; let size = 0;
  while (stack.length) {
    const x = stack.pop(); size++;
    for (const y of adj[x]) if (comp[y] === -1) { comp[y] = c; stack.push(y); }
  }
  if (size > bestSize) { bestSize = size; best = c; }
  c++;
}

const keep = new Int32Array(n).fill(-1);
let k = 0;
const lat = [], lng = [];
for (let i = 0; i < n; i++) {
  if (comp[i] === best) { keep[i] = k++; lat.push(+nodes[i][0].toFixed(5)); lng.push(+nodes[i][1].toFixed(5)); }
}
const eu = [], ev = [], el = [], ec = [];
for (const [u, v, len, cls] of edges) {
  if (keep[u] >= 0) { eu.push(keep[u]); ev.push(keep[v]); el.push(len); ec.push(cls); }
}

fs.mkdirSync('public/data', { recursive: true });
fs.writeFileSync('public/data/graph.json', JSON.stringify({ bbox: BBOX, lat, lng, eu, ev, el, ec }));
console.log(`saved: ${lat.length} nodes, ${eu.length} edges, ${(fs.statSync('public/data/graph.json').size / 1e6).toFixed(2)} MB`);