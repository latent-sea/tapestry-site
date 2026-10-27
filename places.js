// Places: the member's own list of where things happened - a house, a pub,
// a town - each with everything at it. Others see a place of the member's
// only through something at it that they see.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=eba5a4f179db";
import { heading, notice, problem } from "./parts.js?v=eba5a4f179db";
import { ADDS_MEMORY, EDIT } from "./editor.js?v=eba5a4f179db";
import { CARD, DANGER, LINK } from "./look/look.js?v=eba5a4f179db";
import { describeMerge } from "./asking.js?v=eba5a4f179db";

export const PLACES = "places";
export const PLACE = "place";

export const SETS_NEW_PLACE = "sets_a_new_places_name";
export const ADDS_PLACE = "adds_a_place";
export const OPENS_PLACE = "opens_a_place";
export const SETS_PLACE_NAME = "sets_the_places_name";
export const SETS_PLACE_NOTES = "sets_the_places_notes";
export const SAVES_PLACE = "saves_the_place";
export const REMOVES_PLACE = "removes_the_place";
export const ASKS_TO_REMOVE_PLACE = "asks_before_removing_the_place";
export const KEEPS_PLACE = "keeps_the_place";

export const WORDS = {
  [SETS_NEW_PLACE]: ["Place"],
  [ADDS_PLACE]: ["Add"],
  [OPENS_PLACE]: ["Open"],
  [SETS_PLACE_NAME]: ["Its name"],
  [SETS_PLACE_NOTES]: ["Notes"],
  [SAVES_PLACE]: ["Save the place"],
  [REMOVES_PLACE]: ["Yes, remove it"],
  [ASKS_TO_REMOVE_PLACE]: ["Remove the place"],
  [KEEPS_PLACE]: ["No, keep it"],
};

export class Places extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.newName = this.value("");
    this.name = this.value("");
    this.notes = this.value("");
    this.asking = this.value(false);
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
    this.asking.setValue(false);
    this.problem.setValue("");
    this.notice.setValue("");
  }

  would(action) {
    if (this.busy.read() && (action === ADDS_PLACE || action === SAVES_PLACE || action === REMOVES_PLACE)) return Phrase.of("Saving");
    if (action === ADDS_PLACE && !this.newName.read().trim()) return Phrase.of("Type the place first");
    if (action === SAVES_PLACE && !this.name.read().trim()) return Phrase.of("A place needs a name");
    return null;
  }

  told(action, payload) {
    this.notice.setValue("");
    this.problem.setValue("");
    if (action === SETS_NEW_PLACE) this.newName.setValue(payload.line);
    if (action === SETS_PLACE_NAME) this.name.setValue(payload.line);
    if (action === SETS_PLACE_NOTES) this.notes.setValue(payload.line);
    if (action === ADDS_PLACE) this.change(() => this.loom.addPlace(this.newName.read()), () => { this.newName.setValue(""); return "Added"; });
    if (action === SAVES_PLACE) this.change(() => this.loom.savePlace(payload.id, { name: this.name.read(), notes: this.notes.read() }), () => "Saved");
    if (action === ASKS_TO_REMOVE_PLACE) this.asking.setValue(true);
    if (action === KEEPS_PLACE || action === REMOVES_PLACE) this.asking.setValue(false);
    if (action === REMOVES_PLACE) this.change(() => this.loom.deletePlace(payload.id), () => "Place removed; what was at it stays");
    return null;
  }

  /** A place's page opened: its name and notes ready to change. */
  open(placeId) {
    const place = this.account.weave.read().places.get(placeId);
    this.name.setValue(place?.name ?? "");
    this.notes.setValue(place?.notes ?? "");
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
    ui.each(list, (held) => ui.pressable(OPENS_PLACE, held.map((p) => ({ parameter: p?.id ?? "" })), [ui.row([
      ui.text(held.map((p) => p?.name ?? ""), "PersonName").grow(),
      ui.text(ui.bound(() => Phrase.counted("%d thing", "%d things", account.weave.read().atPlace(held.read()?.id).length)), "Quiet"),
    ], "PersonRow")], `${CARD} ListItem`).goesTo(PLACE), (p) => p.id, "List"),
  ]);
}

export function describePlace(ui, places, account, timeline, asking) {
  const placeId = ui.parameter(PLACE);
  const place = ui.bound(() => account.weave.read().places.get(placeId.read()) ?? null);
  const mine = ui.bound(() => place.read()?.owner === account.weave.read().meId);
  const at = ui.bound(() => account.weave.read().atPlace(placeId.read()));
  return ui.screen(PLACE, [
    ui.when(place, ui.column([
      ui.text(place.map((p) => p?.name ?? ""), "Title"),
      ui.text(place.map((p) => p?.notes ?? ""), "Words").wraps().hidesEmpty(),
      ui.when(mine, ui.row([ui.button(ADDS_MEMORY, { with: placeId.map((id) => `memory:new:place:${id}`), goes_to: EDIT })], "Actions")),
      heading(ui, "Everything here"),
      timeline(at, Phrase.of("Nothing here yet.")),
      ui.when(mine, ui.column([
        heading(ui, "Change the place"),
        ui.field(SAVES_PLACE, "", { label: Phrase.of("Its name"), changes: SETS_PLACE_NAME, shows: places.name, carries: (line) => ({ line, id: placeId.read() }) }),
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
        describeMerge(ui, asking, account, "place", placeId),
        problem(ui, asking.problem),
        notice(ui, asking.notice),
      ])),
    ]), ui.text(Phrase.of("This place isn't one you can see."), "Quiet")),
  ], null, { on_fill: () => places.open(placeId.read()) });
}
