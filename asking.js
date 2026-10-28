// Asking, inside Tapestry, for someone already on it - each waiting for the
// other side's yes (backend.sql, "asking"):
// - linking one of the member's own names to someone they know of on
//   Tapestry ("is this you?"), from that name's page;
// - linking a name of someone else's, seen unlinked on what they share, to
//   the member themselves ("that's me"), from where it is seen;
// - being at an event the member sees but isn't at, from the event;
// - merging an event or a place set up twice: the member folds their own
//   into the other - at once when both are theirs; into someone else's when
//   its owner says yes.
// What waits for the member's answer, and what they asked, are on their
// thread; both sides having asked the same, it is linked at once.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=a72a3c00d32b";
import { notice, problem } from "./parts.js?v=a72a3c00d32b";
import { ACTION, LINK } from "./look/look.js?v=a72a3c00d32b";

export const ASKS_LINK = "asks_to_link_a_name";
export const ASKS_AT_EVENT = "asks_to_be_at_an_event";
export const SAYS_YES = "says_yes_to_a_request";
export const SAYS_NO = "says_no_to_a_request";
export const TAKES_BACK = "takes_back_a_request";
export const MAKES_EVENT = "makes_it_an_event";
export const NAMES_EVENT = "names_the_event_it_becomes";
export const MAKES_NAMED_EVENT = "makes_the_named_event";
export const KEEPS_AS_MEMORY = "keeps_it_a_memory";
export const MAKES_PERIOD = "makes_it_a_period";
export const NAMES_PERIOD = "names_the_period_it_becomes";
export const CHOOSES_PERIOD_KIND = "chooses_the_kind_of_period_it_becomes";
export const MAKES_NAMED_PERIOD = "makes_the_named_period";
export const ASKS_SHARE_MEMORY = "says_i_was_there_too";
export const LOOKS_FOR_TWIN = "looks_for_the_same_one";
export const PICKS_TWIN = "picks_the_same_one";
export const MERGES = "merges_into_it";
export const KEEPS_APART = "keeps_them_apart";

export const WORDS = {
  [ASKS_LINK]: ["Ask to link"],
  [ASKS_AT_EVENT]: ["I was there: ask to be on it"],
  [SAYS_YES]: ["Yes"],
  [SAYS_NO]: ["No"],
  [TAKES_BACK]: ["Take it back"],
  [MAKES_EVENT]: ["Make it an event"],
  [NAMES_EVENT]: ["The event's name"],
  [MAKES_NAMED_EVENT]: ["Make the event"],
  [KEEPS_AS_MEMORY]: ["Not now"],
  [MAKES_PERIOD]: ["Make it a period"],
  [NAMES_PERIOD]: ["The period's name"],
  [CHOOSES_PERIOD_KIND]: ["Choose what kind of time it was"],
  [MAKES_NAMED_PERIOD]: ["Make the period"],
  [ASKS_SHARE_MEMORY]: ["I was there too"],
  [LOOKS_FOR_TWIN]: ["Find the same one"],
  [PICKS_TWIN]: ["The same as this"],
  [MERGES]: ["Yes, merge them"],
  [KEEPS_APART]: ["No, keep both"],
};

const ADDRESS = { event: "event", period: "period", place: "place" };
const LISTS = { event: "events", period: "periods", place: "places" };

