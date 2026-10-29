// Places: the member's own list of where things happened - a house, a pub,
// a town - each with everything at it. Others see a place of the member's
// only through something at it that they see.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=e87b274f50a9";
import { few, heading, notice, problem } from "./parts.js?v=e87b274f50a9";
import { ADDS_MEMORY, EDIT } from "./editor.js?v=e87b274f50a9";
import { CARD, DANGER, LINK } from "./look/look.js?v=e87b274f50a9";
import { describeMerge } from "./asking.js?v=e87b274f50a9";
import { addressOf } from "./weave.js?v=e87b274f50a9";
import { findOnMap } from "./placemap.js?v=e87b274f50a9";
import { REPORTS, describeReporting } from "./safety.js?v=e87b274f50a9";

// a place's address, part by part, each as a letter has it: every one may be left empty
const ADDRESS = [["street", "Street", "12 Elm Street", "street-address"], ["street_2", "Second line", "Flat 2", "address-line2"],
  ["town", "Town or city", "Leeds", "address-level2"], ["region", "County, state or region", "West Yorkshire", "address-level1"],
  ["postcode", "Postcode", "LS1 1AA", "postal-code"], ["country", "Country", "England", "country-name"]];

export const PLACES = "places";
export const PLACE = "place";

export const SETS_NEW_PLACE = "sets_a_new_places_name";
export const ADDS_PLACE = "adds_a_place";
export const OPENS_PLACE = "opens_a_place";
export const SETS_PLACE_NAME = "sets_the_places_name";
export const SETS_PLACE_NOTES = "sets_the_places_notes";
export const SETS_ADDRESS = "sets_a_part_of_the_places_address";
export const SAVES_PLACE = "saves_the_place";
export const REMOVES_PLACE = "removes_the_place";
export const ASKS_TO_REMOVE_PLACE = "asks_before_removing_the_place";
export const KEEPS_PLACE = "keeps_the_place";
export const FINDS_ON_MAP = "finds_the_place_on_the_map";
export const CLEARS_POINT = "takes_off_the_places_point";

export const WORDS = {
  [SETS_NEW_PLACE]: ["Place"],
  [ADDS_PLACE]: ["Add"],
  [OPENS_PLACE]: ["Open"],
  [SETS_PLACE_NAME]: ["Its name"],
  [SETS_PLACE_NOTES]: ["Notes"],
  [SETS_ADDRESS]: ["A part of its address"],
  [SAVES_PLACE]: ["Save the place"],
  [REMOVES_PLACE]: ["Yes, remove it"],
  [ASKS_TO_REMOVE_PLACE]: ["Remove the place"],
  [KEEPS_PLACE]: ["No, keep it"],
  [FINDS_ON_MAP]: ["Find on the map"],
  [CLEARS_POINT]: ["Take off the point"],
};

