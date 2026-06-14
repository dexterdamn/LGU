"use client";

import { Loader2 } from "lucide-react";

interface ConfirmReasonModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "warning" | "primary";
  requireReason?: boolean;
  reasonLabel?: string;
  loading?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function ConfirmReasonModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "primary",
  requireReason = true,
  reasonLabel = "Remarks / Reason",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmReasonModalProps) {
  if (!open) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const reason = String(form.get("reason") || "").trim();
    if (requireReason && !reason) return;
    onConfirm(reason);
  };

  const btnClass =
    variant === "danger"
      ? "btn-danger"
      : variant === "warning"
        ? "btn bg-orange-600 text-white hover:bg-orange-700"
        : "btn-primary";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative card p-6 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted mb-4">{message}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">{reasonLabel}</label>
            <textarea
              name="reason"
              className="input"
              rows={3}
              required={requireReason}
              placeholder="Enter reason for this action..."
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onCancel} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className={btnClass} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
