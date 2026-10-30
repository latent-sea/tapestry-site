// Keeping Tapestry kind (terms.html): something that breaks its terms or the
// law - a memory, a comment, an event, a period or a place - reported, saying
// why, to its moderators, who see each report in the admin area; and another member blocked, so neither sees anything of the
// other's, nor comments, nor asks anything (backend.sql, "blocking"), until
// taken back in You.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=874a7fa5f28c";
import { DANGER, LINK } from "./look/look.js?v=874a7fa5f28c";
import { notice, problem } from "./parts.js?v=874a7fa5f28c";

export const REPORTS = "reports_it";
export const SETS_REASON = "says_why_it_is_reported";
export const SENDS_REPORT = "sends_the_report";
export const BLOCKS = "blocks_them";
export const CONFIRMS_BLOCK = "yes_blocks_them";
export const UNBLOCKS = "unblocks_them";
export const CANCELS = "keeps_it_as_it_is";

export const WORDS = {
  [REPORTS]: ["Report"],
  [SETS_REASON]: ["Why"],
  [SENDS_REPORT]: ["Send the report"],
  [BLOCKS]: ["Block"],
  [CONFIRMS_BLOCK]: ["Yes, block them"],
  [UNBLOCKS]: ["Unblock"],
  [CANCELS]: ["Cancel"],
};

export class Safety extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.reporting = this.value(null); // { memory }, { comment } or { kind, id } (an event, period or place): what is being reported, while why is asked
    this.reason = this.value("");
    this.blocking = this.value(""); // the account about to be blocked, while it is asked
    this.busy = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
  }

  answers() { return Object.keys(WORDS); }

  would(action, payload) {
    if (this.busy.read()) return Phrase.of("Saving");
    const weave = this.account.weave.read();
    if (action === SENDS_REPORT && !this.reason.read().trim()) return Phrase.of("Say why it is reported: what it breaks, of the terms or the law");
    if (action === BLOCKS && (!payload?.account || payload.account === weave.meId)) return Phrase.of("Not someone else");
    if (action === REPORTS) {
      const memory = payload?.memory ? weave.memories.get(payload.memory) : null;
      const comment = payload?.comment ? weave.data.memories.flatMap((m) => m.comments ?? []).find((c) => c.id === payload.comment) : null;
      const thing = payload?.kind ? ({ event: weave.events, period: weave.periods, place: weave.places })[payload.kind]?.get(payload.id) : null;
      if ((!memory && !comment && !thing) || memory?.owner === weave.meId || comment?.author === weave.meId || thing?.owner === weave.meId) return Phrase.of("Only someone else's");
    }
    return null;
  }

  told(action, payload) {
    this.notice.setValue("");
    if (action === REPORTS) {
      this.reporting.setValue(payload.memory ? { memory: payload.memory } : payload.comment ? { comment: payload.comment } : { kind: payload.kind, id: payload.id });
      this.reason.setValue("");
    }
    if (action === SETS_REASON) this.reason.setValue(payload.line);
    if (action === CANCELS) { this.reporting.setValue(null); this.blocking.setValue(""); }
    if (action === SENDS_REPORT) {
      const { memory = "", comment = "", kind = "", id = "" } = this.reporting.read() ?? {};
      const reason = this.reason.read().trim();
      this.reporting.setValue(null);
      this.change(() => (kind ? this.loom.reportThing(kind, id, reason) : this.loom.report(memory, comment, reason)), "Reported. Tapestry's moderators will look at it, and tell you what they decide.");
    }
    if (action === BLOCKS) this.blocking.setValue(payload.account);
    if (action === CONFIRMS_BLOCK) {
      const blocked = this.blocking.read();
      this.blocking.setValue("");
      this.change(() => this.loom.block(blocked, true), "Blocked. You'll see nothing of theirs, and they nothing of yours. Unblock them in You.");
    }
    if (action === UNBLOCKS) this.change(() => this.loom.block(payload.account, false), "Unblocked.");
    return null;
  }

  async change(work, said) {
    this.busy.setValue(true);
    this.problem.setValue("");
    const done = await work();
    await this.account.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!done.ok) this.problem.setValue(done.error); else this.notice.setValue(said);
  }
}

/** Why something is being reported, asked before it is sent - shown on what is reported (key: "memory:<id>", "event:<id>", ...), or for a comment on a memory. */
export function describeReporting(ui, safety, key) {
  const reportingHere = ui.bound(() => {
    const at = safety.reporting.read();
    if (!at || !key.read()) return false;
    if (at.memory) return key.read() === `memory:${at.memory}`;
    if (at.comment) return key.read().startsWith("memory:");
    return key.read() === `${at.kind}:${at.id}`;
  });
  return ui.column([
    ui.when(reportingHere, ui.column([
      ui.text(Phrase.of("Report this to Tapestry's moderators as breaking its terms or the law? Say why: what it breaks, and how. Whoever it is of isn't told who reported it."), "Hint").wraps(),
      ui.area(SETS_REASON, safety.reason, "TextArea"),
      ui.row([ui.button(SENDS_REPORT, { style: DANGER }), ui.button(CANCELS, { style: LINK })], "Actions"),
    ], "Part")),
    problem(ui, safety.problem),
    notice(ui, safety.notice),
  ]);
}

/** Someone about to be blocked: what it does, said first. */
export function describeBlocking(ui, safety, account, whose) {
  return ui.when(ui.bound(() => !!safety.blocking.read() && safety.blocking.read() === whose.read()), ui.column([
    ui.text(ui.bound(() => Phrase.with("Block %s? Neither of you will see anything of the other's, nor can they comment on yours or ask you anything. You can unblock them in You.",
      [account.weave.read().nameOf(whose.read())])), "Warn").wraps(),
    ui.row([ui.button(CONFIRMS_BLOCK, { style: DANGER }), ui.button(CANCELS, { style: LINK })], "Actions"),
  ], "Part"));
}
