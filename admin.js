// The admin area: running Tapestry, not reading it (backend.sql, "the admin
// area"). An admin sees who has joined - their Google email, when, by whose
// invitation - and every invitation waiting; removes someone from Tapestry,
// cancels an invitation, makes another admin; and sees whether the server is
// on the latest version. The founder is the first admin. An admin sees no
// one's memories, events or periods but as anyone would.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=97f2a9aaf774";
import { heading, notice, problem } from "./parts.js?v=97f2a9aaf774";
import { CARD, DANGER, LINK } from "./look/look.js?v=97f2a9aaf774";
import { HOW_TO_INVITE } from "./people.js?v=97f2a9aaf774";
import { sayAgo } from "./notices.js?v=97f2a9aaf774";

export const ADMIN = "admin";

export const ASKS_TO_REMOVE_MEMBER = "asks_before_removing_from_tapestry";
export const REMOVES_MEMBER = "removes_from_tapestry";
export const KEEPS_MEMBER = "keeps_on_tapestry";
export const CANCELS_INVITE = "cancels_the_invitation";
export const MAKES_ADMIN = "makes_them_an_admin";
export const UNMAKES_ADMIN = "makes_them_not_an_admin";
export const LOOKS_AGAIN = "looks_again";
export const SETS_PLAN = "sets_their_plan";
export const REMOVES_REPORTED = "removes_what_was_reported";
export const LETS_REPORTED_BE = "lets_what_was_reported_be";
export const ASKS_WHY_REMOVED = "says_why_it_is_removed";
export const TYPES_WHY = "types_why_it_is_removed";
export const KEEPS_REPORTED = "goes_back_from_removing_it";
export const SETS_MODERATOR = "makes_them_a_moderator_or_not";
export const SEES_AS = "sees_tapestry_as_them";

export const WORDS = {
  [ASKS_TO_REMOVE_MEMBER]: ["Remove from Tapestry"],
  [REMOVES_MEMBER]: ["Yes, remove them"],
  [KEEPS_MEMBER]: ["No, keep them"],
  [CANCELS_INVITE]: ["Cancel it"],
  [MAKES_ADMIN]: ["Make an admin"],
  [UNMAKES_ADMIN]: ["Not an admin"],
  [LOOKS_AGAIN]: ["Look again"],
  [SETS_PLAN]: ["Change their plan"],
  [REMOVES_REPORTED]: ["Yes, remove it"],
  [LETS_REPORTED_BE]: ["Let it be"],
  [ASKS_WHY_REMOVED]: ["Remove it"],
  [TYPES_WHY]: ["Why"],
  [KEEPS_REPORTED]: ["Not yet"],
  [SETS_MODERATOR]: ["Make a moderator, or not"],
  [SEES_AS]: ["See as them"],
};

const when = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "");

