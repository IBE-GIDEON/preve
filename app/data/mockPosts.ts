export type Platform = "Reddit" | "LinkedIn" | "X";
export type PostKind = "Post" | "Comment" | "Thread" | "Article";

export interface Post {
  id: string;
  platform: Platform;
  kind: PostKind;
  content: string;
  summary: string;
  sourceTitle: string;
  date: string;
  url: string;
  engagement: {
    likes?: number;
    comments?: number;
    reposts?: number;
    upvotes?: number;
  };
  topics: string[];
}

export const MOCK_POSTS: Post[] = [
  {
    id: "p1",
    platform: "Reddit",
    kind: "Comment",
    content:
      "React useMemo is often misunderstood. You don't need to wrap every single calculation in it. Only use it for expensive operations or when passing references to optimized child components. Otherwise, you're just adding overhead.",
    summary: "A practical note about when React memoization is actually worth using.",
    sourceTitle: "r/reactjs discussion on performance",
    date: "2 months ago",
    url: "https://www.reddit.com/r/reactjs/",
    engagement: { upvotes: 452, comments: 89 },
    topics: ["React", "Performance", "Hooks"],
  },
  {
    id: "p2",
    platform: "LinkedIn",
    kind: "Post",
    content:
      "Here is exactly how I scaled our startup's React frontend from 0 to 100k users. We focused heavily on performance tuning, specifically reducing re-renders using useMemo and useCallback correctly. Don't prematurely optimize.",
    summary: "A founder-friendly breakdown of frontend scaling lessons.",
    sourceTitle: "LinkedIn founder post",
    date: "5 months ago",
    url: "https://www.linkedin.com/",
    engagement: { likes: 1204, comments: 156, reposts: 34 },
    topics: ["React", "Startup", "Performance"],
  },
  {
    id: "p3",
    platform: "X",
    kind: "Thread",
    content:
      "Stop using useEffect for data fetching. Use React Query or SWR instead. It handles caching, retries, and deduplication out of the box.",
    summary: "A short thread about replacing manual effects with data-fetching tools.",
    sourceTitle: "X thread on React data fetching",
    date: "1 week ago",
    url: "https://x.com/",
    engagement: { likes: 340, reposts: 45 },
    topics: ["React", "Hooks", "Data Fetching"],
  },
  {
    id: "p4",
    platform: "Reddit",
    kind: "Comment",
    content:
      "Anyone else finding Docker caching to be incredibly frustrating when dealing with node_modules? No matter how I structure my Dockerfile, npm install seems to take forever on CI.",
    summary: "A CI build complaint that points toward Docker layer caching and dependency installs.",
    sourceTitle: "r/docker CI thread",
    date: "1 year ago",
    url: "https://www.reddit.com/r/docker/",
    engagement: { upvotes: 120, comments: 45 },
    topics: ["Docker", "Node.js", "CI/CD"],
  },
  {
    id: "p5",
    platform: "LinkedIn",
    kind: "Post",
    content:
      "Stripe's API documentation is the gold standard for developer experience. We recently integrated Stripe Connect for our marketplace, and the speed at which we went from docs to working code was phenomenal. Startups should take notes.",
    summary: "A praise post about Stripe docs, developer experience, and marketplace payments.",
    sourceTitle: "LinkedIn post on developer experience",
    date: "6 months ago",
    url: "https://www.linkedin.com/",
    engagement: { likes: 890, comments: 45 },
    topics: ["Stripe", "Developer Experience", "Startup"],
  },
  {
    id: "p6",
    platform: "X",
    kind: "Thread",
    content:
      "AI is moving too fast. If you're building a wrapper startup around the latest model, you have 3 months before it becomes a native feature. Build moats, not wrappers.",
    summary: "A startup strategy warning about thin AI wrappers.",
    sourceTitle: "X thread on AI startups",
    date: "3 days ago",
    url: "https://x.com/",
    engagement: { likes: 5600, reposts: 1200 },
    topics: ["AI", "Startup", "Strategy"],
  },
  {
    id: "p7",
    platform: "Reddit",
    kind: "Comment",
    content:
      "I finally understand how to implement Stripe webhooks correctly in Next.js App Router. The trick is making sure you use raw body parsing and verifying the signature before doing anything else.",
    summary: "A specific implementation lesson about Stripe webhook verification in Next.js.",
    sourceTitle: "r/nextjs webhook answer",
    date: "3 weeks ago",
    url: "https://www.reddit.com/r/nextjs/",
    engagement: { upvotes: 340, comments: 21 },
    topics: ["Stripe", "Next.js", "Webhooks"],
  },
  {
    id: "p8",
    platform: "Reddit",
    kind: "Post",
    content:
      "My strongest startup ideas usually come from old support questions. If five people complain about the same workflow and the existing tools feel too heavy, that is a real signal.",
    summary: "A startup idea heuristic based on repeated workflow pain.",
    sourceTitle: "r/startups idea thread",
    date: "8 months ago",
    url: "https://www.reddit.com/r/startups/",
    engagement: { upvotes: 812, comments: 133 },
    topics: ["Startup", "Product", "Research"],
  },
  {
    id: "p9",
    platform: "LinkedIn",
    kind: "Article",
    content:
      "The best content systems do not start with scheduling. They start with memory. Once you can retrieve every useful thing you have already said, repurposing becomes dramatically easier.",
    summary: "A positioning argument for content memory before social scheduling.",
    sourceTitle: "LinkedIn article on content systems",
    date: "4 months ago",
    url: "https://www.linkedin.com/",
    engagement: { likes: 642, comments: 74, reposts: 28 },
    topics: ["Content", "AI", "Product"],
  },
  {
    id: "p10",
    platform: "Reddit",
    kind: "Comment",
    content:
      "Learning JavaScript finally clicked for me when I stopped memorizing syntax and started building tiny interfaces every day. React made more sense once the browser basics were solid.",
    summary: "A learning note that connects JavaScript practice with understanding React.",
    sourceTitle: "r/learnjavascript reply",
    date: "11 months ago",
    url: "https://www.reddit.com/r/learnjavascript/",
    engagement: { upvotes: 275, comments: 38 },
    topics: ["JavaScript", "React", "Learning"],
  },
];

