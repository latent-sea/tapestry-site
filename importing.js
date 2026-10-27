// Bringing in a list: memories written down elsewhere, pasted in at once.
// The list goes year by year of a life, birthday to birthday - a line like
// "84/85 3" (or "91/92 - 10") starts an age; one like "88/89" alone has its
// age worked out from the years. Every line under it is a memory of that
// age (when.js: from that birthday to the day before the next, the edges of
// a guess); a line indented under one is more of it. They are seen by only
// the member unless they choose otherwise first, and adding twice adds
// nothing twice.

import { Controller, Phrase, Themes } from "./gd_chime/gd_chime.js?v=eba5a4f179db";
import { heading, notice, problem } from "./parts.js?v=eba5a4f179db";
import { ACTION } from "./look/look.js?v=eba5a4f179db";
import { AUDIENCES } from "./weave.js?v=eba5a4f179db";
import { parseSpan } from "./when.js?v=eba5a4f179db";

export const IMPORT = "import";

export const SETS_LIST = "sets_the_list";
export const SETS_LIST_AUDIENCE = "sets_who_sees_the_list";
export const ADDS_LIST = "adds_the_list";

export const WORDS = {
  [SETS_LIST]: ["The list"],
  [SETS_LIST_AUDIENCE]: ["Choose who sees them"],
  [ADDS_LIST]: ["Add them"],
};

const year = (two) => (two.length === 4 ? Number(two) : Number(two) + (Number(two) >= 30 ? 1900 : 2000));

/**
 * A list read: { ages: [{ age, said, memories: [body] }], count, error }.
 * An age's line is two years joined by "/" ("84/85", "99/0", "1984/1985"),
 * then its age if given ("3", "- 10"); a memory is any other line, and a
 * line indented under it is more of it.
 */
export function readList(text) {
  const ages = [];
  let bornYear = null;
  let last = null;
  for (const raw of String(text ?? "").replace(/\t/g, "  ").split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const header = raw.trim().match(/^(\d{1,4})\s*\/\s*(\d{1,4})\s*(?:[-–:]\s*)?(\d{1,3})?\s*$/);
    if (header) {
      const from = year(header[1]);
      let age = header[3] !== undefined ? Number(header[3]) : null;
      if (age !== null) bornYear = from - age;
      else if (bornYear !== null) age = from - bornYear;
      else if (ages.length) age = ages.at(-1).age + 1;
      ages.push({ age, said: raw.trim(), memories: [] });
      last = null;
      continue;
    }
    if (!ages.length) return { ages: [], count: 0, error: "Start the list with an age's line, like “81/82 0”, then its memories under it." };
    const line = raw.trim();
    const indented = /^\s/.test(raw) && last !== null;
    if (indented) ages.at(-1).memories[last] += `\n${line}`;
    else { ages.at(-1).memories.push(line); last = ages.at(-1).memories.length - 1; }
  }
  const unknown = ages.find((a) => a.age === null);
  if (unknown) return { ages, count: 0, error: Phrase.with("“%s” has no age, and none before it says one: write it, like “84/85 3”.", [unknown.said]) };
  return { ages, count: ages.reduce((n, a) => n + a.memories.length, 0), error: "" };
}

