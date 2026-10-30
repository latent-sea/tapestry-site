// The admin portal: running Tapestry, on a laptop (backend.sql, "the admin
// portal"). Opened with a code from an authenticator app as well as Google's
// sign-in - the platform's own second factor on their sign-in, set up once by
// scanning it, the same one the platform's own portal asks for - and closed
// again after an hour unused. In it, an admin sees how Tapestry is doing; everyone on it, each as
// counts, never their words; what is reported, and every decision made;
// privacy requests and notices sent by email, each with its month to answer
// in; feedback; invitations; and everything done in the portal, written
// down. A moderator sees what is reported alone. Everything shown comes from
// the platform, which asks for the open portal itself: nothing here decides
// who may see what.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=f74905f80d78";
import { heading, notice, problem } from "./parts.js?v=f74905f80d78";
import { CARD, DANGER, LINK } from "./look/look.js?v=f74905f80d78";
import { HOW_TO_INVITE } from "./people.js?v=f74905f80d78";
import { sayAgo } from "./notices.js?v=f74905f80d78";

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
export const SAYS_WHAT_IT_BROKE = "says_what_it_broke";
export const TYPES_CODE = "types_the_code";
export const OPENS_PORTAL = "opens_the_admin_portal";
export const LOCKS_PORTAL = "locks_the_admin_portal";
export const SHOWS_PART = "shows_a_part_of_the_portal";
export const FINDS_MEMBER = "finds_a_member";
export const SORTS_MEMBERS = "sorts_the_members";
export const OPENS_MEMBER = "opens_a_members_details";
export const CLOSES_MEMBER = "closes_a_members_details";
export const SETS_REQUEST = "writes_down_a_request";
export const LOGS_REQUEST = "keeps_the_request";
export const TYPES_OUTCOME = "says_what_was_done";
export const CLOSES_REQUEST = "closes_the_request";
export const FINDS_IN_LOG = "finds_in_what_was_done";

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
  [SEES_AS]: ["See as them, masked"],
  [SAYS_WHAT_IT_BROKE]: ["What it broke"],
  [TYPES_CODE]: ["The code from your authenticator app"],
  [OPENS_PORTAL]: ["Open"],
  [LOCKS_PORTAL]: ["Lock the portal"],
  [SHOWS_PART]: ["Show"],
  [FINDS_MEMBER]: ["Find a member by name or email"],
  [SORTS_MEMBERS]: ["Order"],
  [OPENS_MEMBER]: ["Details"],
  [CLOSES_MEMBER]: ["Close"],
  [SETS_REQUEST]: ["Write it down"],
  [LOGS_REQUEST]: ["Keep it"],
  [TYPES_OUTCOME]: ["What was done"],
  [CLOSES_REQUEST]: ["Close it"],
  [FINDS_IN_LOG]: ["Find in what was done"],
};

/** What a report is of, as said on it: whose, and what. */
const REPORTED = { memory: "%s reported a memory of %s's", comment: "%s reported a comment by %s", event: "%s reported an event of %s's",
  period: "%s reported a period of %s's", place: "%s reported a place of %s's" };

/** The parts of the portal, in order: [key, words, admins' alone]. */
const PARTS = [["overview", "Overview", true], ["members", "Members", true], ["moderation", "Moderation", false], ["requests", "Requests", true],
  ["feedback", "Feedback", true], ["invitations", "Invitations", true], ["log", "What was done", true]];

/** What was done, as written down, in words: who did it comes first. */
export const DONE = {
  viewed_masked: "saw, masked, the account of", viewed_with_consent: "saw, as they let support, the account of", viewed_report: "saw a report on",
  removed_report: "removed what was reported of", kept_report: "let be what was reported of", 
  portal_opened: "opened the portal",
  opened_member: "opened the details of", removed_member: "removed from Tapestry", changed_plan: "changed the plan of", made_admin: "made an admin:",
  unmade_admin: "made not an admin:", made_moderator: "made a moderator:", unmade_moderator: "made not a moderator:", cancelled_invite: "cancelled an invitation",
  logged_request: "wrote down a request", closed_request: "closed a request",
};

const REQUEST_KINDS = [["access", "To see their data"], ["erasure", "To delete it"], ["correction", "To correct it"], ["objection", "Objects to its use"],
  ["restriction", "To limit its use"], ["portability", "To take it elsewhere"], ["notice", "Reports something"], ["other", "Something else"]];

const SORTS = [["joined", "Joined"], ["name", "Name"], ["seen", "Last seen"], ["memories", "Most memories"]];

