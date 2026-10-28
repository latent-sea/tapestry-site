// Who is signed in, and the tapestry they see. Signing in is with Google;
// someone signed in for the first time joins Tapestry under a name (Google's,
// unless they change it) - by the invitation they came with, as Tapestry is
// by invitation, or as its founder, the first ever to join. Anyone else
// signed in is told so, and may only sign out. Then everything they may see is loaded at once
// (loom.visible) into the Weave every screen reads, and loaded again after
// every change and whenever the page comes back into sight.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=0f4719403046";
import { Weave } from "./weave.js?v=0f4719403046";

export const SIGNS_OUT = "signs_out";
export const SETS_JOIN_NAME = "sets_the_name_to_join_under";
export const JOINS = "joins_tapestry";
export const RELOADS = "loads_again";
export const AGREES = "agrees_to_the_terms";
export const STOPS_SEEING = "stops_seeing_as_them";

export const WORDS = {
  [SIGNS_OUT]: ["Sign out"],
  [SETS_JOIN_NAME]: ["Your name"],
  [JOINS]: ["Start my life story"],
  [RELOADS]: ["Try again"],
  [AGREES]: ["I agree"],
  [STOPS_SEEING]: ["Stop seeing as them"],
};

const MASKED_PICTURE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='4' height='3'><rect width='4' height='3' fill='black'/></svg>";

/** How long pictures' addresses (good for an hour) are kept before asked for again: with the half-hourly look again, never older than the hour. */
const ADDRESSES_KEPT = 25 * 60 * 1000;

export class Account extends Controller {
  /** Through the loom: the platform's, or the stand-in a probe walks. */
  constructor(chimes, loom) {
    super(chimes);
    this.loom = loom;
    this.leaving = []; // what goes while still signed in, on signing out: each an async function
    this.state = this.value("checking"); // checking, out, uninvited, joining, agreeing (to the terms, once) or in
    /** The token of the invitation they came by, or "" (the page's, kept through signing in). */
    this.invitation = () => "";
    this.weave = this.value(new Weave());
    this.addresses = this.value({}); // a picture's path -> an address that shows it, asked for as it is shown
    this.texts = this.value({}); // a memory cut short by a light load -> its words in full, fetched as it is opened
    this.found = this.value({ key: "", ids: null }); // what the platform found in cut memories' words, for the words last looked for
    // as forget() leaves them, without telling anyone: nothing is listening yet
    this.since = Date.now();
    this.asked = new Set();
    this.wanted = new Set();
    this.joinName = this.value("");
    this.terms = this.value([]); // the terms, read from their own page (terms.html) to be shown before they are agreed to: [{ kind, words }]
    this.busy = this.value(false);
    this.problem = this.value("");
    // back from Google on a phone: its answer signs in; else whoever was signed in before
    const google = loom.googleAnswer();
    if (google?.credential) this.signInWithGoogle(google.credential, google.nonce);
    else {
      if (google?.error) this.problem.setValue(google.error);
      loom.restore().then((signed) => (signed ? this.signedIn() : this.state.setValue("out")));
    }
  }

  answers() { return Object.keys(WORDS); }

  would(action) {
    if (action === SIGNS_OUT && ["checking", "out"].includes(this.state.read())) return Phrase.of("Not signed in");
    if (action === AGREES && this.busy.read()) return Phrase.of("Saving");
    if (action === STOPS_SEEING && !this.loom.seeing) return Phrase.of("Seeing as yourself");
    if (action === JOINS) {
      if (this.busy.read()) return Phrase.of("Joining");
      if (!this.joinName.read().trim()) return Phrase.of("First say what others should call you");
    }
    return null;
  }

  told(action, payload) {
    if (action === SETS_JOIN_NAME) this.joinName.setValue(payload.line);
    if (action === JOINS) this.join();
    if (action === AGREES) this.agree();
    if (action === STOPS_SEEING) this.stopSeeing();
    if (action === RELOADS) this.again();
    if (action === SIGNS_OUT) this.signOut();
    return null;
  }

  /** Google's answer, handed on by its button: a press of the person's own on Google's side. */
  async signInWithGoogle(credential, nonce) {
    this.problem.setValue("");
    const signed = await this.loom.signInWithGoogle(credential, nonce);
    if (!signed.ok) { this.problem.setValue(signed.error); this.state.setValue("out"); return; }
    await this.signedIn();
  }

