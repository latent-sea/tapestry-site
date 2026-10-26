// The tapestry as the signed-in member sees it: everything the platform let
// them see (tapestry_visible() in backend.sql), and what the screens ask of
// it - a thread, everyone's threads woven together, where they cross, what
// is at a place or about a person, and who would see a thing before it is
// saved. No browser and no platform: plain data in, plain data out, tested
// by tests/test_weave.mjs.

import { headingOf, sayAges, sayLength, saySpan, sortKey, within } from "./when.js?v=2abad7652e6f";
import { linksOf } from "./links.js?v=2abad7652e6f";

export const EMPTY = Object.freeze({ me: null, members: {}, people: [], circles: [], places: [], periods: [], events: [], memories: [], requests: [], notices: [] });

// what each thing is with nothing said of it: a light load (tapestry_visible_light) leaves out what is
// empty - null, [], false, "" - and the page takes each as its kind's nothing
const SPAN = { starts: null, starts_precision: null, starts_about: false, starts_time: null, ends: null, ends_precision: null, ends_about: false, ends_time: null };
const NOTHING = {
  memories: { title: "", body: "", links: [], labels: [], ...SPAN, event_id: null, place_id: null, audience: null, created_at: null, tags: [], shares: [], pictures: [], cut: false },
  events: { title: "", notes: "", ...SPAN, place_id: null, audience: null, created_at: null, tags: [], shares: [] },
  periods: { title: "", notes: "", ...SPAN, place_id: null, audience: null, created_at: null, tags: [], shares: [] },
};

/** What was loaded, with each memory, event and period whole: what a light load left out put back as nothing. */
export function filled(data) {
  const whole = { ...EMPTY, ...(data ?? {}) };
  for (const [list, nothing] of Object.entries(NOTHING)) whole[list] = whole[list].map((thing) => ({ ...nothing, ...thing }));
  return whole;
}

/** The audiences a member chooses between, in the order offered, with their words. */
export const AUDIENCES = [
  ["me", "Only me"],
  ["there", "People who were there"],
  ["connections", "All my people"],
  ["chosen", "Only who I pick"],
];

/** A memory's, event's or period's start or end (which: "starts" or "ends"), as a time, or null. */
/** A memory's periods: its list, or the one period_id a platform from before there could be more gives. */
export function periodsOf(memory) {
  return [...(memory?.period_ids ?? (memory?.period_id ? [memory.period_id] : []))];
}

export function timeOf(item, which) {
  if (!item || !item[which]) return null;
  const time = { date: item[which], precision: item[`${which}_precision`] || "day", about: !!item[`${which}_about`] };
  // a start may have its time of day (a journal's entry)
  if (item[`${which}_time`]) time.time = item[`${which}_time`];
  return time;
}
const lower = (text) => String(text ?? "").toLowerCase();

/** A list of names as a sentence: "Mum", "Mum and Sam", "Mum, Sam and Jo". */
export function listed(names) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * The threads' colours, in a fixed order: the member's own first, then their
 * linked people's in the order they were linked, so a colour follows its
 * thread and never moves when someone new comes. Eight hues, validated as a
 * set on the factory's navy grounds (the dataviz palette's dark steps: every
 * neighbour told apart in every colour vision, each at least 3:1 on the
 * ground); a ninth thread on is drawn in the quiet grey, its name beside it.
 */
export const THREAD_COLOURS = Object.freeze(["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"]);
export const OTHER_COLOUR = "#8e9ab8";

const two = (n) => String(n).padStart(2, "0");

/** The parts of a card a member may choose to see, as You names them, and that each is shown unless said not. */
export const CARD_PARTS = [["words", "The words"], ["pictures", "Pictures"], ["people", "Who"], ["place", "Where"], ["inside", "An event's memories"],
  ["ages", "How old you were"], ["lengths", "How long"]];
// light cards (just when and the title, one line each) only when chosen
const CARD_PARTS_SHOWN = { ...Object.fromEntries(CARD_PARTS.map(([key]) => [key, true])), light: false };

