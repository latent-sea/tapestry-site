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

import { ChimeApp, Chimes, Controller, Driver, Frames, Phrase, Themes, Ui } from "./gd_chime/gd_chime.js?v=627a8c37f81e";
import { Loom } from "./loom.js?v=627a8c37f81e";
import { Account, JOINS, RELOADS, SETS_JOIN_NAME, SIGNS_OUT, WORDS as ACCOUNT_WORDS } from "./account.js?v=627a8c37f81e";
import * as Edit from "./editor.js?v=627a8c37f81e";
import * as Folk from "./people.js?v=627a8c37f81e";
import * as Where from "./places.js?v=627a8c37f81e";
import * as Me from "./you.js?v=627a8c37f81e";
import * as Today from "./journal.js?v=627a8c37f81e";
import * as Ask from "./asking.js?v=627a8c37f81e";
import { listed, timeline } from "./weave.js?v=627a8c37f81e";
import { heading, mark, notice, problem } from "./parts.js?v=627a8c37f81e";
import { drawWoven } from "./woven.js?v=627a8c37f81e";
import { CARD, DANGER, FactoryLook, LINK, PALETTE } from "./look/look.js?v=627a8c37f81e";

const probing = new URLSearchParams(location.search).has("probe");
const LOOM = probing ? new (await import("./tests/standin.js?v=627a8c37f81e")).StandIn() : new Loom();

// the screens
const DOOR = "door";
const THREAD = "thread";
const WOVEN = "tapestry";
const ITEM = "item"; // a memory, event or period, entered as "<kind>:<id>"
const { EDIT } = Edit;
const { PEOPLE, PERSON, JOIN } = Folk;
const { PLACES, PLACE } = Where;
const { YOU } = Me;

const GOES_THREAD = "goes_to_my_thread";
const GOES_WOVEN = "goes_to_the_tapestry";
const GOES_PEOPLE = "goes_to_my_people";
const GOES_PLACES = "goes_to_my_places";
const GOES_YOU = "goes_to_me";
const OPENS_ITEM = "opens_it";
const SEARCHES_THREAD = "searches_my_thread";
const SEARCHES_WOVEN = "searches_the_tapestry";
const FLIPS_ORDER = "turns_the_order_around";
const TOGGLES_THREAD = "shows_or_hides_a_thread";
const SHOWS_PICTURE = "shows_the_picture";
const SHOWS_EARLIER = "shows_the_picture_before";
const SHOWS_LATER = "shows_the_picture_after";
const LEAVES_EVENT = "takes_me_off_this_event";
const ASKS_TO_LEAVE = "asks_before_taking_me_off";
const STAYS_ON = "keeps_me_on_this_event";

const KIND_SAID = { memory: "Memory", event: "Event", period: "Period" };
const INVITE_KEPT = "tapestry_invitation";
const ORDER_KEPT = "tapestry_order";
const SEEN_KEPT = "tapestry_seen_at";
const NEW_SHOWN = 5;

