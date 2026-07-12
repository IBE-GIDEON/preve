export type FeedSource = "Reddit" | "X" | "LinkedIn";
export type FeedBadge = FeedSource | "GitHub" | "YouTube";
export type FeedKind =
  | "text"
  | "thread"
  | "image"
  | "gallery"
  | "gif"
  | "video"
  | "code"
  | "quote"
  | "article"
  | "link"
  | "poll"
  | "diagram";

export interface FeedCreator {
  id: string;
  name: string;
  username: string;
  role: string;
  avatar: string;
  bio: string;
  expertise: string[];
}

export interface FeedComment {
  author: string;
  text: string;
}

export interface FeedActions {
  discussions: number;
  saves: number;
  collections: number;
  remixes: number;
  shares: number;
}

export type FeedMedia =
  | {
      type: "image";
      url: string;
      alt: string;
      caption?: string;
    }
  | {
      type: "gallery";
      images: Array<{ url: string; alt: string }>;
      caption?: string;
    }
  | {
      type: "gif";
      title: string;
      description: string;
      tone: "sunrise" | "matrix" | "violet" | "steel";
    }
  | {
      type: "video";
      title: string;
      thumbnail: string;
      duration: string;
      progress: number;
    }
  | {
      type: "code";
      language: string;
      filename: string;
      code: string;
    }
  | {
      type: "quote";
      quote: string;
      attribution: string;
    }
  | {
      type: "article";
      title: string;
      domain: string;
      excerpt: string;
      image: string;
    }
  | {
      type: "link";
      title: string;
      domain: string;
      excerpt: string;
    }
  | {
      type: "poll";
      question: string;
      options: Array<{ label: string; percent: number }>;
    }
  | {
      type: "diagram";
      title: string;
      nodes: string[];
    };

export interface FeedPost {
  id: string;
  source: FeedSource;
  badge: FeedBadge;
  creatorId: string;
  timestamp: string;
  kind: FeedKind;
  headline: string;
  paragraphs: string[];
  bullets?: string[];
  links?: Array<{ label: string; domain: string }>;
  media?: FeedMedia;
  actions: FeedActions;
  comments: FeedComment[];
  tags: string[];
}

export type SpecialCard =
  | {
      id: string;
      type: "ai";
      title: string;
      body: string;
      action: string;
    }
  | {
      id: string;
      type: "gem";
      title: string;
      body: string;
      action: string;
    }
  | {
      id: string;
      type: "trend";
      title: string;
      topics: string[];
    }
  | {
      id: string;
      type: "creator";
      creatorId: string;
    };

export type FeedItem = { itemType: "post"; post: FeedPost } | { itemType: "special"; card: SpecialCard };

export const FEED_SOURCES: FeedSource[] = ["Reddit", "X", "LinkedIn"];

export const CREATORS: FeedCreator[] = [
  {
    id: "mara-wells",
    name: "Mara Wells",
    username: "marawells",
    role: "AI product founder",
    avatar: "MW",
    bio: "Builds calm AI tools for creative operators.",
    expertise: ["AI agents", "SaaS", "Launch strategy"],
  },
  {
    id: "noah-kim",
    name: "Noah Kim",
    username: "noahbuilds",
    role: "Frontend systems engineer",
    avatar: "NK",
    bio: "Performance obsessive working on interface architecture.",
    expertise: ["React", "Design systems", "Perf"],
  },
  {
    id: "ade-adeyemi",
    name: "Ade Adeyemi",
    username: "adecodes",
    role: "Security architect",
    avatar: "AA",
    bio: "Turns scary security checklists into usable product rituals.",
    expertise: ["Security", "Compliance", "Infra"],
  },
  {
    id: "priya-shah",
    name: "Priya Shah",
    username: "priyashah",
    role: "Growth strategist",
    avatar: "PS",
    bio: "Studies tiny marketing loops that compound.",
    expertise: ["Positioning", "Lifecycle", "Creator growth"],
  },
  {
    id: "elena-torres",
    name: "Elena Torres",
    username: "elenaui",
    role: "Product designer",
    avatar: "ET",
    bio: "Designs dense interfaces that still feel breathable.",
    expertise: ["UX systems", "Visual craft", "Research"],
  },
  {
    id: "marcus-reed",
    name: "Marcus Reed",
    username: "marcusops",
    role: "DevOps lead",
    avatar: "MR",
    bio: "Makes boring deployment diagrams save real money.",
    expertise: ["Kubernetes", "CI", "Observability"],
  },
  {
    id: "sofia-chen",
    name: "Sofia Chen",
    username: "sofiawrites",
    role: "Technical storyteller",
    avatar: "SC",
    bio: "Turns product lessons into essays people actually finish.",
    expertise: ["Writing", "Narrative", "Developer education"],
  },
  {
    id: "dante-cruz",
    name: "Dante Cruz",
    username: "danteux",
    role: "Design engineer",
    avatar: "DC",
    bio: "Prototype first, polish always.",
    expertise: ["Motion", "Frontend", "Prototyping"],
  },
  {
    id: "nina-volk",
    name: "Nina Volk",
    username: "ninavolk",
    role: "Open source maintainer",
    avatar: "NV",
    bio: "Maintains tools for small teams with big production needs.",
    expertise: ["Open source", "DX", "APIs"],
  },
  {
    id: "jamal-okafor",
    name: "Jamal Okafor",
    username: "jamaldata",
    role: "Data product lead",
    avatar: "JO",
    bio: "Helps teams stop mistaking dashboards for decisions.",
    expertise: ["Analytics", "Data UX", "Metrics"],
  },
  {
    id: "ava-roth",
    name: "Ava Roth",
    username: "avaroth",
    role: "YC-backed founder",
    avatar: "AR",
    bio: "Building collaboration software for boutique agencies.",
    expertise: ["Fundraising", "Product-market fit", "Sales"],
  },
  {
    id: "leo-park",
    name: "Leo Park",
    username: "leopark",
    role: "MCP server builder",
    avatar: "LP",
    bio: "Connects old workflows to new agent surfaces.",
    expertise: ["MCP", "Automation", "Integrations"],
  },
  {
    id: "iris-mason",
    name: "Iris Mason",
    username: "irismason",
    role: "Brand systems director",
    avatar: "IM",
    bio: "Makes early-stage products feel inevitable.",
    expertise: ["Brand", "Messaging", "Creative direction"],
  },
  {
    id: "theo-liu",
    name: "Theo Liu",
    username: "theoliu",
    role: "Full-stack engineer",
    avatar: "TL",
    bio: "Ships boring code paths with suspiciously good taste.",
    expertise: ["Next.js", "Databases", "Payments"],
  },
  {
    id: "maya-bennett",
    name: "Maya Bennett",
    username: "mayab",
    role: "Community operator",
    avatar: "MB",
    bio: "Builds communities where smart people keep showing up.",
    expertise: ["Community", "Events", "Member research"],
  },
  {
    id: "samir-haddad",
    name: "Samir Haddad",
    username: "samirsec",
    role: "Red team consultant",
    avatar: "SH",
    bio: "Breaks launch plans before attackers do.",
    expertise: ["Threat modeling", "Cloud security", "Incident prep"],
  },
  {
    id: "claire-dubois",
    name: "Claire Dubois",
    username: "claired",
    role: "Product marketer",
    avatar: "CD",
    bio: "Turns technical depth into crisp market language.",
    expertise: ["Messaging", "Launches", "Competitive strategy"],
  },
  {
    id: "omar-saleh",
    name: "Omar Saleh",
    username: "omarsaleh",
    role: "Infrastructure founder",
    avatar: "OS",
    bio: "Builds tools for teams that hate dashboard sprawl.",
    expertise: ["Infra", "B2B", "Reliability"],
  },
  {
    id: "lena-stone",
    name: "Lena Stone",
    username: "lenastone",
    role: "Creative technologist",
    avatar: "LS",
    bio: "Blends visuals, code, and business systems.",
    expertise: ["Generative media", "UX", "Content systems"],
  },
  {
    id: "victor-hale",
    name: "Victor Hale",
    username: "victorhale",
    role: "Engineering manager",
    avatar: "VH",
    bio: "Keeps teams fast without letting quality become folklore.",
    expertise: ["Engineering leadership", "Code review", "Planning"],
  },
];

