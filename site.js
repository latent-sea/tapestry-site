// Tapestry: everyone has their own thread through time - their memories,
// the periods of their life, the places they were - and threads cross at
// events. On gd-chime for the web; its tables on the platform (backend.sql),
// reached through loom.js.
//
// The shell: the navigation (a bar along the bottom on a phone), and the
// screens - your thread; the tapestry, everyone's threads you can see woven
// together; a memory, event or period; a person; a place; your people;
// your places; you. Each screen has an address (#tapestry, #event/<id>,
// #person/<id>...), so a link opens it and the phone's Back goes back. An
// invitation opens at #join/<token>, and waits through signing in.
//
// Opened with ?probe the page walks itself against a stand-in for the
// platform (tests/standin.js), never the real one.

import { ChimeApp, Chimes, Controller, Driver, Frames, Phrase, Themes, Ui } from "./gd_chime/gd_chime.js?v=266a8ca37beb";
import { Loom, guarded } from "./loom.js?v=266a8ca37beb";
import { Account, AGREES, JOINS, RELOADS, SETS_JOIN_NAME, SIGNS_OUT, STOPS_SEEING, WORDS as ACCOUNT_WORDS } from "./account.js?v=266a8ca37beb";
import * as Edit from "./editor.js?v=266a8ca37beb";
import * as Folk from "./people.js?v=266a8ca37beb";
import * as Where from "./places.js?v=266a8ca37beb";
import * as Me from "./you.js?v=266a8ca37beb";
import * as Today from "./journal.js?v=266a8ca37beb";
import * as Ask from "./asking.js?v=266a8ca37beb";
import * as Run from "./admin.js?v=266a8ca37beb";
import * as List from "./importing.js?v=266a8ca37beb";
import * as Told from "./notices.js?v=266a8ca37beb";
import * as Talk from "./comments.js?v=266a8ca37beb";
import * as Kind from "./safety.js?v=266a8ca37beb";
import * as Pay from "./paying.js?v=266a8ca37beb";
import * as Say from "./feedback.js?v=266a8ca37beb";
import * as Hello from "./welcome.js?v=266a8ca37beb";
import * as Ring from "./phone.js?v=266a8ca37beb";
import * as Look from "./find.js?v=266a8ca37beb";
import * as Take from "./taking.js?v=266a8ca37beb";
import * as Parts from "./parts.js?v=266a8ca37beb";
import { PlaceMap } from "./placemap.js?v=266a8ca37beb";
import { listed, pickAnother, timeline, yearsOfMemories } from "./weave.js?v=266a8ca37beb";
import { headingOf, lastDayOf, parseSpan } from "./when.js?v=266a8ca37beb";
import { yearsOf } from "./woven.js?v=266a8ca37beb";
import { dotOf, few, heading, mark, notice, problem } from "./parts.js?v=266a8ca37beb";
import { TUNING, caught, drawLives, inSelection, layOut, livesOf } from "./lives.js?v=266a8ca37beb";
import { Space } from "./space.js?v=266a8ca37beb";
import { drawTimeline, extentOf, rangeAfter, rangeAround, rangeZoomed } from "./gantt.js?v=266a8ca37beb";
import { linksOf } from "./links.js?v=266a8ca37beb";
import { CARD, DANGER, FactoryLook, LINK, PALETTE } from "./look/look.js?v=266a8ca37beb";

const probing = new URLSearchParams(location.search).has("probe");
// read-only while seeing Tapestry as someone else (Account.seeAs)
const LOOM = guarded(probing ? new (await import("./tests/standin.js?v=266a8ca37beb")).StandIn() : new Loom());
// the browser's notifications, stood in for when probing: headless, it has none to give
const PUSH = probing ? new (await import("./tests/standin.js?v=266a8ca37beb")).StandInPush() : null;

// the screens
const DOOR = "door";
const THREAD = "thread";
const WOVEN = "tapestry";
const ITEM = "item"; // a memory, event or period, entered as "<kind>:<id>"
const TODAY = "today";
const EVENTS = "events";
const PERIODS = "periods";
const TIMELINE = "timeline"; // the member's periods, events and memories drawn across the years
const MENU = "menu"; // every screen's shortcut, one under another: opened from the menu button, always at the top
const { ADMIN } = Run;
const { IMPORT } = List;
const { EDIT } = Edit;
const { PEOPLE, PERSON, JOIN } = Folk;
const { PLACES, PLACE } = Where;
const { YOU } = Me;

const GOES_TODAY = "goes_to_today";
const GOES_EVENTS = "goes_to_my_events";
const GOES_PERIODS = "goes_to_my_periods";
const GOES_TIMELINE = "goes_to_my_timeline";
const GOES_FEEDBACK = "goes_to_feedback";
const GOES_FIND = "goes_to_find_on_tapestry";
const GOES_MENU = "opens_the_menu";
const CLOSES_MENU = "closes_the_menu";
const GOES_NOTICES = "goes_to_notices";
const GOES_ADMIN = "goes_to_the_admin_area";
const GOES_THREAD = "goes_to_my_thread";
const GOES_WOVEN = "goes_to_the_tapestry";
const GOES_PEOPLE = "goes_to_my_people";
const GOES_PLACES = "goes_to_my_places";
const GOES_YOU = "goes_to_me";
const OPENS_ITEM = "opens_it";
const SEARCHES_THREAD = "searches_my_thread";
const SEARCHES_WOVEN = "searches_the_tapestry";
const SEARCHES_TIMELINE = "searches_my_timeline";
const FLIPS_ORDER = "turns_the_order_around";
const TOGGLES_THREAD = "shows_or_hides_a_thread";
const TOGGLES_GREY = "shows_or_hides_named_people";
const SHOWS_LIVES_IN = "shows_the_lives_flat_or_in_space";
const SELECTS = "selects_with_a_box";
const CLEARS_SELECTION = "clears_the_selection";
const ZOOMS_LIVES = "zooms_or_moves_the_lives";
const SHOWS_ALL_LIVES = "shows_all_of_the_lives";
const OPENS_LIVES_SETTINGS = "opens_or_closes_how_the_lives_are_drawn";
const TUNES_LIVES = "tunes_how_the_lives_settle";
const RESETS_LIVES = "puts_back_how_the_lives_settle";
// how the lives settle, each a step of five, with its words: what it is, and each end
const TUNINGS = [["pull", "Pull together", "How strongly what two lives share draws them together"],
  ["near", "Closeness", "How close lives come while they share"],
  ["push", "Spacing", "How far apart every life keeps from the others"],
  ["stiff", "Stiffness", "How slowly a line bends: stiffer lines move less, and more smoothly"],
  ["reach", "Reach", "How long before and after a shared moment it pulls"]];
const TUNING_SAID = ["Least", "Less", "Middling", "More", "Most"];
const SHOWS_PICTURE = "shows_the_picture";
const SHOWS_EARLIER = "shows_the_picture_before";
const SHOWS_LATER = "shows_the_picture_after";
const LEAVES_EVENT = "takes_me_off_this_event";
const ASKS_TO_LEAVE = "asks_before_taking_me_off";
const STAYS_ON = "keeps_me_on_this_event";
const LEAVES_PERIOD = "takes_me_out_of_this_period";
const ASKS_TO_LEAVE_PERIOD = "asks_before_taking_me_out_of_this_period";
const SHOWS_MORE = "shows_more_of_the_list";
const JUMPS_TO_YEAR = "jumps_to_a_year";
const SHOWS_RANDOM_YEAR = "shows_a_random_year";
const SHOWS_EVERYTHING = "shows_everything";
const FILTERS_BY_LABEL = "shows_a_label";
const OPENS_RANDOM_MEMORY = "opens_a_random_memory";
const TOGGLES_PERIOD_TYPE = "shows_or_hides_a_kind_of_period";
const TOGGLES_EVENT_TYPE = "shows_or_hides_a_kind_of_event";
const TOGGLES_PART = "shows_or_hides_a_part_of_the_timeline";
const ZOOMS_TIMELINE = "zooms_or_moves_the_timeline";
const TYPES_TIMELINE_SPAN = "types_the_timelines_stretch";
const SETS_TIMELINE_SPAN = "shows_the_timeline_for_that_stretch";
const SHOWS_ALL_TIME = "shows_all_of_the_timeline";
const SHOWS_IN_TIMELINE = "shows_it_in_the_timeline";
// a timeline shows this many at first, and as many more at each press: a life of hundreds of memories stays quick
const PAGE = 50;

const KIND_SAID = { memory: "Memory", event: "Event", period: "Period" };
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** The privacy policy and the terms, each a page of its own: readable by anyone, signed in or not. */
const legal = (ui) => ui.row([
  ui.hyperlink("privacy.html", [ui.text(Phrase.of("Privacy"), "Small")], "LegalLink"),
  ui.hyperlink("terms.html", [ui.text(Phrase.of("Terms"), "Small")], "LegalLink"),
], "Legal");

/** What an entry is, said on its card: "Memory", or an event's or period's kind beside it ("Event · Holiday"). */
const kindSaid = (entry) => {
  const said = Phrase.of(KIND_SAID[entry?.kind] ?? "Memory");
  const named = entry?.kind === "event" ? entry.eventKind : entry?.kind === "period" ? entry.periodKind : null;
  return named ? Phrase.with("%s · %s", [said, named]) : said;
};
const INVITE_KEPT = "tapestry_invitation";
const ORDER_KEPT = "tapestry_order";
const PARTS_KEPT = "tapestry_timeline_hides"; // the parts of the timeline left out, on this device
const LIVES_KEPT = "tapestry_lives_in"; // the tapestry flat (2d) or in space (3d), on this device
const TUNING_KEPT = "tapestry_lives_tuning"; // how the lives settle, on this device
const SEEN_KEPT = "tapestry_seen_at";
const NEW_SHOWN = 5;
// the tabs, in their order along the bar and down the menu: [action, screen, for admins alone]
const TABS = [[GOES_TODAY, TODAY], [GOES_THREAD, THREAD], [GOES_TIMELINE, TIMELINE], [GOES_EVENTS, EVENTS], [GOES_PERIODS, PERIODS], [GOES_WOVEN, WOVEN],
  [GOES_NOTICES, Told.NOTICES], [GOES_FIND, Look.FIND], [GOES_PEOPLE, PEOPLE], [GOES_PLACES, PLACES], [GOES_YOU, YOU], [GOES_FEEDBACK, Say.FEEDBACK], [GOES_ADMIN, ADMIN, true]];

/** How the lives settle, as last tuned on this device. */
function keptTuning() {
  try { return { ...TUNING, ...JSON.parse(localStorage.getItem(TUNING_KEPT) ?? "{}") }; } catch { return { ...TUNING }; }
}

/** Whether the tapestry was last seen flat ("2d") or in space ("3d") on this device. */
function keptLivesIn() {
  try { return localStorage.getItem(LIVES_KEPT) === "3d" ? "3d" : "2d"; } catch { return "2d"; }
}

/** The parts of the timeline left out on this device: periods, events or memories. */
function keptParts() {
  try { return (localStorage.getItem(PARTS_KEPT) ?? "").split(",").filter((part) => ["periods", "events", "memories"].includes(part)); } catch { return []; }
}

/** The order timelines were last read in on this device: newest first unless turned around. */function keptOrder() {
  try { return localStorage.getItem(ORDER_KEPT) !== "oldest"; } catch { return true; }
}