export function getPlatformColor(platform: Platform) {
  switch (platform) {
    case "Reddit":
      return "#FF4500";
    case "LinkedIn":
      return "#0A66C2";
    case "X":
      return "#000000";
    default:
      return "var(--foreground)";
  }
}

export function getEngagementScore(post: Post) {
  return (
    (post.engagement.upvotes || 0) +
    (post.engagement.likes || 0) +
    (post.engagement.comments || 0) * 2 +
    (post.engagement.reposts || 0) * 3
  );
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

export function searchPosts(query: string, posts: Post[] = MOCK_POSTS) {
  const cleanQuery = normalize(query).trim();
  if (!cleanQuery) return [];

  const tokens = cleanQuery.split(/\s+/).filter((token) => token.length > 1);

  return posts
    .map((post) => {
      const topicText = post.topics.join(" ");
      const haystack = normalize(
        `${post.platform} ${post.kind} ${post.content} ${post.summary} ${post.sourceTitle} ${topicText}`,
      );
      let score = haystack.includes(cleanQuery) ? 12 : 0;

      tokens.forEach((token) => {
        if (normalize(topicText).includes(token)) score += 5;
        if (normalize(post.sourceTitle).includes(token)) score += 3;
        if (normalize(post.summary).includes(token)) score += 3;
        if (normalize(post.content).includes(token)) score += 2;
        if (normalize(post.platform).includes(token)) score += 1;
      });

      return { post, score };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || getEngagementScore(b.post) - getEngagementScore(a.post))
    .map((result) => result.post);
}

export function getSimilarPosts(post: Post, limit = 3) {
  return MOCK_POSTS.filter((candidate) => candidate.id !== post.id)
    .map((candidate) => {
      const sharedTopics = candidate.topics.filter((topic) => post.topics.includes(topic)).length;
      return { candidate, sharedTopics };
    })
    .filter((item) => item.sharedTopics > 0)
    .sort((a, b) => b.sharedTopics - a.sharedTopics || getEngagementScore(b.candidate) - getEngagementScore(a.candidate))
    .slice(0, limit)
    .map((item) => item.candidate);
}
