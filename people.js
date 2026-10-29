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

import { Controller, Phrase, Themes } from "./gd_chime/gd_chime.js?v=89aae1096cfb";
import { few, heading, mark, notice, problem } from "./parts.js?v=89aae1096cfb";
import { CARD, DANGER, LINK } from "./look/look.js?v=89aae1096cfb";
import { describeIsThisYou } from "./asking.js?v=89aae1096cfb";
import { ADDS_MEMORY, EDIT } from "./editor.js?v=89aae1096cfb";
import { parseWhen, sayWhen } from "./when.js?v=89aae1096cfb";

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
export const SETS_BORN = "sets_when_they_were_born";
export const SETS_DIED = "sets_when_they_died";
export const SAVES_LIFE = "saves_when_they_lived";
export const REMOVES_PERSON = "removes_them";
export const PICKS_TWIN = "picks_who_else_they_are";
export const MERGES = "merges_them";
export const SETS_CIRCLE_NAME = "sets_a_new_circles_name";
export const ADDS_CIRCLE = "adds_a_circle";
export const TOGGLES_IN_CIRCLE = "puts_them_in_or_out_of_a_circle";
export const REMOVES_CIRCLE = "removes_a_circle";
export const ACCEPTS = "accepts_the_invitation";
export const ASKS_TO_REMOVE = "asks_before_removing";
export const KEEPS = "keeps_them";
export const ORDERS_PEOPLE = "orders_my_people";

/** How to invite someone, step by step: on the People page and in the admin area. */
export const HOW_TO_INVITE = [
  "1. On People, type their name and press Add.",
  "2. Press their name to open their page.",
  "3. Press “Invite them to link their life”, then “Send the link”: on a phone it opens your share sheet; on a computer it copies the link to paste anywhere.",
  "4. They open it, sign in with Google, say their name, and press “Link our lives”. A link is for one person, and runs out after 30 days.",
  "Someone already on Tapestry needs no link: on their name's page, ask them under “Already on Tapestry?”.",
];

export const WORDS = {
  [SETS_NEW_PERSON]: ["Name"],
  [ADDS_PERSON]: ["Add"],
  [OPENS_PERSON]: ["Open"],
  [INVITES]: ["Invite them to link their life"],
  [COPIES_LINK]: ["Send the link"],
  [UNLINKS]: ["Unlink their account"],
  [SETS_RENAME]: ["Their name"],
  [RENAMES]: ["Save the name"],
  [SETS_BORN]: ["Born"],
  [SETS_DIED]: ["Died"],
  [SAVES_LIFE]: ["Save when they lived"],
  [REMOVES_PERSON]: ["Remove them from your people"],
  [PICKS_TWIN]: ["The same person"],
  [MERGES]: ["Merge them"],
  [SETS_CIRCLE_NAME]: ["Circle name"],
  [ADDS_CIRCLE]: ["Add a circle"],
  [TOGGLES_IN_CIRCLE]: ["In this circle"],
  [REMOVES_CIRCLE]: ["Remove the circle"],
  [ACCEPTS]: ["Link our lives"],
  [ASKS_TO_REMOVE]: ["Remove"],
  [KEEPS]: ["No, keep"],
  [ORDERS_PEOPLE]: ["Choose their order"],
};