/** What the timelines show: what is looked for, which way round, and whose threads are woven in. */
class Looking extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.threadSearch = this.value("");
    this.wovenSearch = this.value("");
    this.timelineSearch = this.value(""); // what is looked for on the timeline's chart: found, it is picked out there
    this.newestFirst = this.value(keptOrder()); // a journal reads newest first; a life story may be read either way
    this.hidden = this.value([]); // the lives the tapestry leaves out, by id ("account:<id>", "person:<id>")
    this.hiddenGrey = this.value(false); // whether the people the member only named (grey) are left out
    this.livesIn = this.value(keptLivesIn()); // the tapestry flat ("2d") or in space ("3d")
    this.selecting = this.value(false); // whether a drag on the tapestry draws a box, rather than moving it
    this.selection = this.value(null); // what a box caught: a map of life id -> { from, to }, or null
    this.livesRange = this.value(null); // the stretch of years the flat tapestry shows, or null for all of it
    this.picked = this.value(null); // the life picked out on the tapestry - pressed on its line - or null
    this.laidAt = this.value(0); // counts each settling of the lives finished, so the tapestry is drawn again
    this.tuning = this.value(keptTuning()); // how the lives settle (lives.js, TUNING)
    this.tuningOpen = this.value(false); // whether how the lives are drawn is open over the picture
    this.leaving = this.value(""); // the event being asked about before the member takes themselves off it
    this.threadYear = this.value(""); // the one year (or decade) the member's thread is shown, picked at random; "" for every year
    this.threadLabel = this.value(""); // the one label the member's thread is shown for; "" for all
    this.hiddenTypes = this.value([]); // the kinds of period left out of the periods' list and the timeline ("" for none)
    this.hiddenEventTypes = this.value([]); // the kinds of event left out of the timeline ("" for none)
    this.hiddenParts = this.value(keptParts()); // the parts of the timeline left out: periods, events, memories
    this.timelineRange = this.value(null); // the stretch of the timeline shown, { from, to } in years, or null for all of it
    this.timelineSpan = this.value(""); // the stretch typed, as a time is: "2004 – 2010", "June 2012 – March 2013"
    this.atMenu = this.value(false); // whether the menu is open: its button closes it again, back where they were
    this.since = this.value(null); // when the member was last here, on this device: what is new is what came after
    this.problem = this.value("");
    this.pages = new Map(); // each timeline's own: how many of it are shown
    this.starts = new Map(); // each timeline's own: the year (heading) it is shown from, or "" for its beginning
  }

  /** The heading a timeline is shown from, by its key: "" for its beginning. */
  fromOf(key) {
    if (!this.starts.has(key)) this.starts.set(key, this.value(""));
    return this.starts.get(key);
  }

  /** How many of a timeline are shown, by its key. */
  shownOf(key) {
    if (!this.pages.has(key)) this.pages.set(key, this.value(PAGE));
    return this.pages.get(key);
  }

  answers() { return [OPENS_ITEM, SEARCHES_THREAD, SEARCHES_WOVEN, SEARCHES_TIMELINE, FLIPS_ORDER, TOGGLES_THREAD, LEAVES_EVENT, ASKS_TO_LEAVE, STAYS_ON, LEAVES_PERIOD, ASKS_TO_LEAVE_PERIOD, SHOWS_MORE, JUMPS_TO_YEAR, SHOWS_RANDOM_YEAR, SHOWS_EVERYTHING, FILTERS_BY_LABEL, OPENS_RANDOM_MEMORY, TOGGLES_PERIOD_TYPE, TOGGLES_EVENT_TYPE, TOGGLES_PART,
    ZOOMS_TIMELINE, TYPES_TIMELINE_SPAN, SETS_TIMELINE_SPAN, SHOWS_ALL_TIME, SHOWS_IN_TIMELINE,
    TOGGLES_GREY, SHOWS_LIVES_IN, SELECTS, CLEARS_SELECTION, ZOOMS_LIVES, SHOWS_ALL_LIVES, OPENS_LIVES_SETTINGS, TUNES_LIVES, RESETS_LIVES]; }

  /** The keys of what the timeline's search finds on the member's own life, or null while nothing is looked for. */
  timelineFound() {
    const looked = this.timelineSearch.read();
    if (!looked.trim()) return null;
    const w = this.account.weave.read();
    return new Set(w.find(w.thread(w.meId), looked, this.account.foundInTexts(looked)).map((e) => e.key));
  }

  /**
   * What the tapestry's search finds, to pick out on its lines - or null while nothing is looked for: the knots found
   * (by key), and the lives found - by name, or through a knot found.
   */
  livesFound() {
    const looked = this.wovenSearch.read();
    if (!looked.trim()) return null;
    const w = this.account.weave.read();
    const drawn = this.drawnLives();
    const keys = new Set(w.find(w.everything(), looked, this.account.foundInTexts(looked)).map((e) => e.key));
    const words = looked.toLowerCase().trim().split(/\s+/);
    const lives = new Set(drawn.lives.filter((l) => words.every((word) => l.name.toLowerCase().includes(word))).map((l) => l.id));
    for (const thing of drawn.shared) if (keys.has(thing.key)) for (const id of thing.lives) lives.add(id);
    return { keys, lives };
  }

  /** The lives of the tapestry, worked out once for each load. */
  drawnLives() { const weave = this.account.weave.read(); return weave.kept("lives", () => livesOf(weave)); }

  /** Where they settle, flat (1) or in space (2): worked out once for each load. */
  laidLives(dims) {
    const weave = this.account.weave.read();
    const tuning = this.tuning.read();
    this.laidAt.read();
    const key = `${dims}:${JSON.stringify(tuning)}`;
    if (this.laidFor?.weave !== weave) this.laidFor = { weave, results: new Map() };
    const results = this.laidFor.results;
    if (results.has(key)) return results.get(key);
    // worked out away from the page; null - "working it out" - until then, and drawn again when it is
    results.set(key, null);
    this.layOutAside(this.drawnLives(), dims, tuning).then((laid) => {
      if (this.disposed || this.laidFor?.weave !== weave) return;
      results.set(key, laid);
      this.laidAt.update((n) => n + 1);
    });
    return null;
  }

  /** The lives settled in a worker, off the page's own thread; where workers can't be, on it, after the page has drawn. */
  layOutAside(drawn, dims, tuning) {
    const here = () => new Promise((done) => setTimeout(() => done(layOut(drawn, dims, undefined, tuning)), 0));
    // walked (?probe), the page runs on headless Chrome's virtual time, which a worker's answer never arrives in
    if (probing) return here();
    try {
      if (!this.worker) {
        this.worker = new Worker(new URL(`./lives-worker.js${new URL(import.meta.url).search}`, import.meta.url), { type: "module" });
        this.waiting = new Map();
        this.worker.onmessage = ({ data }) => {
          const done = this.waiting.get(data.id);
          this.waiting.delete(data.id);
          done?.({ times: data.times, at: new Map(data.at) });
        };
        this.worker.onerror = () => { this.worker = false; for (const [, done] of this.waiting) done(null); this.waiting.clear(); this.laidFor = null; this.laidAt.update((n) => n + 1); };
      }
      if (this.worker === false) return here();
      const id = (this.asked = (this.asked ?? 0) + 1);
      return new Promise((done) => {
        this.waiting.set(id, done);
        this.worker.postMessage({ id, drawn: { lives: drawn.lives, shared: drawn.shared }, dims, tuning });
      });
    } catch {
      this.worker = false;
      return here();
    }
  }

  /** The lives left out, by id: those hidden, and the grey ones while they are. */
  livesHidden() {
    const grey = this.hiddenGrey.read() ? this.drawnLives().lives.filter((l) => l.grey).map((l) => l.id) : [];
    return [...this.hidden.read(), ...grey];
  }

  /** All of the tapestry's years: { from, to }, or null. */
  wholeLives() {
    const lives = this.drawnLives().lives;
    return lives.length ? { from: Math.floor(Math.min(...lives.map((l) => l.from))), to: Math.ceil(Math.max(...lives.map((l) => l.to))) } : null;
  }

  /** What a box caught, said: what the member was in with the lives it caught, then - as entries, by their keys. */
  selected() {
    const selection = this.selection.read();
    if (!selection) return [];
    const weave = this.account.weave.read();
    const keys = new Set(inSelection(this.drawnLives(), weave.meId, selection));
    return weave.everything().filter((entry) => keys.has(entry.key));
  }

  /** A memory, event or period on the member's thread by its key, as an entry - or null. */
  entryOf(key) {
    const weave = this.account.weave.read();
    const [kind, id] = String(key ?? "").split(":");
    const item = ({ memory: weave.memories, event: weave.events, period: weave.periods })[kind]?.get(id);
    return item ? weave.entry(kind, item) : null;
  }

  /** What the timeline hides now. */
  timelineHides() { return { periods: this.hiddenTypes.read(), events: this.hiddenEventTypes.read(), parts: this.hiddenParts.read() }; }

  /** All of the timeline's time, as it is filtered now. */
  wholeTimeline() { return extentOf(this.account.weave.read(), new Date(), this.timelineHides()); }

  /** The stretch typed, read as a time is - its start to its end - or null. */
  typedSpan() {
    const read = parseSpan(this.timelineSpan.read(), new Date(), this.account.weave.read().born);
    if (read.error || !read.starts) return null;
    const until = read.going ? null : read.ends ?? read.starts;
    const to = until ? yearsOf({ date: lastDayOf(until) }) + 1 / 365.25 : new Date().getFullYear() + 1;
    return { from: yearsOf(read.starts), to };
  }

  /** The member's thread: what a random year or memory is picked from. */
  thread() { const weave = this.account.weave.read(); return weave.thread(weave.meId); }

  would(action, payload) {
    if (action === SHOWS_RANDOM_YEAR && !yearsOfMemories(this.thread()).length) return Phrase.of("No memories with a time yet");
    if (action === OPENS_RANDOM_MEMORY && !this.thread().some((entry) => entry.kind === "memory")) return Phrase.of("No memories yet");
    if (action === ZOOMS_TIMELINE) {
      const whole = this.wholeTimeline();
      if (!whole) return Phrase.of("Nothing with a time yet");
      const now = this.timelineRange.read();
      if (payload?.step === "out" && !now) return Phrase.of("All of it is shown");
      if (payload?.step === "earlier" && (!now || now.from <= whole.from + 1e-9)) return Phrase.of("Nothing earlier");
      if (payload?.step === "later" && (!now || now.to >= whole.to - 1e-9)) return Phrase.of("Nothing later");
    }
    if (action === SETS_TIMELINE_SPAN && !this.typedSpan()) return Phrase.of("Type a stretch of time: 2004 – 2010, or June 2012 – March 2013");
    if (action === SHOWS_ALL_TIME && !this.timelineRange.read()) return Phrase.of("All of it is shown");
    if (action === CLEARS_SELECTION && !this.selection.read()) return Phrase.of("Nothing is selected");
    if (action === ZOOMS_LIVES) {
      const now = this.livesRange.read();
      const whole = this.wholeLives();
      if (!whole) return Phrase.of("No lives to show yet");
      if (payload?.step === "out" && !now) return Phrase.of("All of it is shown");
      if (payload?.step === "earlier" && (!now || now.from <= whole.from + 1e-9)) return Phrase.of("Nothing earlier");
      if (payload?.step === "later" && (!now || now.to >= whole.to - 1e-9)) return Phrase.of("Nothing later");
    }
    if (action === SHOWS_ALL_LIVES && !this.livesRange.read()) return Phrase.of("All of it is shown");
    if (action === TUNES_LIVES) {
      const step = this.tuning.read()[payload?.part] + (payload?.by ?? 0);
      if (step < 0) return Phrase.of("As little as it goes");
      if (step > 4) return Phrase.of("As much as it goes");
    }
    if (action === RESETS_LIVES && JSON.stringify(this.tuning.read()) === JSON.stringify({ ...TUNING })) return Phrase.of("As it starts already");
    if (action === SHOWS_IN_TIMELINE) {
      const entry = this.entryOf(payload?.key);
      if (!entry?.when?.date) return Phrase.of("It has no time to show it at");
      if (!this.thread().some((e) => e.key === entry.key)) return Phrase.of("Only what is in your life is on your timeline");
    }
    if (action === LEAVES_EVENT || action === ASKS_TO_LEAVE) {
      const weave = this.account.weave.read();
      const event = weave.events.get(payload?.id);
      if (!event || event.owner === weave.meId || !weave.isAt(event, weave.meId)) return Phrase.of("Only someone tagged there by another takes themselves off");
    }
    if (action === LEAVES_PERIOD || action === ASKS_TO_LEAVE_PERIOD) {
      const weave = this.account.weave.read();
      const period = weave.periods.get(payload?.id);
      if (!period || period.owner === weave.meId || !weave.isAtPeriod(period, weave.meId)) return Phrase.of("Only someone put in it by another takes themselves out");
    }
    return null;
  }

  told(action, payload) {
    if (action === SHOWS_MORE) this.shownOf(payload.key).update((shown) => shown + PAGE);
    if (action === JUMPS_TO_YEAR) {
      // pressed again, back to the beginning; else from that year, the first so many of it
      this.fromOf(payload.key).update((from) => (from === payload.heading ? "" : payload.heading));
      this.shownOf(payload.key).setValue(PAGE);
    }
    // a year with memories in it, picked at random - another each press - and the thread shown for it alone
    if (action === SHOWS_RANDOM_YEAR) this.threadYear.setValue(pickAnother(yearsOfMemories(this.thread()), this.threadYear.read()) ?? "");
    if (action === TOGGLES_PERIOD_TYPE) this.hiddenTypes.update((hidden) => (hidden.includes(payload.type) ? hidden.filter((t) => t !== payload.type) : [...hidden, payload.type]));
    if (action === ZOOMS_TIMELINE) {
      this.timelineRange.setValue(rangeAfter(this.timelineRange.read(), this.wholeTimeline(), payload.step));
      this.timelineSpan.setValue("");
    }
    if (action === TYPES_TIMELINE_SPAN) this.timelineSpan.setValue(payload.line);
    if (action === SETS_TIMELINE_SPAN) this.timelineRange.setValue(this.typedSpan());
    if (action === SHOWS_ALL_TIME) { this.timelineRange.setValue(null); this.timelineSpan.setValue(""); }
    // a month either side of it, it picked out - and its part and kind shown, were they hidden
    if (action === SHOWS_IN_TIMELINE) {
      const entry = this.entryOf(payload.key);
      this.timelineRange.setValue(rangeAround(entry));
      this.timelineSpan.setValue("");
      const part = { memory: "memories", event: "events", period: "periods" }[entry.kind];
      this.hiddenParts.update((hidden) => hidden.filter((p) => p !== part));
      if (entry.kind === "period") this.hiddenTypes.update((hidden) => hidden.filter((t) => t !== (entry.periodKind ?? "")));
      if (entry.kind === "event") this.hiddenEventTypes.update((hidden) => hidden.filter((t) => t !== (entry.eventKind ?? "")));
    }
    if (action === TOGGLES_EVENT_TYPE) this.hiddenEventTypes.update((hidden) => (hidden.includes(payload.type) ? hidden.filter((t) => t !== payload.type) : [...hidden, payload.type]));
    if (action === TOGGLES_PART) {
      this.hiddenParts.update((hidden) => (hidden.includes(payload.part) ? hidden.filter((t) => t !== payload.part) : [...hidden, payload.part]));
      try { localStorage.setItem(PARTS_KEPT, this.hiddenParts.read().join(",")); } catch { /* this visit only */ }
    }
    if (action === SHOWS_EVERYTHING) { this.threadYear.setValue(""); this.threadLabel.setValue(""); }
    // a label: the thread shown for its memories alone; pressed again, all of it
    if (action === FILTERS_BY_LABEL) this.threadLabel.update((label) => (label === payload.label && !payload.only ? "" : payload.label));
    if (action === OPENS_RANDOM_MEMORY) {
      const memory = pickAnother(this.thread().filter((entry) => entry.kind === "memory"), null);
      if (memory) location.hash = `#memory/${memory.id}`;
    }
    if (action === SEARCHES_THREAD) this.threadSearch.setValue(payload.line);
    if (action === SEARCHES_WOVEN) this.wovenSearch.setValue(payload.line);
    if (action === SEARCHES_TIMELINE) this.timelineSearch.setValue(payload.line);
    if (action === FLIPS_ORDER) {
      this.newestFirst.update((newest) => !newest);
      try { localStorage.setItem(ORDER_KEPT, this.newestFirst.read() ? "newest" : "oldest"); } catch { /* this visit only */ }
    }
    if (action === TOGGLES_THREAD) this.hidden.update((hidden) => (hidden.includes(payload.life) ? hidden.filter((a) => a !== payload.life) : [...hidden, payload.life]));
    if (action === TOGGLES_GREY) this.hiddenGrey.update((hidden) => !hidden);
    if (action === SHOWS_LIVES_IN) {
      this.livesIn.setValue(payload.mode);
      this.selection.setValue(null);
      try { localStorage.setItem(LIVES_KEPT, payload.mode); } catch { /* this visit only */ }
    }
    if (action === SELECTS) this.selecting.update((on) => !on);
    if (action === CLEARS_SELECTION) this.selection.setValue(null);
    if (action === ZOOMS_LIVES) this.livesRange.setValue(rangeAfter(this.livesRange.read(), this.wholeLives(), payload.step));
    if (action === SHOWS_ALL_LIVES) this.livesRange.setValue(null);
    if (action === OPENS_LIVES_SETTINGS) this.tuningOpen.update((open) => !open);
    if (action === TUNES_LIVES || action === RESETS_LIVES) {
      this.tuning.setValue(action === RESETS_LIVES ? { ...TUNING } : { ...this.tuning.read(), [payload.part]: this.tuning.read()[payload.part] + payload.by });
      try { localStorage.setItem(TUNING_KEPT, JSON.stringify(this.tuning.read())); } catch { /* this visit only */ }
    }
    if (action === ASKS_TO_LEAVE || action === ASKS_TO_LEAVE_PERIOD) this.leaving.setValue(payload.id);
    if (action === LEAVES_PERIOD) { this.leaving.setValue(""); this.leave(payload.id, true); }
    if (action === STAYS_ON) this.leaving.setValue("");
    if (action === LEAVES_EVENT) { this.leaving.setValue(""); this.leave(payload.id); }
    return null;
  }

  /** Signed in: when they were last here is read, and now becomes it, on this device. */
  arrived() {
    // each member's own last visit, so one device shared by a family tells each what is new to them
    const kept = `${SEEN_KEPT}:${this.account.weave.read().meId}`;
    let last = null;
    try {
      last = localStorage.getItem(kept);
      localStorage.setItem(kept, new Date().toISOString());
    } catch { /* nothing is new without a last visit */ }
    this.since.setValue(last);
  }

  /** Signed out: nothing of the last member's looking stays for the next. */
  reset() {
    this.threadSearch.setValue("");
    this.wovenSearch.setValue("");
    this.timelineSearch.setValue("");
    this.hidden.setValue([]);
    this.selection.setValue(null);
    this.selecting.setValue(false);
    this.leaving.setValue("");
    this.problem.setValue("");
  }

  async leave(id, period = false) {
    const left = await (period ? this.loom.leavePeriod(id) : this.loom.leaveEvent(id));
    await this.account.load();
    this.problem.setValue(left.ok ? "" : left.error);
  }

  /** The threads the tapestry weaves: every one the member follows, less those hidden. */
  shown() {
    const hidden = this.hidden.read();
    return this.account.weave.read().threads().filter((a) => !hidden.includes(`account:${a}`));
  }
}

