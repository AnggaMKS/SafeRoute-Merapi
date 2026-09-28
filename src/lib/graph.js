export function createGraph(raw) {
  const n = raw.lat.length, m = raw.eu.length;
  const off = new Uint32Array(n + 1);
  for (let e = 0; e < m; e++) { off[raw.eu[e] + 1]++; off[raw.ev[e] + 1]++; }
  for (let i = 0; i < n; i++) off[i + 1] += off[i];

  const cur = off.slice(0, n);
  const to = new Uint32Array(2 * m), eid = new Uint32Array(2 * m);
  for (let e = 0; e < m; e++) {
    const u = raw.eu[e], v = raw.ev[e];
    to[cur[u]] = v; eid[cur[u]++] = e;
    to[cur[v]] = u; eid[cur[v]++] = e;
  }
  return {
    n, m, off, to, eid,
    lat: Float64Array.from(raw.lat), lng: Float64Array.from(raw.lng),
    eu: Uint32Array.from(raw.eu), ev: Uint32Array.from(raw.ev),
    len: Float32Array.from(raw.el), cls: Uint8Array.from(raw.ec),
  };
}

export function nearestNode(g, lat, lng) {
  const k = Math.cos((lat * Math.PI) / 180);
  let best = -1, bd = Infinity;
  for (let i = 0; i < g.n; i++) {
    const dy = g.lat[i] - lat, dx = (g.lng[i] - lng) * k;
    const d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}