export class People extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.newName = this.value("");
    this.circleName = this.value("");
    this.rename = this.value("");
    this.born = this.value(""); // when they were born, as typed: their line on the tapestry starts there
    this.died = this.value(""); // and when they died, as typed: it ends there
    this.link = this.value({ person: "", address: "" }); // the invitation shown, for one person
    this.invitation = this.value(null); // the one being opened: { token, from, expired } once found, or null
    this.order = this.value(keptOrder()); // the people's list: "name" (A to Z), or "memories" (the most memories together first)
    this.twin = this.value(""); // another of the member's people picked as this same person, to merge into this one
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
    this.twin.setValue("");
    this.problem.setValue("");
    this.notice.setValue("");
  }

  would(action, payload) {
    if (action !== SETS_NEW_PERSON && action !== SETS_CIRCLE_NAME && action !== SETS_RENAME && action !== OPENS_PERSON && this.busy.read()) return Phrase.of("Saving");
    if (action === ADDS_PERSON && !this.newName.read().trim()) return Phrase.of("Type their name first");
    if (action === ADDS_CIRCLE && !this.circleName.read().trim()) return Phrase.of("Name the circle first");
    if (action === RENAMES && !this.rename.read().trim()) return Phrase.of("A name can't be empty");
    if (action === MERGES && !this.twin.read()) return Phrase.of("Pick who else they are first");
    if (action === SAVES_LIFE) {
      for (const typed of [this.born.read(), this.died.read()]) if (typed.trim() && !parseWhen(typed).when) return Phrase.of("Say when, as a time is: 12 June 1932, June 1932, 1932");
    }
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
    if (action === SETS_BORN) this.born.setValue(payload.line);
    if (action === SETS_DIED) this.died.setValue(payload.line);
    if (action === SAVES_LIFE) {
      const born = parseWhen(this.born.read()).when;
      const died = parseWhen(this.died.read()).when;
      this.change(() => this.loom.savePersonLife(payload.id, { born: born?.date ?? null, born_precision: born?.precision ?? "day",
        died: died?.date ?? null, died_precision: died?.precision ?? "day" }), () => "Saved");
    }
    if (action === ORDERS_PEOPLE) {
      this.order.setValue(payload.order);
      try { localStorage.setItem(ORDER_KEPT, payload.order); } catch { /* this visit only */ }
    }
    if (action === PICKS_TWIN) this.twin.setValue(this.twin.read() === payload.id ? "" : payload.id);
    if (action === MERGES) {
      const gone = this.twin.read();
      this.twin.setValue("");
      this.change(() => this.loom.mergePeople(gone, payload.id), () => "Merged: one person now, with everything of both");
    }
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
    const known = this.account.weave.read().people.get(personId);
    this.born.setValue(known?.born ? sayWhen({ date: known.born, precision: known.born_precision }) : "");
    this.died.setValue(known?.died ? sayWhen({ date: known.died, precision: known.died_precision }) : "");
    this.asking.setValue("");
    this.twin.setValue("");
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

const ORDER_KEPT = "tapestry-people-order";

/** The people's order this device was last left in. */
function keptOrder() {
  try { return localStorage.getItem(ORDER_KEPT) === "memories" ? "memories" : "name"; } catch { return "name"; }
}

/** The address an invitation opens at. */
export function linkTo(token) { return `${location.origin}${location.pathname}#join/${token}`; }

/** The member's people and circles. */
export function describePeople(ui, people, account) {
  const counts = account.weave.map((w) => w.memoryCounts());
  const list = ui.bound(() => {
    const all = account.weave.read().data.people;
    if (people.order.read() !== "memories") return all;
    const n = counts.read();
    return [...all].sort((a, b) => (n.get(b.id) ?? 0) - (n.get(a.id) ?? 0) || a.name.localeCompare(b.name));
  });
  const circles = account.weave.map((w) => w.data.circles);
  return ui.screen(PEOPLE, [
    ui.text(Phrase.of("Your people"), "Title"),
    ui.text(Phrase.of("Anyone you tag or want to find things by. Invite someone to link their own life: then your lives meet wherever you tag each other."), "Hint").wraps(),
    ui.row([
      ui.field(ADDS_PERSON, "", { changes: SETS_NEW_PERSON, shows: people.newName, placeholder: Phrase.of("Someone's name") }).grow(),
      ui.button(ADDS_PERSON),
    ], "AddRow"),
    problem(ui, people.problem),
    notice(ui, people.notice),
    ui.when(list.map((l) => l.length === 0), ui.text(Phrase.of("No one yet."), "Quiet")),
    ui.when(list.map((l) => l.length > 1), ui.row([["name", "A to Z"], ["memories", "Most memories together"]].map(([order, said]) =>
      ui.pressable(ORDERS_PEOPLE, { order }, [ui.text(Phrase.of(said), Themes.FACE)], "Segment").currentWhile(people.order.map((o) => o === order))), "Segments")),
    ui.surface("Card HowTo", [ui.column([
      ui.text(Phrase.of("Inviting someone"), "FieldName"),
      ...HOW_TO_INVITE.map((step) => ui.text(Phrase.of(step), "Hint").wraps()),
    ], "Part")]),
    few(ui, "people", list, (p) => p.name, (held) => ui.pressable(OPENS_PERSON, held.map((p) => ({ parameter: p?.id ?? "" })), [ui.row([
      mark(ui, held.map((p) => (p?.account ? account.weave.read().colourOf(p.account) : "#c9c2b6"))),
      ui.text(held.map((p) => p?.name ?? ""), "PersonName").grow(),
      ui.text(ui.bound(() => { const n = counts.read().get(held.read()?.id) ?? 0; return n ? Phrase.counted("%d memory", "%d memories", n) : ""; }), "Quiet").hidesEmpty(),
      ui.text(held.map((p) => Phrase.of(p?.account ? "On Tapestry" : p?.invite ? "Invited" : "A name")), "Quiet"),
    ], "PersonRow")], `${CARD} ListItem`).goesTo(PERSON), { finds: "Find one of your people by name", across: false, keyOf: (p) => p.id, style: "List", browsed: true }),
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
  // who else this person could be: any other of the member's people, but not someone linked to a different account, nor the member themself
  const twins = ui.bound(() => {
    const weave = account.weave.read();
    const self = person.read();
    return weave.data.people.filter((p) => p.id !== self?.id && p.account !== weave.me?.id && !(p.account && self?.account && p.account !== self.account));
  });
  return ui.screen(PERSON, [
    ui.when(person, ui.column([
      ui.row([mark(ui, person.map((p) => (p?.account ? account.weave.read().colourOf(p.account) : "#c9c2b6")), "BigDot"), ui.text(person.map((p) => p?.name ?? ""), "Title")]),
      // a memory of them: written with them on it already - first, under their name, apart from their circles
      ui.row([ui.button(ADDS_MEMORY, { with: personId.map((id) => `memory:new:person:${id}`), goes_to: EDIT }).absentWhenRefused()], "Actions"),
      ui.when(linked,
        ui.text(person.map((p) => Phrase.with("On Tapestry as %s. You are among each other's people.", [account.weave.read().data.members[p?.account] ?? ""])), "Hint").wraps(),
        ui.column([
          ui.text(Phrase.of("Not on Tapestry - or not linked yet. Invite them, and when they accept, your lives meet."), "Hint").wraps(),
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
        heading(ui, "Their circles"),
        ui.text(Phrase.of("Ticked: they are in it. Press a circle to put them in, or take them out."), "Hint").wraps(),
        few(ui, "person-circles", circles, (c) => c.name, (held) => ui.pressable(TOGGLES_IN_CIRCLE, ui.bound(() => ({ circle: held.read()?.id ?? "", person: personId.read() })),
          [ui.text(ui.bound(() => `${(held.read()?.people ?? []).includes(personId.read()) ? "✓" : "+"} ${held.read()?.name ?? ""}`), Themes.FACE)], "Segment CircleChip")
          .currentWhile(ui.bound(() => (held.read()?.people ?? []).includes(personId.read()))),
        { finds: "Find a circle by name", keyOf: (c) => c.id, style: "Segments", keep: (c) => c.people.includes(personId.read()) }),
      ])),
      heading(ui, "Everything with them"),
      timeline(about, Phrase.of("Nothing yet. Tag them on a memory, an event or a period.")),
      // someone not on Tapestry: their life on the tapestry, grey, runs from their birth to their death, as far as known
      ui.when(linked.map((l) => !l), ui.column([
        heading(ui, "Their life"),
        ui.text(Phrase.of("When they were born and died, as far as you know - their line on your tapestry runs between them. Not known, it fades in before the first thing with them."), "Hint").wraps(),
        ui.field(SETS_BORN, "", { label: Phrase.of("Born"), changes: SETS_BORN, shows: people.born, placeholder: Phrase.of("e.g. 1932") }),
        ui.field(SETS_DIED, "", { label: Phrase.of("Died"), changes: SETS_DIED, shows: people.died, placeholder: Phrase.of("Leave empty if they're alive") }),
        ui.row([ui.button(SAVES_LIFE, { payload: personId.map((id) => ({ id })), style: LINK })], "Actions"),
      ])),
      // two names for one person, made by mistake or by importing: the other folded into this one
      ui.when(twins.map((t) => t.length > 0), ui.column([
        heading(ui, "The same person twice?"),
        ui.text(person.map((p) => Phrase.with("If another of your people is %s too, pick them. Merged, everything tagged with either is tagged with %s, they are in both's circles, and the other name goes.", [p?.name ?? "", p?.name ?? ""])), "Hint").wraps(),
        few(ui, "twins", twins, (p) => p.name, (held) => ui.pressable(PICKS_TWIN, held.map((p) => ({ id: p?.id ?? "" })), [ui.text(held.map((p) => p?.name ?? ""), Themes.FACE)], "Segment")
          .currentWhile(ui.bound(() => people.twin.read() === held.read()?.id)), { finds: "Find one of your people by name", keyOf: (p) => p.id, style: "Segments", keep: (p) => p.id === people.twin.read() }),
        ui.when(people.twin.map((t) => t !== ""), ui.column([
          ui.text(ui.bound(() => Phrase.with("Merge %s into %s? It can't be undone.", [account.weave.read().people.get(people.twin.read())?.name ?? "", person.read()?.name ?? ""])), "Warn").wraps(),
          ui.row([ui.button(MERGES, { payload: personId.map((id) => ({ id })), style: DANGER })], "Actions"),
        ])),
      ])),
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

/** An invitation opened, once signed in: from whom, and accepting it; then what comes after (the welcome, for someone new). */
export function describeJoin(ui, people, after = null) {
  const invitation = people.invitation;
  return ui.screen(JOIN, [
    ui.text(Phrase.of("An invitation"), "Title"),
    ui.text(invitation.map((i) => (!i ? Phrase.of("Looking it up…")
      : i.accepted ? Phrase.with("You and %s are linked.", [i.from])
        : i.from ? Phrase.with("%s invites you to link your lives on Tapestry.", [i.from])
          : Phrase.of("This invitation has run out or been taken back. Ask for a new one."))), "Words").wraps(),
    ui.when(invitation.map((i) => !!i?.from && !i.accepted), ui.column([
      ui.text(Phrase.of("Once linked, you're each among the other's people: you see what they share with their people, they see what you share with yours, and an event either of you tags the other at is in both your lives. Either of you can unlink at any time."), "Hint").wraps(),
      ui.button(ACCEPTS),
    ])),
    problem(ui, people.problem),
    notice(ui, people.notice),
    ...(after ? [after] : []),
  ], null, { on_fill: () => people.look(ui.parameter(JOIN).read()) });
}
