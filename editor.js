// Writing a memory, an event or a period: one draft, whichever it is, and
// the screen it is written on.
//
// - When is typed as a person says it (when.js): "June 1998", "about 1995 –
//   1998", "2004 – now". A memory with no time of its own takes its event's.
// - A memory may be of an event the member is at, during a period of theirs,
//   at a place; an event or a period at a place. People are tagged from the
//   member's own list, or added to it as they are typed.
// - Who sees it: one of four audiences, then people or circles let in or
//   kept out, and before it is saved, the names of exactly who that is
//   (Weave.audienceOf, the platform's own rule).
// - Pictures, on a memory: chosen from the device, shown at once, kept once
//   the memory is saved.

import { Controller, Driver, Phrase, Themes } from "./gd_chime/gd_chime.js?v=eba5a4f179db";
import { EXAMPLES, parseSpan, sayWhen, saySpan } from "./when.js?v=eba5a4f179db";
import { spanOfDays, takenFrom } from "./photo_date.js?v=eba5a4f179db";
import { AUDIENCES, periodsOf, timeOf, withKind } from "./weave.js?v=eba5a4f179db";
import { chooser, dotOf, heading, notice, problem } from "./parts.js?v=eba5a4f179db";
import { MOST as MOST_LINKS, linkOf, siteOf, youTubeId } from "./links.js?v=eba5a4f179db";
import { DANGER, LINK } from "./look/look.js?v=eba5a4f179db";

export const EDIT = "edit";

export const ADDS_MEMORY = "adds_a_memory";
export const ADDS_EVENT = "adds_an_event";
export const ADDS_PERIOD = "adds_a_period";
export const ADDS_MEMORY_TO = "adds_a_memory_to_this";
export const EDITS = "edits_this";
export const SETS_TITLE = "sets_the_title";
export const SETS_TEXT = "sets_the_words";
export const SETS_WHEN = "sets_when";
export const SETS_EVENT_TITLE = "sets_the_name_of_the_event_it_becomes";
export const LOOKS_FOR_EVENT = "looks_for_an_event";
export const PICKS_EVENT = "picks_an_event";
export const DROPS_EVENT = "drops_the_event";
export const LOOKS_FOR_PERIOD = "looks_for_a_period";
export const PICKS_PERIOD = "picks_a_period";
export const DROPS_PERIOD = "drops_the_period";
export const LOOKS_FOR_PLACE = "looks_for_a_place";
export const PICKS_PLACE = "picks_a_place";
export const DROPS_PLACE = "drops_the_place";
export const ADDS_NEW_PLACE = "adds_a_new_place";
export const ADDS_NEW_EVENT = "adds_a_new_event";
export const ADDS_NEW_PERIOD = "adds_a_new_period";
export const LOOKS_FOR_LABEL = "looks_for_a_label";
export const PICKS_LABEL = "picks_a_label";
export const ADDS_LABEL = "adds_a_label";
export const DROPS_LABEL = "drops_a_label";
export const LOOKS_FOR_PERSON = "looks_for_a_person";
export const TAGS = "tags_a_person";
export const UNTAGS = "untags_a_person";
export const ADDS_NEW_PERSON = "adds_and_tags_a_new_person";
export const SETS_AUDIENCE = "sets_who_sees_it";
export const SETS_PERIOD_TYPE = "sets_the_kind_of_period";
export const ADDS_PERIOD_KIND = "adds_a_kind_of_period";
export const SETS_NEW_KIND = "types_a_new_kind_of_period";
export const LOOKS_FOR_SHARE = "looks_for_someone_to_let_in_or_keep_out";
export const LETS_IN = "lets_them_in";
export const KEEPS_OUT = "keeps_them_out";
export const DROPS_SHARE = "drops_a_let_in_or_keep_out";
export const ADDS_PICTURE = "adds_a_picture";
export const SETS_LINK = "sets_a_link";
export const ADDS_LINK = "adds_the_link";
export const DROPS_LINK = "drops_a_link";
export const DROPS_PICTURE = "drops_a_picture";
export const USES_PHOTO_DATE = "uses_the_photos_date";
export const SETS_CAPTION = "sets_a_caption";
export const SAVES = "saves_it";
export const ASKS_TO_DELETE = "asks_to_delete_it";
export const DELETES = "deletes_it";
export const KEEPS_IT = "keeps_it";
export const CANCELS = "cancels_writing";

export const WORDS = {
  [ADDS_MEMORY]: ["Add a memory"],
  [ADDS_EVENT]: ["Add an event"],
  [ADDS_PERIOD]: ["Add a period"],
  [ADDS_MEMORY_TO]: ["Add a memory of this"],
  [EDITS]: ["Edit"],
  [SETS_TITLE]: ["Title"],
  [SETS_TEXT]: ["Words"],
  [SETS_WHEN]: ["When"],
  [SETS_EVENT_TITLE]: ["The event's name"],
  [LOOKS_FOR_EVENT]: ["Find an event"],
  [PICKS_EVENT]: ["Choose this event"],
  [DROPS_EVENT]: ["Not of an event"],
  [LOOKS_FOR_PERIOD]: ["Find a period"],
  [PICKS_PERIOD]: ["Choose this period"],
  [DROPS_PERIOD]: ["Not in a period"],
  [LOOKS_FOR_PLACE]: ["Find a place"],
  [PICKS_PLACE]: ["Choose this place"],
  [DROPS_PLACE]: ["Not at a place"],
  [ADDS_NEW_PLACE]: ["Add it as a new place"],
  [ADDS_NEW_EVENT]: ["Make it a new event"],
  [ADDS_NEW_PERIOD]: ["Make it a new period"],
  [LOOKS_FOR_LABEL]: ["Find a label"],
  [PICKS_LABEL]: ["Add this label"],
  [ADDS_LABEL]: ["Add it as a label"],
  [DROPS_LABEL]: ["Take off this label"],
  [LOOKS_FOR_PERSON]: ["Find someone"],
  [TAGS]: ["Tag them"],
  [UNTAGS]: ["Untag them"],
  [ADDS_NEW_PERSON]: ["Add them as someone new"],
  [SETS_AUDIENCE]: ["Choose who sees it"],
  [SETS_PERIOD_TYPE]: ["Choose what kind of time it was"],
  [ADDS_PERIOD_KIND]: ["Add this kind"],
  [SETS_NEW_KIND]: ["A kind of your own"],
  [LOOKS_FOR_SHARE]: ["Find someone or a circle"],
  [LETS_IN]: ["Let in"],
  [KEEPS_OUT]: ["Keep out"],
  [DROPS_SHARE]: ["Remove"],
  [ADDS_PICTURE]: ["Add pictures"],
  [USES_PHOTO_DATE]: ["Use that for when"],
  [SETS_LINK]: ["A link"],
  [ADDS_LINK]: ["Add the link"],
  [DROPS_LINK]: ["Remove"],
  [DROPS_PICTURE]: ["Remove"],
  [SETS_CAPTION]: ["Caption"],
  [SAVES]: ["Save"],
  [ASKS_TO_DELETE]: ["Delete"],
  [DELETES]: ["Yes, delete it"],
  [KEEPS_IT]: ["No, keep it"],
  [CANCELS]: ["Cancel"],
};

