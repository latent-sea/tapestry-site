// The tapestry as lives: the member's, their linked people's (in their
// colours) and the people they named themselves (grey), each a line from
// birth - or, not known, fading in before the first thing with them - to
// now, or their death. Lives that share memories, events and periods are
// drawn together while they share them: what they share pulls them close
// about its time, every life pushes every other away so none lie on each
// other, and each line is stiff, so it bends slowly and settles where it is
// pulled rather than jumping about. Drawn flat (2D: time across, each life
// up and down) or in space (3D: time along, each life free in the other
// two). Plain data in, plain data out, tested by tests/test_lives.mjs.

import { lastDayOf } from "./when.js?v=5735eb403b1f";
import { yearsOf } from "./woven.js?v=5735eb403b1f";

export const GREY = "#7d869c";
const FADE = 2; // years a line fades in over, before the first thing with someone whose birth isn't known

const endOf = (when) => (when?.date ? yearsOf({ date: lastDayOf(when) }) + 1 / 365.25 : null);
const yearsNow = (now) => now.getFullYear() + (now.getMonth() + (now.getDate() - 1) / 31) / 12;
const timeOf = (date, precision) => (date ? { date, precision: precision || "day" } : null);

/** Which lives an item of the weave involves - its owner, everyone tagged on it, linked or the member's own names - by their ids. */
function involved(item, ids) {
  const found = new Set();
  if (ids.has(`account:${item.owner}`)) found.add(`account:${item.owner}`);
  for (const tag of item.tags ?? []) {
    if (tag.account && ids.has(`account:${tag.account}`)) found.add(`account:${tag.account}`);
    else if (tag.person && ids.has(`person:${tag.person}`)) found.add(`person:${tag.person}`);
  }
  return [...found];
}

/**
 * The lives drawn, and what they share: { lives, shared }. Each life is
 * { id, name, colour, grey, from, faded, to, died }; each shared thing is
 * { key, kind, title, said, from, to, lives } - a memory, event or period
 * two or more of the lives are in, with when it was, in years.
 */
export function livesOf(weave, now = new Date()) {
  const today = yearsNow(now);
  const lives = [];
  const me = weave.meId;
  if (!me) return { lives: [], shared: [] };
  const born = (date, precision) => (date ? yearsOf(timeOf(date, precision)) : null);
  lives.push({ id: `account:${me}`, account: me, name: weave.nameOf(me), colour: weave.colourOf(me), grey: false, from: born(weave.born, "day"),
    to: today, died: false });
  for (const account of weave.threads().filter((a) => a !== me)) {
    const life = weave.data.lives?.[account] ?? {};
    const died = life.died ? endOf(timeOf(life.died, life.died_precision)) : null;
    lives.push({ id: `account:${account}`, account, name: weave.nameOf(account), colour: weave.colourOf(account), grey: false,
      from: born(life.born, life.born_precision), to: died ?? today, died: !!died });
  }
  // the people the member named themselves, on Tapestry or not linked: grey
  for (const person of weave.data.people.filter((p) => !p.account)) {
    const died = person.died ? endOf(timeOf(person.died, person.died_precision)) : null;
    lives.push({ id: `person:${person.id}`, person: person.id, name: person.name, colour: GREY, grey: true,
      from: born(person.born, person.born_precision), to: died ?? today, died: !!died });
  }
  const ids = new Set(lives.map((l) => l.id));
  const things = [["memory", weave.data.memories], ["event", weave.data.events], ["period", weave.data.periods]];
  const all = [];
  for (const [kind, list] of things) {
    for (const item of list) {
      const entry = weave.entry(kind, item);
      if (!entry.when?.date) continue;
      const from = yearsOf(entry.when);
      const to = kind === "period" && !entry.until ? today : Math.max(endOf(entry.until ?? entry.when), from);
      all.push({ key: entry.key, kind, title: entry.title, said: entry.said, from, to, lives: involved(item, ids) });
    }
  }
  // a life whose birth isn't known starts a little before the first thing with it, fading in
  for (const life of lives) {
    if (life.from !== null) { life.faded = false; continue; }
    const first = Math.min(...all.filter((t) => t.lives.includes(life.id)).map((t) => t.from));
    life.from = Number.isFinite(first) ? first - FADE : null;
    life.faded = true;
  }
  return { lives: lives.filter((l) => l.from !== null && l.to > l.from), shared: all.filter((t) => t.lives.length > 1), all };
}

