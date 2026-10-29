// What an event or a period holds, however much (backend.sql, "running a big
// event or period"): found by words, in the order chosen - when it happened,
// newest added, most liked - twenty at a time, under its days for a short
// one or its years for a long one; what was added since the member last
// looked, marked; its pinned memories first; its pictures together, sixty at
// a time. Its maker and the admins they make pin memories, take them off it
// (they stay their writer's), and make others admins. Anyone who sees a
// memory likes it: the count is everyone's, who liked it its writer's alone.
// A big event's memories come only in part with a load: opened, all of them.

import { Controller, Phrase, Themes } from "./gd_chime/gd_chime.js?v=e87b274f50a9";
import { DANGER, LINK } from "./look/look.js?v=e87b274f50a9";
import { few, heading, notice, problem } from "./parts.js?v=e87b274f50a9";
import { headingOf, sayWhen } from "./when.js?v=e87b274f50a9";
import { sortEntries } from "./weave.js?v=e87b274f50a9";

export const SEARCHES_CROWD = "finds_in_what_it_holds";
export const ORDERS_CROWD = "orders_what_it_holds";
export const SHOWS_NEW = "shows_only_what_is_new";
export const SHOWS_PHOTOS = "shows_its_pictures_together";
export const SHOWS_MORE_CROWD = "shows_twenty_more";
export const SHOWS_MORE_PHOTOS = "shows_sixty_more_pictures";
export const LIKES = "likes_a_memory";
export const PINS = "pins_a_memory";
export const ASKS_TAKE_OFF = "asks_before_taking_a_memory_off";
export const TAKES_OFF = "takes_a_memory_off";
export const KEEPS_ON = "keeps_the_memory_on";
export const MAKES_ADMIN = "makes_them_one_of_its_admins";
export const APPROVES = "approves_what_waits";
export const DECLINES = "does_not_approve_what_waits";
export const UNMAKES_ADMIN = "makes_them_no_longer_one_of_its_admins";
export const OPENS_RUNNING = "shows_what_can_be_done_with_it";

export const WORDS = {
  [SEARCHES_CROWD]: ["Find in it"],
  [ORDERS_CROWD]: ["Choose the order"],
  [SHOWS_NEW]: ["Only what's new"],
  [SHOWS_PHOTOS]: ["Pictures"],
  [SHOWS_MORE_CROWD]: ["Show 20 more"],
  [SHOWS_MORE_PHOTOS]: ["Show 60 more"],
  [LIKES]: ["Like"],
  [PINS]: ["Pin to the top"],
  [ASKS_TAKE_OFF]: ["Take it off"],
  [TAKES_OFF]: ["Yes, take it off"],
  [KEEPS_ON]: ["No, keep it"],
  [MAKES_ADMIN]: ["Make an admin"],
  [UNMAKES_ADMIN]: ["No longer an admin"],
  [APPROVES]: ["Approve"],
  [DECLINES]: ["Don't approve"],
  [OPENS_RUNNING]: ["More"],
};

const PAGE = 20;
const PHOTOS = 60;
const ORDERS = [["when", "When it happened"], ["added", "Newest added"], ["liked", "Most liked"]];
const SHORT = 60 * 24 * 3600 * 1000; // an event within this, its memories under their days

