// Who is signed in, and the tapestry they see. Signing in is with Google;
// someone signed in for the first time joins Tapestry under a name (Google's,
// unless they change it) - by the invitation they came with, as Tapestry is
// by invitation, or as its founder, the first ever to join. Anyone else
// signed in is told so, and may only sign out. Then everything they may see is loaded at once
// (loom.visible) into the Weave every screen reads, and loaded again after
// every change and whenever the page comes back into sight.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=627a8c37f81e";
import { Weave } from "./weave.js?v=627a8c37f81e";

export const SIGNS_OUT = "signs_out";
export const SETS_JOIN_NAME = "sets_the_name_to_join_under";
export const JOINS = "joins_tapestry";
export const RELOADS = "loads_again";

export const WORDS = {
  [SIGNS_OUT]: ["Sign out"],
  [SETS_JOIN_NAME]: ["Your name"],
  [JOINS]: ["Start my thread"],
  [RELOADS]: ["Try again"],
};

export class Account extends Controller {
  /** Through the loom: the platform's, or the stand-in a probe walks. */
  constructor(chimes, loom) {
    super(chimes);
    this.loom = loom;
    this.state = this.value("checking"); // checking, out, uninvited, joining or in
    /** The token of the invitation they came by, or "" (the page's, kept through signing in). */
    this.invitation = () => "";
    this.weave = this.value(new Weave());
    this.addresses = this.value({}); // a picture's path -> an address that shows it
    this.joinName = this.value("");
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
    if (action === JOINS) {
      if (this.busy.read()) return Phrase.of("Joining");
      if (!this.joinName.read().trim()) return Phrase.of("First say what others should call you");
    }
    return null;
  }

  told(action, payload) {
    if (action === SETS_JOIN_NAME) this.joinName.setValue(payload.line);
    if (action === JOINS) this.join();
    if (action === RELOADS) this.again();
    if (action === SIGNS_OUT) {
      this.loom.signOut();
      this.weave.setValue(new Weave());
      this.addresses.setValue({});
      this.state.setValue("out");
    }
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
    if (this.weave.read().me) { this.state.setValue("in"); return; }
    const may = await this.loom.mayJoin(this.invitation());
    if (this.disposed) return;
    if (!may.ok) { this.problem.setValue(may.error); return; }
    if (may.data) this.joinName.setValue(this.loom.userName());
    this.state.setValue(may.data ? "joining" : "uninvited");
  }

  async join() {
    this.busy.setValue(true);
    this.problem.setValue("");
    const joined = await this.loom.join(this.joinName.read().trim(), this.invitation());
    this.busy.setValue(false);
    if (!joined.ok) { this.problem.setValue(joined.error); return; }
    if (await this.load()) this.state.setValue("in");
  }

  /** After a failure: whoever is signed in, found again, as when the page opened. */
  async again() {
    this.problem.setValue("");
    if (await this.loom.restore()) await this.signedIn();
    else this.state.setValue("out");
  }

  /** Everything the member may see, loaded again: whether it was. */
  async load() {
    const found = await this.loom.visible();
    if (this.disposed) return false;
    if (!found.ok) {
      this.problem.setValue(found.error);
      if (this.state.read() === "checking") this.state.setValue("out");
      return false;
    }
    this.problem.setValue("");
    this.addresses.setValue(found.data.addresses);
    this.weave.setValue(new Weave(found.data.tapestry));
    return true;
  }

  /** An address that shows a picture, by its path, or "" until there is one. */
  address(path) { return this.addresses.read()[path] ?? ""; }
}
