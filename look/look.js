// The factory's look for the web: the one every app of the factory wears
// (services/look/look.gd, D-004), so an app on the web looks like the apps
// on a phone. Dark navy glass: a navy ground deepening to violet with two
// pools of light drifting across it, cards a shade lighter with an edge from
// the accent to the second, light words in Manrope, teal as the one strong
// accent and violet as the second; every button a glowing gradient pill.
//
//     import { FactoryLook, ACTION, LINK, DANGER, CARD } from "./look/look.js?v=e87b274f50a9";
//     look() { return FactoryLook.make(); }          // or make(palette, textSize)
//
// It is gd-chime's Look (its custom properties, --chime-<name>) with the
// factory's sheet (look.css) put in after gd-chime's, so it dresses gd-chime's
// own styles - the common button is the main action, a Card is the factory's
// card, a field outlines in the accent - and adds the factory's: ACTION,
// LINK, DANGER, CARD, QUIET, MARKED, TOGGLE_ON and TOGGLE_OFF. A site's own
// sheet comes after both, starting its rules at its root's id to win.
//
// THE RULES, the same as the apps' (docs/look-backlog.md): a control that
// can't be used looks faded and says nothing more (its reason stays for a
// screen reader, out of sight); every button looks like one - a pill, never
// words alone.

import { Look } from "../gd_chime/gd_chime.js?v=e87b274f50a9";

/** The factory's palette, as services/look/look.gd has it: the keys gd-chime reads, then the factory's own. */
export const PALETTE = Object.freeze({
  ground: "#121829",
  raised: "#1b2339",
  lit: "#34426a",
  ink: "#eef2fa",
  ink_soft: "#8e9ab8",
  accent: "#19c3b3",
  accent_2: "#7c5cff",
  warn: "#ff4f7b",
  edge: "#34426a",
  accent_end: "#2fd6e8",
  accent_2_end: "#c46bff",
  ground_deep: "#1c1540",
  danger: "#ff4f7b",
  danger_end: "#ff8f5a",
});

/** The factory's styles, by the names the apps' look gives them. */
export const ACTION = "FactoryAction";
export const LINK = "FactoryLink";
export const DANGER = "FactoryDanger";
export const CARD = "FactoryCard";
export const QUIET = "FactoryQuiet";
export const MARKED = "FactoryMarked";
export const TOGGLE_ON = "FactoryToggleOn";
export const TOGGLE_OFF = "FactoryToggleOff";

/** Text sizes a person may choose, as shares of the base (the apps' Settings offer the same idea, D-008). */
export const TEXT_SIZES = Object.freeze([["Small", 0.9], ["Normal", 1], ["Large", 1.15], ["Largest", 1.3]]);

const SHEET_ID = "factory-look";

export class FactoryLook extends Look {
  /** The factory's look in this palette (the factory's own, or one an app gives over it) at this text size. */
  static make(palette = PALETTE, textSize = 1) { return new FactoryLook({ ...PALETTE, ...palette }, textSize); }

  /** Worn: gd-chime's sheet and properties, then the factory's sheet, once, after it. */
  dress(element) {
    super.dress(element);
    element.classList.add("factory-look");
    const doc = element.ownerDocument;
    if (!doc.getElementById(SHEET_ID)) {
      const sheet = doc.createElement("link");
      sheet.id = SHEET_ID;
      sheet.rel = "stylesheet";
      sheet.href = new URL("./look.css", import.meta.url).href;
      doc.head.appendChild(sheet);
    }
    // the ground reaches the page's edges, however little stands on it
    doc.documentElement.style.background = `linear-gradient(180deg, ${this.palette.ground}, ${this.palette.ground_deep}) fixed ${this.palette.ground}`;
    element.style.minHeight = "100vh";
  }
}