/**
 * Where each life is at each moment: { times, at } - times the moments (in
 * years) across all of them; at a map from each life's id to its place at
 * each moment ([y] flat, [y, z] in space), or null before its birth or after
 * its death. Worked out by letting the lives settle: what two share pulls
 * them together about its time (a period all through it); every two alive
 * at once push apart; each line resists bending, and is held lightly to
 * where it began, so the same tapestry always settles the same way.
 */
/**
 * How the lives settle, each a step of five (0 to 4, 2 the middle): pull, how strongly what two share draws
 * them together; near, how close it draws them; push, how hard every two keep apart; stiff, how much a line
 * resists bending; reach, how long before and after a moment shared its pull is felt.
 */
export const TUNING = Object.freeze({ pull: 2, near: 2, push: 2, stiff: 2, reach: 2 });
const STEPS = { pull: [0.4, 0.7, 1, 1.5, 2.2], near: [1.5, 1.2, 1, 0.75, 0.5], push: [0.45, 0.7, 1, 1.5, 2.2], stiff: [0.3, 0.6, 1, 1.8, 3], reach: [0.25, 0.4, 0.6, 1, 1.6] };
const tuned = (tuning, part) => STEPS[part][Math.max(0, Math.min(4, tuning?.[part] ?? TUNING[part]))];

