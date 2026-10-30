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

import { Backend } from "./backend/backend.js?v=874a7fa5f28c";
import { drawSignIn, takeGoogleRedirect } from "./backend/google.js?v=874a7fa5f28c";
import { shrinkPicture } from "./backend/pictures.js?v=874a7fa5f28c";

// the parts of a place's address, each its own column (backend.sql, "places")
const ADDRESS = ["street", "street_2", "town", "region", "postcode", "country"];

// public: the platform's address and its publishable key belong in the page
const PLATFORM = "https://api.latent-sea.com";
const KEY = "sb_publishable_BqVtSYE4ysOb2sHMuFSwMk_HrTAUgLx";
// public: the Google client the platform accepts (platform/supabase/platform.yml)
const GOOGLE_CLIENT = "400837578052-jqnhh565es3a92k58u5r2oggdcf7mrkr.apps.googleusercontent.com";
// on a phone, Google sends people back only to an address its client lists, and Tapestry's isn't listed
// yet: it comes back through The Hatch's, on the same site, which hands the answer straight on (web/backend's
// google.js, relayGoogleAnswer)
const SIGNS_IN_VIA = { address: "https://latent-sea.github.io/thehatch.tech/", as: "tapestry" };

const APP = "tapestry";
// a picture's small copy, for cards and lists: its longest side at most this
const THUMB = 400;

/** A failure's words for a person: the platform's own for one it raised, else plain ones. */
export function said(reply) {
  if (reply.ok) return "";
  if (reply.status === 0) return "Tapestry can't be reached. Please check your connection and try again.";
  if (reply.status >= 500 || !reply.data?.message) return "Something went wrong on our side. Please try again in a moment.";
  return reply.data.message;
}

const answer = (reply, data = reply.data) => ({ ok: reply.ok, data: reply.ok ? data : null, error: said(reply) });
const by = (id) => `id=eq.${encodeURIComponent(id)}`;

// what may still be asked while seeing Tapestry as someone else: nothing that changes anything, nor anything of
// the one looking's own (their texts, their finding) that would show through
const READS = new Set(["restore", "playerId", "userName", "drawGoogleButton", "googleAnswer", "signInWithGoogle", "signOut", "mayJoin",
  "visible", "viewAs", "pictureAddresses", "pictureData", "platformStatus", "adminView", "reportsView", "feedbackList", "invitation", "findPublic", "openedNow",
  "pushKey", "addDevice", "removeDevice", // a device's notifications are the one signed in's own, whoever they are seeing as
  "portalState", "portalKeep", "portalOverview", "portalMembers", "portalMember", "portalDecisions", "portalLog", "portalRequests"]); // the portal is theirs, not who they see as

/**
 * The loom, or a stand-in for it, kept from changing anything while seeing as someone else: guarded.seeing is
 * who (null for no one), and every call but a read is refused while it is someone.
 */
