// "Part of something bigger?", in the editor of a memory of the member's own:
// one sheet, five plain choices, each one step -
//   put it in an event they have (theirs, or one they were at), those around
//     its time offered at once, others found by typing;
//   start a new event with it in it - the memory stays, inside it;
//   turn it into an event - the memory is gone, its words and pictures with it,
//     said first;
//   put it in a period of their life, those it falls within offered at once;
//   turn it into a period - the memory replaced, or kept during it when a
//     period can't hold what it has, said first.
// Done, the sheet closes and the editor says what it is part of, each a
// button with an X to take it out; all of it kept when it is saved. The
// memory's own page only says what it is part of, each opening it.

import { Controller, Phrase, Themes, Ui } from "./gd_chime/gd_chime.js?v=0d7a1a5b1cb2";
import { DANGER, LINK } from "./look/look.js?v=0d7a1a5b1cb2";
import { few } from "./parts.js?v=0d7a1a5b1cb2";
import { yearsOf } from "./woven.js?v=0d7a1a5b1cb2";
import { CLEARS_NEW_EVENT, DROPS_EVENT, DROPS_PERIOD } from "./editor.js?v=0d7a1a5b1cb2";

export const OPENS_BIGGER = "opens_part_of_something_bigger";
export const CHOOSES_WAY = "chooses_how_it_is_part_of_something_bigger";
export const BACK_TO_WAYS = "goes_back_to_the_choices";
export const FINDS_EVENT = "finds_an_event_to_put_it_in";
export const PUTS_IN_EVENT = "puts_it_in_that_event";
export const FINDS_PERIOD = "finds_a_period_to_put_it_in";
export const PUTS_IN_PERIOD = "puts_it_in_that_period";
export const NAMES_IT = "names_what_it_becomes";
export const STARTS_EVENT = "starts_a_new_event_with_it_in_it";
export const TURNS_INTO_EVENT = "turns_it_into_an_event";
export const CHOOSES_KIND = "chooses_the_periods_kind";
export const TURNS_INTO_PERIOD = "turns_it_into_a_period";
export const MAKES_PERIOD = "makes_a_new_period_with_it_in_it";

export const WORDS = {
  [OPENS_BIGGER]: ["Part of something bigger?"],
  [CHOOSES_WAY]: ["Choose this"],
  [BACK_TO_WAYS]: ["Back"],
  [FINDS_EVENT]: ["Find another event"],
  [PUTS_IN_EVENT]: ["Put it in this event"],
  [FINDS_PERIOD]: ["Find another period"],
  [PUTS_IN_PERIOD]: ["Put it in this period"],
  [NAMES_IT]: ["Its name"],
  [STARTS_EVENT]: ["Create the event"],
  [TURNS_INTO_EVENT]: ["Yes, turn it into an event"],
  [CHOOSES_KIND]: ["This kind"],
  [TURNS_INTO_PERIOD]: ["Yes, turn it into a period"],
  [MAKES_PERIOD]: ["Make this period"],
};

/** The five ways, in the sheet's order: [way, what it is, what it does]. */
export const WAYS = [
  ["event", "Put it in an event", "One of yours, or one you were at"],
  ["new", "Start a new event with it in it", "A new event with this memory inside it. Others who were there can add theirs."],
  ["turn", "Turn it into an event", "The memory becomes the event, and is gone - its words and pictures with it"],
  ["period", "Put it in a period of your life", "A job, a house, school - a stretch it was during"],
  ["turnPeriod", "Turn it into a period", "The memory becomes a period over its time"],
];

const SHOWN = 8;
const words = (line) => String(line ?? "").toLowerCase().split(/\s+/).filter(Boolean);

export class Bigger extends Controller {
  /** close() takes the sheet down. */
  constructor(chimes, account, close) {
    super(chimes);
    this.account = account;
    this.close = close;
    this.way = this.value(""); // "" while choosing; else one of WAYS
    this.eventLine = this.value("");
    this.periodLine = this.value("");
    this.name = this.value("");
    this.kind = this.value("");
    this.editor = null; // the editor, handed over by the app
  }

  answers() { return Object.keys(WORDS); }

  memory() { return this.draft(); }

