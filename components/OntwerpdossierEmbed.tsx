"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedbackMoment } from "@/lib/types";
import ConfirmDialog from "./ConfirmDialog";

interface ImgItem {
  url: string;
  w: number;
  h: number | null;
  file?: File;
}

function esc(s: string) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default function OntwerpdossierEmbed({
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
  const [momentId, setMomentId] = useState<string | null>(moment?.id ?? null);
  const [viewMode, setViewMode] = useState<"edit" | "preview">(moment ? initialView : "edit");
  const staticPreviewHostRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(moment?.title ?? "");
  const [originalImages, setOriginalImages] = useState<ImgItem[]>(
    (moment?.original_images ?? []).map((url) => ({ url, w: 220, h: null }))
  );
  const [newImages, setNewImages] = useState<ImgItem[]>(
    (moment?.new_images ?? []).map((url) => ({ url, w: 220, h: null }))
  );
  const [motivation, setMotivation] = useState(moment?.motivation_original ?? "");
  const [motivationNew, setMotivationNew] = useState(moment?.motivation_new ?? "");
  const [feedback, setFeedback] = useState(moment?.feedback_text ?? "");
  const [reflection, setReflection] = useState(moment?.reflection_text ?? "");
  const [reflectionOpen, setReflectionOpen] = useState(!!moment?.reflection_text);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [savingAndLeaving, setSavingAndLeaving] = useState(false);
  const [confirmBack, setConfirmBack] = useState(false);
  const router = useRouter();

  const previewHostRef = useRef<HTMLDivElement>(null);
  const currentViewScaleRef = useRef(1);
  const originalImagesRef = useRef(originalImages);
  const newImagesRef = useRef(newImages);
  originalImagesRef.current = originalImages;
  newImagesRef.current = newImages;

  async function ensureMomentId(): Promise<string> {
    if (momentId) return momentId;
    const res = await fetch("/api/moments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        type: "feedback",
        title: title.trim() || "Nieuw feedbackmoment",
      }),
    });
    const { moment: created } = await res.json();
    setMomentId(created.id);
    return created.id as string;
  }

  async function uploadPending(id: string, items: ImgItem[]): Promise<ImgItem[]> {
    const resolved: ImgItem[] = [];
    for (const item of items) {
      if (item.file) {
        const form = new FormData();
        form.append("file", item.file);
        form.append("moment_id", id);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        if (res.ok) {
          const { url } = await res.json();
          resolved.push({ url, w: item.w, h: item.h });
        }
      } else {
        resolved.push(item);
      }
    }
    return resolved;
  }

  const saveNow = useCallback(async () => {
    const id = await ensureMomentId();
    const finalOriginal = await uploadPending(id, originalImagesRef.current);
    const finalNew = await uploadPending(id, newImagesRef.current);
    setOriginalImages(finalOriginal);
    setNewImages(finalNew);
    await fetch(`/api/moments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim() || "Nieuw feedbackmoment",
        original_images: finalOriginal.map((i) => i.url),
        motivation_original: motivation,
        feedback_text: feedback,
        new_images: finalNew.map((i) => i.url),
        motivation_new: motivationNew,
        reflection_text: reflection,
      }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momentId, clientId, title, motivation, feedback, motivationNew, reflection]);

  async function handleSaveAndLeave() {
    setSavingAndLeaving(true);
    await saveNow();
    router.push(`/klant/${clientId}`);
  }

  function handleBackWithoutSaving() {
    setConfirmBack(false);
    router.push(`/klant/${clientId}`);
  }

  // --- uploads ---
  async function addFiles(target: "orig" | "new", files: FileList | File[]) {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    const setImages = target === "orig" ? setOriginalImages : setNewImages;

    if (!momentId) {
      // Nothing is saved yet — keep new screenshots as local previews only.
      setImages((prev) => [
        ...prev,
        ...images.map((file) => ({ url: URL.createObjectURL(file), w: 220, h: null, file })),
      ]);
      return;
    }

    for (const file of images) {
      const form = new FormData();
      form.append("file", file);
      form.append("moment_id", momentId);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) continue;
      const { url } = await res.json();
      setImages((prev) => [...prev, { url, w: 220, h: null }]);
    }
  }

  function removeImage(target: "orig" | "new", idx: number) {
    if (target === "orig") setOriginalImages((prev) => prev.filter((_, i) => i !== idx));
    else setNewImages((prev) => prev.filter((_, i) => i !== idx));
  }

  // --- print sheet (shared by preview + export) ---
  function buildFrame(item: ImgItem, resizable: boolean, onResize?: (w: number, h: number) => void) {
    const frame = document.createElement("div");
    frame.className = "p-frame";
    frame.style.position = "relative";
    frame.style.flex = "0 0 auto";
    frame.style.maxWidth = "100%";
    frame.style.width = item.w + "px";
    frame.style.height = item.h ? item.h + "px" : "auto";

    const img = document.createElement("img");
    img.src = item.url;
    img.alt = "";
    img.draggable = false;
    img.style.display = "block";
    img.style.width = "100%";
    img.style.height = item.h ? "100%" : "auto";
    frame.appendChild(img);

    if (resizable) {
      const handle = document.createElement("div");
      Object.assign(handle.style, {
        position: "absolute",
        right: "-7px",
        bottom: "-7px",
        width: "14px",
        height: "14px",
        borderRadius: "50%",
        background: "#b23a2f",
        border: "2px solid #fff",
        boxShadow: "0 1px 3px rgba(0,0,0,.35)",
        cursor: "nwse-resize",
        touchAction: "none",
      } as CSSStyleDeclaration);
      frame.appendChild(handle);

      let dragging = false;
      let startX = 0;
      let startW = 0;
      let startH = 0;
      let ratio = 1;
      let maxW = Infinity;

      handle.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        dragging = true;
        const rect = frame.getBoundingClientRect();
        startX = e.clientX;
        startW = rect.width / currentViewScaleRef.current;
        startH = rect.height / currentViewScaleRef.current;
        ratio = startW / startH;
        maxW = frame.parentElement?.clientWidth || Infinity;
        handle.setPointerCapture(e.pointerId);
      });
      handle.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const dx = (e.clientX - startX) / currentViewScaleRef.current;
        const newW = Math.min(maxW, Math.max(40, startW + dx));
        const newH = newW / ratio;
        frame.style.width = newW + "px";
        frame.style.height = newH + "px";
        img.style.height = "100%";
        onResize?.(newW, newH);
      });
      ["pointerup", "pointercancel"].forEach((evt) =>
        handle.addEventListener(evt, () => {
          dragging = false;
        })
      );
    }

    return frame;
  }

  function renderFrameRow(
    container: HTMLElement,
    images: ImgItem[],
    resizable: boolean,
    onResize: (idx: number, w: number, h: number) => void
  ) {
    container.innerHTML = "";
    if (!images.length) {
      const empty = document.createElement("div");
      empty.className = "p-frame-empty";
      Object.assign(empty.style, {
        width: "100%",
        height: "150px",
        border: "2px dashed #d8dbd5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#a7ada6",
        fontFamily: "'Courier New', monospace",
        fontSize: "14px",
      } as CSSStyleDeclaration);
      empty.textContent = "Geen screenshot toegevoegd";
      container.appendChild(empty);
      return;
    }
    images.forEach((item, idx) => {
      container.appendChild(buildFrame(item, resizable, (w, h) => onResize(idx, w, h)));
    });
  }

  function buildPrintSheet(opts: { visible: boolean; resizable: boolean }) {
    const sheet = document.createElement("div");
    sheet.className = "print-sheet" + (opts.visible ? " in-preview" : "");
    Object.assign(sheet.style, {
      position: opts.visible ? "static" : "fixed",
      left: opts.visible ? "auto" : "-99999px",
      top: "0",
      width: "1587px",
      height: "1123px",
      background: "#ffffff",
      color: "#17201d",
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      padding: "48px 56px",
      display: "flex",
      flexDirection: "column",
      gap: "22px",
    } as CSSStyleDeclaration);

    const dateStr = new Date().toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const headerRight = clientName ? esc(clientName) + " — " + dateStr : dateStr;

    const reflectionHtml = reflection
      ? `<div style="border-top:1px solid #d8dbd5;padding-top:14px"><h3 style="font-family:'Special Elite','Courier New',monospace;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:#57625d;margin:0">Reflectie</h3><div style="font-family:'Courier New',monospace;font-size:15px;line-height:1.55;white-space:pre-wrap;word-break:break-word">${esc(reflection)}</div></div>`
      : "";

    const titleStyle =
      "font-family:'Special Elite','Courier New',monospace;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:#57625d;margin:0";
    const textStyle =
      "font-family:'Courier New',monospace;font-size:15px;line-height:1.55;white-space:pre-wrap;word-break:break-word";

    sheet.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px solid #17201d;padding-bottom:14px">
        <h1 style="font-family:'Special Elite','Courier New',monospace;font-weight:400;font-size:30px;margin:0">Feedbackverwerking</h1>
        <div style="font-family:'Courier New',monospace;font-size:14px;color:#57625d">${headerRight}</div>
      </div>
      <div style="display:grid;grid-template-columns:1.25fr 0.65fr 1.25fr;gap:26px;flex:1;min-height:0">
        <div style="display:flex;flex-direction:column;gap:12px;min-height:0;min-width:0">
          <h3 style="${titleStyle}">01 — Origineel</h3>
          <div data-slot="orig" style="display:flex;flex-wrap:wrap;align-items:flex-start;gap:14px"></div>
          <div style="${textStyle}">${esc(motivation) || "&nbsp;"}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;min-height:0;min-width:0">
          <h3 style="${titleStyle}">02 — Feedback</h3>
          <div style="${textStyle};flex:1;overflow:hidden">${esc(feedback) || "&nbsp;"}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;min-height:0;min-width:0">
          <h3 style="${titleStyle}">03 — Eindresultaat</h3>
          <div data-slot="new" style="display:flex;flex-wrap:wrap;align-items:flex-start;gap:14px"></div>
          <div style="${textStyle}">${esc(motivationNew) || "&nbsp;"}</div>
        </div>
      </div>
      ${reflectionHtml}
      <div style="text-align:center;font-family:'Courier New',monospace;font-size:12px;color:#8a938e;border-top:1px solid #d8dbd5;padding-top:10px">David Jenniskens — 500939455 — Klas 209 — Goldfizh Digital Agency</div>
    `;

    document.body.appendChild(sheet);

    const origSlot = sheet.querySelector<HTMLElement>('[data-slot="orig"]')!;
    const newSlot = sheet.querySelector<HTMLElement>('[data-slot="new"]')!;

    renderFrameRow(origSlot, originalImagesRef.current, opts.resizable, (idx, w, h) => {
      originalImagesRef.current[idx] = { ...originalImagesRef.current[idx], w, h };
    });
    renderFrameRow(newSlot, newImagesRef.current, opts.resizable, (idx, w, h) => {
      newImagesRef.current[idx] = { ...newImagesRef.current[idx], w, h };
    });

    return sheet;
  }

  function waitForImages(root: HTMLElement) {
    const imgs = Array.from(root.querySelectorAll("img"));
    const pending = imgs.filter((img) => !img.complete);
    if (!pending.length) return Promise.resolve();
    return Promise.all(
      pending.map(
        (img) =>
          new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      )
    );
  }

  function commitResizedState() {
    setOriginalImages([...originalImagesRef.current]);
    setNewImages([...newImagesRef.current]);
  }

  async function fitSheetToHost(host: HTMLDivElement, sheet: HTMLDivElement, maxWFrac: number, maxHFrac: number) {
    await waitForImages(sheet);
    const maxW = window.innerWidth * maxWFrac;
    const maxH = window.innerHeight * maxHFrac;
    const scale = Math.min(maxW / 1587, maxH / 1123, 1.4);
    currentViewScaleRef.current = scale;
    sheet.style.transform = `scale(${scale})`;
    sheet.style.transformOrigin = "top left";
    host.style.width = 1587 * scale + "px";
    host.style.height = 1123 * scale + "px";
  }

  async function openPreview() {
    setPreviewOpen(true);
    await new Promise((r) => requestAnimationFrame(r));
    const host = previewHostRef.current;
    if (!host) return;
    host.innerHTML = "";
    const sheet = buildPrintSheet({ visible: true, resizable: true });
    host.appendChild(sheet);
    await fitSheetToHost(host, sheet, 0.94, 0.8);
  }

  function closePreview() {
    commitResizedState();
    setPreviewOpen(false);
    if (previewHostRef.current) previewHostRef.current.innerHTML = "";
  }

  useEffect(() => {
    if (viewMode !== "preview") return;
    let active = true;
    (async () => {
      await new Promise((r) => requestAnimationFrame(r));
      const host = staticPreviewHostRef.current;
      if (!host || !active) return;
      host.innerHTML = "";
      const sheet = buildPrintSheet({ visible: true, resizable: false });
      host.appendChild(sheet);
      await fitSheetToHost(host, sheet, 0.9, 0.78);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, title, originalImages, newImages, motivation, motivationNew, feedback, reflection]);

  async function runExport() {
    if (exporting) return;
    setExporting(true);
    closePreview();
    const sheet = buildPrintSheet({ visible: false, resizable: false });
    try {
      await waitForImages(sheet);
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(sheet, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      document.body.removeChild(sheet);
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.94), "JPEG", 0, 0, 420, 297);
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      pdf.save(`feedbackverwerking-${dd}-${mm}-${now.getFullYear()}.pdf`);
    } catch {
      if (sheet.parentNode) document.body.removeChild(sheet);
      setToast("Er ging iets mis bij het maken van de PDF.");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setExporting(false);
    }
  }

  if (viewMode === "preview") {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6 items-center">
        <header className="w-full flex items-center justify-between border-b-2 border-ink pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-xs bg-ink text-paper px-2 py-1 -rotate-2 inline-block shrink-0">
              DOSSIER
            </span>
            <h1 className="font-display text-xl truncate">{title || "Nieuw feedbackmoment"}</h1>
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
        <div ref={staticPreviewHostRef} className="overflow-hidden" />
        <button
          onClick={runExport}
          disabled={exporting}
          className="border-2 border-ink bg-ink text-paper font-semibold text-sm px-6 py-3 disabled:opacity-50"
        >
          {exporting ? "PDF wordt gemaakt…" : "Exporteer als PDF (A3 liggend)"}
        </button>
        {toast && (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-6 bg-ink text-paper text-sm px-4 py-2 z-50">
            {toast}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
      <header className="flex items-center justify-between border-b-2 border-ink pb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs bg-ink text-paper px-2 py-1 -rotate-2 inline-block">
            DOSSIER
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-xl">Feedbackverwerking — {clientName}</h1>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Naam feedbackmoment"
              className="font-mono text-sm border border-line bg-paper-sunken px-2 py-1 outline-none focus:border-accent max-w-xs"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConfirmBack(true)}
            className="border border-line text-sm px-4 py-2"
          >
            Terug
          </button>
          <button
            onClick={handleSaveAndLeave}
            disabled={savingAndLeaving}
            className="border-2 border-ink text-ink font-semibold text-sm px-4 py-2 disabled:opacity-50"
          >
            {savingAndLeaving ? "Opslaan…" : "Opslaan"}
          </button>
          <button
            onClick={runExport}
            disabled={exporting}
            className="border-2 border-ink bg-ink text-paper font-semibold text-sm px-4 py-2 disabled:opacity-50"
          >
            {exporting ? "PDF wordt gemaakt…" : "Exporteer als PDF (A3 liggend)"}
          </button>
        </div>
      </header>

      <div className="grid gap-4" style={{ gridTemplateColumns: "1.25fr 0.65fr 1.25fr" }}>
        <ImageColumn
          title="01 — Origineel"
          images={originalImages}
          onFiles={(f) => addFiles("orig", f)}
          onRemove={(i) => removeImage("orig", i)}
        >
          <label className="font-display text-xs uppercase tracking-wide text-ink-faint">Motivatie</label>
          <textarea
            className="font-mono text-sm bg-paper-sunken border border-line px-3 py-2 min-h-[110px] outline-none focus:border-accent"
            placeholder="Waarom is dit ontwerp zo gemaakt?"
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
          />
        </ImageColumn>

        <div className="flex flex-col gap-2 border border-line bg-paper-raised p-3">
          <h2 className="font-display text-xs uppercase tracking-wide text-ink-soft">02 — Feedback</h2>
          <textarea
            className="font-mono text-sm bg-paper-sunken border border-line px-3 py-2 min-h-[300px] outline-none focus:border-accent"
            placeholder="Wat moet er beter, en waarom?"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>

        <ImageColumn
          title="03 — Eindresultaat"
          images={newImages}
          onFiles={(f) => addFiles("new", f)}
          onRemove={(i) => removeImage("new", i)}
        >
          <label className="font-display text-xs uppercase tracking-wide text-ink-faint">Motivatie</label>
          <textarea
            className="font-mono text-sm bg-paper-sunken border border-line px-3 py-2 min-h-[110px] outline-none focus:border-accent"
            placeholder="Waarom is dit eindresultaat zo gemaakt?"
            value={motivationNew}
            onChange={(e) => setMotivationNew(e.target.value)}
          />
        </ImageColumn>
      </div>

      <div className="border border-line bg-paper-sunken p-3">
        <button
          className="border border-line bg-paper-sunken px-3 py-2 text-sm"
          onClick={() => setReflectionOpen((v) => !v)}
        >
          {reflectionOpen ? "− Reflectie verbergen" : "+ Reflectie toevoegen"}
        </button>
        {reflectionOpen && (
          <textarea
            className="font-mono text-sm bg-paper-sunken border border-line px-3 py-2 w-full mt-3 min-h-[110px] outline-none focus:border-accent"
            placeholder="Wat neem je hieruit mee?"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
          />
        )}
      </div>

      <button
        onClick={openPreview}
        className="fixed right-5 bottom-5 border-2 border-ink bg-paper-raised font-semibold text-sm px-5 py-3 shadow-lg"
      >
        Zie preview
      </button>

      {previewOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50"
          onClick={(e) => e.target === e.currentTarget && closePreview()}
        >
          <div className="relative bg-paper-raised p-4 max-w-[98vw] max-h-[97vh] overflow-auto flex flex-col items-center gap-3">
            <button
              onClick={closePreview}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-ink text-paper"
              aria-label="Sluiten"
            >
              ✕
            </button>
            <p className="font-mono text-xs text-ink-soft text-center max-w-xl">
              Sleep het rode bolletje rechtsonder aan een screenshot om het in verhouding groter of
              kleiner te maken.
            </p>
            <div ref={previewHostRef} className="overflow-hidden" />
            <div className="w-full flex justify-end">
              <button
                onClick={runExport}
                disabled={exporting}
                className="border-2 border-ink bg-ink text-paper font-semibold text-sm px-4 py-2 disabled:opacity-50"
              >
                Exporteer als PDF (A3 liggend)
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 bg-ink text-paper text-sm px-4 py-2 z-50">
          {toast}
        </div>
      )}

      <ConfirmDialog
        open={confirmBack}
        message="Weet je zeker dat je terug wilt? Je feedbackmoment wordt dan niet opgeslagen."
        confirmLabel="Terug zonder opslaan"
        danger
        onConfirm={handleBackWithoutSaving}
        onCancel={() => setConfirmBack(false)}
      />
    </div>
  );
}

function ImageColumn({
  title,
  images,
  onFiles,
  onRemove,
  children,
}: {
  title: string;
  images: ImgItem[];
  onFiles: (files: FileList) => void;
  onRemove: (idx: number) => void;
  children: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="flex flex-col gap-2 border border-line bg-paper-raised p-3">
      <h2 className="font-display text-xs uppercase tracking-wide text-ink-soft">{title}</h2>
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
          onFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed border-line min-h-[160px] cursor-pointer flex flex-wrap items-center justify-center gap-2 p-3 ${
          dragOver ? "border-accent bg-paper-sunken" : "bg-paper-sunken"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => e.target.files && onFiles(e.target.files)}
        />
        {images.length === 0 && (
          <p className="font-mono text-xs text-ink-faint text-center pointer-events-none">
            Sleep screenshot(s) hierheen
            <br />
            of klik om te uploaden
          </p>
        )}
        {images.map((img, i) => (
          <div key={img.url + i} className="relative w-16 h-16 border border-line bg-paper-raised">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" className="w-full h-full object-contain" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(i);
              }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-ink text-paper text-[9px]"
              aria-label="Verwijder"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}
