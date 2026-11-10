// A member's memory map, shared by its link (map.html#<token>): for anyone, signed in or
// not. What it shows is decided on the platform (tapestry_shared_map): the member's name
// and a dot for each of their own memories at their own places with a point - its year,
// and its title only if it is shared with everyone on Tapestry. Drawn as the Places
// screen draws it (memorymap.js), nothing opening; asked again whenever the page is
// looked at again, so it is as the member's memories are now.

import { Backend } from "./backend/backend.js?v=6373757c9335";
import { KEY, PLATFORM } from "./loom.js?v=6373757c9335";
import { MemoryMap, sharedDots } from "./memorymap.js?v=6373757c9335";

// no one's session: the platform's publishable key alone
const backend = new Backend(PLATFORM, KEY, { keptIn: "tapestry_shared_map" });
const map = new MemoryMap({ opens: false });
const $ = (id) => document.getElementById(id);

async function show() {
  const token = decodeURIComponent(location.hash.slice(1));
  const got = token ? await backend.callRpc("tapestry_shared_map", { token }) : { ok: true, data: null };
  if (!got.ok) { $("said").textContent = "The map can't be reached just now. Try again in a little while."; return; }
  if (!got.data) {
    document.title = "Tapestry: a map of memories";
    $("whose").textContent = "This map isn't shared";
    $("said").textContent = "Its link has been stopped, or isn't whole: ask whoever sent it for a new one.";
    $("shown").hidden = true;
    return;
  }
  const plotted = sharedDots(got.data);
  document.title = `${got.data.name}'s memories - Tapestry`;
  $("whose").textContent = `${got.data.name}'s memories`;
  $("said").textContent = plotted.dots.length
    ? `${plotted.dots.length === 1 ? "A memory" : `${plotted.dots.length} memories`} on the map, coloured by when: the oldest purple, the newest yellow. Press a dot to see what and when.`
    : "No memories on the map yet.";
  $("shown").hidden = !plotted.dots.length;
  $("from").textContent = String(plotted.from ?? "");
  $("to").textContent = String(plotted.to ?? "");
  await map.show($("memory-map"), plotted);
}

show();
// looked at again: as it is now
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") show(); });
window.addEventListener("hashchange", show);
