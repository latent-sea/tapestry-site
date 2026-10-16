// Where the tapestry lives: its tables on the platform (backend.sql), through
// the platform's client (backend/, installed by tooling/install_site.py).
// Every answer is { ok, data, error } and nothing throws; what a member may
// see or change is decided on the platform, never here.
//
// Signing in is with Google (backend/google.js), as on the factory's other
// sites: the platform sends no email yet. Pictures go in the platform's
// private pictures (D-022), seen only by whoever may see their memory.
//
// standin.js answers the same calls from memory, for the page walked by its
// probe; a change here is a change there.

import { Backend } from "./backend/backend.js?v=4242d8d537bc";
import { drawSignIn, takeGoogleRedirect } from "./backend/google.js?v=4242d8d537bc";
import { shrinkPicture } from "./backend/pictures.js?v=4242d8d537bc";

// public: the platform's address and its publishable key belong in the page
const PLATFORM = "https://api.latent-sea.com";
const KEY = "sb_publishable_BqVtSYE4ysOb2sHMuFSwMk_HrTAUgLx";
// public: the Google client the platform accepts (platform/supabase/platform.yml)
const GOOGLE_CLIENT = "400837578052-jqnhh565es3a92k58u5r2oggdcf7mrkr.apps.googleusercontent.com";

const APP = "tapestry";

/** A failure's words for a person: the platform's own for one it raised, else plain ones. */
export function said(reply) {
  if (reply.ok) return "";
  if (reply.status === 0) return "Tapestry can't be reached. Please check your connection and try again.";
  if (reply.status >= 500 || !reply.data?.message) return "Something went wrong on our side. Please try again in a moment.";
  return reply.data.message;
}

const answer = (reply, data = reply.data) => ({ ok: reply.ok, data: reply.ok ? data : null, error: said(reply) });
const by = (id) => `id=eq.${encodeURIComponent(id)}`;

export class Loom {
  constructor(backend = new Backend(PLATFORM, KEY, { keptIn: "tapestry_session" })) {
    this.backend = backend;
  }

  // --- who is signed in ---

  /** Whoever signed in last time, if anyone, and not as a guest: true when someone is. */
  async restore() { return (await this.backend.restore()) && !this.backend.session?.user?.is_anonymous; }

  /** The signed-in account's id, or "". */
  playerId() { return this.backend.playerId(); }

  /** The name Google gave, for a member's first name on Tapestry. */
  userName() {
    const user = this.backend.session?.user ?? {};
    return user.user_metadata?.full_name || user.user_metadata?.name || "";
  }

  drawGoogleButton(element, signedIn) { return drawSignIn(element, GOOGLE_CLIENT, signedIn, { theme: "outline", text: "continue_with" }); }

  /** Google's answer, if the page has just come back from signing in with it on a phone: { credential, nonce } or { error }, else null. */
  googleAnswer() { return takeGoogleRedirect(); }

  async signInWithGoogle(credential, nonce) { return answer(await this.backend.signInWithGoogleToken(credential, nonce)); }

  async signOut() { await this.backend.signOut(); }

  // --- the member ---

  /** Joining Tapestry under a name - by an invitation's token, unless founding it - or changing the name. */
  async join(name, invitation = "") {
    return answer(await (invitation ? this.backend.callRpc("tapestry_join_invited", { name, invitation }) : this.backend.callRpc("tapestry_join", { name })));
  }

  /** Whether whoever is signed in may join, by this invitation's token if any (Tapestry is by invitation): { ok, data: true or false }. */
  async mayJoin(invitation = "") { return answer(await this.backend.callRpc("tapestry_may_join", { invitation: invitation || null })); }

  /** The member's birthday ("YYYY-MM-DD", or null for none), seen by them alone. */
  async saveBirthday(date) { return answer(await this.backend.update("tapestry_members", `user_id=eq.${encodeURIComponent(this.playerId())}`, { birthday: date })); }

  /** The member's defaults for who sees new things: { memory_audience, event_audience, period_audience } as far as given. */
  async saveDefaults(changes) { return answer(await this.backend.update("tapestry_members", `user_id=eq.${encodeURIComponent(this.playerId())}`, changes)); }

  // --- reading ---

  /** Everything the member may see (tapestry_visible), with an address for each picture: { ok, data: { tapestry, addresses }, error }. */
  async visible() {
    const reply = await this.backend.callRpc("tapestry_visible");
    if (!reply.ok) return answer(reply);
    const tapestry = reply.data ?? { me: null };
    const paths = (tapestry.memories ?? []).flatMap((memory) => memory.pictures.map((picture) => picture.path));
    const signed = await this.backend.privatePictureAddresses(paths);
    return { ok: true, data: { tapestry, addresses: signed.ok ? signed.data : {} }, error: "" };
  }

  // --- memories, events, periods ---

  async saveMemory(memory) { return answer(await this.backend.callRpc("tapestry_save_memory", { memory })); }

  async saveEvent(event) { return answer(await this.backend.callRpc("tapestry_save_event", { event })); }

  async savePeriod(period) { return answer(await this.backend.callRpc("tapestry_save_period", { period })); }

  /** A memory removed, then its pictures' files: never pictures gone from a memory that stays. */
  async deleteMemory(id, paths = []) {
    const gone = answer(await this.backend.delete("tapestry_memories", by(id)));
    if (gone.ok && paths.length) await this.backend.removePrivatePictures(paths);
    return gone;
  }

  async deleteEvent(id) { return answer(await this.backend.delete("tapestry_events", by(id))); }

  async deletePeriod(id) { return answer(await this.backend.delete("tapestry_periods", by(id))); }

  /** Taken off an event someone else tagged the member at. */
  async leaveEvent(id) { return answer(await this.backend.callRpc("tapestry_leave_event", { event: id })); }

