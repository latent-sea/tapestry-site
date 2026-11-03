// The prompt on the home screen: one at a time, a different one each visit,
// another at a press. Three sorts, taken in turn:
//   a question to write about ("What's your first memory?"), opening a new
//     memory with the question above it - asked until it is answered;
//   a pointer somewhere else in Tapestry, from what the member has
//     ("Who else was at Sam's 40th?", "See where your life crosses Mum's");
//   a look back at the member's own life: a memory at random, a year at
//     random, or what happened on this day.
// Which questions were answered is kept on the device (an answered question
// is not asked there again).

import { Controller } from "./gd_chime/gd_chime.js?v=e954cd847867";

export const ASKS_ANOTHER = "asks_me_something_else";
export const WORDS = { [ASKS_ANOTHER]: ["Ask me something else"] };

const ANSWERED_KEPT = "tapestry_answered";

/** What is asked: each a memory waiting to be written. */
export const QUESTIONS = [
  "What's your first memory?",
  "Can you remember your first kiss?",
  "When was the last time you really laughed?",
  "What did your childhood bedroom look like?",
  "Who was your best friend at primary school?",
  "What was your first day at school like?",
  "What's the best meal you've ever had?",
  "Where did you go on your first holiday you remember?",
  "What was your first job?",
  "What's the bravest thing you've ever done?",
  "When did you last cry, and why?",
  "What was the first record you bought?",
  "Who taught you to ride a bike?",
  "What was the best present you were ever given?",
  "What's a smell that takes you straight back somewhere?",
  "Where were you when you heard some big news?",
  "What did you want to be when you grew up?",
  "Who was your favourite teacher, and why?",
  "What was your first car?",
  "What's the furthest you've ever been from home?",
  "When did you first feel like a grown-up?",
  "What's a song that reminds you of someone?",
  "What did a typical Sunday look like when you were small?",
  "What's the worst haircut you ever had?",
  "What was the first film you saw at the cinema?",
  "Who did you look up to as a teenager?",
  "When did you last surprise yourself?",
  "What's the kindest thing a stranger has done for you?",
  "Where did you live when you first left home?",
  "What was your first pet?",
  "What's a day you'd love to live again?",
  "What was your favourite toy?",
  "What's the best party you've ever been to?",
  "When were you most scared?",
  "What did your grandparents' house smell like?",
  "What was the first concert or gig you went to?",
  "Who was the first person you fell for?",
  "What's a rule you broke as a child?",
  "When did you last stay up all night?",
  "What's your favourite photo of yourself, and when was it taken?",
  "What was your wedding day like - or a wedding you'll never forget?",
  "What's the best advice anyone gave you?",
  "Where did you learn to swim?",
  "What did you get up to in the school holidays?",
  "What was your favourite place to hide?",
  "What's a meal your family always made?",
  "When did you first see the sea?",
  "Who made you laugh most when you were growing up?",
  "What was the hardest goodbye you've had?",
  "What's the best view you've ever seen?",
  "What did you do on your 18th birthday?",
  "What was your first phone?",
  "When did you last dance like nobody was watching?",
  "What's a time you got completely lost?",
  "What's the proudest you've ever been?",
  "Who was your first boss?",
  "What was the first place you called your own?",
  "When did you last see a sunrise?",
  "What's a game you played over and over as a child?",
  "What was the best book you read as a child?",
  "What was the worst holiday you've ever had?",
  "When did you last make something with your hands?",
  "What's a moment you knew your life had changed?",
  "Who did you spend your Saturdays with as a teenager?",
  "What was the first thing you bought with your own money?",
  "What's a tradition your family had at Christmas or another holiday?",
  "When did you last write someone a letter?",
  "What was your nickname, and who gave it to you?",
  "What's the most beautiful place you've ever been?",
  "Who did you call when you had good news?",
  "What's a time someone stood up for you?",
  "What was the weather like on a day you'll never forget?",
  "What's the best thing about where you grew up?",
  "When did you last try something for the first time?",
  "What was your favourite sweet or snack as a child?",
  "What did your parents do for work?",
  "What's a time you laughed so hard you couldn't stop?",
  "Where were you on the millennium night?",
  "What's the longest journey you've ever made?",
  "When did you first live with someone else?",
  "What's a habit you picked up from your parents?",
  "Who was your first neighbour you remember?",
  "What did you do on your last birthday?",
  "What's the best thing that happened to you this year?",
  "What was your school uniform like?",
  "When did you last get caught in the rain?",
  "What's a time you were completely happy?",
  "What did you do the day you passed your driving test - or the day you got somewhere on your own?",
  "Who was at your table at a family gathering?",
  "What was your first exam you remember?",
  "When did you last sing out loud?",
  "What's a decision you're glad you made?",
  "What was your favourite TV programme growing up?",
  "What's a place you went back to after many years?",
  "When did you first hold a baby?",
  "What did you have for tea when you were small?",
  "What's a friendship that changed you?",
  "When did you last feel really proud of someone?",
  "What's the most adventurous thing you've eaten?",
  "Who did you lose touch with, and what do you remember about them?",
];

/** Which questions were answered on this device: their numbers. */
function answered() {
  try { return new Set(JSON.parse(localStorage.getItem(ANSWERED_KEPT) ?? "[]")); } catch { return new Set(); }
}

