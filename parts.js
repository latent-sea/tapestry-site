// Pieces several screens are made of: a thread's mark in its colour, a
// chooser (type to find, press to pick, or add what was typed), and the
// little rows of names.

import { Controller, Phrase, Themes } from "./gd_chime/gd_chime.js?v=f74905f80d78";
import { LINK } from "./look/look.js?v=f74905f80d78";

/** A thread's mark: a dot in its colour, as a picture, since a colour is the thread's own. */
export function dotOf(colour) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="${colour}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** A thread's mark drawn: the colour read from a bound value. */
export function mark(ui, colour, style = "Dot") {
  return ui.image(colour.map((c) => (c ? dotOf(c) : "")), style, "");
}

/** Names in a row, each its own chip: a bound list of words. */
export function names(ui, list, style = "Names") {
  return ui.eachAcross(list.map((held) => held ?? []), (name) => ui.text(name, "Name"), null, style);
}

/**
 * Type to find, press to pick: what is chosen as chips (each pressed to take
 * it off), a line to type into, the matches for what is typed, and - when
 * create is given - adding what was typed as new. Enter does create when
 * there is one, which picks an exact match rather than making a twin.
 * Options: label, chosen (bound [{ id, label }]), unpick, search (a bound
 * line), looks (dispatched as it is typed), matches (bound [{ id, label }]),
 * pick, create, placeholder.
 */
export function chooser(ui, options) {
  const { label, chosen = null, unpick = null, search, looks, matches, pick, create = null, placeholder = null, offered = null, offeredSaid = null } = options;
  const chips = chosen
    ? ui.eachAcross(chosen, (held) => ui.pressable(unpick, held.map((c) => ({ id: c?.id ?? "" })), [
      ui.text(held.map((c) => c?.label ?? ""), "ChipWords"), ui.text(Phrase.of("Remove"), "ChipX")], "Chip"), (c) => c.id, "Chips")
    : null;
  const found = ui.each(matches, (held) => ui.pressable(pick, held.map((m) => ({ id: m?.id ?? "" })), [
    ui.text(held.map((m) => m?.label ?? ""), "MatchWords")], "Match"), (m) => m.id, "Matches");
  const typed = search.map((line) => (line ?? "").trim() !== "");
  return ui.column([
    ui.text(label, "FieldName"),
    chips,
    ui.field(create ?? looks, "", { changes: looks, shows: search, placeholder: placeholder ?? Phrase.of("Type to find") }),
    ui.when(typed, ui.column([found, create ? ui.button(create, { style: LINK }) : null].filter(Boolean), "Found")),
    // offered before anything is typed: those that fit already, pressed to pick
    offered ? ui.when(ui.bound(() => !typed.read() && offered.read().length > 0), ui.column([
      offeredSaid ? ui.text(offeredSaid, "Hint").wraps() : null,
      ui.each(offered, (held) => ui.pressable(pick, held.map((m) => ({ id: m?.id ?? "" })), [ui.text(held.map((m) => m?.label ?? ""), "MatchWords")], "Match"), (m) => m.id, "Matches"),
    ].filter(Boolean), "Found")) : null,
  ].filter(Boolean), "Chooser");
}

// --- choices that grow: past a few, a line to type into narrows them ---

/** How many choices are shown as they are: past this, they are found by typing. */
export const MANY = 10;
export const NARROWS = "narrows_the_choices";
export const WORDS = { [NARROWS]: ["Type to find"] };

/** What is typed to narrow each list of choices, by the list's own key: kept while the page is open. */
export class Narrowing extends Controller {
  constructor(chimes) {
    super(chimes);
    this.typed = new Map();
  }

  lineOf(key) {
    if (!this.typed.has(key)) this.typed.set(key, this.value(""));
    return this.typed.get(key);
  }

  answers() { return [NARROWS]; }

  told(action, payload) {
    if (action === NARROWS) this.lineOf(payload.key).setValue(payload.line ?? "");
    return null;
  }

  /** Signed out: nothing typed stays for the next member. */
  reset() { for (const line of this.typed.values()) line.setValue(""); }
}

let narrowing = null;
/** The page's own Narrowing, made once (site.js), for every list of choices to use. */
export function narrowWith(made) { narrowing = made; }

/**
 * A list of choices that may grow: up to MANY, each as it is; past that, a line to type into, and only
 * what holds what is typed - with those kept always (keep: the ones chosen now, so they can be unchosen).
 * key names the list (one line typed for each); textOf(item) is what it is found by; finds says, in the
 * line itself, what it searches ("Find a person by name"). Options: across (a row, else a column), keyOf,
 * style, keep; browsed - a list to read rather than choose from, all of it shown until something is typed;
 * sought - one particular one looked for among them (the same person twice, who to ask): only the line,
 * however few there are, and those holding what is typed under it as it is typed - nothing offered before.
 */
export function few(ui, key, items, textOf, template, { finds, across = true, keyOf = null, style = across ? Themes.ROW : Themes.COLUMN, keep = null, browsed = false, sought = false } = {}) {
  const line = narrowing ? narrowing.lineOf(key) : null;
  const many = items.map((list) => sought || (list ?? []).length > MANY);
  // what is typed, as words, and those of the list holding every one; the kept ones apart
  const narrowed = ui.bound(() => {
    const list = items.read() ?? [];
    const kept = keep ? list.filter(keep) : [];
    const words = line ? line.read().toLowerCase().trim().split(/\s+/).filter(Boolean) : [];
    const found = words.length ? list.filter((item) => !kept.includes(item) && words.every((w) => String(textOf(item) ?? "").toLowerCase().includes(w))) : [];
    return { list, kept, typed: words.length > 0, found };
  });
  const shown = ui.bound(() => {
    const { list, kept, typed, found } = narrowed.read();
    if (sought && line) return [...kept, ...found.slice(0, MANY)];
    if (list.length <= MANY || !line || (browsed && !typed)) return list;
    return [...kept, ...(browsed ? found : found.slice(0, MANY))];
  });
  const left = ui.bound(() => {
    const { list, typed, found } = narrowed.read();
    if (sought && line) return typed && !found.length ? Phrase.of("Nothing by that name") : "";
    if (list.length <= MANY || !line) return "";
    if (!typed) return "";
    if (!found.length) return Phrase.of("None holds that");
    return found.length > MANY && !browsed ? Phrase.with("And %s more: type more to narrow them", [String(found.length - MANY)]) : "";
  });
  const made = across ? ui.eachAcross(shown, template, keyOf, style) : ui.each(shown, template, keyOf, style);
  return ui.column([
    ui.when(many, ui.field(NARROWS, "", { changes: NARROWS, shows: line ?? ui.bound(() => ""), carries: (typed) => ({ line: typed, key }), label: typeof finds === "string" ? Phrase.of(finds) : finds })),
    made,
    ui.text(left, "Hint").wraps().hidesEmpty(),
  ], `Few Few-${String(key).replace(/[^a-z0-9-]/gi, "-")}`);
}

/** A heading for a part of a screen. */
export function heading(ui, words) { return ui.text(Phrase.of(words), "PartHeading"); }

/** Words that say something went wrong, gone while there is nothing to say. */
export function problem(ui, value) { return ui.text(value, Themes.REASON).wraps().hidesEmpty(); }

/** Words that say something went right, gone while there is nothing to say. */
export function notice(ui, value) { return ui.text(value, "Notice").wraps().hidesEmpty(); }
