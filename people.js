// The member's people and circles, and invitations both ways.
//
// A person is a name in the member's own list, tagged and searched by. To
// link a name to someone's own account, the member sends them an
// invitation link (#join/<token>); opening it, they sign in and accept - or,
// for someone already on Tapestry, asks them inside it (asking.js). Linked,
// from then on each is among the other's people: what either shares with
// "all my people" reaches the other, and an event either tags the other at
// is on both threads. Circles are the member's own groups of people, to let
// in or keep out at once.

import { Controller, Phrase, Themes } from "./gd_chime/gd_chime.js?v=627a8c37f81e";
import { heading, mark, notice, problem } from "./parts.js?v=627a8c37f81e";
import { CARD, DANGER, LINK } from "./look/look.js?v=627a8c37f81e";
import { describeIsThisYou } from "./asking.js?v=627a8c37f81e";

export const PEOPLE = "people";
export const PERSON = "person";
export const JOIN = "join";

export const SETS_NEW_PERSON = "sets_a_new_persons_name";
export const ADDS_PERSON = "adds_a_person";
export const OPENS_PERSON = "opens_a_person";
export const INVITES = "invites_them";
export const COPIES_LINK = "copies_the_invitation";
export const UNLINKS = "unlinks_them";
export const SETS_RENAME = "sets_their_name";
export const RENAMES = "renames_them";
export const REMOVES_PERSON = "removes_them";
export const SETS_CIRCLE_NAME = "sets_a_new_circles_name";
export const ADDS_CIRCLE = "adds_a_circle";
export const TOGGLES_IN_CIRCLE = "puts_them_in_or_out_of_a_circle";
export const REMOVES_CIRCLE = "removes_a_circle";
export const ACCEPTS = "accepts_the_invitation";
export const ASKS_TO_REMOVE = "asks_before_removing";
export const KEEPS = "keeps_them";

export const WORDS = {
  [SETS_NEW_PERSON]: ["Name"],
  [ADDS_PERSON]: ["Add"],
  [OPENS_PERSON]: ["Open"],
  [INVITES]: ["Invite them to link their thread"],
  [COPIES_LINK]: ["Send the link"],
  [UNLINKS]: ["Unlink their account"],
  [SETS_RENAME]: ["Their name"],
  [RENAMES]: ["Save the name"],
  [REMOVES_PERSON]: ["Remove them from your people"],
  [SETS_CIRCLE_NAME]: ["Circle name"],
  [ADDS_CIRCLE]: ["Add a circle"],
  [TOGGLES_IN_CIRCLE]: ["In this circle"],
  [REMOVES_CIRCLE]: ["Remove the circle"],
  [ACCEPTS]: ["Link our threads"],
  [ASKS_TO_REMOVE]: ["Remove"],
  [KEEPS]: ["No, keep"],
};

