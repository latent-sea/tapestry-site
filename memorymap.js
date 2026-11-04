// The member's memories on a map (the Places screen): each a dot at its place's
// point - its own place, or its event's - coloured by when it was, oldest deep
// purple through blue and teal to the newest yellow. Several at one place are
// one pie, a slice each in its own colour, oldest first. A dot or a pie pressed
// says what and when, and opens it. Only places with a point are on it: a point is the
// place owner's alone to see (backend.sql, places). The map's pictures come
// from OpenStreetMap, as a place's own map's do (placemap.js).

import { leaflet, TILES, ATTRIBUTION } from "./placemap.js?v=15335c30de70";
import { yearsOf } from "./woven.js?v=15335c30de70";

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
 * The memories to plot: { dots, points, missing, from, to } - each dot { key, id, title, said, lat, lng, years, colour };
 * points, the dots gathered by where they are, { lat, lng, dots } (oldest first: a pie's slices, when there are
 * several); missing, how many of the member's own memories are at a place with no point; from and to, the first
 * and last year among the dots.
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
  const points = [...atPoint.values()].map((together) => ({ lat: together[0].lat, lng: together[0].lng, dots: together }));
  return { dots, points, missing, from, to };
}

const escape = (text) => String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A point's look: a dot in its one colour, or a pie of several - a slice each, oldest from the top, clockwise. */
export function pieOf(dots) {
  if (dots.length === 1) return dots[0].colour;
  const step = 360 / dots.length;
  return `conic-gradient(${dots.map((d, i) => `${d.colour} ${Math.round(i * step * 100) / 100}deg ${Math.round((i + 1) * step * 100) / 100}deg`).join(", ")})`;
}

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
    for (const point of plotted.points) {
      // one memory a dot; several a pie, a little bigger the more there are
      const many = point.dots.length > 1;
      const size = many ? Math.min(40, Math.round(20 + 4 * Math.sqrt(point.dots.length))) : 16;
      const icon = L.divIcon({ className: "MemoryDot", iconSize: [size, size], iconAnchor: [size / 2, size / 2],
        html: `<span style="background:${pieOf(point.dots)}"></span>` });
      const said = point.dots.map((d) => `<a class="MemoryDotLink" href="#memory/${encodeURIComponent(d.id)}"><i style="background:${d.colour}"></i>`
        + `<span><strong>${escape(d.title)}</strong><br>${escape(d.said)}</span></a>`).join("");
      const title = many ? `${point.dots.length} memories here` : `${point.dots[0].title}, ${point.dots[0].said}`;
      L.marker([point.lat, point.lng], { icon, title, keyboard: true }).bindPopup(`<div class="MemoryPopup">${said}</div>`, { maxHeight: 260 }).addTo(this.layer);
    }
    // zoomed out to fit every dot
    if (plotted.dots.length) {
      const bounds = L.latLngBounds(plotted.dots.map((d) => [d.lat, d.lng]));
      this.map.fitBounds(bounds.pad(0.2), { maxZoom: 14 });
    }
  }
}