export class Asking extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.busy = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
    this.twinSearch = this.value("");
    this.twin = this.value(null); // { kind, from, into }: a merge about to be asked
    this.naming = this.value(""); // the memory being made an event, while its name is asked
    this.eventName = this.value("");
    this.periodNaming = this.value(""); // the memory being made a period, while its name and kind are asked
    this.periodName = this.value("");
    this.periodKind = this.value("");
  }

  answers() { return Object.keys(WORDS); }

  would(action, payload) {
    if (this.busy.read()) return Phrase.of("Asking");
    if (action === ASKS_AT_EVENT && !this.account.weave.read().mayAskAt(payload?.id)) return Phrase.of("You are at it, or have asked");
    if (action === MAKES_EVENT) {
      const memory = this.account.weave.read().memories.get(payload?.id);
      if (!memory || memory.owner !== this.account.weave.read().meId || memory.event_id) return Phrase.of("Only your own memory, not of an event yet");
      if (!memory.starts) return Phrase.of("First say when it was: an event has a time");
    }
    if (action === ASKS_SHARE_MEMORY && !this.account.weave.read().mayShareMemory(payload?.id)) return Phrase.of("Yours, or you are at it, or have asked");
    if (action === MAKES_NAMED_EVENT && !this.eventName.read().trim()) return Phrase.of("Give the event a name");
    if (action === MAKES_PERIOD) {
      const memory = this.account.weave.read().memories.get(payload?.id);
      if (!memory || memory.owner !== this.account.weave.read().meId) return Phrase.of("Only your own memory");
      if (!memory.starts) return Phrase.of("First say when it was: a period has a time");
    }
    if (action === MAKES_NAMED_PERIOD && !this.periodName.read().trim()) return Phrase.of("Give the period a name");
    return null;
  }

  told(action, payload) {
    if (action === ASKS_LINK) this.ask(() => this.loom.askLink(payload.person, payload.member), "Asked. It is linked when they say yes.");
    if (action === ASKS_AT_EVENT) this.ask(() => this.loom.askAtEvent(payload.id), "Asked. You are on it when its maker says yes.");
    if (action === SAYS_YES) this.ask(() => this.loom.answer(payload.id, true), "Done.");
    if (action === SAYS_NO || action === TAKES_BACK) this.ask(() => this.loom.answer(payload.id, false), "");
    // its name asked first: the memory's title if it has one, never its words
    if (action === MAKES_EVENT) {
      this.periodNaming.setValue("");
      this.naming.setValue(payload.id);
      this.eventName.setValue(this.account.weave.read().memories.get(payload.id)?.title ?? "");
    }
    if (action === NAMES_EVENT) this.eventName.setValue(payload.line);
    if (action === KEEPS_AS_MEMORY) { this.naming.setValue(""); this.periodNaming.setValue(""); }
    // a period's name and kind asked first: the memory's title, or its first line, offered
    if (action === MAKES_PERIOD) {
      const memory = this.account.weave.read().memories.get(payload.id);
      this.naming.setValue("");
      this.periodNaming.setValue(payload.id);
      this.periodName.setValue(memory?.title || (memory?.body ?? "").trim().split("\n")[0].slice(0, 200));
      this.periodKind.setValue("");
    }
    if (action === NAMES_PERIOD) this.periodName.setValue(payload.line);
    if (action === CHOOSES_PERIOD_KIND) this.periodKind.setValue(payload.type);
    if (action === MAKES_NAMED_PERIOD) {
      const memoryId = this.periodNaming.read();
      this.periodNaming.setValue("");
      this.makePeriod(memoryId, this.periodName.read().trim(), this.periodKind.read());
    }
    if (action === MAKES_NAMED_EVENT) {
      const memoryId = this.naming.read();
      this.naming.setValue("");
      this.makeEvent(memoryId, this.eventName.read().trim());
    }
    if (action === ASKS_SHARE_MEMORY) this.ask(() => this.loom.askShareMemory(payload.id), "Asked. When they say yes, it is an event you are at, to add your own memories to.");
    if (action === LOOKS_FOR_TWIN) this.twinSearch.setValue(payload?.line ?? this.twinSearch.read());
    if (action === PICKS_TWIN) this.twin.setValue({ kind: payload.kind, from: payload.from, into: payload.into });
    if (action === KEEPS_APART) this.twin.setValue(null);
    if (action === MERGES) this.merge();
    return null;
  }

  /** One of the member's memories made an event, named as they said, which opens: others at it add their own. */
  async makeEvent(memoryId, named) {
    let made = null;
    await this.ask(async () => { made = await this.loom.eventOfMemory(memoryId, named); return made; }, "It is an event now: everyone at it can add their own memories.");
    if (made?.ok && !this.disposed) location.hash = `#event/${made.data}`;
  }

  /** One of the member's memories made a period, which opens: the memory gone into it, or kept during it. */
  async makePeriod(memoryId, named, kind) {
    let made = null;
    await this.ask(async () => { made = await this.loom.periodOfMemory(memoryId, named, kind); return made; }, "");
    if (!made?.ok || this.disposed) return;
    this.notice.setValue(made.data.kept ? "It is a period now. The memory stays too, during it: a period can't hold its pictures, comments or links." : "It is a period now.");
    location.hash = `#period/${made.data.period}`;
  }

  /** The merge picked: one's own two at once, opening the one kept; into someone else's, asked. */
  async merge() {
    const { kind, from, into } = this.twin.read() ?? {};
    if (!kind) return;
    const weave = this.account.weave.read();
    const theirs = weave[LISTS[kind]].get(into)?.owner !== weave.meId;
    this.twin.setValue(null);
    this.twinSearch.setValue("");
    await this.ask(() => ({ event: () => this.loom.askMergeEvent(from, into), period: () => this.loom.askMergePeriod(from, into),
      place: () => this.loom.askMergePlace(from, into) })[kind](),
      theirs ? "Asked. They are one when its owner says yes." : "Merged.");
    if (!theirs && !this.problem.read()) location.hash = `#${ADDRESS[kind]}/${into}`;
  }

  async ask(work, said) {
    this.busy.setValue(true);
    this.problem.setValue("");
    this.notice.setValue("");
    const done = await work();
    await this.account.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!done.ok) this.problem.setValue(done.error); else this.notice.setValue(said);
  }

  reset() { this.problem.setValue(""); this.notice.setValue(""); this.twin.setValue(null); this.twinSearch.setValue(""); }
}

