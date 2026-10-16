// The tapestry as the signed-in member sees it: everything the platform let
// them see (tapestry_visible() in backend.sql), and what the screens ask of
// it - a thread, everyone's threads woven together, where they cross, what
// is at a place or about a person, and who would see a thing before it is
// saved. No browser and no platform: plain data in, plain data out, tested
// by tests/test_weave.mjs.

import { ageDuring, headingOf, saySpan, sortKey, within } from "./when.js?v=627a8c37f81e";
import { linksOf } from "./links.js?v=627a8c37f81e";

export const EMPTY = Object.freeze({ me: null, members: {}, people: [], circles: [], places: [], periods: [], events: [], memories: [], requests: [] });

/** The audiences a member chooses between, in the order offered, with their words. */
export const AUDIENCES = [
  ["me", "Only me"],
  ["there", "People who were there"],
  ["connections", "All my people"],
  ["chosen", "Only who I pick"],
];

/** A memory's, event's or period's start or end (which: "starts" or "ends"), as a time, or null. */
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

export class Weave {
  constructor(data = EMPTY) {
    this.data = { ...EMPTY, ...(data ?? {}) };
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
  }

  /** A thread's colour: the same for an account wherever it is drawn; grey for one the member doesn't follow. */
  colourOf(account) { return this.colours.get(account) ?? OTHER_COLOUR; }

  /** The signed-in member's id, or "". */
  get meId() { return this.data.me?.id ?? ""; }

  get me() { return this.data.me; }

  /** The member's birthday ("YYYY-MM-DD"), seen by them alone, or null: their times may be ages. */
  get born() { return this.data.me?.birthday ?? null; }

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
    const mine = item.owner === this.meId;
    const place = this.places.get(item.place_id) ?? null;
    const people = item.tags.map((tag) => this.tagName(tag));
    // names of someone else's, linked to no one: the member may ask to be one of them
    const unlinked = item.tags.filter((tag) => tag.unlinked).map((tag) => ({ id: tag.unlinked, name: tag.name }));
    const base = {
      key: `${kind}:${item.id}`, kind, id: item.id, owner: item.owner, ownerName: this.nameOf(item.owner), mine,
      colour: this.colourOf(item.owner), place: place ? { id: place.id, name: place.name } : null, people, unlinked,
      pictures: [], event: null, period: null, threads: [item.owner],
    };
    const { starts: when, ends: until } = this.spanOf(kind, item);
    // a period with no end is still going; anything else with none happened once
    const said = saySpan(when, until, kind === "period" ? "now" : "", this.born);
    // how old the member was then, when Tapestry knows their birthday: a period still going, until today
    const today = new Date();
    const going = kind === "period" && when && !until ? { date: `${today.getFullYear()}-${two(today.getMonth() + 1)}-${two(today.getDate())}`, precision: "day" } : null;
    base.age = ageDuring(this.born, when, until ?? going);
    if (kind === "memory") {
      const event = this.events.get(item.event_id);
      const period = this.periods.get(item.period_id);
      const firstLine = item.body.trim().split("\n")[0];
      const title = item.title || (firstLine.length > 70 ? `${firstLine.slice(0, 67)}…` : firstLine) || "A memory";
      const links = linksOf(item);
      return { ...base, when, until, said, title, text: item.body, pictures: item.pictures, links,
        videos: links.filter((l) => l.video).map((l) => l.video.poster),
        event: event ? { id: event.id, title: event.title } : item.event_id ? { id: item.event_id, title: "" } : null,
        period: period ? { id: period.id, title: period.title } : null };
    }
    if (kind === "event") {
      const memories = this.data.memories.filter((m) => m.event_id === item.id);
      return { ...base, when, until, said, title: item.title, text: item.notes, threads: this.threadsAt(item),
        memoryCount: memories.length, pictures: memories.flatMap((m) => m.pictures).slice(0, 4) };
    }
    return { ...base, when, until, said, title: item.title, text: item.notes };
  }

  /** Everything visible, as entries. */
  everything() {
    return [
      ...this.data.periods.map((p) => this.entry("period", p)),
      ...this.data.events.map((e) => this.entry("event", e)),
      ...this.data.memories.map((m) => this.entry("memory", m)),
    ];
  }

  /** An account's thread: what they own, and the events they are at. */
  thread(account) {
    return this.everything().filter((entry) => entry.owner === account || (entry.kind === "event" && entry.threads.includes(account)));
  }

  /** The threads of these accounts woven together: each thing once, events where any of them is. */
  woven(accounts) {
    const wanted = new Set(accounts);
    return this.everything().filter((entry) => wanted.has(entry.owner) || (entry.kind === "event" && entry.threads.some((a) => wanted.has(a))));
  }

  /** Who of these accounts crossed at an entry: for an event, every one of them at it. */
  crossing(entry, accounts) {
    if (entry.kind !== "event") return [];
    return entry.threads.filter((a) => accounts.includes(a));
  }

  /** The entries whose words, people, place or event hold what is looked for. */
  find(entries, looked) {
    const words = lower(looked).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return entries;
    return entries.filter((entry) => {
      const hay = lower([entry.title, entry.text, entry.said, entry.ownerName, entry.place?.name, entry.event?.title, entry.period?.title, ...entry.people].join(" "));
      return words.every((word) => hay.includes(word));
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
      && ((entry.kind === "memory" && this.memories.get(entry.id).period_id === periodId) || within(entry.when, starts, ends, entry.until))));
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
  const sorted = [...entries].sort((a, b) => sortKey(a.when).localeCompare(sortKey(b.when)) || KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || a.title.localeCompare(b.title));
  if (!newestFirst) return sorted;
  const dated = sorted.filter((entry) => entry.when).reverse();
  return [...dated, ...sorted.filter((entry) => !entry.when)];
}

/** A timeline's rows: each entry under the heading of its year (or decade), a heading wherever it changes. */
export function timeline(entries, newestFirst = false) {
  const rows = [];
  let heading = null;
  for (const entry of sortEntries(entries, newestFirst)) {
    const under = headingOf(entry.when);
    if (under !== heading) { heading = under; rows.push({ key: `heading:${under}`, heading: under }); }
    rows.push(entry);
  }
  return rows;
}