const OPENS = [ADDS_MEMORY, ADDS_EVENT, ADDS_PERIOD, ADDS_MEMORY_TO, EDITS];
const MOST = 6; // matches shown for what is typed

const KIND_WORDS = {
  memory: { made: "New memory", changed: "Edit memory", title: "Title (if you like)", text: "What do you remember?", people: "Who's in it",
    whenHint: "As exactly as you remember it: \"now\", a day (with its time, if you like: \"12 June 1998, 2pm\"), a month, a season, a quarter (\"Q4 2026\"), a year or a decade, \"about\" for a guess - or, not sure, the edges of your guess: \"between 1983 and 1984\". Leave it empty for its event's time, or none." },
  event: { made: "New event", changed: "Edit event", title: "What happened", text: "Notes", people: "Who was there",
    whenHint: "As exactly as you remember it: \"12 June 1998\", \"about 1995\", or \"12 – 19 June 1998\" for something that went on." },
  period: { made: "New period", changed: "Edit period", title: "What was this time of your life", text: "Notes", people: "Who was with you",
    whenHint: "When it started and ended, each as exactly as you know it: \"2004 – about 2009\", or \"June 2004 – now\" if it goes on." },
};

const matching = (looked, label) => label.toLowerCase().includes(looked.trim().toLowerCase());

export class Editor extends Controller {
  /** Through the loom; done(deleted) is called once a draft is saved or deleted. */
  constructor(chimes, loom, account, done) {
    super(chimes);
    this.loom = loom;
    this.account = account;
    this.done = done;
    this.kind = this.value("memory");
    this.id = this.value(null);
    this.title = this.value("");
    this.text = this.value("");
    this.whenText = this.value("");
    this.eventId = this.value(null);
    this.eventTitle = this.value(""); // the event a memory becomes when someone on Tapestry is tagged: named here, never by its words
    this.periodIds = this.value([]); // a memory's periods: as many as overlap
    this.placeId = this.value(null);
    this.tags = this.value([]);
    this.audience = this.value("there");
    this.shares = this.value([]);
    this.pictures = this.value([]); // kept: { id, path }
    this.added = this.value([]); // chosen, not yet kept: { key, file, address }
    this.removed = this.value([]); // kept, to remove on saving: { id, path }
    this.captions = this.value({}); // a picture's id (kept) or key (chosen) -> its caption as typed
    this.links = this.value([]); // { url }
    this.linkText = this.value("");
    this.newKind = this.value("");
    this.searches = { event: this.value(""), period: this.value(""), place: this.value(""), person: this.value(""), share: this.value(""), label: this.value("") };
    this.periodType = this.value(""); // a period's kind, as the member names their kinds, or "" for none
    this.labels = this.value([]); // a memory's labels, its owner's own: school, music, holidays
    this.busy = this.value(false);
    this.fetching = this.value(false); // a long memory's words being fetched in full: nothing is saved until they are
    this.confirming = this.value(false);
    this.problem = this.value("");
    this.notice = this.value("");
  }

  weave() { return this.account.weave.read(); }

  answers() { return Object.keys(WORDS); }

  /** Whether saving makes this memory an event: someone on Tapestry tagged, a time said, and no event chosen. */
  becomesEvent() {
    if (this.kind.read() !== "memory" || this.eventId.read()) return false;
    const weave = this.weave();
    const saved = this.id.read() ? weave.memories.get(this.id.read()) : null;
    if (saved?.event_id) return false;
    return !!this.span().starts && this.tags.read().some((id) => !!weave.people.get(id)?.account);
  }

  /**
   * When the pictures added say they were taken - a day, or from the first
   * to the last - as words for when: { said, starts, ends }; null when they
   * say nothing, or when says it already.
   */
  photoSpan() {
    const days = spanOfDays(this.added.read().map((p) => p.taken));
    if (!days) return null;
    const day = (date) => ({ date, precision: "day", about: false });
    const said = saySpan(day(days.starts), days.ends ? day(days.ends) : null, "", this.kind.read() === "memory");
    const now = this.span();
    if (now.starts?.date === days.starts && now.starts?.precision === "day" && (now.ends?.date ?? null) === (days.ends ?? null)) return null;
    return { said, ...days };
  }

  /** The span typed, read: { starts, ends, error }. A period that names one time is all within it, unless it says it goes on. */
  span() {
    const read = parseSpan(this.whenText.read(), new Date(), this.weave().born);
    if (read.error || !read.starts) return read;
    if (this.kind.read() !== "period" && read.going) return { starts: null, ends: null, error: "Only a period goes on until now" };
    if (this.kind.read() === "period" && !read.ends && !read.going) return { ...read, ends: read.starts };
    return read;
  }

