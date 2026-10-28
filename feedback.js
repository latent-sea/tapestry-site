// Feedback (backend.sql, "feedback"): a member tells Tapestry's makers what
// they'd like - a suggestion - or what is wrong - a defect. They see every
// one of theirs, where it stands and the replies under it, and reply in
// turn; an admin sees everyone's, replies, and says where each stands. Each
// side is told of the other's in Notices.

import { Controller, Phrase, Themes } from "./gd_chime/gd_chime.js?v=0f4719403046";
import { CARD, LINK } from "./look/look.js?v=0f4719403046";
import { heading, notice, problem } from "./parts.js?v=0f4719403046";
import { sayAgo } from "./notices.js?v=0f4719403046";

export const FEEDBACK = "feedback";
export const FEEDBACK_ITEM = "feedback_item"; // one, with its replies: its id the parameter
export const SETS_FEEDBACK_KIND = "sets_what_the_feedback_is";
export const WRITES_FEEDBACK = "writes_feedback";
export const SENDS_FEEDBACK = "sends_feedback";
export const OPENS_FEEDBACK = "opens_feedback";
export const WRITES_REPLY = "writes_a_reply_to_feedback";
export const REPLIES = "replies_to_feedback";
export const SETS_STATUS = "says_where_feedback_stands";
export const BACK_TO_FEEDBACK = "goes_back_to_all_feedback";

export const WORDS = {
  [SETS_FEEDBACK_KIND]: ["Choose what it is"],
  [WRITES_FEEDBACK]: ["Your feedback"],
  [SENDS_FEEDBACK]: ["Send it"],
  [OPENS_FEEDBACK]: ["Open"],
  [WRITES_REPLY]: ["A reply"],
  [REPLIES]: ["Reply"],
  [SETS_STATUS]: ["Say where it stands"],
  [BACK_TO_FEEDBACK]: ["All feedback"],
};

const KINDS = [["suggestion", "A suggestion"], ["defect", "Something wrong"]];
const STATUSES = [["open", "Open"], ["planned", "Planned"], ["done", "Done"], ["declined", "Not doing"]];
const SAID = Object.fromEntries([...KINDS, ...STATUSES]);

export class Feedback extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.list = this.value([]); // theirs - everyone's, for an admin - newest first, each with its replies
    this.kind = this.value("suggestion");
    this.draft = this.value("");
    this.reply = this.value("");
    this.busy = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
  }

  answers() { return Object.keys(WORDS).filter((action) => action !== BACK_TO_FEEDBACK); }

  would(action) {
    if (this.busy.read() && [SENDS_FEEDBACK, REPLIES, SETS_STATUS].includes(action)) return Phrase.of("Sending");
    if (action === SENDS_FEEDBACK && !this.draft.read().trim()) return Phrase.of("Write it first");
    if (action === REPLIES && !this.reply.read().trim()) return Phrase.of("Write something first");
    if (action === SETS_STATUS && !this.account.weave.read().me?.admin) return Phrase.of("An admin says where it stands");
    return null;
  }

  told(action, payload) {
    this.notice.setValue("");
    if (action === SETS_FEEDBACK_KIND) this.kind.setValue(payload.kind);
    if (action === WRITES_FEEDBACK) this.draft.setValue(payload.line);
    if (action === WRITES_REPLY) this.reply.setValue(payload.line);
    if (action === SENDS_FEEDBACK) {
      this.change(() => this.loom.sendFeedback(this.kind.read(), this.draft.read().trim()),
        () => { this.draft.setValue(""); return "Sent. Thank you - you'll see the reply here, and in Notices."; });
    }
    if (action === REPLIES) this.change(() => this.loom.replyFeedback(payload.id, this.reply.read().trim()), () => { this.reply.setValue(""); return ""; });
    if (action === SETS_STATUS) this.change(() => this.loom.setFeedbackStatus(payload.id, payload.status), () => "");
    return null;
  }

  /** Theirs (everyone's, for an admin), fetched afresh. */
  async load() {
    const got = await this.loom.feedbackList();
    if (this.disposed) return;
    if (got.ok) this.list.setValue(got.data ?? []); else this.problem.setValue(got.error);
  }

  async change(work, said) {
    this.busy.setValue(true);
    this.problem.setValue("");
    const done = await work();
    await this.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!done.ok) { this.problem.setValue(done.error); return; }
    const words = said();
    if (words) this.notice.setValue(words);
  }
}