export class People extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.newName = this.value("");
    this.circleName = this.value("");
    this.rename = this.value("");
    this.link = this.value({ person: "", address: "" }); // the invitation shown, for one person
    this.invitation = this.value(null); // the one being opened: { token, from, expired } once found, or null
    this.asking = this.value(""); // what is asked about before it is removed: "person:<id>" or "circle:<id>"
    this.busy = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
  }

  weave() { return this.account.weave.read(); }

  answers() { return Object.keys(WORDS); }

  /** Signed out: nothing of the last member's stays for the next. */
  reset() {
    this.newName.setValue("");
    this.circleName.setValue("");
    this.rename.setValue("");
    this.link.setValue({ person: "", address: "" });
    this.invitation.setValue(null);
    this.asking.setValue("");
    this.problem.setValue("");
    this.notice.setValue("");
  }

  would(action, payload) {
    if (action !== SETS_NEW_PERSON && action !== SETS_CIRCLE_NAME && action !== SETS_RENAME && action !== OPENS_PERSON && this.busy.read()) return Phrase.of("Saving");
    if (action === ADDS_PERSON && !this.newName.read().trim()) return Phrase.of("Type their name first");
    if (action === ADDS_CIRCLE && !this.circleName.read().trim()) return Phrase.of("Name the circle first");
    if (action === RENAMES && !this.rename.read().trim()) return Phrase.of("A name can't be empty");
    if (action === INVITES && this.weave().people.get(payload?.id)?.account) return Phrase.of("Already linked");
    if (action === UNLINKS && !this.weave().people.get(payload?.id)?.account) return Phrase.of("Not linked");
    if (action === ACCEPTS) {
      const invitation = this.invitation.read();
      if (!invitation?.from) return Phrase.of("No such invitation");
      if (invitation.expired) return Phrase.of("This invitation has run out. Ask for a new one.");
    }
    return null;
  }

  told(action, payload) {
    this.notice.setValue("");
    this.problem.setValue("");
    if (action === SETS_NEW_PERSON) this.newName.setValue(payload.line);
    if (action === SETS_CIRCLE_NAME) this.circleName.setValue(payload.line);
    if (action === SETS_RENAME) this.rename.setValue(payload.line);
    if (action === OPENS_PERSON) this.open(payload.parameter);
    if (action === ADDS_PERSON) this.change(() => this.loom.addPerson(this.newName.read()), () => { this.newName.setValue(""); return "Added"; });
    if (action === RENAMES) this.change(() => this.loom.renamePerson(payload.id, this.rename.read()), () => "Name saved");
    if (action === ASKS_TO_REMOVE) this.asking.setValue(payload.key);
    if (action === KEEPS) this.asking.setValue("");
    if (action === REMOVES_PERSON || action === REMOVES_CIRCLE) this.asking.setValue("");
    if (action === REMOVES_PERSON) this.change(() => this.loom.deletePerson(payload.id), () => "Removed from your people");
    if (action === UNLINKS) this.change(() => this.loom.unlink(payload.id), () => "Unlinked: they are a name again, and see nothing more of yours");
    if (action === INVITES) this.invite(payload.id);
    if (action === COPIES_LINK) this.send(this.link.read().address);
    if (action === ADDS_CIRCLE) {
      this.change(() => this.loom.saveCircle({ name: this.circleName.read().trim(), people: [] }), () => { this.circleName.setValue(""); return "Circle added"; });
    }
    if (action === TOGGLES_IN_CIRCLE) {
      const circle = this.weave().circles.get(payload.circle);
      const people = circle.people.includes(payload.person) ? circle.people.filter((p) => p !== payload.person) : [...circle.people, payload.person];
      this.change(() => this.loom.saveCircle({ id: circle.id, name: circle.name, people }), () => "");
    }
    if (action === REMOVES_CIRCLE) this.change(() => this.loom.deleteCircle(payload.id), () => "Circle removed");
    if (action === ACCEPTS) this.accept();
    return null;
  }

  /** A person's page opened: their name ready to change, no invitation shown yet. */
  open(personId) {
    this.asking.setValue("");
    this.rename.setValue(this.weave().people.get(personId)?.name ?? "");
    const invite = this.weave().people.get(personId)?.invite;
    this.link.setValue({ person: personId, address: invite ? linkTo(invite.token) : "" });
  }

  /** An invitation link handed on: through the phone's own share sheet where there is one, else copied to paste anywhere. */
  async send(address) {
    const said = { title: "Tapestry", text: `${this.weave().me?.name ?? "Someone"} invites you to link your threads on Tapestry`, url: address };
    if (navigator.share) {
      try { await navigator.share(said); return; } catch (error) { if (error?.name === "AbortError") return; }
    }
    try {
      await navigator.clipboard.writeText(address);
      this.notice.setValue("Copied. Paste it into a message to them.");
    } catch {
      this.notice.setValue("Copy the link above and send it to them.");
    }
  }

  async invite(personId) {
    const made = await this.loom.invite(personId);
    if (!made.ok) { this.problem.setValue(made.error); return; }
    this.link.setValue({ person: personId, address: linkTo(made.data) });
    this.notice.setValue("Send them this link. It works once, for 30 days.");
    this.account.load();
  }

  /** An invitation being opened: who it is from. */
  async look(token) {
    this.invitation.setValue(null);
    const found = await this.loom.invitation(token);
    if (this.disposed) return;
    this.invitation.setValue(found.ok && found.data ? { token, ...found.data } : { token, from: "", expired: false });
  }

  async accept() {
    const token = this.invitation.read().token;
    this.busy.setValue(true);
    const accepted = await this.loom.acceptInvite(token);
    await this.account.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!accepted.ok) { this.problem.setValue(accepted.error); return; }
    this.invitation.setValue({ token, from: accepted.data, expired: false, accepted: true });
    this.notice.setValue(`Linked. You and ${accepted.data} are now among each other's people.`);
  }

  async change(work, said) {
    this.busy.setValue(true);
    const done = await work();
    await this.account.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!done.ok) { this.problem.setValue(done.error); return; }
    const words = said();
    if (words) this.notice.setValue(words);
  }
}

