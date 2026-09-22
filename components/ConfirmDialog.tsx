"use client";

export default function ConfirmDialog({
  open,
  message,
  confirmLabel = "Ja",
  cancelLabel = "Annuleren",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-[100]"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-paper-raised border border-ink p-5 max-w-sm w-full flex flex-col gap-4">
        <p className="text-sm">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="border border-line text-sm px-3 py-1.5"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`border-2 font-semibold text-sm px-3 py-1.5 ${
              danger
                ? "border-accent bg-accent text-paper"
                : "border-ink bg-ink text-paper"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