/** The order timelines were last read in on this device: newest first unless turned around. */
function keptOrder() {
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
    this.newestFirst = this.value(keptOrder()); // a journal reads newest first; a life story may be read either way
    this.hidden = this.value([]); // accounts whose threads the tapestry leaves out
    this.leaving = this.value(""); // the event being asked about before the member takes themselves off it
    this.since = this.value(null); // when the member was last here, on this device: what is new is what came after
    this.problem = this.value("");
  }

  answers() { return [OPENS_ITEM, SEARCHES_THREAD, SEARCHES_WOVEN, FLIPS_ORDER, TOGGLES_THREAD, LEAVES_EVENT, ASKS_TO_LEAVE, STAYS_ON]; }

  would(action, payload) {
    if (action === LEAVES_EVENT || action === ASKS_TO_LEAVE) {
      const weave = this.account.weave.read();
      const event = weave.events.get(payload?.id);
      if (!event || event.owner === weave.meId || !weave.isAt(event, weave.meId)) return Phrase.of("Only someone tagged there by another takes themselves off");
    }
    return null;
  }

  told(action, payload) {
    if (action === SEARCHES_THREAD) this.threadSearch.setValue(payload.line);
    if (action === SEARCHES_WOVEN) this.wovenSearch.setValue(payload.line);
    if (action === FLIPS_ORDER) {
      this.newestFirst.update((newest) => !newest);
      try { localStorage.setItem(ORDER_KEPT, this.newestFirst.read() ? "newest" : "oldest"); } catch { /* this visit only */ }
    }
    if (action === TOGGLES_THREAD) this.hidden.update((hidden) => (hidden.includes(payload.account) ? hidden.filter((a) => a !== payload.account) : [...hidden, payload.account]));
    if (action === ASKS_TO_LEAVE) this.leaving.setValue(payload.id);
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
    this.hidden.setValue([]);
    this.leaving.setValue("");
    this.problem.setValue("");
  }

  async leave(eventId) {
    const left = await this.loom.leaveEvent(eventId);
    await this.account.load();
    this.problem.setValue(left.ok ? "" : left.error);
  }

  /** The threads the tapestry weaves: every one the member follows, less those hidden. */
  shown() {
    const hidden = this.hidden.read();
    return this.account.weave.read().threads().filter((a) => !hidden.includes(a));
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
      [GOES_THREAD]: ["My thread"],
      [GOES_WOVEN]: ["Tapestry"],
      [GOES_PEOPLE]: ["People"],
      [GOES_PLACES]: ["Places"],
      [GOES_YOU]: ["You"],
      [OPENS_ITEM]: ["Open"],
      [SHOWS_PICTURE]: ["Show the picture"],
      [SHOWS_EARLIER]: ["Previous"],
      [SHOWS_LATER]: ["Next"],
      [SEARCHES_THREAD]: ["Find on my thread"],
      [SEARCHES_WOVEN]: ["Find in the tapestry"],
      [FLIPS_ORDER]: ["Turn the order around"],
      [TOGGLES_THREAD]: ["Show their thread"],
      [LEAVES_EVENT]: ["Yes, take me off it"],
      [ASKS_TO_LEAVE]: ["Take me off this event"],
      [STAYS_ON]: ["No, keep me on it"],
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
    this.you = this.model(new Me.You(this.chimes, LOOM, this.account, (size) => FactoryLook.make(PALETTE, size).dress(this.element)));
    const timelineOf = (entries, empty, woven = false) => this.timeline(entries, empty, woven);
    return ui.app("tapestry_app", [
      this.nav(),
      ui.stack([
        this.door(), this.threadScreen(), this.wovenScreen(), this.itemScreen(),
        Edit.describeEditor(ui, this.editor, this.account),
        Folk.describePeople(ui, this.people, this.account), Folk.describePerson(ui, this.people, this.account, timelineOf, this.asking), Folk.describeJoin(ui, this.people),
        Where.describePlaces(ui, this.places, this.account), Where.describePlace(ui, this.places, this.account, timelineOf),
        Me.describeYou(ui, this.you, this.account),
      ]),
    ]);
  }

  // loaded only when the page is walked (?probe), so an export leaves it out
  probe() { return import("./probe.js?v=627a8c37f81e").then((made) => new made.Probe(this)); }

  mount(element) {
    super.mount(element);
    this.started.then((stood) => { if (stood) { this.keepAddress(); this.keepDoor(); this.keepFresh(); this.keepWoven(); } });
    return this;
  }

  // --- the shell ---

  nav() {
    const ui = this.ui;
    const links = [[GOES_THREAD, THREAD], [GOES_WOVEN, WOVEN], [GOES_PEOPLE, PEOPLE], [GOES_PLACES, PLACES], [GOES_YOU, YOU]];
    return ui.when(this.account.state.map((s) => s === "in"), ui.row([
      ui.text("Tapestry", "Wordmark"),
      ui.row(links.map(([action, screen]) => ui.pressable(action, {}, [ui.text(ui.words(action), "NavWords")], "NavLink").goesTo(screen)), "Nav"),
    ], "TopNav"));
  }

  door() {
    const ui = this.ui;
    const account = this.account;
    const state = account.state;
    const inviting = ui.bound(() => (this.pendingInvite.read() ? Phrase.of("Sign in to accept your invitation.") : ""));
    return ui.screen(DOOR, [
      ui.column([
        ui.text("Tapestry", "DoorTitle"),
        ui.text(Phrase.of("Everyone has their own thread. Where they cross is where the story is."), "DoorLine").wraps(),
        ui.text(inviting, "Notice").wraps().hidesEmpty(),
        ui.when(state.map((s) => s === "checking"), ui.text(Phrase.of("Opening…"), "Quiet")),
        ui.when(state.map((s) => s === "out"), ui.column([
          ui.text(Phrase.of("Sign in to start your thread, or to see the ones shared with you."), "Hint").wraps(),
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
          ui.button(JOINS),
        ])),
        problem(ui, account.problem),
        ui.when(account.problem, ui.button(RELOADS, { style: LINK })),
      ], "Door"),
    ]);
  }

  threadScreen() {
    const ui = this.ui;
    const account = this.account;
    const entries = ui.bound(() => { const w = account.weave.read(); return w.find(w.thread(w.meId), this.looking.threadSearch.read()); });
    return ui.screen(THREAD, [
      ui.text(Phrase.of("Your thread"), "Title"),
      Today.describeToday(ui, this.journal),
      Ask.describeAsked(ui, this.asking, account),
      this.comingBack(),
      ui.row([
        ui.button(Edit.ADDS_MEMORY, { with: "memory:new", goes_to: EDIT }),
        ui.button(Edit.ADDS_EVENT, { with: "event:new", goes_to: EDIT, style: LINK }),
        ui.button(Edit.ADDS_PERIOD, { with: "period:new", goes_to: EDIT, style: LINK }),
      ], "Actions"),
      this.finder(SEARCHES_THREAD, this.looking.threadSearch),
      this.timeline(entries, ui.bound(() => (this.looking.threadSearch.read().trim() ? Phrase.of("Nothing found.")
        : Phrase.of("Your thread is empty. Start with a memory, or a period of your life - where you grew up, a job, a house.")))),
    ]);
  }

  wovenScreen() {
    const ui = this.ui;
    const account = this.account;
    const looking = this.looking;
    const threads = account.weave.map((w) => w.threads());
    const entries = ui.bound(() => { const w = account.weave.read(); return w.find(w.woven(looking.shown()), looking.wovenSearch.read()); });
    return ui.screen(WOVEN, [
      ui.text(Phrase.of("The tapestry"), "Title"),
      ui.text(Phrase.of("Your thread and the threads of your people, as far as they share them, woven together. Where threads cross, it says so."), "Hint").wraps(),
      ui.eachAcross(threads, (held) => ui.pressable(TOGGLES_THREAD, held.map((a) => ({ account: a ?? "" })), [
        mark(ui, held.map((a) => account.weave.read().colourOf(a))), ui.text(ui.bound(() => account.weave.read().nameOf(held.read())), Themes.FACE),
      ], "Segment").currentWhile(ui.bound(() => !looking.hidden.read().includes(held.read()))), (a) => a, "Segments"),
      // the threads drawn: each a lane, a knot where they cross; each mark a link to what it is (keepWoven)
      ui.surface("WovenPicture", []).named("woven-picture"),
      ui.text(Phrase.of("Each thread is a lane: a period a thick run, a memory a dot, and a knot where threads cross at an event. Press any of them to open it."), "Hint").wraps(),
      this.finder(SEARCHES_WOVEN, looking.wovenSearch),
      this.timeline(entries, ui.bound(() => (looking.shown().length === 0 ? Phrase.of("Every thread is hidden: press a name above to show it.")
        : looking.wovenSearch.read().trim() ? Phrase.of("Nothing found.")
          : Phrase.of("Nothing woven yet. Invite your people from People, and tag each other at events."))), true),
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
      ui.pressable(FLIPS_ORDER, {}, [ui.text(this.looking.newestFirst.map((n) => Phrase.of(n ? "Newest first" : "Oldest first")), "Small")], LINK),
    ], "Finder");
  }

  /** Entries as a timeline, under their years; woven, each says whose thread it is on. */
  timeline(entries, empty, woven = false) {
    const ui = this.ui;
    const rows = ui.bound(() => timeline(entries.read(), this.looking.newestFirst.read()));
    return ui.column([
      ui.when(entries.map((list) => list.length === 0), ui.text(empty, "Quiet").wraps()),
      ui.each(rows, (held) => ui.when(held.map((row) => !!row?.heading), ui.text(held.map((row) => row?.heading ?? ""), "YearHeading"),
        this.card(held, woven)), (row) => row.key, "Timeline"),
    ]);
  }

  /** One entry on a timeline: what, when, whose, with whom, where, its pictures, and the threads crossing at it. */
  card(held, woven) {
    const ui = this.ui;
    const account = this.account;
    const crossing = held.map((e) => (e?.kind === "event" && e.threads.length > 1 ? e.threads : []));
    return ui.pressable(OPENS_ITEM, held.map((e) => ({ parameter: e?.key ?? "" })), [ui.row([
      ui.column([mark(ui, held.map((e) => e?.colour ?? ""))], "ThreadMark"),
      ui.column([
        ui.row([
          ui.text(held.map((e) => Phrase.of(KIND_SAID[e?.kind] ?? "Memory")), "Kind"),
          ui.text(held.map((e) => e?.said ?? ""), "When").hidesEmpty(),
          ui.text(held.map((e) => (e?.age ? Phrase.with("You were %s", [e.age]) : "")), "Age").hidesEmpty(),
          woven ? ui.text(held.map((e) => (e?.mine ? "" : Phrase.with("%s's thread", [e?.ownerName ?? ""]))), "Whose").hidesEmpty() : null,
        ].filter(Boolean), "CardTop"),
        ui.text(held.map((e) => e?.title ?? ""), "CardTitle").wraps(),
        ui.text(held.map((e) => (e?.kind === "memory" && e.title !== e.text.trim().split("\n")[0] ? e.text : e?.kind !== "memory" ? e?.text ?? "" : "")), "CardText").wraps().hidesEmpty(),
        ui.row([
          ui.text(held.map((e) => (e?.place ? Phrase.with("At %s", [e.place.name]) : "")), "Meta").hidesEmpty(),
          ui.text(held.map((e) => (e?.people?.length ? Phrase.with("With %s", [listed(e.people)]) : "")), "Meta").wraps().hidesEmpty(),
          ui.text(held.map((e) => (e?.event?.title ? Phrase.with("Of %s", [e.event.title]) : "")), "Meta").hidesEmpty(),
          ui.text(held.map((e) => (e?.memoryCount ? Phrase.counted("%d memory", "%d memories", e.memoryCount) : "")), "Meta").hidesEmpty(),
          ui.text(held.map((e) => {
            const others = (e?.links ?? []).filter((l) => !l.video).length;
            return others ? Phrase.counted("%d link", "%d links", others) : "";
          }), "Meta").hidesEmpty(),
        ], "MetaRow"),
        ui.eachAcross(held.map((e) => (e?.pictures ?? []).slice(0, 4)), (pic) => ui.image(pic.map((p) => (p ? account.address(p.path) : "")), "Thumb",
          pic.map((p) => p?.caption || Phrase.of("A picture"))),
          (p) => p.id, "Thumbs"),
        ui.eachAcross(held.map((e) => (e?.videos ?? []).slice(0, 2)), (poster) => ui.image(poster, "Thumb VideoThumb", Phrase.of("A video")), null, "Thumbs"),
        ui.when(crossing.map((c) => c.length > 0), ui.row([
          ui.eachAcross(crossing, (who) => mark(ui, who.map((a) => account.weave.read().colourOf(a)), "SmallDot"), null, "Dots"),
          ui.text(ui.bound(() => Phrase.with("Threads cross here: %s", [listed(crossing.read().map((a) => account.weave.read().nameOf(a)))])), "Crossing").wraps(),
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
    const at = (which) => ui.bound(() => (which === "event" ? item.read()?.event_id : item.read()?.period_id) ?? "");
    const linkTo = (which) => ui.when(ui.bound(() => !!(which === "event" ? entry.read()?.event?.title : entry.read()?.period?.title)),
      ui.pressable(OPENS_ITEM, ui.bound(() => ({ parameter: `${which}:${at(which).read()}` })), [ui.text(ui.bound(() => Phrase.with(which === "event" ? "Of %s" : "During %s",
        [(which === "event" ? entry.read()?.event?.title : entry.read()?.period?.title) ?? ""])), "LinkWords")], "Link").goesTo(ITEM));
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
    const memories = ui.bound(() => (kindOf() === "event" ? account.weave.read().memoriesOf(idOf()) : []));
    const during = ui.bound(() => (kindOf() === "period" ? account.weave.read().during(idOf()) : []));
    return ui.screen(ITEM, [
      ui.when(entry, ui.column([
        ui.row([
          mark(ui, entry.map((e) => e?.colour ?? "")),
          ui.text(entry.map((e) => Phrase.of(KIND_SAID[e?.kind] ?? "Memory")), "Kind"),
          ui.text(entry.map((e) => e?.said ?? ""), "When").hidesEmpty(),
          ui.text(entry.map((e) => (e?.age ? Phrase.with("You were %s", [e.age]) : "")), "Age").hidesEmpty(),
          ui.text(entry.map((e) => (e?.mine ? Phrase.of("Your thread") : Phrase.with("%s's thread", [e?.ownerName ?? ""]))), "Whose"),
        ], "CardTop"),
        ui.text(entry.map((e) => e?.title ?? ""), "Title").wraps(),
        ui.text(entry.map((e) => (e?.kind === "memory" && !item.read()?.title ? e.text.trim().split("\n").slice(1).join("\n").trim() : e?.text ?? "")), "Words Body").wraps().hidesEmpty(),
        ui.each(pictures, (pic) => ui.pressable(SHOWS_PICTURE, pic.map((p) => ({ parameter: p?.path ?? "" })), [
          ui.image(pic.map((p) => (p ? account.address(p.path) : "")), "Picture", pic.map((p) => p?.caption || Phrase.of("A picture"))),
          ui.text(pic.map((p) => p?.caption ?? ""), "Caption").wraps().hidesEmpty(),
        ], "PictureButton").opens(viewer), (p) => p.id, "Pictures"),
        // its links: a YouTube video plays here, from YouTube's privacy-enhanced address, loading nothing until pressed
        ui.each(entry.map((e) => e?.links ?? []), (link) => ui.when(link.map((l) => !!l?.video),
          ui.embed(link.map((l) => l?.video?.src ?? ""), { title: Phrase.of("A video"), poster: link.map((l) => l?.video?.poster ?? ""), style: "Video" }),
          ui.hyperlink(link.map((l) => l?.url ?? ""), [ui.text(link.map((l) => l?.site ?? ""), "LinkSite"), ui.text(link.map((l) => l?.url ?? ""), "LinkAddress").wraps()],
            "LinkOut")), (l) => l.url, "Links"),
        ui.when(entry.map((e) => !!e?.place), ui.pressable(Where.OPENS_PLACE, entry.map((e) => ({ parameter: e?.place?.id ?? "" })),
          [ui.text(entry.map((e) => Phrase.with("At %s", [e?.place?.name ?? ""])), "LinkWords")], "Link").goesTo(PLACE)),
        linkTo("event"),
        linkTo("period"),
        ui.when(people.map((p) => p.length > 0), ui.column([
          ui.text(ui.bound(() => Phrase.of(kindOf() === "event" ? "Who was there" : "With")), "FieldName"),
          ui.text(people.map((p) => listed(p)), "Words").wraps(),
        ])),
        Ask.describeThatsMe(ui, this.asking, account, entry),
        ui.when(ui.bound(() => (entry.read()?.threads?.length ?? 0) > 1), ui.text(ui.bound(() => Phrase.with("Threads cross here: %s",
          [listed((entry.read()?.threads ?? []).map((a) => account.weave.read().nameOf(a)))])), "Crossing").wraps()),
        ui.text(seenBy, "Seen").wraps().hidesEmpty(),
        problem(ui, this.looking.problem),
        ui.row([
          ui.button(Edit.EDITS, { with: key, goes_to: EDIT }).absentWhenRefused(),
          ui.button(Edit.ADDS_MEMORY_TO, { with: ui.bound(() => `memory:new:event:${kindOf() === "event" ? idOf() : ""}`), goes_to: EDIT }).absentWhenRefused(),
          ui.when(ui.bound(() => kindOf() === "period" && mine.read()),
            ui.button(Edit.ADDS_MEMORY, { with: ui.bound(() => `memory:new:period:${idOf()}`), goes_to: EDIT, style: LINK })),
          ui.when(ui.bound(() => this.looking.leaving.read() !== idOf()),
            ui.button(ASKS_TO_LEAVE, { payload: ui.bound(() => ({ id: kindOf() === "event" ? idOf() : "" })), style: LINK }).absentWhenRefused()),
          ui.button(Ask.ASKS_AT_EVENT, { payload: ui.bound(() => ({ id: kindOf() === "event" ? idOf() : "" })), style: LINK }).absentWhenRefused(),
        ], "Actions"),
        problem(ui, this.asking.problem),
        notice(ui, this.asking.notice),
        ui.when(ui.bound(() => kindOf() === "event" && this.looking.leaving.read() === idOf()), ui.column([
          ui.text(Phrase.of("Take yourself off this event? It leaves your thread for good, and you stop seeing it. Your own memories of it stay yours."), "Warn").wraps(),
          ui.row([
            ui.button(LEAVES_EVENT, { payload: ui.bound(() => ({ id: idOf() })), style: DANGER }),
            ui.button(STAYS_ON, { style: LINK }),
          ], "Actions"),
        ])),
        ui.when(is("event"), ui.column([heading(ui, "Everyone's memories of it"), this.timeline(memories, Phrase.of("No memories of it yet."), true)])),
        ui.when(is("period"), ui.column([heading(ui, "During this time"), this.timeline(during, Phrase.of("Nothing else on this thread falls in this time yet."))])),
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
      if ([WOVEN, PEOPLE, PLACES, YOU].includes(wanted)) return [wanted, null];
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
      go(screen, parameter);
    };
    open();
    addEventListener("hashchange", open);
    let state = this.account.state._held;
    this.chimes.follow({ region: Chimes.GLOBAL }, "gate", () => {
      const now = this.account.state.read();
      if (now !== state) {
        state = now;
        if (now === "out") Frames.defer(() => { this.looking.reset(); this.people.reset(); this.places.reset(); this.asking.reset(); });
        if (now === "in") Frames.defer(() => this.looking.arrived());
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
      const at = [THREAD, WOVEN, ITEM, PERSON, PLACE, PEOPLE, PLACES, YOU, JOIN].find((screen) => top.includes(screen));
      if (!at) return;
      const parameter = this.driver.getParameter(at);
      const address = at === THREAD ? "" : at === ITEM ? `#${String(parameter).replace(":", "/")}` : parameter ? `#${at}/${parameter}` : `#${at}`;
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
  keepWoven() {
    this.chimes.follow({ region: Chimes.GLOBAL }, "woven", () => {
      const open = this.driver.getTop().includes(WOVEN);
      const weave = this.account.weave.read();
      const shown = this.looking.shown();
      Frames.defer(() => {
        const place = document.getElementById("woven-picture");
        if (!place || !open) return;
        const drawn = drawWoven(weave, shown, new Date(), { ground: PALETTE.ground, ink: PALETTE.ink, soft: PALETTE.ink_soft, grid: PALETTE.lit });
        place.innerHTML = drawn ? drawn.svg : "";
        place.hidden = !drawn;
      });
    });
  }

  /** Google's button drawn whenever the door shows it. */
  keepDoor() {
    let drawn = false;
    this.chimes.follow({ region: Chimes.GLOBAL }, "door", () => {
      const out = this.account.state.read() === "out" && this.driver.getTop().includes(DOOR);
      Frames.defer(() => {
        if (out && !drawn) {
          const place = document.getElementById("google-button");
          if (place) { drawn = true; this.loom.drawGoogleButton(place, (credential, nonce) => this.account.signInWithGoogle(credential, nonce)).catch(() => { drawn = false; }); }
        }
        if (!out) drawn = false;
      });
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
