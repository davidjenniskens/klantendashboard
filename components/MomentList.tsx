"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FeedbackMoment } from "@/lib/types";
import ConfirmDialog from "./ConfirmDialog";

export default function MomentList({
  clientId,
  moments,
}: {
  clientId: string;
  moments: FeedbackMoment[];
}) {
  const router = useRouter();
  const [sort, setSort] = useState<"recent" | "oldest" | "title">("recent");
  const [pendingDelete, setPendingDelete] = useState<FeedbackMoment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sorted = [...moments].sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return sort === "recent" ? db - da : da - db;
  });

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    await fetch(`/api/moments/${pendingDelete.id}`, { method: "DELETE" });
    setDeleting(false);
    setPendingDelete(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="text-xs border border-line bg-paper-raised px-3 py-2 outline-none"
        >
          <option value="recent">Meest recent</option>
          <option value="oldest">Oudst eerst</option>
          <option value="title">Op titel</option>
        </select>
      </div>

      <div className="flex flex-col gap-3">
        {sorted.map((m) => (
          <div
            key={m.id}
            className="border border-line bg-paper-raised px-6 py-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-baseline gap-4 min-w-0">
              <span className="text-[10px] uppercase tracking-wide border border-line px-1.5 py-0.5 shrink-0">
                {m.type === "update" ? "Update" : "Feedback"}
              </span>
              <Link href={`/klant/${clientId}/moment/${m.id}`} className="text-lg truncate hover:underline">
                {m.title}
              </Link>
              <span className="text-sm text-ink-faint whitespace-nowrap">
                {new Date(m.date).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/klant/${clientId}/moment/${m.id}?view=preview`}
                className="text-xs border border-line px-3 py-2 whitespace-nowrap hover:border-ink"
              >
                Zie preview
              </Link>
              <button
                type="button"
                onClick={() => setPendingDelete(m)}
                className="w-9 h-9 flex items-center justify-center border border-line text-accent hover:border-accent"
                aria-label={`Verwijder ${m.title}`}
              >
                🗑
              </button>
            </div>
          </div>
        ))}
        {!sorted.length && <p className="text-sm text-ink-faint">Nog geen feedbackmomenten.</p>}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        message={`Weet je zeker dat je "${pendingDelete?.title}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`}
        confirmLabel={deleting ? "Bezig…" : "Verwijderen"}
        danger
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
