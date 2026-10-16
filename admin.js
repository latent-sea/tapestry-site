// The admin area: running Tapestry, not reading it (backend.sql, "the admin
// area"). An admin sees who has joined - their Google email, when, by whose
// invitation - and every invitation waiting; removes someone from Tapestry,
// cancels an invitation, makes another admin; and sees whether the server is
// on the latest version. The founder is the first admin. An admin sees no
// one's memories, events or periods but as anyone would.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=40368bf32934";
import { heading, notice, problem } from "./parts.js?v=40368bf32934";
import { CARD, DANGER, LINK } from "./look/look.js?v=40368bf32934";
import { HOW_TO_INVITE } from "./people.js?v=40368bf32934";

export const ADMIN = "admin";

export const ASKS_TO_REMOVE_MEMBER = "asks_before_removing_from_tapestry";
export const REMOVES_MEMBER = "removes_from_tapestry";
export const KEEPS_MEMBER = "keeps_on_tapestry";
export const CANCELS_INVITE = "cancels_the_invitation";
export const MAKES_ADMIN = "makes_them_an_admin";
export const UNMAKES_ADMIN = "makes_them_not_an_admin";
export const LOOKS_AGAIN = "looks_again";

export const WORDS = {
  [ASKS_TO_REMOVE_MEMBER]: ["Remove from Tapestry"],
  [REMOVES_MEMBER]: ["Yes, remove them"],
  [KEEPS_MEMBER]: ["No, keep them"],
  [CANCELS_INVITE]: ["Cancel it"],
  [MAKES_ADMIN]: ["Make an admin"],
  [UNMAKES_ADMIN]: ["Not an admin"],
  [LOOKS_AGAIN]: ["Look again"],
};

const when = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "");

export class Admin extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.view = this.value({ members: [], invitations: [] });
    this.server = this.value(null);
    this.removing = this.value(""); // the member being asked about before they are removed
    this.busy = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
  }

  answers() { return Object.keys(WORDS); }

  would(action) {
    if (this.busy.read()) return Phrase.of("Working");
    return null;
  }

  told(action, payload) {
    this.notice.setValue("");
    if (action === ASKS_TO_REMOVE_MEMBER) this.removing.setValue(payload.id);
    if (action === KEEPS_MEMBER) this.removing.setValue("");
    if (action === REMOVES_MEMBER) {
      this.removing.setValue("");
      this.change(() => this.loom.adminRemove(payload.id), "Removed from Tapestry. To others they are a name again.");
    }
    if (action === CANCELS_INVITE) this.change(() => this.loom.adminCancelInvite(payload.token), "Cancelled: that link lets no one in now.");
    if (action === MAKES_ADMIN) this.change(() => this.loom.adminSet(payload.id, true), "They are an admin now.");
    if (action === UNMAKES_ADMIN) this.change(() => this.loom.adminSet(payload.id, false), "They are not an admin now.");
    if (action === LOOKS_AGAIN) this.open();
    return null;
  }

  /** Who is on Tapestry, the invitations, and how the server is. */
  async open() {
    this.problem.setValue("");
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

export function describeAdmin(ui, admin) {
  const members = admin.view.map((v) => v.members ?? []);
  const invitations = admin.view.map((v) => v.invitations ?? []);
  return ui.screen(ADMIN, [
    ui.text(Phrase.of("Admin"), "Title"),
    ui.text(Phrase.of("Running Tapestry. You see who is on it and the invitations waiting - never anyone's memories but as they share them with you."), "Hint").wraps(),
    problem(ui, admin.problem),
    notice(ui, admin.notice),
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
      ui.text(held.map((m) => (m?.invited_by ? Phrase.with("Joined %s, invited by %s", [when(m.joined), m.invited_by])
        : Phrase.with("Joined %s", [when(m?.joined)]))), "Meta"),
      ui.when(held.map((m) => !m?.you), ui.column([
        ui.when(ui.bound(() => admin.removing.read() === held.read()?.id), ui.column([
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
  ], null, { on_fill: () => admin.open() });
}
