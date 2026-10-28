// Keeping Tapestry kind (terms.html): something that breaks its terms - a
// memory, or a comment - reported to its admins, who see each report in the
// admin area; and another member blocked, so neither sees anything of the
// other's, nor comments, nor asks anything (backend.sql, "blocking"), until
// taken back in You.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=e43c69e994f9";
import { DANGER, LINK } from "./look/look.js?v=e43c69e994f9";
import { notice, problem } from "./parts.js?v=e43c69e994f9";

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
    this.reporting = this.value(null); // { memory } or { comment }: what is being reported, while why is asked
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
    if (action === BLOCKS && (!payload?.account || payload.account === weave.meId)) return Phrase.of("Not someone else");
    if (action === REPORTS) {
      const memory = payload?.memory ? weave.memories.get(payload.memory) : null;
      const comment = payload?.comment ? weave.data.memories.flatMap((m) => m.comments ?? []).find((c) => c.id === payload.comment) : null;
      if ((!memory && !comment) || memory?.owner === weave.meId || comment?.author === weave.meId) return Phrase.of("Only someone else's");
    }
    return null;
  }

  told(action, payload) {
    this.notice.setValue("");
    if (action === REPORTS) { this.reporting.setValue(payload.memory ? { memory: payload.memory } : { comment: payload.comment }); this.reason.setValue(""); }
    if (action === SETS_REASON) this.reason.setValue(payload.line);
    if (action === CANCELS) { this.reporting.setValue(null); this.blocking.setValue(""); }
    if (action === SENDS_REPORT) {
      const { memory = "", comment = "" } = this.reporting.read() ?? {};
      this.reporting.setValue(null);
      this.change(() => this.loom.report(memory, comment, this.reason.read().trim()), "Reported. Tapestry's admins will look at it.");
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

/** Why something is being reported, asked before it is sent - shown for this memory, or a comment on it. */
export function describeReporting(ui, safety, memoryId) {
  const reportingHere = ui.bound(() => {
    const at = safety.reporting.read();
    if (!at) return false;
    if (at.memory) return at.memory === memoryId.read();
    return !!memoryId.read();
  });
  return ui.column([
    ui.when(reportingHere, ui.column([
      ui.text(Phrase.of("Report this to Tapestry's admins as breaking its terms? Say why, if you like. Whoever wrote it isn't told who reported it."), "Hint").wraps(),
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
