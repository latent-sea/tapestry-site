// The member's own settings: the name others see, their birthday (theirs
// alone: times may then be written as ages), who new things are shared with
// unless they say otherwise, the text size (on this device, as in every app
// of the factory, D-008), and signing out.

const TEXT_KEPT = "tapestry_text_size";

/** The text size chosen on this device, or the base. */
export function keptTextSize() {
  try { return Number(localStorage.getItem(TEXT_KEPT)) || 1; } catch { return 1; }
}

import { Controller, Phrase, Themes } from "./gd_chime/gd_chime.js?v=92e31c0cea85";
import { heading, notice, problem } from "./parts.js?v=92e31c0cea85";
import { AUDIENCES, CARD_PARTS, Weave, withKind, withoutKind } from "./weave.js?v=92e31c0cea85";
import { dotOf } from "./parts.js?v=92e31c0cea85";
import { SIGNS_OUT } from "./account.js?v=92e31c0cea85";
import { copyOf } from "./keep.js?v=92e31c0cea85";
import { parseWhen, sayWhen } from "./when.js?v=92e31c0cea85";
import { DANGER, LINK, TEXT_SIZES } from "./look/look.js?v=92e31c0cea85";
import { UNBLOCKS } from "./safety.js?v=92e31c0cea85";

export const YOU = "you";

export const SETS_MY_NAME = "sets_my_name";
export const SAVES_MY_NAME = "saves_my_name";
export const SETS_DEFAULT = "sets_who_sees_new_things";
export const SETS_TEXT_SIZE = "sets_the_text_size";
export const KEEPS_COPY = "keeps_a_copy";
export const SETS_BIRTHDAY = "sets_my_birthday";
export const SHOWS_ON_CARDS = "shows_or_hides_on_cards";
export const SETS_EMAILS = "sets_whether_emailed";
export const TYPES_YOUR_KIND = "types_a_kind_of_period_of_your_own";
export const ADDS_YOUR_KIND = "adds_a_kind_of_period_of_your_own";
export const TAKES_OFF_KIND = "takes_off_a_kind_of_period";
export const TYPES_EVENT_KIND = "types_a_kind_of_event_of_your_own";
export const ADDS_EVENT_KIND = "adds_a_kind_of_event_of_your_own";
export const TAKES_OFF_EVENT_KIND = "takes_off_a_kind_of_event";
export const OPENS_ADMIN = "opens_the_admin_area";
export const OPENS_IMPORT = "opens_bringing_in_a_list";
export const SAVES_BIRTHDAY = "saves_my_birthday";
export const ASKS_TO_DELETE_ME = "asks_before_deleting_my_account";
export const DELETES_ME = "deletes_my_account";
export const KEEPS_ME = "keeps_my_account";

