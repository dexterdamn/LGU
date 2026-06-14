"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ConfirmReasonModal } from "@/components/ConfirmReasonModal";
import {
  DataTableFilters,
  DataTableListRow,
  useDataTableFilters,
  useFilterOptionsFromApi,
  type DataTableListItem,
} from "@/components/DataTableFilters";
import { formatDate } from "@/lib/utils";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";

interface TrashTable extends DataTableListItem {
  deletedAt?: string | null;
  deleteReason?: string | null;
  expiresAt?: string | null;
  deletedBy?: { nickname?: string | null; name: string } | null;
}

export default function TrashPage() {
  const router = useRouter();
  const [tables, setTables] = useState<TrashTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [userRole, setUserRole] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<TrashTable | null>(null);
  const [restoring, setRestoring] = useState(false);
  const apiOptions = useFilterOptionsFromApi();

  const {
    search, setSearch,
    authorId, setAuthorId,
    sector, setSector,
    subcategory, setSubcategory,
    tag, setTag,
    options,
    filtered,
  } = useDataTableFilters(tables);

  const mergedOptions = {
    authors: apiOptions.authors.length ? apiOptions.authors : options.authors,
    sectors: apiOptions.sectors.length ? apiOptions.sectors : options.sectors,
    subcategories: apiOptions.subcategories.length ? apiOptions.subcategories : options.subcategories,
    tags: apiOptions.tags.length ? apiOptions.tags : options.tags,
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          router.push("/login");
          return;
        }
        setUserId(d.user.id);
        setUserRole(d.user.role);
        return fetch("/api/data/trash");
      })
      .then((r) => r?.json())
      .then((d) => {
        if (d) setTables(d.tables || []);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const canRestore = (table: TrashTable) =>
    userRole === "ADMIN" || table.author.id === userId;

  const handleRestore = async (reason: string) => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      const res = await fetch("/api/data/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: restoreTarget.id, reason }),
      });
      if (res.ok) {
        setTables(tables.filter((t) => t.id !== restoreTarget.id));
        setRestoreTarget(null);
      }
    } finally {
      setRestoring(false);
    }
  };

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
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trash2 className="w-7 h-7 text-red-500" />
            Trash
          </h1>
          <p className="text-muted">Deleted tables are kept for 15 days before permanent removal.</p>
        </div>

        <DataTableFilters
          search={search}
          onSearchChange={setSearch}
          authorId={authorId}
          onAuthorChange={setAuthorId}
          sector={sector}
          onSectorChange={setSector}
          subcategory={subcategory}
          onSubcategoryChange={setSubcategory}
          tag={tag}
          onTagChange={setTag}
          options={mergedOptions}
        />

        {filtered.length ? (
          <div className="card divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.map((t) => (
              <div key={t.id}>
                <Link href={`/data/${t.id}`} className="block">
                  <DataTableListRow
                    table={t}
                    actions={
                      canRestore(t) ? (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setRestoreTarget(t as TrashTable);
                          }}
                          className="btn-secondary text-xs"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Restore
                        </button>
                      ) : undefined
                    }
                  />
                </Link>
                <div className="px-4 pb-3 text-xs text-muted">
                  Deleted {t.deletedAt ? formatDate(t.deletedAt) : "—"}
                  {(t as TrashTable).expiresAt && ` · Expires ${formatDate((t as TrashTable).expiresAt!)}`}
                  {(t as TrashTable).deleteReason && ` · Reason: ${(t as TrashTable).deleteReason}`}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center text-muted">
            <Trash2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Trash is empty</p>
          </div>
        )}
      </div>

      <ConfirmReasonModal
        open={!!restoreTarget}
        title="Restore Table"
        message={`Restore "${restoreTarget?.title}" to the data entry list?`}
        confirmLabel="Restore"
        variant="primary"
        loading={restoring}
        onConfirm={handleRestore}
        onCancel={() => setRestoreTarget(null)}
      />
    </div>
  );
}
