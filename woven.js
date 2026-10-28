// Years, for every picture across them (the timeline, gantt.js; the tapestry of
// lives, lives.js): a time as a year with its fraction, and the years to mark
// along the top. Tested by tests/test_woven.mjs.

/** A time as a year with its fraction: 2006.41 for late May 2006. */
export function yearsOf(when) {
  if (!when?.date) return null;
  const [y, m, d] = when.date.split("-").map(Number);
  return y + ((m - 1) * 30.44 + (d - 1)) / 365.25;
}

/** Years to mark along the top, every so many as the span asks. */
export function yearMarks(from, to) {
  const span = to - from;
  const every = span <= 12 ? 1 : span <= 30 ? 5 : span <= 80 ? 10 : 20;
  const marks = [];
  for (let y = Math.ceil(from / every) * every; y <= to; y += every) marks.push(y);
  return marks;
}