export class Admin extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.view = this.value({ members: [], invitations: [], log: [] });
    this.reports = this.value([]); // what is reported, in full, for those who moderate
    this.removing = this.value(""); // the report being removed, while why is asked
    this.why = this.value("");
    this.server = this.value(null);
    this.removingMember = this.value(""); // the member being asked about before they are removed
    this.busy = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
  }

  answers() { return Object.keys(WORDS); }

  would(action) {
    if (this.busy.read()) return Phrase.of("Working");
    if (action === REMOVES_REPORTED && !this.why.read().trim()) return Phrase.of("Say why: its writer is told");
    return null;
  }

  /** Tapestry seen as a member - masked, unless they let support in - and their thread opened. */
  async seeAs(member, name) {
    this.busy.setValue(true);
    const seen = await this.account.seeAs(member, name);
    if (this.disposed) return;
    this.busy.setValue(false);
    if (seen) location.hash = "";
  }

  told(action, payload) {
    this.notice.setValue("");
    if (action === ASKS_TO_REMOVE_MEMBER) this.removingMember.setValue(payload.id);
    if (action === KEEPS_MEMBER) this.removingMember.setValue("");
    if (action === REMOVES_MEMBER) {
      this.removingMember.setValue("");
      this.change(() => this.loom.adminRemove(payload.id), "Removed from Tapestry. To others they are a name again.");
    }
    if (action === CANCELS_INVITE) this.change(() => this.loom.adminCancelInvite(payload.token), "Cancelled: that link lets no one in now.");
    if (action === MAKES_ADMIN) this.change(() => this.loom.adminSet(payload.id, true), "They are an admin now.");
    if (action === UNMAKES_ADMIN) this.change(() => this.loom.adminSet(payload.id, false), "They are not an admin now.");
    if (action === LOOKS_AGAIN) this.open();
    // removed: why asked first - its writer is told, and whoever reported it
    if (action === ASKS_WHY_REMOVED) { this.removing.setValue(payload.id); this.why.setValue(""); }
    if (action === TYPES_WHY) this.why.setValue(payload.line);
    if (action === KEEPS_REPORTED) this.removing.setValue("");
    if (action === REMOVES_REPORTED) {
      this.removing.setValue("");
      this.change(() => this.loom.settleReport(payload.id, true, this.why.read().trim()), "Removed. Its writer is told why, and whoever reported it what was decided.");
    }
    if (action === LETS_REPORTED_BE) this.change(() => this.loom.settleReport(payload.id, false, ""), "Let be. Whoever reported it is told.");
    if (action === SETS_MODERATOR) this.change(() => this.loom.adminSetModerator(payload.id, payload.moderates), payload.moderates ? "They moderate what is reported now." : "They don't moderate now.");
    if (action === SEES_AS) this.seeAs(payload.id, payload.name);
    if (action === SETS_PLAN) this.change(() => this.loom.adminSetPlan(payload.id, payload.plan), payload.plan === "paid" ? "On the paid plan: they keep their own life story." : "On the free plan: they see and comment.");
    return null;
  }

  /** What is reported; for an admin, who is on Tapestry, the invitations, what was seen, and how the server is. */
  async open() {
    this.problem.setValue("");
    const me = this.account.weave.read().me;
    const reports = await this.loom.reportsView();
    if (this.disposed) return;
    this.reports.setValue(reports.ok ? reports.data ?? [] : []);
    if (!me?.admin) return;
    const [seen, server] = await Promise.all([this.loom.adminView(), this.loom.platformStatus()]);
    if (this.disposed) return;
    if (seen.ok) this.view.setValue(seen.data); else this.problem.setValue(seen.error);
    this.server.setValue(server.ok ? server.data : null);
  }

  async change(work, said) {
    this.busy.setValue(true);
    this.problem.setValue("");
    const done = await work();
    await this.open();
    await this.account.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!done.ok) this.problem.setValue(done.error); else this.notice.setValue(said);
  }
}