export class Places extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.newName = this.value("");
    this.name = this.value("");
    this.notes = this.value("");
    this.address = this.value({}); // its address as typed, part by part
    this.asking = this.value(false);
    this.point = this.value(null); // its point on the map, { lat, lng }, or null for none - as exact as the member likes
    this.view = this.value(null); // where the map is to look next, { lat, lng, zoom }, once found
    this.fresh = this.value(""); // the place just added: its page is its form, to fill in
    this.busy = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
  }

  answers() { return Object.keys(WORDS); }

  /** Signed out: nothing of the last member's stays for the next. */
  reset() {
    this.newName.setValue("");
    this.name.setValue("");
    this.notes.setValue("");
    this.address.setValue({});
    this.asking.setValue(false);
    this.fresh.setValue("");
    this.point.setValue(null);
    this.problem.setValue("");
    this.notice.setValue("");
  }

  would(action) {
    if (this.busy.read() && (action === ADDS_PLACE || action === SAVES_PLACE || action === REMOVES_PLACE)) return Phrase.of("Saving");
    if (action === ADDS_PLACE && !this.newName.read().trim()) return Phrase.of("Type the place first");
    if (action === SAVES_PLACE && !this.name.read().trim()) return Phrase.of("A place needs a name");
    if (action === CLEARS_POINT && !this.point.read()) return Phrase.of("No point on the map");
    if (action === FINDS_ON_MAP && !this.lookedFor()) return Phrase.of("Type its name or a part of its address first");
    return null;
  }

  told(action, payload) {
    this.notice.setValue("");
    this.problem.setValue("");
    if (action === SETS_NEW_PLACE) this.newName.setValue(payload.line);
    if (action === SETS_PLACE_NAME) this.name.setValue(payload.line);
    if (action === SETS_PLACE_NOTES) this.notes.setValue(payload.line);
    if (action === SETS_ADDRESS) this.address.update((typed) => ({ ...typed, [payload.part]: payload.line }));
    if (action === ADDS_PLACE) this.add();
    if (action === SAVES_PLACE) {
      const point = this.point.read();
      this.change(() => this.loom.savePlace(payload.id, { name: this.name.read(), notes: this.notes.read(), ...this.address.read(), lat: point?.lat ?? null, lng: point?.lng ?? null }),
        () => { this.fresh.setValue(""); return "Saved"; });
    }
    if (action === CLEARS_POINT) this.point.setValue(null);
    if (action === FINDS_ON_MAP) this.find();
    if (action === ASKS_TO_REMOVE_PLACE) this.asking.setValue(true);
    if (action === KEEPS_PLACE || action === REMOVES_PLACE) this.asking.setValue(false);
    if (action === REMOVES_PLACE) this.change(() => this.loom.deletePlace(payload.id), () => "Place removed; what was at it stays");
    return null;
  }

  /** What is typed of the place, as much as there is, to find it by on the map: its address, else its name. */
  lookedFor() {
    const typed = this.address.read();
    const address = ["street", "town", "region", "postcode", "country"].map((part) => (typed[part] ?? "").trim()).filter(Boolean).join(", ");
    return address || this.name.read().trim();
  }

  /** The map's point pressed or dragged to. */
  setPoint(lat, lng) { this.point.setValue({ lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 }); }

  /** The place found on the map from what is typed of it: looked at there, its point put there (to move, or take off). */
  async find() {
    this.busy.setValue(true);
    const found = await findOnMap(this.lookedFor());
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!found) { this.problem.setValue("The map doesn't know that place: press on the map where it is instead"); return; }
    this.setPoint(found.lat, found.lng);
    this.view.setValue(found);
  }

  /** A new place made from its name, and its form opened to say more of it. */
  async add() {
    this.busy.setValue(true);
    const made = await this.loom.addPlace(this.newName.read());
    await this.account.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!made.ok) { this.problem.setValue(made.error); return; }
    this.newName.setValue("");
    this.fresh.setValue(made.data.id);
    location.hash = `#place/${made.data.id}`;
  }

  /** A place's page opened: its name and notes ready to change. */
  open(placeId) {
    const place = this.account.weave.read().places.get(placeId);
    this.name.setValue(place?.name ?? "");
    this.notes.setValue(place?.notes ?? "");
    this.address.setValue(Object.fromEntries(ADDRESS.map(([part]) => [part, place?.[part] ?? ""])));
    this.point.setValue(place?.lat != null && place?.lng != null ? { lat: place.lat, lng: place.lng } : null);
    this.view.setValue(null);
    this.asking.setValue(false);
  }

  async change(work, said) {
    this.busy.setValue(true);
    const done = await work();
    await this.account.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!done.ok) { this.problem.setValue(done.error); return; }
    this.notice.setValue(said());
  }
}

export function describePlaces(ui, places, account) {
  const list = account.weave.map((w) => w.data.places.filter((p) => p.owner === w.meId));
  return ui.screen(PLACES, [
    ui.text(Phrase.of("Your places"), "Title"),
    ui.text(Phrase.of("Where things happened. Open one to see everything at it."), "Hint").wraps(),
    ui.row([
      ui.field(ADDS_PLACE, "", { changes: SETS_NEW_PLACE, shows: places.newName, placeholder: Phrase.of("Grandma's house, The Crown, Leeds…") }).grow(),
      ui.button(ADDS_PLACE),
    ], "AddRow"),
    problem(ui, places.problem),
    notice(ui, places.notice),
    ui.when(list.map((l) => l.length === 0), ui.text(Phrase.of("No places yet."), "Quiet")),
    few(ui, "places", list, (p) => [p.name, p.town, p.region, p.country].join(" "), (held) => ui.pressable(OPENS_PLACE, held.map((p) => ({ parameter: p?.id ?? "" })), [ui.row([
      ui.column([
        ui.text(held.map((p) => p?.name ?? ""), "PersonName"),
        ui.text(held.map((p) => [p?.town, p?.country].filter(Boolean).join(", ")), "Quiet").hidesEmpty(),
      ]).grow(),
      ui.text(ui.bound(() => Phrase.counted("%d thing", "%d things", account.weave.read().atPlace(held.read()?.id).length)), "Quiet"),
    ], "PersonRow")], `${CARD} ListItem`).goesTo(PLACE), { finds: "Find a place by name, town or country", across: false, keyOf: (p) => p.id, style: "List", browsed: true }),
  ]);
}