  would(action, payload) {
    if (OPENS.includes(action)) {
      const [kind, id, tied, tiedId] = String(payload?.parameter ?? "").split(":");
      const weave = this.weave();
      // on the free plan: what others share, and comments on it - no thread of their own
      if (!weave.writes) return Phrase.of("Keeping your own thread is part of the paid plan");
      if (action === ADDS_MEMORY_TO && !weave.isAt(weave.events.get(tiedId), weave.meId)) return Phrase.of("Only someone who was there adds to it");
      if (action === EDITS && id !== "new" && ({ memory: weave.memories, event: weave.events, period: weave.periods }[kind]?.get(id)?.owner !== weave.meId)) {
        return Phrase.of("Only its owner edits it");
      }
      return tied && !tiedId ? Phrase.of("Nothing to add to") : null;
    }
    if ((action === SAVES || action === DELETES || action === ASKS_TO_DELETE) && this.busy.read()) return Phrase.of("Saving");
    if (action === SAVES && this.fetching.read()) return Phrase.of("Fetching all its words");
    if (action === SAVES) {
      const kind = this.kind.read();
      const span = this.span();
      if (span.error) return Phrase.of("First fix when it was");
      if (kind !== "memory" && !span.starts) return Phrase.of("Say when, even roughly");
      if (kind !== "memory" && !this.title.read().trim()) return Phrase.of(kind === "event" ? "Say what happened" : "Give this time a name");
      if (kind === "memory" && !this.title.read().trim() && !this.text.read().trim() && !this.pictures.read().length && !this.added.read().length) {
        return Phrase.of("Write something, or add a picture");
      }
      if (this.becomesEvent() && !this.eventTitle.read().trim() && !this.title.read().trim()) return Phrase.of("Give the event it becomes a name");
    }
    if (action === ASKS_TO_DELETE && !this.id.read()) return Phrase.of("Not saved yet");
    if (action === USES_PHOTO_DATE && !this.photoSpan()) return Phrase.of("The pictures don't say when they were taken");
    if (action === ADDS_LINK) {
      const link = linkOf(this.linkText.read());
      if (!link) return Phrase.of(this.linkText.read().trim() ? "That isn't a web address" : "Paste a link first");
      if (this.links.read().some((l) => l.url === link)) return Phrase.of("That link is on it already");
      if (this.links.read().length >= MOST_LINKS) return Phrase.with("A memory has at most %d links", [MOST_LINKS]);
    }
    if (action === ADDS_NEW_EVENT) {
      if (!this.searches.event.read().trim()) return Phrase.of("Type a name first");
      if (this.span().error || !this.span().starts) return Phrase.of("First say when it was: an event has a time");
    }
    if (action === ADDS_LABEL && !this.searches.label.read().trim()) return Phrase.of("Type a label first");
    if (action === ADDS_NEW_PERIOD) {
      if (!this.searches.period.read().trim()) return Phrase.of("Type a name first");
      // one already of that name is chosen, whatever the memory's time
      const named = this.searches.period.read().trim().toLowerCase();
      const weave = this.weave();
      const known = weave.data.periods.some((p) => p.owner === weave.meId && p.title.toLowerCase() === named);
      if (!known && (this.span().error || !this.span().starts)) return Phrase.of("First say when it was: a new period starts from this memory's time");
    }
    if ((action === ADDS_NEW_PERSON || action === ADDS_NEW_PLACE) && !this.searches[action === ADDS_NEW_PERSON ? "person" : "place"].read().trim()) {
      return Phrase.of("Type a name first");
    }
    return null;
  }