  /** The memory being written, as far as what it is part of goes: its words, pictures, time, event and periods as they stand. */
  draft() {
    const e = this.editor;
    const saved = e.id.read() ? this.account.weave.read().memories.get(e.id.read()) : null;
    return { id: e.id.read() ?? "", title: e.title.read(), body: e.text.read(), starts: e.span().starts?.date ?? null,
      event_id: e.eventId.read() ?? (e.newEvent.read() ? "new" : null), period_ids: e.periodIds.read(),
      pictures: [...e.pictures.read(), ...e.added.read()], links: e.links.read(), comments: saved?.comments ?? [] };
  }

  would(action, payload) {
    if ([STARTS_EVENT, TURNS_INTO_EVENT, TURNS_INTO_PERIOD].includes(action) && !this.name.read().trim()) return Phrase.of("Give it a name");
    if (action === CHOOSES_WAY && payload?.way !== "period" && payload?.way !== "event" && !this.memory()?.starts) return Phrase.of("Give it a date first");
    if (action === CHOOSES_WAY && payload?.way === "turn" && this.memory()?.event_id) return Phrase.of("Take it out of its event first");
    // a new period is made over its time: one of that name already is chosen whatever its time
    if (action === MAKES_PERIOD && !this.memory()?.starts && !this.namedPeriod()) return Phrase.of("Give it a date first");
    return null;
  }

  told(action, payload) {
    if (action === OPENS_BIGGER) {
      // in an event already: straight to its periods
      this.way.setValue(payload.way ?? "");
      this.eventLine.setValue("");
      this.periodLine.setValue("");
    }
    if (action === CHOOSES_WAY) {
      this.way.setValue(payload.way);
      const memory = this.memory();
      this.name.setValue(memory?.title || (memory?.body ?? "").trim().split("\n")[0].slice(0, 200));
      this.kind.setValue("");
    }
    if (action === BACK_TO_WAYS) this.way.setValue("");
    if (action === FINDS_EVENT) this.eventLine.setValue(payload.line);
    if (action === FINDS_PERIOD) this.periodLine.setValue(payload.line);
    if (action === NAMES_IT) this.name.setValue(payload.line);
    if (action === CHOOSES_KIND) this.kind.setValue(payload.type);
    // into the draft, kept when it is saved
    if ([PUTS_IN_EVENT, PUTS_IN_PERIOD, STARTS_EVENT, TURNS_INTO_EVENT, TURNS_INTO_PERIOD, MAKES_PERIOD].includes(action)) {
      const e = this.editor;
      if (action === PUTS_IN_EVENT) { e.eventId.setValue(payload.event); e.newEvent.setValue(""); }
      if (action === PUTS_IN_PERIOD) e.periodIds.update((ids) => (ids.includes(payload.period) ? ids : [...ids, payload.period]));
      if (action === STARTS_EVENT) { e.newEvent.setValue(this.name.read().trim()); e.eventId.setValue(null); }
      if (action === TURNS_INTO_EVENT) e.turnInto("event", this.name.read().trim(), "");
      if (action === TURNS_INTO_PERIOD) e.turnInto("period", this.name.read().trim(), this.kind.read());
      if (action === MAKES_PERIOD) e.addPeriod(this.periodLine.read().trim());
      this.way.setValue("");
      this.close();
    }
    return null;
  }

  /** One of the member's own periods by the name typed, if there is one. */
  namedPeriod() {
    const weave = this.account.weave.read();
    const named = this.periodLine.read().trim().toLowerCase();
    return weave.data.periods.find((p) => p.owner === weave.meId && p.title.toLowerCase() === named) ?? null;
  }

  /** The draft's time, in years: { from, to }, or null with none. */
  spanOf() {
    const { starts, ends } = this.editor.span();
    return starts?.date ? { from: yearsOf(starts), to: ends?.date ? yearsOf(ends) : yearsOf(starts) } : null;
  }

