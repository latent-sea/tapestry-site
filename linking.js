// A memory already kept put in an event, or taken out of one (backend.sql,
// "a memory of the member's put in an event"): from the event's page, one of
// the member's memories found by typing and added; from the memory's page, an
// event they are at found by typing, or the one it is in left. Nothing is
// offered until something is typed. Put into someone else's event, it waits
// for whoever runs it to approve it.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=e954cd847867";
import { LINK } from "./look/look.js?v=e954cd847867";
import { notice, problem } from "./parts.js?v=e954cd847867";

export const FINDS_MEMORY_TO_ADD = "finds_a_memory_of_mine_to_add";
export const ADDS_KEPT_MEMORY = "adds_a_memory_of_mine_to_it";
export const FINDS_EVENT_FOR_MEMORY = "finds_an_event_to_put_it_in";
export const PUTS_IN_EVENT = "puts_it_in_that_event";
export const TAKES_OUT_OF_EVENT = "takes_it_out_of_its_event";

export const WORDS = {
  [FINDS_MEMORY_TO_ADD]: ["Add one of your memories to it"],
  [ADDS_KEPT_MEMORY]: ["Add it"],
  [FINDS_EVENT_FOR_MEMORY]: ["Put it in an event"],
  [PUTS_IN_EVENT]: ["Put it in"],
  [TAKES_OUT_OF_EVENT]: ["Take it out of the event"],
};

/** How many are shown for what is typed. */
const SHOWN = 8;
const words = (line) => String(line ?? "").toLowerCase().split(/\s+/).filter(Boolean);

export class Linking extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.memoryLine = this.value("");
    this.eventLine = this.value("");
    this.busy = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
  }

  answers() { return Object.keys(WORDS); }

  would() { return this.busy.read() ? Phrase.of("Saving") : null; }

  told(action, payload) {
    this.problem.setValue("");
    this.notice.setValue("");
    if (action === FINDS_MEMORY_TO_ADD) this.memoryLine.setValue(payload.line);
    if (action === FINDS_EVENT_FOR_MEMORY) this.eventLine.setValue(payload.line);
    if (action === ADDS_KEPT_MEMORY || action === PUTS_IN_EVENT) this.put(payload.memory, payload.event);
    if (action === TAKES_OUT_OF_EVENT) this.put(payload.memory, null);
    return null;
  }

  /** The member's own memories holding what is typed, not in this event already: none before anything is typed. */
  memoriesFor(eventId) {
    const typed = words(this.memoryLine.read());
    if (!typed.length) return [];
    const weave = this.account.weave.read();
    return weave.thread(weave.meId).filter((e) => e.kind === "memory" && e.mine && weave.memories.get(e.id)?.event_id !== eventId)
      .filter((e) => typed.every((w) => `${e.title ?? ""} ${e.text ?? ""} ${e.said ?? ""}`.toLowerCase().includes(w)))
      .slice(0, SHOWN).map((e) => ({ id: e.id, label: [e.title, e.said].filter(Boolean).join(" · ") }));
  }

  /** The events the member may add to holding what is typed, but the one it is in: none before anything is typed. */
  eventsFor(memoryId) {
    const typed = words(this.eventLine.read());
    if (!typed.length) return [];
    const weave = this.account.weave.read();
    const inNow = weave.memories.get(memoryId)?.event_id ?? null;
    return weave.data.events.filter((e) => e.id !== inNow && weave.mayAddTo(e.id))
      .filter((e) => typed.every((w) => (e.title ?? "").toLowerCase().includes(w)))
      .slice(0, SHOWN).map((e) => ({ id: e.id, label: [e.title, weave.entry("event", e).said, e.owner === weave.meId ? "" : `${weave.nameOf(e.owner)}'s`].filter(Boolean).join(" · ") }));
  }

  async put(memory, event) {
    this.busy.setValue(true);
    const done = await this.loom.putInEvent(memory, event);
    await this.account.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!done.ok) { this.problem.setValue(done.error); return; }
    this.memoryLine.setValue("");
    this.eventLine.setValue("");
    const weave = this.account.weave.read();
    const it = weave.memories.get(memory);
    this.notice.setValue(!event ? "Taken out of the event: it keeps its time."
      : it?.approval === "waiting" ? "Added: it waits for whoever runs the event to approve it." : "Added to the event.");
  }
}

/** One found, pressed to choose it. */
function found(ui, list, action, payload) {
  return ui.each(list, (held) => ui.pressable(action, held.map((f) => payload(f)), [ui.text(held.map((f) => f?.label ?? ""), "MatchWords")], "Match"),
    (f) => f.id, "Matches");
}

/** On an event the member may add to: one of their memories found by typing, and added. */
export function describeAddKept(ui, linking, account, eventId) {
  const list = ui.bound(() => linking.memoriesFor(eventId.read()));
  return ui.when(ui.bound(() => !!eventId.read() && account.weave.read().mayAddTo(eventId.read())), ui.column([
    ui.field(FINDS_MEMORY_TO_ADD, "", { changes: FINDS_MEMORY_TO_ADD, shows: linking.memoryLine, label: Phrase.of("Add one of your memories to it: find it by its words") }),
    ui.when(ui.bound(() => !!linking.memoryLine.read().trim() && !list.read().length), ui.text(Phrase.of("None of your memories holds that."), "Quiet")),
    found(ui, list, ADDS_KEPT_MEMORY, (f) => ({ memory: f?.id ?? "", event: eventId.read() })),
    problem(ui, linking.problem),
    notice(ui, linking.notice),
  ], "Part"));
}

/** On a memory of the member's: the event it is in, to take it out of; or an event found by typing, to put it in. */
export function describePutInEvent(ui, linking, account, memoryId) {
  const memory = ui.bound(() => account.weave.read().memories.get(memoryId.read()) ?? null);
  const mine = ui.bound(() => !!memory.read() && memory.read().owner === account.weave.read().meId && account.weave.read().writes);
  const event = ui.bound(() => (memory.read()?.event_id ? account.weave.read().events.get(memory.read().event_id) ?? null : null));
  const list = ui.bound(() => linking.eventsFor(memoryId.read()));
  return ui.when(mine, ui.column([
    ui.when(event, ui.row([
      ui.text(event.map((e) => Phrase.with("In the event “%s”%s", [e?.title ?? "", memory.read()?.approval === "waiting" ? ", waiting to be approved" : ""])), "Words").grow(),
      ui.pressable(TAKES_OUT_OF_EVENT, memoryId.map((id) => ({ memory: id })), [ui.text(ui.words(TAKES_OUT_OF_EVENT), "Small")], LINK),
    ], "AddRow")),
    ui.field(FINDS_EVENT_FOR_MEMORY, "", { changes: FINDS_EVENT_FOR_MEMORY, shows: linking.eventLine,
      label: event.map((e) => Phrase.of(e ? "Put it in another event instead: find it by its name" : "Put it in an event: find it by its name")) }),
    ui.when(ui.bound(() => !!linking.eventLine.read().trim() && !list.read().length), ui.text(Phrase.of("No event you're at by that name."), "Quiet")),
    found(ui, list, PUTS_IN_EVENT, (f) => ({ memory: memoryId.read(), event: f?.id ?? "" })),
    problem(ui, linking.problem),
    notice(ui, linking.notice),
  ], "Part"));
}
