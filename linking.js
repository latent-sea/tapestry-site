// A memory already kept added to an event, from the event's page (backend.sql,
// "a memory of the member's put in an event"): one of the member's memories
// found by typing - nothing offered until something is typed - and added. Put
// into someone else's event, it waits for whoever runs it to approve it. (From
// the memory's Edit, Part of something bigger?: bigger.js.)

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=119663ae9628";
import { notice, problem } from "./parts.js?v=119663ae9628";

export const FINDS_MEMORY_TO_ADD = "finds_a_memory_of_mine_to_add";
export const ADDS_KEPT_MEMORY = "adds_a_memory_of_mine_to_it";

export const WORDS = {
  [FINDS_MEMORY_TO_ADD]: ["Add one of your memories to it"],
  [ADDS_KEPT_MEMORY]: ["Add it"],
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
    if (action === ADDS_KEPT_MEMORY) this.put(payload.memory, payload.event);
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

  async put(memory, event) {
    this.busy.setValue(true);
    const done = await this.loom.putInEvent(memory, event);
    await this.account.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!done.ok) { this.problem.setValue(done.error); return; }
    this.memoryLine.setValue("");
    const weave = this.account.weave.read();
    const it = weave.memories.get(memory);
    this.notice.setValue(it?.approval === "waiting" ? "Added: it waits for whoever runs the event to approve it." : "Added to the event.");
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
