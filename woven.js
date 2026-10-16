// The tapestry drawn: each thread a lane of its own across the years, named
// at its start in words, in its colour; a period a thick run along its lane,
// a memory a dot on it, and an event a knot - a line down through the lanes
// of everyone at it, a dot on each. Plain data in, an SVG's text out, tested
// by tests/test_woven.mjs; the page puts it in place and makes each mark
// open what it is (site.js).
//
// Marks are links: each says what it is to a reader who can't see it, and
// what it is and when as the pointer rests on it.
import { lastDayOf } from "./when.js?v=780e7fa78a33";

const LEFT = 100; // the names' room
const PLOT = 580; // so the whole is about as wide as the column it stands in, and its words their size
const RIGHT = 20;
const TOP = 30; // the years' room
const LANE = 44;
const BOTTOM = 12;

const escape = (text) => String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A time as a year with its fraction: 2006.41 for late May 2006. */
export function yearsOf(when) {
  if (!when?.date) return null;
  const [y, m, d] = when.date.split("-").map(Number);
  return y + ((m - 1) * 30.44 + (d - 1)) / 365.25;
}

/** Where a time ends, in years: the end of its day, month, year or decade. */
function endOf(when) { return when?.date ? yearsOf({ date: lastDayOf(when) }) + 1 / 365.25 : null; }

/** Years to mark along the top, every so many as the span asks. */
export function yearMarks(from, to) {
  const span = to - from;
  const every = span <= 12 ? 1 : span <= 30 ? 5 : span <= 80 ? 10 : 20;
  const marks = [];
  for (let y = Math.ceil(from / every) * every; y <= to; y += every) marks.push(y);
  return marks;
}

/**
 * The picture of these threads (accounts, in order), as far as the weave
 * shows them, now being the year it is now: { svg, height, width, marks } -
 * marks being each drawn thing's key - or null when nothing dated is there.
 */
