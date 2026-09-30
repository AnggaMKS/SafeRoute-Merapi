# SafeRoute Merapi
- Project by: Jundi Erlangga Luhur Prawira (25/561570/TK/63456) | Muhammad Fazli (25/560578/TK/63319)
- Course: Artificial Intelligence, Semester 3.

**Pencarian Rute Evakuasi Tercepat dan Cost-Effective ke Barak Pengungsian di Kabupaten Sleman Menggunakan Uniform-Cost Search dan A\* pada Jaringan Jalan OpenStreetMap**

A web application that simulates a Mount Merapi eruption evacuation. The user clicks a position on the map, and the system finds and draws the cheapest route to the nearest evacuation shelter (*barak pengungsian*), taking into account both **road length** and **road crowdedness** (*kepadatan*).

**Live demo:** <https://saferoute-merapi.vercel.app/>

---

## Table of Contents

1. [What is this project about?](#1-what-is-this-project-about)
2. [Features](#2-features)
3. [The algorithms](#3-the-algorithms)
4. [Tech stack](#4-tech-stack)
5. [Folder structure](#5-folder-structure)
6. [Getting started](#6-getting-started)
7. [Available scripts](#7-available-scripts)
8. [How to use the app](#8-how-to-use-the-app)
9. [Data sources & shelters](#9-data-sources--shelters)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. What is this project about?

During a volcanic eruption, the shortest road is not always the best one. A short road that is jammed with evacuees can take longer than a slightly longer, emptier road. This project models that trade-off.

- **Problem:** given a person's location near Merapi (Sleman Regency, DI Yogyakarta), find the best route to one of 12 evacuation shelters.
- **Model:** the real road network from OpenStreetMap is turned into a weighted graph. Each road segment costs more the longer and more crowded it is.
- **Search:** two classic algorithms, **Uniform-Cost Search (UCS)** and **A\***, are implemented from scratch and compared side by side.
- **Output:** the route is drawn on an interactive map, coloured by crowd level, together with distance, estimated time, and search statistics.

Everything runs **in the browser**. There is no backend. The road network is preprocessed once into a static JSON file.

---

## 2. Features

-  **Interactive map** (Leaflet + OpenStreetMap tiles) centred on Merapi / Sleman.
-  **Responsive layout:** the side panel docks left on desktop and turns into a bottom sheet on phones, with touch-friendly controls, dynamic viewport sizing, and a **toggle to collapse/expand the panel** (× closes it, the ☰ button reopens it).
-  **Click to set your position.** Click again to move it. The position snaps to the nearest road node.
-  **12 evacuation shelters** (barak) shown as green markers. The chosen target is highlighted.
-  **Crowd-density model** on every road segment:
  - a base load by road class (main roads are busier than small roads),
  - a directional **evacuation-flow** term (roads aligned with the escape direction away from the summit carry more traffic),
  - **hotspots anchored at real population centres** (15 villages around Merapi) so congestion clusters where people actually live and evacuate to,
  - a small seeded noise term so a **"Acak ulang kepadatan"** button still varies the micro-scenario.
-  **Density overlay** on main roads, from green (smooth) to red (jammed).
-  **Adjustable density weight (α)** to control how much crowding matters against distance.
-  **Eruption simulation (road closure).** Roads inside a directional hazard zone (an ellipse elongated along the Kali Gendol corridor, south-southeast) are treated as effectively closed, so routes detour around them. The activity level (BPPTKG Waspada/Siaga/Awas) sets the zone's reach.
-  **Switch between UCS and A\*.** Both are always computed, so their results appear side by side.
-  **Explored-node visualization** to see how many nodes each algorithm expanded (UCS looks like a large disc, A\* like a narrow cone).
-  **Route statistics:** target shelter, distance, ETA, effective cost, nodes expanded, computation time.
-  **Built-in correctness check:** the UI confirms that UCS and A\* return the same cost and shows how many times fewer nodes A\* expanded.
-  **Explanation panel (transparency):** an in-app table that shows the **cost decomposition side by side for A\* and UCS** (length + density term + hazard term = effective cost — identical for both, since both are optimal), a **worked example** of the per-segment formula (`L × (1 + α·k + penutupan)`) on real segments plus **g / h / f** at a few nodes, the **priority key** and **h(start)** of each algorithm, how **nodes explored** are counted, the **eruption effect** (level → radius → closure, route before/after), and a map **colour legend** — so a non-programmer can follow the model.
-  **Benchmark script** that runs 200 random start points and reports average nodes expanded and time per algorithm.

---

## 3. The algorithms

### 3.1 Graph model

| Concept | Definition |
|---|---|
| **Node** | A road intersection or shape point from OpenStreetMap |
| **Edge** | A road segment between two adjacent nodes (undirected) |
| **Start** | The road node nearest to the user's click |
| **Goals** | The road nodes nearest to each of the 12 shelters |

One-way restrictions are intentionally ignored (the graph is undirected), since contraflow is a common assumption during evacuations.

### 3.2 Edge cost

For a road segment `e` with length `L` (metres) and crowd density `k ∈ [0, 1]`:

```
cost(e) = L × (1 + α · k)                              normal
cost(e) = L × (1 + α · k + closure(d))                 when the eruption simulation is on
```

- `α` (default `3`): a completely jammed road (`k = 1`) costs 4× as much as a free road.
- `closure(d)` models roads **effectively closed** by the eruption. The hazard zone is an ellipse centred on the summit and elongated along the eruption corridor (Kali Gendol, bearing ≈165°, aspect 0.6). At a point whose normalised elliptical distance from the summit is `d`, the extra multiplier is `closure × max(0, 1 − d)`: near-closure (default `60`) at the summit, decaying linearly to `0` at the boundary. The activity level (BPPTKG Waspada/Siaga/Awas) sets the ellipse's major radius (3 / 5 / 10 km).
- The **graded** decay means the zone is not a hard wall: a route can still escape from inside it, but crossing it is so costly that the search detours around it. Because the extra cost is always `≥ 0`, the multiplier stays `≥ 1` and the A\* heuristic remains admissible.

The cost is **effective distance** ("km-equivalent"), not time.

### 3.3 Multiple shelters, one search

Instead of running 12 searches, the search starts from the user's node and **stops as soon as any shelter node is removed from the priority queue**. Because the queue always pops the cheapest node first, that shelter is guaranteed to be the cheapest one.

### 3.4 Uniform-Cost Search (UCS)

Priority queue ordered by `g(n)`, the cost accumulated from the start. It expands nodes in all directions by increasing cost, and is optimal and complete but explores a lot of nodes.

```
f(n) = g(n)
```

### 3.5 A\* Search

Priority queue ordered by `g(n) + h(n)`.

```
f(n) = g(n) + h(n)
h(n) = haversine distance from n to the NEAREST shelter (straight line, in metres)
```

**Why A\* stays optimal (admissible & consistent heuristic):**

1. The multiplier `(1 + α·k [+ closure(d)])` is always `≥ 1`, so `cost(e) ≥ length(e)`.
2. Road length is always `≥` the straight-line distance between its endpoints.
3. Therefore `h` never overestimates the true remaining cost. Edge lengths are also rounded **up** (`ceil`) during preprocessing so this holds numerically.

Both algorithms must therefore return the **same optimal cost**, and A\* should expand fewer nodes (≈1.4× fewer on the 200-point benchmark). That comparison is the main experimental result.

### 3.6 Implementation details

- **Binary min-heap** written from scratch (`src/lib/heap.js`) with *lazy deletion* (stale entries are skipped when popped).
- **CSR adjacency** (Compressed Sparse Row) using typed arrays for a fast, memory-light graph.
- **Heuristic cache** so each `h(n)` is computed at most once per search.
- **Estimated travel time (ETA)** is computed per segment: `time = length / (freeFlowSpeed × (1 − 0.75·k))`, with free-flow speeds of 50 / 40 / 30 / 25 km/h for road classes 0 / 1 / 2 / 3 (primary, secondary, tertiary, other).

### 3.7 Complexity

With `V` nodes and `E` edges, both algorithms run in `O((V + E) log V)` in the worst case. A\* usually explores a much smaller portion of the graph in practice.

---

## 4. Tech stack

| Concern | Choice |
|---|---|
| Build tool / UI | [Vite](https://vite.dev) + [React](https://react.dev) |
| Map | [Leaflet](https://leafletjs.com) + [react-leaflet](https://react-leaflet.js.org) |
| Road data | [OpenStreetMap](https://www.openstreetmap.org) via the [Overpass API](https://overpass-api.de) |
| Search algorithms | Own implementation (no pathfinding library) |
| Crowd density | Constructed model: road-class base + directional evacuation flow + village-anchored hotspots (seeded Mulberry32 noise) |
| Hosting | [Vercel](https://saferoute-merapi.vercel.app/) (static files only) |

---

## 5. Folder structure

```
SafeRoute-Merapi/
├── public/
│   └── data/
│       └── graph.json          # preprocessed road network (generated by `npm run graph`)
├── scripts/
│   ├── build-graph.mjs         # downloads OSM roads (Overpass, tiled) and builds graph.json
│   ├── benchmark.mjs           # UCS vs A* benchmark over 200 random start points
│   └── cache/                  # downloaded Overpass tiles (git-ignored, lets you resume)
├── src/
│   ├── main.jsx                # app entry point
│   ├── App.jsx                 # state + wiring: loads graph, generates costs, runs searches
│   ├── index.css               # styles
│   ├── data/
│   │   ├── shelters.js         # shelter coordinates + Merapi summit coordinate
│   │   └── population.js       # population-centre coordinates + relative weights
│   ├── lib/
│   │   ├── geo.js              # haversine distance + metres-per-degree
│   │   ├── heap.js             # binary min-heap (priority queue)
│   │   ├── graph.js            # graph builder (CSR) + nearest-node lookup
│   │   ├── density.js          # crowd-density model + edge cost builder
│   │   ├── hazard.js           # directional (elliptical) hazard + BPPTKG levels
│   │   └── search.js           # UCS and A* implementation
│   └── components/
│       ├── MapView.jsx         # Leaflet map, layers, markers, route drawing
│       └── Panel.jsx           # control panel and result cards
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

---

## 6. Getting started

### Prerequisites

- **Node.js 20.19+ or 22+** (check with `node -v`), which includes npm and a built-in `fetch`
- **Git**
- An internet connection (for npm packages, map tiles, and, only if you regenerate it, the OSM road data)

### Step 1: Clone the repository

```bash
git clone https://github.com/AnggaMKS/SafeRoute-Merapi.git
cd SafeRoute-Merapi
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Make sure the road graph exists

The app needs `public/data/graph.json`.

- **If the file is already in the repo** (check `public/data/`), skip to Step 4.
- **If it is missing**, generate it (takes a few minutes, needs internet):

  ```bash
  npm run graph
  ```

  The script downloads the roads in 9 small tiles from the Overpass API and merges them. Finished tiles are cached in `scripts/cache/`, so if it fails partway, just run the command again and it resumes.

  You should see something like:

  ```
  tile 0,0: downloading
  ...
  ways: ..., nodes: ...
  saved: ... nodes, ... edges, ... MB
  ```

### Step 4: Run the app

```bash
npm run dev
```

Open the address shown in the terminal (usually <http://localhost:5173>).

---

## 7. Available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Create the production build in `dist/` |
| `npm run preview` | Serve the production build locally (test before deploying) |
| `npm run graph` | Download OSM roads and generate `public/data/graph.json` |
| `npm run bench` | Compare UCS vs A\* over 200 random start points (needs `graph.json`) |

The benchmark prints the average nodes expanded and average time per algorithm, and the number of cost mismatches between them (**it should be 0**).

---

## 8. How to use the app

1. **Click anywhere on the map** to set your position (blue marker).
2. The route to the cheapest shelter is drawn automatically. Its colour follows road crowdedness (green to red), and the target shelter gets a yellow ring.
3. Use the **side panel** to:
   - switch between **A\*** and **UCS**,
   - change the **density weight α**,
   - enable the **eruption simulation** and pick the **activity level** (Waspada/Siaga/Awas) — roads inside the zone are then treated as closed,
   - show or hide the **density overlay** and **explored nodes**,
   - press **Acak ulang kepadatan** to generate a new random traffic scenario.
4. Read the result cards and the **Rincian biaya rute: A\* vs UCS** table: they compare distance, ETA, effective cost, nodes explored, and computation time. The table shows the effective cost is identical for both (both are optimal); the rows that actually differ (nodes explored, time) are emphasised. The **Arti warna peta** section explains the map layers.

If the panel warns that your position is far from the nearest road, click closer to a road.

---

## 9. Data sources & shelters

**Road network:** © OpenStreetMap contributors (ODbL). Roads of type `motorway`, `trunk`, `primary`, `secondary`, `tertiary`, `unclassified`, `residential`, `living_street` (and `_link` variants) within the bounding box `-7.76, 110.34` to `-7.52, 110.52`. Only the largest connected component is kept.

**Shelters** (initial coordinates collected from Google Maps; names/kelurahan verified via Nominatim, defined in `src/data/shelters.js`):

| # | Name | Latitude | Longitude |
|---|---|---|---|
| 1 | Barak Evakuasi Akhir Girikerto | -7.62220 | 110.39034 |
| 2 | Barak Pengungsian Purwobinangun | -7.64499 | 110.39292 |
| 3 | Barak Pengungsian Candibinangun | -7.64891 | 110.40047 |
| 4 | Barak Plosokerep (Kambing) | -7.62669 | 110.44385 |
| 5 | Barak Glagaharjo | -7.64678 | 110.46850 |
| 6 | Barak Gayam | -7.65862 | 110.46863 |
| 7 | Barak Merapi Kiyaran | -7.65691 | 110.44633 |
| 8 | Barak Pengungsian Kiyaran | -7.65638 | 110.43877 |
| 9 | Barak Pengungsian Argomulyo | -7.67880 | 110.45123 |
| 10 | Barak Pengungsian Umbulmartani | -7.68016 | 110.43406 |
| 11 | Barak Pengungsian Sindumartani | -7.69411 | 110.48316 |
| 12 | Barak Tirtomartani | -7.73883 | 110.46774 |

Each shelter is snapped to the nearest road node in the graph. Please verify the coordinates on Google Maps / OSM.

**Crowd density:** a constructed model (see `src/lib/density.js`), not real traffic data. It combines a road-class base load, a directional evacuation-flow term, and congestion hotspots anchored at 15 real villages (`src/data/population.js`, village centroids from OpenStreetMap via Nominatim). Relative population weights are approximate and should be checked against BPS data before citing.

---

## 10. Troubleshooting

| Problem | Solution |
|---|---|
| App shows *"Gagal memuat graf"* | `public/data/graph.json` is missing. Run `npm run graph`. |
| `npm run bench` fails with `ENOENT ... graph.json` | Same as above. Generate the graph first. |
| `npm run graph` fails with `406 Not Acceptable` | The Overpass server rejects requests without a proper `User-Agent`. Make sure the `UA` line in `scripts/build-graph.mjs` is set. |
| `504`, `429`, or `Dispatcher_Client::...timeout` | The public Overpass servers are busy. Wait a few minutes and run `npm run graph` again. Finished tiles are cached and skipped. |
| `fetch failed`, `ENOTFOUND`, `ETIMEDOUT` | Network problem. Check your connection or DNS, or try a different network / VPN. |
| `HIGHWAYS is not defined` or similar | `scripts/build-graph.mjs` was edited partially. Restore the complete file from the repo. |
| Blank map / broken layout | Make sure `import 'leaflet/dist/leaflet.css'` is in `src/main.jsx`. |
| Dependency errors with react-leaflet | react-leaflet v5 needs React 19. With React 18, install `react-leaflet@4`. |
| Node version errors | Upgrade to Node 20.19+ or 22+. |

