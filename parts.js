// Pieces several screens are made of: a thread's mark in its colour, a
// chooser (type to find, press to pick, or add what was typed), and the
// little rows of names.

import { Phrase, Themes } from "./gd_chime/gd_chime.js?v=328f3a22fb80";
import { LINK } from "./look/look.js?v=328f3a22fb80";

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
  const { label, chosen = null, unpick = null, search, looks, matches, pick, create = null, placeholder = null } = options;
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
  ].filter(Boolean), "Chooser");
}

/** A heading for a part of a screen. */
export function heading(ui, words) { return ui.text(Phrase.of(words), "PartHeading"); }

/** Words that say something went wrong, gone while there is nothing to say. */
export function problem(ui, value) { return ui.text(value, Themes.REASON).wraps().hidesEmpty(); }

/** Words that say something went right, gone while there is nothing to say. */
export function notice(ui, value) { return ui.text(value, "Notice").wraps().hidesEmpty(); }