export const WORDS = {
  [SETS_MY_NAME]: ["Your name"],
  [SAVES_MY_NAME]: ["Save my name"],
  [SETS_DEFAULT]: ["Choose who sees new things"],
  [SETS_TEXT_SIZE]: ["Choose the text size"],
  [KEEPS_COPY]: ["Download a copy of my thread"],
  [SETS_BIRTHDAY]: ["Your birthday"],
  [SAVES_BIRTHDAY]: ["Save my birthday"],
  [SHOWS_ON_CARDS]: ["Show it on cards"],
  [SETS_EMAILS]: ["Choose whether you are emailed"],
  [TYPES_YOUR_KIND]: ["A kind of period"],
  [ADDS_YOUR_KIND]: ["Add it"],
  [TAKES_OFF_KIND]: ["Take off this kind"],
  [TYPES_EVENT_KIND]: ["A kind of event"],
  [ADDS_EVENT_KIND]: ["Add this kind"],
  [TAKES_OFF_EVENT_KIND]: ["Take off this kind"],
  [OPENS_ADMIN]: ["Admin"],
  [OPENS_IMPORT]: ["Bring in a list of memories"],
  [ASKS_TO_DELETE_ME]: ["Delete my account"],
  [DELETES_ME]: ["Yes, delete everything"],
  [KEEPS_ME]: ["No, keep it"],
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
    this.newKind = this.value("");
    this.newEventKind = this.value("");
    this.deleting = this.value(false); // asked, before the member's account is deleted
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
    if (action === ASKS_TO_DELETE_ME) this.deleting.setValue(true);
    if (action === KEEPS_ME) this.deleting.setValue(false);
    if (action === DELETES_ME) { this.deleting.setValue(false); this.deleteMe(); }
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
    if (action === TYPES_YOUR_KIND) this.newKind.setValue(payload.line);
    // a kind of period made or taken off: kept on them; a kind taken off stays on its periods, grey, until changed there
    if (action === ADDS_YOUR_KIND) {
      const kinds = this.account.weave.read().periodKinds;
      const made = withKind(kinds, this.newKind.read());
      this.newKind.setValue("");
      if (made !== kinds) this.change(() => this.loom.saveDefaults({ period_kinds: made }), "Added");
    }
    if (action === TAKES_OFF_KIND) this.change(() => this.loom.saveDefaults({ period_kinds: withoutKind(this.account.weave.read().periodKinds, payload.name) }), "Taken off");
    // and so for kinds of event
    if (action === TYPES_EVENT_KIND) this.newEventKind.setValue(payload.line);
    if (action === ADDS_EVENT_KIND) {
      const kinds = this.account.weave.read().eventKinds;
      const made = withKind(kinds, this.newEventKind.read());
      this.newEventKind.setValue("");
      if (made !== kinds) this.change(() => this.loom.saveDefaults({ event_kinds: made }), "Added");
    }
    if (action === TAKES_OFF_EVENT_KIND) this.change(() => this.loom.saveDefaults({ event_kinds: withoutKind(this.account.weave.read().eventKinds, payload.name) }), "Taken off");
    if (action === SETS_EMAILS) this.change(() => this.loom.saveDefaults({ emails: payload.on }), payload.on ? "You'll be emailed what waits for you" : "No more emails");
    return null;
  }

  open() {
    const me = this.account.weave.read().me;
    this.name.setValue(me?.name ?? "");
    this.birthday.setValue(me?.birthday ? sayWhen({ date: me.birthday, precision: "day" }) : "");
  }

  /** The member's own account deleted, everything of theirs with it, and their pictures' files: then signed out. */
  async deleteMe() {
    const weave = this.account.weave.read();
    const paths = weave.data.memories.filter((m) => m.owner === weave.meId).flatMap((m) => m.pictures.map((p) => p.path));
    this.busy.setValue(true);
    this.problem.setValue("");
    const gone = await this.loom.deleteMe(paths);
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!gone.ok) { this.problem.setValue(gone.error); return; }
    this.account.signedOut();
  }

  /** A copy of the member's thread, with its pictures inside it, handed over as one page to keep. */
  async keepCopy() {
    this.busy.setValue(true);
    this.problem.setValue("");
    this.notice.setValue("Making your copy, with its pictures…");
    const loaded = this.account.weave.read();
    // its long memories in full, as a light load cut them short
    const thread = new Set(loaded.thread(loaded.meId).map((e) => e.key));
    const kept = loaded.data.memories.filter((m) => thread.has(`memory:${m.id}`));
    if (!(await this.account.fetchTexts(kept.filter((m) => m.cut).map((m) => m.id)))) {
      if (this.disposed) return;
      this.busy.setValue(false);
      this.notice.setValue("");
      this.problem.setValue("Couldn't fetch all of your memories' words. Please try again.");
      return;
    }
    const texts = this.account.texts.read();
    const weave = new Weave({ ...loaded.data, memories: loaded.data.memories.map((m) => (m.cut && texts[m.id] !== undefined ? { ...m, body: texts[m.id], cut: false } : m)) });
    const addresses = await this.account.addressesFor(kept.flatMap((m) => m.pictures.map((p) => p.path)));
    const pictures = {};
    let missing = 0;
    for (const memory of kept) {
      for (const picture of memory.pictures) {
        const got = addresses[picture.path] ? await this.loom.pictureData(addresses[picture.path]) : { ok: false };
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

export function describeYou(ui, you, account, safety) {
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
    // emails (backend.sql, "emailed") are put away until the platform's mail is set up: no jobs.json runs tapestry_mail
    heading(ui, "Kinds of period"),
    ui.text(Phrase.of("What kinds of time your periods are, each its colour on your timeline. Make your own; taking one off leaves it on its periods, grey."), "Hint").wraps(),
    ui.eachAcross(account.weave.map((w) => w.periodKinds), (held) => ui.pressable(TAKES_OFF_KIND, held.map((k) => ({ name: k?.name ?? "" })), [
      ui.image(ui.bound(() => dotOf(account.weave.read().kindColour(held.read()?.name))), "SmallDot", ""),
      ui.text(held.map((k) => k?.name ?? ""), "ChipWords"), ui.text(Phrase.of("Remove"), "ChipX")], "Chip"), (k) => k.name, "Chips"),
    ui.field(ADDS_YOUR_KIND, "", { changes: TYPES_YOUR_KIND, shows: you.newKind, placeholder: Phrase.of("A new kind - Enter adds it") }),
    heading(ui, "Kinds of event"),
    ui.text(Phrase.of("What kinds your events are, each its colour on your timeline. Make your own; taking one off leaves it on its events, grey."), "Hint").wraps(),
    ui.eachAcross(account.weave.map((w) => w.eventKinds), (held) => ui.pressable(TAKES_OFF_EVENT_KIND, held.map((k) => ({ name: k?.name ?? "" })), [
      ui.image(ui.bound(() => dotOf(account.weave.read().eventKindColour(held.read()?.name))), "SmallDot", ""),
      ui.text(held.map((k) => k?.name ?? ""), "ChipWords"), ui.text(Phrase.of("Remove"), "ChipX")], "Chip"), (k) => k.name, "Chips"),
    ui.field(ADDS_EVENT_KIND, "", { changes: TYPES_EVENT_KIND, shows: you.newEventKind, placeholder: Phrase.of("A new kind - Enter adds it") }),
    heading(ui, "What cards show"),
    ui.text(Phrase.of("On your thread and everywhere else, what each card shows besides its title and when. Press one to show it or not."), "Hint").wraps(),
    ui.row(CARD_PARTS.map(([part, said]) => ui.pressable(SHOWS_ON_CARDS, { part }, [ui.text(Phrase.of(said), Themes.FACE)], "Segment")
      .currentWhile(account.weave.map((w) => w.cardShows[part]))), "Segments"),
    ui.row([ui.pressable(SHOWS_ON_CARDS, { part: "light" }, [ui.text(Phrase.of("Light cards: just when and the title, one line each"), Themes.FACE)], "Segment")
      .currentWhile(account.weave.map((w) => !!w.cardShows.light))], "Segments"),
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
    // whom the member blocked: neither sees anything of the other's, until unblocked here
    ui.when(me.map((m) => (m?.blocked ?? []).length > 0), ui.column([
      heading(ui, "Blocked"),
      ui.text(Phrase.of("You see nothing of theirs, and they nothing of yours."), "Hint").wraps(),
      ui.each(me.map((m) => m?.blocked ?? []), (held) => ui.row([
        ui.text(held.map((b) => b?.name ?? ""), "PersonName").grow(),
        ui.pressable(UNBLOCKS, held.map((b) => ({ account: b?.account ?? "" })), [ui.text(ui.words(UNBLOCKS), "Small")], LINK),
      ], "PersonRow"), (b) => b.account, "List"),
      problem(ui, safety.problem),
      notice(ui, safety.notice),
    ])),
    ui.divider(),
    ui.when(me.map((m) => !!m?.admin), ui.pressable(OPENS_ADMIN, {}, [ui.text(ui.words(OPENS_ADMIN), Themes.FACE)], LINK).goesTo("admin")),
    ui.button(SIGNS_OUT, { style: LINK }),
    ui.row([
      ui.hyperlink("privacy.html", [ui.text(Phrase.of("Privacy"), "Small")], "LegalLink"),
      ui.hyperlink("terms.html", [ui.text(Phrase.of("Terms"), "Small")], "LegalLink"),
    ], "Legal"),
    heading(ui, "Delete my account"),
    ui.text(Phrase.of("Everything of yours - memories, pictures, events, periods, places, people, comments - deleted for good, straight away. Keep a copy first, above, if you'd like one."), "Hint").wraps(),
    ui.when(you.deleting, ui.column([
      ui.text(Phrase.of("Delete your account and everything on it, for good? This can't be undone."), "Warn").wraps(),
      ui.row([ui.button(DELETES_ME, { style: DANGER }), ui.button(KEEPS_ME, { style: LINK })], "Actions"),
    ]), ui.row([ui.button(ASKS_TO_DELETE_ME, { style: DANGER })], "Actions")),
  ], null, { on_fill: () => you.open() });
}

