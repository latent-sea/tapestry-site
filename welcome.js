// The welcome: a member's first time in, four short steps - their birthday,
// a first memory, what events and periods are, and the tapestry. Shown once
// signed in to someone who keeps a life of their own and has nothing in it
// yet - no birthday, no memory - until they finish or skip it; then never
// again on that device. Its address (#welcome) opens it again any time.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=0f4719403046";
import { LINK } from "./look/look.js?v=0f4719403046";
import { notice, problem } from "./parts.js?v=0f4719403046";
import { birthdayOf } from "./you.js?v=0f4719403046";
import { parseSpan } from "./when.js?v=0f4719403046";

export const WELCOME = "welcome";
export const SETS_BIRTHDAY = "sets_my_birthday_on_the_welcome";
export const SAVES_BIRTHDAY = "saves_my_birthday_and_goes_on";
export const WRITES_MEMORY = "writes_a_first_memory";
export const SETS_WHEN = "sets_when_the_first_memory_was";
export const KEEPS_MEMORY = "keeps_the_first_memory";
export const GOES_ON = "goes_on_to_the_next_step";
export const SKIPS_STEP = "skips_this_step";
export const SHOWS_TAPESTRY = "shows_me_the_tapestry";
export const STARTS = "starts_my_life_story";
export const SKIPS = "skips_the_welcome";
export const BEGINS = "begins_the_welcome";

export const WORDS = {
  [SETS_BIRTHDAY]: ["Your birthday"],
  [SAVES_BIRTHDAY]: ["Save and go on"],
  [WRITES_MEMORY]: ["Something you remember"],
  [SETS_WHEN]: ["When"],
  [KEEPS_MEMORY]: ["Keep it and go on"],
  [GOES_ON]: ["Go on"],
  [SKIPS_STEP]: ["Skip this"],
  [SHOWS_TAPESTRY]: ["Show me the tapestry"],
  [STARTS]: ["Start my life story"],
  [SKIPS]: ["Skip the welcome"],
  [BEGINS]: ["Get started"],
};

const STEPS = ["birthday", "memory", "kinds", "tapestry"];
const KEPT = "tapestry-welcomed"; // the members welcomed on this device, by id

function welcomed() {
  try { return JSON.parse(localStorage.getItem(KEPT) ?? "[]"); } catch { return []; }
}

export class Welcome extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.step = this.value(STEPS[0]);
    this.birthday = this.value("");
    this.memory = this.value("");
    this.when = this.value("");
    this.busy = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
  }

  /** Whether the member is shown the welcome on coming in: they keep a life of their own, with nothing in it yet, and haven't been welcomed here. */
  needed() {
    const weave = this.account.weave.read();
    if (!weave.writes || !weave.meId || weave.me?.birthday || welcomed().includes(weave.meId)) return false;
    return ![...weave.memories.values()].some((m) => m.owner === weave.meId);
  }

  answers() { return Object.keys(WORDS); }

  would(action) {
    if ([SAVES_BIRTHDAY, KEEPS_MEMORY].includes(action) && this.busy.read()) return Phrase.of("Saving");
    if (action === SAVES_BIRTHDAY) {
      if (!this.birthday.read().trim()) return Phrase.of("Type your birthday first, or skip it");
      const read = birthdayOf(this.birthday.read());
      if (read.error) return Phrase.of(read.error);
    }
    if (action === KEEPS_MEMORY) {
      if (!this.memory.read().trim()) return Phrase.of("Write something first, or skip it");
      const span = parseSpan(this.when.read(), new Date(), this.account.weave.read().born);
      if (span.error) return Phrase.of(span.error);
      if (span.going) return Phrase.of("A memory is a time, not one still going");
    }
    return null;
  }

  told(action, payload) {
    this.problem.setValue("");
    if (action === SETS_BIRTHDAY) this.birthday.setValue(payload.line);
    if (action === WRITES_MEMORY) this.memory.setValue(payload.line);
    if (action === SETS_WHEN) this.when.setValue(payload.line);
    if (action === GOES_ON || action === SKIPS_STEP) this.next();
    if (action === SAVES_BIRTHDAY) this.saveBirthday();
    if (action === KEEPS_MEMORY) this.keepMemory();
    if (action === SHOWS_TAPESTRY || action === STARTS || action === SKIPS) this.finish();
    return null;
  }

  /** Opened: from its first step. */
  open() {
    this.step.setValue(STEPS[0]);
    this.problem.setValue("");
    this.notice.setValue("");
  }

  next() {
    this.notice.setValue("");
    this.step.update((at) => STEPS[Math.min(STEPS.indexOf(at) + 1, STEPS.length - 1)]);
  }

  /** Done with, or skipped: not shown again on this device. */
  finish() {
    const me = this.account.weave.read().meId;
    try { localStorage.setItem(KEPT, JSON.stringify([...new Set([...welcomed(), me])])); } catch { /* this visit only */ }
  }

  async saveBirthday() {
    this.busy.setValue(true);
    const saved = await this.loom.saveBirthday(birthdayOf(this.birthday.read()).date);
    await this.account.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!saved.ok) { this.problem.setValue(saved.error); return; }
    this.next();
  }

  async keepMemory() {
    const { starts, ends } = parseSpan(this.when.read(), new Date(), this.account.weave.read().born);
    const time = (which, at) => ({ [which]: at?.date ?? "", [`${which}_precision`]: at?.precision ?? "day", [`${which}_about`]: !!at?.about, [`${which}_time`]: at?.time ?? "" });
    const [first, ...rest] = this.memory.read().trim().split("\n");
    this.busy.setValue(true);
    const saved = await this.loom.saveMemory({
      // a line of its own above more is its title, as on Today
      title: rest.length && first.length <= 80 ? first.trim() : "", body: rest.length && first.length <= 80 ? rest.join("\n").trim() : this.memory.read().trim(),
      ...time("starts", starts), ...time("ends", ends), tags: [], shares: [],
    });
    await this.account.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!saved.ok) { this.problem.setValue(saved.error); return; }
    this.memory.setValue("");
    this.when.setValue("");
    this.next();
    this.notice.setValue("Kept: it is the first memory on your life.");
  }
}

