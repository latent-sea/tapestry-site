// The member's periods as a chart across the years: each period a row of its
// own, oldest first, a bar from its start to its end - or on to today, with
// an arrow, for one still going - named above it in words. Plain data in, an
// SVG's text out, tested by tests/test_gantt.mjs; the page puts it in place,
// drawn to the width it has so its words stay their size (site.js).
//
// Each bar in its kind's colour (weave.js, kindColour) - the page's kind
// chips above it are its key, and its filter - and named in words. Bars are links: each says what it is to a reader who
// can't see it, and its time and length as the pointer rests on it.
import { lastDayOf } from "./when.js?v=328f3a22fb80";
import { yearMarks, yearsOf } from "./woven.js?v=328f3a22fb80";

const SIDE = 12; // the room either side of the years
const TOP = 26; // the years' room
const ROW = 38; // a period's room: its name, then its bar
const BAR = 10;
const BOTTOM = 10;

const escape = (text) => String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Where a time ends, in years: the end of its day, month, year or decade. */
function endOf(when) { return when?.date ? yearsOf({ date: lastDayOf(when) }) + 1 / 365.25 : null; }

/** A name cut to what fits, so many letters to a pixel-width. */
function fitted(name, room, size) {
  const most = Math.max(4, Math.floor(room / (size * 0.56)));
  return name.length > most ? `${name.slice(0, most - 1)}…` : name;
}

/**
 * The member's dated periods, but those of the kinds hidden ("" for none),
 * drawn width wide, now being when it is now:
 * { svg, width, height, rows } - rows being the periods' keys, top to bottom
 * - or null when none has a time.
 */
export function drawPeriods(weave, width = 700, now = new Date(), colours = {}, hidden = []) {
  const ink = colours.ink ?? "#eef2fa";
  const soft = colours.soft ?? "#8e9ab8";
  const grid = colours.grid ?? "#34426a";
  const periods = weave.thread(weave.meId).filter((entry) => entry.kind === "period" && entry.when?.date && !hidden.includes(entry.periodKind ?? ""))
    .map((entry) => ({ entry, from: yearsOf(entry.when), going: !entry.until }))
    .map((p) => ({ ...p, to: p.going ? null : endOf(p.entry.until) }));
  if (!periods.length) return null;
  const today = now.getFullYear() + (now.getMonth() + (now.getDate() - 1) / 31) / 12;
  for (const p of periods) p.to ??= Math.max(today, p.from + 1 / 12);
  // oldest first; of two starting together, the longer first
  periods.sort((a, b) => a.from - b.from || b.to - a.to);
  const first = Math.floor(Math.min(...periods.map((p) => p.from)));
  const last = Math.max(Math.ceil(Math.max(...periods.map((p) => p.to), today)), first + 1);
  const plot = width - 2 * SIDE;
  const x = (years) => SIDE + ((years - first) / (last - first)) * plot;
  const height = TOP + periods.length * ROW + BOTTOM;
  const out = [];
  // the years, recessive
  for (const year of yearMarks(first, last)) {
    out.push(`<line x1="${x(year)}" y1="${TOP - 4}" x2="${x(year)}" y2="${height - BOTTOM}" stroke="${grid}" stroke-width="1" opacity="0.5"/>`);
    out.push(`<text x="${x(year)}" y="${TOP - 10}" fill="${soft}" font-size="11" text-anchor="middle">${year}</text>`);
  }
  // today: a dashed line, the end of every period still going
  if (today <= last) {
    out.push(`<line x1="${x(today)}" y1="${TOP - 4}" x2="${x(today)}" y2="${height - BOTTOM}" stroke="${ink}" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>`);
  }
  periods.forEach((p, i) => {
    const top = TOP + i * ROW;
    const colour = weave.kindColour(p.entry.periodKind);
    const x1 = x(p.from);
    const x2 = Math.max(x(p.to), x1 + 6);
    const said = `${p.entry.title} · ${p.entry.said}${p.entry.lasts ? ` · ${p.entry.lasts}` : ""}`;
    // its name above its bar, from its start - or, near the right edge, ending at its end
    const name = fitted(p.entry.title, plot, 12);
    const roomRight = width - SIDE - x1;
    const atEnd = roomRight < name.length * 12 * 0.56 && x2 - SIDE > roomRight;
    const label = atEnd
      ? `<text x="${x2}" y="${top + 14}" fill="${ink}" font-size="12" font-weight="600" text-anchor="end">${escape(name)}</text>`
      : `<text x="${x1}" y="${top + 14}" fill="${ink}" font-size="12" font-weight="600">${escape(name)}</text>`;
    // still going: an arrow on its end, at today
    const arrow = p.going ? `<path d="M${x2 - 1} ${top + 19} l7 ${BAR / 2} l-7 ${BAR / 2} z" fill="${colour}"/>` : "";
    out.push(`<a class="mark" data-key="${escape(p.entry.key)}" href="#${escape(p.entry.key.replace(":", "/"))}" aria-label="${escape(said)}"><title>${escape(said)}</title>`
      + `<rect x="${x1}" y="${top}" width="${Math.max(x2 - x1, 1)}" height="${ROW - 4}" fill="transparent"/>`
      + `${label}<rect x="${x1}" y="${top + 19}" width="${x2 - x1}" height="${BAR}" rx="4" fill="${colour}"/>${arrow}</a>`);
  });
  const said = `Your periods from ${first} to ${last}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="group" aria-label="${escape(said)}" font-family="inherit">${out.join("")}</svg>`;
  return { svg, width, height, rows: periods.map((p) => p.entry.key) };
}