export class Tapestry extends ChimeApp {
  look() { return FactoryLook.make(PALETTE, Me.keptTextSize()); }

  declare(register) {
    register.declareAll({
      ...ACCOUNT_WORDS,
      ...Edit.WORDS,
      ...Folk.WORDS,
      ...Where.WORDS,
      ...Me.WORDS,
      ...Today.WORDS,
      ...Ask.WORDS,
      ...Run.WORDS,
      ...List.WORDS,
      ...Told.WORDS,
      ...Talk.WORDS,
      ...Kind.WORDS,
      ...Pay.WORDS,
      ...Say.WORDS,
      ...Hello.WORDS,
      ...Ring.WORDS,
      ...Look.WORDS,
      ...Take.WORDS,
      ...Parts.WORDS,
      [GOES_TODAY]: ["Today"],
      [GOES_NOTICES]: ["Notices"],
      [GOES_EVENTS]: ["Events"],
      [GOES_PERIODS]: ["Periods"],
      [GOES_TIMELINE]: ["Timeline"],
      [GOES_FEEDBACK]: ["Feedback"],
      [GOES_FIND]: ["Find"],
      [GOES_MENU]: ["Menu"],
      [CLOSES_MENU]: ["Close the menu"],
      [GOES_ADMIN]: ["Admin"],
      [GOES_THREAD]: ["My life"],
      [GOES_WOVEN]: ["Tapestry"],
      [GOES_PEOPLE]: ["People"],
      [GOES_PLACES]: ["Places"],
      [GOES_YOU]: ["You"],
      [OPENS_ITEM]: ["Open"],
      [SHOWS_PICTURE]: ["Show the picture"],
      [SHOWS_EARLIER]: ["Previous"],
      [SHOWS_LATER]: ["Next"],
      [SHOWS_MORE]: ["Show more"],
      [JUMPS_TO_YEAR]: ["Go to this year"],
      [SHOWS_RANDOM_YEAR]: ["A random year"],
      [SHOWS_EVERYTHING]: ["Show everything"],
      [FILTERS_BY_LABEL]: ["Show the memories with this label"],
      [OPENS_RANDOM_MEMORY]: ["A random memory"],
      [TOGGLES_PERIOD_TYPE]: ["Show or hide this kind"],
      [TOGGLES_EVENT_TYPE]: ["Show or hide this kind"],
      [TOGGLES_PART]: ["Show or hide these"],
      [ZOOMS_TIMELINE]: ["Zoom or move"],
      [TYPES_TIMELINE_SPAN]: ["From when to when"],
      [SETS_TIMELINE_SPAN]: ["Show"],
      [SHOWS_ALL_TIME]: ["All of it"],
      [SHOWS_IN_TIMELINE]: ["Show in timeline"],
      [SEARCHES_THREAD]: ["Find in my life"],
      [SEARCHES_WOVEN]: ["Find in the tapestry"],
      [SEARCHES_TIMELINE]: ["Find on my timeline"],
      [FLIPS_ORDER]: ["Turn the order around"],
      [TOGGLES_THREAD]: ["Show their life"],
      [TOGGLES_GREY]: ["Show the people you named"],
      [SHOWS_LIVES_IN]: ["Show the lives so"],
      [SELECTS]: ["Select"],
      [CLEARS_SELECTION]: ["Clear the selection"],
      [ZOOMS_LIVES]: ["Zoom or move"],
      [SHOWS_ALL_LIVES]: ["All of it"],
      [OPENS_LIVES_SETTINGS]: ["How the lines are drawn"],
      [TUNES_LIVES]: ["More or less"],
      [RESETS_LIVES]: ["Back to how it starts"],
      [LEAVES_EVENT]: ["Yes, take me off it"],
      [ASKS_TO_LEAVE]: ["Take me off this event"],
      [STAYS_ON]: ["No, keep me on it"],
      [LEAVES_PERIOD]: ["Yes, take me out of it"],
      [ASKS_TO_LEAVE_PERIOD]: ["Take me out of this period"],
    });
  }

  describe() {
    const ui = this.ui;
    this.loom = LOOM;
    this.account = this.model(new Account(this.chimes, LOOM));
    this.account.invitation = () => this.pendingInvite._held;
    this.looking = this.model(new Looking(this.chimes, LOOM, this.account));
    this.editor = this.model(new Edit.Editor(this.chimes, LOOM, this.account, (deleted) => Frames.defer(() => {
      this.commands.dispatch(Chimes.GLOBAL, deleted ? Driver.GO : Driver.GOES_BACK, deleted ? { place: THREAD } : {});
    })));
    this.people = this.model(new Folk.People(this.chimes, LOOM, this.account));
    this.places = this.model(new Where.Places(this.chimes, LOOM, this.account));
    this.journal = this.model(new Today.Journal(this.chimes, LOOM, this.account));
    this.asking = this.model(new Ask.Asking(this.chimes, LOOM, this.account));
    this.admin = this.model(new Run.Admin(this.chimes, LOOM, this.account));
    this.importer = this.model(new List.Importer(this.chimes, LOOM, this.account));
    this.notices = this.model(new Told.Notices(this.chimes, LOOM, this.account));
    this.comments = this.model(new Talk.Comments(this.chimes, LOOM, this.account));
    this.safety = this.model(new Kind.Safety(this.chimes, LOOM, this.account));
    this.paying = this.model(new Pay.Paying(this.chimes, LOOM, this.account));
    this.feedback = this.model(new Say.Feedback(this.chimes, LOOM, this.account));
    this.welcome = this.model(new Hello.Welcome(this.chimes, LOOM, this.account));
    this.narrowing = this.model(new Parts.Narrowing(this.chimes));
    Parts.narrowWith(this.narrowing);
    this.taking = this.model(new Take.Taking(this.chimes, LOOM, this.account));
    this.finding = this.model(new Look.Finder(this.chimes, LOOM, this.account));
    this.phone = this.model(new Ring.Phone(this.chimes, LOOM, this.account, PUSH ?? Ring.browserPush()));
    this.you = this.model(new Me.You(this.chimes, LOOM, this.account, (size) => FactoryLook.make(PALETTE, size).dress(this.element)));
    const timelineOf = (entries, empty, woven = false) => this.timeline(entries, empty, woven);
    return ui.app("tapestry_app", [
      this.nav(),
      this.seeingBar(),
      ui.stack([
        this.door(), this.todayScreen(), this.threadScreen(), this.timelineScreen(), this.eventsScreen(), this.periodsScreen(), this.wovenScreen(), this.itemScreen(),
        this.menuScreen(), Told.describeNotices(ui, this.notices, this.asking, this.account, ITEM, Say.FEEDBACK_ITEM, ADMIN,
          Take.describeWaiting(ui, this.taking, this.account)), Run.describeAdmin(ui, this.admin, this.account), List.describeImport(ui, this.importer, this.account),
        Edit.describeEditor(ui, this.editor, this.account),
        Folk.describePeople(ui, this.people, this.account), Folk.describePerson(ui, this.people, this.account, timelineOf, this.asking), Folk.describeJoin(ui, this.people,
          ui.when(ui.bound(() => !!this.people.invitation.read()?.accepted && this.welcome.needed()), ui.button(Hello.BEGINS, { goes_to: Hello.WELCOME }))),
        Where.describePlaces(ui, this.places, this.account), Where.describePlace(ui, this.places, this.account, timelineOf, this.asking),
        Me.describeYou(ui, this.you, this.account, this.safety, this.phone),
        Pay.describePaying(ui, this.paying, this.account),
        Say.describeFeedback(ui, this.feedback, this.account), Say.describeFeedbackItem(ui, this.feedback, this.account),
        Hello.describeWelcome(ui, this.welcome, THREAD, WOVEN),
        Look.describeFind(ui, this.finding),
      ]),
    ]);
  }

  // loaded only when the page is walked (?probe), so an export leaves it out
  probe() { return import("./probe.js?v=266a8ca37beb").then((made) => new made.Probe(this)); }

  mount(element) {
    super.mount(element);
    this.started.then((stood) => { if (stood) { this.keepAddress(); this.keepDoor(); this.keepFresh(); this.keepLives(); this.keepTimeline(); this.keepTabs(); this.keepPlaceMap(); } });
    return this;
  }

  // --- the shell ---