  /** The events it may go in: around its time at once (two years either side, nearest first), or those holding what is typed. */
  events() {
    const weave = this.account.weave.read();
    const memory = this.memory();
    const typed = words(this.eventLine.read());
    const span = this.spanOf();
    const all = weave.data.events.filter((e) => e.id !== memory?.event_id && weave.mayAddTo(e.id)).map((e) => weave.entry("event", e))
      .map((e) => ({ id: e.id, label: `${e.title}${e.said ? ` · ${e.said}` : ""}`, title: e.title, at: e.when?.date ? yearsOf(e.when) : null }));
    if (typed.length) return all.filter((e) => typed.every((w) => e.title.toLowerCase().includes(w))).slice(0, SHOWN);
    if (!span) return [];
    return all.filter((e) => e.at !== null && Math.abs(e.at - span.from) <= 2).sort((a, b) => Math.abs(a.at - span.from) - Math.abs(b.at - span.from)).slice(0, SHOWN);
  }

  /** The periods it may go in: those it falls within at once, or those holding what is typed. */
  periods() {
    const weave = this.account.weave.read();
    const memory = this.memory();
    const typed = words(this.periodLine.read());
    const span = this.spanOf();
    const inAlready = new Set(memory?.period_ids ?? []);
    const now = new Date().getFullYear() + 1;
    const all = weave.data.periods.filter((p) => !inAlready.has(p.id) && weave.isAtPeriod(p, weave.meId)).map((p) => weave.entry("period", p))
      .map((p) => ({ id: p.id, label: `${p.title}${p.said ? ` · ${p.said}` : ""}`, title: p.title,
        from: p.when?.date ? yearsOf(p.when) : null, to: p.until?.date ? yearsOf(p.until) + 1 : now }));
    if (typed.length) return all.filter((p) => typed.every((w) => p.title.toLowerCase().includes(w))).slice(0, SHOWN);
    if (!span) return [];
    return all.filter((p) => p.from !== null && p.from <= span.to && p.to >= span.from).slice(0, SHOWN);
  }

  /** What turning it into an event loses, said: its words, pictures, links and comments, as many as it has. */
  lost() {
    const memory = this.memory();
    if (!memory) return "";
    const has = [(memory.body ?? "").trim() && "its words", (memory.pictures ?? []).length && "its pictures", (memory.links ?? []).length && "its links",
      (memory.comments ?? []).length && "its comments"].filter(Boolean);
    if (!has.length) return Phrase.of("The memory is replaced by the event.");
    const listed = has.length === 1 ? has[0] : `${has.slice(0, -1).join(", ")} and ${has.at(-1)}`;
    return Phrase.with("The memory is replaced by the event. %s will be lost: an event can't hold them.", [listed.charAt(0).toUpperCase() + listed.slice(1)]);
  }

  /** What turning it into a period does: the memory replaced, or kept during it when a period can't hold what it has. */
  periodSaid() {
    const m = this.memory();
    const kept = !!m && (!!m.event_id || (m.links ?? []).length > 0 || (m.comments ?? []).length > 0 || (m.pictures ?? []).length > 0 || (m.body ?? "").length > 5000);
    return Phrase.of(kept ? "A period can't hold its pictures, links or comments, so the memory stays too, during the period."
      : "The memory is replaced by the period, its words kept as the period's notes.");
  }
}