/** A request in words, as the member sees it: asked of them, or by them. */
export function sayRequest(request) {
  const r = request ?? {};
  if (!r.mine) {
    if (r.kind === "link") return Phrase.with("%s knows you as “%s”, and asks to link your threads.", [r.asker ?? "", r.name ?? ""]);
    if (r.kind === "claim") return Phrase.with("%s says they are your “%s”, and asks to be linked to that name.", [r.asker ?? "", r.name ?? ""]);
    if (r.kind === "memory") return Phrase.with("%s was there too, at your “%s”, and asks to be at it: it becomes an event, and they add their own memories of it.", [r.asker ?? "", r.name ?? ""]);
    if (r.kind === "merge_event") return Phrase.with("%s says their event “%s” is your “%s”, and asks to merge it into yours: everyone at theirs who is among your people, and their memories, come to yours.", [r.asker ?? "", r.name ?? "", r.into_name ?? ""]);
    if (r.kind === "merge_place") return Phrase.with("%s says their place “%s” is your “%s”, and asks to merge it into yours: everything at theirs comes to yours.", [r.asker ?? "", r.name ?? "", r.into_name ?? ""]);
    if (r.kind === "merge_period") return Phrase.with("%s says their period “%s” is your “%s”, and asks to merge it into yours: they, and everyone in theirs who is among your people, are in yours, and their memories of it with them.", [r.asker ?? "", r.name ?? "", r.into_name ?? ""]);
    return Phrase.with("%s says they were at %s, and asks to be on it.", [r.asker ?? "", r.event_title ?? ""]);
  }
  if (r.kind === "memory") return Phrase.with("You asked %s to be at their “%s”.", [r.decider ?? "", r.name ?? ""]);
  if (r.kind === "merge_event" || r.kind === "merge_place" || r.kind === "merge_period") return Phrase.with("You asked %s to merge your “%s” into their “%s”.", [r.decider ?? "", r.name ?? "", r.into_name ?? ""]);
  if (r.kind === "link") return Phrase.with("You asked %s whether they are your “%s”.", [r.decider ?? "", r.name ?? ""]);
  if (r.kind === "claim") return Phrase.with("You asked %s to link their “%s” to you.", [r.decider ?? "", r.name ?? ""]);
  return Phrase.with("You asked %s to put you at %s.", [r.decider ?? "", r.event_title ?? ""]);
}

/** On the member's thread: what waits for their answer, and what they asked. */
export function describeAsked(ui, asking, account) {
  const ofMe = account.weave.map((w) => w.requests.filter((r) => !r.mine));
  const byMe = account.weave.map((w) => w.requests.filter((r) => r.mine));
  const payload = (held) => held.map((r) => ({ id: r?.id ?? "" }));
  return ui.when(account.weave.map((w) => w.requests.length > 0), ui.surface("Card Asked", [ui.column([
    ui.when(ofMe.map((l) => l.length > 0), ui.column([
      ui.text(Phrase.of("Waiting for your answer"), "PartHeading"),
      ui.each(ofMe, (held) => ui.column([
        ui.text(held.map((r) => sayRequest(r)), "Words").wraps(),
        ui.row([
          ui.pressable(SAYS_YES, payload(held), [ui.text(ui.words(SAYS_YES), "Small")], ACTION),
          ui.pressable(SAYS_NO, payload(held), [ui.text(ui.words(SAYS_NO), "Small")], LINK),
        ], "Actions"),
      ], "Request"), (r) => r.id, "Requests"),
    ])),
    ui.when(byMe.map((l) => l.length > 0), ui.column([
      ui.text(Phrase.of("You asked"), "PartHeading"),
      ui.each(byMe, (held) => ui.row([
        ui.text(held.map((r) => sayRequest(r)), "Hint").wraps().grow(),
        ui.pressable(TAKES_BACK, payload(held), [ui.text(ui.words(TAKES_BACK), "Small")], LINK),
      ], "Request"), (r) => r.id, "Requests"),
    ])),
    problem(ui, asking.problem),
    notice(ui, asking.notice),
  ], "Part")]));
}