export const FEED_POSTS: FeedPost[] = [
  {
    id: "post-001",
    source: "Reddit",
    badge: "GitHub",
    creatorId: "nina-volk",
    timestamp: "12 min ago",
    kind: "code",
    headline: "I rewrote our issue triage bot to stop guessing labels.",
    paragraphs: [
      "The old version used one giant prompt and felt clever until it quietly mislabeled billing bugs as design requests.",
      "The new version makes three smaller decisions: intent, affected surface, and urgency. Accuracy improved because the model has less to prove.",
    ],
    bullets: ["Separate classification from routing", "Save low-confidence tickets for humans", "Log the exact rule that moved the issue"],
    media: {
      type: "code",
      language: "ts",
      filename: "triage-route.ts",
      code: "const result = await classifyIssue({\n  title,\n  body,\n  labels: knownLabels,\n});\n\nif (result.confidence < 0.72) {\n  return queueForHumanReview(issue.id);\n}\n\nreturn applyTriagePlan(issue.id, result.plan);",
    },
    actions: { discussions: 164, saves: 2800, collections: 692, remixes: 244, shares: 89 },
    comments: [
      { author: "Theo Liu", text: "The confidence gate is the part most teams skip." },
      { author: "Ava Roth", text: "This is exactly the kind of internal tooling that makes support feel premium." },
    ],
    tags: ["AI agents", "Open source", "DX"],
  },
  {
    id: "post-002",
    source: "X",
    badge: "X",
    creatorId: "noah-kim",
    timestamp: "18 min ago",
    kind: "text",
    headline: "React performance got easier when I stopped treating every render as a crime.",
    paragraphs: [
      "A render is not automatically waste. A render is the price of keeping the UI honest.",
      "The real work is finding expensive trees, unstable references, and effects that smuggle state into places it does not belong.",
    ],
    bullets: ["Profile before memoizing", "Memoize boundaries, not everything", "Prefer boring state shapes"],
    actions: { discussions: 219, saves: 4200, collections: 1100, remixes: 380, shares: 144 },
    comments: [
      { author: "Dante Cruz", text: "This is the cleanest phrasing of the problem." },
      { author: "Victor Hale", text: "Going in our frontend review checklist." },
    ],
    tags: ["React", "Performance", "Frontend"],
  },
  {
    id: "post-003",
    source: "LinkedIn",
    badge: "LinkedIn",
    creatorId: "ava-roth",
    timestamp: "24 min ago",
    kind: "article",
    headline: "The first enterprise buyer did not care about our AI. They cared about rollback.",
    paragraphs: [
      "We pitched intelligence. They asked about control.",
      "That conversation changed the roadmap: approvals, logs, export, permissions, and a human override shipped before the second AI feature.",
    ],
    media: {
      type: "article",
      title: "What our first enterprise pilot actually bought",
      domain: "foundernotes.studio",
      excerpt: "A practical breakdown of the trust features that turned a clever demo into a paid pilot.",
      image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",
    },
    actions: { discussions: 92, saves: 1900, collections: 488, remixes: 126, shares: 77 },
    comments: [
      { author: "Claire Dubois", text: "Control is the real enterprise feature." },
      { author: "Samir Haddad", text: "Audit trail before autonomy. Every time." },
    ],
    tags: ["Enterprise", "AI", "Sales"],
  },
  {
    id: "post-004",
    source: "Reddit",
    badge: "Reddit",
    creatorId: "ade-adeyemi",
    timestamp: "31 min ago",
    kind: "diagram",
    headline: "A launch security checklist that founders will actually finish.",
    paragraphs: [
      "Security checklists fail when they read like a tax form. This version is organized by what can ruin your launch tonight.",
    ],
    media: {
      type: "diagram",
      title: "Launch risk layers",
      nodes: ["Auth boundary", "RLS policies", "Secrets", "Rate limits", "Backups", "Incident owner"],
    },
    actions: { discussions: 311, saves: 5400, collections: 1600, remixes: 504, shares: 211 },
    comments: [
      { author: "Mara Wells", text: "This should be in every pre-launch founder doc." },
      { author: "Omar Saleh", text: "Backups before launch is such a boring advantage." },
    ],
    tags: ["Security", "Launch", "Checklist"],
  },
  {
    id: "post-005",
    source: "LinkedIn",
    badge: "YouTube",
    creatorId: "lena-stone",
    timestamp: "43 min ago",
    kind: "video",
    headline: "A 4-minute walkthrough of a creator memory system.",
    paragraphs: [
      "I recorded how I turn scattered notes, posts, and saved comments into a weekly idea map.",
    ],
    media: {
      type: "video",
      title: "From archive to weekly content system",
      thumbnail: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
      duration: "4:18",
      progress: 42,
    },
    actions: { discussions: 78, saves: 1600, collections: 403, remixes: 198, shares: 62 },
    comments: [
      { author: "Sofia Chen", text: "The idea map section is worth rewinding." },
      { author: "Iris Mason", text: "Feels like a content calendar finally grew a memory." },
    ],
    tags: ["Content systems", "Video", "Workflow"],
  },
  {
    id: "post-006",
    source: "X",
    badge: "X",
    creatorId: "leo-park",
    timestamp: "56 min ago",
    kind: "thread",
    headline: "Most MCP servers should start boring.",
    paragraphs: [
      "The temptation is to expose every action the product can do.",
      "The better first version exposes five workflows people already repeat, with names that match how the team talks.",
    ],
    bullets: ["Search", "Summarize", "Create draft", "Update status", "Escalate with context"],
    actions: { discussions: 141, saves: 3600, collections: 902, remixes: 338, shares: 118 },
    comments: [
      { author: "Nina Volk", text: "Tool naming is underrated product design." },
      { author: "Marcus Reed", text: "I would add dry-run mode to every write action." },
    ],
    tags: ["MCP", "Automation", "Agents"],
  },
  {
    id: "post-007",
    source: "Reddit",
    badge: "Reddit",
    creatorId: "elena-torres",
    timestamp: "1 hr ago",
    kind: "gallery",
    headline: "Three dashboard states every team forgets to design.",
    paragraphs: ["Dashboards are not screens. They are routines. Empty, stale, and recovering states matter more than perfect steady-state mocks."],
    media: {
      type: "gallery",
      images: [
        { url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80", alt: "Analytics dashboard on a workstation" },
        { url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80", alt: "Charts on a laptop" },
        { url: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=900&q=80", alt: "Team reviewing interface work" },
      ],
      caption: "Empty, stale, recovering.",
    },
    actions: { discussions: 87, saves: 2300, collections: 771, remixes: 191, shares: 71 },
    comments: [
      { author: "Jamal Okafor", text: "Stale state is where trust either survives or dies." },
      { author: "Dante Cruz", text: "The recovery screen is beautiful." },
    ],
    tags: ["Product design", "Dashboards", "UX"],
  },
  {
    id: "post-008",
    source: "LinkedIn",
    badge: "LinkedIn",
    creatorId: "claire-dubois",
    timestamp: "1 hr ago",
    kind: "quote",
    headline: "A positioning line I keep returning to.",
    paragraphs: ["The strongest technical products do not explain complexity. They make the customer feel newly capable around it."],
    media: {
      type: "quote",
      quote: "Do not sell the model. Sell the moment where the user stops feeling behind.",
      attribution: "Launch note from a seed-stage AI infra team",
    },
    actions: { discussions: 66, saves: 2100, collections: 489, remixes: 152, shares: 94 },
    comments: [
      { author: "Iris Mason", text: "This is exactly the emotional layer most B2B pages miss." },
      { author: "Priya Shah", text: "Saving for the next messaging teardown." },
    ],
    tags: ["Positioning", "Messaging", "B2B"],
  },
  {
    id: "post-009",
    source: "X",
    badge: "GitHub",
    creatorId: "theo-liu",
    timestamp: "2 hr ago",
    kind: "code",
    headline: "Stripe webhooks stopped being scary when we made replay a first-class path.",
    paragraphs: ["The core trick: the webhook handler should be boring, idempotent, and easy to replay from an internal event log."],
    media: {
      type: "code",
      language: "ts",
      filename: "webhook-events.ts",
      code: "await db.transaction(async (tx) => {\n  const event = await saveRawWebhook(tx, payload);\n  if (await wasProcessed(tx, event.stripeId)) return;\n  await applyBillingChange(tx, event);\n  await markProcessed(tx, event.stripeId);\n});",
    },
    actions: { discussions: 203, saves: 4900, collections: 1300, remixes: 441, shares: 176 },
    comments: [
      { author: "Omar Saleh", text: "Replay path is the difference between demo code and business code." },
      { author: "Victor Hale", text: "This should be required before launch." },
    ],
    tags: ["Stripe", "Next.js", "Reliability"],
  },
  {
    id: "post-010",
    source: "Reddit",
    badge: "YouTube",
    creatorId: "dante-cruz",
    timestamp: "2 hr ago",
    kind: "gif",
    headline: "A tiny hover animation that makes tables feel less dead.",
    paragraphs: ["The trick is not the lift. It is the row-level focus ring that tells your eye where it landed."],
    media: {
      type: "gif",
      title: "Table hover before and after",
      description: "Rows softly brighten, metrics stay still, and the active affordance appears only when useful.",
      tone: "steel",
    },
    actions: { discussions: 54, saves: 1400, collections: 362, remixes: 129, shares: 38 },
    comments: [
      { author: "Elena Torres", text: "Motion with a job. My favorite kind." },
      { author: "Noah Kim", text: "No layout shift, no drama." },
    ],
    tags: ["Motion", "UX", "Tables"],
  },
  {
    id: "post-011",
    source: "LinkedIn",
    badge: "LinkedIn",
    creatorId: "priya-shah",
    timestamp: "3 hr ago",
    kind: "poll",
    headline: "What actually made your last product launch work?",
    paragraphs: ["The answers are more useful than most launch threads. Distribution is not one thing; it is a stack of small prepared surfaces."],
    media: {
      type: "poll",
      question: "Most underrated launch asset?",
      options: [
        { label: "Customer proof library", percent: 38 },
        { label: "Founder demo video", percent: 24 },
        { label: "Objection-handling page", percent: 21 },
        { label: "Partner email kit", percent: 17 },
      ],
    },
    actions: { discussions: 119, saves: 1800, collections: 580, remixes: 201, shares: 83 },
    comments: [
      { author: "Claire Dubois", text: "Objection pages close deals quietly." },
      { author: "Ava Roth", text: "Customer proof library changed our sales calls." },
    ],
    tags: ["Marketing", "Launch", "Growth"],
  },
  {
    id: "post-012",
    source: "X",
    badge: "X",
    creatorId: "maya-bennett",
    timestamp: "3 hr ago",
    kind: "text",
    headline: "A community gets healthier when the best members can find each other without staff intervention.",
    paragraphs: [
      "The unlock is not another announcement channel.",
      "It is a ritual where members expose what they are building, what they know, and what they are stuck on.",
    ],
    bullets: ["Weekly build notes", "Small expert directories", "Opt-in critique rooms"],
    actions: { discussions: 73, saves: 1500, collections: 420, remixes: 116, shares: 49 },
    comments: [
      { author: "Sofia Chen", text: "Rituals beat channels. Very good." },
      { author: "Lena Stone", text: "Expert directories are such a clean idea." },
    ],
    tags: ["Community", "Operations", "Rituals"],
  },
  {
    id: "post-013",
    source: "Reddit",
    badge: "Reddit",
    creatorId: "samir-haddad",
    timestamp: "4 hr ago",
    kind: "text",
    headline: "Your AI feature needs an abuse story before it needs a launch story.",
    paragraphs: [
      "Write down how someone would exploit it if they were bored, angry, or paid to do it.",
      "Then build the smallest monitoring surface that would make that behavior visible in the first week.",
    ],
    actions: { discussions: 188, saves: 3700, collections: 900, remixes: 308, shares: 132 },
    comments: [
      { author: "Ade Adeyemi", text: "Threat modeling in one paragraph." },
      { author: "Mara Wells", text: "Painful and useful." },
    ],
    tags: ["AI safety", "Security", "Launch"],
  },
  {
    id: "post-014",
    source: "LinkedIn",
    badge: "LinkedIn",
    creatorId: "jamal-okafor",
    timestamp: "4 hr ago",
    kind: "image",
    headline: "The most useful metric in our dashboard is not a number.",
    paragraphs: ["It is a plain-English sentence explaining why the metric moved. Teams need context before charts."],
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80",
      alt: "Team reviewing metrics on a large screen",
      caption: "Context beside the metric, not buried below it.",
    },
    actions: { discussions: 96, saves: 2100, collections: 712, remixes: 183, shares: 73 },
    comments: [
      { author: "Elena Torres", text: "A dashboard should explain itself without becoming a report." },
      { author: "Marcus Reed", text: "Root-cause notes saved our incident reviews." },
    ],
    tags: ["Analytics", "Data UX", "Dashboards"],
  },
  {
    id: "post-015",
    source: "X",
    badge: "GitHub",
    creatorId: "marcus-reed",
    timestamp: "5 hr ago",
    kind: "diagram",
    headline: "The deployment diagram I wish I had before our first outage.",
    paragraphs: ["A system diagram is not documentation until it names the failure path."],
    media: {
      type: "diagram",
      title: "Request path and recovery loop",
      nodes: ["CDN", "App server", "Queue", "Worker", "Database", "Alert", "Rollback"],
    },
    actions: { discussions: 142, saves: 3200, collections: 1100, remixes: 262, shares: 117 },
    comments: [
      { author: "Omar Saleh", text: "The alert node belongs in the diagram. Yes." },
      { author: "Victor Hale", text: "Failure path should be a design requirement." },
    ],
    tags: ["Architecture", "DevOps", "Reliability"],
  },
  {
    id: "post-016",
    source: "Reddit",
    badge: "YouTube",
    creatorId: "sofia-chen",
    timestamp: "6 hr ago",
    kind: "video",
    headline: "How to turn a messy engineering note into a useful post.",
    paragraphs: ["The structure is simple: claim, story, mistake, repair, reusable lesson."],
    media: {
      type: "video",
      title: "Engineering note to public essay",
      thumbnail: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80",
      duration: "6:02",
      progress: 26,
    },
    actions: { discussions: 44, saves: 1200, collections: 364, remixes: 98, shares: 41 },
    comments: [
      { author: "Claire Dubois", text: "The repair section is what makes a lesson credible." },
      { author: "Lena Stone", text: "Saved. This is my next writing template." },
    ],
    tags: ["Writing", "Developer education", "Content"],
  },
  {
    id: "post-017",
    source: "LinkedIn",
    badge: "LinkedIn",
    creatorId: "omar-saleh",
    timestamp: "7 hr ago",
    kind: "article",
    headline: "How we priced an infrastructure product without guessing.",
    paragraphs: ["We anchored the price to avoided incidents, not saved minutes. Buyers understood that faster."],
    media: {
      type: "article",
      title: "Pricing reliability without sounding abstract",
      domain: "infrafounder.io",
      excerpt: "A pricing memo about selling risk reduction to teams that already have too many tools.",
      image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    },
    actions: { discussions: 82, saves: 1700, collections: 508, remixes: 144, shares: 68 },
    comments: [
      { author: "Priya Shah", text: "Avoided incidents is a much stronger anchor than seats." },
      { author: "Ava Roth", text: "This is going into our pricing notes." },
    ],
    tags: ["Pricing", "Infra", "B2B"],
  },
  {
    id: "post-018",
    source: "X",
    badge: "X",
    creatorId: "iris-mason",
    timestamp: "8 hr ago",
    kind: "gallery",
    headline: "Three visual cues that make an early product feel more trustworthy.",
    paragraphs: ["Trust does not require decoration. It requires evidence, rhythm, and restraint."],
    media: {
      type: "gallery",
      images: [
        { url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80", alt: "Minimal workspace" },
        { url: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=900&q=80", alt: "Studio desk with product sketches" },
      ],
      caption: "Evidence, rhythm, restraint.",
    },
    actions: { discussions: 61, saves: 1900, collections: 690, remixes: 177, shares: 92 },
    comments: [
      { author: "Elena Torres", text: "Restraint is the part people underestimate." },
      { author: "Claire Dubois", text: "Evidence before adjectives." },
    ],
    tags: ["Brand", "Design", "Trust"],
  },
  {
    id: "post-019",
    source: "Reddit",
    badge: "GitHub",
    creatorId: "victor-hale",
    timestamp: "9 hr ago",
    kind: "code",
    headline: "The code review comment I leave most often.",
    paragraphs: ["If the reader needs the ticket to understand the branch, the branch is carrying too much hidden context."],
    media: {
      type: "code",
      language: "tsx",
      filename: "review-note.tsx",
      code: "// Prefer names that carry the decision.\nconst canSyncArchive = hasSession && importJob.status !== 'running';\n\n// Avoid names that hide it.\nconst enabled = checkA && status !== 'running';",
    },
    actions: { discussions: 137, saves: 2600, collections: 777, remixes: 193, shares: 81 },
    comments: [
      { author: "Noah Kim", text: "Boolean names are tiny architecture." },
      { author: "Theo Liu", text: "This is my code review personality." },
    ],
    tags: ["Code review", "Engineering", "Readability"],
  },
  {
    id: "post-020",
    source: "LinkedIn",
    badge: "LinkedIn",
    creatorId: "mara-wells",
    timestamp: "10 hr ago",
    kind: "text",
    headline: "How I would validate an AI startup idea in 72 hours.",
    paragraphs: [
      "I would not start with a prototype.",
      "I would start with ten old workflows, five painful documents, and three customers willing to show me the mess live.",
    ],
    bullets: ["Collect raw artifacts", "Map repeated decisions", "Price the saved judgment, not the saved clicks"],
    actions: { discussions: 252, saves: 6100, collections: 1800, remixes: 612, shares: 240 },
    comments: [
      { author: "Ava Roth", text: "Saved judgment is the line." },
      { author: "Priya Shah", text: "This is a better validation plan than most accelerators give." },
    ],
    tags: ["AI startup", "Validation", "Founders"],
  },
  {
    id: "post-021",
    source: "X",
    badge: "X",
    creatorId: "lena-stone",
    timestamp: "11 hr ago",
    kind: "gif",
    headline: "Tiny UI delight: archive cards that breathe when new context appears.",
    paragraphs: ["The motion is only 180ms. Anything longer starts begging for attention."],
    media: {
      type: "gif",
      title: "Context card reveal",
      description: "A saved idea expands into source, summary, and remix prompt.",
      tone: "violet",
    },
    actions: { discussions: 34, saves: 980, collections: 301, remixes: 118, shares: 29 },
    comments: [
      { author: "Dante Cruz", text: "180ms is the sweet spot." },
      { author: "Elena Torres", text: "Quiet motion makes dense tools feel humane." },
    ],
    tags: ["Interaction design", "Motion", "Archive"],
  },
  {
    id: "post-022",
    source: "Reddit",
    badge: "Reddit",
    creatorId: "theo-liu",
    timestamp: "12 hr ago",
    kind: "link",
    headline: "A useful thread on auth edge cases for App Router.",
    paragraphs: ["The best part is the section about validating auth again inside the layout. Middleware alone is not enough."],
    media: {
      type: "link",
      title: "Auth checks that survive framework upgrades",
      domain: "nextpatterns.dev",
      excerpt: "A concise checklist for cookies, callbacks, redirects, and server-side verification.",
    },
    actions: { discussions: 59, saves: 1300, collections: 389, remixes: 72, shares: 44 },
    comments: [
      { author: "Ade Adeyemi", text: "The second server-side check is not optional." },
      { author: "Samir Haddad", text: "Proxy is a doorbell, not the whole lock." },
    ],
    tags: ["Auth", "Next.js", "Security"],
  },
  {
    id: "post-023",
    source: "LinkedIn",
    badge: "LinkedIn",
    creatorId: "maya-bennett",
    timestamp: "13 hr ago",
    kind: "text",
    headline: "The best community onboarding question I have found.",
    paragraphs: ["Ask: what are you unusually good at that people rarely ask you about?"],
    bullets: ["It creates generosity", "It avoids status games", "It gives moderators useful routing data"],
    actions: { discussions: 70, saves: 1450, collections: 390, remixes: 137, shares: 51 },
    comments: [
      { author: "Sofia Chen", text: "This is such a better opener than job title." },
      { author: "Iris Mason", text: "It makes people legible without flattening them." },
    ],
    tags: ["Community", "Onboarding", "Research"],
  },
  {
    id: "post-024",
    source: "X",
    badge: "GitHub",
    creatorId: "leo-park",
    timestamp: "14 hr ago",
    kind: "code",
    headline: "MCP tool descriptions should include what not to use the tool for.",
    paragraphs: ["Negative space prevents agents from being overconfident in the wrong context."],
    media: {
      type: "code",
      language: "json",
      filename: "tool-schema.json",
      code: "{\n  \"name\": \"archive_search\",\n  \"description\": \"Search user-owned archive items. Do not use for public web research or unsaved drafts.\"\n}",
    },
    actions: { discussions: 104, saves: 2500, collections: 821, remixes: 276, shares: 96 },
    comments: [
      { author: "Nina Volk", text: "Tool boundaries are product copy." },
      { author: "Mara Wells", text: "This will prevent so many weird demos." },
    ],
    tags: ["MCP", "Agents", "Tool design"],
  },
  {
    id: "post-025",
    source: "Reddit",
    badge: "Reddit",
    creatorId: "marcus-reed",
    timestamp: "15 hr ago",
    kind: "text",
    headline: "The deployment checklist that saved our Friday night.",
    paragraphs: ["The winning move was not a smarter deploy. It was a smaller blast radius."],
    bullets: ["Feature flag default off", "One customer cohort", "Fast rollback command", "Owner awake for 30 minutes"],
    actions: { discussions: 128, saves: 2400, collections: 641, remixes: 219, shares: 88 },
    comments: [
      { author: "Omar Saleh", text: "Owner awake for 30 minutes is real ops maturity." },
      { author: "Victor Hale", text: "Smaller blast radius beats hero debugging." },
    ],
    tags: ["DevOps", "Launch", "Checklist"],
  },
  {
    id: "post-026",
    source: "LinkedIn",
    badge: "YouTube",
    creatorId: "elena-torres",
    timestamp: "16 hr ago",
    kind: "video",
    headline: "A quick critique of three AI dashboards.",
    paragraphs: ["The common issue: they show everything the model did, but not what the user should trust next."],
    media: {
      type: "video",
      title: "Designing trust after AI output",
      thumbnail: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80",
      duration: "8:41",
      progress: 63,
    },
    actions: { discussions: 91, saves: 2200, collections: 730, remixes: 180, shares: 74 },
    comments: [
      { author: "Jamal Okafor", text: "Trust next is a sharper frame than explainability." },
      { author: "Dante Cruz", text: "The second dashboard teardown hurt in a useful way." },
    ],
    tags: ["AI UX", "Design critique", "Trust"],
  },
  {
    id: "post-027",
    source: "X",
    badge: "X",
    creatorId: "claire-dubois",
    timestamp: "17 hr ago",
    kind: "quote",
    headline: "A launch copy test that never fails me.",
    paragraphs: ["Read the hero line after removing the product name. If any competitor could say it, keep editing."],
    media: {
      type: "quote",
      quote: "Specificity is the cheapest moat on a landing page.",
      attribution: "Notes from a positioning workshop",
    },
    actions: { discussions: 58, saves: 1700, collections: 522, remixes: 141, shares: 80 },
    comments: [
      { author: "Iris Mason", text: "Specificity is also taste." },
      { author: "Priya Shah", text: "This test is brutal and fair." },
    ],
    tags: ["Copywriting", "Launch", "Brand"],
  },
  {
    id: "post-028",
    source: "Reddit",
    badge: "GitHub",
    creatorId: "noah-kim",
    timestamp: "18 hr ago",
    kind: "code",
    headline: "One pattern that removed half our loading spinners.",
    paragraphs: ["We stopped blanking the whole panel and started preserving the last trustworthy state while refreshing small regions."],
    media: {
      type: "code",
      language: "tsx",
      filename: "refresh-panel.tsx",
      code: "<section aria-busy={isRefreshing}>\n  <MetricHeader value={lastKnown.value} />\n  <Activity mode={isRefreshing ? 'hidden' : 'visible'}>\n    <FreshDetails />\n  </Activity>\n</section>",
    },
    actions: { discussions: 112, saves: 3100, collections: 840, remixes: 262, shares: 101 },
    comments: [
      { author: "Jamal Okafor", text: "Last trustworthy state is the right wording." },
      { author: "Elena Torres", text: "Skeletons are not always kinder than memory." },
    ],
    tags: ["React", "Loading states", "UX"],
  },
  {
    id: "post-029",
    source: "LinkedIn",
    badge: "LinkedIn",
    creatorId: "victor-hale",
    timestamp: "19 hr ago",
    kind: "article",
    headline: "How to run a code review without turning it into theater.",
    paragraphs: ["The review should improve the code and the team's shared taste. If it only performs seniority, it is broken."],
    media: {
      type: "article",
      title: "Code review as a taste-building system",
      domain: "engineeringnotes.co",
      excerpt: "A manager's guide to review comments that transfer judgment instead of just blocking merges.",
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    },
    actions: { discussions: 101, saves: 2700, collections: 811, remixes: 166, shares: 95 },
    comments: [
      { author: "Theo Liu", text: "Review comments should age into team vocabulary." },
      { author: "Nina Volk", text: "The section on examples is excellent." },
    ],
    tags: ["Engineering leadership", "Code review", "Teams"],
  },
  {
    id: "post-030",
    source: "X",
    badge: "X",
    creatorId: "ava-roth",
    timestamp: "20 hr ago",
    kind: "text",
    headline: "The YC advice that sounded too simple until it worked.",
    paragraphs: ["Write down the exact sentence customers use when they complain. Build around that sentence before inventing language."],
    actions: { discussions: 133, saves: 2900, collections: 760, remixes: 238, shares: 109 },
    comments: [
      { author: "Priya Shah", text: "The market gives you copy if you listen without polishing too early." },
      { author: "Claire Dubois", text: "Complaint language beats strategy language." },
    ],
    tags: ["YC", "Customer research", "Startups"],
  },
  {
    id: "post-031",
    source: "Reddit",
    badge: "Reddit",
    creatorId: "samir-haddad",
    timestamp: "21 hr ago",
    kind: "poll",
    headline: "What security work should an MVP do before beta?",
    paragraphs: ["I asked founders to pick only one. The distribution was more mature than I expected."],
    media: {
      type: "poll",
      question: "Most urgent beta security step?",
      options: [
        { label: "RLS and access tests", percent: 41 },
        { label: "Secret rotation plan", percent: 22 },
        { label: "Rate limits", percent: 20 },
        { label: "Incident contact tree", percent: 17 },
      ],
    },
    actions: { discussions: 205, saves: 3300, collections: 920, remixes: 277, shares: 121 },
    comments: [
      { author: "Ade Adeyemi", text: "RLS winning gives me hope." },
      { author: "Mara Wells", text: "The contact tree is under-loved until the first bad night." },
    ],
    tags: ["Security", "MVP", "Beta"],
  },
  {
    id: "post-032",
    source: "LinkedIn",
    badge: "LinkedIn",
    creatorId: "sofia-chen",
    timestamp: "22 hr ago",
    kind: "link",
    headline: "A useful archive of founder memos that do not sound manufactured.",
    paragraphs: ["Reading these reminded me that honest constraints make better stories than generic ambition."],
    media: {
      type: "link",
      title: "Founder memos worth studying",
      domain: "operatorlibrary.com",
      excerpt: "A curated set of launch, hiring, pricing, and product memos from teams that had to make real tradeoffs.",
    },
    actions: { discussions: 37, saves: 1100, collections: 488, remixes: 83, shares: 44 },
    comments: [
      { author: "Ava Roth", text: "The pricing memo section is gold." },
      { author: "Iris Mason", text: "Constraints are the story." },
    ],
    tags: ["Writing", "Founders", "Memos"],
  },
  {
    id: "post-033",
    source: "X",
    badge: "YouTube",
    creatorId: "dante-cruz",
    timestamp: "23 hr ago",
    kind: "video",
    headline: "Building a premium sidebar without making it precious.",
    paragraphs: ["The secret is spacing discipline, active state clarity, and no decorative noise."],
    media: {
      type: "video",
      title: "Sidebar polish in 12 minutes",
      thumbnail: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80",
      duration: "12:09",
      progress: 18,
    },
    actions: { discussions: 63, saves: 1750, collections: 530, remixes: 151, shares: 60 },
    comments: [
      { author: "Elena Torres", text: "Precious is exactly the trap." },
      { author: "Noah Kim", text: "The active indicator detail is strong." },
    ],
    tags: ["UI craft", "Sidebar", "Design engineering"],
  },
  {
    id: "post-034",
    source: "Reddit",
    badge: "GitHub",
    creatorId: "omar-saleh",
    timestamp: "1 day ago",
    kind: "diagram",
    headline: "We replaced four dashboards with one incident memory page.",
    paragraphs: ["Every incident now has one place for timeline, owner, customer impact, and the next prevention bet."],
    media: {
      type: "diagram",
      title: "Incident memory page",
      nodes: ["Timeline", "Impact", "Owner", "Signals", "Fix", "Prevention bet"],
    },
    actions: { discussions: 98, saves: 2100, collections: 689, remixes: 190, shares: 67 },
    comments: [
      { author: "Marcus Reed", text: "Prevention bet is a better field than action item." },
      { author: "Jamal Okafor", text: "This turns incidents into product knowledge." },
    ],
    tags: ["Reliability", "Knowledge management", "Ops"],
  },
  {
    id: "post-035",
    source: "LinkedIn",
    badge: "LinkedIn",
    creatorId: "priya-shah",
    timestamp: "1 day ago",
    kind: "article",
    headline: "The quiet marketing loop inside saved searches.",
    paragraphs: ["When users save searches, they are telling you the problems they expect to have again."],
    media: {
      type: "article",
      title: "Saved searches are demand signals",
      domain: "growthnotes.email",
      excerpt: "How product telemetry can become lifecycle messaging without feeling creepy.",
      image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80",
    },
    actions: { discussions: 77, saves: 2200, collections: 604, remixes: 165, shares: 81 },
    comments: [
      { author: "Maya Bennett", text: "The repeat-problem framing is very useful." },
      { author: "Claire Dubois", text: "Lifecycle triggered by intent, not surveillance." },
    ],
    tags: ["Growth", "Saved searches", "Lifecycle"],
  },
  {
    id: "post-036",
    source: "X",
    badge: "X",
    creatorId: "jamal-okafor",
    timestamp: "1 day ago",
    kind: "quote",
    headline: "A metric rule I wish more teams used.",
    paragraphs: ["If the metric cannot tell you what decision it supports, it is probably decoration."],
    media: {
      type: "quote",
      quote: "A dashboard is a meeting that happens before the meeting.",
      attribution: "Data product review notes",
    },
    actions: { discussions: 83, saves: 1800, collections: 510, remixes: 132, shares: 56 },
    comments: [
      { author: "Elena Torres", text: "This sentence is painfully accurate." },
      { author: "Omar Saleh", text: "Metrics should earn rent." },
    ],
    tags: ["Metrics", "Analytics", "Product"],
  },
  {
    id: "post-037",
    source: "Reddit",
    badge: "Reddit",
    creatorId: "iris-mason",
    timestamp: "1 day ago",
    kind: "image",
    headline: "A moodboard for technical products that want to feel calm, not cold.",
    paragraphs: ["Warmth can come from hierarchy, copy, and rhythm. It does not need beige gradients."],
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
      alt: "Calm studio workspace with soft daylight",
      caption: "Calm, not cold.",
    },
    actions: { discussions: 49, saves: 1600, collections: 707, remixes: 128, shares: 58 },
    comments: [
      { author: "Lena Stone", text: "The anti-beige stance is appreciated." },
      { author: "Dante Cruz", text: "Hierarchy is warmth. That lands." },
    ],
    tags: ["Design inspiration", "Brand", "Interface"],
  },
  {
    id: "post-038",
    source: "LinkedIn",
    badge: "GitHub",
    creatorId: "ade-adeyemi",
    timestamp: "1 day ago",
    kind: "code",
    headline: "A tiny test that catches dangerous RLS regressions.",
    paragraphs: ["The test is boring. The bug it prevents is not."],
    media: {
      type: "code",
      language: "sql",
      filename: "rls-smoke-test.sql",
      code: "set local role authenticated;\nset local request.jwt.claim.sub = 'user_a';\n\nselect count(*) = 0 as cannot_read_other_user_rows\nfrom archive_items\nwhere user_id = 'user_b';",
    },
    actions: { discussions: 146, saves: 4100, collections: 1200, remixes: 352, shares: 140 },
    comments: [
      { author: "Samir Haddad", text: "This is the kind of boring I trust." },
      { author: "Theo Liu", text: "Adding a version of this to my migrations." },
    ],
    tags: ["RLS", "Supabase", "Security"],
  },
  {
    id: "post-039",
    source: "X",
    badge: "X",
    creatorId: "mara-wells",
    timestamp: "1 day ago",
    kind: "text",
    headline: "A question I ask before adding an AI button.",
    paragraphs: ["What will the user do if the answer is almost right?"],
    bullets: ["If they edit it, make editing excellent", "If they verify it, show sources", "If they ignore it, do not ship the button yet"],
    actions: { discussions: 195, saves: 4300, collections: 990, remixes: 401, shares: 173 },
    comments: [
      { author: "Leo Park", text: "Almost right is the real product state." },
      { author: "Elena Torres", text: "This should be a design review prompt." },
    ],
    tags: ["AI product", "UX", "Verification"],
  },
  {
    id: "post-040",
    source: "Reddit",
    badge: "YouTube",
    creatorId: "noah-kim",
    timestamp: "1 day ago",
    kind: "gif",
    headline: "A developer meme that is unfortunately also architecture advice.",
    paragraphs: ["The fastest code path is the one you did not add because the product did not need it yet."],
    media: {
      type: "gif",
      title: "When the abstraction survives first contact with users",
      description: "A tiny loop of a card labeled 'future-proof' calmly becoming a single function.",
      tone: "matrix",
    },
    actions: { discussions: 121, saves: 2400, collections: 530, remixes: 217, shares: 136 },
    comments: [
      { author: "Victor Hale", text: "This joke is a quarterly planning principle." },
      { author: "Nina Volk", text: "Future-proof is where bugs rent a room." },
    ],
    tags: ["Developer meme", "Architecture", "Simplicity"],
  },
];

export const SPECIAL_CARDS: SpecialCard[] = [
  {
    id: "special-ai-1",
    type: "ai",
    title: "AI Suggestion",
    body: "This post has the ingredients of a strong remix: clear lesson, specific failure, and a reusable checklist.",
    action: "Remix",
  },
  {
    id: "special-gem-1",
    type: "gem",
    title: "Hidden Gem",
    body: "A saved idea from your archive is becoming relevant again based on the current feed pattern.",
    action: "View",
  },
  {
    id: "special-trend-1",
    type: "trend",
    title: "Trending Topic",
    topics: ["AI Agents", "Next.js", "Stripe", "Cursor", "OpenAI"],
  },
  {
    id: "special-creator-1",
    type: "creator",
    creatorId: "elena-torres",
  },
  {
    id: "special-ai-2",
    type: "ai",
    title: "AI Suggestion",
    body: "The theme of this session is trust: auth, rollback, review, and user control are showing up together.",
    action: "Create brief",
  },
  {
    id: "special-gem-2",
    type: "gem",
    title: "Hidden Gem",
    body: "One of your older saved notes about saved searches maps directly to today's growth strategy posts.",
    action: "Open note",
  },
];

export function getCreator(creatorId: string) {
  return CREATORS.find((creator) => creator.id === creatorId) || CREATORS[0];
}

export function shuffleFeed<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function buildMockFeed(source: FeedSource): FeedItem[] {
  const posts = shuffleFeed(FEED_POSTS.filter((post) => post.source === source));
  const specials = shuffleFeed(SPECIAL_CARDS).slice(0, 4);
  const feed: FeedItem[] = posts.map((post) => ({ itemType: "post", post }));

  specials.forEach((card, index) => {
    const insertAt = Math.min(feed.length, 2 + index * 4 + Math.floor(Math.random() * 2));
    feed.splice(insertAt, 0, { itemType: "special", card });
  });

  return feed;
}
