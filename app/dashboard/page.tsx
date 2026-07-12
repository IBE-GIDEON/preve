"use client";

import {
  BookOpen,
  Bookmark,
  Check,
  ExternalLink,
  Flame,
  Gem,
  MessageCircle,
  MoreHorizontal,
  Play,
  Repeat2,
  Send,
  Sparkles,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CREATORS,
  FEED_POSTS,
  FEED_SOURCES,
  buildMockFeed,
  getCreator,
  type FeedActions,
  type FeedBadge,
  type FeedItem,
  type FeedMedia,
  type FeedPost,
  type FeedSource,
  type SpecialCard,
} from "./preveFeedMock";

const DASHBOARD_TITLE = "For you page";

type TitleCharStyle = CSSProperties & {
  "--char-index": number;
};

type ActionKey = keyof FeedActions;

const actionItems: Array<{ key: ActionKey; label: string; Icon: LucideIcon }> = [
  { key: "discussions", label: "Discuss", Icon: MessageCircle },
  { key: "saves", label: "Save", Icon: Bookmark },
  { key: "collections", label: "Collect", Icon: BookOpen },
  { key: "remixes", label: "Remix", Icon: Repeat2 },
  { key: "shares", label: "Share", Icon: Send },
];

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatCount(value: number) {
  return compactFormatter.format(value);
}

function getPlatformLabel(platform: FeedSource) {
  return platform === "X" ? "X" : platform;
}

function getBadgeLabel(platform: FeedBadge) {
  switch (platform) {
    case "GitHub":
      return "GitHub";
    case "YouTube":
      return "YouTube";
    case "LinkedIn":
      return "LinkedIn";
    case "Reddit":
      return "Reddit";
    case "X":
      return "X";
    default:
      return platform;
  }
}

function getBadgeMark(platform: FeedBadge) {
  switch (platform) {
    case "GitHub":
      return "GH";
    case "YouTube":
      return "YT";
    case "LinkedIn":
      return "in";
    case "Reddit":
      return "r";
    case "X":
      return "X";
    default:
      return "P";
  }
}