  told(action, payload) {
    this.notice.setValue("");
    if (OPENS.includes(action)) this.open(String(payload.parameter));
    if (action === SETS_TITLE) this.title.setValue(payload.line);
    if (action === SETS_TEXT) this.text.setValue(payload.line);
    if (action === SETS_WHEN) this.whenText.setValue(payload.line);
    if (action === SETS_EVENT_TITLE) this.eventTitle.setValue(payload.line);
    if (action === LOOKS_FOR_EVENT) this.searches.event.setValue(payload.line);
    if (action === LOOKS_FOR_PERIOD) this.searches.period.setValue(payload.line);
    if (action === LOOKS_FOR_PLACE) this.searches.place.setValue(payload.line);
    if (action === LOOKS_FOR_PERSON) this.searches.person.setValue(payload.line);
    if (action === LOOKS_FOR_SHARE) this.searches.share.setValue(payload.line);
    if (action === PICKS_EVENT) {
      this.eventId.setValue(payload.id);
      this.searches.event.setValue("");
      // the event's place, unless the memory has one of its own
      if (!this.placeId.read()) this.placeId.setValue(this.weave().events.get(payload.id)?.place_id ?? null);
    }
    if (action === DROPS_EVENT) this.eventId.setValue(null);
    if (action === PICKS_PERIOD) { this.periodIds.update((ids) => (ids.includes(payload.id) ? ids : [...ids, payload.id])); this.searches.period.setValue(""); }
    if (action === DROPS_PERIOD) this.periodIds.update((ids) => ids.filter((id) => id !== payload.id));
    if (action === PICKS_PLACE) { this.placeId.setValue(payload.id); this.searches.place.setValue(""); }
    if (action === DROPS_PLACE) this.placeId.setValue(null);
    if (action === ADDS_NEW_PLACE) this.addPlace(this.searches.place.read().trim());
    if (action === ADDS_NEW_EVENT) this.addEvent(this.searches.event.read().trim());
    if (action === ADDS_NEW_PERIOD) this.addPeriod(this.searches.period.read().trim());
    if (action === LOOKS_FOR_LABEL) this.searches.label.setValue(payload.line);
    // a label as typed - in small letters, once - or one of theirs already
    if (action === PICKS_LABEL || action === ADDS_LABEL) {
      const label = String(action === PICKS_LABEL ? payload.id : this.searches.label.read()).trim().toLowerCase().slice(0, 40);
      if (label) this.labels.update((list) => (list.includes(label) ? list : [...list, label]));
      this.searches.label.setValue("");
    }
    if (action === DROPS_LABEL) this.labels.update((list) => list.filter((l) => l !== payload.id));
    if (action === TAGS) { this.tag(payload.id); this.searches.person.setValue(""); }
    if (action === UNTAGS) this.tags.update((tags) => tags.filter((id) => id !== payload.id));
    if (action === ADDS_NEW_PERSON) this.addPerson(this.searches.person.read().trim());
    if (action === SETS_AUDIENCE) this.audience.setValue(payload.audience);
    if (action === SETS_PERIOD_TYPE) this.periodType.setValue(payload.type);
    if (action === SETS_NEW_KIND) this.newKind.setValue(payload.line);
    if (action === ADDS_PERIOD_KIND) this.addKind(this.newKind.read());
    if (action === LETS_IN || action === KEEPS_OUT) {
      const [which, id] = String(payload.id).split(":");
      const share = { [which]: id, allowed: action === LETS_IN };
      this.shares.update((shares) => [...shares.filter((s) => s[which] !== id), share]);
      this.searches.share.setValue("");
    }
    if (action === DROPS_SHARE) this.shares.update((shares) => shares.filter((s) => (s.person ?? s.circle) !== payload.id));
    if (action === SETS_CAPTION) this.captions.update((all) => ({ ...all, [payload.id]: payload.line }));
    if (action === SETS_LINK) this.linkText.setValue(payload.line);
    if (action === ADDS_LINK) { this.links.update((list) => [...list, { url: linkOf(this.linkText.read()) }]); this.linkText.setValue(""); }
    if (action === DROPS_LINK) this.links.update((list) => list.filter((l) => l.url !== payload.id));
    if (action === ADDS_PICTURE) {
      if (!payload.file.type.startsWith("image/")) return Phrase.of("Please choose a picture (JPEG, PNG, WebP or GIF)");
      const key = `added-${Date.now()}-${this.added.read().length}`;
      this.added.update((list) => [...list, { key, file: payload.file, address: URL.createObjectURL(payload.file), taken: null }]);
      // the day the camera says it was taken, offered for when
      takenFrom(payload.file).then((day) => {
        if (day && !this.disposed) this.added.update((list) => list.map((p) => (p.key === key ? { ...p, taken: day } : p)));
      });
    }
    if (action === USES_PHOTO_DATE) {
      const offered = this.photoSpan();
      if (offered) this.whenText.setValue(offered.said);
    }
    if (action === DROPS_PICTURE) {
      const kept = this.pictures.read().find((p) => p.id === payload.id);
      if (kept) { this.removed.update((list) => [...list, kept]); this.pictures.update((list) => list.filter((p) => p !== kept)); }
      const dropped = this.added.read().find((p) => p.key === payload.id);
      if (dropped) URL.revokeObjectURL(dropped.address);
      this.added.update((list) => list.filter((p) => p !== dropped));
    }
    if (action === SAVES) this.save();
    if (action === ASKS_TO_DELETE) this.confirming.setValue(true);
    if (action === KEEPS_IT) this.confirming.setValue(false);
    if (action === DELETES) this.delete();
    return null;
  }

  /** A long memory's words in full put in the draft, unless it was closed first; until they are, it isn't saved. */
  async fetchWhole(item) {
    const known = this.account.texts.read()[item.id];
    if (known !== undefined) { this.text.setValue(known); return; }
    this.fetching.setValue(true);
    const fetched = await this.account.fetchTexts([item.id]);
    if (this.disposed || this.id.read() !== item.id) return;
    const whole = this.account.texts.read()[item.id];
    if (!fetched || whole === undefined) { this.problem.setValue("Couldn't fetch all of its words: go back and open it again."); return; }
    // typed into while it came: what was typed, and the rest after it
    this.text.setValue(this.text.read() === item.body ? whole : this.text.read() + whole.slice(item.body.length));
    this.fetching.setValue(false);
  }

  /** A draft opened: "memory:new", "memory:new:event:<id>" (or :period:, :place:), "event:<id>"... */
  open(parameter) {
    const [kind, id, tied, tiedId] = parameter.split(":");
    const weave = this.weave();
    const item = id === "new" ? null : { memory: weave.memories, event: weave.events, period: weave.periods }[kind].get(id);
    this.kind.setValue(kind);
    this.id.setValue(item?.id ?? null);
    this.title.setValue(item?.title ?? "");
    this.text.setValue((kind === "memory" ? item?.body : item?.notes) ?? "");
    // a long memory a light load cut short: its words in full, fetched before it can be saved
    this.fetching.setValue(false);
    if (kind === "memory" && item?.cut) this.fetchWhole(item);
    this.whenText.setValue(item ? saySpan(timeOf(item, "starts"), timeOf(item, "ends"), kind === "period" ? "now" : "", kind === "memory") : "");
    this.eventId.setValue(item?.event_id ?? (tied === "event" ? tiedId : null));
    this.eventTitle.setValue("");
    this.periodIds.setValue(item ? periodsOf(item) : tied === "period" ? [tiedId] : []);
    this.placeId.setValue(item?.place_id ?? (tied === "place" ? tiedId : tied === "event" ? weave.events.get(tiedId)?.place_id ?? null : null));
    this.tags.setValue(item ? item.tags.map((tag) => tag.person).filter(Boolean) : []);
    this.labels.setValue(kind === "memory" && item ? [...(item.labels ?? [])] : []);
    this.periodType.setValue(kind === "period" ? item?.kind ?? "" : "");
    this.newKind.setValue("");
    this.searches.label.setValue("");
    this.audience.setValue(item?.audience ?? weave.defaultAudience(kind));
    this.shares.setValue(item ? item.shares.map((s) => (s.person ? { person: s.person, allowed: s.allowed } : { circle: s.circle, allowed: s.allowed })) : []);
    this.pictures.setValue(item?.pictures ? item.pictures.map(({ id: pid, path, caption }) => ({ id: pid, path, caption: caption ?? "" })) : []);
    this.captions.setValue({});
    this.links.setValue(item?.links ? item.links.map((l) => ({ url: l.url })) : []);
    this.linkText.setValue("");
    for (const left of this.added.read()) URL.revokeObjectURL(left.address);
    this.added.setValue([]);
    this.removed.setValue([]);
    for (const search of Object.values(this.searches)) search.setValue("");
    this.confirming.setValue(false);
    this.problem.setValue("");
  }

