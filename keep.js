// A copy of the member's thread to keep: one page, opened in any browser
// with nothing else, that reads as their thread does - everything they made,
// under its years, with its words, people, places, links and pictures (the
// pictures inside it) - and carries the same as data for anything that might
// read it later. A family's history is never only on the platform. Plain
// data in, a page's text out, tested by tests/test_keep.mjs.

import { linksOf } from "./links.js?v=e87b274f50a9";
import { sortEntries } from "./weave.js?v=e87b274f50a9";
import { headingOf } from "./when.js?v=e87b274f50a9";

const escape = (text) => String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const KIND = { memory: "Memory", event: "Event", period: "Period" };

/** A memory's words without the first line its title was taken from, as its page shows them. */
const words = (entry, item) => (entry.kind === "memory" && !item.title ? entry.text.trim().split("\n").slice(1).join("\n").trim() : entry.text);

/** What a copy holds: the member's own memories, periods and events, and the events they were at that others made. */
export function keptEntries(weave) {
  return sortEntries(weave.thread(weave.meId), false);
}

/**
 * The page: pictures given as { path: a data: address } are put inside it;
 * one not given is said to be missing rather than left broken.
 */
export function copyOf(weave, pictures = {}, made = new Date(), rest = null) {
  const me = weave.me?.name ?? "";
  const entries = keptEntries(weave);
  const sections = [];
  let heading = null;
  for (const entry of entries) {
    const under = headingOf(entry.when);
    if (under !== heading) { heading = under; sections.push(`<h2>${escape(under)}</h2>`); }
    const item = { memory: weave.memories, event: weave.events, period: weave.periods }[entry.kind].get(entry.id);
    const facts = [
      entry.place ? `At ${escape(entry.place.name)}` : "",
      entry.people.length ? `With ${escape(entry.people.join(", "))}` : "",
      entry.event?.title ? `Of ${escape(entry.event.title)}` : "",
      entry.periods?.length ? `During ${escape(entry.periods.map((p) => p.title).join(", "))}` : "",
      entry.mine ? "" : `Made by ${escape(entry.ownerName)}`,
    ].filter(Boolean);
    const pictured = (entry.pictures ?? []).map((p) => (pictures[p.path]
      ? `<figure><img src="${pictures[p.path]}" alt="${escape(p.caption || "A picture")}">${p.caption ? `<figcaption>${escape(p.caption)}</figcaption>` : ""}</figure>`
      : `<p class="missing">A picture that couldn't be fetched${p.caption ? `: ${escape(p.caption)}` : ""}</p>`));
    const links = entry.kind === "memory" ? linksOf(item).map((l) => `<li><a href="${escape(l.url)}">${escape(l.video ? `A video on ${l.site}` : l.site)}</a> <span>${escape(l.url)}</span></li>`) : [];
    sections.push(`<article class="${entry.kind}">
<p class="when"><span class="kind">${KIND[entry.kind]}</span> ${escape(entry.said)}</p>
<h3>${escape(entry.title)}</h3>
${words(entry, item) ? `<p class="words">${escape(words(entry, item)).replace(/\n/g, "<br>")}</p>` : ""}
${facts.length ? `<p class="facts">${facts.join(" · ")}</p>` : ""}
${pictured.join("\n")}
${links.length ? `<ul class="links">${links.join("")}</ul>` : ""}
</article>`);
  }
  const data = {
    made: made.toISOString(), me: weave.me, people: weave.data.people.map(({ id, name, account }) => ({ id, name, linked: !!account })),
    circles: weave.data.circles, places: weave.data.places.filter((p) => p.owner === weave.meId),
    periods: weave.data.periods.filter((p) => p.owner === weave.meId), events: weave.data.events.filter((e) => entries.some((x) => x.key === `event:${e.id}`)),
    memories: weave.data.memories.filter((m) => m.owner === weave.meId),
    // and everything else Tapestry keeps about them (tapestry_my_data): comments, likes, notices, reports, feedback, settings, who saw what
    ...(rest ? { everything_else: rest } : {}),
  };
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(me)}'s life - Tapestry</title>
<style>
body { margin: 0 auto; max-width: 44rem; padding: 2rem 1rem; font: 17px/1.55 Georgia, serif; color: #1d2030; background: #fbfaf7; }
h1 { margin: 0; } .made { color: #666; } h2 { margin: 2rem 0 0.5rem; border-bottom: 1px solid #ccc; color: #0f7f74; }
article { margin: 1rem 0 1.5rem; } h3 { margin: 0.1rem 0; } .when { margin: 0; color: #0f7f74; font-size: 0.9rem; }
.kind { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; color: #666; margin-right: 0.5rem; }
.facts, .missing, .links span { color: #666; font-size: 0.9rem; } figure { margin: 0.75rem 0; } img { max-width: 100%; border-radius: 8px; }
figcaption { color: #666; font-size: 0.9rem; } .links { padding-left: 1.2rem; }
</style>
</head>
<body>
<h1>${escape(me)}'s life</h1>
<p class="made">Kept from Tapestry on ${escape(made.toUTCString())}: ${entries.length} ${entries.length === 1 ? "thing" : "things"}.</p>
${sections.join("\n")}
${rest ? `<p class="made">Everything else Tapestry keeps about you - your sign-in's email, your settings, your comments on others' memories, your likes, notices, reports and feedback, and each time support or a moderator saw something of yours - is in this page's data, below, for anything that reads it.</p>` : ""}
<script type="application/json" id="tapestry-data">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>
</body>
</html>
`;
}
