import { SHELTERS } from '../data/shelters.js';
import { ERUPTION_LEVELS, HAZARD } from '../lib/hazard.js';

const km = (m, dp = 2) => `${(m / 1000).toFixed(dp)} km`;
const num = (m) => (m / 1000).toFixed(2);

const fmt = (r, k) => r.found ? [
  ['Barak tujuan', SHELTERS[r.shelterIndex].name],
  ['Jarak jalan', km(r.distance)],
  ['Estimasi waktu', `${Math.round(r.eta / 60)} menit`],
  ['Biaya efektif', `${km(r.cost)}-ekiv.`],
  ['Node dieksplor', r.expanded.toLocaleString('id-ID')],
  ['Waktu komputasi', `${r.ms.toFixed(1)} ms`],
  ['Kunci prioritas', k === 'astar' ? 'f = g + h' : 'f = g'],
  ...(k === 'astar' ? [['h(start)', km(r.hStart)]] : []),
] : [['Status', 'Rute tidak ditemukan']];

const routeText = (r) => r.found
  ? `${SHELTERS[r.shelterIndex].name} · ${km(r.distance)}`
  : 'rute tidak ditemukan';

const compareNote = (a, b) => {
  if (!a.found || !b.found) return 'Rute tidak ditemukan pada salah satu skenario.';
  if (Math.abs(a.cost - b.cost) > 1) return 'Rute memutar menghindari zona bahaya.';
  return 'Tidak ada perubahan rute (posisi di luar jangkauan zona).';
};

export default function Panel(p) {
  const { results, algo, breakdowns, worked } = p;
  const level = ERUPTION_LEVELS.find((l) => l.id === p.levelId);
  const aB = breakdowns?.astar, uB = breakdowns?.ucs;
  const nodeRows = worked
    ? [...new Set([0, Math.floor(worked.nodes.length / 2), worked.nodes.length - 1])].map((i) => ({
        label: i === 0 ? 'awal' : i === worked.nodes.length - 1 ? 'tujuan' : 'tengah',
        g: worked.nodes[i].g,
        h: worked.nodes[i].h,
      }))
    : [];
  return (
    <aside className="panel">
      <div className="panel-head">
        <h1>SafeRoute Merapi</h1>
        <button className="panel-close" onClick={p.onClose} aria-label="Tutup panel" title="Tutup panel">&times;</button>
      </div>
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
        Simulasi erupsi</label>
      {p.eruption && (
        <label>Level aktivitas
          <select value={p.levelId} onChange={(e) => p.setLevelId(e.target.value)}>
            {ERUPTION_LEVELS.map((l) => (
              <option key={l.id} value={l.id}>{l.label} (±{Math.round(l.radius / 1000)} km)</option>
            ))}
          </select>
          <small>radius mengikuti level BPPTKG; jalan di dalam elips dianggap ditutup</small>
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
            {fmt(results[k], k).map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}
          </tbody></table>
        </div>
      ))}

      {results?.ucs.found && results.astar.found && (
        <p className="hint">A* mengeksplor <b>{(results.ucs.expanded / results.astar.expanded).toFixed(1)}× lebih sedikit node</b> daripada UCS.
          Biaya sama: {Math.abs(results.ucs.cost - results.astar.cost) < 1 ? '✓' : '✗ (cek heuristik!)'}</p>
      )}

      {aB && uB && results && (
        <div className="card">
          <h3>Rincian biaya rute: A* vs UCS</h3>
          <p className="hint">biaya = panjang × (1 + α·kepadatan + penutupan)</p>
          <table className="cmp"><tbody>
            <tr><th /><th>A*</th><th>UCS</th></tr>
            <tr><td>Panjang jalan</td><td>{num(aB.length)}</td><td>{num(uB.length)}</td></tr>
            <tr><td>Kepadatan (α={p.alpha})</td><td>+{num(aB.densityTerm)}</td><td>+{num(uB.densityTerm)}</td></tr>
            {p.eruption && <tr><td>Bahaya erupsi</td><td>+{num(aB.hazardTerm)}</td><td>+{num(uB.hazardTerm)}</td></tr>}
            <tr className="total"><td>Biaya efektif</td><td>{num(aB.cost)}</td><td>{num(uB.cost)}</td></tr>
            <tr className="diff"><td>Node dieksplor</td><td>{results.astar.expanded.toLocaleString('id-ID')}</td><td>{results.ucs.expanded.toLocaleString('id-ID')}</td></tr>
            <tr className="diff"><td>Waktu</td><td>{results.astar.ms.toFixed(1)} ms</td><td>{results.ucs.ms.toFixed(1)} ms</td></tr>
          </tbody></table>
        </div>
      )}

      {worked && (
        <div className="card">
          <h3>Contoh perhitungan</h3>
          <p className="hint">biaya segmen = L × (1 + α·k + penutupan), 3 segmen termahal:</p>
          <ul className="calc">
            {worked.segments.map((s, i) => ({ s, i })).sort((a, b) => b.s.cost - a.s.cost).slice(0, 3).map(({ s, i }) => (
              <li key={i}>#{i + 1}: {s.L.toFixed(0)} m × (1 + {p.alpha}·{s.k.toFixed(2)} + {s.closure.toFixed(2)}) = <b>{s.cost.toFixed(0)} m</b></li>
            ))}
          </ul>
          <table className="cmp"><tbody>
            <tr><th /><th>g</th><th>h</th><th>f=g+h</th></tr>
            {nodeRows.map((n) => (
              <tr key={n.label}><td>{n.label}</td><td>{num(n.g)}</td><td>{num(n.h)}</td><td>{num(n.g + n.h)}</td></tr>
            ))}
          </tbody></table>
          <p className="hint">g = biaya kumulatif dari start (kunci UCS); f = g + h (kunci A*); h = jarak lurus ke barak terdekat. Nilai g/h/f dalam km-ekiv.</p>
        </div>
      )}

      {p.eruption && level && (
        <div className="card">
          <h3>Pengaruh erupsi</h3>
          <table><tbody>
            <tr><td>Level</td><td>{level.label}</td></tr>
            <tr><td>Radius zona</td><td>{Math.round(level.radius / 1000)} km</td></tr>
            <tr><td>Penutupan maks</td><td>{HAZARD.closure}× di puncak</td></tr>
            {p.baseline && results && <tr><td>Tanpa erupsi</td><td>{routeText(p.baseline)}</td></tr>}
            {p.baseline && results && <tr><td>Dengan erupsi</td><td>{routeText(results[algo])}</td></tr>}
          </tbody></table>
          {p.baseline && results && <p className="hint">{compareNote(p.baseline, results[algo])}</p>}
        </div>
      )}

      <details className="explain">
        <summary>Arti warna peta</summary>
        <ul className="legend-list">
          <li><i style={{ background: '#16a34a' }} />Barak pengungsian (kuning = tujuan terpilih)</li>
          <li><i style={{ background: '#2563eb' }} />Posisi Anda</li>
          <li><i style={{ background: 'linear-gradient(90deg, hsl(120,85%,45%), hsl(0,85%,45%))' }} />Jalan: hijau lancar → merah padat</li>
          <li><i style={{ background: '#f97316' }} />Lingkaran oranye = pusat kepadatan (permukiman)</li>
          <li><i style={{ background: '#6366f1' }} />Titik ungu = node yang dieksplor</li>
          <li><i style={{ background: '#dc2626' }} />Elips merah = zona bahaya erupsi (jalan ditutup)</li>
        </ul>
      </details>
    </aside>
  );
}