export function drawWoven(weave, accounts, now = new Date(), colours = {}) {
  const ground = colours.ground ?? "#121829";
  const ink = colours.ink ?? "#eef2fa";
  const soft = colours.soft ?? "#8e9ab8";
  const grid = colours.grid ?? "#34426a";
  const lanes = new Map(accounts.map((account, i) => [account, i]));
  const entries = weave.woven(accounts).filter((entry) => entry.when?.date);
  if (!entries.length) return null;
  const thisYear = now.getFullYear() + (now.getMonth() + 0.5) / 12;
  const starts = entries.map((entry) => yearsOf(entry.when));
  const ends = entries.map((entry) => (entry.until ? endOf(entry.until) : entry.kind === "period" ? thisYear : yearsOf(entry.when)));
  const from = Math.floor(Math.min(...starts));
  const to = Math.max(Math.ceil(Math.max(...ends)), from + 1);
  const x = (years) => LEFT + ((years - from) / (to - from)) * PLOT;
  const y = (account) => TOP + lanes.get(account) * LANE + LANE / 2;
  const height = TOP + accounts.length * LANE + BOTTOM;
  const width = LEFT + PLOT + RIGHT;
  const out = [];
  const marks = [];
  const link = (entry, inner) => {
    marks.push(entry.key);
    const said = `${entry.title}${entry.said ? ` · ${entry.said}` : ""}`;
    return `<a class="mark" data-key="${escape(entry.key)}" href="#${escape(entry.key.replace(":", "/"))}" aria-label="${escape(said)}"><title>${escape(said)}</title>${inner}</a>`;
  };

  // the years, recessive
  for (const year of yearMarks(from, to)) {
    out.push(`<line x1="${x(year)}" y1="${TOP - 6}" x2="${x(year)}" y2="${height - BOTTOM}" stroke="${grid}" stroke-width="1" opacity="0.5"/>`);
    out.push(`<text x="${x(year)}" y="${TOP - 12}" fill="${soft}" font-size="12" text-anchor="middle">${year}</text>`);
  }
  // each thread: its name in words, its line from its first thing to its last (or now)
  for (const account of accounts) {
    const own = entries.filter((entry) => entry.owner === account || (entry.kind === "event" && entry.threads.includes(account)));
    const colour = weave.colourOf(account);
    out.push(`<circle cx="10" cy="${y(account)}" r="5" fill="${colour}"/>`);
    out.push(`<text x="22" y="${y(account) + 4}" fill="${ink}" font-size="13" font-weight="600">${escape(weave.nameOf(account))}</text>`);
    if (!own.length) continue;
    const first = Math.min(...own.map((entry) => yearsOf(entry.when)));
    const last = Math.max(...own.map((entry) => (entry.until ? yearsOf(entry.until) : entry.kind === "period" ? thisYear : yearsOf(entry.when))));
    out.push(`<line x1="${x(first)}" y1="${y(account)}" x2="${x(Math.max(last, first + 0.05))}" y2="${y(account)}" stroke="${colour}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>`);
  }
  // periods: thick runs along their owner's lane
  for (const entry of entries.filter((e) => e.kind === "period" && lanes.has(e.owner))) {
    const x1 = x(yearsOf(entry.when));
    const x2 = Math.max(x(entry.until ? endOf(entry.until) : thisYear), x1 + 8);
    const colour = weave.colourOf(entry.owner);
    out.push(link(entry, `<rect x="${x1}" y="${y(entry.owner) - 6}" width="${x2 - x1}" height="12" rx="6" fill="${colour}" fill-opacity="0.35" stroke="${colour}" stroke-width="2"/>`));
  }
  // memories: dots on their owner's lane, ringed in the ground so neighbours stay apart; a memory
  // guessed between two edges is a dot at the middle of a faint bar across them
  for (const entry of entries.filter((e) => e.kind === "memory" && lanes.has(e.owner))) {
    const colour = weave.colourOf(entry.owner);
    if (!entry.until) {
      out.push(link(entry, `<circle cx="${x(yearsOf(entry.when))}" cy="${y(entry.owner)}" r="5" fill="${colour}" stroke="${ground}" stroke-width="2"/>`));
      continue;
    }
    const x1 = x(yearsOf(entry.when));
    const x2 = x(endOf(entry.until));
    const cy = y(entry.owner);
    out.push(link(entry, `<line x1="${x1}" y1="${cy}" x2="${x2}" y2="${cy}" stroke="${colour}" stroke-width="6" stroke-linecap="round" opacity="0.3"/>`
      + `<circle cx="${(x1 + x2) / 2}" cy="${cy}" r="5" fill="${colour}" stroke="${ground}" stroke-width="2"/>`));
  }
  // events: a knot through the lanes of everyone at it who is drawn
  for (const entry of entries.filter((e) => e.kind === "event")) {
    const at = entry.threads.filter((account) => lanes.has(account)).sort((a, b) => lanes.get(a) - lanes.get(b));
    if (!at.length) continue;
    const cx = x(yearsOf(entry.when));
    const knot = [];
    // an event that lasts: a run along each lane through it, from its start to its end
    if (entry.until) {
      const x2 = Math.max(x(endOf(entry.until)), cx + 8);
      for (const account of at) {
        knot.push(`<rect x="${cx}" y="${y(account) - 4}" width="${x2 - cx}" height="8" rx="4" fill="${weave.colourOf(account)}" fill-opacity="0.45"/>`);
      }
    }
    if (at.length > 1) knot.push(`<line x1="${cx}" y1="${y(at[0])}" x2="${cx}" y2="${y(at[at.length - 1])}" stroke="${ink}" stroke-width="2" opacity="0.7"/>`);
    for (const account of at) knot.push(`<circle cx="${cx}" cy="${y(account)}" r="6" fill="${weave.colourOf(account)}" stroke="${ink}" stroke-width="2"/>`);
    out.push(link(entry, knot.join("")));
  }
  const said = `The tapestry from ${from} to ${to}: ${accounts.map((a) => weave.nameOf(a)).join(", ")}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="group" aria-label="${escape(said)}" font-family="inherit">${out.join("")}</svg>`;
  return { svg, width, height, marks };
}
