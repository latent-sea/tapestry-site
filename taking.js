// Put at an event or in a period by someone else (backend.sql, "on their
// life"): asked first - in Notices, and on its page - whether it goes on
// their life, and by what name: theirs for it, which only they see (a
// period Ian calls "Going out with Sam", Sam calls "Going out with Ian").
// Yes puts it on their life, timeline and tapestry; no takes them off it.
// Once on it, its page lets them change their name for it.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=e28e37da2a46";
import { ACTION, LINK } from "./look/look.js?v=e28e37da2a46";
import { notice, problem } from "./parts.js?v=e28e37da2a46";

export const TYPES_OWN_NAME = "types_my_name_for_it";
export const TAKES_ON = "puts_it_on_my_life";
export const TURNS_DOWN = "keeps_it_off_my_life";
export const RENAMES_MINE = "saves_my_name_for_it";

export const WORDS = {
  [TYPES_OWN_NAME]: ["Your name for it"],
  [TAKES_ON]: ["Yes, on my life"],
  [TURNS_DOWN]: ["No"],
  [RENAMES_MINE]: ["Save my name for it"],
};

const KIND_SAID = { event: "the event", period: "the period" };

export class Taking extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.names = this.value({}); // the member's name for each, as typed, by its key ("event:<id>")
    this.busy = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
  }

  answers() { return Object.keys(WORDS); }

  would(action) {
    if (this.busy.read() && action !== TYPES_OWN_NAME) return Phrase.of("Saving");
    return null;
  }

  told(action, payload) {
    this.problem.setValue("");
    if (action === TYPES_OWN_NAME) this.names.update((typed) => ({ ...typed, [payload.key]: payload.line }));
    if (action === TAKES_ON || action === RENAMES_MINE) this.take(payload.key, true, action === TAKES_ON ? "On your life" : "Your name for it is saved");
    if (action === TURNS_DOWN) this.take(payload.key, false, "Kept off your life");
    return null;
  }

  /** The member's name for one, as typed, else as it is called for them now. */
  nameOf(key) {
    const typed = this.names.read()[key];
    if (typed !== undefined) return typed;
    const [kind, id] = String(key).split(":");
    return ({ event: this.account.weave.read().events, period: this.account.weave.read().periods })[kind]?.get(id)?.title ?? "";
  }

  async take(key, yes, said) {
    const [kind, id] = String(key).split(":");
    this.busy.setValue(true);
    const done = await this.loom.take(kind, id, yes, yes ? this.nameOf(key) : "");
    await this.account.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!done.ok) { this.problem.setValue(done.error); return; }
    this.names.update((typed) => { const { [key]: _gone, ...rest } = typed; return rest; });
    this.notice.setValue(said);
  }
}

/** One asked: who put them at what, their name for it, yes or no. */
function question(ui, taking, held) {
  const key = held.map((e) => e?.key ?? "");
  return ui.column([
    ui.text(held.map((e) => Phrase.with("%s put you in %s “%s”. On your life?", [e?.ownerName ?? "", KIND_SAID[e?.kind] ?? "", e?.title ?? ""])), "Words").wraps(),
    ui.field(TAKES_ON, "", { label: Phrase.of("Your name for it - only you see it"), changes: TYPES_OWN_NAME,
      shows: ui.bound(() => taking.nameOf(key.read())), carries: (line) => ({ line, key: key.read() }) }),
    ui.row([
      ui.pressable(TAKES_ON, key.map((k) => ({ key: k })), [ui.text(ui.words(TAKES_ON), "Small")], ACTION),
      ui.pressable(TURNS_DOWN, key.map((k) => ({ key: k })), [ui.text(ui.words(TURNS_DOWN), "Small")], LINK),
    ], "Actions"),
  ], "Request");
}

/** In Notices: everything put on the member waiting for their yes or no. */
export function describeWaiting(ui, taking, account) {
  const waiting = account.weave.map((w) => w.waiting());
  return ui.when(waiting.map((l) => l.length > 0), ui.surface("Card Asked", [ui.column([
    ui.text(Phrase.of("Put on your life by someone else"), "PartHeading"),
    ui.each(waiting, (held) => question(ui, taking, held), (e) => e.key, "Requests"),
    problem(ui, taking.problem),
    notice(ui, taking.notice),
  ], "Part")]));
}

/** On someone else's event or period: asked, while it waits; on their life, their name for it to change. */
export function describeTaking(ui, taking, account, entry) {
  const asked = ui.bound(() => !!entry.read() && account.weave.read().waiting().some((e) => e.key === entry.read().key));
  const onLife = ui.bound(() => { const e = entry.read(); return !!e && !e.mine && e.kind !== "memory" && e.threads.includes(account.weave.read().meId); });
  const key = entry.map((e) => e?.key ?? "");
  return ui.column([
    ui.when(asked, ui.surface("Card Asked", [ui.column([question(ui, taking, entry)], "Part")])),
    ui.when(onLife, ui.row([
      ui.field(RENAMES_MINE, "", { label: Phrase.of("Your name for it - only you see it"), changes: TYPES_OWN_NAME,
        shows: ui.bound(() => taking.nameOf(key.read())), carries: (line) => ({ line, key: key.read() }) }).grow(),
      ui.pressable(RENAMES_MINE, key.map((k) => ({ key: k })), [ui.text(ui.words(RENAMES_MINE), "Small")], LINK),
    ], "AddRow")),
    problem(ui, taking.problem),
    notice(ui, taking.notice),
  ]);
}
