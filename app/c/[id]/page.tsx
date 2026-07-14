"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "../../../components/ThemeToggle";
import type { Post } from "../../data/mockPosts";
import { getPlatformColor } from "../../data/mockPosts";
import { ARCHIVE_ITEM_COLUMNS, postFromRow, type ArchiveItemRow } from "../../../lib/archive/client";
import { createClient } from "../../../lib/supabase/client";

interface Owner {
  username: string;
  full_name: string | null;
}

interface CollectionMeta {
  name: string;
  description: string | null;
}

export default function PublicCollectionPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [meta, setMeta] = useState<CollectionMeta | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: collection } = await supabase
        .from("collections")
        .select("name, description, user_id, is_public")
        .eq("id", id)
        .maybeSingle();

      if (!collection || !(collection as { is_public: boolean }).is_public) {
        setMissing(true);
        return;
      }
      const c = collection as { name: string; description: string | null; user_id: string };
      setMeta({ name: c.name, description: c.description });

      const [{ data: ownerRow }, { data: itemRows }] = await Promise.all([
        supabase.from("public_profiles").select("username, full_name").eq("id", c.user_id).maybeSingle(),
        supabase
          .from("collection_items")
          .select(`archive_items(${ARCHIVE_ITEM_COLUMNS})`)
          .eq("collection_id", id),
      ]);

      setOwner((ownerRow as Owner | null) ?? null);
      setItems(
        ((itemRows ?? []) as unknown as { archive_items: ArchiveItemRow | null }[])
          .map((row) => row.archive_items)
          .filter((item): item is ArchiveItemRow => Boolean(item))
          .map(postFromRow),
      );
    } catch {
      setMissing(true);
    } finally {
      setLoading(false);
    }
  }

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
        {loading ? (
          <p className="settings-muted">Loading…</p>
        ) : missing || !meta ? (
          <div style={{ textAlign: "center", paddingTop: "3rem" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Collection not found</h1>
            <p className="settings-muted" style={{ marginTop: "0.5rem" }}>
              This collection is private or doesn't exist.
            </p>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>{meta.name}</h1>
            {meta.description && <p className="settings-muted" style={{ marginTop: "0.4rem" }}>{meta.description}</p>}
            {owner && (
              <p style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
                by{" "}
                <Link href={`/u/${owner.username}`} className="auth-inline-link">
                  {owner.full_name || `@${owner.username}`}
                </Link>
              </p>
            )}

            <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {items.length === 0 ? (
                <p className="settings-muted">This collection has no items yet.</p>
              ) : (
                items.map((post) => (
                  <div key={post.id} className="collection-item">
                    <span className="collection-plat" style={{ color: getPlatformColor(post.platform) }}>{post.platform}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="collection-item-text">{post.summary}</div>
                      <div className="settings-muted" style={{ fontSize: "0.78rem" }}>{post.date}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
