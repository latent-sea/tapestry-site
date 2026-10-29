// Find on Tapestry (backend.sql, "find on Tapestry"): what anyone shared with
// everyone on Tapestry - memories, events, periods - found by its words, its
// place, its owner's name or its year. Opened, it is among what the member
// sees: an event they were at too, they ask to be at; a memory, they comment on.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=266a8ca37beb";
import { CARD } from "./look/look.js?v=266a8ca37beb";
import { notice, problem } from "./parts.js?v=266a8ca37beb";
import { sayWhen } from "./when.js?v=266a8ca37beb";

export const FIND = "find";
export const TYPES_FINDING = "types_what_to_find_on_tapestry";
export const FINDS = "finds_on_tapestry";
export const OPENS_FOUND = "opens_one_found";

export const WORDS = {
  [TYPES_FINDING]: ["What to find"],
  [FINDS]: ["Find"],
  [OPENS_FOUND]: ["Open"],
};

const KIND_SAID = { memory: "Memory", event: "Event", period: "Period" };

export class Finder extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.looked = this.value("");
    this.found = this.value(null); // what was found: a list, or null before anything is looked for
    this.busy = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
  }

  answers() { return Object.keys(WORDS); }

  would(action) {
    if (this.busy.read() && action !== TYPES_FINDING) return Phrase.of("Looking");
    if (action === FINDS && !this.looked.read().trim()) return Phrase.of("Type what to find first");
    return null;
  }

  told(action, payload) {
    this.problem.setValue("");
    if (action === TYPES_FINDING) this.looked.setValue(payload.line);
    if (action === FINDS) this.find();
    if (action === OPENS_FOUND) this.open(payload.kind, payload.id);
    return null;
  }

  /** Signed out: nothing of the last member's stays for the next. */
  reset() {
    this.looked.setValue("");
    this.found.setValue(null);
  }

  async find() {
    this.busy.setValue(true);
    const found = await this.loom.findPublic(this.looked.read());
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!found.ok) { this.problem.setValue(found.error); return; }
    this.found.setValue(found.data ?? []);
  }

  /** One found, opened: among what the member sees from now on, then shown. */
  async open(kind, id) {
    this.busy.setValue(true);
    const looked = await this.loom.look(kind, id);
    if (looked.ok) await this.account.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!looked.ok) { this.problem.setValue(looked.error); return; }
    location.hash = `#${kind}/${id}`;
  }
}

/** What one found says of itself: what it is, when, where, and whose. */
function saidOf(found) {
  const when = found?.starts ? sayWhen({ date: found.starts, precision: found.starts_precision ?? "day" }) : "";
  return [KIND_SAID[found?.kind] ?? "", when, found?.town ?? "", found?.owner_name ? `${found.owner_name}'s` : ""].filter(Boolean).join(" · ");
}

export function describeFind(ui, finder) {
  const found = finder.found.map((f) => f ?? []);
  return ui.screen(FIND, [
    ui.text(Phrase.of("Find on Tapestry"), "Title"),
    ui.text(Phrase.of("What anyone has shared with everyone on Tapestry: memories, events and periods. Find one by its words, its place, whose it is, or its year - a concert, a wedding, a school. Open an event you were at too, and ask to be at it."), "Hint").wraps(),
    ui.row([
      ui.field(FINDS, "", { changes: TYPES_FINDING, shows: finder.looked, placeholder: Phrase.of("e.g. Glastonbury 2019") }).grow(),
      ui.button(FINDS),
    ], "AddRow"),
    problem(ui, finder.problem),
    notice(ui, finder.notice),
    ui.when(finder.found.map((f) => Array.isArray(f) && f.length === 0), ui.text(Phrase.of("Nothing shared with everyone holds that."), "Quiet").wraps()),
    ui.each(found, (held) => ui.pressable(OPENS_FOUND, held.map((f) => ({ kind: f?.kind ?? "", id: f?.id ?? "" })), [ui.column([
      ui.text(held.map((f) => f?.title ?? ""), "PersonName").wraps(),
      ui.text(held.map((f) => saidOf(f)), "Quiet").wraps(),
    ])], `${CARD} ListItem`), (f) => `${f.kind}:${f.id}`, "List"),
  ]);
}