export function layOut(drawn, dims = 1, rounds = 220, tuning = TUNING) {
  const { lives, shared } = drawn;
  if (!lives.length) return { times: [], at: new Map() };
  const start = Math.min(...lives.map((l) => l.from));
  const end = Math.max(...lives.map((l) => l.to));
  const count = Math.max(24, Math.min(200, Math.round((end - start) * 3)));
  const times = Array.from({ length: count }, (_, i) => start + ((end - start) * i) / (count - 1));
  const n = lives.length;
  const index = new Map(lives.map((l, i) => [l.id, i]));
  const alive = lives.map((l) => times.map((t) => t >= l.from - 1e-9 && t <= l.to + 1e-9));
  // how strongly each two are pulled together at each moment: a period all through it, a memory or an
  // event about its time, falling away a year either side
  const pull = new Map();
  const reach = tuned(tuning, "reach");
  const pullOf = (a, b) => { const k = a < b ? `${a}|${b}` : `${b}|${a}`; if (!pull.has(k)) pull.set(k, new Float64Array(count)); return pull.get(k); };
  for (const thing of shared) {
    const at = thing.lives.map((id) => index.get(id)).filter((i) => i !== undefined);
    const strength = thing.kind === "period" ? 1.2 : thing.kind === "event" ? 1.5 : 1;
    for (let p = 0; p < at.length; p++) {
      for (let q = p + 1; q < at.length; q++) {
        const w = pullOf(at[p], at[q]);
        for (let s = 0; s < count; s++) {
          const t = times[s];
          const off = t < thing.from ? thing.from - t : t > thing.to ? t - thing.to : 0;
          if (off < reach * 4) w[s] += strength * Math.exp(-(off * off) / (2 * reach * reach));
        }
      }
    }
  }
  // where each begins: the member at the middle, the rest outwards in turns by how much they share with them
  const together = lives.map((_, i) => [...pull.entries()].filter(([k]) => k.split("|").map(Number).includes(i)).reduce((sum, [, w]) => sum + w.reduce((a, b) => a + b, 0), 0));
  const order = lives.map((_, i) => i).sort((a, b) => (a === 0 ? -1 : b === 0 ? 1 : together[b] - together[a] || a - b));
  const home = new Array(n);
  order.forEach((i, rank) => {
    const side = rank % 2 ? 1 : -1;
    const step = Math.ceil(rank / 2);
    home[i] = dims === 1 ? [side * step] : [Math.cos(rank * 2.4) * step, Math.sin(rank * 2.4) * step];
  });
  // places and forces in flat arrays, life by moment by axis: hundreds of rounds over every two lives stay quick
  const D = dims;
  const slot = (a, s) => (a * count + s) * D;
  const pos = new Float64Array(n * count * D);
  for (let a = 0; a < n; a++) for (let s = 0; s < count; s++) for (let k = 0; k < D; k++) pos[slot(a, s) + k] = home[a][k];
  const force = new Float64Array(n * count * D);
  const pulls = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) pulls.push(pull.get(`${a}|${b}`) ?? null);
  const REST = 0.7 * tuned(tuning, "near"); // how near two pulled together come
  const PUSH = 0.35 * tuned(tuning, "push"); // how hard every two alive at once push apart
  const STIFF = 6 * tuned(tuning, "stiff"); // how much a line resists bending
  const PULL = tuned(tuning, "pull"); // how strongly what two share draws them together
  const HOME = 0.02; // how lightly each is held to where it began
  const d = new Float64Array(D);
  for (let round = 0; round < rounds; round++) {
    // a stiffer line takes smaller steps, so it settles rather than shakes
    const rate = (0.08 * (1 - round / rounds) + 0.01) * Math.min(1, 6 / STIFF);
    force.fill(0);
    for (let s = 0; s < count; s++) {
      let pair = 0;
      for (let a = 0; a < n; a++) {
        const aliveA = alive[a][s];
        for (let b = a + 1; b < n; b++, pair++) {
          if (!aliveA || !alive[b][s]) continue;
          const pa = slot(a, s);
          const pb = slot(b, s);
          let sq = 0;
          for (let k = 0; k < D; k++) { d[k] = pos[pa + k] - pos[pb + k]; sq += d[k] * d[k]; }
          const dist = Math.sqrt(sq) || 1e-3;
          let push = PUSH / (sq + 0.05);
          const w = pulls[pair]?.[s] ?? 0;
          if (w) push -= Math.min(w * PULL, 3 * PULL) * (dist - REST);
          for (let k = 0; k < D; k++) { const f = (push * d[k]) / dist; force[pa + k] += f; force[pb + k] -= f; }
        }
        if (!aliveA) continue;
        // stiffness: towards the middle of its neighbours in time, and lightly home
        const pa = slot(a, s);
        const prev = s > 0 && alive[a][s - 1];
        const next = s < count - 1 && alive[a][s + 1];
        for (let k = 0; k < D; k++) {
          if (prev || next) {
            const mid = prev && next ? (pos[pa - D + k] + pos[pa + D + k]) / 2 : prev ? pos[pa - D + k] : pos[pa + D + k];
            force[pa + k] += STIFF * (mid - pos[pa + k]);
          }
          force[pa + k] += HOME * (home[a][k] - pos[pa + k]);
        }
      }
    }
    for (let a = 0; a < n; a++) {
      for (let s = 0; s < count; s++) {
        if (!alive[a][s]) continue;
        const pa = slot(a, s);
        for (let k = 0; k < D; k++) pos[pa + k] += Math.max(-0.5, Math.min(0.5, rate * force[pa + k]));
      }
    }
  }
  return { times, at: new Map(lives.map((l, a) => [l.id, times.map((_, s) => (alive[a][s] ? Array.from(pos.subarray(slot(a, s), slot(a, s) + D)) : null))])) };
}

/** Where a life is at a moment, between the moments worked out: its place, or null where it isn't. */
export function placeAt(laid, id, t) {
  const { times } = laid;
  const at = laid.at.get(id);
  if (!at || !times.length) return null;
  const step = (times[times.length - 1] - times[0]) / (times.length - 1 || 1);
  const i = Math.max(0, Math.min(times.length - 2, Math.floor((t - times[0]) / step)));
  const a = at[i];
  const b = at[i + 1] ?? a;
  if (!a && !b) return null;
  if (!a || !b) return a ?? b;
  const f = Math.max(0, Math.min(1, (t - times[i]) / step));
  return a.map((v, k) => v + (b[k] - v) * f);
}