  /** Someone is signed in: their tapestry, or joining it if they never have and may, or told it is by invitation. */
  async signedIn() {
    const loaded = await this.load();
    if (this.disposed || !loaded) return;
    // here before there were terms: agreed to once, before anything else
    if (this.weave.read().me) {
      if (this.weave.read().me.agreed === false) this.readTerms();
      this.state.setValue(this.weave.read().me.agreed === false ? "agreeing" : "in");
      return;
    }
    const may = await this.loom.mayJoin(this.invitation());
    if (this.disposed) return;
    if (!may.ok) { this.problem.setValue(may.error); return; }
    if (may.data) { this.joinName.setValue(this.loom.userName()); this.readTerms(); }
    this.state.setValue(may.data ? "joining" : "uninvited");
  }

  async join() {
    this.busy.setValue(true);
    this.problem.setValue("");
    const joined = await this.loom.join(this.joinName.read().trim(), this.invitation());
    // joining is agreeing to the terms, as its button says
    if (joined.ok) await this.loom.agree();
    this.busy.setValue(false);
    if (!joined.ok) { this.problem.setValue(joined.error); return; }
    if (await this.load()) this.state.setValue("in");
  }

  /** The terms, read from their own page - one wording, there and here: its headings, paragraphs and points, in order. */
  async readTerms() {
    if (this.terms.read().length) return;
    try {
      const page = new DOMParser().parseFromString(await (await fetch("terms.html")).text(), "text/html");
      const parts = [...page.querySelectorAll("main > h2, main > p:not(.when), main > ul > li")].map((part) => ({
        kind: part.tagName === "H2" ? "heading" : part.tagName === "LI" ? "point" : "words", words: part.textContent.replace(/\s+/g, " ").trim() }));
      if (!this.disposed) this.terms.setValue(parts);
    } catch { /* the link to them stays */ }
  }

  /** The terms agreed to, by someone here before there were any: then in. */
  async agree() {
    this.busy.setValue(true);
    this.problem.setValue("");
    const agreed = await this.loom.agree();
    this.busy.setValue(false);
    if (!agreed.ok) { this.problem.setValue(agreed.error); return; }
    if (await this.load()) this.state.setValue("in");
  }

  /** Tapestry seen as one of its members, by its support: read-only, masked unless they let support in. */
  async seeAs(member, name) {
    this.loom.seeing = { member, name };
    this.forget();
    if (!(await this.load())) { this.loom.seeing = null; await this.load(); return false; }
    return true;
  }

  /** Back to seeing Tapestry as oneself. */
  async stopSeeing() {
    this.loom.seeing = null;
    this.forget();
    await this.load();
  }

  /** Who is being seen as: { member, name, masked }, or null. */
  get seeing() { return this.loom.seeing ? { ...this.loom.seeing, masked: !!this.weave.read().data.seen_as?.masked } : null; }

  /** Signed out from elsewhere (their account deleted): nothing of theirs stays, and the door opens. */
  /** Signing out: what must go while still signed in goes first (this device's notifications, phone.js) - for three seconds at most. */
  async signOut() {
    await Promise.race([Promise.all(this.leaving.map((go) => go().catch(() => {}))), new Promise((done) => setTimeout(done, 3000))]);
    this.loom.signOut();
    this.weave.setValue(new Weave());
    this.forget();
    this.state.setValue("out");
  }

  signedOut() {
    this.weave.setValue(new Weave());
    this.forget();
    this.state.setValue("out");
  }

  /** After a failure: whoever is signed in, found again, as when the page opened. */
  async again() {
    this.problem.setValue("");
    if (await this.loom.restore()) await this.signedIn();
    else this.state.setValue("out");
  }

  /** Everything the member may see, loaded again: whether it was. */
  async load() {
    const found = this.loom.seeing ? await this.loom.viewAs(this.loom.seeing.member) : await this.loom.visible();
    if (this.disposed) return false;
    if (!found.ok) {
      this.problem.setValue(found.error);
      if (this.state.read() === "checking") this.state.setValue("out");
      return false;
    }
    this.problem.setValue("");
    // pictures' addresses last an hour: kept from load to load until near half that, then asked for again as shown
    if (Date.now() - this.since > ADDRESSES_KEPT) this.forget();
    this.texts.setValue({});
    for (const id of this.weave.read().cutIds) this.asked.delete(id);
    this.found.setValue({ key: "", ids: null });
    this.finding = "";
    this.weave.setValue(new Weave(found.data.tapestry));
    // the member's own pictures from before small copies, given one each, a few at a time, unhurried
    if (!this.loom.seeing) setTimeout(() => this.makeThumbs(), 3000);
    // terms there were none of when the page opened: agreed to before going on, whenever it loads again
    if (this.state.read() === "in" && this.weave.read().me?.agreed === false) { this.readTerms(); this.state.setValue("agreeing"); }
    return true;
  }

