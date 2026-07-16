"use client";

import { motion } from "framer-motion";
import { FolderOpen, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import ConfirmDialog from "../../../components/ConfirmDialog";
import {
  createCollection,
  deleteCollection,
  listCollections,
  type Collection,
} from "../../../lib/collections/client";

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Collection | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");
      setCollections(await listCollections());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load collections.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const created = await createCollection(name, description);
      setCollections((prev) => [created, ...prev]);
      setName("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create collection.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await deleteCollection(pendingDelete.id);
      setCollections((prev) => prev.filter((c) => c.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the collection.");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="dashboard-content-area">
      <main className="dashboard-main" style={{ paddingTop: "3rem", alignItems: "flex-start" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: "100%", maxWidth: "760px", margin: "0 auto" }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.4rem" }}>Collections</h1>
          <p className="settings-muted" style={{ marginBottom: "1.75rem" }}>
            Playlists for your posts. Find something great in Search, hit &ldquo;Add to collection&rdquo;, and
            it&rsquo;s never buried again — make a collection public to share it as one link.
          </p>

          <section className="settings-section">
            <h2 className="settings-section-title">New collection</h2>
            <label htmlFor="c-name" className="settings-label">Name</label>
            <input id="c-name" className="auth-input" value={name} maxLength={60}
              onChange={(e) => setName(e.target.value)} placeholder="e.g. Best threads on AI" />
            <label htmlFor="c-desc" className="settings-label" style={{ marginTop: "0.85rem" }}>Description (optional)</label>
            <input id="c-desc" className="auth-input" value={description} maxLength={160}
              onChange={(e) => setDescription(e.target.value)} placeholder="What belongs in this collection?" />
            <button className="settings-save-btn" style={{ marginTop: "1rem", height: "42px" }}
              onClick={handleCreate} disabled={!name.trim() || creating}>
              <Plus size={16} style={{ verticalAlign: "-3px", marginRight: "0.3rem" }} />
              {creating ? "Creating..." : "Create collection"}
            </button>
          </section>

          {error && <p className="auth-field-error" style={{ marginBottom: "1rem" }}>{error}</p>}

          {loading ? (
            <p className="settings-muted">Loading collections…</p>
          ) : collections.length === 0 ? (
            <div className="settings-section" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
              <FolderOpen size={28} style={{ opacity: 0.4 }} />
              <p style={{ fontWeight: 600, marginTop: "0.75rem" }}>No collections yet</p>
              <p className="settings-muted" style={{ maxWidth: "420px", margin: "0.35rem auto 0" }}>
                Creators use them for things like &ldquo;My best threads&rdquo;, &ldquo;Client wins&rdquo;, or
                &ldquo;Ideas to repurpose&rdquo;. Start one above, or open any post in{" "}
                <Link href="/dashboard" style={{ color: "#F05522" }}>Search</Link> and hit
                &ldquo;Add to collection&rdquo;.
              </p>
            </div>
          ) : (
            <div className="collections-grid">
              {collections.map((collection) => (
                <div key={collection.id} className="collection-card-wrap">
                  <Link href={`/dashboard/collections/${collection.id}`} className="collection-card">
                    <div className="collection-card-icon"><FolderOpen size={18} /></div>
                    <div style={{ fontWeight: 600, paddingRight: "2rem" }}>{collection.name}</div>
                    {collection.description && (
                      <div className="settings-muted" style={{ marginTop: "0.25rem" }}>{collection.description}</div>
                    )}
                    <div className="collection-card-meta">
                      {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
                      {collection.isPublic && <span className="collection-badge">Public</span>}
                    </div>
                  </Link>
                  <button
                    type="button"
                    className="collection-card-delete"
                    aria-label={`Delete ${collection.name}`}
                    title="Delete collection"
                    onClick={() => setPendingDelete(collection)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete collection?"
        message={
          pendingDelete
            ? pendingDelete.itemCount === 0
              ? `"${pendingDelete.name}" will be gone for good. It's empty — nothing else is affected.`
              : `"${pendingDelete.name}" will be gone for good. The ${
                  pendingDelete.itemCount === 1 ? "post" : `${pendingDelete.itemCount} posts`
                } inside stay safe in your archive.`
            : ""
        }
        confirmLabel="Delete collection"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setPendingDelete(null)}
      />
    </div>
  );
}
