// The member's timeline as a chart across the years: their periods, each a
// row of its own, oldest first, a bar from its start to its end - or on to
// today, with an arrow, for one still going - named above it in words; then
// the events they were at, each a bar named beside it, set in as few rows as
// they fit; then their memories, each a dot at its time (on a faint bar
// across a guess), set in as few rows as they fit. Plain data in, an SVG's
// text out, tested by tests/test_gantt.mjs; the page puts it in place, drawn
// to the width it has so its words stay their size (site.js).
//
// Each period and event in its kind's colour (weave.js, kindColour) - the
// page's kind chips above it are its key, and its filter. Every mark is a
// link: each says what it is to a reader who can't see it, and its time as
// the pointer rests on it.
import { lastDayOf } from "./when.js?v=a72a3c00d32b";
import { yearMarks, yearsOf } from "./woven.js?v=a72a3c00d32b";

const SIDE = 12; // the room either side of the years
const TOP = 26; // the years' room
const HEAD = 22; // a part's name: Periods, Events, Memories
const ROW = 38; // a period's room: its name, then its bar
const BAR = 10;
const EVENT_ROW = 30; // an event's room: its name, then its bar
const EVENT_BAR = 8;
const DOT_ROW = 16; // a memory's room
const DOT = 5;
const MOST_DOT_ROWS = 8; // past these, memories share the last row
const BOTTOM = 10;

const escape = (text) => String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Where a time ends, in years: the end of its day, month, year or decade. */
function endOf(when) { return when?.date ? yearsOf({ date: lastDayOf(when) }) + 1 / 365.25 : null; }

/** A name cut to what fits, so many letters to a pixel-width. */
function fitted(name, room, size) {
  const most = Math.max(4, Math.floor(room / (size * 0.56)));
  return name.length > most ? `${name.slice(0, most - 1)}…` : name;
}

/** Each of these spans ({ from, to } in pixels) put in the first row it fits in: answers each one's row, and how many rows. */
function packed(spans, most = Infinity) {
  const ends = []; // each row's rightmost end so far
  const rows = spans.map((span) => {
    let row = ends.findIndex((end) => end <= span.from);
    if (row < 0) row = ends.length < most ? ends.length : most - 1;
    ends[row] = Math.max(ends[row] ?? -Infinity, span.to);
    return row;
  });
  return { rows, count: ends.length };
}

/** What a mark says: its title, when, how long. */
const sayOf = (entry) => [entry.title, entry.said, entry.lasts].filter(Boolean).join(" · ");

/**
 * The member's thread drawn width wide, now being when it is now: their
 * dated periods, events and memories, but those hidden - hidden.periods and
 * hidden.events, kinds of each left out ("" for none); hidden.parts, whole
 * parts left out ("periods", "events", "memories"). Answers
 * { svg, width, height, rows } - rows being the marks' keys, top to bottom
 * - or null with nothing to draw.
 */
