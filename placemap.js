// A place's point on a map, picked on OpenStreetMap (Leaflet, vendor/leaflet):
// pressed or dragged to, or found from what is typed of its address. As
// exact as the member likes - a place may be a country, a town, or one
// spot - so the point is never needed, and taken off again at a press.
// Only the place's owner sees it (backend.sql, places). The map's pictures
// come from OpenStreetMap's servers, and "Find on the map" asks
// OpenStreetMap's Nominatim; nothing else is sent anywhere.

const LEAFLET = new URL("./vendor/leaflet/", import.meta.url);
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

let loading = null;
/** Leaflet, loaded the first time a map is shown: window.L. */
function leaflet() {
  loading ??= new Promise((done, failed) => {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = new URL("leaflet.css", LEAFLET).href;
    document.head.append(style);
    const script = document.createElement("script");
    script.src = new URL("leaflet.js", LEAFLET).href;
    script.onload = () => done(window.L);
    script.onerror = () => { loading = null; failed(new Error("The map couldn't be loaded")); };
    document.head.append(script);
  });
  return loading;
}

/** Where what is typed of a place is, as OpenStreetMap finds it: { lat, lng, zoom } or null. */
export async function findOnMap(words) {
  const asked = String(words ?? "").trim();
  if (!asked) return null;
  try {
    const answer = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(asked)}`, { headers: { Accept: "application/json" } });
    const [found] = answer.ok ? await answer.json() : [];
    if (!found) return null;
    // as close as what was found is: a country far out, a house close in
    const zoom = { country: 5, state: 7, region: 7, county: 9, city: 12, town: 13, village: 14 }[found.addresstype] ?? 16;
    return { lat: Number(found.lat), lng: Number(found.lon), zoom };
  } catch {
    return null;
  }
}

/**
 * The map drawn into its place on the page (#place-map) whenever it is shown: its point as a pin, pressed
 * anywhere or dragged to move it; picked(lat, lng) is told of each. Called again as the point changes.
 */
export class PlaceMap {
  constructor(picked) {
    this.picked = picked;
    this.map = null;
    this.element = null;
    this.pin = null;
  }

  /** Shown in this element, at this point (or none), looking at this view ({ lat, lng, zoom }, or the point, or the world). */
  async show(element, point, view = null) {
    if (!element) return;
    const L = await leaflet().catch(() => null);
    if (!L || !element.isConnected) return;
    if (this.element !== element) {
      this.map?.remove();
      this.element = element;
      this.pin = null;
      L.Icon.Default.imagePath = new URL("images/", LEAFLET).href;
      this.map = L.map(element, { worldCopyJump: true }).setView([30, 0], 2);
      L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(this.map);
      this.map.on("click", (event) => this.picked(event.latlng.lat, event.latlng.lng));
      if (point) this.map.setView([point.lat, point.lng], 15);
    }
    if (point) {
      if (!this.pin) {
        this.pin = L.marker([point.lat, point.lng], { draggable: true, title: "Its point" }).addTo(this.map);
        this.pin.on("dragend", () => { const at = this.pin.getLatLng(); this.picked(at.lat, at.lng); });
      } else {
        this.pin.setLatLng([point.lat, point.lng]);
      }
    } else if (this.pin) {
      this.pin.remove();
      this.pin = null;
    }
    if (view) this.map.setView([view.lat, view.lng], view.zoom ?? 15);
    this.map.invalidateSize();
  }
}