export class Crowd extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.key = this.value(""); // what is open: "event:<id>" or "period:<id>"
    this.looked = this.value("");
    this.order = this.value("when");
    this.onlyNew = this.value(false);
    this.photos = this.value(false);
    this.shown = this.value(PAGE);
    this.photosShown = this.value(PHOTOS);
    this.since = this.value(null); // when the member had last opened it, before now: what came after is new
    this.asking = this.value(""); // the memory about to be taken off, asked first
    this.running = this.value(""); // the memory whose pin and take-off are shown, by who runs it: one at a time
    this.busy = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
  }

  answers() { return Object.keys(WORDS); }

  /** Signed out: nothing of the last member's stays for the next. */
  reset() { this.key.setValue(""); this.account.focus = null; }

  /** The event or period open, and its item. */
  item() {
    const [kind, id] = this.key.read().split(":");
    const weave = this.account.weave.read();
    return { kind, id, item: ({ event: weave.events, period: weave.periods })[kind]?.get(id) ?? null };
  }

  /** Whether the member runs it: its maker, or one of its admins. */
  runs() {
    const { item } = this.item();
    const me = this.account.weave.read().meId;
    return !!item && (item.owner === me || (item.admins ?? []).includes(me));
  }

  /** Opened: from its top, what is new to the member since they last looked kept; all of a big event fetched. */
  open(key) {
    if (!key || !/^(event|period):/.test(key)) return;
    const [kind, id] = key.split(":");
    if (key !== this.key.read()) {
      this.key.setValue(key);
      this.looked.setValue("");
      this.order.setValue("when");
      this.onlyNew.setValue(false);
      this.photos.setValue(false);
      this.shown.setValue(PAGE);
      this.photosShown.setValue(PHOTOS);
      this.asking.setValue("");
      this.problem.setValue("");
      this.notice.setValue("");
      const { item } = this.item();
      this.since.setValue(item?.opened_at ?? null);
      this.loom.openedNow(kind, id);
    }
    // a big event: its memories came only in part; all of them now
    const weave = this.account.weave.read();
    const event = kind === "event" ? weave.events.get(id) : null;
    if (event && event.memory_count > weave.data.memories.filter((m) => m.event_id === id).length && this.account.focus !== id) {
      this.account.focus = id;
      this.account.load();
    }
  }

  would(action, payload) {
    if (this.busy.read() && [LIKES, PINS, TAKES_OFF, MAKES_ADMIN, UNMAKES_ADMIN, APPROVES, DECLINES].includes(action)) return Phrase.of("A moment");
    if ([PINS, ASKS_TAKE_OFF, TAKES_OFF, MAKES_ADMIN, UNMAKES_ADMIN, APPROVES, DECLINES].includes(action) && !this.runs()) return Phrase.of("Only its maker or its admins");
    if ((action === PINS || action === ASKS_TAKE_OFF) && this.statusOf(this.entryOf(payload?.id))) return Phrase.of("Not approved");
    if ((action === PINS || action === ASKS_TAKE_OFF) && !this.ofIt(payload?.id)) return Phrase.of("Not of it");
    if (action === LIKES && !this.account.weave.read().memories.get(payload?.id)) return Phrase.of("Not a memory");
    return null;
  }

  /** Whether a memory is of it: of the event, or put in the period - not merely during it. */
  ofIt(memoryId) {
    const { kind, id } = this.item();
    const memory = this.account.weave.read().memories.get(memoryId);
    if (!memory) return false;
    return kind === "event" ? memory.event_id === id : (memory.period_ids ?? []).includes(id);
  }

  told(action, payload) {
    this.problem.setValue("");
    this.notice.setValue("");
    const { kind, id, item } = this.item();
    if (action === SEARCHES_CROWD) { this.looked.setValue(payload.line); this.shown.setValue(PAGE); }
    if (action === ORDERS_CROWD) { this.order.setValue(payload.order); this.shown.setValue(PAGE); }
    if (action === SHOWS_NEW) { this.onlyNew.update((only) => !only); this.shown.setValue(PAGE); }
    if (action === SHOWS_PHOTOS) this.photos.update((shown) => !shown);
    if (action === SHOWS_MORE_CROWD) this.shown.update((n) => n + PAGE);
    if (action === SHOWS_MORE_PHOTOS) this.photosShown.update((n) => n + PHOTOS);
    if (action === LIKES) {
      const memory = this.account.weave.read().memories.get(payload.id);
      this.change(() => this.loom.like(payload.id, !memory?.liked), "");
    }
    if (action === PINS) {
      const pinned = (item?.pinned ?? []).includes(payload.id);
      this.change(() => this.loom.pin(kind, id, payload.id, !pinned), pinned ? "Unpinned" : "Pinned to the top");
    }
    if (action === OPENS_RUNNING) this.running.update((open) => (open === payload.id ? "" : payload.id));
    if (action === ASKS_TAKE_OFF) this.asking.setValue(payload.id);
    if (action === KEEPS_ON) this.asking.setValue("");
    if (action === TAKES_OFF) {
      this.asking.setValue("");
      this.change(() => this.loom.takeOff(kind, id, payload.id), "Taken off: it stays its writer's, and they are told");
    }
    if (action === APPROVES || action === DECLINES) {
      const yes = action === APPROVES;
      this.change(() => this.loom.approve(kind, id, payload.what, payload.id, yes), yes ? "Approved: it is in it for everyone who sees it" : "Not approved: it is there for its writer alone, who is told");
    }
    if (action === MAKES_ADMIN || action === UNMAKES_ADMIN) {
      this.change(() => this.loom.setAdmin(kind, id, payload.account, action === MAKES_ADMIN), action === MAKES_ADMIN ? "Made an admin" : "No longer an admin");
    }
    return null;
  }

  async change(work, said) {
    this.busy.setValue(true);
    const done = await work();
    await this.account.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!done.ok) { this.problem.setValue(done.error); return; }
    if (said) this.notice.setValue(said);
  }

  /** Everything it holds, as entries: an event's memories, everyone's; a period's own, and what of its life falls in it. */
  all() {
    const { kind, id } = this.item();
    const weave = this.account.weave.read();
    return kind === "event" ? weave.memoriesOf(id) : kind === "period" ? weave.during(id) : [];
  }

  /** One of what it holds, by its id. */
  entryOf(id) { return this.all().find((e) => e.id === id) ?? null; }

  /**
   * Whether one of what it holds is approved there: null if it is; else "waiting" or "declined" - what its writer sees
   * of their own, and those running it of what waits for them.
   */
  statusOf(entry) {
    if (!entry) return null;
    const { kind, id } = this.item();
    const weave = this.account.weave.read();
    if (kind === "event" && entry.kind === "memory") {
      const approval = weave.memories.get(entry.id)?.approval;
      return approval && approval !== "approved" ? approval : null;
    }
    if (kind === "period") {
      const thing = entry.kind === "memory" ? weave.memories.get(entry.id) : entry.kind === "event" ? weave.events.get(entry.id) : null;
      if (!thing) return null;
      if ((thing.periods_declined ?? []).includes(id)) return "declined";
      if (entry.kind === "event" && thing.approval_by?.[id]) return thing.approval_by[id];
      if ((thing.periods_unapproved ?? []).includes(id)) return "waiting";
    }
    return null;
  }

  /** What waits for those running it to approve it, the oldest first: theirs to see. */
  waiting() { return this.runs() ? this.all().filter((e) => this.statusOf(e) === "waiting" && e.owner !== this.account.weave.read().meId) : []; }

  /** When an entry was added. */
  added(entry) {
    const weave = this.account.weave.read();
    return ({ memory: weave.memories, event: weave.events, period: weave.periods })[entry.kind]?.get(entry.id)?.created_at ?? "";
  }

  isNew(entry) {
    const since = this.since.read();
    return !!since && entry.owner !== this.account.weave.read().meId && this.added(entry) > since;
  }

  likesOf(entry) { return entry.kind === "memory" ? this.account.weave.read().memories.get(entry.id)?.likes ?? 0 : 0; }

  /** What is listed: found by what is typed, only what is new if chosen, pinned ones apart, in the order chosen. */
  listed() {
    const weave = this.account.weave.read();
    const pinned = new Set(this.item().item?.pinned ?? []);
    // what waits for those running it is theirs to approve, apart; its writer sees their own among the rest, marked
    const waiting = new Set(this.waiting().map((e) => e.key));
    let entries = weave.find(this.all().filter((e) => !waiting.has(e.key)), this.looked.read(), this.account.foundInTexts(this.looked.read()));
    if (this.onlyNew.read()) entries = entries.filter((e) => this.isNew(e));
    if (!this.looked.read().trim() && !this.onlyNew.read()) entries = entries.filter((e) => !(e.kind === "memory" && pinned.has(e.id)));
    const order = this.order.read();
    if (order === "added") return [...entries].sort((a, b) => String(this.added(b)).localeCompare(String(this.added(a))));
    if (order === "liked") return [...sortEntries(entries)].sort((a, b) => this.likesOf(b) - this.likesOf(a));
    return sortEntries(entries);
  }

  /** The pinned ones, in the order they were pinned. */
  pinned() {
    const ids = this.item().item?.pinned ?? [];
    const all = this.all();
    return ids.map((id) => all.find((e) => e.kind === "memory" && e.id === id)).filter(Boolean);
  }

  /** The rows shown: headings - its days, for a short event in its own time order; else years - and as many entries as shown. */
  rows() {
    const listed = this.listed();
    const shown = listed.slice(0, this.shown.read());
    if (this.order.read() !== "when") return shown.map((entry) => ({ key: entry.key, entry }));
    const dates = listed.map((e) => e.when?.date).filter(Boolean).map((d) => Date.parse(d)).filter((t) => !Number.isNaN(t));
    const short = dates.length > 1 && Math.max(...dates) - Math.min(...dates) <= SHORT;
    const headOf = (entry) => (!entry.when?.date ? "When not known"
      : short ? (entry.when.precision === "day" ? sayWhen({ date: entry.when.date, precision: "day" }) : entry.said) : headingOf(entry.when));
    const rows = [];
    let last = null;
    for (const entry of shown) {
      const head = headOf(entry);
      if (head !== last) { rows.push({ key: `heading:${head}`, heading: head }); last = head; }
      rows.push({ key: entry.key, entry });
    }
    return rows;
  }

  /** How many there are in all, of what is listed: of a big event not yet fetched whole, as many as the platform counted. */
  total() {
    const listed = this.listed().length;
    const { kind, item } = this.item();
    const pinned = this.pinned().length;
    if (kind === "event" && !this.looked.read().trim() && !this.onlyNew.read()) return Math.max(listed, (item?.memory_count ?? 0) - pinned);
    return listed;
  }

  /** Its pictures, every memory's, in the order of what is listed: as many as shown. */
  pictures() {
    const weave = this.account.weave.read();
    return this.listed().filter((e) => e.kind === "memory")
      .flatMap((e) => (weave.memories.get(e.id)?.pictures ?? []).map((p) => ({ key: p.id ?? p.path, path: p.thumb || p.path, caption: p.caption, memory: e.key })));
  }
}