export class Importer extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.text = this.value("");
    this.audience = this.value("me");
    this.busy = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
  }

  answers() { return Object.keys(WORDS); }

  would(action) {
    if (action !== ADDS_LIST) return null;
    if (!this.account.weave.read().writes) return Phrase.of("Keeping your own thread is part of the paid plan");
    if (this.busy.read()) return Phrase.of("Adding");
    const read = readList(this.text.read());
    if (read.error) return Phrase.of("First fix the list");
    if (!read.count) return Phrase.of("Paste a list first");
    if (!this.account.weave.read().born) return Phrase.of("First add your birthday in You");
    return null;
  }

  told(action, payload) {
    if (action === SETS_LIST) { this.text.setValue(payload.line); this.notice.setValue(""); }
    if (action === SETS_LIST_AUDIENCE) this.audience.setValue(payload.audience);
    if (action === ADDS_LIST) this.add();
    return null;
  }

  /** Every memory of the list added, one by one, saying how far it has got; one already on the thread, the same at the same age, is not added again. */
  async add() {
    const weave = this.account.weave.read();
    const born = weave.born;
    const { ages } = readList(this.text.read());
    const total = ages.reduce((n, a) => n + a.memories.length, 0);
    // a long memory is loaded cut short to its first 2000: each is told apart by as much
    const said = (starts, body) => `${starts}|${body.slice(0, 2000)}`;
    const kept = new Set(weave.data.memories.filter((m) => m.owner === weave.meId).map((m) => said(m.starts, m.body)));
    this.busy.setValue(true);
    this.problem.setValue("");
    let added = 0;
    let done = 0;
    for (const { age, memories } of ages) {
      const { starts, ends } = parseSpan(`age ${age}`, new Date(), born);
      for (const body of memories) {
        done++;
        if (!starts || kept.has(said(starts.date, body))) continue;
        const saved = await this.loom.saveMemory({ title: "", body, audience: this.audience.read(), tags: [], shares: [], links: [], period_ids: [],
          starts: starts.date, starts_precision: starts.precision, starts_about: false, starts_time: "",
          ends: ends.date, ends_precision: ends.precision, ends_about: false, ends_time: "" });
        if (this.disposed) return;
        if (!saved.ok) {
          this.problem.setValue(Phrase.with("Stopped at “%s”: %s. Press Add them again to go on - what is in already isn't added twice.", [body.split("\n")[0], saved.error]));
          break;
        }
        added++;
        kept.add(said(starts.date, body));
        this.notice.setValue(Phrase.with("Added %d of %d…", [done, total]));
      }
      if (this.problem.read()) break;
    }
    await this.account.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!this.problem.read()) {
      this.notice.setValue(added === total ? Phrase.counted("Added %d memory to your thread.", "Added %d memories to your thread.", added)
        : Phrase.with("Added %d; the other %d were on your thread already.", [added, total - added]));
    }
  }
}

/** The screen: paste the list, see it read, choose who sees it, add it. */
export function describeImport(ui, importer, account) {
  const read = importer.text.map((text) => readList(text));
  const born = account.weave.map((w) => !!w.born);
  return ui.screen(IMPORT, [
    ui.text(Phrase.of("Bring in a list"), "Title"),
    ui.text(Phrase.of("Memories written down elsewhere, a year of your life at a time. Start each year with its line - “84/85 3” is the year you were 3, from one birthday to the next - then its memories under it, one a line. A line indented under another is more of it."), "Hint").wraps(),
    ui.when(born.map((b) => !b), ui.text(Phrase.of("First add your birthday in You: each memory's time is worked out from it."), "Warn").wraps()),
    ui.area(SETS_LIST, importer.text, "TextArea ListText"),
    ui.text(read.map((r) => r.error || (r.count ? Phrase.with("Read as %d memories, from age %d to %d.", [r.count, r.ages[0].age, r.ages.at(-1).age]) : "")), "Hint").wraps().hidesEmpty(),
    ui.each(read.map((r) => (r.error ? [] : r.ages.filter((a) => a.memories.length))), (held) => ui.text(held.map((a) => Phrase.with("Age %d: %s", [a?.age ?? 0,
      (a?.memories ?? []).map((m) => m.split("\n")[0]).slice(0, 3).join(" · ") + ((a?.memories?.length ?? 0) > 3 ? ` · and ${a.memories.length - 3} more` : "")])), "Meta").wraps(),
    (a) => a.said, "ListRead"),
    heading(ui, "Who sees them"),
    ui.row(AUDIENCES.map(([value, said]) => ui.pressable(SETS_LIST_AUDIENCE, { audience: value }, [ui.text(Phrase.of(said), Themes.FACE)], "Segment")
      .currentWhile(importer.audience.map((a) => a === value))), "Segments"),
    ui.text(Phrase.of("Only you, unless you choose otherwise: you can open any of them later to share it."), "Hint").wraps(),
    ui.row([ui.button(ADDS_LIST, { style: ACTION })], "Actions"),
    problem(ui, importer.problem),
    notice(ui, importer.notice),
  ]);
}
