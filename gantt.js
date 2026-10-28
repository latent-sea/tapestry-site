// The member's timeline as a chart across the years: their periods, events
// and memories, all in one order by when each began - each a row of its own,
// named above its mark: a period a bar from its start to its end (or on to
// today, with an arrow, while it goes on), an event a shorter bar, a memory a
// dot (on a faint bar across a guess). Drawn for the stretch of time asked -
// all of it, or zoomed in on a few years, or months - with what falls outside
// it left out. Plain data in, an SVG's text out, tested by
// tests/test_gantt.mjs; the page puts it in place, drawn to the width it has
// so its words stay their size (site.js).
//
// Each period and event in its kind's colour (weave.js, kindColour) - the
// page's kind chips above it are its key, and its filter. Every mark is a
// link: each says what it is to a reader who can't see it, and its time as
// the pointer rests on it.
import { lastDayOf } from "./when.js?v=e43c69e994f9";
import { yearMarks, yearsOf } from "./woven.js?v=e43c69e994f9";

const SIDE = 12; // the room either side of the years
const TOP = 26; // the years' room
const ROW = 32; // a row's room: its name, then its mark
const BAR = 10;
const DOT = 5;
const BOTTOM = 10;
const KINDS = ["period", "event", "memory"];
const PART = { period: "periods", event: "events", memory: "memories" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const escape = (text) => String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Where a time ends, in years: the end of its day, month, year or decade. */
function endOf(when) { return when?.date ? yearsOf({ date: lastDayOf(when) }) + 1 / 365.25 : null; }

/** A name cut to what fits, so many letters to a pixel-width. */
function fitted(name, room, size) {
  const most = Math.max(4, Math.floor(room / (size * 0.56)));
  return name.length > most ? `${name.slice(0, most - 1)}…` : name;
}

/** What a mark says: its title, when, how long. */
const sayOf = (entry) => [entry.title, entry.said, entry.lasts].filter(Boolean).join(" · ");

/** Now, in years. */
const yearsNow = (now) => now.getFullYear() + (now.getMonth() + (now.getDate() - 1) / 31) / 12;

/**
 * The member's dated periods, events and memories, but those hidden -
 * hidden.periods and hidden.events, kinds of each left out ("" for none);
 * hidden.parts, whole parts ("periods", "events", "memories") - each with
 * where it runs, in years ({ entry, from, to, going }), in order by when it
 * began: of two together, the longer first, then a period before an event
 * before a memory.
 */
export function marksOf(weave, now = new Date(), hidden = {}) {
  const parts = hidden.parts ?? [];
  const today = yearsNow(now);
  return weave.thread(weave.meId).filter((entry) => entry.when?.date && !parts.includes(PART[entry.kind])
    && !(entry.kind === "period" && (hidden.periods ?? []).includes(entry.periodKind ?? ""))
    && !(entry.kind === "event" && (hidden.events ?? []).includes(entry.eventKind ?? "")))
    .map((entry) => {
      const from = yearsOf(entry.when);
      const going = entry.kind === "period" && !entry.until;
      return { entry, from, going, to: going ? Math.max(today, from + 1 / 12) : endOf(entry.until ?? entry.when) };
    })
    .sort((a, b) => a.from - b.from || b.to - a.to || KINDS.indexOf(a.entry.kind) - KINDS.indexOf(b.entry.kind) || a.entry.title.localeCompare(b.entry.title));
}

/** All of the timeline's time, whole years from the first thing's to the last's (or today): { from, to }, or null with nothing dated. */
export function extentOf(weave, now = new Date(), hidden = {}) {
  const marks = marksOf(weave, now, hidden);
  if (!marks.length) return null;
  const from = Math.floor(Math.min(...marks.map((m) => m.from)));
  return { from, to: Math.max(Math.ceil(Math.max(...marks.map((m) => m.to), yearsNow(now))), from + 1) };
}

/** Where the axis is marked: years (every 1, 5, 10 or 20) across a long stretch; months across a short one. */
function axisMarks(from, to) {
  const span = to - from;
  if (span > 3) return yearMarks(Math.ceil(from), Math.floor(to)).map((year) => ({ at: year, said: String(year) }));
  const every = span <= 1.5 ? 1 : 3;
  const marks = [];
  for (let month = Math.ceil(from * 12); month <= to * 12; month++) {
    if (month % every) continue;
    const year = Math.floor(month / 12);
    const index = month - year * 12;
    marks.push({ at: month / 12, said: index === 0 ? String(year) : MONTHS[index] });
  }
  return marks;
}

/**
 * The timeline drawn width wide, now being when it is now, but what is
 * hidden (marksOf), for the stretch range ({ from, to } in years; all of it
 * by default): everything overlapping it, a row each. Answers
 * { svg, width, height, rows, from, to } - rows being the marks' keys, top
 * to bottom - or null with nothing in it.
 */
export function drawTimeline(weave, width = 700, now = new Date(), colours = {}, hidden = {}, range = null, found = null) {
  const ink = colours.ink ?? "#eef2fa";
  const soft = colours.soft ?? "#8e9ab8";
  const grid = colours.grid ?? "#34426a";
  const dot = colours.memory ?? "#9db8ff";
  const lit = colours.found ?? "#f2c14e";
  const whole = extentOf(weave, now, hidden);
  if (!whole) return null;
  const from = range?.from ?? whole.from;
  const to = Math.max(range?.to ?? whole.to, from + 1 / 12);
  const marks = marksOf(weave, now, hidden).filter((m) => m.to >= from && m.from <= to);
  if (!marks.length) return null;
  const plot = width - 2 * SIDE;
  const x = (years) => SIDE + ((years - from) / (to - from)) * plot;
  // a mark past either edge runs to it
  const clamp = (at) => Math.min(Math.max(at, SIDE), width - SIDE);
  const today = yearsNow(now);
  const height = TOP + marks.length * ROW + BOTTOM;
  const out = [];
  // the axis, recessive, and today - a dashed line, the end of every period still going - beneath the marks
  for (const mark of axisMarks(from, to)) {
    out.push(`<line x1="${x(mark.at)}" y1="${TOP - 4}" x2="${x(mark.at)}" y2="${height - BOTTOM}" stroke="${grid}" stroke-width="1" opacity="0.5"/>`);
    out.push(`<text x="${x(mark.at)}" y="${TOP - 10}" fill="${soft}" font-size="11" text-anchor="middle">${mark.said}</text>`);
  }
  if (today >= from && today <= to) {
    out.push(`<line x1="${x(today)}" y1="${TOP - 4}" x2="${x(today)}" y2="${height - BOTTOM}" stroke="${ink}" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>`);
  }
  marks.forEach((m, i) => {
    const top = TOP + i * ROW;
    const { entry } = m;
    // the one opened from ("Show in timeline"), picked out
    if (range?.focus === entry.key) {
      out.push(`<rect x="2" y="${top - 2}" width="${width - 4}" height="${ROW}" rx="8" fill="${dot}" opacity="0.14" stroke="${dot}" stroke-opacity="0.6"/>`);
    }
    // what a search found, picked out; the rest faint behind it
    const hit = !!found?.has(entry.key);
    if (hit) out.push(`<rect x="2" y="${top - 2}" width="${width - 4}" height="${ROW}" rx="8" fill="${lit}" opacity="0.18" stroke="${lit}" stroke-width="1.5"/>`);
    const x1 = clamp(x(m.from));
    const x2 = Math.max(clamp(x(m.to)), x1 + (entry.kind === "memory" ? 0 : 6));
    // its name above its mark, from its start - or, near the right edge, ending there
    const name = fitted(entry.title, plot, 12);
    const words = name.length * 12 * 0.56;
    const label = x1 + words > width - SIDE
      ? `<text x="${width - SIDE}" y="${top + 12}" fill="${ink}" font-size="12" font-weight="600" text-anchor="end">${escape(name)}</text>`
      : `<text x="${x1}" y="${top + 12}" fill="${ink}" font-size="12" font-weight="600">${escape(name)}</text>`;
    let body;
    if (entry.kind === "memory") {
      // a moment: a dot at its time, or at the middle of a guess, on a faint bar across it
      const guess = x2 - x1 > DOT * 2;
      const cx = guess ? (x1 + x2) / 2 : x1;
      body = `${guess ? `<rect x="${x1}" y="${top + 20}" width="${x2 - x1}" height="4" rx="2" fill="${dot}" opacity="0.3"/>` : ""}<circle cx="${cx}" cy="${top + 22}" r="${DOT}" fill="${dot}"/>`;
    } else {
      const colour = entry.kind === "period" ? weave.kindColour(entry.periodKind) : weave.eventKindColour(entry.eventKind);
      const tall = entry.kind === "period" ? BAR : BAR - 2;
      // still going: an arrow on its end, at today
      const arrow = m.going && x(today) <= width - SIDE ? `<path d="M${x2 - 1} ${top + 17} l7 ${tall / 2} l-7 ${tall / 2} z" fill="${colour}"/>` : "";
      body = `<rect x="${x1}" y="${top + 17}" width="${x2 - x1}" height="${tall}" rx="${entry.kind === "period" ? 4 : 3}" fill="${colour}"/>${arrow}`;
    }
    out.push(`<a class="mark"${found && !hit ? ' opacity="0.3"' : ""}${hit ? ' data-found="yes"' : ""} data-key="${escape(entry.key)}" href="#${escape(entry.key.replace(":", "/"))}" aria-label="${escape(sayOf(entry))}"><title>${escape(sayOf(entry))}</title>`
      + `<rect x="${SIDE}" y="${top}" width="${plot}" height="${ROW - 2}" fill="transparent"/>${label}${body}</a>`);
  });
  const said = `Your timeline from ${Math.floor(from)} to ${Math.ceil(to)}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="group" aria-label="${escape(said)}" font-family="inherit">${out.join("")}</svg>`;
  return { svg, width, height, rows: marks.map((m) => m.entry.key), from, to };
}

/**
 * The stretch shown next, from this one ({ from, to }, or null for all of it) within all of it: zoomed in
 * ("in", half as long, about its middle), out ("out", twice as long, never past all of it), or moved a
 * third of its length earlier ("earlier") or later ("later"). Answers { from, to }, or null for all of it.
 */
export function rangeAfter(range, whole, step) {
  range = range ? { from: range.from, to: range.to } : null;
  if (!whole) return null;
  const { from, to } = range ?? whole;
  const span = to - from;
  const middle = (from + to) / 2;
  let next = { from, to };
  if (step === "in") next = { from: middle - span / 4, to: middle + span / 4 };
  if (step === "out") next = { from: middle - span, to: middle + span };
  if (step === "earlier") next = { from: from - span / 3, to: to - span / 3 };
  if (step === "later") next = { from: from + span / 3, to: to + span / 3 };
  return within(next, whole);
}

/**
 * The stretch shown after a pinch (or a trackpad's): this one ({ from, to }, or null for all of it)
 * zoomed by a factor - over 1 in, under 1 out - about a point at this fraction across it (0 its start,
 * 1 its end), which stays where it was. Answers { from, to }, or null for all of it.
 */
export function rangeZoomed(range, whole, factor, at = 0.5) {
  range = range ? { from: range.from, to: range.to } : null;
  if (!whole || !(factor > 0)) return range;
  const { from, to } = range ?? whole;
  const point = from + (to - from) * Math.min(Math.max(at, 0), 1);
  const span = (to - from) / factor;
  return within({ from: point - span * at, to: point + span * (1 - at) }, whole);
}

/** The stretch around one thing on the timeline: a month either side of it, and it picked out. */
export function rangeAround(entry) {
  if (!entry?.when?.date) return null;
  const from = yearsOf(entry.when);
  const to = endOf(entry.until ?? entry.when);
  return { from: from - 1 / 12, to: to + 1 / 12, focus: entry.key };
}

/** A stretch kept within all of it: never shorter than a month, nor wider than all of it (then null), nor past either end. */
function within(next, whole) {
  const middle = (next.from + next.to) / 2;
  if (next.to - next.from < 1 / 12) next = { from: middle - 1 / 24, to: middle + 1 / 24 };
  const length = Math.min(next.to - next.from, whole.to - whole.from);
  if (length >= whole.to - whole.from) return null;
  const start = Math.min(Math.max(next.from, whole.from), whole.to - length);
  return { from: start, to: start + length };
}