  tag(personId) { this.tags.update((tags) => (tags.includes(personId) ? tags : [...tags, personId])); }

  /** Someone typed: one of the member's people if the name is theirs already, else added to them. Then tagged. */
  async addPerson(name) {
    const known = this.weave().data.people.find((p) => p.name.toLowerCase() === name.toLowerCase());
    this.searches.person.setValue("");
    if (known) { this.tag(known.id); return; }
    const made = await this.loom.addPerson(name);
    if (!made.ok) { this.problem.setValue(made.error); return; }
    await this.account.load();
    this.tag(made.data.id);
  }

  /** A place typed: the member's own of that name if there is one, else a new one. Then chosen. */
  async addPlace(name) {
    const known = this.weave().data.places.find((p) => p.owner === this.weave().meId && p.name.toLowerCase() === name.toLowerCase());
    this.searches.place.setValue("");
    if (known) { this.placeId.setValue(known.id); return; }
    const made = await this.loom.addPlace(name);
    if (!made.ok) { this.problem.setValue(made.error); return; }
    await this.account.load();
    this.placeId.setValue(made.data.id);
  }

  /**
   * A new event, named as typed, made from the memory being written - its time, its place, its people -
   * and chosen for it: no event need be made first. One of the member's own by that name is chosen instead.
   */
  async addEvent(title) {
    const weave = this.weave();
    const known = weave.data.events.find((e) => e.owner === weave.meId && e.title.toLowerCase() === title.toLowerCase());
    this.searches.event.setValue("");
    if (known) { this.eventId.setValue(known.id); return; }
    const { starts, ends } = this.span();
    const time = (which, at) => ({ [which]: at?.date ?? "", [`${which}_precision`]: at?.precision ?? "day", [`${which}_about`]: !!at?.about, [`${which}_time`]: at?.time ?? "" });
    const made = await this.loom.saveEvent({ title, notes: "", ...time("starts", starts), ...time("ends", ends), place_id: this.placeId.read() ?? "",
      audience: weave.defaultAudience("event"), tags: this.tags.read(), shares: [] });
    if (!made.ok) { this.problem.setValue(made.error); return; }
    await this.account.load();
    this.eventId.setValue(made.data);
  }

  /**
   * A period named as typed, chosen for the memory: one of that name already
   * if there is one; else made, over this memory's time for now - its own
   * beginning and end are said on it, in Periods.
   */
  async addPeriod(title) {
    const weave = this.weave();
    const known = weave.data.periods.find((p) => p.owner === weave.meId && p.title.toLowerCase() === title.toLowerCase());
    this.searches.period.setValue("");
    const choose = (id) => this.periodIds.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
    if (known) { choose(known.id); return; }
    const { starts, ends } = this.span();
    const time = (which, at) => ({ [which]: at?.date ?? "", [`${which}_precision`]: at?.precision ?? "day", [`${which}_about`]: !!at?.about, [`${which}_time`]: "" });
    const made = await this.loom.savePeriod({ title, notes: "", ...time("starts", starts), ...time("ends", ends ?? starts), place_id: "",
      audience: weave.defaultAudience("period"), tags: [], shares: [] });
    if (!made.ok) { this.problem.setValue(made.error); return; }
    await this.account.load();
    choose(made.data);
    this.notice.setValue(Phrase.with("Made the period “%s”, over this memory's time for now: open it in Periods to say when it began and ended.", [title]));
  }

  /** A kind of period of the member's own made, kept on them, and chosen for this one. */
  async addKind(name) {
    const named = String(name ?? "").trim().slice(0, 40);
    if (!named) return;
    const kinds = this.weave().periodKinds;
    const made = withKind(kinds, named);
    this.newKind.setValue("");
    if (made !== kinds) {
      const kept = await this.loom.saveDefaults({ period_kinds: made });
      if (!kept.ok) { this.problem.setValue(kept.error); return; }
      await this.account.load();
    }
    this.periodType.setValue(made.find((k) => k.name.toLowerCase() === named.toLowerCase())?.name ?? named);
  }

  /** The draft as the platform's save takes it. */
  given() {
    const kind = this.kind.read();
    const { starts, ends } = this.span();
    const time = (which, at) => ({ [which]: at?.date ?? "", [`${which}_precision`]: at?.precision ?? "day", [`${which}_about`]: !!at?.about, [`${which}_time`]: at?.time ?? "" });
    const common = {
      id: this.id.read() ?? "", title: this.title.read().trim(), ...time("starts", starts), ...time("ends", ends),
      place_id: this.placeId.read() ?? "", audience: this.audience.read(), tags: this.tags.read(), shares: this.shares.read(),
    };
    if (kind === "memory") return { ...common, body: this.text.read(), links: this.links.read(), event_id: this.eventId.read() ?? "", period_ids: this.periodIds.read(),
      event_title: this.becomesEvent() ? (this.eventTitle.read().trim() || this.title.read().trim()) : "",
      labels: this.labels.read(),
      // the first as period_id too, which a platform from before there could be more keeps
      period_id: this.periodIds.read()[0] ?? "" };
    if (kind === "period") return { ...common, notes: this.text.read(), kind: this.periodType.read() };
    return { ...common, notes: this.text.read() };
  }

