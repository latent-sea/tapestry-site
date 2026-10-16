// Times on a thread, as people remember them: a day, a month, a year or a
// decade, known or only estimated. A time is { date, precision, about }: the
// date ("YYYY-MM-DD") is the first day of what is meant, as the platform
// keeps it (backend.sql); the precision says how much of it is known; about
// says it is a guess. A span is a start and, if it lasts, an end, each a
// time of its own: "about 1995 – June 1998".
//
// Typed in, a time may be written as a person would say it - "1998",
// "June 1998", "12 June 1998", "the 1990s", "12/06/1998" (day first, the
// British way), "1998-06-12", "today" - with "about", "around", "c." or a
// "?" for a guess, and a span as two joined by "–", "-", "to" or "until".
// A day may have a time of day ("12 June 1998, 14:30", "today 2pm", "now"),
// kept as time: "14:30" - so the thread is a journal too.
// Each is said back the same way, so what is shown can be typed again.

export const PRECISIONS = ["day", "month", "year", "decade"];

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MONTH_NAMES = MONTHS.map((name) => name[0].toUpperCase() + name.slice(1));

/** What a time written like these may look like, for a person who wrote one that isn't. */
export const EXAMPLES = "Try 1998, June 1998, 12 June 1998, the 1990s, about 1995, or 2004 – 2009";

const two = (n) => String(n).padStart(2, "0");
const dateOf = (year, month = 1, day = 1) => `${String(year).padStart(4, "0")}-${two(month)}-${two(day)}`;
const realDay = (year, month, day) => {
  const made = new Date(Date.UTC(year, month - 1, day));
  return made.getUTCFullYear() === year && made.getUTCMonth() === month - 1 && made.getUTCDate() === day;
};
const reasonable = (year) => year >= 1000 && year <= 2999;

/** A day as a time: { date, precision: "day", about: false }. */
function dayOf(at) { return { date: dateOf(at.getFullYear(), at.getMonth() + 1, at.getDate()), precision: "day", about: false }; }

/** The minute a moment is at, as "14:32". */
export function clockOf(at) { return `${two(at.getHours())}:${two(at.getMinutes())}`; }

/**
 * A time of day at the end of what was typed: { rest, time: "14:30" }, or
 * { error } for a time that isn't one, or null for none. A time has its
 * minutes ("9:15", "21.40") or says am or pm ("2pm"), so a bare number is
 * never taken for an hour.
 */
function splitTime(text) {
  const found = text.match(/^(.*?)\s*(?:\bat\s+)?\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/);
  if (!found || (!found[3] && !found[4])) return null;
  // a date written with dots (12.06.1998) or a year is not a time
  if (!found[4] && /[./-]$/.test(found[1])) return null;
  let hour = Number(found[2]);
  const minute = Number(found[3] ?? 0);
  if (found[4]) {
    if (hour < 1 || hour > 12) return { error: "That isn't a time: try 14:30 or 2.30pm" };
    hour = (hour % 12) + (found[4] === "pm" ? 12 : 0);
  }
  if (hour > 23 || minute > 59) return { error: "That isn't a time: try 14:30 or 2.30pm" };
  return { rest: found[1].replace(/\s+at$/, "").trim(), time: `${two(hour)}:${two(minute)}` };
}

/** A month named or shortened ("jun", "Sept"), as its number, or 0. */
function monthNamed(word) {
  const w = word.toLowerCase().replace(/\.$/, "");
  if (w.length < 3) return 0;
  const found = MONTHS.findIndex((name) => name.startsWith(w) || (w === "sept" && name === "september"));
  return found + 1;
}

/**
 * A time typed in: { when, error }. Nothing typed is no time and no error;
 * words that are not a time are an error, saying what would be.
 */
