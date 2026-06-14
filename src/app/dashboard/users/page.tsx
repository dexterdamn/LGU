"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ConfirmReasonModal } from "@/components/ConfirmReasonModal";
import { formatDate } from "@/lib/utils";
import { Check, X, Loader2, Users, Shield, AlertCircle, Trash2 } from "lucide-react";

interface PendingUser {
  id: string;
  email: string;
  name: string;
  nickname?: string;
  officeAgency: string;
  sex: string;
  status: string;
  createdAt: string;
  _count: { dataTables: number };
}

export default function UserManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<{
    userId: string;
    action: "approve" | "reject" | "disable" | "enable" | "delete";
    name: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = () =>
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []));

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || d.user.role !== "ADMIN") {
          router.push("/dashboard");
          return;
        }
        return loadUsers();
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleAction = async (reason: string) => {
    if (!pendingAction) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: pendingAction.userId,
          action: pendingAction.action,
          reason,
        }),
      });
      if (res.ok) {
        await loadUsers();
        setPendingAction(null);
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const pending = users.filter((u) => u.status === "PENDING_APPROVAL");
  const active = users.filter((u) => u.status === "ACTIVE");
  const disabled = users.filter((u) => u.status === "DISABLED");
  const rejected = users.filter((u) => u.status === "REJECTED");

  return (
    <div className="page-shell">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-muted">Approve or reject data encoder registrations</p>
          </div>
        </div>

        {pending.length > 0 && (
          <div className="card mb-8">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-950/20">
              <h2 className="font-semibold text-yellow-800 dark:text-yellow-300">
                Pending Approval ({pending.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {pending.map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{u.nickname || u.name}</p>
                    <p className="text-sm text-muted">{u.email} · {u.officeAgency}</p>
                    <p className="text-xs text-muted">Registered {formatDate(u.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPendingAction({ userId: u.id, action: "approve", name: u.nickname || u.name })}
                      className="btn-primary text-sm"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => setPendingAction({ userId: u.id, action: "reject", name: u.nickname || u.name })}
                      className="btn-danger text-sm"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card mb-8">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold">Active Encoders ({active.length})</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {active.length ? active.map((u) => (
              <div key={u.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{u.nickname || u.name}</p>
                  <p className="text-sm text-muted">{u.email} · {u.officeAgency} · {u._count.dataTables} tables</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPendingAction({ userId: u.id, action: "disable", name: u.nickname || u.name })}
                    className="btn-secondary text-xs px-2 py-1"
                    title="Disable this user"
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Disable
                  </button>
                  <button
                    onClick={() => setPendingAction({ userId: u.id, action: "delete", name: u.nickname || u.name })}
                    className="btn-danger text-xs px-2 py-1"
                    title="Delete user and transfer tables"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            )) : (
              <p className="p-4 text-muted text-sm">No active encoders</p>
            )}
          </div>
        </div>

        {disabled.length > 0 && (
          <div className="card mb-8">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-orange-50 dark:bg-orange-950/20">
              <h2 className="font-semibold text-orange-800 dark:text-orange-300">
                Disabled Users ({disabled.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {disabled.map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium opacity-75">{u.nickname || u.name}</p>
                    <p className="text-sm text-muted">{u.email} · {u.officeAgency}</p>
                  </div>
                  <button
                    onClick={() => setPendingAction({ userId: u.id, action: "enable", name: u.nickname || u.name })}
                    className="btn-primary text-xs px-2 py-1"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Re-enable
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {rejected.length > 0 && (
          <div className="card">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-muted">Rejected ({rejected.length})</h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {rejected.map((u) => (
                <div key={u.id} className="p-4 opacity-60">
                  <p className="font-medium">{u.nickname || u.name}</p>
                  <p className="text-sm text-muted">{u.email}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmReasonModal
        open={!!pendingAction}
        title={
          pendingAction?.action === "approve"
            ? "Approve User"
            : pendingAction?.action === "reject"
            ? "Reject User"
            : pendingAction?.action === "disable"
            ? "Disable User"
            : pendingAction?.action === "delete"
            ? "Delete User"
            : "Re-enable User"
        }
        message={
          pendingAction?.action === "approve"
            ? `Approve registration for ${pendingAction?.name}?`
            : pendingAction?.action === "reject"
            ? `Reject registration for ${pendingAction?.name}?`
            : pendingAction?.action === "disable"
            ? `Disable ${pendingAction?.name}? They will not be able to login and will see a message to contact you.`
            : pendingAction?.action === "delete"
            ? `Delete ${pendingAction?.name}? Their data tables will be transferred to you and marked as "Managed by Admin".`
            : `Re-enable ${pendingAction?.name}? They will be able to login again.`
        }
        confirmLabel={
          pendingAction?.action === "approve"
            ? "Approve"
            : pendingAction?.action === "reject"
            ? "Reject"
            : pendingAction?.action === "disable"
            ? "Disable"
            : pendingAction?.action === "delete"
            ? "Delete"
            : "Re-enable"
        }
        variant={pendingAction?.action === "delete" || pendingAction?.action === "reject" ? "danger" : "primary"}
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setPendingAction(null)}
        requireReason={["disable", "delete", "reject"].includes(pendingAction?.action || "")}
      />
    </div>
  );
}