/** On one of the member's own names, unlinked: asking someone they know of on Tapestry whether it is them. */
export function describeIsThisYou(ui, asking, account, personId) {
  const waiting = ui.bound(() => account.weave.read().requests.find((r) => r.mine && r.kind === "link" && r.person === personId.read()) ?? null);
  const known = ui.bound(() => account.weave.read().knownMembers());
  return ui.column([
    ui.when(waiting, ui.row([
      ui.text(waiting.map((r) => sayRequest(r)), "Hint").wraps().grow(),
      ui.pressable(TAKES_BACK, waiting.map((r) => ({ id: r?.id ?? "" })), [ui.text(ui.words(TAKES_BACK), "Small")], LINK),
    ], "Request"), ui.when(known.map((k) => k.length > 0), ui.column([
      ui.text(Phrase.of("Already on Tapestry?"), "FieldName"),
      ui.text(Phrase.of("Ask whichever of these they are. When they say yes, you are linked, as by an invitation."), "Hint").wraps(),
      ui.eachAcross(known, (held) => ui.pressable(ASKS_LINK, ui.bound(() => ({ person: personId.read(), member: held.read()?.account ?? "" })),
        [ui.text(held.map((m) => m?.name ?? ""), "Small")], "Segment"), (m) => m.account, "Segments"),
    ]))),
  ]);
}

/** Where names of someone else's, linked to no one, are seen: "that's me", for each. */
export function describeThatsMe(ui, asking, account, entry) {
  const names = ui.bound(() => {
    const weave = account.weave.read();
    const asked = new Set(weave.requests.filter((r) => r.mine && r.kind === "claim").map((r) => r.person));
    return (entry.read()?.unlinked ?? []).filter((n) => !asked.has(n.id));
  });
  const me = ui.bound(() => account.weave.read().meId);
  return ui.when(names.map((n) => n.length > 0), ui.column([
    ui.text(Phrase.of("Is one of these names you? Ask to be linked to it."), "Hint").wraps(),
    ui.eachAcross(names, (held) => ui.pressable(ASKS_LINK, ui.bound(() => ({ person: held.read()?.id ?? "", member: me.read() })),
      [ui.text(held.map((n) => Phrase.with("That's me: %s", [n?.name ?? ""])), "Small")], "Segment"), (n) => n.id, "Segments"),
  ]));
}

/**
 * On an event or a place of the member's own: "set up twice?" - find the
 * same one (their own, or one of someone else's they see), and merge theirs
 * into it, saying first what happens.
 */
export function describeMerge(ui, asking, account, kind, id) {
  const weave = () => account.weave.read();
  const twins = ui.bound(() => weave().twinsOf(kind, id.read(), asking.twinSearch.read()));
  const picked = ui.bound(() => {
    const twin = asking.twin.read();
    return twin && twin.kind === kind && twin.from === id.read() ? twin : null;
  });
  const said = ui.bound(() => {
    const twin = picked.read();
    if (!twin) return "";
    const list = weave()[LISTS[kind]];
    const from = list.get(twin.from);
    const into = list.get(twin.into);
    const nameOf = (item) => (kind === "place" ? item?.name : item?.title) ?? "";
    if (into?.owner === weave().meId) {
      return {
        event: Phrase.with("Merge “%s” into “%s”? Everyone at it and every memory of it go to “%s”, and “%s” is gone.", [nameOf(from), nameOf(into), nameOf(into), nameOf(from)]),
        period: Phrase.with("Merge “%s” into “%s”? Everyone in it and everything during it go to “%s”, and “%s” is gone.", [nameOf(from), nameOf(into), nameOf(into), nameOf(from)]),
        place: Phrase.with("Merge “%s” into “%s”? Everything at it is at “%s”, and “%s” is gone.", [nameOf(from), nameOf(into), nameOf(into), nameOf(from)]),
      }[kind];
    }
    const owner = weave().nameOf(into?.owner);
    return {
      event: Phrase.with("Ask %s to merge your “%s” into their “%s”? When they say yes, everyone at yours who is among their people, and their memories, go to theirs, and yours is gone.", [owner, nameOf(from), nameOf(into)]),
      period: Phrase.with("Ask %s to merge your “%s” into their “%s”? When they say yes, you are in theirs - it is on your thread - with everyone in yours who is among their people, and your memories and events during yours are during theirs. Yours is gone.", [owner, nameOf(from), nameOf(into)]),
      place: Phrase.with("Ask %s to merge your “%s” into their “%s”? When they say yes, everything at yours is at theirs, and yours is gone.", [owner, nameOf(from), nameOf(into)]),
    }[kind];
  });
  return ui.column([
    ui.text(Phrase.of(kind === "place" ? "The same place twice?" : "Set up twice?"), "PartHeading"),
    ui.text(Phrase.of({ event: "If this event is one someone else set up too, or one you have twice, find it and merge them.",
      period: "If someone else has this time of your life too - a home you shared, a job together - or you have it twice, find theirs and merge them: one period, on both your threads.",
      place: "If this place is one you or someone else has set up again, find it and merge them." }[kind]), "Hint").wraps(),
    ui.when(picked, ui.column([
      ui.text(said, "Warn").wraps(),
      ui.row([
        ui.button(MERGES, { style: ACTION }),
        ui.button(KEEPS_APART, { style: LINK }),
      ], "Actions"),
    ]), ui.column([
      ui.field(LOOKS_FOR_TWIN, "", { changes: LOOKS_FOR_TWIN, shows: asking.twinSearch, placeholder: Phrase.of("Its name") }),
      ui.each(twins, (held) => ui.pressable(PICKS_TWIN, ui.bound(() => ({ kind, from: id.read(), into: held.read()?.id ?? "" })),
        [ui.text(held.map((t) => t?.label ?? ""), "MatchWords")], "Match"), (t) => t.id, "Matches"),
    ])),
  ], "Part");
}

