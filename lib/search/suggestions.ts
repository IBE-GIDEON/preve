// "Try asking" chips derived from the user's OWN archive — no hardcoding.
// Mines recurring words/phrases from their titles, topics, and post bodies,
// so every chip is (a) in their voice/niche and (b) guaranteed to return
// results when searched. Pure + dependency-free so it unit-tests standalone.

interface SuggestionSource {
  sourceTitle: string | null;
  body?: string | null;
  content?: string | null; // Post uses `content`; raw rows use `body`
  topics: string[];
}

// Function words + web/reddit boilerplate that make useless chips.
const STOPWORDS = new Set(
  (
    "a about above after again all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its itself just like me more most my no nor not now of off on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours " +
    "https http www com reddit comment comments post posts posted deleted removed edit edited thanks thank please really think know get got make made want going lot bit way thing things time people good great new one two just dont doesnt didnt cant wont ive im youre thats"
  )
    .trim()
    .split(/\s+/),
);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ""))
    .filter((w) => w.length >= 3 && w.length <= 24 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

/**
 * Derive up to `max` personalized search chips from the user's archive.
 * Returns [] when there isn't enough content to say anything useful —
 * callers fall back to a generic list.
 */
export function deriveSuggestions(posts: SuggestionSource[], max = 6): string[] {
  if (posts.length < 2) return [];

  // term -> { score, docs: distinct posts it appears in }
  const words = new Map<string, { score: number; docs: Set<number> }>();
  const bigrams = new Map<string, { score: number; docs: Set<number> }>();

  const bump = (map: Map<string, { score: number; docs: Set<number> }>, key: string, doc: number, weight: number) => {
    const entry = map.get(key) ?? { score: 0, docs: new Set<number>() };
    entry.score += weight;
    entry.docs.add(doc);
    map.set(key, entry);
  };

  posts.forEach((post, doc) => {
    // Titles say what content is ABOUT — weight them over body prose.
    const title = tokenize(post.sourceTitle ?? "");
    const body = tokenize((post.body ?? post.content ?? "").slice(0, 400));

    for (const [tokens, weight] of [
      [title, 3],
      [body, 1],
    ] as const) {
      for (let i = 0; i < tokens.length; i++) {
        bump(words, tokens[i], doc, weight);
        if (i + 1 < tokens.length) bump(bigrams, `${tokens[i]} ${tokens[i + 1]}`, doc, weight * 2);
      }
    }

    // Topics (e.g. subreddits) are strong niche signals, but only chip-worthy
    // if the term also shows up in searchable text — count them as words.
    for (const topic of post.topics ?? []) {
      const clean = topic.toLowerCase().trim();
      if (clean.length >= 3 && !STOPWORDS.has(clean)) bump(words, clean, doc, 1);
    }
  });

  const candidates = [
    ...[...bigrams.entries()].map(([term, e]) => ({ term, score: e.score * 1.6, docs: e.docs.size })),
    ...[...words.entries()].map(([term, e]) => ({ term, score: e.score, docs: e.docs.size })),
  ]
    .filter((c) => c.term.length <= 28)
    .sort((a, b) => b.score - a.score);

  const picked: string[] = [];
  const take = (minDocs: number, minScore: number) => {
    for (const c of candidates) {
      if (picked.length >= max) break;
      if (c.docs < minDocs || c.score < minScore) continue;
      // Skip a word already covered by a chosen phrase ("react" vs "react performance").
      if (picked.some((p) => p.includes(c.term) || c.term.includes(p))) continue;
      picked.push(c.term);
    }
  };

  // Best chips recur across posts; small archives top up with terms that at
  // least recur strongly within one post (score ≥ 4 ≈ twice in a title, or
  // title + body).
  take(2, 0);
  take(1, 4);
  return picked;
}
