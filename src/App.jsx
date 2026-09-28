import { useEffect, useMemo, useState } from 'react';
import MapView from './components/MapView.jsx';
import Panel from './components/Panel.jsx';
import { SHELTERS, SUMMIT } from './data/shelters.js';
import { createGraph, nearestNode } from './lib/graph.js';
import { generateDensity, buildCosts } from './lib/density.js';
import { search } from './lib/search.js';
import { haversine } from './lib/geo.js';

export default function App() {
  const [graph, setGraph] = useState(null);
  const [error, setError] = useState(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [alpha, setAlpha] = useState(3);
  const [eruption, setEruption] = useState(false);
  const [hazardKm, setHazardKm] = useState(5);
  const [algo, setAlgo] = useState('astar');
  const [start, setStart] = useState(null);
  const [showDensity, setShowDensity] = useState(true);
  const [showExplored, setShowExplored] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/graph.json`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status} (jalankan: npm run graph)`); return r.json(); })
      .then((raw) => setGraph(createGraph(raw)))
      .catch((e) => setError(e.message));
  }, []);

  const traffic = useMemo(() => (graph ? generateDensity(graph, seed) : null), [graph, seed]);
  const hazard = useMemo(
    () => (eruption ? { lat: SUMMIT.lat, lng: SUMMIT.lng, radius: hazardKm * 1000 } : null),
    [eruption, hazardKm]
  );
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
      <Panel
        {...{ algo, setAlgo, alpha, setAlpha, eruption, setEruption, hazardKm, setHazardKm,
              showDensity, setShowDensity, showExplored, setShowExplored, results, snapMeters }}
        hasStart={!!start}
        onRandomize={() => setSeed(Math.floor(Math.random() * 1e9))}
      />
    </div>
  );
}