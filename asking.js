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

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=de7d6ff7adf3";
import { notice, problem } from "./parts.js?v=de7d6ff7adf3";
import { ACTION, LINK } from "./look/look.js?v=de7d6ff7adf3";

export const ASKS_LINK = "asks_to_link_a_name";
export const ASKS_AT_EVENT = "asks_to_be_at_an_event";
export const SAYS_YES = "says_yes_to_a_request";
export const SAYS_NO = "says_no_to_a_request";
export const TAKES_BACK = "takes_back_a_request";
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
  [LOOKS_FOR_TWIN]: ["Find the same one"],
  [PICKS_TWIN]: ["The same as this"],
  [MERGES]: ["Yes, merge them"],
  [KEEPS_APART]: ["No, keep both"],
};

const ADDRESS = { event: "event", place: "place" };

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
  }

  answers() { return Object.keys(WORDS); }

  would(action, payload) {
    if (this.busy.read()) return Phrase.of("Asking");
    if (action === ASKS_AT_EVENT && !this.account.weave.read().mayAskAt(payload?.id)) return Phrase.of("You are at it, or have asked");
    return null;
  }

  told(action, payload) {
    if (action === ASKS_LINK) this.ask(() => this.loom.askLink(payload.person, payload.member), "Asked. It is linked when they say yes.");
    if (action === ASKS_AT_EVENT) this.ask(() => this.loom.askAtEvent(payload.id), "Asked. You are on it when its maker says yes.");
    if (action === SAYS_YES) this.ask(() => this.loom.answer(payload.id, true), "Done.");
    if (action === SAYS_NO || action === TAKES_BACK) this.ask(() => this.loom.answer(payload.id, false), "");
    if (action === LOOKS_FOR_TWIN) this.twinSearch.setValue(payload?.line ?? this.twinSearch.read());
    if (action === PICKS_TWIN) this.twin.setValue({ kind: payload.kind, from: payload.from, into: payload.into });
    if (action === KEEPS_APART) this.twin.setValue(null);
    if (action === MERGES) this.merge();
    return null;
  }

  /** The merge picked: one's own two at once, opening the one kept; into someone else's, asked. */
  async merge() {
    const { kind, from, into } = this.twin.read() ?? {};
    if (!kind) return;
    const weave = this.account.weave.read();
    const theirs = (kind === "event" ? weave.events : weave.places).get(into)?.owner !== weave.meId;
    this.twin.setValue(null);
    this.twinSearch.setValue("");
    await this.ask(() => (kind === "event" ? this.loom.askMergeEvent(from, into) : this.loom.askMergePlace(from, into)),
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
    if (r.kind === "merge_event") return Phrase.with("%s says their event “%s” is your “%s”, and asks to merge it into yours: everyone at theirs who is among your people, and their memories, come to yours.", [r.asker ?? "", r.name ?? "", r.into_name ?? ""]);
    if (r.kind === "merge_place") return Phrase.with("%s says their place “%s” is your “%s”, and asks to merge it into yours: everything at theirs comes to yours.", [r.asker ?? "", r.name ?? "", r.into_name ?? ""]);
    return Phrase.with("%s says they were at %s, and asks to be on it.", [r.asker ?? "", r.event_title ?? ""]);
  }
  if (r.kind === "merge_event" || r.kind === "merge_place") return Phrase.with("You asked %s to merge your “%s” into their “%s”.", [r.decider ?? "", r.name ?? "", r.into_name ?? ""]);
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
    const list = kind === "event" ? weave().events : weave().places;
    const from = list.get(twin.from);
    const into = list.get(twin.into);
    const nameOf = (item) => (kind === "event" ? item?.title : item?.name) ?? "";
    if (into?.owner === weave().meId) {
      return kind === "event"
        ? Phrase.with("Merge “%s” into “%s”? Everyone at it and every memory of it go to “%s”, and “%s” is gone.", [nameOf(from), nameOf(into), nameOf(into), nameOf(from)])
        : Phrase.with("Merge “%s” into “%s”? Everything at it is at “%s”, and “%s” is gone.", [nameOf(from), nameOf(into), nameOf(into), nameOf(from)]);
    }
    const owner = weave().nameOf(into?.owner);
    return kind === "event"
      ? Phrase.with("Ask %s to merge your “%s” into their “%s”? When they say yes, everyone at yours who is among their people, and their memories, go to theirs, and yours is gone.", [owner, nameOf(from), nameOf(into)])
      : Phrase.with("Ask %s to merge your “%s” into their “%s”? When they say yes, everything at yours is at theirs, and yours is gone.", [owner, nameOf(from), nameOf(into)]);
  });
  return ui.column([
    ui.text(Phrase.of(kind === "event" ? "Set up twice?" : "The same place twice?"), "PartHeading"),
    ui.text(Phrase.of(kind === "event" ? "If this event is one someone else set up too, or one you have twice, find it and merge them."
      : "If this place is one you or someone else has set up again, find it and merge them."), "Hint").wraps(),
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
