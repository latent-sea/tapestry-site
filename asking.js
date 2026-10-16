// Asking, inside Tapestry, for someone already on it - each waiting for the
// other side's yes (backend.sql, "asking"):
// - linking one of the member's own names to someone they know of on
//   Tapestry ("is this you?"), from that name's page;
// - linking a name of someone else's, seen unlinked on what they share, to
//   the member themselves ("that's me"), from where it is seen;
// - being at an event the member sees but isn't at, from the event.
// What waits for the member's answer, and what they asked, are on their
// thread; both sides having asked the same, it is linked at once.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=53cb48be9b8b";
import { notice, problem } from "./parts.js?v=53cb48be9b8b";
import { ACTION, LINK } from "./look/look.js?v=53cb48be9b8b";

export const ASKS_LINK = "asks_to_link_a_name";
export const ASKS_AT_EVENT = "asks_to_be_at_an_event";
export const SAYS_YES = "says_yes_to_a_request";
export const SAYS_NO = "says_no_to_a_request";
export const TAKES_BACK = "takes_back_a_request";

export const WORDS = {
  [ASKS_LINK]: ["Ask to link"],
  [ASKS_AT_EVENT]: ["I was there: ask to be on it"],
  [SAYS_YES]: ["Yes"],
  [SAYS_NO]: ["No"],
  [TAKES_BACK]: ["Take it back"],
};

export class Asking extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.busy = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
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
    return null;
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

  reset() { this.problem.setValue(""); this.notice.setValue(""); }
}

/** A request in words, as the member sees it: asked of them, or by them. */
export function sayRequest(request) {
  const r = request ?? {};
  if (!r.mine) {
    if (r.kind === "link") return Phrase.with("%s knows you as “%s”, and asks to link your threads.", [r.asker ?? "", r.name ?? ""]);
    if (r.kind === "claim") return Phrase.with("%s says they are your “%s”, and asks to be linked to that name.", [r.asker ?? "", r.name ?? ""]);
    return Phrase.with("%s says they were at %s, and asks to be on it.", [r.asker ?? "", r.event_title ?? ""]);
  }
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