  /**
   * The menu button, always at the top, and the tabs: along the top beside it; on a phone, along the
   * bottom, a row swiped left and right for those past the edge. The menu has every one, one under another.
   */
  nav() {
    const ui = this.ui;
    const admin = this.account.weave.map((w) => !!w.me?.admin || !!w.me?.moderator); // the admin area: admins, and moderators for what is reported
    // the notices' tab says how many wait to be seen
    const waiting = ui.bound(() => { const n = this.notices.count(); return n ? String(n > 99 ? "99+" : n) : ""; });
    const words = (action) => (action === GOES_NOTICES
      ? [ui.text(ui.words(action), "NavWords"), ui.text(waiting, "NavCount").hidesEmpty()]
      : [ui.text(ui.words(action), "NavWords")]);
    const tab = ([action, screen, onlyAdmin]) => {
      const made = ui.pressable(action, {}, words(action), "NavLink").goesTo(screen);
      return onlyAdmin ? ui.when(admin, made) : made;
    };
    return ui.when(this.account.state.map((s) => s === "in"), ui.row([
      // the menu's button opens it; pressed again, it closes, back where they were
      ui.when(this.looking.atMenu, ui.pressable(CLOSES_MENU, {}, [ui.text("✕", "MenuMark"), ui.text(Phrase.of("Close"), "MenuWords")], "MenuButton").goesTo(Driver.BACK),
        ui.pressable(GOES_MENU, {}, [ui.text("☰", "MenuMark"), ui.text(ui.words(GOES_MENU), "MenuWords")], "MenuButton").goesTo(MENU)),
      ui.text("Tapestry", "Wordmark"),
      ui.row(TABS.map(tab), "Nav").named("tabs"),
    ], "TopNav"));
  }

  /** Seeing Tapestry as someone else, as its support: said on every screen, with the way back. */
  seeingBar() {
    const ui = this.ui;
    const seeing = ui.bound(() => { this.account.weave.read(); return this.account.seeing; });
    return ui.when(seeing, ui.row([
      ui.text(ui.bound(() => {
        const s = seeing.read();
        return !s ? "" : s.masked ? Phrase.with("Seeing Tapestry as %s - their words jumbled, their pictures blacked out. Nothing can be changed.", [s.name])
          : Phrase.with("Seeing Tapestry as %s, as they let support see it. Nothing can be changed.", [s.name]);
      }), "Words").wraps().grow(),
      ui.button(STOPS_SEEING),
    ], "SeeingBar"));
  }

  /** Today: the quickest way onto the thread - words for right now. */
  todayScreen() {
    const ui = this.ui;
    return ui.screen(TODAY, [
      ui.text(Phrase.of("Today"), "Title"),
      this.freePlan(),
      ui.when(this.account.weave.map((w) => w.writes), Today.describeToday(ui, this.journal)),
    ]);
  }

  /** The member's events: each a time and a place or a gathering, holding everyone's memories of it. */
  eventsScreen() {
    const ui = this.ui;
    const account = this.account;
    const entries = ui.bound(() => { const w = account.weave.read(); return w.thread(w.meId).filter((e) => e.kind === "event"); });
    return ui.screen(EVENTS, [
      ui.text(Phrase.of("Events"), "Title"),
      ui.text(Phrase.of("Times and places where lives meet - a wedding, a holiday, a night out. Each holds everyone's memories of it; open one to add yours, or change it."), "Hint").wraps(),
      this.freePlan(),
      ui.row([ui.button(Edit.ADDS_EVENT, { with: "event:new", goes_to: EDIT }).absentWhenRefused()], "Actions"),
      this.timeline(entries, Phrase.of("No events yet.")),
    ]);
  }

  /** The member's periods: spans of their life, each holding the memories during it. */
  periodsScreen() {
    const ui = this.ui;
    const account = this.account;
    const all = ui.bound(() => { const w = account.weave.read(); return w.thread(w.meId).filter((e) => e.kind === "period"); });
    const hidden = this.looking.hiddenTypes;
    const entries = ui.bound(() => all.read().filter((e) => !hidden.read().includes(e.periodKind ?? "")));
    return ui.screen(PERIODS, [
      ui.text(Phrase.of("Periods"), "Title"),
      ui.text(Phrase.of("Spans of your life - where you lived, a job, school - overlapping as lives do. Each holds the memories during it; open one to add to it, or change it. Your Timeline draws them across the years."), "Hint").wraps(),
      this.freePlan(),
      ui.row([ui.button(Edit.ADDS_PERIOD, { with: "period:new", goes_to: EDIT }).absentWhenRefused()], "Actions"),
      this.kindChips(all.map((list) => list.map((e) => e.periodKind ?? "")), (w) => w.periodKinds, (w, name) => w.kindColour(name), TOGGLES_PERIOD_TYPE, hidden),
      this.timeline(entries, ui.bound(() => Phrase.of(all.read().length ? "Every kind is hidden: press one above to show it." : "No periods yet."))),
    ]);
  }

  /**
   * The kinds there are among these (names, "" for none), in the member's order, none last: each its colour,
   * pressed to hide or show it. Shown only when there is more than none.
   */
  kindChips(names, kindsOf, colourOf, action, hidden) {
    const ui = this.ui;
    const account = this.account;
    const kinds = ui.bound(() => {
      const there = new Set(names.read());
      const own = kindsOf(account.weave.read()).map((k) => k.name);
      // the member's kinds first, in their order; a kind taken off but still on something after; none last
      const named = [...own, ...[...there].filter((name) => name && !own.includes(name)).sort()];
      return [...named.filter((name) => there.has(name)).map((name) => ({ type: name, said: name })), ...(there.has("") ? [{ type: "", said: "No kind" }] : [])];
    });
    return ui.when(kinds.map((k) => k.length > 1 || (k.length === 1 && k[0].type !== "")), few(ui, `kinds-${action}`, kinds, (k) => k.said, (held) => ui.pressable(action,
      held.map((k) => ({ type: k?.type ?? "" })), [ui.image(ui.bound(() => dotOf(colourOf(account.weave.read(), held.read()?.type ?? ""))), "SmallDot", ""),
        ui.text(held.map((k) => k?.said ?? ""), "Small")], "Segment KindChip").currentWhile(ui.bound(() => !hidden.read().includes(held.read()?.type ?? ""))),
    { keyOf: (k) => k.type || "none", style: "Labels", keep: (k) => hidden.read().includes(k.type) }));
  }

  /**
   * The member's timeline: their periods, events and memories drawn across the years (keepTimeline), each
   * mark opening what it is. Each part, and each kind of period and of event, shown or hidden by a chip.
   */
  timelineScreen() {
    const ui = this.ui;
    const account = this.account;
    const looking = this.looking;
    const thread = ui.bound(() => { const w = account.weave.read(); return w.thread(w.meId).filter((e) => e.when?.date); });
    const parts = looking.hiddenParts;
    const of = (kind) => thread.map((list) => list.filter((e) => e.kind === kind));
    const shown = (part) => parts.map((hidden) => !hidden.includes(part));
    return ui.screen(TIMELINE, [
      ui.text(Phrase.of("Your timeline"), "Title"),
      ui.text(Phrase.of("Your periods, events and memories across the years. Press any of them to open it."), "Hint").wraps(),
      ui.row([["periods", "Periods"], ["events", "Events"], ["memories", "Memories"]].map(([part, said]) => ui.pressable(TOGGLES_PART, { part },
        [ui.text(Phrase.of(said), Themes.FACE)], "Segment").currentWhile(shown(part))), "Segments"),
      ui.when(shown("periods"), this.kindChips(of("period").map((list) => list.map((e) => e.periodKind ?? "")), (w) => w.periodKinds, (w, name) => w.kindColour(name),
        TOGGLES_PERIOD_TYPE, looking.hiddenTypes)),
      ui.when(shown("events"), this.kindChips(of("event").map((list) => list.map((e) => e.eventKind ?? "")), (w) => w.eventKinds, (w, name) => w.eventKindColour(name),
        TOGGLES_EVENT_TYPE, looking.hiddenEventTypes)),
      // zoomed in and out on the years, moved earlier and later, or shown for a stretch typed as a time is
      ui.row([
        ui.pressable(ZOOMS_TIMELINE, { step: "out" }, [ui.text("−", "ZoomMark")], "Segment ZoomButton").absentWhenRefused(),
        ui.pressable(ZOOMS_TIMELINE, { step: "in" }, [ui.text("+", "ZoomMark")], "Segment ZoomButton"),
        ui.pressable(ZOOMS_TIMELINE, { step: "earlier" }, [ui.text("◀", "ZoomMark")], "Segment ZoomButton").absentWhenRefused(),
        ui.pressable(ZOOMS_TIMELINE, { step: "later" }, [ui.text("▶", "ZoomMark")], "Segment ZoomButton").absentWhenRefused(),
        ui.pressable(SHOWS_ALL_TIME, {}, [ui.text(ui.words(SHOWS_ALL_TIME), "Small")], LINK).absentWhenRefused(),
      ], "Actions ZoomRow"),
      ui.row([
        ui.field(SETS_TIMELINE_SPAN, "", { changes: TYPES_TIMELINE_SPAN, shows: looking.timelineSpan, placeholder: Phrase.of("e.g. 2004 – 2010") }).grow(),
        ui.button(SETS_TIMELINE_SPAN, { style: LINK }),
      ], "AddRow"),
      ui.text(ui.bound(() => {
        const range = looking.timelineRange.read();
        if (!range) return "";
        const said = (years) => { const y = Math.floor(years); const m = Math.min(11, Math.floor((years - y) * 12)); return range.to - range.from > 3 ? String(y) : `${MONTH_NAMES[m]} ${y}`; };
        return Phrase.with("Showing %s to %s", [said(range.from), said(range.to - 1 / 365)]);
      }), "Hint").hidesEmpty(),
      ui.field(SEARCHES_TIMELINE, "", { changes: SEARCHES_TIMELINE, shows: looking.timelineSearch, placeholder: Phrase.of("Find: words, people, places") }),
      ui.text(ui.bound(() => {
        const found = looking.timelineFound();
        return !found ? "" : found.size ? Phrase.counted("%d found, picked out below", "%d found, picked out below", found.size) : Phrase.of("Nothing found.");
      }), "Hint").hidesEmpty(),
      ui.surface("PeriodsChart", []).named("timeline-chart"),
      ui.when(ui.bound(() => !thread.read().length), ui.text(Phrase.of("Nothing with a time yet: add a period, an event or a memory, and say when."), "Quiet").wraps()),
      ui.text(Phrase.of("Pinch it to zoom in and out. Everything in order of when it began, each named above its mark: periods are bars, an arrow where one is still going; events are shorter bars; memories are dots, on a faint bar where you guessed between two times."), "Hint").wraps(),
    ]);
  }

  /** The menu: a shortcut to every screen, one under another - the admin area's for an admin. */
  menuScreen() {
    const ui = this.ui;
    const admin = this.account.weave.map((w) => !!w.me?.admin || !!w.me?.moderator); // the admin area: admins, and moderators for what is reported
    const go = ([action, screen, onlyAdmin]) => {
      const made = ui.pressable(action, {}, [ui.text(ui.words(action), "PersonName"),
        ...(action === GOES_NOTICES ? [ui.text(ui.bound(() => { const n = this.notices.count(); return n ? Phrase.counted("%d new", "%d new", n) : ""; }), "Quiet").hidesEmpty()] : [])],
      `${CARD} ListItem MenuItem`).goesTo(screen);
      return onlyAdmin ? ui.when(admin, made) : made;
    };
    return ui.screen(MENU, [
      ui.text(Phrase.of("Menu"), "Title"),
      ui.column(TABS.map(go), "List"),
    ]);
  }

  door() {
    const ui = this.ui;
    const account = this.account;
    const state = account.state;
    const inviting = ui.bound(() => (this.pendingInvite.read() ? Phrase.of("Sign in to accept your invitation.") : ""));
    return ui.screen(DOOR, [
      ui.column([
        ui.text("Tapestry", "DoorTitle"),
        ui.text(Phrase.of("Everyone has their own life. Where lives meet is where the story is."), "DoorLine").wraps(),
        ui.text(inviting, "Notice").wraps().hidesEmpty(),
        ui.when(state.map((s) => s === "checking"), ui.text(Phrase.of("Opening…"), "Quiet")),
        ui.when(state.map((s) => s === "out"), ui.column([
          ui.text(Phrase.of("Sign in to start your life story, or to see the ones shared with you."), "Hint").wraps(),
          ui.surface("GoogleButton", []).named("google-button"),
        ])),
        ui.when(state.map((s) => s === "uninvited"), ui.column([
          ui.text(Phrase.of("Tapestry is by invitation."), "Words").wraps(),
          ui.text(Phrase.of("Ask someone who is on it to invite you: the link they send brings you in."), "Hint").wraps(),
          ui.button(SIGNS_OUT, { style: LINK }),
        ])),
        ui.when(state.map((s) => s === "joining"), ui.column([
          ui.text(Phrase.of("Welcome. What should your people call you?"), "Words").wraps(),
          ui.field(JOINS, "", { changes: SETS_JOIN_NAME, shows: account.joinName, autocomplete: "name", label: Phrase.of("Your name") }),
          this.terms(),
          ui.text(Phrase.of("Starting your life story, you agree to these terms, and to Tapestry's privacy policy."), "Hint").wraps(),
          ui.button(JOINS),
        ])),
        ui.when(state.map((s) => s === "agreeing"), ui.column([
          ui.text(Phrase.of("Tapestry has terms now: what is and isn't allowed on it, and how to report something or block someone. Please read them, and agree to go on."), "Words").wraps(),
          this.terms(),
          ui.button(AGREES),
          ui.button(SIGNS_OUT, { style: LINK }),
        ])),
        legal(ui),
        problem(ui, account.problem),
        ui.when(account.problem, ui.button(RELOADS, { style: LINK })),
      ], "Door"),
    ]);
  }