/**
 * What a box selected, as each life it caught and when: points is each
 * life's drawn places, [{ id, t, x, y }] on the screen; the box is
 * { left, top, right, bottom } on it. Answers a map of life id -> { from, to } in years.
 */
export function caught(points, box) {
  const found = new Map();
  for (const p of points) {
    if (p.x < box.left || p.x > box.right || p.y < box.top || p.y > box.bottom) continue;
    const was = found.get(p.id);
    found.set(p.id, was ? { from: Math.min(was.from, p.t), to: Math.max(was.to, p.t) } : { from: p.t, to: p.t });
  }
  return found;
}

/**
 * What the member was in, among what a box caught: every memory, event and period they are in that a caught
 * life is in too, during the time it was caught (and a little either side, so a moment on its edge counts).
 */
export function inSelection(drawn, meId, selection) {
  if (!selection?.size) return [];
  const mine = `account:${meId}`;
  return drawn.all.filter((t) => t.lives.includes(mine) && t.lives.some((id) => {
    const when = selection.get(id);
    return when && t.to >= when.from - 0.1 && t.from <= when.to + 0.1;
  })).map((t) => t.key);
}

const escape = (text) => String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The lives drawn flat, width wide: time across (the stretch range, { from,
 * to }, or all of it), each life up and down where it settled (layOut), named
 * at its start, in its colour or grey, fading in where its start isn't
 * known; and each thing shared, a knot through the lives in it. One life
 * may be picked out (focus, its id): drawn bold, the rest faint. Answers
 * { svg, width, height, points, from, to } - points each life's drawn places
 * (caught() reads them), or null with nothing to draw.
 */
