"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props =
  | { variant: "dashboard" }
  | { variant: "client"; clientId: string };

export default function BigDropzone(props: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"quick" | "manual">("quick");
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualTags, setManualTags] = useState("");
  const [manualWebsite, setManualWebsite] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function ensureClientId(): Promise<string> {
    if (props.variant === "client") return props.clientId;
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nieuwe klant" }),
    });
    if (!res.ok) throw new Error("Kon geen klant aanmaken.");
    const { client } = await res.json();
    return client.id as string;
  }

  async function createMoment(clientId: string, type: "feedback" | "update" = "feedback"): Promise<string> {
    const res = await fetch("/api/moments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, type }),
    });
    if (!res.ok) throw new Error("Kon geen moment aanmaken.");
    const { moment } = await res.json();
    return moment.id as string;
  }

  async function uploadFiles(momentId: string, files: File[]): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      form.append("moment_id", momentId);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) continue;
      const { url } = await res.json();
      urls.push(url);
    }
    return urls;
  }

  async function handleQuickFiles(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setBusy(true);
    setError(null);
    try {
      const clientId = await ensureClientId();
      const momentId = await createMoment(clientId);
      const urls = await uploadFiles(momentId, images);
      if (urls.length) {
        await fetch(`/api/moments/${momentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ original_images: urls }),
        });
      }
      router.push(`/klant/${clientId}/moment/${momentId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Er ging iets mis.");
      setBusy(false);
    }
  }

  // Manual mode never creates a moment row itself — it only navigates to a
  // draft editor. Nothing is written to the database until the user
  // explicitly clicks "Opslaan" there, so cancelling never leaves an orphan
  // record behind.
  async function handleDashboardManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: manualName.trim() || "Nieuwe klant",
          tags: manualTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          website_url: manualWebsite.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Kon geen klant aanmaken.");
      const clientId = (await res.json()).client.id;
      router.push(`/klant/${clientId}/moment/new?type=feedback`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Er ging iets mis.");
      setBusy(false);
    }
  }

  function goToDraft(type: "feedback" | "update") {
    if (props.variant !== "client") return;
    router.push(`/klant/${props.clientId}/moment/new?type=${type}`);
  }

  return (
    <div className="border border-line bg-paper-raised">
      <div className="flex justify-end gap-2 px-3 pt-3">
        <button
          type="button"
          onClick={() => setMode("quick")}
          className={`text-xs font-mono px-2 py-1 border border-line ${mode === "quick" ? "bg-ink text-paper" : ""}`}
        >
          Snel
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`text-xs font-mono px-2 py-1 border border-line ${mode === "manual" ? "bg-ink text-paper" : ""}`}
        >
          Handmatig
        </button>
      </div>

      {mode === "quick" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleQuickFiles(Array.from(e.dataTransfer.files));
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer py-10 px-6 text-center transition-colors ${dragOver ? "bg-paper-sunken" : ""}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => handleQuickFiles(Array.from(e.target.files ?? []))}
          />
          <div className="w-9 h-9 rounded-full bg-ink text-paper flex items-center justify-center mx-auto mb-2 text-xl">
            +
          </div>
          <p className="font-mono text-sm text-ink-faint">
            {busy
              ? "Bezig met aanmaken…"
              : props.variant === "dashboard"
                ? "Sleep screenshot(s) hierheen voor een nieuwe klant"
                : "Sleep screenshot(s) hierheen voor een nieuw feedbackmoment"}
          </p>
        </div>
      ) : props.variant === "dashboard" ? (
        <form
          onSubmit={handleDashboardManualSubmit}
          className="p-6 grid grid-cols-2 gap-3 max-w-lg mx-auto"
        >
          <input
            placeholder="Naam klant"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            className="border border-line bg-paper-sunken px-3 py-2 outline-none focus:border-accent"
          />
          <input
            placeholder="Tags (komma-gescheiden)"
            value={manualTags}
            onChange={(e) => setManualTags(e.target.value)}
            className="border border-line bg-paper-sunken px-3 py-2 outline-none focus:border-accent"
          />
          <input
            placeholder="Website (https://…)"
            value={manualWebsite}
            onChange={(e) => setManualWebsite(e.target.value)}
            className="border border-line bg-paper-sunken px-3 py-2 outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy}
            className="border-2 border-ink bg-ink text-paper font-semibold py-2 disabled:opacity-50"
          >
            {busy ? "Bezig…" : "Aanmaken"}
          </button>
        </form>
      ) : (
        <div className="p-6 flex gap-2 max-w-sm mx-auto">
          <button
            type="button"
            onClick={() => goToDraft("feedback")}
            className="flex-1 text-sm px-3 py-2 border border-line"
          >
            Feedbackmoment
          </button>
          <button
            type="button"
            onClick={() => goToDraft("update")}
            className="flex-1 text-sm px-3 py-2 border border-line"
          >
            Update
          </button>
        </div>
      )}
      {error && <p className="font-mono text-xs text-accent px-3 pb-3">{error}</p>}
    </div>
  );
}