/** A question answered: not asked on this device again. */
export function markAnswered(n) {
  const done = answered();
  done.add(Number(n));
  try { localStorage.setItem(ANSWERED_KEPT, JSON.stringify([...done])); } catch { /* asked again next visit */ }
}

/** The question by its number, or "" for none. */
export const questionOf = (n) => QUESTIONS[Number(n)] ?? "";

const SORTS = ["ask", "point", "back"];

export class Prompts extends Controller {
  constructor(chimes, account, random = Math.random) {
    super(chimes);
    this.account = account;
    this.random = random;
    // where in the round this visit starts, and which of each sort: different every time the app opens
    this.turn = this.value(Math.floor(random() * 3000));
    this.seed = Math.floor(random() * 100000);
    this.done = this.value(answered());
  }

  answers() { return [ASKS_ANOTHER]; }

  told(action) {
    if (action === ASKS_ANOTHER) this.turn.update((n) => n + 1);
    return null;
  }

  /** A question was answered: taken out of what is asked. */
  answered(n) { markAnswered(n); this.done.setValue(answered()); }

  /**
   * The prompt now: { sort, label, words, button, via, parameter }, via naming what the button does -
   * "write" (a new memory answering question parameter), "open" (an item, by key), "year" (the life in one year),
   * "edit" (an item's editor, by key), "addTo" (a new memory in a period, by id), "tapestry", "people",
   * "find" or "settings". Never null: there is always a question.
   */
  current() {
    const turn = this.turn.read();
    const choices = { ask: this.questions(), point: this.pointers(), back: this.lookingBack() };
    for (let step = 0; step < SORTS.length; step++) {
      const sort = SORTS[(turn + step) % SORTS.length];
      const list = choices[sort];
      if (list.length) return { sort, ...list[(Math.floor(turn / SORTS.length) * 7 + this.seed) % list.length] };
    }
    return { sort: "ask", label: "A question for you", words: QUESTIONS[0], button: "Write about it", via: "write", parameter: "0" };
  }

  questions() {
    if (!this.account.weave.read().writes) return [];
    const done = this.done.read();
    return QUESTIONS.map((words, n) => ({ n, words })).filter((q) => !done.has(q.n))
      .map((q) => ({ label: "A question for you", words: q.words, button: "Write about it", via: "write", parameter: String(q.n) }));
  }

  pointers() {
    const w = this.account.weave.read();
    const mine = w.thread(w.meId);
    const out = [];
    // lives that cross: each of the member's people who is on Tapestry
    for (const person of w.data.people.filter((p) => p.account).slice(0, 6)) {
      out.push({ label: `Your life and ${person.name}'s`, words: `See where your life crosses ${person.name}'s`, button: "Show me", via: "tapestry" });
    }
    if (w.writes) {
      // an event of the member's no one else is in yet
      for (const event of mine.filter((e) => e.kind === "event" && e.mine && !(e.people ?? []).length).slice(0, 4)) {
        out.push({ label: event.title, words: `Who else was at ${event.title}?`, button: "Add who was there", via: "edit", parameter: event.key });
      }
      // a period of the member's with little in it
      for (const period of mine.filter((e) => e.kind === "period" && e.mine).slice(0, 4)) {
        out.push({ label: period.title, words: `What else happened during ${period.title}?`, button: "Add a memory to it", via: "addTo", parameter: period.id });
      }
    }
    if (!w.data.people.length) out.push({ label: "Your people", words: "Who's in your life story? Add the people who matter to you.", button: "Go to People", via: "people" });
    else out.push({ label: "Your people", words: "Invite someone to Tapestry, so your lives can meet here", button: "Go to People", via: "people" });
    out.push({ label: "Shared with everyone", words: "See what others have shared with everyone on Tapestry", button: "Have a look", via: "find" });
    if (!w.born) out.push({ label: "Your birthday", words: "When's your birthday? Then Tapestry can say how old you were at each memory.", button: "Add your birthday", via: "settings" });
    return out;
  }

  lookingBack() {
    const w = this.account.weave.read();
    const mine = w.thread(w.meId);
    const out = [];
    for (const entry of w.onThisDay().slice(0, 3)) {
      out.push({ label: "On this day", words: `${entry.title}${entry.said ? `, ${entry.said}` : ""}`, button: "Open it", via: "open", parameter: entry.key });
    }
    const memories = mine.filter((e) => e.kind === "memory" && e.title);
    for (let i = 0; i < Math.min(3, memories.length); i++) {
      const entry = memories[(this.seed + i * 13) % memories.length];
      out.push({ label: "Remember this?", words: `${entry.title}${entry.said ? `, ${entry.said}` : ""}`, button: "Open it", via: "open", parameter: entry.key });
    }
    const years = [...new Set(mine.filter((e) => e.when?.date).map((e) => e.when.date.slice(0, 4)))];
    for (let i = 0; i < Math.min(2, years.length); i++) {
      const year = years[(this.seed + i * 5) % years.length];
      out.push({ label: "A year of your life", words: `${year}. What was happening in your life?`, button: `See ${year}`, via: "year", parameter: year });
    }
    return out;
  }
}