  // --- pictures ---

  /** A picture shrunk, kept privately and added to one of the member's memories. */
  async addPicture(memoryId, file, position = 0, caption = "") {
    const kept = await this.backend.uploadPrivatePicture(APP, `${crypto.randomUUID()}.jpg`, await shrinkPicture(file, 1600));
    if (kept.status === 413) return { ok: false, data: null, error: "That picture is too big. Please choose one under 10 MB." };
    if (!kept.ok) return answer(kept);
    return answer(await this.backend.insert("tapestry_pictures", { memory_id: memoryId, path: kept.data.path, position, caption: caption.trim() }));
  }

  /** A picture taken off its memory, then its file: never a picture gone from a memory that keeps it. */
  async removePicture(id, path) {
    const gone = answer(await this.backend.delete("tapestry_pictures", by(id)));
    if (gone.ok) await this.backend.removePrivatePictures([path]);
    return gone;
  }

  /** A picture's bytes, as a data: address, to stand inside a page: from the address that shows it. */
  async pictureData(address) {
    try {
      const got = await fetch(address);
      if (!got.ok) return { ok: false, data: null, error: `The picture couldn't be fetched (${got.status})` };
      const blob = await got.blob();
      const data = await new Promise((done, failed) => {
        const reader = new FileReader();
        reader.onload = () => done(reader.result);
        reader.onerror = () => failed(reader.error);
        reader.readAsDataURL(blob);
      });
      return { ok: true, data, error: "" };
    } catch {
      return { ok: false, data: null, error: "The picture couldn't be fetched" };
    }
  }

  /** A picture's caption: what it shows, said to anyone who can't see it too. */
  async captionPicture(id, caption) { return answer(await this.backend.update("tapestry_pictures", by(id), { caption: caption.trim() })); }

  // --- people, circles, places ---

  async addPerson(name) {
    const reply = await this.backend.insert("tapestry_people", { name: name.trim() });
    return answer(reply, reply.ok ? reply.data[0] : null);
  }

  async renamePerson(id, name) { return answer(await this.backend.update("tapestry_people", by(id), { name: name.trim() })); }

  async deletePerson(id) { return answer(await this.backend.delete("tapestry_people", by(id))); }

  /** An invitation for one of the member's people: its token, for a link they open. */
  async invite(personId) { return answer(await this.backend.callRpc("tapestry_invite", { person: personId })); }

  // --- the admin area (backend.sql, "the admin area") ---

  /** Who is on Tapestry and every invitation waiting: { members, invitations }, for an admin. */
  async adminView() { return answer(await this.backend.callRpc("tapestry_admin_view", {})); }

  /** Someone removed from Tapestry, everything they made with them. */
  async adminRemove(member) { return answer(await this.backend.callRpc("tapestry_admin_remove", { member })); }

  /** An invitation cancelled. */
  async adminCancelInvite(token) { return answer(await this.backend.callRpc("tapestry_admin_cancel_invite", { token })); }

  /** Someone made an admin, or not one. */
  async adminSet(member, admin) { return answer(await this.backend.callRpc("tapestry_admin_set", { member, admin })); }

  /** How the server is: { result, commit, at } (platform/bin/deploy's status, open to anyone). */
  async platformStatus() {
    try {
      const reply = await fetch(`${PLATFORM}/platform/status`, { cache: "no-store" });
      return reply.ok ? { ok: true, data: await reply.json(), error: "" } : { ok: false, data: null, error: "The server didn't answer" };
    } catch {
      return { ok: false, data: null, error: "The server didn't answer" };
    }
  }

  // --- asking, for someone already on Tapestry (backend.sql, "asking") ---

  /** Asking to link a name to a member: one's own name to someone known of, or someone else's to oneself. */
  async askLink(person, member) { return answer(await this.backend.callRpc("tapestry_ask_link", { person, member })); }

  /** Asking to be at an event one sees but isn't at. */
  async askAtEvent(eventId) { return answer(await this.backend.callRpc("tapestry_ask_at_event", { the_event: eventId })); }

  /** One's own event folded into another: at once into one's own, else asked of its maker. */
  async askMergeEvent(from, into) { return answer(await this.backend.callRpc("tapestry_ask_merge_event", { from_event: from, into_event: into })); }

  /** One's own place folded into another: at once into one's own, else asked of its owner. */
  async askMergePlace(from, into) { return answer(await this.backend.callRpc("tapestry_ask_merge_place", { from_place: from, into_place: into })); }

  /** A request answered yes or no, or taken back (no) by whoever asked. */
  async answer(request, yes) { return answer(await this.backend.callRpc("tapestry_answer", { request, yes })); }

  /** Who an invitation is from: { from, expired }, or null. */
  async invitation(token) { return answer(await this.backend.callRpc("tapestry_invitation", { token })); }

  /** An invitation taken up: answers the inviter's name. */
  async acceptInvite(token) { return answer(await this.backend.callRpc("tapestry_accept_invite", { token })); }

  async unlink(personId) { return answer(await this.backend.callRpc("tapestry_unlink", { person: personId })); }

  async saveCircle(circle) { return answer(await this.backend.callRpc("tapestry_save_circle", { circle })); }

  async deleteCircle(id) { return answer(await this.backend.delete("tapestry_circles", by(id))); }

  async addPlace(name) {
    const reply = await this.backend.insert("tapestry_places", { name: name.trim() });
    if (reply.ok) return { ok: true, data: reply.data[0], error: "" };
    return answer(reply);
  }

  async savePlace(id, { name, notes }) { return answer(await this.backend.update("tapestry_places", by(id), { name: name.trim(), notes })); }

  async deletePlace(id) { return answer(await this.backend.delete("tapestry_places", by(id))); }
}
