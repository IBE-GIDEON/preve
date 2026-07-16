// Shared content types + display helpers for archive posts.
// (Historically this file held mock data; that's gone — real content comes
// from the user's imported archive in Supabase.)

export type Platform = "Reddit" | "LinkedIn" | "X" | "Bluesky";
export type PostKind = "Post" | "Comment" | "Thread" | "Article";

export interface Post {
  id: string;
  platform: Platform;
  kind: PostKind;
  content: string;
  summary: string;
  sourceTitle: string;
  date: string;
  /** Raw ISO timestamp (present on imported items; used for date filtering). */
  publishedAt?: string;
  url: string;
  engagement: {
    likes?: number;
    comments?: number;
    reposts?: number;
    upvotes?: number;
  };
  topics: string[];
}

export function getPlatformColor(platform: Platform) {
  switch (platform) {
    case "Reddit":
      return "#FF4500";
    case "Bluesky":
      return "#0085FF";
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