const when = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");
const size = (bytes) => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.round((bytes ?? 0) / 1e3)} KB`);
const today = () => new Date().toISOString().slice(0, 10);
/** Whether a refusal is the platform asking for the code again: the portal closed, or never opened. */
const wantsCode = (error) => /authenticator app/i.test(String(error ?? ""));

export class Admin extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    // the portal's door: checking, setting (an authenticator to scan, the first time), code, open; or refused
    this.door = this.value("checking");
    this.isAdmin = this.value(false);
    this.factor = ""; // their authenticator, set up: its id, to give its code for
    this.setUp = this.value(null); // { id, secret, picture }: the authenticator to scan, the first time
    this.code = this.value("");
    this.part = this.value("overview");
    this.overview = this.value(null);
    this.members = this.value([]);
    this.memberLine = this.value("");
    this.sort = this.value("joined");
    this.member = this.value(null); // one member's details, opened
    this.view = this.value({ members: [], invitations: [], log: [] });
    this.reports = this.value([]); // what is reported, in full, for those who moderate
    this.decisions = this.value([]);
    this.requests = this.value([]);
    this.request = this.value({ received: today(), from_whom: "", kind: "", details: "" });
    this.outcomes = this.value({}); // what was done, typed, by request
    this.feedback = this.value([]);
    this.log = this.value([]);
    this.logLine = this.value("");
    this.removing = this.value(""); // the report being removed, while why is asked
    this.why = this.value("");
    this.ground = this.value(""); // what it broke, said on removing it: "terms" or "law"
    this.server = this.value(null);
    this.removingMember = this.value(""); // the member being asked about before they are removed
    this.busy = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
  }

  answers() { return Object.keys(WORDS); }

  would(action, payload) {
    if (this.busy.read() && ![TYPES_CODE, TYPES_WHY, FINDS_MEMBER, SETS_REQUEST, TYPES_OUTCOME, FINDS_IN_LOG].includes(action)) return Phrase.of("Working");
    if (action === OPENS_PORTAL && !/^\d{6}$/.test(this.code.read().replace(/\s/g, ""))) return Phrase.of("Enter the six digits your authenticator app shows");
    if (action === REMOVES_REPORTED && !this.why.read().trim()) return Phrase.of("Say why: its writer is told");
    if (action === REMOVES_REPORTED && !this.ground.read()) return Phrase.of("Say whether it broke the terms or the law");
    if (action === LOGS_REQUEST) {
      const r = this.request.read();
      if (!r.from_whom.trim()) return Phrase.of("Say who it is from");
      if (!r.kind) return Phrase.of("Say what they ask");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.received) || r.received > today()) return Phrase.of("Say the day it came");
    }
    if (action === CLOSES_REQUEST && !(this.outcomes.read()[payload?.id] ?? "").trim()) return Phrase.of("Say what was done, or why not");
    return null;
  }

  told(action, payload) {
    this.notice.setValue("");
    if (action === TYPES_CODE) this.code.setValue(payload.line);
    if (action === OPENS_PORTAL) this.openWith(this.code.read().replace(/\s/g, ""));
    if (action === LOCKS_PORTAL) this.lock();
    if (action === SHOWS_PART) { this.part.setValue(payload.part); this.member.setValue(null); this.load(); }
    if (action === FINDS_MEMBER) this.memberLine.setValue(payload.line);
    if (action === SORTS_MEMBERS) this.sort.setValue(payload.by);
    if (action === OPENS_MEMBER) this.openMember(payload.id);
    if (action === CLOSES_MEMBER) { this.member.setValue(null); this.removingMember.setValue(""); }
    if (action === ASKS_TO_REMOVE_MEMBER) this.removingMember.setValue(payload.id);
    if (action === KEEPS_MEMBER) this.removingMember.setValue("");
    if (action === REMOVES_MEMBER) {
      this.removingMember.setValue("");
      this.member.setValue(null);
      this.change(() => this.loom.adminRemove(payload.id), "Removed from Tapestry. To others they are a name again.");
    }
    if (action === CANCELS_INVITE) this.change(() => this.loom.adminCancelInvite(payload.token), "Cancelled: that link lets no one in now.");
    if (action === MAKES_ADMIN) this.change(() => this.loom.adminSet(payload.id, true), "They are an admin now.");
    if (action === UNMAKES_ADMIN) this.change(() => this.loom.adminSet(payload.id, false), "They are not an admin now.");
    if (action === LOOKS_AGAIN) this.load();
    // removed: why asked first - its writer is told, and whoever reported it
    if (action === ASKS_WHY_REMOVED) { this.removing.setValue(payload.id); this.why.setValue(""); this.ground.setValue(""); }
    if (action === SAYS_WHAT_IT_BROKE) this.ground.setValue(payload.ground);
    if (action === TYPES_WHY) this.why.setValue(payload.line);
    if (action === KEEPS_REPORTED) this.removing.setValue("");
    if (action === REMOVES_REPORTED) {
      this.removing.setValue("");
      this.change(() => this.loom.settleReport(payload.id, true, this.why.read().trim(), this.ground.read()), "Removed. Its writer is told why, and whoever reported it what was decided.");
    }
    if (action === LETS_REPORTED_BE) this.change(() => this.loom.settleReport(payload.id, false, ""), "Let be. Whoever reported it is told.");
    if (action === SETS_MODERATOR) this.change(() => this.loom.adminSetModerator(payload.id, payload.moderates), payload.moderates ? "They moderate what is reported now." : "They don't moderate now.");
    if (action === SEES_AS) this.seeAs(payload.id, payload.name);
    if (action === SETS_PLAN) this.change(() => this.loom.adminSetPlan(payload.id, payload.plan), payload.plan === "paid" ? "On the paid plan: they keep their own life story." : "On the free plan: they see and comment.");
    if (action === SETS_REQUEST) this.request.update((r) => ({ ...r, [payload.part]: payload.line ?? payload.kind ?? "" }));
    if (action === LOGS_REQUEST) {
      const r = this.request.read();
      this.request.setValue({ received: today(), from_whom: "", kind: "", details: "" });
      this.change(() => this.loom.portalLogRequest(r), "Written down: it is due a month from the day it came.");
    }
    if (action === TYPES_OUTCOME) this.outcomes.update((typed) => ({ ...typed, [payload.id]: payload.line }));
    if (action === CLOSES_REQUEST) {
      const said = this.outcomes.read()[payload.id] ?? "";
      this.change(() => this.loom.portalCloseRequest(payload.id, payload.status, said), "Closed, and written down.");
    }
    if (action === FINDS_IN_LOG) this.logLine.setValue(payload.line);
    return null;
  }

  /** Opened: the door as it stands - open, a code to enter, or an authenticator to set up first. */
  async open() {
    this.problem.setValue("");
    const state = await this.loom.portalState();
    if (this.disposed) return;
    if (!state.ok) { this.door.setValue("refused"); this.problem.setValue(state.error); return; }
    this.isAdmin.setValue(!!state.data.admin);
    if (!state.data.admin) this.part.setValue("moderation");
    if (state.data.open) { this.door.setValue("open"); this.load(); return; }
    // their sign-in's authenticator: set up already (here, or for the platform's own portal), or set up now
    const listed = await this.loom.authenticators();
    if (this.disposed) return;
    const factors = listed.ok ? listed.data ?? [] : [];
    const verified = factors.find((f) => f.status === "verified");
    if (verified) { this.factor = verified.id; this.door.setValue("code"); return; }
    // one set up before and never finished is taken off, and set up afresh
    for (const left of factors) await this.loom.removeAuthenticator(left.id);
    const made = await this.loom.enrolAuthenticator(`Tapestry ${new Date().toISOString().slice(0, 16)}`);
    if (this.disposed) return;
    if (!made.ok) { this.door.setValue("refused"); this.problem.setValue(made.error); return; }
    this.setUp.setValue({ id: made.data.id, secret: made.data.totp?.secret ?? "", picture: made.data.totp?.picture ?? "" });
    this.door.setValue("setting");
  }

  /** Their code: given to the platform's sign-in, then the portal opened for an hour. */
  async openWith(code) {
    this.busy.setValue(true);
    this.problem.setValue("");
    const raised = await this.loom.verifyAuthenticator(this.setUp.read()?.id ?? this.factor, code);
    if (this.disposed) return;
    this.code.setValue("");
    if (!raised.ok) { this.busy.setValue(false); this.problem.setValue(raised.error); return; }
    const opened = await this.loom.portalOpen();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!opened.ok) { this.problem.setValue(opened.error); return; }
    if (this.setUp.read()) { this.factor = this.setUp.read().id; this.setUp.setValue(null); }
    this.door.setValue("open");
    this.load();
  }

  async lock() {
    await this.loom.portalClose();
    if (this.disposed) return;
    this.door.setValue("code");
    this.member.setValue(null);
  }

  /** Whatever was asked, refused because the portal closed: the door again, asking the code. */
  closedOn(answer) {
    if (answer.ok || !wantsCode(answer.error)) return false;
    this.door.setValue("code");
    this.problem.setValue("The portal closed after an hour unused: enter a code to open it again.");
    return true;
  }

  /** The part shown, fetched again - and the portal kept open another hour. */
  async load() {
    if (this.door.read() !== "open") return;
    this.problem.setValue("");
    this.loom.portalKeep();
    const part = this.part.read();
    const fetched = {
      overview: async () => {
        const [seen, server] = await Promise.all([this.loom.portalOverview(), this.loom.platformStatus()]);
        if (seen.ok) this.overview.setValue(seen.data);
        this.server.setValue(server.ok ? server.data : null);
        return seen;
      },
      members: async () => { const seen = await this.loom.portalMembers(); if (seen.ok) this.members.setValue(seen.data ?? []); return seen; },
      moderation: async () => {
        const [reports, decisions] = await Promise.all([this.loom.reportsView(), this.loom.portalDecisions()]);
        if (reports.ok) this.reports.setValue(reports.data ?? []);
        if (decisions.ok) this.decisions.setValue(decisions.data ?? []);
        return reports.ok ? decisions : reports;
      },
      requests: async () => { const seen = await this.loom.portalRequests(); if (seen.ok) this.requests.setValue(seen.data ?? []); return seen; },
      feedback: async () => { const seen = await this.loom.feedbackList(); if (seen.ok) this.feedback.setValue(seen.data ?? []); return seen; },
      invitations: async () => {
        const [seen, members] = await Promise.all([this.loom.adminView(), this.loom.portalMembers()]);
        if (seen.ok) this.view.setValue(seen.data);
        if (members.ok) this.members.setValue(members.data ?? []);
        return seen;
      },
      log: async () => { const seen = await this.loom.portalLog(); if (seen.ok) this.log.setValue(seen.data ?? []); return seen; },
    }[part];
    const answer = await fetched();
    if (this.disposed || this.closedOn(answer)) return;
    if (!answer.ok) this.problem.setValue(answer.error);
  }

  async openMember(id) {
    this.busy.setValue(true);
    const seen = await this.loom.portalMember(id);
    if (this.disposed) return;
    this.busy.setValue(false);
    if (this.closedOn(seen)) return;
    if (!seen.ok) { this.problem.setValue(seen.error); return; }
    this.member.setValue(seen.data);
  }

  /** Tapestry seen as a member - masked, unless they let support in - and their thread opened. */
  async seeAs(member, name) {
    this.busy.setValue(true);
    const seen = await this.account.seeAs(member, name);
    if (this.disposed) return;
    this.busy.setValue(false);
    if (seen) location.hash = "";
  }

  async change(work, said) {
    this.busy.setValue(true);
    this.problem.setValue("");
    const done = await work();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (this.closedOn(done)) return;
    if (!done.ok) { this.problem.setValue(done.error); return; }
    this.notice.setValue(said);
    const opened = this.member.read()?.id;
    await this.load();
    if (opened) await this.openMember(opened);
    await this.account.load();
  }

  /** The members as found and ordered. */
  shownMembers() {
    const words = this.memberLine.read().toLowerCase().split(/\s+/).filter(Boolean);
    const found = this.members.read().filter((m) => words.every((w) => `${m.name} ${m.email ?? ""}`.toLowerCase().includes(w)));
    const by = this.sort.read();
    const key = { joined: (m) => m.joined ?? "", name: (m) => (m.name ?? "").toLowerCase(), seen: (m) => m.last_seen ?? "", memories: (m) => m.memories ?? 0 }[by];
    const sorted = [...found].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
    return by === "name" ? sorted : sorted.reverse();
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

/** A row of a table: its cells, each its words. */
function cells(ui, list, style = "PortalRow") {
  return ui.row(list.map(([words, cell]) => ui.text(words, `Cell ${cell ?? ""}`).wraps()), style);
}

/** One number, said large, with what it counts under it. */
function tile(ui, number, said) {
  return ui.surface("Tile", [ui.column([ui.text(number, "TileNumber"), ui.text(said, "TileWords").wraps()])]);
}

export function describeAdmin(ui, admin, account) {
  const at = (door) => admin.door.map((d) => d === door);
  const shown = (part) => ui.bound(() => admin.door.read() === "open" && admin.part.read() === part);
  const counted = (key) => admin.overview.map((o) => String(o?.[key] ?? 0));
  const overview = ui.column([
    heading(ui, "How Tapestry is doing"),
    ui.row([
      tile(ui, counted("members"), Phrase.of("Members")),
      tile(ui, counted("active_7"), Phrase.of("Opened it in the last 7 days")),
      tile(ui, counted("active_30"), Phrase.of("In the last 30 days")),
      tile(ui, admin.overview.map((o) => `${o?.paid ?? 0} / ${o?.free ?? 0}`), Phrase.of("Paid plan / free plan")),
    ], "Tiles"),
    ui.row([
      tile(ui, counted("memories"), Phrase.of("Memories")),
      tile(ui, counted("events"), Phrase.of("Events")),
      tile(ui, counted("periods"), Phrase.of("Periods")),
      tile(ui, admin.overview.map((o) => `${o?.pictures ?? 0}`), admin.overview.map((o) => Phrase.with("Pictures, %s kept", [size(o?.picture_bytes ?? 0)]))),
    ], "Tiles"),
    ui.row([
      tile(ui, counted("reports"), Phrase.of("Reports waiting")),
      tile(ui, counted("requests_open"), admin.overview.map((o) => Phrase.with("Requests open, %s due within a week", [String(o?.requests_due ?? 0)]))),
      tile(ui, counted("feedback_open"), Phrase.of("Feedback open")),
      tile(ui, counted("purchases"), Phrase.of("Payments confirmed")),
    ], "Tiles"),
    heading(ui, "The last twelve weeks"),
    cells(ui, [[Phrase.of("Week of"), "Wide"], [Phrase.of("Joined")], [Phrase.of("Members by its end")]], "PortalRow PortalHead"),
    ui.each(admin.overview.map((o) => [...(o?.weeks ?? [])].reverse()), (week) => cells(ui, [
      [week.map((w) => when(w?.week)), "Wide"], [week.map((w) => (w?.joined ? `+${w.joined}` : "0"))], [week.map((w) => String(w?.by_then ?? 0))]]), (w) => w.week, "PortalTable"),
    heading(ui, "The server"),
    ui.row([ui.text(admin.server.map((s) => sayServer(s)), "Words").wraps().grow(), ui.button(LOOKS_AGAIN, { style: LINK })], "AddRow"),
    ui.text(Phrase.of("How the server itself is - its load, its space, every app's share - is in the platform's own portal."), "Hint").wraps(),
  ]);
  // one member's details: counts and history, never their words; and what may be done
  const member = admin.member;
  const detail = ui.when(member.map((m) => !!m), ui.surface(CARD, [ui.column([
    ui.row([ui.text(member.map((m) => m?.name ?? ""), "CardTitle").grow(), ui.button(CLOSES_MEMBER, { style: LINK })], "PersonRow"),
    ui.text(member.map((m) => [m?.email, m?.admin ? "Admin" : m?.moderator ? "Moderator" : "", m?.plan === "free" ? "Free plan" : "Paid plan"].filter(Boolean).join(" · ")), "Meta"),
    ui.text(member.map((m) => Phrase.with("Joined %s%s; last opened Tapestry %s. Agreed to the terms %s; said 14 or over %s.", [when(m?.joined),
      m?.invited_by ? `, invited by ${m.invited_by}` : "", m?.last_seen ? sayAgo(m.last_seen) : "never", m?.agreed ? when(m.agreed) : "not yet",
      m?.over_14 ? when(m.over_14) : "not yet"])), "Words").wraps(),
    ui.text(member.map((m) => Phrase.with("%s memories · %s events · %s periods · %s pictures · %s places · %s of their people (%s linked) · %s comments · %s likes",
      [m?.memories, m?.events, m?.periods, m?.pictures, m?.places, m?.people, m?.linked, m?.comments, m?.likes].map((n) => String(n ?? 0)))), "Words").wraps(),
    ui.text(member.map((m) => Phrase.with("Invited %s who joined; %s invitations waiting. %s reports made; blocked by %s. %s devices get notifications.%s",
      [String(m?.invited ?? 0), String(m?.invitations_waiting ?? 0), String(m?.reports_made ?? 0), String(m?.blocked_by ?? 0), String(m?.devices ?? 0),
        m?.support_until ? ` Lets support see their account as it is until ${when(m.support_until)}.` : ""])), "Words").wraps(),
    ui.when(member.map((m) => (m?.decisions ?? []).length > 0), ui.column([
      ui.text(Phrase.of("Decisions on what was theirs"), "FieldName"),
      ui.each(member.map((m) => (m?.decisions ?? []).map((d, i) => ({ ...d, key: `${d.at}-${i}` }))), (d) => ui.text(d.map((x) => Phrase.with("%s: %s %s - %s",
        [when(x?.at), x?.kind ?? "", x?.removed ? (x.ground === "law" ? "removed as illegal" : "removed, breaking the terms") : "let be", x?.why ?? ""])), "Meta").wraps(), (d) => d.key, "List"),
    ])),
    ui.when(member.map((m) => (m?.log ?? []).length > 0), ui.column([
      ui.text(Phrase.of("Done and seen of theirs"), "FieldName"),
      ui.each(member.map((m) => (m?.log ?? []).slice(0, 20).map((l, i) => ({ ...l, key: `${l.at}-${i}` }))), (l) => ui.text(l.map((x) => Phrase.with("%s %s, %s",
        [x?.by ?? "", Phrase.of(DONE[x?.what] ?? x?.what ?? ""), sayAgo(x?.at)])), "Meta").wraps(), (l) => l.key, "List"),
    ])),
    ui.when(member.map((m) => !m?.you && m?.id !== account.weave.read().meId), ui.column([
      ui.row([
        ui.pressable(SETS_PLAN, member.map((m) => ({ id: m?.id ?? "", plan: m?.plan === "free" ? "paid" : "free" })),
          [ui.text(member.map((m) => Phrase.of(m?.plan === "free" ? "Put on the paid plan" : "Put on the free plan")), "Small")], LINK),
        ui.pressable(SEES_AS, member.map((m) => ({ id: m?.id ?? "", name: m?.name ?? "" })), [ui.text(ui.words(SEES_AS), "Small")], LINK),
        ui.when(member.map((m) => !m?.admin), ui.pressable(SETS_MODERATOR, member.map((m) => ({ id: m?.id ?? "", moderates: !m?.moderator })),
          [ui.text(member.map((m) => Phrase.of(m?.moderator ? "Not a moderator" : "Make a moderator")), "Small")], LINK)),
        ui.when(member.map((m) => !!m?.admin),
          ui.pressable(UNMAKES_ADMIN, member.map((m) => ({ id: m?.id ?? "" })), [ui.text(ui.words(UNMAKES_ADMIN), "Small")], LINK),
          ui.pressable(MAKES_ADMIN, member.map((m) => ({ id: m?.id ?? "" })), [ui.text(ui.words(MAKES_ADMIN), "Small")], LINK)),
        ui.when(ui.bound(() => !member.read()?.admin && admin.removingMember.read() !== member.read()?.id),
          ui.pressable(ASKS_TO_REMOVE_MEMBER, member.map((m) => ({ id: m?.id ?? "" })), [ui.text(ui.words(ASKS_TO_REMOVE_MEMBER), "Small")], DANGER)),
      ], "Actions PortalActions"),
      ui.when(ui.bound(() => admin.removingMember.read() === member.read()?.id), ui.column([
        ui.text(member.map((m) => Phrase.with("Remove %s from Tapestry? Everything they made goes, for good, and their sign-in; to others they become a name again. They come back only by a new invitation.", [m?.name ?? ""])), "Warn").wraps(),
        ui.row([
          ui.pressable(REMOVES_MEMBER, member.map((m) => ({ id: m?.id ?? "" })), [ui.text(ui.words(REMOVES_MEMBER), "Small")], DANGER),
          ui.pressable(KEEPS_MEMBER, {}, [ui.text(ui.words(KEEPS_MEMBER), "Small")], LINK),
        ], "Actions"),
      ])),
    ])),
    ui.text(Phrase.of("Opening someone's details is written down, and they see in You that you did."), "Hint").wraps(),
  ], "Part")]));
  const members = ui.column([
    heading(ui, "Members"),
    detail,
    ui.row([
      ui.field(FINDS_MEMBER, "", { changes: FINDS_MEMBER, shows: admin.memberLine, label: Phrase.of("Find a member by name or email") }).grow(),
    ], "AddRow"),
    ui.row(SORTS.map(([by, said]) => ui.pressable(SORTS_MEMBERS, { by }, [ui.text(Phrase.of(said), "Small")], "Segment").currentWhile(admin.sort.map((s) => s === by))), "Segments"),
    cells(ui, [[Phrase.of("Name"), "Wide"], [Phrase.of("Email"), "Wide"], [Phrase.of("Joined")], [Phrase.of("Last opened")], [Phrase.of("Plan")],
      [Phrase.of("Memories")], [Phrase.of("Pictures")], [Phrase.of("Role")]], "PortalRow PortalHead"),
    ui.each(ui.bound(() => admin.shownMembers()), (m) => ui.pressable(OPENS_MEMBER, m.map((x) => ({ id: x?.id ?? "" })), [cells(ui, [
      [m.map((x) => x?.name ?? ""), "Wide"], [m.map((x) => x?.email ?? ""), "Wide"], [m.map((x) => when(x?.joined))], [m.map((x) => (x?.last_seen ? sayAgo(x.last_seen) : "never"))],
      [m.map((x) => (x?.plan === "free" ? "Free" : "Paid"))], [m.map((x) => String(x?.memories ?? 0))],
      [m.map((x) => `${x?.pictures ?? 0} · ${size(x?.bytes ?? 0)}`)], [m.map((x) => (x?.admin ? "Admin" : x?.moderator ? "Moderator" : ""))]], "PortalRow")], "PortalPick"),
    (m) => m.id, "PortalTable"),
    ui.text(ui.bound(() => Phrase.with("%s of %s", [String(admin.shownMembers().length), String(admin.members.read().length)])), "Hint"),
  ]);
  const moderation = ui.column([
    heading(ui, "Reported"),
    ui.when(admin.reports.map((l) => l.length === 0), ui.text(Phrase.of("Nothing reported."), "Quiet")),
    ui.each(admin.reports, (held) => ui.surface(CARD, [ui.column([
      ui.text(held.map((r) => Phrase.with(REPORTED[r?.kind] ?? REPORTED.memory, [r?.reporter ?? "", r?.owner ?? ""])), "Words").wraps(),
      ui.text(held.map((r) => r?.title ?? ""), "CardTitle").wraps().hidesEmpty(),
      ui.text(held.map((r) => r?.words ?? ""), "Words Body").wraps().hidesEmpty(),
      ui.eachAcross(held.map((r) => r?.pictures ?? []), (pic) => ui.image(pic.map((p) => (p ? account.address(p.thumb || p.path) : "")), "Thumb",
        pic.map((p) => p?.caption || Phrase.of("A picture"))), (p) => p.id, "Thumbs"),
      ui.text(held.map((r) => (r?.reason ? Phrase.with("Why: %s", [r.reason]) : "")), "Meta").wraps().hidesEmpty(),
      ui.text(held.map((r) => when(r?.created_at)), "Meta"),
      ui.when(ui.bound(() => admin.removing.read() === held.read()?.id), ui.column([
        ui.text(Phrase.of("Why is it removed? Its writer is told, and whoever reported it: which rule of the terms, or which law, it broke, and what about it does."), "Hint").wraps(),
        ui.row([["terms", "It breaks the terms"], ["law", "It is illegal"]].map(([ground, said]) => ui.pressable(SAYS_WHAT_IT_BROKE, { ground },
          [ui.text(Phrase.of(said), "Small")], "Segment").currentWhile(admin.ground.map((g) => g === ground))), "Segments"),
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
    heading(ui, "Every decision"),
    ui.text(Phrase.of("Kept as long as the account each was about: what, why it was reported, what was decided and why, and by whom."), "Hint").wraps(),
    ui.when(admin.decisions.map((l) => l.length === 0), ui.text(Phrase.of("None yet."), "Quiet")),
    cells(ui, [[Phrase.of("When")], [Phrase.of("What")], [Phrase.of("Whose")], [Phrase.of("Decided")], [Phrase.of("Why"), "Wide"], [Phrase.of("By")]], "PortalRow PortalHead"),
    ui.each(admin.decisions.map((l) => l.map((d, i) => ({ ...d, key: `${d.at}-${i}` }))), (d) => cells(ui, [
      [d.map((x) => when(x?.at))], [d.map((x) => `${x?.kind ?? ""}: ${x?.about ?? ""}`)], [d.map((x) => x?.owner ?? "")],
      [d.map((x) => (x?.removed ? (x.ground === "law" ? "Removed: illegal" : "Removed: the terms") : "Let be"))], [d.map((x) => x?.why || x?.reason || ""), "Wide"],
      [d.map((x) => x?.by ?? "")]]), (d) => d.key, "PortalTable"),
  ]);
  const typed = (part) => admin.request.map((r) => r[part] ?? "");
  const requests = ui.column([
    heading(ui, "Requests"),
    ui.text(Phrase.of("What anyone asks of their data by email - to see it, delete it, correct it, object - and notices of what is on Tapestry. Each must be answered within a month of the day it came."), "Hint").wraps(),
    ui.surface(CARD, [ui.column([
      ui.text(Phrase.of("A new one"), "FieldName"),
      ui.row([
        ui.field(SETS_REQUEST, "", { changes: SETS_REQUEST, shows: typed("received"), kind: "date", label: Phrase.of("The day it came"), carries: (line) => ({ part: "received", line }) }),
        ui.field(SETS_REQUEST, "", { changes: SETS_REQUEST, shows: typed("from_whom"), label: Phrase.of("Who it is from"), placeholder: Phrase.of("e.g. Jo Bloggs, jo@example.com"),
          carries: (line) => ({ part: "from_whom", line }) }).grow(),
      ], "AddRow"),
      ui.text(Phrase.of("What they ask"), "FieldName"),
      ui.row(REQUEST_KINDS.map(([kind, said]) => ui.pressable(SETS_REQUEST, { part: "kind", kind }, [ui.text(Phrase.of(said), "Small")], "Segment")
        .currentWhile(typed("kind").map((k) => k === kind))), "Segments"),
      ui.text(Phrase.of("What they say, and anything that finds what it is about"), "FieldName"),
      ui.area(SETS_REQUEST, typed("details"), "TextArea", { carries: (line) => ({ part: "details", line }) }),
      ui.row([ui.button(LOGS_REQUEST)], "Actions"),
    ], "Part")]),
    ui.when(admin.requests.map((l) => l.length === 0), ui.text(Phrase.of("None yet."), "Quiet")),
    ui.each(admin.requests, (r) => ui.surface(CARD, [ui.column([
      ui.row([
        ui.text(r.map((x) => `${x?.from_whom ?? ""} - ${(REQUEST_KINDS.find(([k]) => k === x?.kind) ?? ["", x?.kind ?? ""])[1]}`), "CardTitle").grow(),
        ui.text(r.map((x) => (x?.status === "open" ? (x.due < today() ? Phrase.with("OVERDUE: was due %s", [when(x.due)]) : Phrase.with("Due %s", [when(x?.due)]))
          : Phrase.with("%s %s", [x?.status === "done" ? "Done" : "Refused", when(x?.closed_at)]))), "Meta"),
      ], "PersonRow"),
      ui.text(r.map((x) => Phrase.with("Came %s", [when(x?.received)])), "Meta"),
      ui.text(r.map((x) => x?.details ?? ""), "Words").wraps().hidesEmpty(),
      ui.text(r.map((x) => x?.outcome ?? ""), "Words").wraps().hidesEmpty(),
      ui.when(r.map((x) => x?.status === "open"), ui.column([
        ui.area(TYPES_OUTCOME, ui.bound(() => admin.outcomes.read()[r.read()?.id] ?? ""), "TextArea", { carries: (line) => ({ id: r.read()?.id ?? "", line }) }),
        ui.row([
          ui.pressable(CLOSES_REQUEST, r.map((x) => ({ id: x?.id ?? "", status: "done" })), [ui.text(Phrase.of("Done"), "Small")], "FactoryAction"),
          ui.pressable(CLOSES_REQUEST, r.map((x) => ({ id: x?.id ?? "", status: "refused" })), [ui.text(Phrase.of("Refused"), "Small")], LINK),
        ], "Actions"),
      ])),
    ], "Part")]), (x) => x.id, "List"),
  ]);
  const STATUS = { open: "Open", planned: "Planned", done: "Done", declined: "Not doing" };
  const feedback = ui.column([
    heading(ui, "Feedback"),
    ui.text(Phrase.of("What members suggest, and what they find wrong. Reply, and say where each stands, in Feedback."), "Hint").wraps(),
    ui.row([ui.pressable("goes_to_feedback", {}, [ui.text(Phrase.of("Open Feedback"), "Small")], LINK).goesTo("feedback")], "Actions"),
    cells(ui, [[Phrase.of("Stands")], [Phrase.of("Kind")], [Phrase.of("From")], [Phrase.of("What"), "Wide"], [Phrase.of("Replies")], [Phrase.of("Last")]], "PortalRow PortalHead"),
    ui.each(admin.feedback.map((l) => [...l].sort((a, b) => (a.status === b.status ? String(b.updated_at ?? b.created_at).localeCompare(String(a.updated_at ?? a.created_at))
      : Object.keys(STATUS).indexOf(a.status) - Object.keys(STATUS).indexOf(b.status)))), (f) => cells(ui, [
      [f.map((x) => STATUS[x?.status] ?? x?.status ?? "")], [f.map((x) => (x?.kind === "defect" ? "Wrong" : "Idea"))], [f.map((x) => x?.author_name ?? "")],
      [f.map((x) => String(x?.body ?? "").split("\n")[0]), "Wide"], [f.map((x) => String((x?.replies ?? []).length))], [f.map((x) => sayAgo(x?.updated_at ?? x?.created_at))]]),
    (f) => f.id, "PortalTable"),
  ]);
  const invitations = admin.view.map((v) => v.invitations ?? []);
  const invites = ui.column([
    heading(ui, "Invitations waiting"),
    ui.when(invitations.map((l) => l.length === 0), ui.text(Phrase.of("None waiting."), "Quiet")),
    ui.each(invitations, (held) => cells(ui, [[held.map((i) => Phrase.with("%s invited %s", [i?.from ?? "", i?.for ?? ""])), "Wide"],
      [held.map((i) => (i?.expired ? Phrase.of("Run out") : Phrase.with("Runs out %s", [when(i?.expires_at)])))]]), (i) => i.token, "PortalTable"),
    ui.each(invitations, (held) => ui.pressable(CANCELS_INVITE, held.map((i) => ({ token: i?.token ?? "" })),
      [ui.text(held.map((i) => Phrase.with("Cancel %s's invitation of %s", [i?.from ?? "", i?.for ?? ""])), "Small")], LINK), (i) => i.token, "PortalActions"),
    heading(ui, "Who invited whom"),
    ui.each(admin.members.map((l) => l.filter((m) => m.invited_by)), (m) => cells(ui, [[m.map((x) => Phrase.with("%s invited %s", [x?.invited_by ?? "", x?.name ?? ""])), "Wide"],
      [m.map((x) => Phrase.with("Joined %s", [when(x?.joined)]))]]), (m) => m.id, "PortalTable"),
    heading(ui, "Inviting someone"),
    ...HOW_TO_INVITE.map((step) => ui.text(Phrase.of(step), "Hint").wraps()),
  ]);
  const logShown = ui.bound(() => {
    const words = admin.logLine.read().toLowerCase().split(/\s+/).filter(Boolean);
    return admin.log.read().map((l, i) => ({ ...l, key: `${l.at}-${i}` }))
      .filter((l) => words.every((w) => `${l.by ?? ""} ${DONE[l.what] ?? l.what} ${l.member ?? ""} ${l.note ?? ""}`.toLowerCase().includes(w)));
  });
  const log = ui.column([
    heading(ui, "What was done"),
    ui.text(Phrase.of("Everything done and seen in the portal, and by support and moderators: who, what, of whose, when. Nothing here can be changed or taken back."), "Hint").wraps(),
    ui.field(FINDS_IN_LOG, "", { changes: FINDS_IN_LOG, shows: admin.logLine, label: Phrase.of("Find by who, what, or whose") }),
    cells(ui, [[Phrase.of("When")], [Phrase.of("Who")], [Phrase.of("Did"), "Wide"], [Phrase.of("Whose")]], "PortalRow PortalHead"),
    ui.each(logShown, (l) => cells(ui, [[l.map((x) => new Date(x?.at ?? 0).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))],
      [l.map((x) => x?.by ?? "")], [l.map((x) => [DONE[x?.what] ?? x?.what ?? "", x?.note].filter(Boolean).join(" · ")), "Wide"],
      [l.map((x) => x?.member ?? "")]]), (l) => l.key, "PortalTable"),
  ]);
  return ui.screen(ADMIN, [ui.column([
    // the door: the code set up the first time, then asked each time it is opened
    ui.when(ui.bound(() => admin.door.read() !== "open"), ui.column([
      ui.text(Phrase.of("The admin portal"), "Title"),
      ui.when(at("checking"), ui.text(Phrase.of("Opening…"), "Quiet")),
      ui.when(at("setting"), ui.column([
        ui.text(Phrase.of("The portal asks for a code from an authenticator app on your phone as well as your Google sign-in, so a stolen sign-in alone can't open it. Set it up once:"), "Words").wraps(),
        ui.text(Phrase.of("1. On your phone, open an authenticator app - Google Authenticator, Microsoft Authenticator, 1Password - and add an account by scanning a QR code."), "Hint").wraps(),
        ui.image(admin.setUp.map((s) => s?.picture ?? ""), "PortalCode", Phrase.of("The code to scan")),
        ui.text(admin.setUp.map((s) => Phrase.with("Or type this setup key: %s", [String(s?.secret ?? "").replace(/(.{4})/g, "$1 ").trim()])), "Meta PortalKey").wraps(),
        ui.text(Phrase.of("2. Enter the six digits it shows. Keep the app: you'll need it each time. It is your sign-in's own code - the platform's own admin portal asks for the same one. If you lose your phone, it is reset on the server."), "Hint").wraps(),
      ], "Part")),
      ui.when(ui.bound(() => admin.door.read() === "setting" || admin.door.read() === "code"), ui.row([
        ui.field(OPENS_PORTAL, "", { changes: TYPES_CODE, shows: admin.code, kind: "text", autocomplete: "one-time-code", label: Phrase.of("The code from your authenticator app"),
          placeholder: Phrase.of("123456") }).grow(),
        ui.button(OPENS_PORTAL),
      ], "AddRow")),
      ui.when(at("code"), ui.text(Phrase.of("The portal closes after an hour unused, and asks again."), "Hint").wraps()),
      problem(ui, admin.problem),
    ], "PortalDoor")),
    // open: its parts down the side, the one chosen beside them
    ui.when(at("open"), ui.row([
      ui.column([
        ui.text(Phrase.of("Admin portal"), "PortalName"),
        ...PARTS.map(([part, said, adminsOnly]) => ui.when(ui.bound(() => !adminsOnly || admin.isAdmin.read()),
          ui.pressable(SHOWS_PART, { part }, [ui.text(Phrase.of(said), "Small")], "PortalNav").currentWhile(admin.part.map((p) => p === part)))),
        ui.pressable(LOCKS_PORTAL, {}, [ui.text(ui.words(LOCKS_PORTAL), "Small")], "PortalNav PortalLock"),
        ui.pressable("goes_to_my_thread", {}, [ui.text(Phrase.of("Back to Tapestry"), "Small")], "PortalNav").goesTo("thread"),
      ], "PortalSide"),
      ui.column([
        problem(ui, admin.problem),
        notice(ui, admin.notice),
        ui.when(shown("overview"), overview),
        ui.when(shown("members"), members),
        ui.when(shown("moderation"), moderation),
        ui.when(shown("requests"), requests),
        ui.when(shown("feedback"), feedback),
        ui.when(shown("invitations"), invites),
        ui.when(shown("log"), log),
      ], "PortalMain").grow(),
    ], "PortalOpen")),
  ], "PortalShell")], null, { on_fill: () => admin.open() });
}
