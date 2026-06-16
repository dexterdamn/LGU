"use client";

import { Loader2 } from "lucide-react";

import { useMemo, useState } from "react";

interface ConfirmReasonModalProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  variant?: "danger" | "warning" | "primary";
  loading?: boolean;
  onConfirm: (reason: string) => void;
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
  const [reason, setReason] = useState("");

  const btnClass =
    variant === "danger"
      ? "btn-danger"
      : variant === "warning"
        ? "btn bg-orange-600 text-white hover:bg-orange-700"
        : "btn-primary";

  const trimmed = useMemo(() => reason.trim(), [reason]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative card p-6 w-80 max-w-md shadow-xl">
        <h3 className="text-lg font-semibold mb-2 text-center">{title}</h3>
        {message && <p className="text-sm text-muted mb-4 text-center">{message}</p>}

        <label className="block mb-4">
          <span className="text-sm text-muted">Reason</span>
          <input
            className="input input-bordered w-full mt-1"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason"
            disabled={loading}
          />
        </label>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary flex-1"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(trimmed)}
            className={`${btnClass} flex-1 flex items-center justify-center gap-2`}
            disabled={loading || trimmed.length === 0}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