/** What the server's status says, in words. */
export function sayServer(server) {
  if (!server) return Phrase.of("The server didn't answer.");
  const commit = String(server.commit ?? "").slice(0, 7);
  const at = server.at ? new Date(server.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
  if (server.result === "deployed") return Phrase.with("Up to date with version %s, since %s.", [commit, at]);
  if (server.result === "refused") return Phrase.with("Version %s wasn't taken: one of its checks failed. It is still on the one before.", [commit]);
  if (server.result === "rolled-back" || server.result === "unwell") return Phrase.with("Version %s made the server unwell, so it went back to the one before.", [commit]);
  return Phrase.with("%s (version %s, %s)", [server.result ?? "", commit, at]);
}

export function describeAdmin(ui, admin, account) {
  const members = admin.view.map((v) => v.members ?? []);
  const invitations = admin.view.map((v) => v.invitations ?? []);
  const log = admin.view.map((v) => v.log ?? []);
  const isAdmin = account.weave.map((w) => !!w.me?.admin);
  const SAID = { viewed_masked: "saw, masked, the account of", viewed_with_consent: "saw, as they let support, the account of", viewed_report: "saw a report on",
    removed_report: "removed what was reported of", kept_report: "let be what was reported of" };
  return ui.screen(ADMIN, [
    ui.text(Phrase.of("Admin"), "Title"),
    ui.text(ui.bound(() => Phrase.of(isAdmin.read() ? "Running Tapestry. You see what is reported in full, who is on it and the invitations waiting - anyone's memories only as they share them with you, or masked."
      : "Moderating Tapestry: what members reported as breaking its terms, in full, to remove or let be.")), "Hint").wraps(),
    problem(ui, admin.problem),
    notice(ui, admin.notice),
    // what members reported as breaking the terms (terms.html), in full: each removed - saying why - or let be
    heading(ui, "Reported"),
    ui.when(admin.reports.map((l) => l.length === 0), ui.text(Phrase.of("Nothing reported."), "Quiet")),
    ui.each(admin.reports, (held) => ui.surface(CARD, [ui.column([
      ui.text(held.map((r) => Phrase.with(r?.kind === "comment" ? "%s reported a comment by %s" : "%s reported a memory of %s's", [r?.reporter ?? "", r?.owner ?? ""])), "Words").wraps(),
      ui.text(held.map((r) => r?.title ?? ""), "CardTitle").wraps().hidesEmpty(),
      ui.text(held.map((r) => r?.words ?? ""), "Words Body").wraps().hidesEmpty(),
      ui.eachAcross(held.map((r) => r?.pictures ?? []), (pic) => ui.image(pic.map((p) => (p ? account.address(p.path) : "")), "Thumb",
        pic.map((p) => p?.caption || Phrase.of("A picture"))), (p) => p.id, "Thumbs"),
      ui.text(held.map((r) => (r?.reason ? Phrase.with("Why: %s", [r.reason]) : "")), "Meta").wraps().hidesEmpty(),
      ui.text(held.map((r) => when(r?.created_at)), "Meta"),
      ui.when(ui.bound(() => admin.removing.read() === held.read()?.id), ui.column([
        ui.text(Phrase.of("Why is it removed? Its writer is told, and whoever reported it."), "Hint").wraps(),
        ui.area(TYPES_WHY, admin.why, "TextArea"),
        ui.row([
          ui.pressable(REMOVES_REPORTED, held.map((r) => ({ id: r?.id ?? "" })), [ui.text(ui.words(REMOVES_REPORTED), "Small")], DANGER),
          ui.pressable(KEEPS_REPORTED, {}, [ui.text(ui.words(KEEPS_REPORTED), "Small")], LINK),
        ], "Actions"),
      ]), ui.row([
        ui.pressable(ASKS_WHY_REMOVED, held.map((r) => ({ id: r?.id ?? "" })), [ui.text(ui.words(ASKS_WHY_REMOVED), "Small")], DANGER),
        ui.pressable(LETS_REPORTED_BE, held.map((r) => ({ id: r?.id ?? "" })), [ui.text(ui.words(LETS_REPORTED_BE), "Small")], LINK),
      ], "Actions")),
    ])]), (r) => r.id, "List"),
    ui.when(isAdmin, ui.column([
    heading(ui, "The server"),
    ui.row([
      ui.text(admin.server.map((s) => sayServer(s)), "Words").wraps().grow(),
      ui.button(LOOKS_AGAIN, { style: LINK }),
    ], "AddRow"),
    heading(ui, "Who is on Tapestry"),
    ui.each(members, (held) => ui.surface(CARD, [ui.column([
      ui.row([
        ui.text(held.map((m) => m?.name ?? ""), "PersonName").grow(),
        ui.text(held.map((m) => (m?.admin ? Phrase.of("Admin") : "")), "Quiet").hidesEmpty(),
      ], "PersonRow"),
      ui.text(held.map((m) => m?.email ?? ""), "Meta").hidesEmpty(),
      // their plan: paid keeps a thread of their own; free sees and comments (an admin keeps one whatever their plan)
      ui.row([
        ui.text(held.map((m) => Phrase.of(m?.plan === "free" ? "Free plan" : "Paid plan")), "Meta").grow(),
        ui.pressable(SETS_PLAN, held.map((m) => ({ id: m?.id ?? "", plan: m?.plan === "free" ? "paid" : "free" })),
          [ui.text(held.map((m) => Phrase.of(m?.plan === "free" ? "Put on the paid plan" : "Put on the free plan")), "Small")], LINK),
      ], "PersonRow"),
      ui.when(held.map((m) => !m?.you), ui.row([
        ui.pressable(SEES_AS, held.map((m) => ({ id: m?.id ?? "", name: m?.name ?? "" })), [ui.text(ui.words(SEES_AS), "Small")], LINK),
        ui.when(held.map((m) => !m?.admin), ui.pressable(SETS_MODERATOR, held.map((m) => ({ id: m?.id ?? "", moderates: !m?.moderator })),
          [ui.text(held.map((m) => Phrase.of(m?.moderator ? "Not a moderator" : "Make a moderator")), "Small")], LINK)),
      ], "Actions")),
      ui.text(held.map((m) => (m?.moderator ? Phrase.of("Moderates what is reported") : "")), "Meta").hidesEmpty(),
      ui.text(held.map((m) => (m?.invited_by ? Phrase.with("Joined %s, invited by %s", [when(m.joined), m.invited_by])
        : Phrase.with("Joined %s", [when(m?.joined)]))), "Meta"),
      ui.when(held.map((m) => !m?.you), ui.column([
        ui.when(ui.bound(() => admin.removingMember.read() === held.read()?.id), ui.column([
          ui.text(held.map((m) => Phrase.with("Remove %s from Tapestry? Everything they made goes, for good; to others they become a name again. They come back only by a new invitation.", [m?.name ?? ""])), "Warn").wraps(),
          ui.row([
            ui.pressable(REMOVES_MEMBER, held.map((m) => ({ id: m?.id ?? "" })), [ui.text(ui.words(REMOVES_MEMBER), "Small")], DANGER),
            ui.pressable(KEEPS_MEMBER, {}, [ui.text(ui.words(KEEPS_MEMBER), "Small")], LINK),
          ], "Actions"),
        ]), ui.row([
          ui.when(held.map((m) => !!m?.admin),
            ui.pressable(UNMAKES_ADMIN, held.map((m) => ({ id: m?.id ?? "" })), [ui.text(ui.words(UNMAKES_ADMIN), "Small")], LINK),
            ui.pressable(MAKES_ADMIN, held.map((m) => ({ id: m?.id ?? "" })), [ui.text(ui.words(MAKES_ADMIN), "Small")], LINK)),
          ui.when(held.map((m) => !m?.admin),
            ui.pressable(ASKS_TO_REMOVE_MEMBER, held.map((m) => ({ id: m?.id ?? "" })), [ui.text(ui.words(ASKS_TO_REMOVE_MEMBER), "Small")], LINK)),
        ], "Actions")),
      ])),
    ])]), (m) => m.id, "List"),
    heading(ui, "Invitations waiting"),
    ui.when(invitations.map((l) => l.length === 0), ui.text(Phrase.of("None waiting."), "Quiet")),
    ui.each(invitations, (held) => ui.surface(CARD, [ui.row([
      ui.column([
        ui.text(held.map((i) => Phrase.with("%s invited %s", [i?.from ?? "", i?.for ?? ""])), "Words"),
        ui.text(held.map((i) => (i?.expired ? Phrase.of("Run out") : Phrase.with("Runs out %s", [when(i?.expires_at)]))), "Meta"),
      ]).grow(),
      ui.pressable(CANCELS_INVITE, held.map((i) => ({ token: i?.token ?? "" })), [ui.text(ui.words(CANCELS_INVITE), "Small")], LINK),
    ], "PersonRow")]), (i) => i.token, "List"),
    heading(ui, "Inviting someone"),
    ...HOW_TO_INVITE.map((step) => ui.text(Phrase.of(step), "Hint").wraps()),
    // what was seen of whose, by whom: support seeing as someone, and moderating
    heading(ui, "What was seen"),
    ui.when(log.map((l) => l.length === 0), ui.text(Phrase.of("Nothing yet."), "Quiet")),
    ui.each(log.map((l) => l.slice(0, 30).map((e, i) => ({ ...e, key: `${e.at}-${i}` }))), (held) => ui.text(held.map((e) => Phrase.with("%s %s %s, %s",
      [e?.by ?? "", Phrase.of(SAID[e?.what] ?? ""), e?.member ?? Phrase.of("someone"), sayAgo(e?.at)])), "Meta").wraps(), (e) => e.key, "List"),
    ])),
  ], null, { on_fill: () => admin.open() });
}
