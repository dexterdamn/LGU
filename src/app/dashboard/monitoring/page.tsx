"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { formatDate } from "@/lib/utils";
import { Activity, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  level: "INFO" | "WARNING" | "DANGER";
  userEmail: string | null;
  userName: string | null;
  ipAddress: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const LEVEL_CLASS: Record<string, string> = {
  INFO: "audit-info",
  WARNING: "audit-warning",
  DANGER: "audit-danger",
};

const ACTION_LABELS: Record<string, string> = {
  REGISTER: "Registration",
  LOGIN: "Login",
  LOGIN_FAILED: "Failed Login",
  LOGOUT: "Logout",
  TABLE_CREATE: "Table Created",
  TABLE_UPDATE: "Table Updated",
  TABLE_DELETE: "Table Deleted",
  TABLE_RESTORE: "Table Restored",
  TABLE_PURGE: "Table Purged",
  USER_APPROVE: "User Approved",
  USER_REJECT: "User Rejected",
  PASSWORD_RESET_REQUEST: "Password Reset Requested",
  PASSWORD_RESET_COMPLETE: "Password Reset Complete",
  PASSWORD_RESET_LIMIT: "Password Reset Limit Reached",
};

export default function MonitoringPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || d.user.role !== "ADMIN") {
          router.push("/dashboard");
          return;
        }
        const params = levelFilter ? `?level=${levelFilter}` : "";
        return fetch(`/api/admin/monitoring${params}`);
      })
      .then((r) => r?.json())
      .then((d) => {
        if (d) setLogs(d.logs || []);
      })
      .finally(() => setLoading(false));
  }, [router, levelFilter]);

  if (loading) {
    return (
      <div className="page-shell flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold">Monitoring</h1>
              <p className="text-muted">Audit trail of all system actions</p>
            </div>
          </div>
          <select className="input w-auto" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="">All Levels</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="DANGER">Danger</option>
          </select>
        </div>

        <div className="space-y-3">
          {logs.length ? logs.map((log) => (
            <div key={log.id} className={cn("card p-4", LEVEL_CLASS[log.level])}>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="font-medium">{ACTION_LABELS[log.action] || log.action}</p>
                  <p className="text-sm text-muted mt-1">
                    {log.userName || log.userEmail || "System"} · {log.ipAddress || "unknown IP"}
                  </p>
                  {log.reason && (
                    <p className="text-sm mt-2 italic">&quot;{log.reason}&quot;</p>
                  )}
                </div>
                <span className="text-xs text-muted whitespace-nowrap">
                  {formatDate(log.createdAt)} {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          )) : (
            <div className="card p-12 text-center text-muted">No audit logs yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