  /** The terms in full, to read before agreeing: as their own page has them (Account.readTerms). */
  terms() {
    const ui = this.ui;
    const words = (held, style) => ui.text(held.map((t) => t?.words ?? ""), style).wraps();
    return ui.when(this.account.terms.map((t) => t.length > 0), ui.surface("Terms", [ui.each(this.account.terms, (held) => ui.when(held.map((t) => t?.kind === "heading"),
      words(held, "PartHeading"), ui.when(held.map((t) => t?.kind === "point"), words(held, "Words TermsPoint"), words(held, "Words"))), (t) => t.words, "TermsText")]));
  }

  /** On the free plan: what it is, said where a thread would be kept. */
  freePlan(words = "You're on the free plan: you see what your people share with you, and comment on it. Keeping your own life story - memories, events and periods - is part of the paid plan.") {
    const ui = this.ui;
    return ui.when(this.account.weave.map((w) => !w.writes), ui.column([
      ui.text(Phrase.of(words), "Notice").wraps(),
      ui.row([ui.pressable(Pay.GOES_PAID, {}, [ui.text(ui.words(Pay.GOES_PAID), Themes.FACE)], "FactoryAction").goesTo(Pay.PAID)], "Actions"),
    ], "FreePlan"));
  }

  threadScreen() {
    const ui = this.ui;
    const account = this.account;
    const year = this.looking.threadYear;
    const label = this.looking.threadLabel;
    const narrowed = ui.bound(() => !!year.read() || !!label.read());
    const entries = ui.bound(() => {
      const w = account.weave.read();
      const found = w.find(w.thread(w.meId), this.looking.threadSearch.read(), account.foundInTexts(this.looking.threadSearch.read()));
      // a year picked at random: that year alone; a label: its memories alone
      const inYear = year.read() ? found.filter((entry) => headingOf(entry.when) === year.read()) : found;
      return label.read() ? inYear.filter((entry) => (entry.labels ?? []).includes(label.read())) : inYear;
    });
    return ui.screen(THREAD, [
      ui.row([
        ui.text(Phrase.of("Your life"), "Title").grow(),
        ui.when(account.weave.map((w) => w.writes), ui.pressable(GOES_TODAY, {}, [ui.text(Phrase.of("Write about today"), Themes.FACE)], "FactoryAction").goesTo(TODAY)),
      ], "TitleRow"),
      this.comingBack(),
      this.freePlan(),
      ui.row([
        ui.button(Edit.ADDS_MEMORY, { with: "memory:new", goes_to: EDIT }).absentWhenRefused(),
        // all three alike: each makes something, none is lesser
        ui.button(Edit.ADDS_EVENT, { with: "event:new", goes_to: EDIT }).absentWhenRefused(),
        ui.button(Edit.ADDS_PERIOD, { with: "period:new", goes_to: EDIT }).absentWhenRefused(),
      ], "Actions"),
      this.finder(SEARCHES_THREAD, this.looking.threadSearch),
      ui.row([
        ui.pressable(SHOWS_RANDOM_YEAR, {}, [ui.text(year.map((y) => Phrase.of(y ? "Another random year" : "A random year")), "Small")], LINK).absentWhenRefused(),
        ui.pressable(OPENS_RANDOM_MEMORY, {}, [ui.text(ui.words(OPENS_RANDOM_MEMORY), "Small")], LINK).absentWhenRefused(),
      ], "Actions RandomRow"),
      // the member's labels: pressed, the thread shows that label's memories alone
      ui.when(account.weave.map((w) => w.labels.length > 0), few(ui, "labels", account.weave.map((w) => w.labels), (l) => l.label, (held) => ui.pressable(FILTERS_BY_LABEL,
        held.map((l) => ({ label: l?.label ?? "" })), [ui.text(held.map((l) => `#${l?.label ?? ""}`), "Small")], "Segment LabelChip")
        .currentWhile(ui.bound(() => label.read() === held.read()?.label)), { keyOf: (l) => l.label, style: "Labels", keep: (l) => l.label === label.read() })),
      // narrowed to a year or a label: said plainly, with a clear way back to all of it
      ui.when(narrowed, ui.row([
        ui.text(ui.bound(() => (year.read() && label.read() ? Phrase.with("Showing %s only, labelled #%s", [year.read(), label.read()])
          : year.read() ? Phrase.with("Showing %s only", [year.read()]) : Phrase.with("Showing the memories labelled #%s", [label.read()]))), "Words").grow(),
        ui.pressable(SHOWS_EVERYTHING, {}, [ui.text("✕", "ZoomMark"), ui.text(ui.words(SHOWS_EVERYTHING), Themes.FACE)], "FactoryAction"),
      ], "FilterBar")),
      this.timeline(entries, ui.bound(() => (this.looking.threadSearch.read().trim() ? Phrase.of("Nothing found.")
        : Phrase.of("Your life is empty here. Start with a memory, or a period of your life - where you grew up, a job, a house.")))),
    ]);
  }

  /**
   * The tapestry: every life a line from birth to now, drawn together where they share - flat or in
   * space (keepLives) - and under it, what the member was in with the lives a box caught.
   */
  wovenScreen() {
    const ui = this.ui;
    const account = this.account;
    const looking = this.looking;
    const lives = ui.bound(() => looking.drawnLives().lives);
    const coloured = lives.map((l) => l.filter((life) => !life.grey));
    const flat = looking.livesIn.map((m) => m === "2d");
    const entries = ui.bound(() => { const w = account.weave.read(); return w.find(looking.selected(), looking.wovenSearch.read(), account.foundInTexts(looking.wovenSearch.read())); });
    const zoom = (step, said) => ui.pressable(ZOOMS_LIVES, { step }, [ui.text(said, "ZoomMark")], "Segment ZoomButton").absentWhenRefused();
    return ui.screen(WOVEN, [
      ui.text(Phrase.of("The tapestry"), "Title"),
      ui.text(Phrase.of("Each life a line from birth to now, drawn together while lives share memories, events and periods; a knot where they meet. Your people are in their colours, the people you named in grey."), "Hint").wraps(),
      ui.row([["2d", "2D"], ["3d", "3D"]].map(([mode, said]) => ui.pressable(SHOWS_LIVES_IN, { mode }, [ui.text(said, Themes.FACE)], "Segment")
        .currentWhile(looking.livesIn.map((m) => m === mode))), "Segments"),
      ui.row([
        few(ui, "lives", coloured, (l) => l.name, (held) => ui.pressable(TOGGLES_THREAD, held.map((l) => ({ life: l?.id ?? "" })), [
          mark(ui, held.map((l) => l?.colour ?? "")), ui.text(held.map((l) => l?.name ?? ""), Themes.FACE),
        ], "Segment").currentWhile(ui.bound(() => !looking.hidden.read().includes(held.read()?.id))),
        { keyOf: (l) => l.id, style: "Segments", keep: (l) => looking.hidden.read().includes(l.id) }),
        ui.when(lives.map((l) => l.some((life) => life.grey)), ui.pressable(TOGGLES_GREY, {}, [ui.text(Phrase.of("Named people"), Themes.FACE)], "Segment")
          .currentWhile(looking.hiddenGrey.map((h) => !h))),
      ], "Segments"),
      // what is looked for: found, its knots and the lives through them are picked out on the picture
      ui.field(SEARCHES_WOVEN, "", { changes: SEARCHES_WOVEN, shows: looking.wovenSearch, placeholder: Phrase.of("Find: words, people, places") }),
      ui.text(ui.bound(() => {
        const found = looking.livesFound();
        const n = found ? found.keys.size || found.lives.size : 0;
        return !found ? "" : n ? Phrase.counted("%d found, picked out on the lines", "%d found, picked out on the lines", n) : Phrase.of("Nothing found.");
      }), "Hint").hidesEmpty(),
      ui.row([
        ui.pressable(SELECTS, {}, [ui.text(Phrase.of("Select"), Themes.FACE)], "Segment").currentWhile(looking.selecting),
        ui.pressable(CLEARS_SELECTION, {}, [ui.text(ui.words(CLEARS_SELECTION), "Small")], LINK).absentWhenRefused(),
        ui.when(flat, ui.row([zoom("out", "−"), zoom("in", "+"), zoom("earlier", "◀"), zoom("later", "▶"),
          ui.pressable(SHOWS_ALL_LIVES, {}, [ui.text(ui.words(SHOWS_ALL_LIVES), "Small")], LINK).absentWhenRefused()], "Actions ZoomRow")),
      ], "Actions ZoomRow"),
      // the picture, with a gear over its corner opening how its lines are drawn, over it
      ui.column([
        ui.when(flat, ui.surface("LivesPicture", []).named("lives-picture"), ui.surface("LivesSpace", []).named("lives-space")),
        ui.pressable(OPENS_LIVES_SETTINGS, {}, [ui.text(looking.tuningOpen.map((o) => (o ? "✕" : "⚙")), "GearMark")], "GearButton"),
        ui.when(looking.tuningOpen, ui.column([
          ui.text(Phrase.of("How the lines are drawn"), "PartHeading"),
          ...TUNINGS.map(([part, said, hint]) => ui.column([
            ui.text(Phrase.of(said), "FieldName"),
            ui.row([
              ui.pressable(TUNES_LIVES, { part, by: -1 }, [ui.text("−", "ZoomMark")], "Segment ZoomButton"),
              ui.text(looking.tuning.map((t) => Phrase.of(TUNING_SAID[t[part]])), "TuningSaid"),
              ui.pressable(TUNES_LIVES, { part, by: 1 }, [ui.text("+", "ZoomMark")], "Segment ZoomButton"),
            ], "TuningRow"),
            ui.text(Phrase.of(hint), "Hint").wraps(),
          ])),
          ui.row([ui.pressable(RESETS_LIVES, {}, [ui.text(ui.words(RESETS_LIVES), "Small")], LINK).absentWhenRefused()], "Actions"),
        ], "TuningPanel")),
      ], "LivesFrame"),
      ui.when(lives.map((l) => !l.length), ui.text(Phrase.of("No lives to draw yet: say your birthday in You, or add a memory."), "Quiet").wraps()),
      ui.when(ui.bound(() => lives.read().length > 0 && !looking.laidLives(flat.read() ? 1 : 2)), ui.text(Phrase.of("Working out where the lines go…"), "Quiet")),
      ui.text(ui.bound(() => Phrase.of(looking.selecting.read() ? "Draw a box over the lines to select them, for the time it spans."
        : flat.read() ? "Press a line to pick it out; a knot to open it. Pinch to zoom. Press Select, then draw a box over lines to list what you were in with them, then."
          : "Press a line to pick it out; a knot to open it. Drag to turn it, pinch to zoom; walk with the joysticks (in You) or W A S D and the arrows.")), "Hint").wraps(),
      ui.text(ui.bound(() => {
        const picked = looking.drawnLives().lives.find((l) => l.id === looking.picked.read());
        return picked ? Phrase.with("%s's life picked out. Press it again, or anywhere off the lines, to stop.", [picked.name]) : "";
      }), "Notice").wraps().hidesEmpty(),
      ui.when(looking.selection, ui.column([
        heading(ui, "What you were in, there"),
        this.ordering(),
        this.timeline(entries, ui.bound(() => (looking.wovenSearch.read().trim() ? Phrase.of("Nothing found.")
          : Phrase.of("Nothing you were in with them, then."))), true),
      ])),
    ]);
  }

  /** On coming back: what the member's people shared since their last visit, and this day in earlier years. */
  comingBack() {
    const ui = this.ui;
    const account = this.account;
    const fresh = ui.bound(() => account.weave.read().newSince(this.looking.since.read()));
    const onThisDay = ui.bound(() => account.weave.read().onThisDay());
    const list = (entries) => ui.each(entries, (held) => this.card(held, true), (entry) => entry.key, "Timeline");
    return ui.column([
      ui.when(fresh.map((f) => f.length > 0), ui.column([
        heading(ui, "New from your people"),
        list(fresh.map((f) => f.slice(0, NEW_SHOWN))),
        ui.text(fresh.map((f) => (f.length > NEW_SHOWN ? Phrase.with("And %d more on the tapestry", [f.length - NEW_SHOWN]) : "")), "Hint").hidesEmpty(),
      ], "Part")),
      ui.when(onThisDay.map((d) => d.length > 0), ui.column([
        heading(ui, "On this day"),
        list(onThisDay),
      ], "Part")),
    ], "ComingBack");
  }

  /** A line to find things by, and the order to see them in. */
  finder(action, shows) {
    const ui = this.ui;
    return ui.row([
      ui.field(action, "", { changes: action, shows, placeholder: Phrase.of("Find: words, people, places") }).grow(),
      ...this.orders(),
    ], "Finder");
  }