/**
 * What an event or period holds, with how to find, order and run it. card(held) draws one entry as the timeline
 * does; opens is the action that opens one (its parameter its key), and item the screen it opens on.
 */
export function describeCrowd(ui, crowd, account, card, opens, item, emptySaid) {
  const weave = account.weave;
  const isEvent = ui.bound(() => crowd.item().kind === "event");
  const runs = ui.bound(() => { weave.read(); return crowd.runs(); });
  const newCount = ui.bound(() => { weave.read(); crowd.since.read(); return crowd.all().filter((e) => crowd.isNew(e)).length; });
  const rows = ui.bound(() => { weave.read(); crowd.looked.read(); crowd.order.read(); crowd.onlyNew.read(); crowd.shown.read(); return crowd.rows(); });
  const total = ui.bound(() => { weave.read(); crowd.looked.read(); crowd.onlyNew.read(); return crowd.total(); });
  const shownCount = ui.bound(() => rows.read().filter((r) => r.entry).length);
  const pinned = ui.bound(() => { weave.read(); return crowd.pinned(); });
  const photos = ui.bound(() => { weave.read(); crowd.looked.read(); crowd.onlyNew.read(); return crowd.pictures(); });
  // what may be done with one, in its card's corner: new, liked (who liked their own, for its writer) and, for who runs
  // it, more - pinned and taken off, shown only when asked for
  const corner = (held) => {
    const memory = ui.bound(() => (held.read()?.kind === "memory" ? weave.read().memories.get(held.read().id) ?? null : null));
    const id = held.map((e) => ({ id: e?.id ?? "" }));
    return ui.when(memory, ui.row([
      ui.text(ui.bound(() => (crowd.isNew(held.read() ?? {}) ? Phrase.of("New") : "")), "NewMark").hidesEmpty(),
      ui.pressable(LIKES, id, [ui.text(memory.map((m) => `${m?.liked ? "♥" : "♡"} ${m?.likes ?? 0}`), "HeartWords"),
        ui.text(memory.map((m) => (m?.likers ?? []).join(", ")), "Likers").hidesEmpty()], "Heart").currentWhile(memory.map((m) => !!m?.liked)),
      ui.when(runs, ui.pressable(OPENS_RUNNING, id, [ui.text("⋯", "HeartWords")], "Heart").currentWhile(ui.bound(() => crowd.running.read() === held.read()?.id))),
    ], "CrowdCorner"));
  };
  const running = (held) => {
    const id = held.map((e) => ({ id: e?.id ?? "" }));
    return ui.column([
      // its writer's own, not approved there: said so
      ui.text(ui.bound(() => {
        const status = crowd.statusOf(held.read());
        const it = crowd.item().item;
        return status === "waiting" ? Phrase.with("Waiting for %s to approve it", [weave.read().nameOf(it?.owner)])
          : status === "declined" ? Phrase.of("Only you see this here: not added for everyone") : "";
      }), "Hint").wraps().hidesEmpty(),
      ui.when(ui.bound(() => runs.read() && crowd.running.read() === held.read()?.id && crowd.asking.read() !== held.read()?.id), ui.row([
        ui.pressable(PINS, id, [ui.text(ui.bound(() => Phrase.of((crowd.item().item?.pinned ?? []).includes(held.read()?.id) ? "Unpin" : "Pin to the top")), "Small")], LINK)
          .absentWhenRefused(),
        ui.pressable(ASKS_TAKE_OFF, id, [ui.text(ui.bound(() => Phrase.of(isEvent.read() ? "Take it off the event" : "Take it out of the period")), "Small")], LINK).absentWhenRefused(),
      ], "Actions CrowdActions")),
      ui.when(ui.bound(() => crowd.asking.read() === held.read()?.id), ui.column([
        ui.text(Phrase.of("Take this memory off it? It stays its writer's, on their life; they are told."), "Warn").wraps(),
        ui.row([ui.pressable(TAKES_OFF, id, [ui.text(ui.words(TAKES_OFF), "Small")], DANGER), ui.pressable(KEEPS_ON, {}, [ui.text(ui.words(KEEPS_ON), "Small")], LINK)], "Actions"),
      ])),
    ]);
  };
  const entry = (held) => ui.column([ui.column([card(held), corner(held)], "CrowdCard"), running(held)], "CrowdEntry");
  // who runs it: its maker, and the admins they made; who else at it may be made one
  const admins = ui.bound(() => {
    const it = crowd.item().item;
    const w = weave.read();
    return it ? [{ account: it.owner, name: w.nameOf(it.owner), maker: true }, ...(it.admins ?? []).map((a) => ({ account: a, name: w.nameOf(a), maker: false }))] : [];
  });
  const candidates = ui.bound(() => {
    const { item: it } = crowd.item();
    if (!it) return [];
    const w = weave.read();
    const running = new Set([it.owner, ...(it.admins ?? [])]);
    const at = crowd.item().kind === "event" ? w.threadsAt(it) : [it.owner, ...it.tags.map((t) => t.account).filter(Boolean)];
    return [...new Set(at)].filter((a) => !running.has(a)).map((a) => ({ account: a, name: w.nameOf(a) }));
  });
  const waiting = ui.bound(() => { weave.read(); return crowd.waiting(); });
  return ui.column([
    // what waits for those running it to approve it
    ui.when(waiting.map((w) => w.length > 0), ui.surface("Card Asked", [ui.column([
      ui.text(waiting.map((w) => Phrase.counted("Waiting for you to approve: %d", "Waiting for you to approve: %d", w.length)), "PartHeading"),
      ui.text(Phrase.of("Approved, it is in it for everyone who sees it. Not approved, it stays its writer's, there for them alone - nothing goes into what you run without your yes."), "Hint").wraps(),
      ui.each(waiting, (held) => ui.column([
        card(held),
        ui.row([
          ui.pressable(APPROVES, held.map((e) => ({ id: e?.id ?? "", what: e?.kind ?? "memory" })), [ui.text(ui.words(APPROVES), "Small")], "FactoryAction"),
          ui.pressable(DECLINES, held.map((e) => ({ id: e?.id ?? "", what: e?.kind ?? "memory" })), [ui.text(ui.words(DECLINES), "Small")], LINK),
        ], "Actions"),
      ], "CrowdEntry"), (e) => `waiting:${e.key}`, "Timeline"),
    ], "Part")])),
    ui.when(pinned.map((p) => p.length > 0), ui.column([
      heading(ui, "Pinned"),
      ui.each(pinned, entry, (e) => `pinned:${e.key}`, "Timeline"),
    ])),
    ui.field(SEARCHES_CROWD, "", { changes: SEARCHES_CROWD, shows: crowd.looked, placeholder: Phrase.of("Find in it: words, who, where") }),
    ui.row([
      ...ORDERS.map(([order, said]) => ui.pressable(ORDERS_CROWD, { order }, [ui.text(Phrase.of(said), Themes.FACE)], "Segment").currentWhile(crowd.order.map((o) => o === order))),
    ], "Segments"),
    ui.row([
      ui.when(newCount.map((n) => n > 0), ui.pressable(SHOWS_NEW, {}, [ui.text(newCount.map((n) => Phrase.counted("New since you last looked: %d", "New since you last looked: %d", n)), Themes.FACE)], "Segment")
        .currentWhile(crowd.onlyNew)),
      ui.when(photos.map((p) => p.length > 0), ui.pressable(SHOWS_PHOTOS, {}, [ui.text(ui.words(SHOWS_PHOTOS), Themes.FACE)], "Segment").currentWhile(crowd.photos)),
    ], "Segments"),
    problem(ui, crowd.problem),
    notice(ui, crowd.notice),
    // its pictures together, sixty at a time, each opening its memory
    ui.when(crowd.photos, ui.column([
      ui.eachAcross(ui.bound(() => photos.read().slice(0, crowd.photosShown.read())), (held) => ui.pressable(opens, held.map((p) => ({ parameter: p?.memory ?? "" })),
        [ui.image(held.map((p) => (p ? account.address(p.path) : "")), "Thumb CrowdPhoto", held.map((p) => p?.caption || Phrase.of("A picture")))], "PhotoButton").goesTo(item),
      (p) => p.key, "CrowdPhotos"),
      ui.when(ui.bound(() => photos.read().length > crowd.photosShown.read()),
        ui.pressable(SHOWS_MORE_PHOTOS, {}, [ui.text(ui.bound(() => Phrase.with("Show 60 more (%s further)", [String(photos.read().length - crowd.photosShown.read())])), Themes.FACE)], LINK)),
    ])),
    ui.when(ui.bound(() => !crowd.photos.read()), ui.column([
      ui.when(total.map((n) => n === 0), ui.text(emptySaid, "Quiet").wraps()),
      ui.each(rows, (held) => ui.when(held.map((row) => !!row?.heading), ui.text(held.map((row) => row?.heading ?? ""), "YearHeading"),
        entry(held.map((row) => row?.entry ?? null))), (row) => row.key, "Timeline"),
      ui.text(ui.bound(() => (total.read() > PAGE ? Phrase.with("Showing %s of %s", [String(shownCount.read()), String(total.read())]) : "")), "Hint").hidesEmpty(),
      ui.when(ui.bound(() => total.read() > shownCount.read()), ui.pressable(SHOWS_MORE_CROWD, {}, [ui.text(ui.words(SHOWS_MORE_CROWD), Themes.FACE)], LINK)),
    ])),
    // run by its maker and the admins they make: shown to them
    ui.when(runs, ui.column([
      heading(ui, "Who runs it"),
      ui.text(Phrase.of("Its maker and its admins pin memories to its top, take off what doesn't belong (it stays its writer's), and make others admins."), "Hint").wraps(),
      ui.each(admins, (held) => ui.row([
        ui.text(held.map((a) => (a?.maker ? Phrase.with("%s · its maker", [a.name]) : a?.name ?? "")), "Words").grow(),
        ui.when(held.map((a) => !!a && !a.maker), ui.pressable(UNMAKES_ADMIN, held.map((a) => ({ account: a?.account ?? "" })), [ui.text(ui.words(UNMAKES_ADMIN), "Small")], LINK)),
      ], "PersonRow"), (a) => a.account, "List"),
      ui.when(candidates.map((c) => c.length > 0), ui.column([
        ui.text(Phrase.of("Make someone at it an admin"), "FieldName"),
        few(ui, "crowd-admins", candidates, (c) => c.name, (held) => ui.pressable(MAKES_ADMIN, held.map((c) => ({ account: c?.account ?? "" })),
          [ui.text(held.map((c) => c?.name ?? ""), "Small")], "Segment"), { finds: "Find someone at it by name", keyOf: (c) => c.account, style: "Segments" }),
      ])),
    ])),
  ]);
}