export class Weave {
  constructor(data = EMPTY) {
    this.data = filled(data);
    const byId = (list) => new Map(list.map((item) => [item.id, item]));
    this.people = byId(this.data.people);
    this.circles = byId(this.data.circles);
    this.places = byId(this.data.places);
    this.periods = byId(this.data.periods);
    this.events = byId(this.data.events);
    this.memories = byId(this.data.memories);
    this.linked = new Map(this.data.people.filter((p) => p.account).map((p) => [p.account, p]));
    const order = [this.meId, ...[...this.linked.values()].sort((a, b) => String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""))).map((p) => p.account)];
    this.colours = new Map(order.filter(Boolean).map((account, i) => [account, THREAD_COLOURS[i] ?? OTHER_COLOUR]));
    // a weave is what one load saw, and never changes: each entry, and each thread, is worked out once and
    // kept - every screen and card reads them, and a life of hundreds of memories would be worked out again
    // at every read
    this.made = new Map();
  }

  /** A thread's colour: the same for an account wherever it is drawn; grey for one the member doesn't follow. */
  colourOf(account) { return this.colours.get(account) ?? OTHER_COLOUR; }

  /** The signed-in member's id, or "". */
  get meId() { return this.data.me?.id ?? ""; }

  get me() { return this.data.me; }

  /** What the cards of a timeline show the member: each part shown unless they said not (You). */
  get cardShows() { return { ...CARD_PARTS_SHOWN, ...(this.data.me?.card_shows ?? {}) }; }

  /** The member's birthday ("YYYY-MM-DD"), seen by them alone, or null: their times may be ages. */
  get born() { return this.data.me?.birthday ?? null; }

  /** What others did that touches the member, newest first (backend.sql, "notices"). */
  get notices() { return this.data.notices; }

  /** The labels on the member's own memories, each once, in order: [{ label, count }]. */
  get labels() {
    return this.kept("labels", () => {
      const counted = new Map();
      for (const memory of this.data.memories) if (memory.owner === this.meId) for (const label of memory.labels ?? []) counted.set(label, (counted.get(label) ?? 0) + 1);
      return [...counted].sort(([a], [b]) => a.localeCompare(b)).map(([label, count]) => ({ label, count }));
    });
  }

  /** The memories a light load sent cut short: their words past the first 2000 are fetched when wanted. */
  get cutIds() { return this.kept("cut", () => this.data.memories.filter((m) => m.cut).map((m) => m.id)); }

  // --- names ---

  /** What the member calls an account: "You", their own name for a person they're linked to, else the name that member goes by. */
  nameOf(account) {
    if (!account) return "";
    if (account === this.meId) return "You";
    return this.linked.get(account)?.name ?? this.data.members[account] ?? "Someone";
  }

  /** A tag's name, as the member knows them. */
  tagName(tag) {
    if (tag.account === this.meId && this.meId) return "You";
    if (tag.person && this.people.has(tag.person)) return this.people.get(tag.person).name;
    if (tag.account && this.linked.has(tag.account)) return this.linked.get(tag.account).name;
    return tag.name;
  }

  // --- when ---

  /** When something starts and ends: { starts, ends }, a memory with no time of its own taking its event's. */
  spanOf(kind, item) {
    if (kind === "memory" && !item.starts) {
      const event = this.events.get(item.event_id);
      return event ? this.spanOf("event", event) : { starts: null, ends: null };
    }
    return { starts: timeOf(item, "starts"), ends: timeOf(item, "ends") };
  }

  // --- who is where ---

  /** Whether an account is at an event: its maker, or tagged there. */
  isAt(event, account) { return !!event && (event.owner === account || event.tags.some((tag) => tag.account === account)); }

  /** Every account an event's threads come from: its maker's and everyone tagged there, linked. */
  threadsAt(event) {
    return [...new Set([event.owner, ...event.tags.map((tag) => tag.account).filter(Boolean)])];
  }

  // --- asking ---

  /** What the member asked, and what waits for their answer (backend.sql, "asking"). */
  get requests() { return this.data.requests ?? []; }

  /** Everyone on Tapestry the member knows of but hasn't linked, by name: whom they may ask "is this you?". */
  knownMembers() {
    return Object.entries(this.data.members).filter(([account]) => account !== this.meId && !this.linked.has(account))
      .map(([account, name]) => ({ account, name })).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * What an event or a place of the member's might be the same as - their own, or someone else's
   * they see: those named as looked for; else those sharing a word of its name, or an event's time.
   */
  twinsOf(kind, id, looked = "") {
    const list = kind === "event" ? this.data.events : this.data.places;
    const self = list.find((item) => item.id === id);
    if (!self) return [];
    const nameOf = (item) => (kind === "event" ? item.title : item.name) ?? "";
    const words = (text) => lower(text).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);
    const own = new Set(words(nameOf(self)));
    const wanted = lower(looked).trim();
    const span = kind === "event" ? this.spanOf("event", self) : null;
    return list.filter((item) => item.id !== id).filter((item) => (wanted ? lower(nameOf(item)).includes(wanted)
      : words(nameOf(item)).some((w) => own.has(w)) || (span && within(timeOf(item, "starts"), span.starts, span.ends ?? span.starts, timeOf(item, "ends")))))
      .slice(0, 8)
      .map((item) => ({ id: item.id, label: [nameOf(item), kind === "event" ? this.entry("event", item).said : "",
        item.owner === this.meId ? "yours" : `${this.nameOf(item.owner)}'s`].filter(Boolean).join(" · ") }));
  }

  /** Whether the member may say "I was there too" of a memory: someone else's, whose event (if any) they aren't at, not asked yet. */
  mayShareMemory(memoryId) {
    const memory = this.memories.get(memoryId);
    if (!memory || memory.owner === this.meId) return false;
    if (memory.event_id) return this.mayAskAt(memory.event_id);
    return !this.requests.some((r) => r.mine && r.kind === "memory" && r.memory === memoryId);
  }

  /** Whether the member may ask to be at an event: someone else's, they aren't at it, and haven't asked. */
  mayAskAt(eventId) {
    const event = this.events.get(eventId);
    return !!event && event.owner !== this.meId && !this.isAt(event, this.meId)
      && !this.requests.some((r) => r.mine && r.kind === "event" && r.event === eventId);
  }

  /** The accounts whose threads the member can follow: their own, then their linked people's, in their colours' order. */
  threads() { return [...this.colours.keys()]; }

  // --- entries: what a timeline shows ---

  /** One thing on a timeline, as every screen shows it. */
  entry(kind, item) {
    const key = `${kind}:${item.id}`;
    if (this.made.get(key)?.item !== item) this.made.set(key, { item, entry: this.makeEntry(kind, item) });
    return this.made.get(key).entry;
  }

  /** What an entry is, worked out (entry() keeps it). */
  makeEntry(kind, item) {
    const mine = item.owner === this.meId;
    const place = this.places.get(item.place_id) ?? null;
    const people = item.tags.map((tag) => this.tagName(tag));
    // names of someone else's, linked to no one: the member may ask to be one of them
    const unlinked = item.tags.filter((tag) => tag.unlinked).map((tag) => ({ id: tag.unlinked, name: tag.name }));
    const base = {
      key: `${kind}:${item.id}`, kind, id: item.id, owner: item.owner, ownerName: this.nameOf(item.owner), mine,
      colour: this.colourOf(item.owner), place: place ? { id: place.id, name: place.name } : null, people, unlinked,
      pictures: [], event: null, periods: [], threads: [item.owner],
    };
    const { starts: when, ends: until } = this.spanOf(kind, item);
    // a period with no end is still going; anything else with none happened once
    // a memory is a moment: its start and end are the edges of a guess at when; an event or a period lasts
    const guess = kind === "memory";
    const said = saySpan(when, until, kind === "period" ? "now" : "", guess);
    // how old the member was then, when Tapestry knows their birthday; how long it lasted: a period still going, until today
    const today = new Date();
    const going = kind === "period" && when && !until ? { date: `${today.getFullYear()}-${two(today.getMonth() + 1)}-${two(today.getDate())}`, precision: "day" } : null;
    base.age = sayAges(this.born, when, until ?? going, guess);
    base.lasts = guess ? "" : sayLength(when, until ?? going, !!going);
    if (kind === "memory") {
      const event = this.events.get(item.event_id);
      // the periods of the member's life it was during, as many as overlap
      const periods = periodsOf(item).map((id) => this.periods.get(id)).filter(Boolean).map((p) => ({ id: p.id, title: p.title }));
      const firstLine = item.body.trim().split("\n")[0];
      const title = item.title || (firstLine.length > 70 ? `${firstLine.slice(0, 67)}…` : firstLine) || "A memory";
      const links = linksOf(item);
      return { ...base, when, until, said, title, text: item.body, pictures: item.pictures, links, labels: item.labels ?? [],
        videos: links.filter((l) => l.video).map((l) => l.video.poster),
        event: event ? { id: event.id, title: event.title } : item.event_id ? { id: item.event_id, title: "" } : null,
        periods };
    }
    if (kind === "event") {
      const memories = this.data.memories.filter((m) => m.event_id === item.id);
      // a grouping of memories: everyone's of it the member sees, inside it
      return { ...base, when, until, said, title: item.title, text: item.notes, threads: this.threadsAt(item),
        memoryCount: memories.length, pictures: memories.flatMap((m) => m.pictures).slice(0, 4),
        inside: sortEntries(memories.map((m) => this.entry("memory", m))) };
    }
    return { ...base, when, until, said, title: item.title, text: item.notes };
  }

  /** Everything visible, as entries. */
  everything() {
    return this.kept("everything", () => [
      ...this.data.periods.map((p) => this.entry("period", p)),
      ...this.data.events.map((e) => this.entry("event", e)),
      ...this.data.memories.map((m) => this.entry("memory", m)),
    ]);
  }

  /** Something worked out once for this weave, by its name, and kept. */
  kept(name, work) {
    if (!this.made.has(name)) this.made.set(name, { entry: work() });
    return this.made.get(name).entry;
  }

  /** An account's thread: what they own, and the events they are at. */
  thread(account) {
    return this.kept(`thread:${account}`, () => this.everything().filter((entry) => entry.owner === account || (entry.kind === "event" && entry.threads.includes(account))));
  }

  /** The threads of these accounts woven together: each thing once, events where any of them is. */
  woven(accounts) {
    const wanted = new Set(accounts);
    return this.kept(`woven:${[...wanted].sort().join(",")}`,
      () => this.everything().filter((entry) => wanted.has(entry.owner) || (entry.kind === "event" && entry.threads.some((a) => wanted.has(a)))));
  }

  /** Who of these accounts crossed at an entry: for an event, every one of them at it. */
  crossing(entry, accounts) {
    if (entry.kind !== "event") return [];
    return entry.threads.filter((a) => accounts.includes(a));
  }

  /**
   * The entries whose words, people, place or event hold what is looked for;
   * also, any memory among these ids (cut short memories the platform found
   * the words in, past what was sent).
   */
  find(entries, looked, also = null) {
    const words = lower(looked).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return entries;
    // the same list looked through for the same words is found once (every screen and card asks)
    if (!FOUND.has(entries)) FOUND.set(entries, new Map());
    const found = FOUND.get(entries);
    const key = `${words.join(" ")}|${[...(also ?? [])].join(",")}`;
    if (!found.has(key)) found.set(key, this.findIn(entries, words, also));
    return found.get(key);
  }

  /** The entries holding every one of these words, or among these memories. */
  findIn(entries, words, also = null) {
    return entries.filter((entry) => {
      // what it is found by, worked out once for the entry
      entry.hay ??= lower([entry.title, entry.text, entry.said, entry.ownerName, entry.place?.name, entry.event?.title, ...(entry.periods ?? []).map((p) => p.title), ...entry.people,
        ...(entry.labels ?? []).flatMap((label) => [label, `#${label}`])].join(" "));
      return words.every((word) => entry.hay.includes(word)) || (entry.kind === "memory" && !!also?.has(entry.id));
    });
  }

  /** Everything at a place: tied to it, or (a memory) at an event there. */
  atPlace(placeId) {
    return this.everything().filter((entry) => entry.place?.id === placeId
      || (entry.kind === "memory" && this.events.get(this.memories.get(entry.id).event_id)?.place_id === placeId));
  }

  /** Everything about one of the member's people: where they are tagged, and if linked, their own thread as far as it is seen. */
  aboutPerson(personId) {
    const person = this.people.get(personId);
    if (!person) return [];
    const items = { period: this.periods, event: this.events, memory: this.memories };
    return this.everything().filter((entry) => {
      const tags = items[entry.kind].get(entry.id).tags;
      return tags.some((tag) => tag.person === personId || (person.account && tag.account === person.account))
        || (person.account && entry.owner === person.account);
    });
  }

  /** The memories of an event, by everyone, in order. */
  memoriesOf(eventId) { return sortEntries(this.data.memories.filter((m) => m.event_id === eventId).map((m) => this.entry("memory", m))); }

  /** What happened during a period on its owner's thread: memories tied to it, and anything else of theirs within its time. */
  during(periodId) {
    const period = this.periods.get(periodId);
    if (!period) return [];
    const { starts, ends } = this.spanOf("period", period);
    return sortEntries(this.thread(period.owner).filter((entry) => entry.key !== `period:${periodId}`
      && ((entry.kind === "memory" && periodsOf(this.memories.get(entry.id)).includes(periodId)) || within(entry.when, starts, ends, entry.until))));
  }

  // --- coming back ---

  /** What the member's people shared since a moment (an ISO time), newest first: nothing at all before a first visit is over. */
  newSince(since) {
    if (!since) return [];
    const made = (kind, item) => item.owner !== this.meId && item.created_at && item.created_at > since;
    const fresh = [
      ...this.data.memories.filter((m) => made("memory", m)).map((m) => this.entry("memory", m)),
      ...this.data.events.filter((e) => made("event", e)).map((e) => this.entry("event", e)),
      ...this.data.periods.filter((p) => made("period", p)).map((p) => this.entry("period", p)),
    ];
    const createdOf = (entry) => ({ memory: this.memories, event: this.events, period: this.periods })[entry.kind].get(entry.id).created_at;
    return fresh.sort((a, b) => createdOf(b).localeCompare(createdOf(a)));
  }

  /** What happened on this day of the year, in earlier years, on threads the member sees: memories and events known to the day. */
  onThisDay(today = new Date()) {
    const md = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return sortEntries(this.everything().filter((entry) => entry.kind !== "period" && entry.when?.precision === "day"
      && entry.when.date.slice(5) === md && Number(entry.when.date.slice(0, 4)) < today.getFullYear()), true);
  }

  // --- who sees it ---

  /**
   * Who would see one of the member's own memories, events or periods, as
   * the platform decides it (backend.sql): { seen, notOnTapestry, summary }.
   * draft: { kind, audience, tags: [person ids], eventId, shares: [{ person | circle, allowed }] }.
   */
  audienceOf(draft) {
    const accountOf = (personId) => this.people.get(personId)?.account ?? null;
    const peopleOf = (share) => (share.person ? [share.person] : this.circles.get(share.circle)?.people ?? []);
    const seen = new Set();
    if (draft.audience === "there") {
      for (const id of draft.tags) if (accountOf(id)) seen.add(accountOf(id));
      const event = draft.kind === "memory" ? this.events.get(draft.eventId) : null;
      if (event) for (const account of this.threadsAt(event)) seen.add(account);
    }
    if (draft.audience === "connections") for (const account of this.linked.keys()) seen.add(account);
    const kept = new Set();
    for (const share of draft.shares) {
      for (const id of peopleOf(share)) {
        const account = accountOf(id);
        if (!account) continue;
        if (share.allowed) seen.add(account); else kept.add(account);
      }
    }
    for (const account of kept) seen.delete(account);
    seen.delete(this.meId);
    const names = [...seen].map((account) => this.nameOf(account)).sort((a, b) => a.localeCompare(b));
    // those named who would see it if they were on Tapestry
    const named = [...draft.tags, ...draft.shares.filter((s) => s.allowed).flatMap(peopleOf)];
    const notOnTapestry = [...new Set(named.filter((id) => this.people.has(id) && !accountOf(id)).map((id) => this.people.get(id).name))].sort();
    const summary = names.length ? listed(["You", ...names]) : "Only you";
    return { seen: [...seen], names, notOnTapestry, summary };
  }

  /** The member's own default audience for a kind of thing. */
  defaultAudience(kind) { return this.data.me?.[`${kind}_audience`] ?? (kind === "period" ? "connections" : "there"); }
}