export function guarded(loom) {
  const guard = { seeing: null };
  return new Proxy(loom, {
    get(target, name) {
      if (name === "seeing") return guard.seeing;
      const value = target[name];
      if (typeof value !== "function") return value;
      return (...given) => (guard.seeing && !READS.has(name)
        ? Promise.resolve({ ok: false, data: null, error: "Seeing Tapestry as someone else: nothing is changed" })
        : value.apply(target, given));
    },
    set(target, name, value) {
      if (name === "seeing") { guard.seeing = value; return true; }
      target[name] = value;
      return true;
    },
  });
}

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

  drawGoogleButton(element, signedIn) {
    return drawSignIn(element, GOOGLE_CLIENT, signedIn, { theme: "outline", text: "continue_with" }, "Continue with Google", SIGNS_IN_VIA);
  }

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

  /**
   * Everything the member may see, as light as the platform sends it
   * (tapestry_visible_light: what is empty left out, long memories cut short);
   * from a platform from before, in full (tapestry_visible). Pictures'
   * addresses are asked for as they are shown (pictureAddresses).
   */
  async visible(focus = null) {
    // an event opened: every memory of it (of any other big one, only its newest are sent)
    let reply = focus ? await this.backend.callRpc("tapestry_visible_light_of", { focus }) : await this.backend.callRpc("tapestry_visible_light");
    if (!reply.ok && reply.status === 404) reply = await this.backend.callRpc("tapestry_visible");
    if (!reply.ok) return answer(reply);
    return { ok: true, data: { tapestry: reply.data ?? { me: null } }, error: "" };
  }

  /** Addresses that show these pictures, by their paths, for an hour: { ok, data: { path: address } }. */
  async pictureAddresses(paths) { return answer(await this.backend.privatePictureAddresses(paths)); }

  /** Memories' words in full, by their ids, as far as the member sees them: { ok, data: { id: words } }. */
  async memoryTexts(ids) { return answer(await this.backend.callRpc("tapestry_memory_texts", { ids })); }

  /** Which of these memories hold every one of these words in their words in full: { ok, data: [id] }. */
  async findInTexts(ids, words) { return answer(await this.backend.callRpc("tapestry_find_in_texts", { ids, words })); }

  /** The member's notices seen (tapestry_notices_seen); a platform from before has none to see. */
  async noticesSeen() { return answer(await this.backend.callRpc("tapestry_notices_seen")); }

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

  /** The member taken off a period someone else put them in. */
  async leavePeriod(id) { return answer(await this.backend.callRpc("tapestry_leave_period", { period: id })); }

  // --- pictures ---

  /** A picture shrunk, kept privately and added to one of the member's memories. */
  async addPicture(memoryId, file, position = 0, caption = "") {
    const name = crypto.randomUUID();
    const big = await shrinkPicture(file, 1600);
    const kept = await this.backend.uploadPrivatePicture(APP, `${name}.jpg`, big);
    if (kept.status === 413) return { ok: false, data: null, error: "That picture is too big. Please choose one under 10 MB." };
    if (!kept.ok) return answer(kept);
    // and a small copy, for cards and lists: without it, the picture is shown there whole
    const thumb = await shrinkPicture(file, THUMB, 0.8);
    const small = await this.backend.uploadPrivatePicture(APP, `${name}-thumb.jpg`, thumb);
    // its size as kept, both together: what the admin portal counts
    const bytes = (big?.size ?? 0) + (small.ok ? thumb?.size ?? 0 : 0);
    return answer(await this.backend.insert("tapestry_pictures", { memory_id: memoryId, path: kept.data.path, position, caption: caption.trim(), bytes,
      ...(small.ok ? { thumb_path: small.data.path } : {}) }));
  }

  /** A small copy made of one of the member's pictures from before there were any: from its address, kept beside it. */
  async makeThumb(id, path, address) {
    try {
      const got = await fetch(address);
      if (!got.ok) return { ok: false, data: null, error: "The picture couldn't be fetched" };
      const small = await this.backend.uploadPrivatePicture(APP, `${crypto.randomUUID()}-thumb.jpg`, await shrinkPicture(await got.blob(), THUMB, 0.8));
      if (!small.ok) return answer(small);
      return answer(await this.backend.update("tapestry_pictures", by(id), { thumb_path: small.data.path }));
    } catch {
      return { ok: false, data: null, error: "The picture couldn't be fetched" };
    }
  }

  /** A picture taken off its memory, then its file: never a picture gone from a memory that keeps it. */
  async removePicture(id, path, thumb = null) {
    const gone = answer(await this.backend.delete("tapestry_pictures", by(id)));
    if (gone.ok) await this.backend.removePrivatePictures([path, thumb].filter(Boolean));
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

  /** Two of the member's people found to be one: everything of the first folded into the second, the first gone. */
  async mergePeople(from, into) { return answer(await this.backend.callRpc("tapestry_merge_people", { from_person: from, into_person: into })); }

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
  async adminSetPlan(member, plan) { return answer(await this.backend.callRpc("tapestry_admin_set_plan", { member, plan })); }

  /** A report dealt with by an admin: what was reported taken off (removed), or let be. */
  async adminSettleReport(report, removed) { return answer(await this.backend.callRpc("tapestry_admin_settle_report", { report, removed })); }

  // --- moderating, and support ---

  // --- the admin portal: opened by a code from an authenticator app (backend.sql, "the admin portal") ---

  /** The portal's door for them: { open, second_factor, admin }. */
  async portalState() { return answer(await this.backend.callRpc("tapestry_portal_state")); }

  /** The authenticator apps set up on their sign-in - the platform's own second factor, shared with its own portal: [{ id, status }]. */
  async authenticators() { return answer(await this.backend.authenticators()); }

  /** An authenticator set up, the first time: { id, totp: { picture, secret } } to scan, or type in. Counts once its first code is given. */
  async enrolAuthenticator(name) { return answer(await this.backend.enrolAuthenticator(name)); }

  /** An authenticator taken off before it counted: one set up and never finished. */
  async removeAuthenticator(id) { return answer(await this.backend.removeAuthenticator(id)); }

  /** A code from their authenticator: this sign-in raised to know them surely (aal2). */
  async verifyAuthenticator(id, code) {
    const raised = await this.backend.verifyAuthenticator(id, code);
    if (raised.ok) return answer(raised);
    // the sign-in service's words for it, said plainly
    const words = String(raised.data?.msg ?? raised.data?.message ?? raised.data?.error_description ?? raised.error ?? "");
    if (raised.status === 429) return { ok: false, data: null, error: "Too many tries: wait a few minutes, then enter the code showing then." };
    if (/invalid|code|mfa/i.test(words) && raised.status < 500) return { ok: false, data: null, error: "That code isn't right: enter the six digits your authenticator app shows now." };
    return answer(raised);
  }

  /** The portal opened for an hour, by a sign-in that has just given its code. */
  async portalOpen() { return answer(await this.backend.callRpc("tapestry_portal_open")); }

  /** The portal used: open another hour. */
  async portalKeep() { return answer(await this.backend.callRpc("tapestry_portal_keep")); }

  /** The portal closed, for this sign-in. */
  async portalClose() { return answer(await this.backend.callRpc("tapestry_portal_close")); }

  async portalOverview() { return answer(await this.backend.callRpc("tapestry_portal_overview")); }

  async portalMembers() { return answer(await this.backend.callRpc("tapestry_portal_members")); }

  /** One member's details, as counts - written down, and they see it was. */
  async portalMember(member) { return answer(await this.backend.callRpc("tapestry_portal_member", { member })); }

  async portalDecisions() { return answer(await this.backend.callRpc("tapestry_portal_decisions")); }

  async portalLog() { return answer(await this.backend.callRpc("tapestry_portal_log")); }

  async portalRequests() { return answer(await this.backend.callRpc("tapestry_portal_requests")); }

  /** A privacy request or notice written down: { received, from_whom, kind, details }. */
  async portalLogRequest(request) { return answer(await this.backend.callRpc("tapestry_portal_log_request", { request })); }

  /** A request answered: done or refused, saying what was done or why not. */
  async portalCloseRequest(request, status, outcome) { return answer(await this.backend.callRpc("tapestry_portal_close_request", { request, status, outcome })); }

  /** That the member opened Tapestry, kept to the hour. */
  async seen() { return answer(await this.backend.callRpc("tapestry_seen")); }

  /** What is reported, in full, for those who moderate. */
  async reportsView() { return answer(await this.backend.callRpc("tapestry_reports_view")); }

  /** A report dealt with: what it is of removed (saying why, and whether it broke the terms or the law: "terms" or "law"), or let be. */
  async settleReport(report, removed, reason, ground = "terms") { return answer(await this.backend.callRpc("tapestry_settle_report", { report, removed, reason, ground })); }

  async adminSetModerator(member, moderates) { return answer(await this.backend.callRpc("tapestry_admin_set_moderator", { member, moderates })); }

  /** Tapestry's support let see the member's account as it is, for so many hours; 0 stops it. */
  async letSupport(hours) { return answer(await this.backend.callRpc("tapestry_let_support", { hours })); }

  /** What a member sees, as support sees it: masked, unless they let support in. */
  async viewAs(member) {
    const reply = await this.backend.callRpc("tapestry_view_as", { member });
    return reply.ok ? { ok: true, data: { tapestry: reply.data }, error: "" } : answer(reply);
  }

  // --- keeping Tapestry kind, and leaving it ---

  /** Tapestry's terms agreed to: on joining, or once by everyone here before there were terms. */
  async agree() { return answer(await this.backend.callRpc("tapestry_agree")); }

  /** Said on joining, or once by everyone here before it was asked: 14 or over, and Tapestry may keep what they write about themselves; the terms agreed to with it. */
  async confirm(over14, letsKeep) { return answer(await this.backend.callRpc("tapestry_confirm", { over_14: !!over14, lets_keep: !!letsKeep })); }

  /** Another member blocked (blocking), or no longer: neither sees anything of the other's. */
  async block(member, blocking) { return answer(await this.backend.callRpc("tapestry_block", { member, blocking })); }

  /** A memory, or a comment, reported to Tapestry's admins as breaking its terms, and why. */
  async report(memory, comment, reason) {
    return answer(await this.backend.callRpc("tapestry_report", { the_memory: memory || null, the_comment: comment || null, reason }));
  }

  /** An event, a period or a place of someone else's reported to Tapestry's moderators as breaking its terms or the law, and why. */
  async reportThing(kind, id, reason) { return answer(await this.backend.callRpc("tapestry_report_thing", { kind, id, reason })); }

  /** Everything Tapestry keeps about the member that their life doesn't show: for their copy. */
  async myData() { return answer(await this.backend.callRpc("tapestry_my_data")); }

  /** The member's own account deleted - everything of theirs - then their pictures' files, then signed out. */
  async deleteMe(paths = []) {
    const gone = answer(await this.backend.callRpc("tapestry_delete_me"));
    if (!gone.ok) return gone;
    for (let at = 0; at < paths.length; at += 100) await this.backend.removePrivatePictures(paths.slice(at, at + 100));
    await this.signOut();
    return gone;
  }

  // --- lives ---

  /** Whom the member lets record their death: accounts of their linked people. */
  async setDeathKeepers(keepers) { return answer(await this.backend.callRpc("tapestry_set_death_keepers", { keepers })); }

  /** A death recorded (a date and how exactly it is known), or taken back (null), by one its member chose. */
  async recordDeath(member, died, exactly) { return answer(await this.backend.callRpc("tapestry_record_death", { member, died, exactly })); }

  /** When one of the member's people was born and died: { born, born_precision, died, died_precision }, each null for not known. */
  async savePersonLife(id, life) { return answer(await this.backend.update("tapestry_people", by(id), life)); }

  // --- feedback ---

  async sendFeedback(kind, words) { return answer(await this.backend.callRpc("tapestry_send_feedback", { kind, words })); }

  /** The member's feedback - everyone's, for an admin - each with its replies. */
  async feedbackList() { return answer(await this.backend.callRpc("tapestry_feedback_list")); }

  async replyFeedback(id, words) { return answer(await this.backend.callRpc("tapestry_reply_feedback", { feedback: id, words })); }

  async setFeedbackStatus(id, status) { return answer(await this.backend.callRpc("tapestry_set_feedback_status", { feedback: id, status })); }

  /** What a store gave the page for a purchase, handed over to wait until the platform confirms it with the store. */
  async purchased(store, product, token) { return answer(await this.backend.callRpc("tapestry_purchased", { store, product, token })); }

  /** A comment on a memory the member sees: { ok, data: its id }. */
  async comment(memoryId, words) { return answer(await this.backend.callRpc("tapestry_comment", { the_memory: memoryId, words })); }

  /** A comment taken off, by its writer or the memory's owner. */
  async deleteComment(id) { return answer(await this.backend.callRpc("tapestry_delete_comment", { comment: id })); }

  async adminSet(member, admin) { return answer(await this.backend.callRpc("tapestry_admin_set", { member, admin })); }

  /** How the server is: { result, commit, at } (platform/bin/deploy's status, open to anyone). */
  /** What anyone shared with everyone on Tapestry, holding every word looked for: [{ kind, id, title, starts, starts_precision, town, owner_name }]. */
  async findPublic(looked) { return answer(await this.backend.callRpc("tapestry_find_public", { looked })); }

  /** Someone else's event or period the member was put at: yes, on their life by their own name for it; or no, off it. */
  async take(kind, id, yes, title) { return answer(await this.backend.callRpc("tapestry_take", { kind, id, yes, title })); }

  /** What waits in an event or period the member runs - a memory of it, or an event in a period - approved, or not. */
  async approve(kind, id, what, thing, yes) { return answer(await this.backend.callRpc("tapestry_approve", { kind, id, what, thing, yes })); }

  /** A memory liked by the member, or no longer. */
  async like(memory, yes) { return answer(await this.backend.callRpc("tapestry_like", { memory, yes })); }

  /** A memory pinned to the top of an event or period the member runs, or no longer. */
  async pin(kind, id, memory, yes) { return answer(await this.backend.callRpc("tapestry_pin", { kind, id, memory, yes })); }

  /** A memory taken off an event or period the member runs: it stays its writer's. */
  async takeOff(kind, id, memory) { return answer(await this.backend.callRpc("tapestry_take_off", { kind, id, memory })); }

  /** Someone at an event or period made one of its admins, or no longer. */
  async setAdmin(kind, id, account, yes) { return answer(await this.backend.callRpc("tapestry_set_admin", { kind, id, account, yes })); }

  /** An event or period opened, now: what is added after is new to the member. */
  async openedNow(kind, id) { return answer(await this.backend.callRpc("tapestry_opened_now", { kind, id })); }

  /** One found opened: among what the member sees from now on. */
  async look(kind, id) { return answer(await this.backend.callRpc("tapestry_look", { kind, id })); }

  /** The platform's public key for phone notifications (platform/bin/send-push): a device subscribes with it. */
  async pushKey() {
    try {
      const reply = await fetch(`${PLATFORM}/platform/push-key`);
      const key = reply.ok ? (await reply.json()).key : "";
      return key ? { ok: true, data: key, error: "" } : { ok: false, data: null, error: "Notifications aren't ready on the server yet. Try again in a few minutes." };
    } catch {
      return { ok: false, data: null, error: "The server didn't answer" };
    }
  }

  /** This device, to be sent what is new for the member (backend.sql, "phone notifications"). */
  async addDevice(endpoint, p256dh, auth) { return answer(await this.backend.callRpc("tapestry_add_device", { endpoint, p256dh, auth })); }

  /** This device, sent nothing more. */
  async removeDevice(endpoint) { return answer(await this.backend.callRpc("tapestry_remove_device", { endpoint })); }

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

  async askMergePeriod(from, into) { return answer(await this.backend.callRpc("tapestry_ask_merge_period", { from_period: from, into_period: into })); }

  /** One of the member's memories made a period, named and of the kind they say: answers { period, kept }, kept when the memory stays too. */
  async periodOfMemory(memoryId, named = "", kind = "") {
    return answer(await this.backend.callRpc("tapestry_period_of_memory", { the_memory: memoryId, named, kind }));
  }

  /** An event made of one of the member's own memories (or the one it is of): its id. */
  /** One of the member's memories made an event, named as they say: { ok, data: the event's id }. A platform from before names it itself. */
  async eventOfMemory(memoryId, named = "") {
    const made = await this.backend.callRpc("tapestry_event_of_memory", { the_memory: memoryId, named });
    if (!made.ok && made.status === 404) return answer(await this.backend.callRpc("tapestry_event_of_memory", { the_memory: memoryId }));
    return answer(made);
  }

  /** "I was there too": asking the owner of a memory to be at it, as an event. */
  async askShareMemory(memoryId) { return answer(await this.backend.callRpc("tapestry_ask_share_memory", { the_memory: memoryId })); }

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

  /** A place's name, notes and address: { name, notes, street, street_2, town, region, postcode, country }, every part of its address as typed. */
  async savePlace(id, place) {
    const parts = Object.fromEntries(ADDRESS.map((part) => [part, String(place[part] ?? "").trim()]));
    return answer(await this.backend.update("tapestry_places", by(id), { name: place.name.trim(), notes: place.notes ?? "", ...parts }));
  }

  async deletePlace(id) { return answer(await this.backend.delete("tapestry_places", by(id))); }
}
