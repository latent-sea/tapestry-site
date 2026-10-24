// Notices: what others did that touches the member, newest first, and what
// waits for their answer (backend.sql, "notices"). Its tab counts what they
// haven't seen and what waits for them; opened, what was new is seen.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=6503c90b118b";
import { CARD } from "./look/look.js?v=6503c90b118b";
import { describeAsked } from "./asking.js?v=6503c90b118b";

export const NOTICES = "notices";
export const OPENS_NOTICE = "opens_what_a_notice_is_of";

export const WORDS = {
  [OPENS_NOTICE]: ["Open"],
};

const KIND_OF = (n) => (n.memory ? "memory" : n.event ? "event" : n.period ? "period" : "");

/** A notice in words: who did what, to what. */
export function sayNotice(notice) {
  const n = notice ?? {};
  const who = n.actor_name || Phrase.of("Someone");
  const title = n.title ?? "";
  if (n.kind === "tagged") {
    if (n.event && !n.memory) return Phrase.with("%s put you at “%s”", [who, title]);
    if (n.period && !n.memory) return Phrase.with("%s put you in “%s”", [who, title]);
    return Phrase.with("%s put you in their memory “%s”", [who, title]);
  }
  if (n.kind === "added") return Phrase.with("%s added “%s” to %s", [who, title, n.event_title || Phrase.of("an event you are at")]);
  if (n.kind === "shared") return Phrase.with("%s shared “%s” with you", [who, title]);
  if (n.kind === "linked") return Phrase.with("%s came by your invitation: your threads are linked", [who]);
  if (n.kind === "answered") {
    const about = n.about ?? "";
    const said = {
      link: [Phrase.with("%s said yes: your threads are linked", [who]), Phrase.with("%s said no to linking “%s”", [who, about])],
      event: [Phrase.with("%s said yes: you are at “%s”", [who, about]), Phrase.with("%s said no to putting you at “%s”", [who, about])],
      memory: [Phrase.with("%s said yes: you were there too, at “%s”", [who, about]), Phrase.with("%s said no to you being at “%s”", [who, about])],
      merge_event: [Phrase.with("%s said yes: your “%s” is merged into theirs", [who, about]), Phrase.with("%s kept your “%s” apart from theirs", [who, about])],
      merge_place: [Phrase.with("%s said yes: your place “%s” is merged into theirs", [who, about]), Phrase.with("%s kept your place “%s” apart from theirs", [who, about])],
    }[n.what] ?? [Phrase.with("%s said yes", [who]), Phrase.with("%s said no", [who])];
    return said[n.yes ? 0 : 1];
  }
  return "";
}

/** When, said shortly: "just now", "5 minutes ago", "3 hours ago", "yesterday", "12 October". */
export function sayAgo(iso, now = new Date()) {
  if (!iso) return "";
  const then = new Date(iso);
  const minutes = Math.floor((now - then) / 60000);
  if (minutes < 1) return Phrase.of("just now");
  if (minutes < 60) return Phrase.counted("%d minute ago", "%d minutes ago", minutes);
  if (minutes < 24 * 60) return Phrase.counted("%d hour ago", "%d hours ago", Math.floor(minutes / 60));
  if (minutes < 48 * 60) return Phrase.of("yesterday");
  return then.toLocaleDateString(undefined, { day: "numeric", month: "long", ...(then.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }) });
}

/** What a notice opens: the memory, event or period it is of ("<kind>:<id>"), or "" for none it can show. */
export function openedBy(notice) {
  const kind = KIND_OF(notice ?? {});
  return kind ? `${kind}:${notice[kind]}` : "";
}

export class Notices extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.seen = this.value(new Set()); // seen here, before the platform's next load says so
  }

  answers() { return Object.keys(WORDS); }

  would(action, payload) {
    if (action === OPENS_NOTICE && !payload?.parameter) return Phrase.of("It isn't there any more");
    return null;
  }

  told() { return null; }

  /** How many wait to be seen: notices not seen, and what waits for the member's answer. */
  count() {
    const weave = this.account.weave.read();
    const seen = this.seen.read();
    return weave.notices.filter((n) => !n.seen && !seen.has(n.id)).length + weave.requests.filter((r) => !r.mine).length;
  }

  /** Opened: everything new is seen, here at once and on the platform. */
  open() {
    const unseen = this.account.weave.read().notices.filter((n) => !n.seen && !this.seen.read().has(n.id));
    if (!unseen.length) return;
    this.seen.setValue(new Set([...this.seen.read(), ...unseen.map((n) => n.id)]));
    this.loom.noticesSeen();
  }
}

/** The screen: what waits for an answer, then each notice, newest first, opening what it is of. */
export function describeNotices(ui, notices, asking, account, itemScreen) {
  const list = account.weave.map((w) => w.notices);
  // new on this visit: marked seen as the screen opens, it still says so until the next load
  const fresh = (held) => held.map((n) => !!n && !n.seen);
  return ui.screen(NOTICES, [
    ui.text(Phrase.of("Notices"), "Title"),
    ui.text(Phrase.of("What others did that touches you, and what waits for your answer."), "Hint").wraps(),
    describeAsked(ui, asking, account),
    ui.when(ui.bound(() => list.read().length === 0 && account.weave.read().requests.length === 0),
      ui.text(Phrase.of("Nothing yet. When someone puts you in a memory, adds to an event you are at, or answers what you asked, it is here."), "Quiet").wraps()),
    ui.each(list, (held) => ui.pressable(OPENS_NOTICE, held.map((n) => ({ parameter: openedBy(n) })), [ui.row([
      ui.column([
        ui.text(held.map((n) => sayNotice(n)), "Words").wraps(),
        ui.text(held.map((n) => sayAgo(n?.created_at)), "Meta"),
      ]).grow(),
      ui.when(fresh(held), ui.text(Phrase.of("New"), "NewMark")),
    ], "NoticeRow")], `${CARD} Notice`).goesTo(itemScreen), (n) => n.id, "List"),
  ], null, { on_fill: () => notices.open() });
}
