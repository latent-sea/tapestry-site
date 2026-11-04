// The member's memories on a map (the Places screen): each a dot at its place's
// point - its own place, or its event's - coloured by when it was, oldest deep
// purple through blue and teal to the newest yellow. Several at one place
// spread into a small ring, so none hides another. A dot pressed says what and
// when, and opens it. Only places with a point are on it: a point is the
// place owner's alone to see (backend.sql, places). The map's pictures come
// from OpenStreetMap, as a place's own map's do (placemap.js).

import { leaflet, TILES, ATTRIBUTION } from "./placemap.js?v=be889b79f4e4";
import { yearsOf } from "./woven.js?v=be889b79f4e4";

/** The colours from oldest to newest, evenly along the way. */
export const RAMP = ["#4b2a8c", "#3b5bdb", "#1c9fc9", "#19c3b3", "#7bd389", "#f2c14e"];

const mix = (a, b, f) => {
  const ch = (hex, i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * f).toString(16).padStart(2, "0")).join("")}`;
};

/** A time's colour, from where it falls between the first and the last (0 the oldest, 1 the newest). */
export function dateColour(f) {
  const at = Math.max(0, Math.min(1, Number.isFinite(f) ? f : 1)) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(at));
  return mix(RAMP[i], RAMP[i + 1], at - i);
}

/**
 * The memories to plot: { dots, missing, from, to } - each dot { key, id, title, said, lat, lng, years, colour,
 * ring, of } (ring its place in the ring of those at one point, of how many there are); missing, how many of the
 * member's own memories are at a place with no point; from and to, the first and last year among the dots.
 */
export function memoryDots(weave) {
  const pointOf = (placeId) => {
    const place = placeId ? weave.places.get(placeId) : null;
    if (!place || place.lat === null || place.lat === undefined || place.lng === null || place.lng === undefined) return null;
    const lat = Number(place.lat);
    const lng = Number(place.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  };
  const dots = [];
  let missing = 0;
  for (const memory of weave.data.memories) {
    const placeId = memory.place_id ?? weave.events.get(memory.event_id)?.place_id ?? null;
    if (!placeId) continue;
    const place = pointOf(placeId);
    const entry = weave.entry("memory", memory);
    if (!place || !entry.when?.date) { if (memory.owner === weave.meId) missing++; continue; }
    dots.push({ key: entry.key, id: memory.id, title: entry.title, said: entry.said, lat: place.lat, lng: place.lng, years: yearsOf(entry.when) });
  }
  dots.sort((a, b) => a.years - b.years);
  const from = dots.length ? Math.floor(dots[0].years) : null;
  const to = dots.length ? Math.floor(dots[dots.length - 1].years) : null;
  const span = dots.length ? dots[dots.length - 1].years - dots[0].years : 0;
  const atPoint = new Map();
  for (const dot of dots) {
    dot.colour = dateColour(span > 0 ? (dot.years - dots[0].years) / span : 1);
    const at = `${dot.lat},${dot.lng}`;
    if (!atPoint.has(at)) atPoint.set(at, []);
    atPoint.get(at).push(dot);
  }
  for (const together of atPoint.values()) together.forEach((dot, i) => { dot.ring = i; dot.of = together.length; });
  return { dots, missing, from, to };
}

const escape = (text) => String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The map drawn into its place on the page (#memory-map) whenever the Places screen is shown, again as the memories change. */
export class MemoryMap {
  constructor() {
    this.map = null;
    this.element = null;
    this.layer = null;
    this.drawn = null;
  }

  async show(element, plotted) {
    if (!element) return;
    const L = await leaflet().catch(() => null);
    if (!L || !element.isConnected) return;
    if (this.element !== element) {
      this.map?.remove();
      this.element = element;
      this.drawn = null;
      this.map = L.map(element, { worldCopyJump: true }).setView([30, 0], 2);
      L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(this.map);
      this.layer = L.layerGroup().addTo(this.map);
    }
    this.map.invalidateSize();
    if (this.drawn === plotted) return;
    this.drawn = plotted;
    this.layer.clearLayers();
    const SIZE = 16;
    for (const dot of plotted.dots) {
      // several at one point: a ring around it, a few pixels out, whatever the zoom
      const spread = dot.of > 1 ? 9 + dot.of * 1.5 : 0;
      const angle = (dot.ring / dot.of) * Math.PI * 2;
      const dx = Math.round(Math.cos(angle) * spread);
      const dy = Math.round(Math.sin(angle) * spread);
      const icon = L.divIcon({ className: "MemoryDot", iconSize: [SIZE, SIZE], iconAnchor: [SIZE / 2 - dx, SIZE / 2 - dy],
        html: `<span style="background:${dot.colour}"></span>` });
      L.marker([dot.lat, dot.lng], { icon, title: `${dot.title}, ${dot.said}`, keyboard: true })
        .bindPopup(`<a class="MemoryDotLink" href="#memory/${encodeURIComponent(dot.id)}"><strong>${escape(dot.title)}</strong><br>${escape(dot.said)}</a>`)
        .addTo(this.layer);
    }
    // zoomed out to fit every dot
    if (plotted.dots.length) {
      const bounds = L.latLngBounds(plotted.dots.map((d) => [d.lat, d.lng]));
      this.map.fitBounds(bounds.pad(0.2), { maxZoom: 14 });
    }
  }
}