/** One in a list: what it is, where it stands, its first words, and how many replies. */
function card(ui, held, admin) {
  return ui.pressable(OPENS_FEEDBACK, held.map((f) => ({ parameter: f?.id ?? "" })), [ui.column([
    ui.row([
      ui.text(held.map((f) => Phrase.of(SAID[f?.kind] ?? "")), "Kind"),
      ui.text(held.map((f) => Phrase.of(SAID[f?.status] ?? "")), "FeedbackStatus"),
      ui.text(held.map((f) => (admin.read() && !f?.mine ? f?.author_name ?? "" : "")), "Whose").hidesEmpty(),
      ui.text(held.map((f) => sayAgo(f?.created_at)), "Meta"),
    ], "CardTop"),
    ui.text(held.map((f) => (f?.body ?? "").split("\n")[0]), "CardTitle").wraps(),
    ui.text(held.map((f) => ((f?.replies ?? []).length ? Phrase.counted("%d reply", "%d replies", f.replies.length) : "")), "Meta").hidesEmpty(),
  ])], `${CARD} Entry`).goesTo(FEEDBACK_ITEM);
}

/** The feedback screen: send one, and every one of theirs (everyone's, for an admin). */
export function describeFeedback(ui, feedback, account) {
  const admin = account.weave.map((w) => !!w.me?.admin);
  return ui.screen(FEEDBACK, [
    ui.text(Phrase.of("Feedback"), "Title"),
    ui.text(Phrase.of("Something you'd like Tapestry to do, or something wrong with it. Every one you send is here, with where it stands and the replies to it."), "Hint").wraps(),
    ui.row(KINDS.map(([kind, said]) => ui.pressable(SETS_FEEDBACK_KIND, { kind }, [ui.text(Phrase.of(said), Themes.FACE)], "Segment")
      .currentWhile(feedback.kind.map((k) => k === kind))), "Segments"),
    ui.area(WRITES_FEEDBACK, feedback.draft, "TextArea"),
    ui.row([ui.button(SENDS_FEEDBACK)], "Actions"),
    problem(ui, feedback.problem),
    notice(ui, feedback.notice),
    heading(ui, "Sent"),
    ui.when(feedback.list.map((l) => l.length === 0), ui.text(Phrase.of("None yet."), "Quiet")),
    ui.each(feedback.list, (held) => card(ui, held, admin), (f) => f.id, "List"),
  ], null, { on_fill: () => feedback.load() });
}

/** One, in full: what it is, where it stands (an admin says), its words, and the replies under it, to add to. */
export function describeFeedbackItem(ui, feedback, account) {
  const id = ui.parameter(FEEDBACK_ITEM);
  const it = ui.bound(() => feedback.list.read().find((f) => f.id === id.read()) ?? null);
  const admin = account.weave.map((w) => !!w.me?.admin);
  return ui.screen(FEEDBACK_ITEM, [
    ui.when(it, ui.column([
      ui.row([
        ui.text(it.map((f) => Phrase.of(SAID[f?.kind] ?? "")), "Kind"),
        ui.text(it.map((f) => Phrase.of(SAID[f?.status] ?? "")), "FeedbackStatus"),
        ui.text(it.map((f) => (f?.mine ? "" : f?.author_name ?? "")), "Whose").hidesEmpty(),
        ui.text(it.map((f) => sayAgo(f?.created_at)), "Meta"),
      ], "CardTop"),
      ui.text(it.map((f) => f?.body ?? ""), "Words Body").wraps(),
      ui.when(admin, ui.row(STATUSES.map(([status, said]) => ui.pressable(SETS_STATUS, ui.bound(() => ({ id: id.read(), status })),
        [ui.text(Phrase.of(said), Themes.FACE)], "Segment").currentWhile(it.map((f) => f?.status === status))), "Segments")),
      heading(ui, "Replies"),
      ui.when(it.map((f) => !(f?.replies ?? []).length), ui.text(Phrase.of("No replies yet."), "Quiet")),
      ui.each(it.map((f) => f?.replies ?? []), (held) => ui.surface(CARD, [ui.column([
        ui.row([
          ui.text(held.map((r) => (r?.mine ? Phrase.of("You") : r?.author_name ?? "")), "PersonName").grow(),
          ui.text(held.map((r) => (r?.admin ? Phrase.of("Tapestry") : "")), "Quiet").hidesEmpty(),
          ui.text(held.map((r) => sayAgo(r?.created_at)), "Meta"),
        ], "PersonRow"),
        ui.text(held.map((r) => r?.body ?? ""), "Words Body").wraps(),
      ])], "Comment"), (r) => r.id, "List"),
      ui.area(WRITES_REPLY, feedback.reply, "TextArea CommentText"),
      ui.row([ui.button(REPLIES, { payload: id.map((v) => ({ id: v ?? "" })) }), ui.button(BACK_TO_FEEDBACK, { style: LINK, goes_to: FEEDBACK })], "Actions"),
      problem(ui, feedback.problem),
      notice(ui, feedback.notice),
    ]), ui.text(Phrase.of("This feedback isn't here."), "Quiet")),
  ], null, { on_fill: () => feedback.load() });
}