  /** Every picture's address and every memory's words fetched before, let go. */
  forget() {
    this.since = Date.now();
    this.asked = new Set();
    this.wanted = new Set();
    this.addresses.setValue({});
    this.texts.setValue({});
  }

  /** An address that shows a picture, by its path, or "" until there is one: one not had yet is asked for, with the others shown at the same time. */
  address(path) {
    // a picture hidden from support, seeing as someone: black, its shape kept
    if (String(path ?? "").startsWith("masked:")) return MASKED_PICTURE;
    const known = this.addresses.read()[path];
    if (!known && path && !this.asked.has(path)) {
      this.asked.add(path);
      this.wanted.add(path);
      if (this.wanted.size === 1) setTimeout(() => this.sign(), 0);
    }
    return known ?? "";
  }

  /** The pictures waiting for addresses, asked for together. */
  async sign() {
    const paths = [...this.wanted];
    this.wanted = new Set();
    for (let at = 0; at < paths.length; at += 100) {
      const signed = await this.loom.pictureAddresses(paths.slice(at, at + 100));
      if (this.disposed) return;
      if (signed.ok) this.addresses.setValue({ ...this.addresses.read(), ...signed.data });
    }
  }

  /** Addresses for these pictures, all at once, for something that needs every one now (a copy to keep). */
  async addressesFor(paths) {
    const missing = paths.filter((path) => !this.addresses.read()[path]);
    for (let at = 0; at < missing.length; at += 100) {
      const signed = await this.loom.pictureAddresses(missing.slice(at, at + 100));
      if (this.disposed) return {};
      if (signed.ok) this.addresses.setValue({ ...this.addresses.read(), ...signed.data });
    }
    return this.addresses.read();
  }

  /** A memory's words in full: as loaded, or for one cut short, as fetched - its first 2000 until then, fetching the rest. */
  textOf(memory) {
    if (!memory?.cut) return memory?.body ?? "";
    const known = this.texts.read()[memory.id];
    // asked for once a load: one that couldn't be fetched shows its first 2000 until the next
    if (known === undefined && !this.asked.has(memory.id)) { this.asked.add(memory.id); this.fetchTexts([memory.id]); }
    return known ?? memory.body;
  }

  /** A few of the member's own pictures with no small copy yet given one: the next load shows them. */
  async makeThumbs(most = 4) {
    if (this.making || this.disposed) return;
    const weave = this.weave.read();
    const waiting = weave.data.memories.filter((m) => m.owner === weave.meId).flatMap((m) => m.pictures).filter((p) => !p.thumb && !String(p.path).startsWith("masked:")).slice(0, most);
    if (!waiting.length) return;
    this.making = true;
    const addresses = await this.addressesFor(waiting.map((p) => p.path));
    for (const picture of waiting) {
      if (this.disposed || this.loom.seeing) break;
      if (addresses[picture.path]) await this.loom.makeThumb(picture.id, picture.path, addresses[picture.path]);
    }
    this.making = false;
  }

  /** Memories' words in full, fetched, for those cut short: whether they were. */
  async fetchTexts(ids) {
    const cut = ids.filter((id) => this.weave.read().memories.get(id)?.cut && this.texts.read()[id] === undefined);
    if (!cut.length) return true;
    this.fetching ??= new Set();
    const asking = cut.filter((id) => !this.fetching.has(id));
    if (!asking.length) return new Promise((done) => setTimeout(() => done(this.fetchTexts(ids)), 100));
    asking.forEach((id) => this.fetching.add(id));
    let fine = true;
    for (let at = 0; at < asking.length; at += 1000) {
      const got = await this.loom.memoryTexts(asking.slice(at, at + 1000));
      if (this.disposed) return false;
      if (got.ok) this.texts.setValue({ ...this.texts.read(), ...got.data }); else fine = false;
    }
    asking.forEach((id) => this.fetching.delete(id));
    return fine;
  }

  /**
   * The cut memories whose words in full hold every word looked for, as the
   * platform finds them: null until it has answered (or with none cut short).
   */
  foundInTexts(looked) {
    const words = String(looked ?? "").toLowerCase().trim().split(/\s+/).filter(Boolean);
    const ids = this.weave.read().cutIds;
    if (!words.length || !ids.length) return null;
    const key = words.join(" ");
    const found = this.found.read();
    if (found.key === key) return found.ids;
    if (this.finding !== key) {
      this.finding = key;
      setTimeout(async () => {
        if (this.finding !== key) return;
        const got = await this.loom.findInTexts(ids, words);
        if (this.disposed || this.finding !== key) return;
        this.found.setValue({ key, ids: new Set(got.ok ? got.data : []) });
      }, 250);
    }
    return null;
  }
}