/** The address an invitation opens at. */
export function linkTo(token) { return `${location.origin}${location.pathname}#join/${token}`; }

/** The member's people and circles. */
export function describePeople(ui, people, account) {
  const list = account.weave.map((w) => w.data.people);
  const circles = account.weave.map((w) => w.data.circles);
  return ui.screen(PEOPLE, [
    ui.text(Phrase.of("Your people"), "Title"),
    ui.text(Phrase.of("Anyone you tag or want to find things by. Invite someone to link their own thread: then your threads cross wherever you tag each other."), "Hint").wraps(),
    ui.row([
      ui.field(ADDS_PERSON, "", { changes: SETS_NEW_PERSON, shows: people.newName, placeholder: Phrase.of("Someone's name") }).grow(),
      ui.button(ADDS_PERSON),
    ], "AddRow"),
    problem(ui, people.problem),
    notice(ui, people.notice),
    ui.when(list.map((l) => l.length === 0), ui.text(Phrase.of("No one yet."), "Quiet")),
    ui.each(list, (held) => ui.pressable(OPENS_PERSON, held.map((p) => ({ parameter: p?.id ?? "" })), [ui.row([
      mark(ui, held.map((p) => (p?.account ? account.weave.read().colourOf(p.account) : "#c9c2b6"))),
      ui.text(held.map((p) => p?.name ?? ""), "PersonName").grow(),
      ui.text(held.map((p) => Phrase.of(p?.account ? "On Tapestry" : p?.invite ? "Invited" : "A name")), "Quiet"),
    ], "PersonRow")], `${CARD} ListItem`).goesTo(PERSON), (p) => p.id, "List"),
    heading(ui, "Circles"),
    ui.text(Phrase.of("Groups of your people - Family, Old friends - to let in or keep out at once. Put people in a circle from their own page."), "Hint").wraps(),
    ui.row([
      ui.field(ADDS_CIRCLE, "", { changes: SETS_CIRCLE_NAME, shows: people.circleName, placeholder: Phrase.of("A circle's name") }).grow(),
      ui.button(ADDS_CIRCLE),
    ], "AddRow"),
    ui.each(circles, (held) => ui.surface("Card", [ui.row([
      ui.column([
        ui.text(held.map((c) => c?.name ?? ""), "PersonName"),
        ui.text(ui.bound(() => {
          const circle = held.read();
          const weave = account.weave.read();
          const names = (circle?.people ?? []).map((id) => weave.people.get(id)?.name).filter(Boolean);
          return names.length ? names.join(", ") : Phrase.of("No one in it yet");
        }), "Quiet").wraps(),
      ]).grow(),
      ui.when(ui.bound(() => people.asking.read() === `circle:${held.read()?.id}`),
        ui.row([
          ui.pressable(REMOVES_CIRCLE, held.map((c) => ({ id: c?.id ?? "" })), [ui.text(Phrase.of("Yes, remove it"), "Small")], DANGER),
          ui.pressable(KEEPS, {}, [ui.text(Phrase.of("No, keep"), "Small")], LINK),
        ], "Actions"),
        ui.pressable(ASKS_TO_REMOVE, held.map((c) => ({ key: `circle:${c?.id ?? ""}` })), [ui.text(Phrase.of("Remove"), "Small")], LINK)),
    ])]), (c) => c.id, "List"),
  ]);
}