function PlatformLogo({ platform }: { platform: FeedSource }) {
  if (platform === "X") {
    return (
      <svg className="fyp-platform-logo" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M14.35 10.4 21.2 2.5h-1.62l-5.95 6.86-4.75-6.86H3.4l7.18 10.37L3.4 21.15h1.62l6.28-7.24 5.02 7.24h5.48l-7.45-10.75Zm-2.22 2.56-.73-1.03-5.78-8.21h2.49l4.67 6.64.73 1.03 6.07 8.63h-2.49l-4.96-7.06Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (platform === "LinkedIn") {
    return (
      <svg className="fyp-platform-logo" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M5.2 8.5h3.1v10.1H5.2V8.5Zm1.55-5a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Zm3.75 5h3v1.38h.04c.42-.79 1.45-1.63 2.99-1.63 3.2 0 3.79 2.1 3.79 4.84v5.51h-3.12v-4.89c0-1.17-.02-2.67-1.63-2.67-1.63 0-1.88 1.27-1.88 2.58v4.98H10.5V8.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg className="fyp-platform-logo" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M19.35 10.8c-.1-.78-.77-1.38-1.58-1.38-.43 0-.82.17-1.1.45-1.1-.74-2.55-1.2-4.13-1.26l.7-3.28 2.27.48a1.32 1.32 0 1 0 .17-.8l-2.7-.57a.43.43 0 0 0-.5.33l-.82 3.84c-1.62.05-3.1.51-4.23 1.27a1.58 1.58 0 0 0-1.1-.45c-.88 0-1.6.72-1.6 1.6 0 .58.31 1.08.77 1.36-.03.22-.05.44-.05.67 0 2.47 2.94 4.48 6.56 4.48s6.56-2 6.56-4.48c0-.24-.02-.47-.06-.7.55-.25.9-.84.81-1.52ZM8.94 12.37a1.05 1.05 0 1 1 2.1 0 1.05 1.05 0 0 1-2.1 0Zm5.58 3.11c-.72.72-2.1.77-2.52.77s-1.8-.05-2.52-.77a.38.38 0 0 1 .54-.54c.45.45 1.43.54 1.98.54s1.53-.1 1.98-.54a.38.38 0 0 1 .54.54Zm.54-2.06a1.05 1.05 0 1 1 0-2.1 1.05 1.05 0 0 1 0 2.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function renderMedia(media: FeedMedia) {
  if (media.type === "image") {
    return (
      <figure className="preve-media-frame">
        <div className="preve-media-image" role="img" aria-label={media.alt} style={{ backgroundImage: `url(${media.url})` }} />
        {media.caption && <figcaption>{media.caption}</figcaption>}
      </figure>
    );
  }

  if (media.type === "gallery") {
    return (
      <figure className={`preve-gallery count-${media.images.length}`}>
        {media.images.map((image) => (
          <div key={image.url} className="preve-media-image" role="img" aria-label={image.alt} style={{ backgroundImage: `url(${image.url})` }} />
        ))}
        {media.caption && <figcaption>{media.caption}</figcaption>}
      </figure>
    );
  }

  if (media.type === "gif") {
    return (
      <div className={`preve-gif-preview ${media.tone}`}>
        <div className="preve-gif-loop" />
        <div>
          <div className="preve-media-kicker">Looping GIF preview</div>
          <div className="preve-gif-title">{media.title}</div>
          <p>{media.description}</p>
        </div>
      </div>
    );
  }

  if (media.type === "video") {
    return (
      <div className="preve-video-preview">
        <div className="preve-video-thumb" style={{ backgroundImage: `url(${media.thumbnail})` }}>
          <div className="preve-play-button">
            <Play size={22} fill="currentColor" />
          </div>
          <div className="preve-duration">{media.duration}</div>
          <div className="preve-progress">
            <span style={{ width: `${media.progress}%` }} />
          </div>
        </div>
        <div className="preve-video-title">{media.title}</div>
      </div>
    );
  }

  if (media.type === "code") {
    return (
      <div className="preve-code-card">
        <div className="preve-code-header">
          <span>{media.filename}</span>
          <span>{media.language}</span>
        </div>
        <pre>
          <code>{media.code}</code>
        </pre>
      </div>
    );
  }

  if (media.type === "quote") {
    return (
      <blockquote className="preve-quote-card">
        <p>{media.quote}</p>
        <cite>{media.attribution}</cite>
      </blockquote>
    );
  }

  if (media.type === "article") {
    return (
      <div className="preve-article-card">
        <div className="preve-article-image" style={{ backgroundImage: `url(${media.image})` }} />
        <div className="preve-article-body">
          <div className="preve-media-kicker">{media.domain}</div>
          <h4>{media.title}</h4>
          <p>{media.excerpt}</p>
        </div>
        <ExternalLink size={16} className="preve-article-icon" />
      </div>
    );
  }

  if (media.type === "link") {
    return (
      <div className="preve-link-card">
        <div>
          <div className="preve-media-kicker">{media.domain}</div>
          <h4>{media.title}</h4>
          <p>{media.excerpt}</p>
        </div>
        <ExternalLink size={16} />
      </div>
    );
  }

  if (media.type === "poll") {
    return (
      <div className="preve-poll-card">
        <h4>{media.question}</h4>
        {media.options.map((option) => (
          <div key={option.label} className="preve-poll-option">
            <div>
              <span>{option.label}</span>
              <strong>{option.percent}%</strong>
            </div>
            <div className="preve-poll-track">
              <span style={{ width: `${option.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="preve-diagram-card">
      <h4>{media.title}</h4>
      <div className="preve-diagram-flow">
        {media.nodes.map((node, index) => (
          <div key={node} className="preve-diagram-node">
            <span>{String(index + 1).padStart(2, "0")}</span>
            {node}
          </div>
        ))}
      </div>
    </div>
  );
}

function SpecialFeedCard({ card }: { card: SpecialCard }) {
  if (card.type === "creator") {
    const creator = getCreator(card.creatorId);
    return (
      <motion.article className="preve-special-card creator" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}>
        <div className="preve-avatar">{creator.avatar}</div>
        <div className="preve-special-main">
          <div className="preve-special-kicker">Suggested Creator</div>
          <h3>{creator.name}</h3>
          <p>{creator.bio}</p>
          <div className="preve-expertise-row">
            {creator.expertise.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <button className="preve-special-button">
          <UserPlus size={15} />
          Follow
        </button>
      </motion.article>
    );
  }

  if (card.type === "trend") {
    return (
      <motion.article className="preve-special-card trend" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}>
        <div className="preve-special-symbol">
          <Flame size={18} />
        </div>
        <div className="preve-special-main">
          <div className="preve-special-kicker">Trending Topic</div>
          <h3>{card.title}</h3>
          <div className="preve-topic-cloud">
            {card.topics.map((topic) => (
              <span key={topic}>{topic}</span>
            ))}
          </div>
        </div>
      </motion.article>
    );
  }

  const Icon = card.type === "ai" ? Sparkles : Gem;
  return (
    <motion.article className={`preve-special-card ${card.type}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}>
      <div className="preve-special-symbol">
        <Icon size={18} />
      </div>
      <div className="preve-special-main">
        <div className="preve-special-kicker">{card.type === "ai" ? "AI Suggestion" : "Hidden Gem"}</div>
        <h3>{card.title}</h3>
        <p>{card.body}</p>
      </div>
      <button className="preve-special-button">{card.action}</button>
    </motion.article>
  );
}

function FeedPostCard({
  post,
  activeActions,
  onToggleAction,
}: {
  post: FeedPost;
  activeActions: Partial<Record<ActionKey, boolean>>;
  onToggleAction: (key: ActionKey) => void;
}) {
  const creator = getCreator(post.creatorId);

  return (
    <motion.article
      className="preve-post-card"
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      whileHover={{ y: -2 }}
    >
      <header className="preve-post-header">
        <div className="preve-avatar">{creator.avatar}</div>
        <div className="preve-creator-block">
          <div className="preve-creator-line">
            <strong>{creator.name}</strong>
            <span>@{creator.username}</span>
          </div>
          <div className="preve-role-line">
            <span>{creator.role}</span>
            <span aria-hidden="true">/</span>
            <span>{post.timestamp}</span>
          </div>
        </div>
        <div className="preve-platform-badge">
          <span>{getBadgeMark(post.badge)}</span>
          {getBadgeLabel(post.badge)}
        </div>
      </header>

      <div className="preve-post-body">
        <h2>{post.headline}</h2>
        {post.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {post.bullets && (
          <ul>
            {post.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        )}
      </div>

      {post.media && renderMedia(post.media)}

      <div className="preve-tag-row">
        {post.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>

      <div className="preve-action-bar">
        {actionItems.map(({ key, label, Icon }) => {
          const active = Boolean(activeActions[key]);
          const count = post.actions[key] + (active ? 1 : 0);
          return (
            <button key={key} type="button" className={active ? "active" : ""} onClick={() => onToggleAction(key)}>
              <Icon size={16} />
              <span>{formatCount(count)}</span>
              <span>{label}</span>
            </button>
          );
        })}
        <button type="button" aria-label="More actions">
          <MoreHorizontal size={18} />
          <span>More</span>
        </button>
      </div>

      <div className="preve-comments-preview">
        {post.comments.slice(0, 3).map((comment) => (
          <div key={`${post.id}-${comment.author}`} className="preve-comment">
            <strong>{comment.author}</strong>
            <span>{comment.text}</span>
          </div>
        ))}
        <button type="button">View all discussions</button>
      </div>
    </motion.article>
  );
}

function FeedSkeleton() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <div key={item} className="preve-post-card skeleton-card">
          <div className="skeleton-line short" />
          <div className="skeleton-line" />
          <div className="skeleton-media" />
          <div className="skeleton-line" />
        </div>
      ))}
    </>
  );
}

export default function DashboardPage() {
  const [selectedSource, setSelectedSource] = useState<FeedSource>("Reddit");
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [activeActions, setActiveActions] = useState<Record<string, Partial<Record<ActionKey, boolean>>>>({});

  useEffect(() => {
    setFeedItems([]);
    const timeout = window.setTimeout(() => {
      setFeedItems(buildMockFeed(selectedSource));
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [selectedSource]);

  const sourceCounts = useMemo(
    () =>
      FEED_SOURCES.reduce(
        (counts, source) => {
          counts[source] = FEED_POSTS.filter((post) => post.source === source).length;
          return counts;
        },
        {} as Record<FeedSource, number>,
      ),
    [],
  );

  const selectedCreator = CREATORS.find((creator) => creator.id === "mara-wells") || CREATORS[0];

  function toggleAction(postId: string, actionKey: ActionKey) {
    setActiveActions((current) => ({
      ...current,
      [postId]: {
        ...current[postId],
        [actionKey]: !current[postId]?.[actionKey],
      },
    }));
  }

  return (
    <div className="dashboard-content-area">
      <main className="dashboard-main preve-feed-main" aria-label="Preve For You feed">
        <div className="preve-feed-topbar">
          <h1 className="animated-char-title" aria-label={DASHBOARD_TITLE} style={{ fontSize: "1.15rem" }}>
            {DASHBOARD_TITLE.split("").map((char, index) => (
              <span key={`${char}-${index}`} aria-hidden="true" style={{ "--char-index": index } as TitleCharStyle}>
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </h1>

          <div className="fyp-platform-row" role="tablist" aria-label="For you platform">
            {FEED_SOURCES.map((platform) => {
              const isActive = selectedSource === platform;
              return (
                <button
                  key={platform}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`${getPlatformLabel(platform)} for you page`}
                  className={`fyp-platform-button${isActive ? " active" : ""}`}
                  onClick={() => setSelectedSource(platform)}
                >
                  <PlatformLogo platform={platform} />
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.section
            key={selectedSource}
            className="preve-feed-stream"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="preve-feed-context">
              <div>
                <span>{getPlatformLabel(selectedSource)} signal</span>
                <strong>{sourceCounts[selectedSource]} knowledge posts</strong>
              </div>
              <div>
                <Check size={14} />
                Randomized on refresh
              </div>
            </div>

            {feedItems.length === 0 ? (
              <FeedSkeleton />
            ) : (
              feedItems.map((item) =>
                item.itemType === "special" ? (
                  <SpecialFeedCard key={item.card.id} card={item.card} />
                ) : (
                  <FeedPostCard
                    key={item.post.id}
                    post={item.post}
                    activeActions={activeActions[item.post.id] || {}}
                    onToggleAction={(actionKey) => toggleAction(item.post.id, actionKey)}
                  />
                ),
              )
            )}
          </motion.section>
        </AnimatePresence>
      </main>

      <aside className="dashboard-right-sidebar">
        <div className="preve-feed-side-panel">
          <h3 className="suggestions-heading">Feed Memory</h3>
          <div className="preve-side-stat">
            <span>Total mock posts</span>
            <strong>{FEED_POSTS.length}</strong>
          </div>
          <div className="preve-side-stat">
            <span>Creators</span>
            <strong>{CREATORS.length}</strong>
          </div>
          <div className="preve-source-list">
            {FEED_SOURCES.map((source) => (
              <button key={source} type="button" onClick={() => setSelectedSource(source)} className={selectedSource === source ? "active" : ""}>
                <span>{getPlatformLabel(source)}</span>
                <strong>{sourceCounts[source]}</strong>
              </button>
            ))}
          </div>

          <div className="preve-side-creator">
            <div className="preve-avatar">{selectedCreator.avatar}</div>
            <div>
              <span>Suggested Creator</span>
              <strong>{selectedCreator.name}</strong>
              <p>{selectedCreator.bio}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