/** The sheet: the five ways, then the one chosen, one step. */
export function describeBigger(ui, bigger, account) {
  const way = bigger.way;
  const step = (name, content) => ui.when(way.map((w) => w === name), ui.column(content, "BiggerStep"));
  const heading = (name) => ui.text(Phrase.of(WAYS.find(([w]) => w === name)[1]), "Title");
  const back2 = () => ui.pressable(BACK_TO_WAYS, {}, [ui.text(ui.words(BACK_TO_WAYS), Themes.FACE)], "PlainLink");
  const name = (placeholder) => ui.field(NAMES_IT, "", { changes: NAMES_IT, shows: bigger.name, label: Phrase.of("Its name"), placeholder: Phrase.of(placeholder) });
  const list = (items, action, payload, empty) => ui.column([
    ui.each(items, (held) => ui.pressable(action, held.map(payload), [ui.text(held.map((x) => x?.label ?? ""), "MatchWords")], "Match"), (x) => x.id, "Matches"),
    ui.when(items.map((l) => !l.length), ui.text(empty, "Quiet").wraps()),
  ]);
  const events = ui.bound(() => bigger.events());
  const periods = ui.bound(() => bigger.periods());
  return ui.popUp("bigger", () => ui.column([
    step("", [
      ui.text(Phrase.of("Part of something bigger?"), "Title"),
      ...WAYS.map(([name, title, line]) => ui.pressable(CHOOSES_WAY, { way: name }, [ui.text(Phrase.of(title), "AddChoiceTitle"), ui.text(Phrase.of(line), "AddChoiceLine").wraps()],
        "AddChoice")),
      // a way that can't be taken now says why, rather than vanishing
      ui.when(ui.bound(() => !bigger.memory()?.starts), ui.text(Phrase.of("Give it a date first to start or turn it into an event or a period."), "Hint").wraps()),
      ui.when(ui.bound(() => !!bigger.memory()?.event_id), ui.text(Phrase.of("It is part of an event already: take it out of that first to turn it into one."), "Hint").wraps()),
      ui.pressable(Ui.CLOSES, {}, [ui.text(Phrase.of("Cancel"), Themes.FACE)], "PlainLink"),
    ]),
    step("event", [
      heading("event"),
      ui.text(ui.bound(() => Phrase.of(bigger.eventLine.read().trim() ? "Found:" : "Your events around its time:")), "Hint"),
      list(events, PUTS_IN_EVENT, (e) => ({ event: e?.id ?? "" }), ui.bound(() => Phrase.of(bigger.eventLine.read().trim() ? "None of your events by that name." : "None around its time: find one by its name."))),
      ui.field(FINDS_EVENT, "", { changes: FINDS_EVENT, shows: bigger.eventLine, label: Phrase.of("Or find another: type its name") }),
      back2(),
    ]),
    step("new", [
      heading("new"),
      ui.text(Phrase.of("A new event with this memory inside it, at its time and place, with its people. Others who were there can add their own memories to it."), "Hint").wraps(),
      name("e.g. Lake picnic"),
      ui.button(STARTS_EVENT),
      back2(),
    ]),
    step("turn", [
      heading("turn"),
      ui.text(ui.bound(() => bigger.lost()), "Warn").wraps(),
      ui.text(Phrase.of("The event keeps its title, time, place, people and periods."), "Hint").wraps(),
      name("e.g. Sam's 40th"),
      ui.button(TURNS_INTO_EVENT, { style: DANGER }),
      back2(),
    ]),
    step("period", [
      heading("period"),
      ui.text(ui.bound(() => Phrase.of(bigger.periodLine.read().trim() ? "Found:" : "Your periods it falls within:")), "Hint"),
      list(periods, PUTS_IN_PERIOD, (p) => ({ period: p?.id ?? "" }), ui.bound(() => Phrase.of(bigger.periodLine.read().trim() ? "None of your periods by that name." : "None around its time: find one by its name."))),
      ui.field(FINDS_PERIOD, "", { changes: FINDS_PERIOD, shows: bigger.periodLine, label: Phrase.of("Or find another: type its name") }),
      // a name typed that is none of theirs: a new period by that name, over its time for now
      ui.when(ui.bound(() => !!bigger.periodLine.read().trim() && !bigger.periods().some((p) => p.title.toLowerCase() === bigger.periodLine.read().trim().toLowerCase())),
        ui.pressable(MAKES_PERIOD, {}, [ui.text(ui.bound(() => Phrase.with("Make a new period: “%s”", [bigger.periodLine.read().trim()])), Themes.FACE)], LINK)),
      // come straight here (a memory in an event), Back closes the sheet; else back to the ways
      ui.when(ui.bound(() => !!bigger.memory()?.event_id), ui.pressable(Ui.CLOSES, {}, [ui.text(ui.words(BACK_TO_WAYS), Themes.FACE)], "PlainLink"), back2()),
    ]),
    step("turnPeriod", [
      heading("turnPeriod"),
      ui.text(ui.bound(() => bigger.periodSaid()), "Warn").wraps(),
      name("e.g. Living in Leeds"),
      ui.text(Phrase.of("What kind of time"), "FieldName"),
      few(ui, "bigger-period-kinds", account.weave.map((w) => [...w.periodKinds.map((k) => ({ type: k.name, said: k.name })), { type: "", said: "None" }]), (k) => k.said,
        (held) => ui.pressable(CHOOSES_KIND, held.map((k) => ({ type: k?.type ?? "" })), [ui.text(held.map((k) => k?.said ?? ""), "Small")], "Segment")
          .currentWhile(ui.bound(() => bigger.kind.read() === (held.read()?.type ?? ""))),
        { finds: "Find a kind by its name", keyOf: (k) => k.type || "none", style: "Segments", keep: (k) => k.type === bigger.kind.read() }),
      ui.button(TURNS_INTO_PERIOD, { style: DANGER }),
      back2(),
    ]),
  ], "BiggerSheet"));
}

