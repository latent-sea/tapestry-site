// Going on the paid plan (backend.sql, "paying"): from the free plan's note,
// wherever keeping a thread of one's own is refused. In the Play app the
// page pays through Google Play's billing (the Digital Goods API, which only
// an app from Google Play has); on the website, through the website's
// checkout. Either way the store's answer is handed to the platform, which
// confirms it with the store - it alone holds the stores' keys - and then
// the member is on the paid plan, everywhere.

import { Controller, Phrase } from "./gd_chime/gd_chime.js?v=e87b274f50a9";
import { ACTION } from "./look/look.js?v=e87b274f50a9";
import { heading, notice, problem } from "./parts.js?v=e87b274f50a9";

export const PAID = "paid";
export const GOES_PAID = "goes_paid";
export const PAYS = "pays_for_the_paid_plan";

export const WORDS = {
  [GOES_PAID]: ["Go paid"],
  [PAYS]: ["Go paid"],
};

const PLAY_BILLING = "https://play.google.com/billing";
// the paid plan's subscription, as named in the Play Console
export const PRODUCT = "tapestry_paid";
// the website's checkout (a payment link of the website's payment provider): none until it is set up
export const WEB_CHECKOUT = "";

/** Whether the page is the Play app's: only it can pay through Google Play. */
export function inPlayApp() { return typeof globalThis.getDigitalGoodsService === "function"; }

export class Paying extends Controller {
  constructor(chimes, loom, account) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.price = this.value(""); // the plan's price as Google Play says it, in the Play app
    this.busy = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
  }

  answers() { return [PAYS]; }

  would(action) {
    if (action !== PAYS) return null;
    if (this.busy.read()) return Phrase.of("Paying");
    if (this.account.weave.read().writes) return Phrase.of("You're on the paid plan");
    if (!inPlayApp() && !WEB_CHECKOUT) return Phrase.of("Paying on the website opens soon");
    return null;
  }

  told(action) {
    if (action === PAYS) { if (inPlayApp()) this.payInPlay(); else this.payOnWeb(); }
    return null;
  }

  /** The screen opened: in the Play app, the price as Google Play says it. */
  async opened() {
    if (!inPlayApp() || this.price.read()) return;
    try {
      const service = await globalThis.getDigitalGoodsService(PLAY_BILLING);
      const [details] = await service.getDetails([PRODUCT]);
      if (details?.price && !this.disposed) this.price.setValue(new Intl.NumberFormat(undefined, { style: "currency", currency: details.price.currency }).format(details.price.value));
    } catch { /* the price is said by Google Play's own sheet as they pay */ }
  }

  /** Paid through Google Play's billing: its purchase token handed to the platform, which confirms it. */
  async payInPlay() {
    this.busy.setValue(true);
    this.problem.setValue("");
    this.notice.setValue("");
    try {
      const request = new PaymentRequest([{ supportedMethods: PLAY_BILLING, data: { sku: PRODUCT } }],
        { total: { label: "Tapestry", amount: { currency: "GBP", value: "0" } } });
      const response = await request.show();
      const kept = await this.loom.purchased("play", PRODUCT, response.details?.purchaseToken ?? "");
      await response.complete(kept.ok ? "success" : "fail");
      if (!kept.ok) this.problem.setValue(kept.error);
      else this.notice.setValue("Thank you. Your payment is being confirmed with Google Play: your life story opens as soon as it is.");
      await this.account.load();
    } catch (e) {
      // closed without paying: nothing to say
      if (e?.name !== "AbortError") this.problem.setValue("Google Play couldn't take the payment. Please try again.");
    }
    if (!this.disposed) this.busy.setValue(false);
  }

  /** Paid through the website's checkout, which knows them by their account and brings them back. */
  payOnWeb() {
    if (!WEB_CHECKOUT) return;
    location.href = `${WEB_CHECKOUT}?client_reference_id=${encodeURIComponent(this.account.weave.read().meId)}`;
  }
}

/** The paid plan: what it is, its price where the store says it, and going on it. */
export function describePaying(ui, paying, account) {
  const weave = account.weave;
  return ui.screen(PAID, [
    ui.text(Phrase.of("The paid plan"), "Title"),
    ui.when(weave.map((w) => w.writes), ui.text(Phrase.of("You're on the paid plan: your life story is yours to keep."), "Notice").wraps()),
    ui.when(weave.map((w) => !w.writes && !!w.me?.paying), ui.text(Phrase.of("Your payment is being confirmed: your life story opens as soon as it is."), "Notice").wraps()),
    heading(ui, "What it is"),
    ui.text(Phrase.of("Your own life story: memories with their words and pictures, events, periods and places, your timeline, and a copy of it all to keep. On the free plan you see what your people share with you, and comment on it."), "Words").wraps(),
    ui.text(paying.price.map((p) => (p ? Phrase.with("%s, through Google Play.", [p]) : "")), "Words").hidesEmpty(),
    ui.text(Phrase.of("In the Tapestry app you pay through Google Play; on the website, through its checkout. It's the same plan everywhere, cancelled where you bought it."), "Hint").wraps(),
    problem(ui, paying.problem),
    notice(ui, paying.notice),
    ui.text(ui.bound(() => (weave.read().writes ? "" : paying.would(PAYS) ?? "")), "Hint").wraps().hidesEmpty(),
    ui.when(weave.map((w) => !w.writes), ui.row([ui.button(PAYS, { style: ACTION })], "Actions")),
  ], null, { on_fill: () => paying.opened() });
}