/** The welcome, one step at a time. */
export function describeWelcome(ui, welcome, thread, woven) {
  const at = (step) => welcome.step.map((s) => s === step);
  const said = (words, style = "Hint") => ui.text(Phrase.of(words), style).wraps();
  const step = (parts) => ui.surface("Card", [ui.column(parts, "Part")]);
  const counted = (n) => ui.text(Phrase.with("Step %s of 4", [String(n)]), "Quiet");
  return ui.screen(WELCOME, [
    ui.text(Phrase.of("Welcome to Tapestry"), "Title"),
    said("Your life story, and where it meets the lives of the people in it. Four short steps to start - each can be skipped, and done later."),
    problem(ui, welcome.problem),
    notice(ui, welcome.notice),
    ui.when(at("birthday"), step([
      counted(1),
      ui.text(Phrase.of("Your birthday"), "PartHeading"),
      said("Your life on the tapestry starts there, and you can say when things were as ages - when I was 7, in my twenties. Only you see it, unless you choose to share it (in You)."),
      ui.field(SAVES_BIRTHDAY, "", { label: Phrase.of("Your birthday"), changes: SETS_BIRTHDAY, shows: welcome.birthday, placeholder: Phrase.of("12 June 1975"), autocomplete: "bday" }),
      ui.row([ui.button(SAVES_BIRTHDAY), ui.button(SKIPS_STEP, { style: LINK })], "Actions"),
    ])),
    ui.when(at("memory"), step([
      counted(2),
      ui.text(Phrase.of("A first memory"), "PartHeading"),
      said("Anything you remember: a first day at school, a holiday, a song. Say when as well as you know it - 1987, summer 1994, when I was 7. A guess is fine: between 1983 and 1985."),
      ui.area(WRITES_MEMORY, welcome.memory, "TextArea"),
      ui.field(KEEPS_MEMORY, "", { label: Phrase.of("When"), changes: SETS_WHEN, shows: welcome.when, placeholder: Phrase.of("e.g. summer 1994") }),
      ui.row([ui.button(KEEPS_MEMORY), ui.button(SKIPS_STEP, { style: LINK })], "Actions"),
    ])),
    ui.when(at("kinds"), step([
      counted(3),
      ui.text(Phrase.of("Events and periods"), "PartHeading"),
      ui.text(Phrase.of("Events"), "FieldName"),
      said("A time and a place where lives meet - a wedding, a holiday, a night out. Everyone who was there adds their own memories of it, and it is on each of their lives."),
      ui.text(Phrase.of("Periods"), "FieldName"),
      said("A span of your life - where you lived, a job, school. They overlap, as lives do, and hold the memories during them. Your Timeline draws them across the years."),
      said("Add them from the Events and Periods tabs; a memory can be made into either."),
      ui.row([ui.button(GOES_ON)], "Actions"),
    ])),
    ui.when(at("tapestry"), step([
      counted(4),
      ui.text(Phrase.of("The tapestry"), "PartHeading"),
      said("Every life is a line, from birth to now. Where your people share memories, events and periods with you, your lines are drawn together, with a knot where they meet. Link your people (People) and your lives start to weave."),
      ui.row([ui.button(SHOWS_TAPESTRY, { goes_to: woven }), ui.button(STARTS, { style: LINK, goes_to: thread })], "Actions"),
    ])),
    ui.when(welcome.step.map((s) => s !== "tapestry"), ui.row([ui.button(SKIPS, { style: LINK, goes_to: thread })], "Actions")),
  ], null, { on_fill: () => welcome.open() });
}