export function parseWhen(typed, today = new Date()) {
  let text = String(typed ?? "").trim().toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ");
  if (!text) return { when: null, error: "" };
  // now: today, at this minute - a journal's entry
  if (text === "now" || text === "just now") return { when: { ...dayOf(today), time: clockOf(today) }, error: "" };
  // a time of day after a day, or alone for today: "12 June 1998 14:30", "yesterday at 9.15am", "2pm"
  const clock = splitTime(text);
  if (clock) {
    if (clock.error) return { when: null, error: clock.error };
    const on = clock.rest ? parseWhen(clock.rest, today) : { when: dayOf(today), error: "" };
    if (!on.when) return on.error ? on : { when: null, error: EXAMPLES };
    if (on.when.precision !== "day") return { when: null, error: "A time of day goes with a day: 12 June 1998, 14:30" };
    return { when: { ...on.when, time: clock.time }, error: "" };
  }
  // a guess: "about 1995", "c. 1995", "~1995", "1995?"
  const guess = text.match(/^(?:about|around|roughly|approximately|approx\.?|circa|ca?\.|~)\s*(.+)$/) ?? text.match(/^(.+?)\s*\?$/);
  if (guess) {
    const known = parseWhen(guess[1], today);
    return known.when ? { when: { ...known.when, about: true }, error: "" } : known.error ? known : { when: null, error: EXAMPLES };
  }
  const wrong = { when: null, error: EXAMPLES };
  const day = (y, m, d) => (reasonable(y) && realDay(y, m, d) ? { when: { date: dateOf(y, m, d), precision: "day", about: false }, error: "" } : wrong);
  const month = (y, m) => (reasonable(y) && m >= 1 && m <= 12 ? { when: { date: dateOf(y, m), precision: "month", about: false }, error: "" } : wrong);
  let found;

  if (text === "today" || text === "yesterday") {
    const at = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (text === "yesterday" ? 1 : 0));
    return day(at.getFullYear(), at.getMonth() + 1, at.getDate());
  }
  // the 1990s, 1990s, 1990's
  if ((found = text.match(/^(?:the )?(\d{3})0'?s$/))) {
    const year = Number(found[1]) * 10;
    return reasonable(year) ? { when: { date: dateOf(year), precision: "decade", about: false }, error: "" } : wrong;
  }
  if ((found = text.match(/^(\d{4})$/))) {
    const year = Number(found[1]);
    return reasonable(year) ? { when: { date: dateOf(year), precision: "year", about: false }, error: "" } : wrong;
  }
  // 1998-06-12, 1998-06
  if ((found = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return day(Number(found[1]), Number(found[2]), Number(found[3]));
  if ((found = text.match(/^(\d{4})-(\d{1,2})$/))) return month(Number(found[1]), Number(found[2]));
  // 12/06/1998, 12.6.1998 (day first); 06/1998
  if ((found = text.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/))) return day(Number(found[3]), Number(found[2]), Number(found[1]));
  if ((found = text.match(/^(\d{1,2})[/.](\d{4})$/))) return month(Number(found[2]), Number(found[1]));
  // 12 June 1998, 12th of June 1998, June 12 1998, June 1998
  const words = text.replace(/\b(\d{1,2})(st|nd|rd|th)\b/g, "$1").replace(/\bof\b/g, " ").replace(/\s+/g, " ").trim().split(" ");
  if (words.length === 3) {
    const [a, b, c] = words;
    if (/^\d{1,2}$/.test(a) && monthNamed(b) && /^\d{4}$/.test(c)) return day(Number(c), monthNamed(b), Number(a));
    if (monthNamed(a) && /^\d{1,2}$/.test(b) && /^\d{4}$/.test(c)) return day(Number(c), monthNamed(a), Number(b));
  }
  if (words.length === 2 && monthNamed(words[0]) && /^\d{4}$/.test(words[1])) return month(Number(words[1]), monthNamed(words[0]));
  return wrong;
}

/**
 * A span typed in: { starts, ends, error }, each end a time or null. One
 * time is a span that starts then; "2004 – 2009", "about 1995 to 1998",
 * "June 2004 – now" one that lasts ("now" or "" for still going, when
 * allowed). An end before its start is an error.
 */
export function parseSpan(typed, today = new Date()) {
  const text = String(typed ?? "").trim();
  if (!text) return { starts: null, ends: null, error: "" };
  const parts = text.split(/\s+(?:–|—|-|to|until|till)\s+|\s*[–—]\s*|(?<=^\d{4})-(?=\d{4}$)/i);
  if (parts.length > 2) return { starts: null, ends: null, error: EXAMPLES };
  const starts = parseWhen(parts[0], today);
  if (!starts.when) return { starts: null, ends: null, error: starts.error || EXAMPLES };
  if (parts.length === 1) return { starts: starts.when, ends: null, error: "" };
  const stillGoing = /^(now|today|present|ongoing|still)$/i.test(parts[1].trim()) || !parts[1].trim();
  if (stillGoing) return { starts: starts.when, ends: null, error: "", going: true };
  // an end that is only a time of day ("2pm – 4pm") ends on the day it started
  const endsAlone = splitTime(parts[1].trim().toLowerCase());
  const ends = endsAlone && !endsAlone.error && !endsAlone.rest && starts.when.precision === "day"
    ? { when: { ...starts.when, about: false, time: endsAlone.time }, error: "" }
    : parseWhen(parts[1], today);
  if (!ends.when) return { starts: null, ends: null, error: ends.error || EXAMPLES };
  if (ends.when.date === starts.when.date && ends.when.time && starts.when.time && ends.when.time < starts.when.time) {
    return { starts: null, ends: null, error: "It ends before it starts" };
  }
  if (lastDayOf(ends.when) < starts.when.date) return { starts: null, ends: null, error: "It ends before it starts" };
  return { starts: starts.when, ends: ends.when, error: "" };
}

/** A time as a person says it: "12 June 1998", "June 1998", "1998", "the 1990s", "about 1998"; "" for none. */
export function sayWhen(when) {
  if (!when || !when.date) return "";
  const [year, month, day] = when.date.split("-").map(Number);
  let said;
  if (when.precision === "decade") said = `the ${year - (year % 10)}s`;
  else if (when.precision === "year") said = String(year);
  else if (when.precision === "month") said = `${MONTH_NAMES[month - 1]} ${year}`;
  else said = `${day} ${MONTH_NAMES[month - 1]} ${year}`;
  if (when.time) said = `${said}, ${when.time}`;
  return when.about ? `about ${said}` : said;
}

/**
 * A span said: "2004 – 2009", "about 1995 – June 1998", "June 2004 – now"
 * when it is still going (stillGoing, "" to say only its start), or one
 * time when it starts and ends within the same.
 */
export function saySpan(starts, ends, stillGoing = "") {
  const from = sayWhen(starts);
  if (!from) return "";
  if (!ends || !ends.date) return stillGoing ? `${from} – ${stillGoing}` : from;
  const to = sayWhen(ends);
  if (to === from) return from;
  // on the same day, the end is only its time: "12 June 1998, 14:00 – 16:00"
  if (ends.date === starts.date && ends.precision === "day" && starts.precision === "day" && starts.time && ends.time) {
    return `${from} – ${ends.about ? "about " : ""}${ends.time}`;
  }
  return `${from} – ${to}`;
}

/** The year a time falls in, or null. */
export function yearOf(when) { return when && when.date ? Number(when.date.slice(0, 4)) : null; }

/**
 * Where a time sorts among others: by its date, and of two starting on the
 * same day the broader first, so "1998" comes before "12 January 1998".
 * No time sorts last.
 */
export function sortKey(when) {
  if (!when || !when.date) return "9999-99-99 9";
  return `${when.date} ${3 - PRECISIONS.indexOf(when.precision)} ${when.time ?? ""}`;
}

/** The heading a time stands under on a timeline: its year, its decade for a decade, or "Undated". */
export function headingOf(when) {
  if (!when || !when.date) return "Undated";
  const year = yearOf(when);
  return when.precision === "decade" ? `The ${year - (year % 10)}s` : String(year);
}

/** The last day a time may mean, as a date: the end of its day, month, year or decade. */
export function lastDayOf(when) {
  if (!when || !when.date) return null;
  const [year, month, day] = when.date.split("-").map(Number);
  if (when.precision === "day") return dateOf(year, month, day);
  if (when.precision === "month") return dateOf(year, month, new Date(Date.UTC(year, month, 0)).getUTCDate());
  if (when.precision === "year") return dateOf(year, 12, 31);
  return dateOf(year - (year % 10) + 9, 12, 31);
}

/** Whether a time - or a span, from when to until - may fall within another span (starts, and ends or still going): any overlap at all. */
export function within(when, starts, ends, until = null) {
  if (!when || !when.date || !starts || !starts.date) return false;
  const from = when.date;
  const to = lastDayOf(until && until.date ? until : when);
  const spanTo = ends && ends.date ? lastDayOf(ends) : "9999-12-31";
  return from <= spanTo && to >= starts.date;
}