  /** The order to see a list in, and how full its cards are, on their own: a list found by a line above it. */
  ordering() { return this.ui.row(this.orders(), "Finder"); }

  orders() {
    const ui = this.ui;
    return [
      ui.pressable(FLIPS_ORDER, {}, [ui.text(this.looking.newestFirst.map((n) => Phrase.of(n ? "Newest first" : "Oldest first")), "Small")], LINK),
      ui.pressable(Me.SHOWS_ON_CARDS, { part: "light" }, [ui.text(this.account.weave.map((w) => Phrase.of(w.cardShows.light ? "Full cards" : "Light cards")), "Small")], LINK),
    ];
  }

  /**
   * Entries as a timeline, under their years; woven, each says whose thread it is on. A few at a
   * time: the first so many, and Show more for as many again - a page that drew hundreds of cards
   * at once would stop answering.
   */
  timeline(entries, empty, woven = false) {
    const ui = this.ui;
    const key = `timeline-${(this.timelines = (this.timelines ?? 0) + 1)}`;
    const shown = this.looking.shownOf(key);
    const from = this.looking.fromOf(key);
    const all = ui.bound(() => timeline(entries.read(), this.looking.newestFirst.read()));
    // its years (or decades), to flick through: pressed, the timeline is shown from there
    const years = ui.bound(() => all.read().filter((row) => row.heading).map((row) => row.heading));
    const fromHere = ui.bound(() => {
      const rows = all.read();
      const at = from.read() ? rows.findIndex((row) => row.heading === from.read()) : 0;
      return rows.slice(Math.max(at, 0));
    });
    const rows = ui.bound(() => fromHere.read().slice(0, shown.read()));
    const more = ui.bound(() => fromHere.read().length - shown.read());
    return ui.column([
      ui.when(entries.map((list) => list.length === 0), ui.text(empty, "Quiet").wraps()),
      ui.when(years.map((y) => y.length > 2), few(ui, `years-${key}`, years, (y) => y, (year) => ui.pressable(JUMPS_TO_YEAR, ui.bound(() => ({ key, heading: year.read() })),
        [ui.text(year, "Small")], "Segment YearChip").currentWhile(ui.bound(() => from.read() === year.read())), { keyOf: (y) => y, style: "Years", keep: (y) => y === from.read() })),
      ui.each(rows, (held) => ui.when(held.map((row) => !!row?.heading), ui.text(held.map((row) => row?.heading ?? ""), "YearHeading"),
        this.card(held, woven)), (row) => row.key, "Timeline"),
      ui.when(more.map((n) => n > 0), ui.pressable(SHOWS_MORE, { key }, [ui.text(more.map((n) => Phrase.with("Show more (%d further)", [n])), Themes.FACE)], LINK)),
    ]);
  }

  /** One entry on a timeline: full, or light - when on the left, the title beside it - as the member chose. */
  card(held, woven) {
    const light = this.account.weave.map((w) => !!w.cardShows.light);
    return this.ui.when(light, this.lightCard(held, woven), this.fullCard(held, woven));
  }

  /** A light card: when, on the left, and the title, one line; an event says how many memories it holds. */
  lightCard(held, woven) {
    const ui = this.ui;
    return ui.pressable(OPENS_ITEM, held.map((e) => ({ parameter: e?.key ?? "" })), [ui.row([
      mark(ui, held.map((e) => e?.colour ?? ""), "SmallDot"),
      ui.text(held.map((e) => e?.said ?? ""), "LightWhen"),
      ui.text(held.map((e) => e?.title ?? ""), "LightTitle").grow(),
      ui.text(held.map((e) => (e?.kind === "event" && e.memoryCount ? Phrase.counted("%d memory", "%d memories", e.memoryCount)
        : e?.kind === "period" ? Phrase.of("Period") : woven && !e?.mine ? e?.ownerName ?? "" : "")), "LightMeta").hidesEmpty(),
    ], "LightRow")], `${CARD} LightEntry`).goesTo(ITEM);
  }

  /** A full card: what, when, whose, with whom, where, its pictures, and the threads crossing at it. */
  fullCard(held, woven) {
    const ui = this.ui;
    const account = this.account;
    const crossing = held.map((e) => (e?.kind === "event" && e.threads.length > 1 ? e.threads : []));
    // each part as the member chose cards show it (You)
    const shown = (part, said) => ui.bound(() => (account.weave.read().cardShows[part] ? said(held.read()) : ""));
    const shownList = (part, list) => ui.bound(() => (account.weave.read().cardShows[part] ? list(held.read()) : []));
    // an event's memories, inside it: a few lines, then how many more
    const inside = shownList("inside", (e) => (e?.inside ?? []).slice(0, 3).map((m) => ({ key: m.key,
      line: m.mine ? m.title : Phrase.with("%s (%s)", [m.title, m.ownerName]) })));
    const pictures = shownList("pictures", (e) => (e?.pictures ?? []).slice(0, 4));
    return ui.pressable(OPENS_ITEM, held.map((e) => ({ parameter: e?.key ?? "" })), [ui.row([
      ui.column([mark(ui, held.map((e) => e?.colour ?? ""))], "ThreadMark"),
      ui.column([
        ui.row([
          ui.text(held.map((e) => kindSaid(e)), "Kind"),
          ui.text(held.map((e) => e?.said ?? ""), "When").hidesEmpty(),
          ui.text(shown("lengths", (e) => e?.lasts ?? ""), "Age").hidesEmpty(),
          ui.text(shown("ages", (e) => (e?.age ? Phrase.with("You were %s", [e.age]) : "")), "Age").hidesEmpty(),
          woven ? ui.text(held.map((e) => (e?.mine ? "" : Phrase.with("%s's life", [e?.ownerName ?? ""]))), "Whose").hidesEmpty() : null,
        ].filter(Boolean), "CardTop"),
        ui.text(held.map((e) => e?.title ?? ""), "CardTitle").wraps(),
        ui.text(shown("words", (e) => (e?.kind === "memory" && e.title !== e.text.trim().split("\n")[0] ? e.text : e?.kind !== "memory" ? e?.text ?? "" : "")), "CardText").wraps().hidesEmpty(),
        ui.when(inside.map((l) => l.length > 0), ui.each(inside, (line) => ui.text(line.map((l) => l?.line ?? ""), "InEventLine").wraps(), (l) => l.key, "InEvent")),
        ui.row([
          ui.text(shown("place", (e) => (e?.place ? Phrase.with("At %s", [e.place.name]) : "")), "Meta").hidesEmpty(),
          ui.text(shown("people", (e) => (e?.people?.length ? Phrase.with("With %s", [listed(e.people)]) : "")), "Meta").wraps().hidesEmpty(),
          ui.text(held.map((e) => (e?.event?.title ? Phrase.with("Of %s", [e.event.title]) : "")), "Meta").hidesEmpty(),
          ui.text(held.map((e) => (e?.memoryCount ? Phrase.counted("%d memory", "%d memories", e.memoryCount) : "")), "Meta").hidesEmpty(),
          ui.text(held.map((e) => {
            const others = (e?.links ?? []).filter((l) => !l.video).length;
            return others ? Phrase.counted("%d link", "%d links", others) : "";
          }), "Meta").hidesEmpty(),
        ], "MetaRow"),
        ui.eachAcross(held.map((e) => e?.labels ?? []), (l) => ui.text(l.map((x) => `#${x ?? ""}`), "LabelTag"), null, "LabelTags"),
        ui.eachAcross(pictures, (pic) => ui.image(pic.map((p) => (p ? account.address(p.thumb || p.path) : "")), "Thumb",
          pic.map((p) => p?.caption || Phrase.of("A picture"))),
          (p) => p.id, "Thumbs"),
        ui.eachAcross(shownList("pictures", (e) => (e?.videos ?? []).slice(0, 2)), (poster) => ui.image(poster, "Thumb VideoThumb", Phrase.of("A video")), null, "Thumbs"),
        ui.when(crossing.map((c) => c.length > 0), ui.row([
          ui.eachAcross(crossing, (who) => mark(ui, who.map((a) => account.weave.read().colourOf(a)), "SmallDot"), null, "Dots"),
          ui.text(ui.bound(() => Phrase.with("Lives meet here: %s", [listed(crossing.read().map((a) => account.weave.read().nameOf(a)))])), "Crossing").wraps(),
        ], "CrossingRow")),
      ], "CardBody").grow(),
    ], "CardRow")], `${CARD} Entry`).goesTo(ITEM);
  }