export function drawTimeline(weave, width = 700, now = new Date(), colours = {}, hidden = {}) {
  const ink = colours.ink ?? "#eef2fa";
  const soft = colours.soft ?? "#8e9ab8";
  const grid = colours.grid ?? "#34426a";
  const dot = colours.memory ?? "#9db8ff";
  const parts = hidden.parts ?? [];
  const thread = weave.thread(weave.meId).filter((entry) => entry.when?.date);
  const today = now.getFullYear() + (now.getMonth() + (now.getDate() - 1) / 31) / 12;
  const spanOf = (entry, going) => {
    const from = yearsOf(entry.when);
    return { entry, from, going, to: going ? Math.max(today, from + 1 / 12) : endOf(entry.until ?? entry.when) };
  };
  const periods = parts.includes("periods") ? [] : thread.filter((entry) => entry.kind === "period" && !(hidden.periods ?? []).includes(entry.periodKind ?? ""))
    .map((entry) => spanOf(entry, !entry.until));
  const events = parts.includes("events") ? [] : thread.filter((entry) => entry.kind === "event" && !(hidden.events ?? []).includes(entry.eventKind ?? ""))
    .map((entry) => spanOf(entry, false));
  const memories = parts.includes("memories") ? [] : thread.filter((entry) => entry.kind === "memory").map((entry) => spanOf(entry, false));
  if (!periods.length && !events.length && !memories.length) return null;
  // oldest first; of two starting together, the longer first
  for (const list of [periods, events, memories]) list.sort((a, b) => a.from - b.from || b.to - a.to);
  const all = [...periods, ...events, ...memories];
  const first = Math.floor(Math.min(...all.map((p) => p.from)));
  const last = Math.max(Math.ceil(Math.max(...all.map((p) => p.to), today)), first + 1);
  const plot = width - 2 * SIDE;
  const x = (years) => SIDE + ((years - first) / (last - first)) * plot;
  const out = [];
  const rows = [];
  const mark = (entry, body) => {
    rows.push(entry.key);
    out.push(`<a class="mark" data-key="${escape(entry.key)}" href="#${escape(entry.key.replace(":", "/"))}" aria-label="${escape(sayOf(entry))}"><title>${escape(sayOf(entry))}</title>${body}</a>`);
  };
  const head = (top, words) => out.push(`<text x="${SIDE}" y="${top + 15}" fill="${soft}" font-size="11" font-weight="700" letter-spacing="0.06em">${words}</text>`);
  let top = TOP;
  if (periods.length) {
    head(top, "PERIODS");
    top += HEAD;
    periods.forEach((p) => {
      const colour = weave.kindColour(p.entry.periodKind);
      const x1 = x(p.from);
      const x2 = Math.max(x(p.to), x1 + 6);
      // its name above its bar, from its start - or, near the right edge, ending at its end
      const name = fitted(p.entry.title, plot, 12);
      const roomRight = width - SIDE - x1;
      const atEnd = roomRight < name.length * 12 * 0.56 && x2 - SIDE > roomRight;
      const label = atEnd
        ? `<text x="${x2}" y="${top + 14}" fill="${ink}" font-size="12" font-weight="600" text-anchor="end">${escape(name)}</text>`
        : `<text x="${x1}" y="${top + 14}" fill="${ink}" font-size="12" font-weight="600">${escape(name)}</text>`;
      // still going: an arrow on its end, at today
      const arrow = p.going ? `<path d="M${x2 - 1} ${top + 19} l7 ${BAR / 2} l-7 ${BAR / 2} z" fill="${colour}"/>` : "";
      mark(p.entry, `<rect x="${x1}" y="${top}" width="${Math.max(x2 - x1, 1)}" height="${ROW - 4}" fill="transparent"/>`
        + `${label}<rect x="${x1}" y="${top + 19}" width="${x2 - x1}" height="${BAR}" rx="4" fill="${colour}"/>${arrow}`);
      top += ROW;
    });
  }
  if (events.length) {
    head(top, "EVENTS");
    top += HEAD;
    // each event's room: its bar, and its name beside it, cut to at most a third of the width
    const laid = events.map((e) => {
      const x1 = x(e.from);
      const x2 = Math.max(x(e.to), x1 + 6);
      const name = fitted(e.entry.title, Math.max(plot / 3, 60), 11);
      const words = name.length * 11 * 0.56;
      const atEnd = x1 + words > width - SIDE;
      return { ...e, x1, x2, name, atEnd, room: atEnd ? { from: Math.min(x1, x2 - words) - 6, to: x2 + 6 } : { from: x1 - 6, to: Math.max(x2, x1 + words) + 6 } };
    });
    const { rows: at, count } = packed(laid.map((e) => e.room));
    laid.forEach((e, i) => {
      const y = top + at[i] * EVENT_ROW;
      const colour = weave.eventKindColour(e.entry.eventKind);
      const label = e.atEnd
        ? `<text x="${e.x2}" y="${y + 12}" fill="${ink}" font-size="11" font-weight="600" text-anchor="end">${escape(e.name)}</text>`
        : `<text x="${e.x1}" y="${y + 12}" fill="${ink}" font-size="11" font-weight="600">${escape(e.name)}</text>`;
      mark(e.entry, `<rect x="${e.room.from}" y="${y}" width="${e.room.to - e.room.from}" height="${EVENT_ROW - 4}" fill="transparent"/>`
        + `${label}<rect x="${e.x1}" y="${y + 17}" width="${e.x2 - e.x1}" height="${EVENT_BAR}" rx="3" fill="${colour}"/>`);
    });
    top += count * EVENT_ROW;
  }
  if (memories.length) {
    head(top, "MEMORIES");
    top += HEAD;
    // a memory is a moment: a dot at its time, or at the middle of a guess, on a faint bar across it
    const laid = memories.map((m) => {
      const x1 = x(m.from);
      const x2 = x(m.to);
      const cx = x2 - x1 > DOT * 2 ? (x1 + x2) / 2 : x1;
      return { ...m, x1, x2, cx, room: { from: Math.min(x1, cx - DOT) - 2, to: Math.max(x2, cx + DOT) + 2 } };
    });
    const { rows: at, count } = packed(laid.map((m) => m.room), MOST_DOT_ROWS);
    laid.forEach((m, i) => {
      const cy = top + at[i] * DOT_ROW + DOT_ROW / 2;
      const guess = m.x2 - m.x1 > DOT * 2 ? `<rect x="${m.x1}" y="${cy - 2}" width="${m.x2 - m.x1}" height="4" rx="2" fill="${dot}" opacity="0.3"/>` : "";
      mark(m.entry, `${guess}<circle cx="${m.cx}" cy="${cy}" r="${DOT}" fill="${dot}"/>`);
    });
    top += count * DOT_ROW;
  }
  const height = top + BOTTOM;
  // the years, recessive, and today - a dashed line, the end of every period still going - beneath the marks
  const under = [];
  for (const year of yearMarks(first, last)) {
    under.push(`<line x1="${x(year)}" y1="${TOP - 4}" x2="${x(year)}" y2="${height - BOTTOM}" stroke="${grid}" stroke-width="1" opacity="0.5"/>`);
    under.push(`<text x="${x(year)}" y="${TOP - 10}" fill="${soft}" font-size="11" text-anchor="middle">${year}</text>`);
  }
  if (today <= last) {
    under.push(`<line x1="${x(today)}" y1="${TOP - 4}" x2="${x(today)}" y2="${height - BOTTOM}" stroke="${ink}" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>`);
  }
  const said = `Your timeline from ${first} to ${last}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="group" aria-label="${escape(said)}" font-family="inherit">${under.join("")}${out.join("")}</svg>`;
  return { svg, width, height, rows };
}