// on the same time, a period before an event, and an event before the memories of it
const KINDS = ["period", "event", "memory"];

/** Entries in the order of their times, oldest first, the broader first on a day, undated last. */
export function sortEntries(entries, newestFirst = false) {
  // each entry's place worked out once, not at every comparison
  for (const entry of entries) entry.sortsAs ??= sortKey(entry.when);
  const sorted = [...entries].sort((a, b) => (a.sortsAs < b.sortsAs ? -1 : a.sortsAs > b.sortsAs ? 1 : 0) || KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || a.title.localeCompare(b.title));
  if (!newestFirst) return sorted;
  const dated = sorted.filter((entry) => entry.when).reverse();
  return [...dated, ...sorted.filter((entry) => !entry.when)];
}

/**
 * An event is a grouping of memories: where an event is among the entries,
 * the memories of it are inside it (entry.inside: everyone's the member
 * sees, in time order) rather than beside it.
 */
export function grouped(entries) {
  const events = new Set(entries.filter((entry) => entry.kind === "event").map((entry) => entry.id));
  return entries.filter((entry) => !(entry.kind === "memory" && events.has(entry.event?.id)));
}

// what has been worked out of a list of entries, kept with the list (a weave's lists never change)
const FOUND = new WeakMap();
const TIMELINES = new WeakMap();

