// The member's own settings: the name others see, their birthday (theirs
// alone: times may then be written as ages), who new things are shared with
// unless they say otherwise, the text size (on this device, as in every app
// of the factory, D-008), and signing out.

const TEXT_KEPT = "tapestry_text_size";

/** The text size chosen on this device, or the base. */
export function keptTextSize() {
  try { return Number(localStorage.getItem(TEXT_KEPT)) || 1; } catch { return 1; }
}

import { Controller, Phrase, Themes } from "./gd_chime/gd_chime.js?v=de7d6ff7adf3";
import { heading, notice, problem } from "./parts.js?v=de7d6ff7adf3";
import { AUDIENCES, CARD_PARTS } from "./weave.js?v=de7d6ff7adf3";
import { SIGNS_OUT } from "./account.js?v=de7d6ff7adf3";
import { copyOf } from "./keep.js?v=de7d6ff7adf3";
import { parseWhen, sayWhen } from "./when.js?v=de7d6ff7adf3";
import { LINK, TEXT_SIZES } from "./look/look.js?v=de7d6ff7adf3";

export const YOU = "you";

export const SETS_MY_NAME = "sets_my_name";
export const SAVES_MY_NAME = "saves_my_name";
export const SETS_DEFAULT = "sets_who_sees_new_things";
export const SETS_TEXT_SIZE = "sets_the_text_size";
export const KEEPS_COPY = "keeps_a_copy";
export const SETS_BIRTHDAY = "sets_my_birthday";
export const SHOWS_ON_CARDS = "shows_or_hides_on_cards";
export const OPENS_ADMIN = "opens_the_admin_area";
export const OPENS_IMPORT = "opens_bringing_in_a_list";
export const SAVES_BIRTHDAY = "saves_my_birthday";

export const WORDS = {
  [SETS_MY_NAME]: ["Your name"],
  [SAVES_MY_NAME]: ["Save my name"],
  [SETS_DEFAULT]: ["Choose who sees new things"],
  [SETS_TEXT_SIZE]: ["Choose the text size"],
  [KEEPS_COPY]: ["Download a copy of my thread"],
  [SETS_BIRTHDAY]: ["Your birthday"],
  [SAVES_BIRTHDAY]: ["Save my birthday"],
  [SHOWS_ON_CARDS]: ["Show it on cards"],
  [OPENS_ADMIN]: ["Admin"],
  [OPENS_IMPORT]: ["Bring in a list of memories"],
};

/** A birthday typed: { date } ("YYYY-MM-DD", or null for none), or { error }. */
export function birthdayOf(typed) {
  if (!String(typed ?? "").trim()) return { date: null };
  const read = parseWhen(typed);
  if (!read.when || read.when.precision !== "day" || read.when.about || read.when.time) return { error: "A birthday is a day: 12 June 1975" };
  return { date: read.when.date };
}

const KINDS = [["memory", "New memories"], ["event", "New events"], ["period", "New periods"]];

export class You extends Controller {
  /** sized(share) wears the look at a new text size. */
  constructor(chimes, loom, account, sized) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.sized = sized;
    this.textSize = this.value(keptTextSize());
    /** How a page is handed over to keep: saved by the browser (a probe hands its own). */
    this.saveFile = (name, text) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([text], { type: "text/html" }));
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 60 * 1000);
    };
    this.name = this.value("");
    this.birthday = this.value("");
    this.busy = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
  }

  answers() { return Object.keys(WORDS); }

  would(action) {
    if (this.busy.read() && action !== SETS_MY_NAME) return Phrase.of(action === KEEPS_COPY ? "Making your copy" : "Saving");
    if (action === SAVES_MY_NAME && !this.name.read().trim()) return Phrase.of("Your name can't be empty");
    if (action === SAVES_BIRTHDAY && birthdayOf(this.birthday.read()).error) return Phrase.of(birthdayOf(this.birthday.read()).error);
    return null;
  }

  told(action, payload) {
    this.notice.setValue("");
    if (action === SETS_MY_NAME) this.name.setValue(payload.line);
    if (action === SAVES_MY_NAME) this.change(() => this.loom.join(this.name.read().trim()), "Saved: this is the name your people see");
    if (action === KEEPS_COPY) this.keepCopy();
    if (action === SETS_BIRTHDAY) this.birthday.setValue(payload.line);
    if (action === SHOWS_ON_CARDS) {
      const shows = { ...(this.account.weave.read().me?.card_shows ?? {}) };
      shows[payload.part] = !this.account.weave.read().cardShows[payload.part];
      this.change(() => this.loom.saveDefaults({ card_shows: shows }), "");
    }
    if (action === SAVES_BIRTHDAY) {
      const { date } = birthdayOf(this.birthday.read());
      this.change(() => this.loom.saveBirthday(date), date ? "Saved: you can write times as ages now - age 12, when I was 7 to 9, in my twenties" : "Your birthday is taken off");
    }
    if (action === SETS_TEXT_SIZE) {
      this.textSize.setValue(payload.size);
      try { localStorage.setItem(TEXT_KEPT, String(payload.size)); } catch { /* this visit only */ }
      this.sized(payload.size);
    }
    if (action === SETS_DEFAULT) this.change(() => this.loom.saveDefaults({ [`${payload.kind}_audience`]: payload.audience }), "Saved");
    return null;
  }

  open() {
    const me = this.account.weave.read().me;
    this.name.setValue(me?.name ?? "");
    this.birthday.setValue(me?.birthday ? sayWhen({ date: me.birthday, precision: "day" }) : "");
  }

  /** A copy of the member's thread, with its pictures inside it, handed over as one page to keep. */
  async keepCopy() {
    this.busy.setValue(true);
    this.problem.setValue("");
    this.notice.setValue("Making your copy, with its pictures…");
    const weave = this.account.weave.read();
    const pictures = {};
    let missing = 0;
    for (const memory of weave.data.memories) {
      for (const picture of memory.pictures ?? []) {
        if (memory.owner !== weave.meId && !weave.thread(weave.meId).some((e) => e.key === `memory:${memory.id}`)) continue;
        const got = await this.loom.pictureData(this.account.address(picture.path));
        if (got.ok) pictures[picture.path] = got.data; else missing++;
      }
    }
    const day = new Date().toISOString().slice(0, 10);
    // a name in any letters, the world's own: "Zoë" stays Zoë
    const named = (weave.me?.name ?? "").toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "thread";
    this.saveFile(`tapestry-${named}-${day}.html`, copyOf(weave, pictures));
    if (this.disposed) return;
    this.busy.setValue(false);
    this.notice.setValue(missing ? `Your copy is downloading. ${missing} picture${missing === 1 ? "" : "s"} couldn't be fetched; try again later for them.`
      : "Your copy is downloading: one page that opens in any browser, pictures and all.");
  }

  async change(work, said) {
    this.busy.setValue(true);
    this.problem.setValue("");
    const done = await work();
    await this.account.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!done.ok) this.problem.setValue(done.error); else this.notice.setValue(said);
  }
}

