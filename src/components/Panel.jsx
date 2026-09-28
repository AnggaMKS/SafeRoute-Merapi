import { SHELTERS } from '../data/shelters.js';

const fmt = (r) => r.found ? [
  ['Barak tujuan', SHELTERS[r.shelterIndex].name],
  ['Jarak', `${(r.distance / 1000).toFixed(2)} km`],
  ['Estimasi waktu', `${Math.round(r.eta / 60)} menit`],
  ['Biaya efektif', `${(r.cost / 1000).toFixed(2)} km-ekiv.`],
  ['Node dieksplor', r.expanded.toLocaleString('id-ID')],
  ['Waktu komputasi', `${r.ms.toFixed(1)} ms`],
] : [['Status', 'Rute tidak ditemukan']];

export default function Panel(p) {
  const { results, algo } = p;
  return (
    <aside className="panel">
      <h1> SafeRoute Merapi</h1>
      <p className="hint">{p.hasStart ? 'Klik peta untuk memindahkan posisi.' : 'Klik peta untuk memilih posisi Anda.'}</p>

      <label>Algoritma
        <select value={algo} onChange={(e) => p.setAlgo(e.target.value)}>
          <option value="astar">A* (Heuristik Haversine)</option>
          <option value="ucs">Uniform-Cost Search</option>
        </select>
      </label>

      <label>Bobot kepadatan α = {p.alpha}
        <input type="range" min="0" max="8" step="0.5" value={p.alpha} onChange={(e) => p.setAlpha(+e.target.value)} />
      </label>

      <label className="row"><input type="checkbox" checked={p.eruption} onChange={(e) => p.setEruption(e.target.checked)} />
        Simulasi erupsi (zona bahaya)</label>
      {p.eruption && (
        <label>Radius bahaya: {p.hazardKm} km <small>(ilustrasi, bukan data BPPTKG)</small>
          <input type="range" min="2" max="12" step="0.5" value={p.hazardKm} onChange={(e) => p.setHazardKm(+e.target.value)} />
        </label>
      )}

      <label className="row"><input type="checkbox" checked={p.showDensity} onChange={(e) => p.setShowDensity(e.target.checked)} />
        Tampilkan kepadatan jalan</label>
      <label className="row"><input type="checkbox" checked={p.showExplored} onChange={(e) => p.setShowExplored(e.target.checked)} />
        Tampilkan node yang dieksplor</label>
      <button onClick={p.onRandomize}> Acak ulang kepadatan</button>

      <div className="legend"><span>Lancar</span><i /><span>Padat</span></div>

      {p.snapMeters > 500 && <p className="warn">Posisi Anda {Math.round(p.snapMeters)} m dari jalan terdekat.</p>}

      {results && ['astar', 'ucs'].map((k) => (
        <div key={k} className={`card ${k === algo ? 'active' : ''}`}>
          <h3>{k === 'astar' ? 'A*' : 'UCS'}</h3>
          <table><tbody>
            {fmt(results[k]).map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}
          </tbody></table>
        </div>
      ))}
      {results?.ucs.found && results.astar.found && (
        <p className="hint">A* mengeksplor {(results.ucs.expanded / results.astar.expanded).toFixed(1)}× lebih sedikit node.
          Biaya sama: {Math.abs(results.ucs.cost - results.astar.cost) < 1 ? '✓' : '✗ (cek heuristik!)'}</p>
      )}
    </aside>
  );
}