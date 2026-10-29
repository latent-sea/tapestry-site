// Comments on a memory (backend.sql, "comments"): anyone who sees it - its
// owner, or someone it is shared with, on either plan - writes one; each is
// seen by whoever sees the memory, oldest first, and taken off by its writer
// or the memory's owner.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=89aae1096cfb";
import { CARD, LINK } from "./look/look.js?v=89aae1096cfb";
import { notice, problem } from "./parts.js?v=89aae1096cfb";
import { sayAgo } from "./notices.js?v=89aae1096cfb";
import { REPORTS } from "./safety.js?v=89aae1096cfb";

export const WRITES_COMMENT = "writes_a_comment";
export const COMMENTS = "comments_on_it";
export const TAKES_OFF_COMMENT = "takes_off_a_comment";

export const WORDS = {
  [WRITES_COMMENT]: ["A comment"],
  [COMMENTS]: ["Comment"],
  [TAKES_OFF_COMMENT]: ["Take it off"],
};

export class Comments extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.draft = this.value("");
    this.busy = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
  }

  answers() { return Object.keys(WORDS); }

  would(action) {
    if (this.busy.read()) return Phrase.of("Saving");
    if (action === COMMENTS && !this.draft.read().trim()) return Phrase.of("Write something first");
    return null;
  }

  told(action, payload) {
    if (action === WRITES_COMMENT) this.draft.setValue(payload.line);
    if (action === COMMENTS) this.change(() => this.loom.comment(payload.memory, this.draft.read().trim()), () => this.draft.setValue(""));
    if (action === TAKES_OFF_COMMENT) this.change(() => this.loom.deleteComment(payload.id));
    return null;
  }

  async change(work, then = () => {}) {
    this.busy.setValue(true);
    this.problem.setValue("");
    const done = await work();
    if (done.ok) { then(); await this.account.load(); }
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!done.ok) this.problem.setValue(done.error);
  }
}

/** A memory's comments, oldest first, and a line to add one: memory, a bound memory as loaded (or null). */
export function describeComments(ui, comments, account, memory) {
  const list = memory.map((m) => m?.comments ?? []);
  const mayTakeOff = (held) => ui.bound(() => {
    const weave = account.weave.read();
    return held.read()?.author === weave.meId || memory.read()?.owner === weave.meId;
  });
  return ui.when(memory.map((m) => !!m), ui.column([
    ui.text(ui.bound(() => (list.read().length ? Phrase.counted("%d comment", "%d comments", list.read().length) : Phrase.of("Comments"))), "FieldName"),
    ui.each(list, (held) => ui.surface(CARD, [ui.column([
      ui.row([
        ui.text(held.map((c) => c?.author_name ?? ""), "PersonName").grow(),
        ui.text(held.map((c) => sayAgo(c?.created_at)), "Meta"),
      ], "PersonRow"),
      ui.text(held.map((c) => c?.body ?? ""), "Words Body").wraps(),
      ui.row([
        ui.when(mayTakeOff(held), ui.pressable(TAKES_OFF_COMMENT, held.map((c) => ({ id: c?.id ?? "" })), [ui.text(ui.words(TAKES_OFF_COMMENT), "Small")], LINK)),
        // someone else's comment: reported to the admins as breaking the terms
        ui.when(ui.bound(() => held.read()?.author !== account.weave.read().meId),
          ui.pressable(REPORTS, held.map((c) => ({ comment: c?.id ?? "" })), [ui.text(ui.words(REPORTS), "Small")], LINK)),
      ], "Actions"),
    ])], "Comment"), (c) => c.id, "List"),
    ui.area(WRITES_COMMENT, comments.draft, "TextArea CommentText"),
    ui.row([ui.button(COMMENTS, { payload: memory.map((m) => ({ memory: m?.id ?? "" })) })], "Actions"),
    problem(ui, comments.problem),
    notice(ui, comments.notice),
  ], "Part"));
}
