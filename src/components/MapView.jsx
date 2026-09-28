import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, CircleMarker, Circle, Polyline, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import { SHELTERS, SUMMIT } from '../data/shelters.js';
import { densityColor } from '../lib/density.js';

function ClickHandler({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng) });
  return null;
}

// Road density hanya untuk jalan raya
function DensityLayer({ graph, density }) {
  const map = useMap();
  useEffect(() => {
    const renderer = L.canvas({ padding: 0.5 });
    const group = L.layerGroup();
    for (let e = 0; e < graph.m; e++) {
      if (graph.cls[e] > 2) continue;
      const u = graph.eu[e], v = graph.ev[e];
      L.polyline([[graph.lat[u], graph.lng[u]], [graph.lat[v], graph.lng[v]]], {
        renderer, color: densityColor(density[e]), weight: 3, opacity: 0.7, interactive: false,
      }).addTo(group);
    }
    group.addTo(map);
    return () => { group.remove(); };
  }, [map, graph, density]);
  return null;
}

// Nodes expanded by the selected algorithm (UCS = big disc, A* = narrow cone)
function ExploredLayer({ graph, order }) {
  const map = useMap();
  useEffect(() => {
    if (!order?.length) return;
    const renderer = L.canvas({ padding: 0.5 });
    const group = L.layerGroup();
    const step = Math.ceil(order.length / 12000);
    for (let i = 0; i < order.length; i += step) {
      const n = order[i];
      L.circleMarker([graph.lat[n], graph.lng[n]], {
        renderer, radius: 2, stroke: false, fillColor: '#6366f1', fillOpacity: 0.55, interactive: false,
      }).addTo(group);
    }
    group.addTo(map);
    return () => { group.remove(); };
  }, [map, graph, order]);
  return null;
}

function Route({ graph, density, route }) {
  const pts = route.path.map((n) => [graph.lat[n], graph.lng[n]]);
  return (
    <>
      <Polyline positions={pts} pathOptions={{ color: '#0f172a', weight: 9, opacity: 0.85 }} />
      {route.edges.map((e) => {
        const u = graph.eu[e], v = graph.ev[e];
        return (
          <Polyline key={e}
            positions={[[graph.lat[u], graph.lng[u]], [graph.lat[v], graph.lng[v]]]}
            pathOptions={{ color: densityColor(density[e]), weight: 5 }} />
        );
      })}
    </>
  );
}

export default function MapView({ graph, density, hotspots, start, route, order, hazard, showDensity, targetIndex, onPick }) {
  return (
    <MapContainer center={[-7.66, 110.44]} zoom={12} minZoom={10} zoomControl={false} preferCanvas
      maxBounds={[[-7.85, 110.2], [-7.45, 110.65]]} className="map">
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors" maxZoom={19} />
      <ZoomControl position="bottomright" />
      <ClickHandler onPick={onPick} />

      {showDensity && <DensityLayer graph={graph} density={density} />}
      {showDensity && hotspots.map((h, i) => (
        <Circle key={i} center={[h.lat, h.lng]} radius={h.radius} interactive={false}
          pathOptions={{ color: '#f97316', weight: 1, fillOpacity: 0.1 }} />
      ))}
      {order && <ExploredLayer graph={graph} order={order} />}

      {hazard && <Circle center={[SUMMIT.lat, SUMMIT.lng]} radius={hazard.radius} interactive={false}
        pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.15, dashArray: '6 6' }} />}
      <CircleMarker center={[SUMMIT.lat, SUMMIT.lng]} radius={9}
        pathOptions={{ color: '#7f1d1d', fillColor: '#dc2626', fillOpacity: 1 }}>
        <Tooltip>{SUMMIT.name}</Tooltip>
      </CircleMarker>

      {route && <Route graph={graph} density={density} route={route} />}

      {SHELTERS.map((s, i) => (
        <CircleMarker key={s.name} center={[s.lat, s.lng]} radius={i === targetIndex ? 11 : 8}
          pathOptions={{ color: i === targetIndex ? '#facc15' : '#fff', weight: i === targetIndex ? 4 : 2,
                         fillColor: '#16a34a', fillOpacity: 1 }}>
          <Tooltip>{s.name}</Tooltip>
        </CircleMarker>
      ))}

      {start && <CircleMarker center={[start.lat, start.lng]} radius={9}
        pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}>
        <Tooltip>Posisi Anda</Tooltip>
      </CircleMarker>}
    </MapContainer>
  );
}