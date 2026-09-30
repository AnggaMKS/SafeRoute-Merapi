import { useEffect, useMemo, useState } from 'react';
import MapView from './components/MapView.jsx';
import Panel from './components/Panel.jsx';
import { SHELTERS, SUMMIT } from './data/shelters.js';
import { createGraph, nearestNode } from './lib/graph.js';
import { generateDensity, buildCosts, routeCostBreakdown, explainRoute } from './lib/density.js';
import { ERUPTION_LEVELS, HAZARD } from './lib/hazard.js';
import { search } from './lib/search.js';
import { haversine } from './lib/geo.js';

export default function App() {
  const [graph, setGraph] = useState(null);
  const [error, setError] = useState(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [alpha, setAlpha] = useState(3);
  const [eruption, setEruption] = useState(false);
  const [levelId, setLevelId] = useState('siaga');
  const [algo, setAlgo] = useState('astar');
  const [start, setStart] = useState(null);
  const [showDensity, setShowDensity] = useState(true);
  const [showExplored, setShowExplored] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/graph.json`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status} (jalankan: npm run graph)`); return r.json(); })
      .then((raw) => setGraph(createGraph(raw)))
      .catch((e) => setError(e.message));
  }, []);

  const traffic = useMemo(() => (graph ? generateDensity(graph, seed) : null), [graph, seed]);
  const hazard = useMemo(() => {
    if (!eruption) return null;
    const level = ERUPTION_LEVELS.find((l) => l.id === levelId);
    return { lat: SUMMIT.lat, lng: SUMMIT.lng, ...HAZARD, radius: level.radius };
  }, [eruption, levelId]);
  const costs = useMemo(
    () => (graph && traffic ? buildCosts(graph, traffic.density, { alpha, hazard }) : null),
    [graph, traffic, alpha, hazard]
  );
  const shelterNodes = useMemo(
    () => (graph ? SHELTERS.map((s) => nearestNode(graph, s.lat, s.lng)) : []),
    [graph]
  );
  const startNode = useMemo(
    () => (graph && start ? nearestNode(graph, start.lat, start.lng) : null),
    [graph, start]
  );
  const snapMeters = startNode != null
    ? haversine(start.lat, start.lng, graph.lat[startNode], graph.lng[startNode]) : null;

  const results = useMemo(() => {
    if (startNode == null || !costs) return null;
    const d = traffic.density;
    return {
      ucs: search(graph, costs, d, startNode, shelterNodes, 'ucs'),
      astar: search(graph, costs, d, startNode, shelterNodes, 'astar'),
    };
  }, [graph, costs, traffic, startNode, shelterNodes]);

  // Route without the eruption, computed only while the simulation is on, so the
  // panel can show how the closed hazard zone changes the route.
  const baseline = useMemo(() => {
    if (!eruption || !graph || !traffic || startNode == null) return null;
    const normalCosts = buildCosts(graph, traffic.density, { alpha });
    return search(graph, normalCosts, traffic.density, startNode, shelterNodes, 'astar');
  }, [eruption, graph, traffic, alpha, startNode, shelterNodes]);

  const breakdowns = useMemo(() => {
    if (!results) return null;
    const out = {};
    for (const k of ['astar', 'ucs']) {
      const r = results[k];
      out[k] = r?.found ? routeCostBreakdown(graph, r.edges, traffic.density, { alpha, hazard }) : null;
    }
    return out;
  }, [results, graph, traffic, alpha, hazard]);

  const worked = useMemo(() => {
    const r = results?.[algo];
    if (!r?.found) return null;
    return explainRoute(graph, r, traffic.density, { alpha, hazard, goalNodes: shelterNodes });
  }, [results, algo, graph, traffic, alpha, hazard, shelterNodes]);

  if (error) return <div className="msg">Gagal memuat graf: {error}</div>;
  if (!graph) return <div className="msg">Memuat jaringan jalan…</div>;

  const active = results?.[algo];
  return (
    <div className="app">
      <MapView
        graph={graph} density={traffic.density} hotspots={traffic.hotspots}
        start={start} route={active?.found ? active : null} order={showExplored ? active?.order : null}
        hazard={hazard} showDensity={showDensity}
        targetIndex={active?.found ? active.shelterIndex : -1}
        onPick={setStart}
      />
      {panelOpen ? (
        <Panel
          {...{ algo, setAlgo, alpha, setAlpha, eruption, setEruption, levelId, setLevelId,
                showDensity, setShowDensity, showExplored, setShowExplored, results, snapMeters, baseline, breakdowns, worked }}
          hasStart={!!start}
          onRandomize={() => setSeed(Math.floor(Math.random() * 1e9))}
          onClose={() => setPanelOpen(false)}
        />
      ) : (
        <button className="panel-fab" onClick={() => setPanelOpen(true)} aria-label="Buka panel" title="Buka panel">☰</button>
      )}
    </div>
  );
}