/** Making one of the member's memories an event: its name asked, as the event is a grouping of everyone's memories, not this one's words. */
/** A memory being made a period: its name, its kind, and what becomes of the memory, said first. */
export function describeNamingPeriod(ui, asking, account, memoryId) {
  const memory = ui.bound(() => account.weave.read().memories.get(memoryId.read()) ?? null);
  // what a period can't hold keeps the memory too
  const stays = ui.bound(() => {
    const m = memory.read();
    return !!m && (!!m.event_id || (m.links ?? []).length > 0 || (m.comments ?? []).length > 0 || (m.pictures ?? []).length > 0 || (m.body ?? "").length > 5000);
  });
  return ui.when(ui.bound(() => !!asking.periodNaming.read() && asking.periodNaming.read() === memoryId.read()), ui.column([
    ui.text(ui.bound(() => Phrase.of(stays.read()
      ? "It becomes a period over its time, with its place, its people and who sees it. A period can't hold its pictures, comments or links, so the memory stays too, during the period."
      : "It becomes a period over its time, with its place, its people, its words and who sees it - and is no longer a memory.")), "Hint").wraps(),
    ui.field(MAKES_NAMED_PERIOD, "", { changes: NAMES_PERIOD, shows: asking.periodName, label: Phrase.of("The period's name"), placeholder: Phrase.of("e.g. Living in Leeds") }),
    ui.text(Phrase.of("What kind of time"), "FieldName"),
    ui.eachAcross(account.weave.map((w) => [...w.periodKinds.map((k) => ({ type: k.name, said: k.name })), { type: "", said: "None" }]),
      (held) => ui.pressable(CHOOSES_PERIOD_KIND, held.map((k) => ({ type: k?.type ?? "" })), [ui.text(held.map((k) => k?.said ?? ""), "Small")], "Segment")
        .currentWhile(ui.bound(() => asking.periodKind.read() === (held.read()?.type ?? ""))), (k) => k.type || "none", "Segments"),
    ui.row([
      ui.button(MAKES_NAMED_PERIOD),
      ui.button(KEEPS_AS_MEMORY, { style: LINK }),
    ], "Actions"),
  ], "Part"));
}

export function describeNamingEvent(ui, asking, memoryId) {
  return ui.when(ui.bound(() => !!asking.naming.read() && asking.naming.read() === memoryId.read()), ui.column([
    ui.text(Phrase.of("What was it? Give the event a short name - a wedding, a holiday, a night out. Everyone at it hangs their own memories on it."), "Hint").wraps(),
    ui.field(MAKES_NAMED_EVENT, "", { changes: NAMES_EVENT, shows: asking.eventName, label: Phrase.of("The event's name"), placeholder: Phrase.of("e.g. Lake picnic") }),
    ui.row([
      ui.button(MAKES_NAMED_EVENT),
      ui.button(KEEPS_AS_MEMORY, { style: LINK }),
    ], "Actions"),
  ], "Part"));
}