  /** A memory, an event or a period, in full. */
  itemScreen() {
    const ui = this.ui;
    const account = this.account;
    const key = ui.parameter(ITEM);
    const kindOf = () => String(key.read() ?? "").split(":")[0];
    const idOf = () => String(key.read() ?? "").split(":")[1] ?? "";
    const item = ui.bound(() => ({ memory: account.weave.read().memories, event: account.weave.read().events, period: account.weave.read().periods })[kindOf()]?.get(idOf()) ?? null);
    const entry = ui.bound(() => (item.read() ? account.weave.read().entry(kindOf(), item.read()) : null));
    const is = (kind) => ui.bound(() => kindOf() === kind);
    const mine = ui.bound(() => !!entry.read()?.mine);
    const seenBy = ui.bound(() => {
      const it = item.read();
      if (!it || !entry.read()?.mine) return "";
      const said = account.weave.read().audienceOf({ kind: kindOf(), audience: it.audience, tags: it.tags.map((t) => t.person).filter(Boolean),
        eventId: it.event_id ?? null, shares: it.shares });
      return Phrase.with("Seen by: %s", [said.summary]);
    });
    const ofEvent = ui.when(ui.bound(() => !!entry.read()?.event?.title),
      ui.pressable(OPENS_ITEM, ui.bound(() => ({ parameter: `event:${item.read()?.event_id ?? ""}` })),
        [ui.text(ui.bound(() => Phrase.with("Of %s", [entry.read()?.event?.title ?? ""])), "LinkWords")], "Link").goesTo(ITEM));
    // each period of the member's life it was during: as many as overlap
    const duringPeriods = ui.each(entry.map((e) => e?.periods ?? []), (held) => ui.pressable(OPENS_ITEM, held.map((p) => ({ parameter: `period:${p?.id ?? ""}` })),
      [ui.text(held.map((p) => Phrase.with("During %s", [p?.title ?? ""])), "LinkWords")], "Link").goesTo(ITEM), (p) => p.id, "PeriodLinks");
    const people = entry.map((e) => e?.people ?? []);
    // a picture shown over everything, as large as the screen allows, with its caption, the one before and after
    const pictures = entry.map((e) => e?.pictures ?? []);
    const viewer = ui.popUp("picture", (path) => {
      const at = () => pictures.read().findIndex((p) => p.path === path.read());
      const shown = () => pictures.read()[at()] ?? null;
      const step = (by) => ui.bound(() => ({ parameter: pictures.read()[at() + by]?.path ?? null }));
      return ui.column([
        ui.image(ui.bound(() => (shown() ? account.address(shown().path) : "")), "Viewed", ui.bound(() => shown()?.caption || Phrase.of("A picture"))),
        ui.text(ui.bound(() => shown()?.caption ?? ""), "Caption").wraps().hidesEmpty(),
        ui.row([
          ui.when(ui.bound(() => at() > 0), ui.pressable(SHOWS_EARLIER, step(-1), [ui.text(ui.words(SHOWS_EARLIER), Themes.FACE)], LINK).goesTo(viewer.getPlace())),
          ui.text(ui.bound(() => (pictures.read().length > 1 ? Phrase.with("%d of %d", [at() + 1, pictures.read().length]) : "")), "Hint").hidesEmpty(),
          ui.when(ui.bound(() => at() < pictures.read().length - 1), ui.pressable(SHOWS_LATER, step(1), [ui.text(ui.words(SHOWS_LATER), Themes.FACE)], LINK).goesTo(viewer.getPlace())),
          ui.button(Ui.CLOSES, { style: LINK }),
        ], "Actions ViewerActions"),
      ], "Viewer");
    });
    // a memory's words in full: one a light load cut short is fetched as it is opened, its links found in all of them
    const text = ui.bound(() => (kindOf() === "memory" ? account.textOf(item.read()) : entry.read()?.text ?? ""));
    const words = ui.bound(() => (kindOf() === "memory" && !item.read()?.title ? text.read().trim().split("\n").slice(1).join("\n").trim() : text.read()));
    const links = ui.bound(() => (item.read()?.cut ? linksOf({ ...item.read(), body: text.read() }) : entry.read()?.links ?? []));
    const memories = ui.bound(() => (kindOf() === "event" ? account.weave.read().memoriesOf(idOf()) : []));
    const during = ui.bound(() => (kindOf() === "period" ? account.weave.read().during(idOf()) : []));
    return ui.screen(ITEM, [
      ui.when(entry, ui.column([
        ui.row([
          mark(ui, entry.map((e) => e?.colour ?? "")),
          ui.text(entry.map((e) => kindSaid(e)), "Kind"),
          ui.text(entry.map((e) => e?.said ?? ""), "When").hidesEmpty(),
          ui.text(entry.map((e) => e?.lasts ?? ""), "Age").hidesEmpty(),
          ui.text(entry.map((e) => (e?.age ? Phrase.with("You were %s", [e.age]) : "")), "Age").hidesEmpty(),
          // whose it is: someone of the member's opens their page
          ui.when(entry.map((e) => !!e?.ownerPerson),
            ui.pressable(Folk.OPENS_PERSON, entry.map((e) => ({ parameter: e?.ownerPerson ?? "" })),
              [ui.text(entry.map((e) => Phrase.with("%s's life", [e?.ownerName ?? ""])), "Whose LinkWords")], "Link").goesTo(PERSON),
            ui.text(entry.map((e) => (e?.mine ? Phrase.of("Your life") : Phrase.with("%s's life", [e?.ownerName ?? ""]))), "Whose")),
        ], "CardTop"),
        ui.text(entry.map((e) => e?.title ?? ""), "Title").wraps(),
        ui.text(words, "Words Body").wraps().hidesEmpty(),
        ui.each(pictures, (pic) => ui.pressable(SHOWS_PICTURE, pic.map((p) => ({ parameter: p?.path ?? "" })), [
          ui.image(pic.map((p) => (p ? account.address(p.path) : "")), "Picture", pic.map((p) => p?.caption || Phrase.of("A picture"))),
          ui.text(pic.map((p) => p?.caption ?? ""), "Caption").wraps().hidesEmpty(),
        ], "PictureButton").opens(viewer), (p) => p.id, "Pictures"),
        // its links: a YouTube video plays here, from YouTube's privacy-enhanced address, loading nothing until pressed
        ui.each(links, (link) => ui.when(link.map((l) => !!l?.video),
          ui.embed(link.map((l) => l?.video?.src ?? ""), { title: Phrase.of("A video"), poster: link.map((l) => l?.video?.poster ?? ""), style: "Video" }),
          ui.hyperlink(link.map((l) => l?.url ?? ""), [ui.text(link.map((l) => l?.site ?? ""), "LinkSite"), ui.text(link.map((l) => l?.url ?? ""), "LinkAddress").wraps()],
            "LinkOut")), (l) => l.url, "Links"),
        ui.when(entry.map((e) => !!e?.place), ui.pressable(Where.OPENS_PLACE, entry.map((e) => ({ parameter: e?.place?.id ?? "" })),
          [ui.text(entry.map((e) => Phrase.with("At %s", [e?.place?.name ?? ""])), "LinkWords")], "Link").goesTo(PLACE)),
        ofEvent,
        duringPeriods,
        ui.eachAcross(entry.map((e) => e?.labels ?? []), (l) => ui.pressable(FILTERS_BY_LABEL, l.map((x) => ({ label: x ?? "", only: true })),
          [ui.text(l.map((x) => `#${x ?? ""}`), "Small")], "Segment LabelChip").goesTo(THREAD), null, "Labels"),
        ui.when(people.map((p) => p.length > 0), ui.column([
          ui.text(ui.bound(() => Phrase.of(kindOf() === "event" ? "Who was there" : "With")), "FieldName"),
          // each name the member knows opens their page; the rest are names
          ui.eachAcross(entry.map((e) => e?.folk ?? []), (held) => ui.when(held.map((f) => !!f?.person),
            ui.pressable(Folk.OPENS_PERSON, held.map((f) => ({ parameter: f?.person ?? "" })), [ui.text(held.map((f) => f?.name ?? ""), "LinkWords")], "Link PersonLink")
              .goesTo(PERSON),
            ui.text(held.map((f) => f?.name ?? ""), "Words")), (f, i) => `${f.person ?? f.name}:${i}`, "PeopleLinks"),
        ])),
        Take.describeTaking(ui, this.taking, account, entry),
        Ask.describeThatsMe(ui, this.asking, account, entry),
        Talk.describeComments(ui, this.comments, account, ui.bound(() => (kindOf() === "memory" ? item.read() : null))),
        ui.when(ui.bound(() => (entry.read()?.threads?.length ?? 0) > 1), ui.text(ui.bound(() => Phrase.with("Lives meet here: %s",
          [listed((entry.read()?.threads ?? []).map((a) => account.weave.read().nameOf(a)))])), "Crossing").wraps()),
        ui.text(seenBy, "Seen").wraps().hidesEmpty(),
        problem(ui, this.looking.problem),
        ui.row([
          ui.button(Edit.EDITS, { with: key, goes_to: EDIT }).absentWhenRefused(),
          ui.button(SHOWS_IN_TIMELINE, { payload: ui.bound(() => ({ key: key.read() })), goes_to: TIMELINE, style: LINK }).absentWhenRefused(),
          ui.button(Edit.ADDS_MEMORY_TO, { with: ui.bound(() => `memory:new:event:${kindOf() === "event" ? idOf() : ""}`), goes_to: EDIT }).absentWhenRefused(),
          // a period the member is in - theirs, or one they were put in - holds their memories too
          ui.when(ui.bound(() => kindOf() === "period" && account.weave.read().isAtPeriod(item.read(), account.weave.read().meId)),
            ui.button(Edit.ADDS_MEMORY, { with: ui.bound(() => `memory:new:period:${idOf()}`), goes_to: EDIT, style: LINK })),
          ui.when(ui.bound(() => this.looking.leaving.read() !== idOf()),
            ui.button(ASKS_TO_LEAVE, { payload: ui.bound(() => ({ id: kindOf() === "event" ? idOf() : "" })), style: LINK }).absentWhenRefused()),
          ui.when(ui.bound(() => this.looking.leaving.read() !== idOf()),
            ui.button(ASKS_TO_LEAVE_PERIOD, { payload: ui.bound(() => ({ id: kindOf() === "period" ? idOf() : "" })), style: LINK }).absentWhenRefused()),
          ui.button(Ask.ASKS_AT_EVENT, { payload: ui.bound(() => ({ id: kindOf() === "event" ? idOf() : "" })), style: LINK }).absentWhenRefused(),
          ui.button(Ask.MAKES_EVENT, { payload: ui.bound(() => ({ id: kindOf() === "memory" ? idOf() : "" })), style: LINK }).absentWhenRefused(),
          ui.button(Ask.MAKES_PERIOD, { payload: ui.bound(() => ({ id: kindOf() === "memory" ? idOf() : "" })), style: LINK }).absentWhenRefused(),
          ui.button(Ask.ASKS_SHARE_MEMORY, { payload: ui.bound(() => ({ id: kindOf() === "memory" ? idOf() : "" })), style: LINK }).absentWhenRefused(),
        ], "Actions"),
        // someone else's: reported to the admins as breaking the terms, or its owner blocked
        ui.when(ui.bound(() => !!entry.read() && !mine.read()), ui.row([
          ui.when(is("memory"), ui.pressable(Kind.REPORTS, ui.bound(() => ({ memory: idOf() })), [ui.text(ui.words(Kind.REPORTS), "Small")], LINK)),
          ui.pressable(Kind.BLOCKS, ui.bound(() => ({ account: entry.read()?.owner ?? "" })),
            [ui.text(ui.bound(() => Phrase.with("Block %s", [entry.read()?.ownerName ?? ""])), "Small")], LINK),
        ], "Actions SafetyRow")),
        Kind.describeReporting(ui, this.safety, ui.bound(() => (kindOf() === "memory" ? idOf() : ""))),
        Kind.describeBlocking(ui, this.safety, account, ui.bound(() => entry.read()?.owner ?? "")),
        Ask.describeNamingEvent(ui, this.asking, ui.bound(() => (kindOf() === "memory" ? idOf() : ""))),
        Ask.describeNamingPeriod(ui, this.asking, account, ui.bound(() => (kindOf() === "memory" ? idOf() : ""))),
        problem(ui, this.asking.problem),
        notice(ui, this.asking.notice),
        ui.when(ui.bound(() => kindOf() === "event" && this.looking.leaving.read() === idOf()), ui.column([
          ui.text(Phrase.of("Take yourself off this event? It leaves your life for good, and you stop seeing it. Your own memories of it stay yours."), "Warn").wraps(),
          ui.row([
            ui.button(LEAVES_EVENT, { payload: ui.bound(() => ({ id: idOf() })), style: DANGER }),
            ui.button(STAYS_ON, { style: LINK }),
          ], "Actions"),
        ])),
        ui.when(ui.bound(() => kindOf() === "period" && this.looking.leaving.read() === idOf()), ui.column([
          ui.text(Phrase.of("Take yourself out of this period? It leaves your life for good, and your memories and events go out of it - they stay yours."), "Warn").wraps(),
          ui.row([
            ui.button(LEAVES_PERIOD, { payload: ui.bound(() => ({ id: idOf() })), style: DANGER }),
            ui.button(STAYS_ON, { style: LINK }),
          ], "Actions"),
        ])),
        ui.when(ui.bound(() => kindOf() === "event" && mine.read()), Ask.describeMerge(ui, this.asking, account, "event", ui.bound(() => idOf()))),
        ui.when(ui.bound(() => kindOf() === "period" && mine.read()), Ask.describeMerge(ui, this.asking, account, "period", ui.bound(() => idOf()))),
        ui.when(is("event"), ui.column([heading(ui, "Everyone's memories of it"), this.timeline(memories, Phrase.of("No memories of it yet."), true)])),
        ui.when(is("period"), ui.column([heading(ui, "During this time"), this.timeline(during, Phrase.of("Nothing else in this life falls in this time yet."))])),
      ]), ui.text(Phrase.of("This isn't here, or isn't shared with you."), "Quiet")),
    ]);
  }

  // --- keeping the page in step ---