  async save() {
    const kind = this.kind.read();
    this.busy.setValue(true);
    this.problem.setValue("");
    const save = { memory: (g) => this.loom.saveMemory(g), event: (g) => this.loom.saveEvent(g), period: (g) => this.loom.savePeriod(g) }[kind];
    const saved = await save(this.given());
    if (saved.ok && kind === "memory") {
      for (const gone of this.removed.read()) await this.loom.removePicture(gone.id, gone.path);
      const typed = this.captions.read();
      for (const kept of this.pictures.read()) {
        if (kept.id in typed && typed[kept.id].trim() !== kept.caption) await this.loom.captionPicture(kept.id, typed[kept.id]);
      }
      let position = this.pictures.read().length;
      const waiting = [...this.added.read()];
      while (waiting.length) {
        const kept = await this.loom.addPicture(saved.data, waiting[0].file, position++, typed[waiting[0].key] ?? "");
        if (!kept.ok) { this.problem.setValue(kept.error); break; }
        URL.revokeObjectURL(waiting.shift().address);
      }
      // what wasn't kept stays chosen, for the next save to try again
      this.added.setValue(waiting);
      this.removed.setValue([]);
    }
    await this.account.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    if (!saved.ok) { this.problem.setValue(saved.error); return; }
    this.id.setValue(saved.data);
    if (!this.problem.read()) this.done(false, `${kind}:${saved.data}`);
  }

  async delete() {
    const kind = this.kind.read();
    const id = this.id.read();
    this.busy.setValue(true);
    const gone = kind === "memory" ? await this.loom.deleteMemory(id, this.pictures.read().map((p) => p.path))
      : kind === "event" ? await this.loom.deleteEvent(id) : await this.loom.deletePeriod(id);
    await this.account.load();
    if (this.disposed) return;
    this.busy.setValue(false);
    this.confirming.setValue(false);
    if (!gone.ok) { this.problem.setValue(gone.error); return; }
    this.done(true, "");
  }

  // --- what the screen lists ---

  /** Who it would be seen by, before it is saved. */
  audienceNow() {
    return this.weave().audienceOf({ kind: this.kind.read(), audience: this.audience.read(), tags: this.tags.read(), eventId: this.eventId.read(), shares: this.shares.read() });
  }

  chosenEvent() {
    const weave = this.weave();
    const event = weave.events.get(this.eventId.read());
    if (event) return [{ id: event.id, label: `${event.title} · ${weave.entry("event", event).said}` }];
    // one the member was at, and has left or may no longer see: still theirs to take off
    return this.eventId.read() ? [{ id: this.eventId.read(), label: "An event you are no longer shown" }] : [];
  }

  eventMatches() {
    const weave = this.weave();
    const looked = this.searches.event.read();
    return weave.data.events.filter((e) => weave.isAt(e, weave.meId) && matching(looked, e.title)).slice(0, MOST)
      .map((e) => ({ id: e.id, label: `${e.title} · ${weave.entry("event", e).said}` }));
  }

  chosenPeriods() {
    const weave = this.weave();
    return this.periodIds.read().map((id) => weave.periods.get(id)).filter(Boolean).map((p) => ({ id: p.id, label: p.title }));
  }

  periodMatches() {
    const weave = this.weave();
    const looked = this.searches.period.read();
    const chosen = this.periodIds.read();
    return weave.data.periods.filter((p) => p.owner === weave.meId && !chosen.includes(p.id) && matching(looked, p.title)).slice(0, MOST).map((p) => ({ id: p.id, label: p.title }));
  }

  chosenLabels() { return this.labels.read().map((label) => ({ id: label, label: `#${label}` })); }

  /** The member's labels matching what is typed, not on it already. */
  labelMatches() {
    const looked = this.searches.label.read();
    const chosen = this.labels.read();
    return this.weave().labels.filter(({ label }) => !chosen.includes(label) && matching(looked, label)).slice(0, MOST).map(({ label }) => ({ id: label, label: `#${label}` }));
  }

  chosenPlace() {
    const place = this.weave().places.get(this.placeId.read());
    return place ? [{ id: place.id, label: place.name }] : [];
  }

  placeMatches() {
    const weave = this.weave();
    const looked = this.searches.place.read();
    return weave.data.places.filter((p) => p.owner === weave.meId && matching(looked, p.name)).slice(0, MOST).map((p) => ({ id: p.id, label: p.name }));
  }

  chosenPeople() {
    const weave = this.weave();
    return this.tags.read().map((id) => ({ id, label: weave.people.get(id)?.name ?? "" }));
  }

  personMatches() {
    const weave = this.weave();
    const looked = this.searches.person.read();
    const tagged = this.tags.read();
    return weave.data.people.filter((p) => !tagged.includes(p.id) && matching(looked, p.name)).slice(0, MOST)
      .map((p) => ({ id: p.id, label: p.account ? p.name : `${p.name} (not on Tapestry)` }));
  }

  /** People and circles to let in or keep out: { id: "person:<id>" or "circle:<id>", label }. */
  shareMatches() {
    const weave = this.weave();
    const looked = this.searches.share.read();
    return [
      ...weave.data.circles.filter((c) => matching(looked, c.name)).map((c) => ({ id: `circle:${c.id}`, label: `${c.name} (circle)` })),
      ...weave.data.people.filter((p) => matching(looked, p.name)).map((p) => ({ id: `person:${p.id}`, label: p.name })),
    ].slice(0, MOST);
  }

  /** The people and circles let in or kept out, as said: { id, label }. */
  sharesSaid() {
    const weave = this.weave();
    return this.shares.read().map((s) => {
      const name = s.person ? weave.people.get(s.person)?.name ?? "" : `${weave.circles.get(s.circle)?.name ?? ""} (circle)`;
      return { id: s.person ?? s.circle, label: `${s.allowed ? "Let in" : "Kept out"}: ${name}` };
    });
  }
}

