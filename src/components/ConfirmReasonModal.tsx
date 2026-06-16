"use client";

import { Loader2 } from "lucide-react";

interface ConfirmReasonModalProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  variant?: "danger" | "warning" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmReasonModal({
  open,
  title,
  message = "",
  confirmLabel = "Confirm",
  variant = "primary",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmReasonModalProps) {
  if (!open) return null;

  const btnClass =
    variant === "danger"
      ? "btn-danger"
      : variant === "warning"
        ? "btn bg-orange-600 text-white hover:bg-orange-700"
        : "btn-primary";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative card p-6 w-80 max-w-md shadow-xl">
        <h3 className="text-lg font-semibold mb-2 text-center">{title}</h3>
        {message && <p className="text-sm text-muted mb-6 text-center">{message}</p>}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onCancel} className="btn-secondary flex-1" disabled={loading}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={`${btnClass} flex-1 flex items-center justify-center gap-2`} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