export function describePlace(ui, places, account, timeline, asking, safety) {
  const placeId = ui.parameter(PLACE);
  const place = ui.bound(() => account.weave.read().places.get(placeId.read()) ?? null);
  const mine = ui.bound(() => place.read()?.owner === account.weave.read().meId);
  const fresh = ui.bound(() => mine.read() && places.fresh.read() === placeId.read());
  const at = ui.bound(() => account.weave.read().atPlace(placeId.read()));
  // its form: its name, its address part by part, its notes
  const form = () => ui.column([
    ui.field(SAVES_PLACE, "", { label: Phrase.of("Its name"), changes: SETS_PLACE_NAME, shows: places.name, carries: (line) => ({ line, id: placeId.read() }) }),
    ui.text(Phrase.of("Its address"), "FieldName"),
    ui.text(Phrase.of("As much of it as you like - every part may be left empty. Your people see only its town, region and country."), "Hint").wraps(),
    ...ADDRESS.map(([part, said, example, autocomplete]) => ui.field(SETS_ADDRESS, "", { label: Phrase.of(said), changes: SETS_ADDRESS, placeholder: example, autocomplete,
      shows: places.address.map((typed) => typed[part] ?? ""), carries: (line) => ({ line, part }) })),
    // its point on the map, if they like: as exact as they want, or none at all
    ui.text(Phrase.of("On the map"), "FieldName"),
    ui.text(Phrase.of("If you like, press on the map where it is, or drag the pin - or leave it off: a country or a town is enough. Only you see the point."), "Hint").wraps(),
    ui.surface("PlaceMap", []).named("place-map"),
    ui.text(places.point.map((p) => (p ? Phrase.with("Its point: %s, %s", [p.lat.toFixed(5), p.lng.toFixed(5)]) : Phrase.of("No point on the map"))), "Hint"),
    ui.row([
      ui.button(FINDS_ON_MAP, { style: LINK }),
      ui.button(CLEARS_POINT, { style: LINK }).absentWhenRefused(),
    ], "Actions"),
    ui.text(Phrase.of("Notes"), "FieldName"),
    ui.area(SETS_PLACE_NOTES, places.notes, "TextArea"),
    problem(ui, places.problem),
    notice(ui, places.notice),
    ui.row([
      ui.button(SAVES_PLACE, { payload: placeId.map((id) => ({ id })) }),
      ui.when(places.asking.map((a) => !a), ui.button(ASKS_TO_REMOVE_PLACE, { style: DANGER })),
    ], "Actions"),
    ui.when(places.asking, ui.column([
      ui.text(Phrase.of("Remove this place? What was at it stays, just not at a place."), "Warn").wraps(),
      ui.row([
        ui.button(REMOVES_PLACE, { payload: placeId.map((id) => ({ id })), style: DANGER, goes_to: PLACES }),
        ui.button(KEEPS_PLACE, { style: LINK }),
      ], "Actions"),
    ])),
  ]);
  return ui.screen(PLACE, [
    ui.when(place, ui.column([
      // just added: its form first, to say where it is
      ui.when(fresh, ui.column([
        ui.text(Phrase.of("A new place"), "Title"),
        ui.text(Phrase.of("Say where it is, as much as you like, and save it."), "Hint").wraps(),
        form(),
      ]), ui.column([
        ui.text(place.map((p) => p?.name ?? ""), "Title"),
        ui.text(place.map((p) => addressOf(p)), "Meta").wraps().hidesEmpty(),
        ui.text(place.map((p) => p?.notes ?? ""), "Words").wraps().hidesEmpty(),
        ui.when(mine, ui.row([ui.button(ADDS_MEMORY, { with: placeId.map((id) => `memory:new:place:${id}`), goes_to: EDIT })], "Actions")),
        // someone else's: reported to the moderators as breaking the terms or the law
        ui.when(ui.bound(() => !!place.read() && !mine.read()), ui.row([
          ui.pressable(REPORTS, placeId.map((id) => ({ kind: "place", id })), [ui.text(ui.words(REPORTS), "Small")], LINK)], "Actions SafetyRow")),
        describeReporting(ui, safety, placeId.map((id) => `place:${id}`)),
        heading(ui, "Everything here"),
        timeline(at, Phrase.of("Nothing here yet.")),
        ui.when(mine, ui.column([
          heading(ui, "Change the place"),
          form(),
          describeMerge(ui, asking, account, "place", placeId),
          problem(ui, asking.problem),
          notice(ui, asking.notice),
        ])),
      ])),
    ]), ui.text(Phrase.of("This place isn't one you can see."), "Quiet")),
  ], null, { on_fill: () => places.open(placeId.read()) });
}
