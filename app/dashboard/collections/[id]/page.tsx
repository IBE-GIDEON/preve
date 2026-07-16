"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Check, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Post } from "../../../data/mockPosts";
import { getPlatformColor } from "../../../data/mockPosts";
import ConfirmDialog from "../../../../components/ConfirmDialog";
import { loadArchivePosts } from "../../../../lib/archive/client";
import {
  addItemToCollection,
  deleteCollection,
  getCollection,
  getCollectionItems,
  removeItemFromCollection,
  updateCollection,
  type Collection,
} from "../../../../lib/collections/client";

export default function CollectionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<Post[]>([]);
  const [archive, setArchive] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [meta, collectionItems, allPosts] = await Promise.all([
        getCollection(id),
        getCollectionItems(id),
        loadArchivePosts(),
      ]);
      setCollection(meta);
      setItems(collectionItems);
      setArchive(allPosts.posts);
      if (meta) {
        setName(meta.name);
        setDescription(meta.description ?? "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load collection.");
    } finally {
      setLoading(false);
    }
  }

  const itemIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const available = useMemo(() => archive.filter((post) => !itemIds.has(post.id)), [archive, itemIds]);

  async function addItem(post: Post) {
    setItems((prev) => [post, ...prev]);
    try {
      await addItemToCollection(id, post.id);
    } catch {
      setItems((prev) => prev.filter((item) => item.id !== post.id));
    }
  }

  async function removeItem(postId: string) {
    const previous = items;
    setItems((prev) => prev.filter((item) => item.id !== postId));
    try {
      await removeItemFromCollection(id, postId);
    } catch {
      setItems(previous);
    }
  }

  async function saveMeta() {
    if (!name.trim()) return;
    await updateCollection(id, { name, description });
    setCollection((prev) => (prev ? { ...prev, name: name.trim(), description: description.trim() || null } : prev));
  }

  async function togglePublic() {
    if (!collection) return;
    const next = !collection.isPublic;
    setCollection({ ...collection, isPublic: next });
    await updateCollection(id, { isPublic: next });
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteCollection(id);
      router.push("/dashboard/collections");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the collection.");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-content-area">
        <main className="dashboard-main" style={{ paddingTop: "3rem" }}>
          <p className="settings-muted">Loading…</p>
        </main>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="dashboard-content-area">
        <main className="dashboard-main" style={{ paddingTop: "3rem", alignItems: "flex-start" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto", width: "100%" }}>
            <Link href="/dashboard/collections" className="auth-inline-link">← Back to collections</Link>
            <p className="auth-field-error" style={{ marginTop: "1rem" }}>{error || "Collection not found."}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-content-area">
      <main className="dashboard-main" style={{ paddingTop: "3rem", alignItems: "flex-start" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ width: "100%", maxWidth: "760px", margin: "0 auto" }}>
          <Link href="/dashboard/collections" className="auth-inline-link"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", marginBottom: "1.25rem" }}>
            <ArrowLeft size={15} /> Collections
          </Link>

          <section className="settings-section">
            <label htmlFor="d-name" className="settings-label">Name</label>
            <input id="d-name" className="auth-input" value={name} maxLength={60}
              onChange={(e) => setName(e.target.value)} onBlur={saveMeta} />
            <label htmlFor="d-desc" className="settings-label" style={{ marginTop: "0.85rem" }}>Description</label>
            <input id="d-desc" className="auth-input" value={description} maxLength={160}
              onChange={(e) => setDescription(e.target.value)} onBlur={saveMeta} placeholder="Optional" />

            <div className="settings-row" style={{ marginTop: "0.5rem" }}>
              <div>
                <div className="settings-row-label">Public collection</div>
                <div className="settings-muted">{collection.isPublic ? "Visible on your public profile." : "Private to you."}</div>
              </div>
              <button type="button" role="switch" aria-checked={collection.isPublic}
                onClick={togglePublic} className={`profile-switch${collection.isPublic ? " on" : ""}`}>
                <span className="profile-switch-knob" />
              </button>
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-row-label" style={{ color: "#ef4444" }}>Delete collection</div>
                <div className="settings-muted">Posts stay in your archive.</div>
              </div>
              <button className="settings-ghost-btn danger" onClick={() => setConfirmingDelete(true)}>
                <Trash2 size={15} /> Delete
              </button>
            </div>
          </section>

          <section className="settings-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 className="settings-section-title" style={{ margin: 0 }}>Items ({items.length})</h2>
              <button className="settings-ghost-btn" onClick={() => setAdding((v) => !v)}>
                {adding ? <><X size={15} /> Done</> : <><Plus size={15} /> Add items</>}
              </button>
            </div>

            {adding && (
              <div className="collection-picker">
                {available.length === 0 ? (
                  <p className="settings-muted">Everything in your archive is already here.</p>
                ) : (
                  available.slice(0, 30).map((post) => (
                    <button key={post.id} className="collection-picker-row" onClick={() => addItem(post)}>
                      <span className="collection-plat" style={{ color: getPlatformColor(post.platform) }}>{post.platform}</span>
                      <span className="collection-picker-text">{post.summary}</span>
                      <Plus size={15} />
                    </button>
                  ))
                )}
              </div>
            )}

            {items.length === 0 ? (
              <p className="settings-muted">No items yet — add some from your archive.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {items.map((post) => (
                  <div key={post.id} className="collection-item">
                    <span className="collection-plat" style={{ color: getPlatformColor(post.platform) }}>{post.platform}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="collection-item-text">{post.summary}</div>
                      <div className="settings-muted" style={{ fontSize: "0.78rem" }}>{post.date}</div>
                    </div>
                    <button className="collection-remove" aria-label="Remove" onClick={() => removeItem(post.id)}>
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
          {error && <p className="auth-field-error">{error}</p>}
          <p className="settings-status ok" style={{ opacity: 0 }} aria-hidden><Check size={12} /></p>
        </motion.div>
      </main>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete collection?"
        message={`"${collection.name}" will be gone for good. The posts inside stay safe in your archive.`}
        confirmLabel="Delete collection"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setConfirmingDelete(false)}
      />
    </div>
  );
}