export function describeYou(ui, you, account) {
  const me = account.weave.map((w) => w.me);
  return ui.screen(YOU, [
    ui.text(Phrase.of("You"), "Title"),
    ui.row([
      ui.field(SAVES_MY_NAME, "", { label: Phrase.of("The name your people see"), changes: SETS_MY_NAME, shows: you.name, autocomplete: "name" }).grow(),
      ui.button(SAVES_MY_NAME, { style: LINK }),
    ], "AddRow"),
    heading(ui, "Your birthday"),
    ui.text(Phrase.of("Only you see it. With it, a time can be an age - age 12, when I was 7 to 9, in my twenties - and everything says how old you were."), "Hint").wraps(),
    ui.row([
      ui.field(SAVES_BIRTHDAY, "", { label: Phrase.of("Your birthday"), changes: SETS_BIRTHDAY, shows: you.birthday, placeholder: Phrase.of("12 June 1975"), autocomplete: "bday" }).grow(),
      ui.button(SAVES_BIRTHDAY, { style: LINK }),
    ], "AddRow"),
    heading(ui, "Who sees new things"),
    ui.text(Phrase.of("What each new memory, event or period starts out shared with. You can change it on each one as you write it."), "Hint").wraps(),
    ...KINDS.map(([kind, words]) => ui.column([
      ui.text(Phrase.of(words), "FieldName"),
      ui.row(AUDIENCES.map(([value, said]) => ui.pressable(SETS_DEFAULT, { kind, audience: value }, [ui.text(Phrase.of(said), Themes.FACE)], "Segment")
        .currentWhile(me.map((m) => m?.[`${kind}_audience`] === value))), "Segments"),
    ], "Part")),
    problem(ui, you.problem),
    notice(ui, you.notice),
    heading(ui, "What cards show"),
    ui.text(Phrase.of("On your thread and everywhere else, what each card shows besides its title and when. Press one to show it or not."), "Hint").wraps(),
    ui.row(CARD_PARTS.map(([part, said]) => ui.pressable(SHOWS_ON_CARDS, { part }, [ui.text(Phrase.of(said), Themes.FACE)], "Segment")
      .currentWhile(account.weave.map((w) => w.cardShows[part]))), "Segments"),
    heading(ui, "Text size"),
    ui.row(TEXT_SIZES.map(([said, size]) => ui.pressable(SETS_TEXT_SIZE, { size }, [ui.text(Phrase.of(said), Themes.FACE)], "Segment")
      .currentWhile(you.textSize.map((s) => s === size))), "Segments"),
    heading(ui, "Bring in a list"),
    ui.text(Phrase.of("Memories written down elsewhere, year by year of your life - pasted in at once."), "Hint").wraps(),
    ui.pressable(OPENS_IMPORT, {}, [ui.text(ui.words(OPENS_IMPORT), Themes.FACE)], LINK).goesTo("import"),
    heading(ui, "Keep a copy"),
    ui.text(Phrase.of("Everything on your thread, with its pictures, as one page that opens in any browser - to keep, print or pass on."), "Hint").wraps(),
    ui.button(KEEPS_COPY, { style: LINK }),
    ui.divider(),
    ui.when(me.map((m) => !!m?.admin), ui.pressable(OPENS_ADMIN, {}, [ui.text(ui.words(OPENS_ADMIN), Themes.FACE)], LINK).goesTo("admin")),
    ui.button(SIGNS_OUT, { style: LINK }),
  ], null, { on_fill: () => you.open() });
}

