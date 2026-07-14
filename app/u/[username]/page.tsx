import { FolderOpen, Globe } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ThemeToggle from "../../../components/ThemeToggle";
import { getInitials } from "../../../lib/user";
import { SOCIAL_PLATFORMS } from "../../../lib/profile";
import { hasSupabasePublicEnv } from "../../../lib/supabase/env";
import { createClient } from "../../../lib/supabase/server";
import FollowButton from "./FollowButton";

export const dynamic = "force-dynamic";

interface PublicProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  social_links: Record<string, string> | null;
}

interface PublicCollection {
  id: string;
  name: string;
  description: string | null;
  collection_items?: { count: number }[];
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  if (!hasSupabasePublicEnv()) notFound();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("public_profiles")
    .select("id, username, full_name, avatar_url, bio, website, social_links")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (!profile) notFound();
  const p = profile as PublicProfile;

  const [{ count: followers }, { count: following }, { data: collections }] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", p.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", p.id),
    supabase
      .from("collections")
      .select("id, name, description, collection_items(count)")
      .eq("user_id", p.id)
      .eq("is_public", true)
      .order("updated_at", { ascending: false }),
  ]);

  const publicCollections = (collections ?? []) as PublicCollection[];
  const socialLinks = p.social_links ?? {};

  return (
    <div className="public-page">
      <header className="public-header">
        <Link href="/" className="logo" style={{ marginBottom: 0, textDecoration: "none" }}>
          <img src="/images/preve-search-mark.svg" alt="" className="logo-mark" />
          <span>preve</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <ThemeToggle />
          <Link href="/dashboard" className="settings-ghost-btn">Open app</Link>
        </div>
      </header>

      <main className="public-main">
        <section className="public-profile-head">
          {p.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar_url} alt="" className="public-avatar" />
          ) : (
            <span className="public-avatar public-avatar-fallback">{getInitials(p.full_name, p.username)}</span>
          )}
          <h1 className="public-name">{p.full_name || p.username}</h1>
          <p className="public-username">@{p.username}</p>
          {p.bio && <p className="public-bio">{p.bio}</p>}

          <div className="public-links">
            {p.website && (
              <a href={p.website} target="_blank" rel="noopener noreferrer" className="public-link">
                <Globe size={15} /> Website
              </a>
            )}
            {SOCIAL_PLATFORMS.filter((platform) => socialLinks[platform.key]).map((platform) => (
              <a key={platform.key} href={socialLinks[platform.key]} target="_blank" rel="noopener noreferrer" className="public-link">
                {platform.label}
              </a>
            ))}
          </div>

          <div className="public-followrow">
            <span className="settings-muted">{(following ?? 0).toLocaleString()} following</span>
            <FollowButton targetUserId={p.id} initialFollowers={followers ?? 0} />
          </div>
        </section>

        <section style={{ marginTop: "2.5rem" }}>
          <h2 className="settings-section-title">Public collections</h2>
          {publicCollections.length === 0 ? (
            <p className="settings-muted">No public collections yet.</p>
          ) : (
            <div className="collections-grid">
              {publicCollections.map((collection) => (
                <Link key={collection.id} href={`/c/${collection.id}`} className="collection-card">
                  <div className="collection-card-icon"><FolderOpen size={18} /></div>
                  <div style={{ fontWeight: 600 }}>{collection.name}</div>
                  {collection.description && (
                    <div className="settings-muted" style={{ marginTop: "0.25rem" }}>{collection.description}</div>
                  )}
                  <div className="collection-card-meta">{collection.collection_items?.[0]?.count ?? 0} items</div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