/** One of the member's people: who they are to Tapestry, their circles, and everything with them. */
export function describePerson(ui, people, account, timeline, asking) {
  const personId = ui.parameter(PERSON);
  const person = ui.bound(() => account.weave.read().people.get(personId.read()) ?? null);
  const linked = person.map((p) => !!p?.account);
  const circles = account.weave.map((w) => w.data.circles);
  const about = ui.bound(() => account.weave.read().aboutPerson(personId.read()));
  const showsLink = ui.bound(() => people.link.read().person === personId.read() && people.link.read().address !== "");
  return ui.screen(PERSON, [
    ui.when(person, ui.column([
      ui.row([mark(ui, person.map((p) => (p?.account ? account.weave.read().colourOf(p.account) : "#c9c2b6")), "BigDot"), ui.text(person.map((p) => p?.name ?? ""), "Title")]),
      ui.when(linked,
        ui.text(person.map((p) => Phrase.with("On Tapestry as %s. You are among each other's people.", [account.weave.read().data.members[p?.account] ?? ""])), "Hint").wraps(),
        ui.column([
          ui.text(Phrase.of("Not on Tapestry - or not linked yet. Invite them, and when they accept, your threads cross."), "Hint").wraps(),
          ui.button(INVITES, { payload: personId.map((id) => ({ id })) }).absentWhenRefused(),
          ui.when(showsLink, ui.column([
            ui.text(people.link.map((l) => l.address), "InviteLink").wraps(),
            ui.button(COPIES_LINK, { style: LINK }),
          ])),
          describeIsThisYou(ui, asking, account, personId),
          problem(ui, asking.problem),
          notice(ui, asking.notice),
        ])),
      problem(ui, people.problem),
      notice(ui, people.notice),
      ui.when(circles.map((c) => c.length > 0), ui.column([
        heading(ui, "Circles"),
        ui.eachAcross(circles, (held) => ui.pressable(TOGGLES_IN_CIRCLE, ui.bound(() => ({ circle: held.read()?.id ?? "", person: personId.read() })),
          [ui.text(held.map((c) => c?.name ?? ""), Themes.FACE)], "Segment")
          .currentWhile(ui.bound(() => (held.read()?.people ?? []).includes(personId.read()))), (c) => c.id, "Segments"),
      ])),
      heading(ui, "Everything with them"),
      timeline(about, Phrase.of("Nothing yet. Tag them on a memory, an event or a period.")),
      heading(ui, "Their name to you"),
      ui.row([
        ui.field(RENAMES, "", { changes: SETS_RENAME, shows: people.rename, carries: (line) => ({ line, id: personId.read() }) }).grow(),
        ui.button(RENAMES, { payload: personId.map((id) => ({ id })), style: LINK }),
      ], "AddRow"),
      ui.row([
        ui.button(UNLINKS, { payload: personId.map((id) => ({ id })), style: LINK }).absentWhenRefused(),
        ui.when(ui.bound(() => people.asking.read() !== `person:${personId.read()}`),
          ui.button(ASKS_TO_REMOVE, { payload: personId.map((id) => ({ key: `person:${id}` })), style: DANGER })),
      ], "Actions"),
      ui.when(ui.bound(() => people.asking.read() === `person:${personId.read()}`), ui.column([
        ui.text(person.map((p) => Phrase.with("Remove %s from your people? They come off everything you tagged them on.", [p?.name ?? ""])), "Warn").wraps(),
        ui.row([
          ui.button(REMOVES_PERSON, { payload: personId.map((id) => ({ id })), style: DANGER, goes_to: PEOPLE }),
          ui.button(KEEPS, { style: LINK }),
        ], "Actions"),
      ])),
    ]), ui.text(Phrase.of("Not one of your people."), "Quiet")),
  ], null, { on_fill: () => people.open(personId.read()) });
}

/** An invitation opened, once signed in: from whom, and accepting it. */
export function describeJoin(ui, people) {
  const invitation = people.invitation;
  return ui.screen(JOIN, [
    ui.text(Phrase.of("An invitation"), "Title"),
    ui.text(invitation.map((i) => (!i ? Phrase.of("Looking it up…")
      : i.accepted ? Phrase.with("You and %s are linked.", [i.from])
        : i.from ? Phrase.with("%s invites you to link your threads on Tapestry.", [i.from])
          : Phrase.of("This invitation has run out or been taken back. Ask for a new one."))), "Words").wraps(),
    ui.when(invitation.map((i) => !!i?.from && !i.accepted), ui.column([
      ui.text(Phrase.of("Once linked, you're each among the other's people: you see what they share with their people, they see what you share with yours, and an event either of you tags the other at is on both your threads. Either of you can unlink at any time."), "Hint").wraps(),
      ui.button(ACCEPTS),
    ])),
    problem(ui, people.problem),
    notice(ui, people.notice),
  ], null, { on_fill: () => people.look(ui.parameter(JOIN).read()) });
}
