// Phone notifications, on this device (backend.sql, "phone notifications";
// sw.js shows them): turned on in You, the browser asked first, then the
// device's push address kept on the platform, for the member signed in.
// Signing out takes it off, so the next one to sign in here isn't sent
// someone else's. On an iPhone or iPad they come only once Tapestry is on
// the Home Screen - Apple's rule - so there it says how.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=0f4719403046";

export const TURNS_ON = "turns_on_notifications";
export const TURNS_OFF = "turns_off_notifications";

export const WORDS = {
  [TURNS_ON]: ["Turn on notifications"],
  [TURNS_OFF]: ["Turn them off on this device"],
};

/** The browser's own: whether it can, what it was told, and the service worker's registration. A probe hands its own. */
export function browserPush() {
  const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const onHomeScreen = navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
  return {
    kind: () => ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window ? "ready" : apple && !onHomeScreen ? "apple" : "none"),
    permission: () => Notification.permission,
    ask: () => Notification.requestPermission(),
    registration: async () => { await navigator.serviceWorker.register("sw.js"); return navigator.serviceWorker.ready; },
    // a notification pressed with Tapestry open: the tab goes where it points
    onOpen: (go) => navigator.serviceWorker?.addEventListener("message", (event) => { if (event.data?.opens) go(event.data.opens); }),
  };
}

/** A key as the browser takes it: its bytes, from base64url. */
function bytesOf(key) {
  const plain = atob(key.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(key.length / 4) * 4, "="));
  return Uint8Array.from(plain, (c) => c.charCodeAt(0));
}

export class Phone extends Controller {
  constructor(chimes, loom, account, push = browserPush()) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.push = push;
    // checking, on, off, blocked (refused in the browser's settings), apple (not on the Home Screen yet), or none (can't)
    this.state = this.value("checking");
    this.busy = this.value(false);
    this.problem = this.value("");
    account.leaving.push(() => this.leave());
    push.onOpen?.((url) => { location.href = url; });
  }

  answers() { return Object.keys(WORDS); }

  would(action) {
    if (this.busy.read()) return Phrase.of("A moment");
    if (action === TURNS_ON && this.state.read() !== "off") return Phrase.of("Not here");
    if (action === TURNS_OFF && this.state.read() !== "on") return Phrase.of("They're off");
    return null;
  }

  told(action) {
    this.problem.setValue("");
    if (action === TURNS_ON) this.turnOn();
    if (action === TURNS_OFF) this.turnOff();
    return null;
  }

  /** Where this device stands, on coming in: on, it is kept on for whoever is signed in now. */
  async check() {
    const kind = this.push.kind();
    if (kind !== "ready") { this.state.setValue(kind); return; }
    if (this.push.permission() === "denied") { this.state.setValue("blocked"); return; }
    try {
      const subscription = await (await this.push.registration()).pushManager.getSubscription();
      if (subscription) await this.keep(subscription);
      this.state.setValue(subscription ? "on" : "off");
    } catch {
      this.state.setValue("none");
    }
  }

  async keep(subscription) {
    const { endpoint, keys } = subscription.toJSON();
    return this.loom.addDevice(endpoint, keys.p256dh, keys.auth);
  }

  async turnOn() {
    this.busy.setValue(true);
    try {
      if ((await this.push.ask()) !== "granted") { this.state.setValue(this.push.permission() === "denied" ? "blocked" : "off"); return; }
      const key = await this.loom.pushKey();
      if (!key.ok) { this.problem.setValue(key.error); return; }
      const registration = await this.push.registration();
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytesOf(key.data) });
      const kept = await this.keep(subscription);
      if (!kept.ok) { await subscription.unsubscribe(); this.problem.setValue(kept.error); return; }
      this.state.setValue("on");
    } catch {
      this.problem.setValue("This browser wouldn't turn notifications on");
    } finally {
      this.busy.setValue(false);
    }
  }

  async turnOff() {
    this.busy.setValue(true);
    await this.leave();
    this.busy.setValue(false);
    this.state.setValue("off");
  }

  /** This device sent nothing more: the platform forgets it, and the browser its address. */
  async leave() {
    if (this.push.kind() !== "ready") return;
    const subscription = await (await this.push.registration()).pushManager.getSubscription();
    if (!subscription) return;
    await this.loom.removeDevice(subscription.endpoint);
    await subscription.unsubscribe();
  }
}

/** In You: notifications on this device, on or off - or how to get them, where they can't be had yet. */
export function describePhone(ui, phone, { heading, problem, LINK }) {
  const said = {
    on: "On, on this device: what is new for you - a tag, something shared, a comment, a question - comes here as it happens.",
    off: "Be told on this device as it happens: someone tags you, shares with you, comments, or asks you something.",
    blocked: "Notifications are blocked for Tapestry in this browser's settings. Allow them there, then come back here.",
    apple: "On an iPhone or iPad, notifications come only once Tapestry is on your Home Screen: press Share, then Add to Home Screen, and open Tapestry from there.",
    none: "This browser can't show notifications.",
  };
  return ui.when(phone.state.map((s) => s !== "checking"), ui.column([
    heading(ui, "Notifications"),
    ui.text(phone.state.map((s) => Phrase.of(said[s] ?? "")), "Hint").wraps(),
    ui.button(TURNS_ON).absentWhenRefused(),
    ui.button(TURNS_OFF, { style: LINK }).absentWhenRefused(),
    problem(ui, phone.problem),
  ]));
}
