// Links on a memory: those added to it, and any written in its words - a
// video, a song, an article. A YouTube link is a video, played in the memory
// itself from YouTube's privacy-enhanced address (youtube-nocookie.com),
// which loads nothing until it is pressed. Plain data in, plain data out,
// tested by tests/test_links.mjs.

/** The most links a memory keeps (backend.sql holds it too). */
export const MOST = 20;

const WORDS_LINK = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?\]]/gi;

/** A link as typed or pasted, made whole: "https://..." for "www.example.com"; "" for none that could be one. */
export function linkOf(typed) {
  let text = String(typed ?? "").trim();
  if (!text) return "";
  if (!/^https?:\/\//i.test(text)) text = `https://${text}`;
  try {
    const url = new URL(text);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".") || /\s/.test(text)) return "";
    return url.href;
  } catch {
    return "";
  }
}

/** A link found in words without a closing bracket that closes something around it, not one of its own: "(see https://a.b/c)". */
function balanced(found) {
  let link = found;
  while (link.endsWith(")") && (link.match(/\(/g) ?? []).length < (link.match(/\)/g) ?? []).length) link = link.slice(0, -1);
  return link;
}

/** Every link written in some words, in the order written, each once. */
export function linksIn(words) {
  return [...new Set((String(words ?? "").match(WORDS_LINK) ?? []).map(balanced).map(linkOf).filter(Boolean))];
}

/** The YouTube video a link is of: its id, or "". */
export function youTubeId(link) {
  let url;
  try { url = new URL(link); } catch { return ""; }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  const id = host === "youtu.be" ? url.pathname.slice(1).split("/")[0]
    : host === "youtube.com" || host === "youtube-nocookie.com"
      ? url.pathname === "/watch" ? url.searchParams.get("v") ?? "" : (url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/]+)/) ?? [])[1] ?? ""
      : "";
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
}

/** Where a link goes, as a person reads it: "bbc.co.uk", "youtube.com". */
export function siteOf(link) {
  try { return new URL(link).hostname.replace(/^www\./, ""); } catch { return link; }
}

/** What stands for a video until it is pressed (video.svg). */
const VIDEO_POSTER = new URL("./video.svg", import.meta.url).href;

/**
 * A memory's links as its page shows them: those added, then those in its
 * words, each once - { url, site, video } where video, for a YouTube link,
 * is { id, src, poster }.
 */
export function linksOf(memory) {
  const all = [...new Set([...(memory?.links ?? []).map((link) => linkOf(link.url ?? link)), ...linksIn(memory?.body)].filter(Boolean))];
  return all.map((url) => {
    const id = youTubeId(url);
    // its picture Tapestry's own: YouTube sees nothing of whoever reads the memory until they press to play
    const video = id ? { id, src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`, poster: VIDEO_POSTER } : null;
    return { url, site: siteOf(url), video };
  });
}
