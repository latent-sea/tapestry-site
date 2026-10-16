// Today: the quickest way onto the thread - words, and a picture if there is
// one, kept as a memory of right now (today, at this minute), shared as the
// member's new memories are unless they change it. The thread is a journal
// as well as a history; anything more (who, where, which event) is the
// editor's, from the memory itself.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=40368bf32934";
import { clockOf, sayWhen } from "./when.js?v=40368bf32934";
import { notice, problem } from "./parts.js?v=40368bf32934";

export const WRITES_TODAY = "writes_about_today";
export const ADDS_TODAY_PICTURE = "adds_a_picture_to_today";
export const DROPS_TODAY_PICTURE = "drops_a_picture_from_today";
export const SAVES_TODAY = "saves_today";

export const WORDS = {
  [WRITES_TODAY]: ["What's happening?"],
  [ADDS_TODAY_PICTURE]: ["Add a picture"],
  [DROPS_TODAY_PICTURE]: ["Remove"],
  [SAVES_TODAY]: ["Keep it"],
};

const two = (n) => String(n).padStart(2, "0");
const dayOf = (at) => `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}`;

export class Journal extends Controller {
  /** clock: the moment it is now (a probe hands its own). */
  constructor(chimes, loom, account, clock = () => new Date()) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.clock = clock;
    this.text = this.value("");
    this.added = this.value([]); // { key, file, address }
    this.into = this.value(null); // a memory kept whose pictures didn't all go: the next press tries them again, into it
    this.busy = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
  }

  answers() { return Object.keys(WORDS); }

  would(action) {
    if (action === SAVES_TODAY) {
      if (this.busy.read()) return Phrase.of("Keeping it");
      if (!this.text.read().trim() && !this.added.read().length) return Phrase.of("Write something, or add a picture");
      if (this.into.read() && !this.added.read().length && !this.text.read().trim()) return Phrase.of("Write something, or add a picture");
    }
    return null;
  }

  told(action, payload) {
    this.notice.setValue("");
    if (action === WRITES_TODAY) this.text.setValue(payload.line);
    if (action === ADDS_TODAY_PICTURE) {
      if (!payload.file.type.startsWith("image/")) return Phrase.of("Please choose a picture (JPEG, PNG, WebP or GIF)");
      this.added.update((list) => [...list, { key: `today-${Date.now()}-${list.length}`, file: payload.file, address: URL.createObjectURL(payload.file) }]);
    }
    if (action === DROPS_TODAY_PICTURE) {
      const dropped = this.added.read().find((p) => p.key === payload.id);
      if (dropped) URL.revokeObjectURL(dropped.address);
      this.added.update((list) => list.filter((p) => p !== dropped));
    }
    if (action === SAVES_TODAY) this.save();
    return null;
  }

  /** Who a memory of today is seen by, before it is kept: the member's own default for new memories, with no one tagged. */
  seenBy() {
    const weave = this.account.weave.read();
    const audience = weave.defaultAudience("memory");
    const said = weave.audienceOf({ kind: "memory", audience, tags: [], eventId: null, shares: [] }).summary;
    return Phrase.with("Seen by: %s. You can change that on the memory, or for every new one in You.", [said]);
  }

  /** The pictures chosen, kept into a memory one by one: those that didn't go stay chosen. Answers whether all went. */
  async keepPictures(memoryId) {
    const waiting = [...this.added.read()];
    let position = 0;
    while (waiting.length) {
      const kept = await this.loom.addPicture(memoryId, waiting[0].file, position++);
      if (!kept.ok) { this.problem.setValue(kept.error); break; }
      URL.revokeObjectURL(waiting.shift().address);
    }
    this.added.setValue(waiting);
    return waiting.length === 0;
  }

  async save() {
    const now = this.clock();
    this.busy.setValue(true);
    this.problem.setValue("");
    // pictures that didn't go last time go into the memory already kept, not a new one
    const into = this.into.read();
    if (into && this.added.read().length) {
      const all = await this.keepPictures(into);
      if (all) this.into.setValue(null);
      if (!all || !this.text.read().trim()) {
        await this.account.load();
        this.busy.setValue(false);
        if (all) this.notice.setValue("The pictures are on it now");
        return;
      }
    }
    const [first, ...rest] = this.text.read().trim().split("\n");
    const saved = await this.loom.saveMemory({
      // a line of its own above more is its title; one line alone is all words
      title: rest.length && first.length <= 80 ? first.trim() : "", body: rest.length && first.length <= 80 ? rest.join("\n").trim() : this.text.read().trim(),
      starts: dayOf(now), starts_precision: "day", starts_about: false, starts_time: clockOf(now),
      ends: "", ends_precision: "day", ends_about: false, tags: [], shares: [],
    });
    const all = saved.ok ? await this.keepPictures(saved.data) : true;
    await this.account.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!saved.ok) { this.problem.setValue(saved.error); return; }
    this.text.setValue("");
    const at = sayWhen({ date: dayOf(now), precision: "day", time: clockOf(now) });
    if (all) this.notice.setValue(Phrase.with("Kept: %s", [at]));
    else {
      this.into.setValue(saved.data);
      this.notice.setValue(Phrase.with("Your words are kept (%s), but not every picture went. Press Keep it to try them again.", [at]));
    }
  }
}

/** The box at the top of the thread. */
export function describeToday(ui, journal) {
  return ui.surface("Card Today", [ui.column([
    ui.text(Phrase.of("Today"), "PartHeading"),
    ui.text(Phrase.of("What's happening? It goes on your thread at this minute."), "Hint").wraps(),
    ui.area(WRITES_TODAY, journal.text, "TextArea TodayWords"),
    ui.eachAcross(journal.added, (held) => ui.column([
      ui.image(held.map((p) => p?.address ?? ""), "EditThumb", Phrase.of("A picture")),
      ui.pressable(DROPS_TODAY_PICTURE, held.map((p) => ({ id: p?.key ?? "" })), [ui.text(Phrase.of("Remove"), "Small")], "FactoryLink"),
    ], "EditPicture"), (p) => p.key, "EditPictures"),
    ui.row([
      ui.button(SAVES_TODAY),
      ui.file(ADDS_TODAY_PICTURE, Phrase.of("Add a picture"), { accept: "image/*", style: "FactoryLink" }),
    ], "Actions"),
    ui.text(ui.bound(() => journal.seenBy()), "Seen").wraps(),
    problem(ui, journal.problem),
    notice(ui, journal.notice),
  ], "Part")]);
}
