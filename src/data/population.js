// Affected population centres (kalurahan/desa) around Merapi, used as the anchors
// for the crowd-density hotspots. Coordinates are village centroids from
// OpenStreetMap (via Nominatim); `weight` is a rough relative population index
// (1 = small, 2 = moderate, 3 = large) and should be checked against BPS data
// before citing. Congestion clusters where people live and where they evacuate
// to, so these replace the earlier randomly-placed hotspots.
export const POPULATION_CENTERS = [
  // Near-summit villages (evacuation origins) — Kepuharjo/Umbulharjo/Wonokerto etc.
  { name: 'Kepuharjo',     lat: -7.62683, lng: 110.44608, weight: 1 },
  { name: 'Umbulharjo',    lat: -7.61173, lng: 110.43777, weight: 1 },
  { name: 'Wonokerto',     lat: -7.62077, lng: 110.38282, weight: 1 },
  { name: 'Girikerto',     lat: -7.62220, lng: 110.39034, weight: 1 },
  { name: 'Hargobinangun', lat: -7.63734, lng: 110.42475, weight: 1 },
  { name: 'Purwobinangun', lat: -7.64499, lng: 110.39292, weight: 2 },
  { name: 'Candibinangun', lat: -7.64891, lng: 110.40047, weight: 1 },
  { name: 'Pakembinangun', lat: -7.65795, lng: 110.42254, weight: 2 },
  { name: 'Harjobinangun', lat: -7.67117, lng: 110.41214, weight: 1 },
  { name: 'Bangunkerto',   lat: -7.64402, lng: 110.35739, weight: 1 },
  // Downstream / shelter villages (evacuation destinations)
  { name: 'Glagaharjo',    lat: -7.64678, lng: 110.46850, weight: 1 },
  { name: 'Argomulyo',     lat: -7.67880, lng: 110.45123, weight: 1 },
  { name: 'Umbulmartani',  lat: -7.68016, lng: 110.43406, weight: 3 },
  { name: 'Sindumartani',  lat: -7.69411, lng: 110.48316, weight: 2 },
  { name: 'Tirtomartani',  lat: -7.73883, lng: 110.46774, weight: 2 },
];