/** The years (or decades) a thread's memories are in, as its timeline heads them; memories with no time left out. */
export function yearsOfMemories(entries) {
  return [...new Set(entries.filter((entry) => entry.kind === "memory" && entry.when?.date).map((entry) => headingOf(entry.when)))];
}

/** One of these at random - not the one before, while there is another - or null with none. */
export function pickAnother(list, before = null, random = Math.random) {
  const others = list.length > 1 ? list.filter((item) => item !== before) : list;
  return others.length ? others[Math.min(Math.floor(random() * others.length), others.length - 1)] : null;
}

/** A timeline's rows: each entry under the heading of its year (or decade), a heading wherever it changes; an event's memories inside it. Worked out once for a list and an order. */
export function timeline(entries, newestFirst = false) {
  if (!TIMELINES.has(entries)) TIMELINES.set(entries, {});
  const kept = TIMELINES.get(entries);
  kept[newestFirst] ??= rowsOf(entries, newestFirst);
  return kept[newestFirst];
}

function rowsOf(entries, newestFirst) {
  const rows = [];
  let heading = null;
  for (const entry of sortEntries(grouped(entries), newestFirst)) {
    const under = headingOf(entry.when);
    if (under !== heading) { heading = under; rows.push({ key: `heading:${under}`, heading: under }); }
    rows.push(entry);
  }
  return rows;
}