/** The screen a draft is written on. */
export function describeEditor(ui, editor, account) {
  const kind = editor.kind;
  const said = (key) => kind.map((k) => Phrase.of(KIND_WORDS[k][key]));
  const isMemory = kind.map((k) => k === "memory");
  const span = ui.bound(() => editor.span());
  const whenSaid = ui.bound(() => {
    const read = span.read();
    if (read.error) return read.error === EXAMPLES ? Phrase.of(EXAMPLES) : Phrase.of(read.error);
    if (!read.starts) return kind.read() === "memory" && editor.eventId.read() ? Phrase.of("The same as its event") : "";
    return Phrase.with("Read as: %s", [saySpan(read.starts, read.ends, read.going ? "now" : "", kind.read() === "memory")]);
  });
  const audience = ui.bound(() => editor.audienceNow());
  const notOn = audience.map((a) => (a.notOnTapestry.length ? Phrase.with("Not on Tapestry, so can't see it yet: %s", [a.notOnTapestry.join(", ")]) : ""));

  const thumbnail = (held, address) => {
    const which = () => held.read()?.id ?? held.read()?.key ?? "";
    return ui.column([
      ui.image(address, "EditThumb", Phrase.of("A picture")),
      ui.field(SETS_CAPTION, "CaptionField", { changes: SETS_CAPTION, placeholder: Phrase.of("Caption"),
        shows: ui.bound(() => editor.captions.read()[which()] ?? held.read()?.caption ?? ""), carries: (line) => ({ line, id: which() }) }),
      ui.pressable(DROPS_PICTURE, held.map((p) => ({ id: p?.id ?? p?.key ?? "" })), [ui.text(Phrase.of("Remove"), "Small")], LINK),
    ], "EditPicture");
  };

  return ui.screen(EDIT, [
    ui.text(ui.bound(() => Phrase.of(KIND_WORDS[kind.read()][editor.id.read() ? "changed" : "made"])), "Title"),
    ui.text(said("title"), "FieldName"),
    ui.field(SETS_TITLE, "", { changes: SETS_TITLE, shows: editor.title }),
    ui.text(Phrase.of("When"), "FieldName"),
    ui.field(SETS_WHEN, "", { changes: SETS_WHEN, shows: editor.whenText, placeholder: Phrase.of("e.g. June 1998, about 1995, 2004 – now") }),
    ui.text(said("whenHint"), "Hint").wraps(),
    ui.text(whenSaid, "Hint").wraps().hidesEmpty(),
    // a period's kind: its colour on the periods' chart, and what it is filtered by
    ui.when(kind.map((k) => k === "period"), ui.column([
      ui.text(Phrase.of("What kind of time"), "FieldName"),
      ui.eachAcross(account.weave.map((w) => [...w.periodKinds.map((k) => ({ type: k.name, said: k.name })), { type: "", said: "None" }]),
        (held) => ui.pressable(SETS_PERIOD_TYPE, held.map((k) => ({ type: k?.type ?? "" })),
          [ui.image(ui.bound(() => dotOf(account.weave.read().kindColour(held.read()?.type))), "SmallDot", ""), ui.text(held.map((k) => k?.said ?? ""), Themes.FACE)], "Segment")
          .currentWhile(ui.bound(() => editor.periodType.read() === (held.read()?.type ?? ""))), (k) => k.type || "none", "Segments"),
      ui.field(ADDS_PERIOD_KIND, "", { changes: SETS_NEW_KIND, shows: editor.newKind, placeholder: Phrase.of("Or a kind of your own - Enter adds it") }),
    ], "Part")),
    // an event is a grouping of memories: what is written goes in its memories, not on it
    ui.when(kind.map((k) => k !== "event"), ui.column([
      ui.text(said("text"), "FieldName"),
      ui.area(SETS_TEXT, editor.text, "TextArea Words"),
    ], "Part"), ui.text(Phrase.of("An event holds memories: once it is saved, add yours - and everyone at it adds theirs."), "Hint").wraps()),
    ui.when(isMemory, ui.column([
      chooser(ui, { label: Phrase.of("Of an event - one you were at, or name a new one"), chosen: ui.bound(() => editor.chosenEvent()), unpick: DROPS_EVENT,
        search: editor.searches.event, looks: LOOKS_FOR_EVENT, matches: ui.bound(() => editor.eventMatches()), pick: PICKS_EVENT,
        create: ADDS_NEW_EVENT, placeholder: Phrase.of("Type to find an event, or name a new one") }),
      chooser(ui, { label: Phrase.of("During periods of your life - as many as it was during"), chosen: ui.bound(() => editor.chosenPeriods()), unpick: DROPS_PERIOD,
        search: editor.searches.period, looks: LOOKS_FOR_PERIOD, matches: ui.bound(() => editor.periodMatches()), pick: PICKS_PERIOD,
        create: ADDS_NEW_PERIOD, placeholder: Phrase.of("Type to find a period, or name a new one") }),
    ], "Part")),
    chooser(ui, { label: Phrase.of("Where"), chosen: ui.bound(() => editor.chosenPlace()), unpick: DROPS_PLACE,
      search: editor.searches.place, looks: LOOKS_FOR_PLACE, matches: ui.bound(() => editor.placeMatches()), pick: PICKS_PLACE,
      create: ADDS_NEW_PLACE, placeholder: Phrase.of("Type a place") }),
    ui.when(isMemory, chooser(ui, { label: Phrase.of("Labels - yours alone, to find your memories by"), chosen: ui.bound(() => editor.chosenLabels()), unpick: DROPS_LABEL,
      search: editor.searches.label, looks: LOOKS_FOR_LABEL, matches: ui.bound(() => editor.labelMatches()), pick: PICKS_LABEL,
      create: ADDS_LABEL, placeholder: Phrase.of("e.g. school, music, holidays - Enter adds it") })),
    chooser(ui, { label: said("people"), chosen: ui.bound(() => editor.chosenPeople()), unpick: UNTAGS,
      search: editor.searches.person, looks: LOOKS_FOR_PERSON, matches: ui.bound(() => editor.personMatches()), pick: TAGS,
      create: ADDS_NEW_PERSON, placeholder: Phrase.of("Type a name") }),
    ui.when(ui.bound(() => isMemory.read() && !editor.eventId.read() && !editor.becomesEvent()),
      ui.text(Phrase.of("Tag someone who is on Tapestry and it becomes an event when saved: your threads cross there, and they add their own memories of it."), "Hint").wraps()),
    ui.when(ui.bound(() => editor.becomesEvent()), ui.column([
      ui.text(Phrase.of("Someone tagged is on Tapestry, so this becomes an event when saved, for them to add their own memories to. What was it? Give it a short name."), "Hint").wraps(),
      ui.field(SETS_EVENT_TITLE, "", { changes: SETS_EVENT_TITLE, shows: editor.eventTitle, label: Phrase.of("The event's name"),
        placeholder: Phrase.of("e.g. Lake picnic - or leave it, and it takes the memory's title") }),
    ], "Part")),
    ui.when(isMemory, ui.column([
      ui.text(Phrase.of("Pictures"), "FieldName"),
      ui.eachAcross(editor.pictures, (held) => thumbnail(held, held.map((p) => (p ? account.address(p.path) : ""))), (p) => p.id, "EditPictures"),
      ui.eachAcross(editor.added, (held) => thumbnail(held, held.map((p) => p?.address ?? "")), (p) => p.key, "EditPictures"),
      ui.file(ADDS_PICTURE, Phrase.of("Add pictures"), { accept: "image/*", multiple: true }),
      ui.when(ui.bound(() => !!editor.photoSpan()), ui.row([
        ui.text(ui.bound(() => {
          const offered = editor.photoSpan();
          if (!offered) return "";
          const day = (date) => sayWhen({ date, precision: "day" });
          return offered.ends ? Phrase.with("These were taken from %s to %s.", [day(offered.starts), day(offered.ends)])
            : Phrase.with("Taken on %s.", [day(offered.starts)]);
        }), "Hint").wraps().grow(),
        ui.button(USES_PHOTO_DATE, { style: LINK }),
      ], "PhotoDate")),
      ui.text(Phrase.of("Links"), "FieldName"),
      ui.text(Phrase.of("A video, a song, an article. A YouTube link plays in the memory; links in your words count too."), "Hint").wraps(),
      ui.each(editor.links, (held) => ui.row([
        ui.text(held.map((l) => (l ? (youTubeId(l.url) ? Phrase.with("Video on %s", [siteOf(l.url)]) : siteOf(l.url)) : "")), "MatchWords"),
        ui.text(held.map((l) => l?.url ?? ""), "Hint").grow(),
        ui.pressable(DROPS_LINK, held.map((l) => ({ id: l?.url ?? "" })), [ui.text(Phrase.of("Remove"), "Small")], LINK),
      ], "LinkRow"), (l) => l.url, "Matches"),
      ui.row([
        ui.field(ADDS_LINK, "", { changes: SETS_LINK, shows: editor.linkText, placeholder: Phrase.of("Paste a link"), kind: "url" }).grow(),
        ui.button(ADDS_LINK, { style: LINK }),
      ], "AddRow"),
      ui.text(ui.bound(() => (editor.linkText.read().trim() ? editor.would(ADDS_LINK) ?? "" : "")), "Hint").hidesEmpty(),
    ], "Part")),
    ui.surface("Card Audience", [ui.column([
      heading(ui, "Who can see this"),
      ui.row(AUDIENCES.map(([value, words]) => ui.pressable(SETS_AUDIENCE, { audience: value }, [ui.text(Phrase.of(words), Themes.FACE)], "Segment")
        .currentWhile(editor.audience.map((a) => a === value))), "Segments"),
      ui.text(audience.map((a) => Phrase.with("Seen by: %s", [a.summary])), "Seen").wraps(),
      ui.text(notOn, "Hint").wraps().hidesEmpty(),
      ui.text(Phrase.of("Let someone in, or keep someone out"), "FieldName"),
      ui.eachAcross(ui.bound(() => editor.sharesSaid()), (held) => ui.pressable(DROPS_SHARE, held.map((c) => ({ id: c?.id ?? "" })), [
        ui.text(held.map((c) => c?.label ?? ""), "ChipWords"), ui.text(Phrase.of("Remove"), "ChipX")], "Chip"), (c) => c.id, "Chips"),
      ui.field(LOOKS_FOR_SHARE, "", { changes: LOOKS_FOR_SHARE, shows: editor.searches.share, placeholder: Phrase.of("Type a name or a circle") }),
      ui.when(editor.searches.share.map((s) => s.trim() !== ""), ui.each(ui.bound(() => editor.shareMatches()), (held) => ui.row([
        ui.text(held.map((m) => m?.label ?? ""), "MatchWords").grow(),
        ui.pressable(LETS_IN, held.map((m) => ({ id: m?.id ?? "" })), [ui.text(Phrase.of("Let in"), "Small")], LINK),
        ui.pressable(KEEPS_OUT, held.map((m) => ({ id: m?.id ?? "" })), [ui.text(Phrase.of("Keep out"), "Small")], LINK),
      ], "ShareRow"), (m) => m.id, "Matches")),
    ], "Part")]),
    problem(ui, editor.problem),
    notice(ui, editor.notice),
    // a button that can't be used says nothing (the factory's look): what is missing is said here instead
    ui.text(ui.bound(() => editor.would(SAVES) ?? ""), "Hint").wraps().hidesEmpty(),
    ui.row([ui.button(SAVES), ui.button(CANCELS, { style: LINK, goes_to: Driver.BACK })], "Actions"),
    ui.when(editor.id, ui.when(editor.confirming,
      ui.column([
        ui.text(ui.bound(() => {
          const weave = editor.weave();
          const of = editor.kind.read() === "event" ? weave.data.memories.filter((m) => m.event_id === editor.id.read()).length : 0;
          return of ? Phrase.counted("Delete this event for good? Its %d memory stays, at its time, but no longer of an event.",
            "Delete this event for good? Its %d memories stay - everyone's - at its time, but no longer of an event.", of)
            : Phrase.of("Delete this for good?");
        }), "Warn").wraps(),
        ui.row([ui.button(DELETES, { style: DANGER }), ui.button(KEEPS_IT, { style: LINK })], "Actions"),
      ]),
      ui.row([ui.button(ASKS_TO_DELETE, { style: DANGER })], "Actions"))),
  ]);
}
