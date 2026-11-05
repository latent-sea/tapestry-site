// Buttons side by side, of one look, made one size: a grid whose cells are as
// wide as the widest of them needs for its words, as many to a line as fit,
// each filling its cell. Kept so as the page changes (a button shown or
// hidden, its words changed). A row that mixes looks, or has words among its
// buttons, is left as it is.

const SKIP = ".Nav, .TopNav, .LifeWays, .RandomRow, .DateKey, .LabelTags, .Thumbs, .Dots, .Years";
const STATES = /^(chime-current|chime-.*)$/;

/** A pressable's look: its own classes, but the states the page puts on it. */
const lookOf = (el) => [...el.classList].filter((c) => !STATES.test(c)).sort().join(".");

const shown = (el) => !el.hidden && el.getClientRects().length > 0;

/** One row made a grid of equal cells, or left (and put back) when it isn't buttons of one look. */
function fit(row) {
  const kids = [...row.children].filter(shown);
  const buttons = kids.filter((k) => k.matches(".chime-pressable, a.chime-hyperlink"));
  const same = buttons.length > 1 && buttons.length === kids.length && buttons.every((b) => lookOf(b) === lookOf(buttons[0]));
  if (!same) {
    if (row.classList.contains("ButtonGrid")) { row.classList.remove("ButtonGrid"); row.style.removeProperty("--cell"); }
    return;
  }
  // each one's own width for its words, measured out of the grid
  row.classList.remove("ButtonGrid");
  let widest = 0;
  for (const b of buttons) {
    const was = b.style.width;
    b.style.width = "max-content";
    widest = Math.max(widest, b.getBoundingClientRect().width);
    b.style.width = was;
  }
  row.style.setProperty("--cell", `${Math.ceil(widest)}px`);
  row.classList.add("ButtonGrid");
}

/** Every row of buttons under the element kept as a grid, now and as the page changes. */
export function keepButtonGrids(element) {
  let waiting = false;
  const all = () => {
    waiting = false;
    for (const row of element.querySelectorAll(".chime-row")) if (!row.matches(SKIP)) fit(row);
  };
  const soon = () => { if (!waiting) { waiting = true; requestAnimationFrame(all); } };
  new MutationObserver(soon).observe(element, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["hidden"] });
  addEventListener("resize", soon);
  soon();
}