/** Take it out, as an X on the right of what it takes it out of: its words there for a reader who can't see it. */
const cross = (ui, action) => [ui.text("✕", "TakeOutMark"), ui.text(ui.words(action), "SeenNot")];

/** On the memory's page: the event and the periods it is part of, each a button opening it. Changed in Edit alone. */
export function describePartOf(ui, account, memoryId) {
  const memory = ui.bound(() => account.weave.read().memories.get(memoryId.read()) ?? null);
  const event = ui.bound(() => { const m = memory.read(); return m?.event_id ? account.weave.read().events.get(m.event_id) ?? null : null; });
  const periods = ui.bound(() => (memory.read()?.period_ids ?? []).map((id) => account.weave.read().periods.get(id)).filter(Boolean));
  return ui.column([
    ui.when(event, ui.pressable("opens_it", ui.bound(() => ({ parameter: `event:${event.read()?.id ?? ""}` })),
      [ui.text(ui.bound(() => Phrase.with("Part of %s%s", [event.read()?.title ?? "", memory.read()?.approval === "waiting" ? ", waiting to be approved" : ""])), "LinkWords")],
      "Link PartEvent").goesTo("item")),
    ui.each(periods, (held) => ui.pressable("opens_it", held.map((p) => ({ parameter: `period:${p?.id ?? ""}` })),
      [ui.text(held.map((p) => Phrase.with("During %s", [p?.title ?? ""])), "LinkWords")], "Link PartPeriod").goesTo("item"), (p) => p.id, "PartOf"),
  ], "PartOfAll");
}

/** The opener's words: Part of something bigger? while it is part of nothing, Part of something else? once it is. */
const openerSaid = (partOfAnything) => Phrase.of(partOfAnything ? "Part of something else?" : "Part of something bigger?");

/**
 * In the editor: what the draft is part of, each a button with an X - kept when it is saved - and the
 * sheet to choose more from, its choices going into the draft.
 */
export function describeEditPartOf(ui, bigger, editor, account, sheet) {
  const weave = account.weave;
  const event = ui.bound(() => (editor.eventId.read() ? weave.read().events.get(editor.eventId.read()) ?? null : null));
  const periods = ui.bound(() => editor.periodIds.read().map((id) => weave.read().periods.get(id)).filter(Boolean));
  const any = ui.bound(() => !!editor.eventId.read() || !!editor.newEvent.read() || editor.periodIds.read().length > 0);
  const chip = (words, action, payload, look) => ui.row([
    ui.text(words, "PartWords"),
    ui.pressable(action, payload, cross(ui, action), "TakeOut"),
  ], `PartOfRow ${look}`);
  return ui.when(editor.kind.map((k) => k === "memory"), ui.column([
    ui.when(event, chip(ui.bound(() => Phrase.with("Part of %s", [event.read()?.title ?? ""])), DROPS_EVENT, {}, "PartEvent")),
    ui.when(editor.newEvent, chip(ui.bound(() => Phrase.with("Part of %s (new)", [editor.newEvent.read()])), CLEARS_NEW_EVENT, {}, "PartEvent")),
    ui.each(periods, (held) => chip(held.map((p) => Phrase.with("During %s", [p?.title ?? ""])), DROPS_PERIOD, held.map((p) => ({ id: p?.id ?? "" })), "PartPeriod"),
      (p) => p.id, "PartOf"),
    ui.pressable(OPENS_BIGGER, ui.bound(() => ({ way: editor.eventId.read() || editor.newEvent.read() ? "period" : "" })),
      [ui.text(any.map((a) => openerSaid(a)), "LinkWords"), ui.text("›", "RowMark")], "BiggerButton").opens(sheet),
  ], "PartOfAll"));
}
