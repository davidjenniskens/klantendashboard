"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedbackMoment } from "@/lib/types";
import ConfirmDialog from "./ConfirmDialog";

interface ImgEntry {
  url: string;
  file?: File;
}

export default function UpdateEmbed({
  moment,
  clientId,
  clientName,
  initialView = "edit",
}: {
  moment: FeedbackMoment | null;
  clientId: string;
  clientName: string;
  initialView?: "edit" | "preview";
}) {
  const router = useRouter();
  const [momentId, setMomentId] = useState<string | null>(moment?.id ?? null);
  const [viewMode, setViewMode] = useState<"edit" | "preview">(moment ? initialView : "edit");
  const [title, setTitle] = useState(moment?.title ?? "");
  const [bodyText, setBodyText] = useState(moment?.body_text ?? "");
  const [reflection, setReflection] = useState(moment?.reflection_text ?? "");
  const [reflectionOpen, setReflectionOpen] = useState(!!moment?.reflection_text);
  const [entries, setEntries] = useState<ImgEntry[]>(
    (moment?.original_images ?? []).map((url) => ({ url }))
  );
  const [saving, setSaving] = useState(false);
  const [confirmBack, setConfirmBack] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;

    if (!momentId) {
      // Nothing is saved yet — keep new screenshots as local previews only.
      setEntries((prev) => [...prev, ...list.map((file) => ({ url: URL.createObjectURL(file), file }))]);
      return;
    }

    for (const file of list) {
      const form = new FormData();
      form.append("file", file);
      form.append("moment_id", momentId);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) continue;
      const { url } = await res.json();
      setEntries((prev) => [...prev, { url }]);
    }
  }

  function removeImage(idx: number) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  async function ensureMomentId(): Promise<string> {
    if (momentId) return momentId;
    const res = await fetch("/api/moments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        type: "update",
        title: title.trim() || "Nieuwe update",
      }),
    });
    const { moment: created } = await res.json();
    setMomentId(created.id);
    return created.id as string;
  }

  async function saveNow() {
    const id = await ensureMomentId();

    const resolved: string[] = [];
    for (const entry of entries) {
      if (entry.file) {
        const form = new FormData();
        form.append("file", entry.file);
        form.append("moment_id", id);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        if (res.ok) {
          const { url } = await res.json();
          resolved.push(url);
        }
      } else {
        resolved.push(entry.url);
      }
    }
    setEntries(resolved.map((url) => ({ url })));

    await fetch(`/api/moments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim() || "Nieuwe update",
        body_text: bodyText,
        original_images: resolved,
        reflection_text: reflection,
      }),
    });
  }

  async function handleSaveAndLeave() {
    setSaving(true);
    await saveNow();
    router.push(`/klant/${clientId}`);
  }

  function handleBackWithoutSaving() {
    setConfirmBack(false);
    router.push(`/klant/${clientId}`);
  }

  if (viewMode === "preview") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
        <header className="flex items-center justify-between border-b-2 border-ink pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs bg-ink text-paper px-2 py-1 -rotate-2 inline-block shrink-0">
              UPDATE
            </span>
            <h1 className="text-xl truncate">{title || "Nieuwe update"}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push(`/klant/${clientId}`)}
              className="border border-line text-sm px-4 py-2"
            >
              Terug naar klant
            </button>
            <button
              onClick={() => setViewMode("edit")}
              className="border-2 border-ink bg-ink text-paper font-semibold text-sm px-4 py-2"
            >
              Bewerken
            </button>
          </div>
        </header>

        <div className="border border-line bg-paper-raised p-6 flex flex-col gap-6">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-2xl">{title || "Nieuwe update"}</span>
            <span className="text-sm text-ink-faint whitespace-nowrap">
              {new Date(moment?.date ?? Date.now()).toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          {bodyText && <p className="whitespace-pre-wrap leading-relaxed">{bodyText}</p>}

          {entries.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {entries.map((entry, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={entry.url + i}
                  src={entry.url}
                  alt=""
                  className="w-full border border-line bg-paper-sunken object-contain"
                />
              ))}
            </div>
          )}

          {reflection && (
            <div className="border-t border-line pt-4 flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-ink-faint">Reflectie</span>
              <p className="whitespace-pre-wrap leading-relaxed">{reflection}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
      <header className="flex items-center justify-between border-b-2 border-ink pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs bg-ink text-paper px-2 py-1 -rotate-2 inline-block shrink-0">
            UPDATE
          </span>
          <h1 className="text-xl truncate">{clientName}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setConfirmBack(true)}
            className="border border-line text-sm px-4 py-2"
          >
            Terug
          </button>
          {momentId && (
            <button
              onClick={() => setViewMode("preview")}
              className="border border-line text-sm px-4 py-2"
            >
              Zie preview
            </button>
          )}
          <button
            onClick={handleSaveAndLeave}
            disabled={saving}
            className="border-2 border-ink bg-ink text-paper font-semibold text-sm px-4 py-2 disabled:opacity-50"
          >
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-wide text-ink-faint">Titel</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Waar heb je aan gewerkt?"
          className="text-lg border border-line bg-paper-sunken px-3 py-2 outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-wide text-ink-faint">Wat wil je vertellen?</label>
        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          placeholder="Vertel hier waar je aan gewerkt hebt…"
          className="text-sm border border-line bg-paper-sunken px-3 py-2 min-h-[280px] outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-wide text-ink-faint">
          Screenshot(s) — optioneel
        </label>
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`border-2 border-dashed border-line min-h-[120px] cursor-pointer flex flex-wrap items-center justify-center gap-2 p-3 ${
            dragOver ? "border-accent bg-paper-sunken" : "bg-paper-sunken"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          {entries.length === 0 && (
            <p className="text-xs text-ink-faint text-center pointer-events-none">
              Sleep screenshot(s) hierheen
              <br />
              of klik om te uploaden
            </p>
          )}
          {entries.map((entry, i) => (
            <div key={entry.url + i} className="relative w-20 h-20 border border-line bg-paper-raised">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={entry.url} alt="" className="w-full h-full object-contain" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(i);
                }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-ink text-paper text-[9px]"
                aria-label="Verwijder"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-line bg-paper-sunken p-3">
        <button
          type="button"
          onClick={() => setReflectionOpen((v) => !v)}
          className="border border-line bg-paper-sunken px-3 py-2 text-sm"
        >
          {reflectionOpen ? "− Reflectie verbergen" : "+ Reflectie toevoegen"}
        </button>
        {reflectionOpen && (
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Wat neem je hieruit mee?"
            className="font-mono text-sm bg-paper-sunken border border-line px-3 py-2 w-full mt-3 min-h-[110px] outline-none focus:border-accent"
          />
        )}
      </div>

      <ConfirmDialog
        open={confirmBack}
        message="Weet je zeker dat je terug wilt? Je update wordt dan niet opgeslagen."
        confirmLabel="Terug zonder opslaan"
        danger
        onConfirm={handleBackWithoutSaving}
        onCancel={() => setConfirmBack(false)}
      />
    </div>
  );
}
