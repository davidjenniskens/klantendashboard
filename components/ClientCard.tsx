"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Client } from "@/lib/types";
import ConfirmDialog from "./ConfirmDialog";

export interface RecentMoment {
  id: string;
  title: string;
  date: string;
}

export default function ClientCard({
  client,
  recentMoments,
}: {
  client: Client;
  recentMoments: RecentMoment[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(client.name);
  const [tags, setTags] = useState(client.tags.join(", "));
  const [websiteUrl, setWebsiteUrl] = useState(client.website_url ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const rows = [0, 1, 2];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || client.name,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        website_url: websiteUrl.trim() || null,
      }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    setConfirmDelete(false);
    setDeleting(true);
    await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    setDeleting(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="relative group h-full">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setEditing((v) => !v);
        }}
        className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center bg-paper-raised border border-line opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Klantgegevens bewerken"
      >
        <span className="text-sm leading-none">⋮</span>
      </button>

      {editing && (
        <div className="absolute inset-0 z-20 bg-paper-raised border border-ink p-4">
          <form onSubmit={handleSave} className="flex flex-col gap-2 h-full">
            <label className="text-xs uppercase tracking-wide text-ink-faint">Naam</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-sm border border-line bg-paper-sunken px-2 py-1 outline-none focus:border-accent"
            />
            <label className="text-xs uppercase tracking-wide text-ink-faint">
              Skills (komma-gescheiden)
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="text-sm border border-line bg-paper-sunken px-2 py-1 outline-none focus:border-accent"
            />
            <label className="text-xs uppercase tracking-wide text-ink-faint">Website</label>
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://…"
              className="text-sm border border-line bg-paper-sunken px-2 py-1 outline-none focus:border-accent"
            />
            <div className="mt-auto flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="border-2 border-ink bg-ink text-paper font-semibold text-sm px-3 py-1.5 disabled:opacity-50"
              >
                {saving ? "Bezig…" : "Opslaan"}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditing(false);
                }}
                className="border border-line text-sm px-3 py-1.5"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                disabled={deleting}
                className="ml-auto border border-accent text-accent text-sm px-3 py-1.5 disabled:opacity-50"
              >
                {deleting ? "Bezig…" : "Verwijder klant"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        message={`Weet je zeker dat je "${client.name}" wilt verwijderen? Alle feedbackmomenten van deze klant worden dan ook verwijderd.`}
        confirmLabel="Verwijderen"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <Link
        href={`/klant/${client.id}`}
        className="h-full flex flex-col border border-line bg-paper-raised hover:border-ink transition-colors"
      >
        <div className="flex-1 min-h-48 flex flex-col divide-y divide-line">
          {rows.map((i) => {
            const m = recentMoments[i];
            return (
              <div
                key={i}
                className="flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-paper-sunken/40 px-4"
              >
                {m && (
                  <div className="w-full flex items-baseline justify-between gap-3">
                    <span className="truncate">{m.title}</span>
                    <span className="text-xs text-ink-faint whitespace-nowrap">
                      {new Date(m.date).toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="p-3 flex flex-wrap gap-2">
          {client.tags.map((tag) => (
            <span key={tag} className="bg-ink text-paper text-xs px-2 py-1">
              {tag}
            </span>
          ))}
        </div>
        <div className="px-3 pb-3 flex items-baseline justify-between">
          <span className="text-lg">{client.name}</span>
          <span className="text-xs text-ink-faint text-right">
            Laatst geupdate:
            <br />
            {new Date(client.last_updated).toLocaleDateString("nl-NL")}
          </span>
        </div>
      </Link>
    </div>
  );
}