export function drawLives(drawn, laid, width = 700, colours = {}, range = null, hidden = [], focus = null, found = null) {
  const ink = colours.ink ?? "#eef2fa";
  const soft = colours.soft ?? "#8e9ab8";
  const grid = colours.grid ?? "#34426a";
  const lit = colours.found ?? "#f2c14e";
  const lives = drawn.lives.filter((l) => !hidden.includes(l.id));
  if (!lives.length || !laid.times.length) return null;
  const from = range?.from ?? Math.floor(Math.min(...lives.map((l) => l.from)));
  const to = range?.to ?? Math.ceil(Math.max(...lives.map((l) => l.to)));
  const ys = lives.flatMap((l) => (laid.at.get(l.id) ?? []).filter(Boolean).map((p) => p[0]));
  const low = Math.min(...ys);
  const high = Math.max(...ys);
  const LEFT = 12;
  const TOP = 30;
  const UNIT = 46; // pixels between two lives a whole place apart
  const height = Math.round(TOP + (high - low) * UNIT + 40);
  const x = (t) => LEFT + ((t - from) / (to - from || 1)) * (width - 2 * LEFT);
  const y = (v) => TOP + 14 + (v - low) * UNIT;
  const out = [];
  const defs = [];
  const points = [];
  for (const year of yearTicks(from, to)) {
    out.push(`<line x1="${x(year)}" y1="${TOP - 6}" x2="${x(year)}" y2="${height - 8}" stroke="${grid}" stroke-width="1" opacity="0.4"/>`);
    out.push(`<text x="${x(year)}" y="${TOP - 12}" fill="${soft}" font-size="11" text-anchor="middle">${year}</text>`);
  }
  lives.forEach((life, i) => {
    const at = laid.at.get(life.id) ?? [];
    const path = [];
    laid.times.forEach((t, s) => {
      const p = at[s];
      if (!p || t < from - 0.5 || t > to + 0.5) return;
      points.push({ id: life.id, t, x: x(t), y: y(p[0]) });
      path.push(`${path.length ? "L" : "M"}${x(t).toFixed(1)} ${y(p[0]).toFixed(1)}`);
    });
    if (!path.length) return;
    let stroke = life.colour;
    if (life.faded) {
      const fade = `fade-${i}`;
      const x1 = x(life.from);
      const x2 = x(life.from + FADE);
      defs.push(`<linearGradient id="${fade}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="0" x2="${x2}" y2="0"><stop offset="0" stop-color="${life.colour}" stop-opacity="0"/><stop offset="1" stop-color="${life.colour}" stop-opacity="1"/></linearGradient>`);
      stroke = `url(#${fade})`;
    }
    const picked = focus === life.id;
    // faint behind the one picked out, or behind what a search found
    const faint = (focus && !picked) || (found && !found.lives.has(life.id));
    const width_ = picked ? 5 : life.grey ? 2 : 3;
    const opacity = faint ? 0.2 : life.grey ? 0.75 : 1;
    // the line, and a wider one unseen over it, so a finger finds it: pressed, it is picked out
    out.push(`<g class="life" data-life="${escape(life.id)}" aria-label="${escape(life.name)}"><path d="${path.join("")}" fill="none" stroke="${stroke}" stroke-width="${width_}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`
      + `<path d="${path.join("")}" fill="none" stroke="transparent" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" pointer-events="stroke"/></g>`);
    const first = points.find((p) => p.id === life.id);
    out.push(`<text x="${Math.max(first.x, LEFT)}" y="${first.y - 8}" fill="${life.grey ? soft : ink}" font-size="${picked ? 14 : 12}" font-weight="${picked ? 800 : 600}" opacity="${faint ? 0.35 : 1}">${escape(life.name)}${life.died ? " †" : ""}</text>`);
  });
  // each thing shared: a dot on each life in it, a line down through them
  for (const thing of drawn.shared) {
    const t = (thing.from + Math.min(thing.to, thing.from + 0.02)) / 2;
    if (t < from || t > to) continue;
    const on = thing.lives.filter((id) => !hidden.includes(id)).map((id) => ({ id, p: placeAt(laid, id, t) })).filter((o) => o.p);
    if (on.length < 2) continue;
    const said = `${thing.title}${thing.said ? ` · ${thing.said}` : ""}`;
    const cx = x(t);
    const cy = on.map((o) => y(o.p[0])).sort((a, b) => a - b);
    const colourOf = (id) => drawn.lives.find((l) => l.id === id)?.colour ?? GREY;
    const hit = !!found?.keys.has(thing.key);
    const dim = (focus && !thing.lives.includes(focus)) || (found && !hit) ? ' opacity="0.25"' : "";
    out.push(`<a class="mark"${dim}${hit ? ' data-found="yes"' : ""} data-key="${escape(thing.key)}" href="#${escape(thing.key.replace(":", "/"))}" aria-label="${escape(said)}"><title>${escape(said)}</title>`
      + `<line x1="${cx}" y1="${cy[0]}" x2="${cx}" y2="${cy[cy.length - 1]}" stroke="${hit ? lit : ink}" stroke-width="${hit ? 3 : 1.5}" opacity="${hit ? 0.9 : 0.5}"/>`
      + on.map((o) => `<circle cx="${cx}" cy="${y(o.p[0])}" r="${(thing.kind === "event" ? 5 : 4) + (hit ? 2 : 0)}" fill="${colourOf(o.id)}" stroke="${hit ? lit : ink}" stroke-width="${hit ? 3 : 1.5}"/>`).join("") + "</a>");
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="group" aria-label="Lives from ${Math.floor(from)} to ${Math.ceil(to)}" font-family="inherit"><defs>${defs.join("")}</defs>${out.join("")}</svg>`;
  return { svg, width, height, points, from, to };
}

/** The years marked across a stretch: every 1, 2, 5, 10 or 20, as fits. */
function yearTicks(from, to) {
  const span = to - from;
  const every = span <= 8 ? 1 : span <= 16 ? 2 : span <= 40 ? 5 : span <= 90 ? 10 : 20;
  const ticks = [];
  for (let year = Math.ceil(from / every) * every; year <= to; year += every) ticks.push(year);
  return ticks;
}
