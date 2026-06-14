"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { formatSectorLabel } from "@/lib/categorization";
import { getAuthorDisplayName } from "@/lib/display-name";
import { formatDate } from "@/lib/utils";
import {
  Database,
  FileSpreadsheet,
  Plus,
  TrendingUp,
  Tag,
  Loader2,
  Users,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface Stats {
  totalTables: number;
  totalRows: number;
  myTables: number;
  sectorCounts: { sector: string; count: number }[];
  recentTables: {
    id: string;
    title: string;
    sector: string;
    updatedAt: string;
    author: { name: string; nickname?: string | null };
    _count: { rows: number };
  }[];
}

interface AdminStats {
  users: {
    total: number;
    active: number;
    disabled: number;
    pending: number;
    admins: number;
    encoders: number;
  };
  tables: {
    total: number;
    trashed: number;
    recentlyAdded: number;
  };
  analytics: {
    avgTablesPerUser: string;
    recentUsers: number;
    tablesBySector: { sector: string; count: number }[];
  };
}

interface User {
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          router.push("/login");
          return;
        }
        setUser(d.user);
        
        // Fetch general stats
        return Promise.all([
          fetch("/api/data/stats"),
          d.user.role === "ADMIN" ? fetch("/api/admin/stats") : Promise.resolve(null),
        ]);
      })
      .then((results) => {
        if (results) {
          return Promise.all([
            results[0]?.json(),
            results[1]?.json(),
          ]);
        }
        return [null, null];
      })
      .then(([statsData, adminStatsData]) => {
        if (statsData) setStats(statsData.stats);
        if (adminStatsData) setAdminStats(adminStatsData);
      })
      .finally(() => setLoading(false));
  }, [router]);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted">
              {user?.role === "ADMIN" 
                ? "System Overview" 
                : "Overview of your data entry activity"}
            </p>
          </div>
          <Link href="/data/new" className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            New Data Table
          </Link>
        </div>

        {/* Admin Statistics */}
        {adminStats && (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted">Registered Users</p>
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-3xl font-bold">{adminStats.users.total}</p>
                <p className="text-xs text-muted mt-2">
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  {adminStats.users.active} Active ·
                  <AlertCircle className="w-3 h-3 inline ml-2 mr-1" />
                  {adminStats.users.disabled} Disabled
                </p>
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted">Data Tables</p>
                  <Database className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold">{adminStats.tables.total}</p>
                <p className="text-xs text-muted mt-2">
                  {adminStats.tables.recentlyAdded} added this week · {adminStats.tables.trashed} in trash
                </p>
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted">Avg Tables/User</p>
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-3xl font-bold">{adminStats.analytics.avgTablesPerUser}</p>
                <p className="text-xs text-muted mt-2">
                  {adminStats.analytics.recentUsers} new users this week
                </p>
              </div>
            </div>

            {/* User Breakdown */}
            <div className="card mb-8">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-lg">User Distribution</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Active</span>
                      <span className="text-sm text-muted">{adminStats.users.active}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${(adminStats.users.active / adminStats.users.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Pending Approval</span>
                      <span className="text-sm text-muted">{adminStats.users.pending}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{
                          width: `${(adminStats.users.pending / adminStats.users.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Disabled</span>
                      <span className="text-sm text-muted">{adminStats.users.disabled}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{
                          width: `${(adminStats.users.disabled / adminStats.users.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tables by Sector */}
            {adminStats.analytics.tablesBySector.length > 0 && (
              <div className="card mb-8">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="font-semibold text-lg">Top Sectors</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {adminStats.analytics.tablesBySector.map((sector) => {
                      const maxCount = Math.max(...adminStats.analytics.tablesBySector.map((s) => s.count));
                      return (
                        <div key={sector.sector}>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">{formatSectorLabel(sector.sector)}</span>
                            <span className="text-sm text-muted">{sector.count} tables</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-primary-500 h-2 rounded-full"
                              style={{
                                width: `${(sector.count / maxCount) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Regular User Statistics */}
          {[
            { label: "Total Tables", value: stats?.totalTables ?? 0, icon: Database },
            { label: "Total Rows", value: stats?.totalRows ?? 0, icon: FileSpreadsheet },
            { label: "My Tables", value: stats?.myTables ?? 0, icon: TrendingUp },
            { label: "Categories", value: stats?.sectorCounts.length ?? 0, icon: Tag },
          ].map((s) => (
            <div key={s.label} className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">{s.label}</p>
                  <p className="text-3xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className="w-8 h-8 text-primary-200 dark:text-primary-800" />
              </div>
            </div>
          ))}
        </div>

        <div className="card p-6 mb-8">
          <h2 className="font-semibold text-lg mb-4">By Category</h2>
          {stats?.sectorCounts.length ? (
            <div className="space-y-3">
              {stats.sectorCounts.map((s) => (
                <div key={s.sector} className="flex items-center justify-between">
                  <span className="text-sm">{formatSectorLabel(s.sector)}</span>
                  <span className="bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-3 py-1 rounded-full text-sm font-medium">
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">No data yet</p>
          )}
        </div>

        <div className="card">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-lg">Recent Data Tables</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {stats?.recentTables.length ? (
              stats.recentTables.map((t) => (
                <Link
                  key={t.id}
                  href={`/data/${t.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <p className="text-sm text-muted">
                      {getAuthorDisplayName(t.author)} · {formatSectorLabel(t.sector)} · {t._count.rows} rows
                    </p>
                  </div>
                  <span className="text-xs text-muted">{formatDate(t.updatedAt)}</span>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-muted">
                <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No data tables yet. Create your first one!</p>
                <Link href="/data/new" className="btn-primary mt-4 inline-block">
                  Create Data Table
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