  /**
   * The address followed, both ways - once signed in. Signed out, every
   * address waits at the door; an invitation's is kept until signing in.
   */
  keepAddress() {
    const toScreen = (hash) => {
      const [wanted, parameter = ""] = hash.replace(/^#/, "").split("/");
      if (["memory", "event", "period"].includes(wanted) && parameter) return [ITEM, `${wanted}:${parameter}`];
      if ([PERSON, PLACE, JOIN].includes(wanted) && parameter) return [wanted, parameter];
      if ([WOVEN, PEOPLE, PLACES, YOU, TODAY, EVENTS, PERIODS, TIMELINE, MENU, ADMIN, IMPORT, Told.NOTICES, Pay.PAID, Say.FEEDBACK, Hello.WELCOME, Look.FIND].includes(wanted)) return [wanted, null];
      if (wanted === Say.FEEDBACK && parameter) return [Say.FEEDBACK_ITEM, parameter];
      if (wanted === "more") return [MENU, null]; // the menu's address before it was the menu
      return [THREAD, null];
    };
    const go = (screen, parameter) => {
      if (!this.driver.isActive(screen) || (this.driver.getParameter(screen) ?? null) !== parameter) {
        this.commands.dispatch(Chimes.GLOBAL, Driver.GO, { place: screen, parameter });
      }
    };
    const open = () => {
      // the editor's own address: Forward to it, or a reload of it, has no draft to show
      if (location.hash === "#edit" || location.hash === "#view") {
        if (this.driver.isActive(EDIT) || this.driver.isRaised()) return;
        history.replaceState(null, "", `${location.pathname}${location.search}`);
      }
      // the browser's Back with a pop-up raised (the picture viewer) closes it, and goes no further
      if (this.driver.isRaised()) { this.commands.dispatch(Chimes.GLOBAL, Driver.GOES_BACK, {}); return; }
      const [screen, parameter] = toScreen(location.hash);
      if (screen === JOIN) {
        this.keepInvite(parameter);
        // told it is by invitation, and now opening one: asked again
        if (this.account.state._held === "uninvited") this.account.signedIn();
        if (this.account.state._held !== "in") return;
      }
      if (this.account.state._held !== "in") { go(DOOR, null); return; }
      const waiting = this.pendingInvite._held;
      if (waiting) { this.keepInvite(""); go(JOIN, waiting); return; }
      // a first time in, with nothing yet: welcomed, rather than shown an empty life
      if (screen === THREAD && !location.hash && this.welcome.needed()) { go(Hello.WELCOME, null); return; }
      go(screen, parameter);
    };
    open();
    addEventListener("hashchange", open);
    let state = this.account.state._held;
    this.chimes.follow({ region: Chimes.GLOBAL }, "gate", () => {
      const now = this.account.state.read();
      if (now !== state) {
        state = now;
        if (now === "out") Frames.defer(() => { this.looking.reset(); this.people.reset(); this.places.reset(); this.asking.reset(); this.finding.reset(); this.narrowing.reset(); });
        if (now === "in") Frames.defer(() => { this.looking.arrived(); this.phone.check(); });
        Frames.defer(open);
      }
    });
    // the editor is an entry of the browser's history too, so the phone's Back leaves it for where it was opened from
    let beforeEdit = null;
    this.chimes.follow({ region: Chimes.GLOBAL }, "address", () => {
      const top = this.driver.getTop();
      if (top.includes(DOOR)) return;
      // the editor and a pop-up are entries of the browser's history too, each its own
      if (top.includes(EDIT) || this.driver.isRaised()) {
        const own = this.driver.isRaised() ? "#view" : "#edit";
        if (location.hash !== own) {
          if (location.hash === "#edit" || location.hash === "#view") history.replaceState(null, "", own);
          else { beforeEdit = location.hash; history.pushState(null, "", own); }
        }
        return;
      }
      const at = [THREAD, WOVEN, ITEM, PERSON, PLACE, PEOPLE, PLACES, YOU, JOIN, TODAY, EVENTS, PERIODS, TIMELINE, MENU, ADMIN, IMPORT, Told.NOTICES, Pay.PAID, Say.FEEDBACK_ITEM, Say.FEEDBACK, Hello.WELCOME, Look.FIND].find((screen) => top.includes(screen));
      if (!at) return;
      const parameter = this.driver.getParameter(at);
      const address = at === THREAD ? "" : at === ITEM ? `#${String(parameter).replace(":", "/")}`
        : at === Say.FEEDBACK_ITEM ? `#${Say.FEEDBACK}/${parameter}` : parameter ? `#${at}/${parameter}` : `#${at}`;
      const whole = address || `${location.pathname}${location.search}`;
      if (location.hash === "#edit" || location.hash === "#view") {
        // out of the editor or a pop-up: back to the entry it was opened from, or that entry replaced by where it went
        if (address === beforeEdit) history.back(); else history.replaceState(null, "", whole);
        beforeEdit = null;
        return;
      }
      if (location.hash !== address && !(address === "" && location.hash === "")) history.pushState(null, "", whole);
    });
  }

  /** An invitation waiting to be opened once signed in - kept through Google's round trip on a phone. */
  keepInvite(token) {
    try { if (token) sessionStorage.setItem(INVITE_KEPT, token); else sessionStorage.removeItem(INVITE_KEPT); } catch { /* a private window keeps it for this page only */ }
    this.pendingInvite.setValue(token);
  }

  /**
   * The woven picture drawn again whenever what it shows moves - what is
   * seen, which threads, the screen being open. Its marks are links to the
   * addresses the page already follows, so a press or Enter opens one.
   */
  keepLives() {
    // flat: drawn as an SVG to the width there is; a drag in select mode draws a box over it
    let draw = () => {};
    this.chimes.follow({ region: Chimes.GLOBAL }, "lives", () => {
      const open = this.driver.getTop().includes(WOVEN);
      const looking = this.looking;
      const mode = looking.livesIn.read();
      const hidden = looking.livesHidden();
      const range = looking.livesRange.read();
      const selecting = looking.selecting.read();
      const picked = looking.picked.read();
      const found = looking.livesFound();
      looking.tuning.read();
      looking.selection.read();
      const colours = { ink: PALETTE.ink, soft: PALETTE.ink_soft, grid: PALETTE.lit, ground: PALETTE.ground };
      if (!open) return;
      if (mode === "2d") {
        draw = () => this.drawInto("lives-picture", true, (place) => {
          const laid = looking.laidLives(1);
          const drawn = laid ? drawLives(looking.drawnLives(), laid, Math.max(Math.round(place.clientWidth) || 700, 280), colours, range, hidden, picked, found) : null;
          this.livesPoints = drawn?.points ?? [];
          place.classList.toggle("Selecting", selecting);
          return drawn;
        });
        draw();
        return;
      }
      // in space: one Space for the place it is drawn in, given what to draw whenever that changes - the place looked
      // for until the screen has built it, as drawInto does
      const inSpace = (tries) => Frames.defer(() => {
        const place = document.getElementById("lives-space");
        if (!place) { if (tries > 0) setTimeout(() => inSpace(tries - 1), 50); return; }
        if (this.space?.element !== place) {
          this.space = new Space(place, {
            open: (key) => { location.hash = `#${key.replace(":", "/")}`; },
            select: (found) => { this.looking.selection.setValue(found.size ? found : null); },
            pick: (id) => { this.looking.picked.update((was) => (id === was ? null : id)); },
            settings: () => Me.spaceSettings(),
          });
        }
        this.space.setSelecting(selecting);
        const laid = looking.laidLives(2);
        if (laid) this.space.set(looking.drawnLives(), laid, colours, hidden, picked, found);
      });
      inSpace(40);
    });
    addEventListener("resize", () => draw());
    // a line pressed on the flat lives (not selecting): it is picked out - pressed again, or off the lines, none is
    document.addEventListener("click", (event) => {
      const place = event.target?.closest?.("#lives-picture");
      if (!place || this.looking.selecting.read() || event.target.closest("a.mark")) return;
      const life = event.target.closest("[data-life]")?.getAttribute("data-life") ?? null;
      this.looking.picked.update((was) => (life === was ? null : life));
    });
    // a box drawn over the flat lives, in select mode: the lives through it, for the time it spans
    let start = null;
    const box = document.createElement("div");
    box.className = "SelectBox";
    const within = (event) => { const place = event.target?.closest?.("#lives-picture"); return place && this.looking.selecting.read() ? place : null; };
    document.addEventListener("pointerdown", (event) => {
      const place = within(event);
      if (!place) return;
      event.preventDefault();
      const frame = place.getBoundingClientRect();
      start = { place, x: event.clientX - frame.left, y: event.clientY - frame.top };
      place.append(box);
      Object.assign(box.style, { left: `${start.x}px`, top: `${start.y}px`, width: "0px", height: "0px" });
      box.hidden = false;
    });
    document.addEventListener("pointermove", (event) => {
      if (!start) return;
      const frame = start.place.getBoundingClientRect();
      const x = event.clientX - frame.left;
      const y = event.clientY - frame.top;
      Object.assign(box.style, { left: `${Math.min(x, start.x)}px`, top: `${Math.min(y, start.y)}px`, width: `${Math.abs(x - start.x)}px`, height: `${Math.abs(y - start.y)}px` });
      start.end = { x, y };
    });
    document.addEventListener("pointerup", () => {
      if (!start) return;
      const { place, x, y, end } = start;
      start = null;
      box.hidden = true;
      if (!end) return;
      // the picture is drawn at the width it is shown; its height may be scaled to fit
      const svg = place.querySelector("svg");
      const scale = svg ? svg.viewBox.baseVal.width / svg.getBoundingClientRect().width : 1;
      const found = caught(this.livesPoints ?? [], { left: Math.min(x, end.x) * scale, right: Math.max(x, end.x) * scale,
        top: Math.min(y, end.y) * scale, bottom: Math.max(y, end.y) * scale });
      this.looking.selection.setValue(found.size ? found : null);
    });
  }

  /**
   * A place's map (placemap.js), drawn into its form whenever the form is shown, with its point - again as the
   * point changes, or the map is told where to look. Not while probing: a walk has no map servers.
   */
  keepPlaceMap() {
    if (probing) return;
    const map = new PlaceMap((lat, lng) => this.places.setPoint(lat, lng));
    this.chimes.follow({ region: Chimes.GLOBAL }, "place-map", () => {
      const open = this.driver.getTop().includes(PLACE);
      const point = this.places.point.read();
      const view = this.places.view.read();
      this.places.fresh.read();
      if (!open) return;
      const draw = (tries) => Frames.defer(() => {
        const place = document.getElementById("place-map");
        if (!place) { if (tries > 0) setTimeout(() => draw(tries - 1), 50); return; }
        map.show(place, point, view);
      });
      draw(40);
    });
  }

  /** The timeline's chart drawn whenever it is shown, to the width it has - again as that changes. */
  keepTimeline() {
    let draw = () => {};
    this.chimes.follow({ region: Chimes.GLOBAL }, "timeline-chart", () => {
      const open = this.driver.getTop().includes(TIMELINE);
      const weave = this.account.weave.read();
      const hidden = this.looking.timelineHides();
      const range = this.looking.timelineRange.read();
      const found = this.looking.timelineFound();
      draw = () => this.drawInto("timeline-chart", open, (place) => drawTimeline(weave, Math.max(Math.round(place.clientWidth) || 700, 280), new Date(),
        { ink: PALETTE.ink, soft: PALETTE.ink_soft, grid: PALETTE.lit, memory: PALETTE.accent }, hidden, range, found));
      draw();
    });
    let waiting = null;
    addEventListener("resize", () => { clearTimeout(waiting); waiting = setTimeout(() => draw(), 150); });
    this.keepPinch();
  }

  /**
   * The timeline zoomed by a pinch - two fingers apart to zoom in, together to zoom out - about the point
   * between them, which stays under them; and by a trackpad's pinch (a wheel with ctrl held) on a computer.
   */
  keepPinch() {
    // the timeline's chart, or the flat tapestry: each its own stretch of years, and all of its years
    const chart = (target) => target?.closest?.("#timeline-chart, #lives-picture");
    const rangeOf = (place) => (place.id === "lives-picture" ? this.looking.livesRange : this.looking.timelineRange);
    const wholeOf = (place) => (place.id === "lives-picture" ? this.looking.wholeLives() : this.looking.wholeTimeline());
    // where across the plot a point on the screen is: 0 its start, 1 its end (both keep 12 pixels either side)
    const across = (place, x) => { const box = place.getBoundingClientRect(); return (x - box.left - 12) / Math.max(box.width - 24, 1); };
    const zoom = (place, base, factor, at) => {
      rangeOf(place).setValue(rangeZoomed(base, wholeOf(place), factor, at));
      if (place.id === "timeline-chart") this.looking.timelineSpan.setValue("");
    };
    let pinch = null; // { place, apart, at, base }: two fingers down, as they were
    const apart = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    document.addEventListener("touchstart", (event) => {
      const place = chart(event.target);
      if (!place || event.touches.length !== 2) return;
      pinch = { place, apart: apart(event.touches), at: across(place, (event.touches[0].clientX + event.touches[1].clientX) / 2), base: rangeOf(place).read() };
    }, { passive: true });
    let frame = 0;
    document.addEventListener("touchmove", (event) => {
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();
      const factor = apart(event.touches) / Math.max(pinch.apart, 1);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => pinch && zoom(pinch.place, pinch.base, factor, pinch.at));
    }, { passive: false });
    document.addEventListener("touchend", (event) => { if (event.touches.length < 2) pinch = null; }, { passive: true });
    document.addEventListener("wheel", (event) => {
      const place = chart(event.target);
      if (!place || !event.ctrlKey) return;
      event.preventDefault();
      zoom(place, rangeOf(place).read(), Math.exp(-event.deltaY * 0.01), across(place, event.clientX));
    }, { passive: false });
  }

  /** On a phone, the tab of the screen shown swiped into sight along the bottom, wherever the row was left. */
  keepTabs() {
    this.chimes.follow({ region: Chimes.GLOBAL }, "tabs", () => {
      const open = this.driver.getTop().includes(MENU);
      if (open !== this.looking.atMenu._held) Frames.defer(() => this.looking.atMenu.setValue(open));
      Frames.defer(() => document.querySelector("#tabs .chime-current")?.scrollIntoView?.({ inline: "nearest", block: "nearest" }));
    });
  }

  /**
   * A picture drawn into its place while its screen is open: the place is
   * looked for until the screen has built it (a frame or two after it is
   * shown), then drawn by draw(place) - an SVG's text, or null for nothing.
   */
  drawInto(name, open, draw, tries = 40) {
    if (!open) return;
    Frames.defer(() => {
      const place = document.getElementById(name);
      if (!place) { if (tries > 0) setTimeout(() => this.drawInto(name, open, draw, tries - 1), 50); return; }
      const drawn = draw(place);
      place.innerHTML = drawn ? drawn.svg : "";
      place.hidden = !drawn;
    });
  }

  /**
   * Google's button drawn whenever the door shows it: into its place as the
   * door builds it, which may be a frame or two after the door is shown - so
   * it is looked for until it is there (a place looked for once, too soon,
   * left the door without a button).
   */
  keepDoor() {
    let drawn = null; // the place it was drawn into
    const draw = (tries) => {
      if (!(this.account.state.read() === "out" && this.driver.getTop().includes(DOOR))) { drawn = null; return; }
      const place = document.getElementById("google-button");
      if (!place) { if (tries > 0) setTimeout(() => draw(tries - 1), 50); return; }
      if (drawn === place) return;
      drawn = place;
      this.loom.drawGoogleButton(place, (credential, nonce) => this.account.signInWithGoogle(credential, nonce)).catch(() => { drawn = null; });
    };
    this.chimes.follow({ region: Chimes.GLOBAL }, "door", () => {
      this.account.state.read();
      this.driver.getTop();
      Frames.defer(() => draw(40));
    });
  }

  /** What others changed, found again: when the page comes back into sight, and every half hour while it is (pictures' addresses last an hour). */
  keepFresh() {
    const again = () => {
      if (document.hidden || this.account.state.read() !== "in" || this.editor.busy.read()) return;
      this.account.load();
    };
    document.addEventListener("visibilitychange", again);
    setInterval(again, 30 * 60 * 1000);
  }

  // an invitation waiting through signing in: a value of the app's, read by the door
  get pendingInvite() {
    if (!this._pending) {
      let kept = "";
      try { kept = sessionStorage.getItem(INVITE_KEPT) ?? ""; } catch { /* none kept */ }
      this._pending = this.account.value(kept);
    }
    return this._pending;
  }
}

ChimeApp.start(Tapestry, document.getElementById("app"));
