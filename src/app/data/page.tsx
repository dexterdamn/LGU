// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { Navbar } from "@/components/Navbar";
// import { ConfirmReasonModal } from "@/components/ConfirmReasonModal";
// import {
//   DataTableFilters,
//   DataTableListRow,
//   useDataTableFilters,
//   useFilterOptionsFromApi,
//   type DataTableListItem,
// } from "@/components/DataTableFilters";
// import { Plus, Loader2, Trash2 } from "lucide-react";

// export default function DataListPage() {
//   const router = useRouter();
//   const [tables, setTables] = useState<DataTableListItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [userId, setUserId] = useState("");
//   const [userRole, setUserRole] = useState("");
//   const [deleteTarget, setDeleteTarget] = useState<DataTableListItem | null>(null);
//   const [deleting, setDeleting] = useState(false);
//   const apiOptions = useFilterOptionsFromApi();

//   const {
//     search, setSearch,
//     authorId, setAuthorId,
//     sector, setSector,
//     subcategory, setSubcategory,
//     tag, setTag,
//     options,
//     filtered,
//   } = useDataTableFilters(tables);

//   const mergedOptions = {
//     authors: apiOptions.authors.length ? apiOptions.authors : options.authors,
//     sectors: apiOptions.sectors.length ? apiOptions.sectors : options.sectors,
//     subcategories: apiOptions.subcategories.length ? apiOptions.subcategories : options.subcategories,
//     tags: apiOptions.tags.length ? apiOptions.tags : options.tags,
//   };

//   useEffect(() => {
//     fetch("/api/auth/me")
//       .then((r) => r.json())
//       .then((d) => {
//         if (!d.user) {
//           router.push("/login");
//           return;
//         }
//         setUserId(d.user.id);
//         setUserRole(d.user.role);
//         return fetch("/api/data/tables");
//       })
//       .then((r) => r?.json())
//       .then((d) => {
//         if (d) setTables(d.tables || []);
//       })
//       .finally(() => setLoading(false));
//   }, [router]);

//   const handleDelete = async (reason: string) => {
//     if (!deleteTarget) return;
//     setDeleting(true);
//     try {
//       const res = await fetch(`/api/data/tables/${deleteTarget.id}`, {
//         method: "DELETE",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ reason }),
//       });
//       if (res.ok) {
//         setTables(tables.filter((t) => t.id !== deleteTarget.id));
//         setDeleteTarget(null);
//       }
//     } finally {
//       setDeleting(false);
//     }
//   };

//   const canDelete = (table: DataTableListItem) =>
//     userRole === "ADMIN" || table.author.id === userId;

//   if (loading) {
//     return (
//       <div className="page-shell flex items-center justify-center">
//         <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
//       </div>
//     );
//   }

//   return (
//     <div className="page-shell">
//       <Navbar />
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="flex justify-between items-center mb-8">
//           <div>
//             <h1 className="text-2xl font-bold">Data Entry</h1>
//             <p className="text-muted">View and manage all data tables</p>
//           </div>
//           <Link href="/data/new" className="btn-primary">
//             <Plus className="w-4 h-4 mr-2" />
//             New Table
//           </Link>
//         </div>

//         <DataTableFilters
//           search={search}
//           onSearchChange={setSearch}
//           authorId={authorId}
//           onAuthorChange={setAuthorId}
//           sector={sector}
//           onSectorChange={setSector}
//           subcategory={subcategory}
//           onSubcategoryChange={setSubcategory}
//           tag={tag}
//           onTagChange={setTag}
//           options={mergedOptions}
//         />

//         {filtered.length ? (
//           <div className="card divide-y divide-gray-200 dark:divide-gray-700">
//             {filtered.map((t) => (
//               <Link key={t.id} href={`/data/${t.id}`} className="block">
//                 <DataTableListRow
//                   table={t}
//                   actions={
//                     canDelete(t) ? (
//                       <button
//                         onClick={(e) => {
//                           e.preventDefault();
//                           setDeleteTarget(t);
//                         }}
//                         className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
//                       >
//                         <Trash2 className="w-4 h-4" />
//                       </button>
//                     ) : undefined
//                   }
//                 />
//               </Link>
//             ))}
//           </div>
//         ) : (
//           <div className="card p-12 text-center text-muted">
//             <p className="text-lg">No data tables match your filters</p>
//             <Link href="/data/new" className="btn-primary mt-4 inline-block">
//               Create Data Table
//             </Link>
//           </div>
//         )}
//       </div>

//       <ConfirmReasonModal
//         open={!!deleteTarget}
//         title="Move to Trash"
//         message={`This will move "${deleteTarget?.title}" to trash for 15 days.`}
//         confirmLabel="Move to Trash"
//         variant="danger"
//         loading={deleting}
//         onConfirm={handleDelete}
//         onCancel={() => setDeleteTarget(null)}
//       />
//     </div>
//   );
// }


"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ConfirmReasonModal } from "@/components/ConfirmReasonModal";
import {
  DataTableFilters,
  useDataTableFilters,
  useFilterOptionsFromApi,
  type DataTableListItem,
} from "@/components/DataTableFilters";
import { Plus, Loader2, Trash2, Edit } from "lucide-react";

export default function DataListPage() {
  const router = useRouter();
  const [tables, setTables] = useState<DataTableListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [userRole, setUserRole] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DataTableListItem | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
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
        return fetch("/api/data/tables");
      })
      .then((r) => r?.json())
      .then((d) => {
        if (d) setTables(d.tables || []);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleDelete = async () => {
    const selectedTables = tables.filter((t) => selected.has(t.id) && canDelete(t));
    const targetsToDelete = deleteTarget ? [deleteTarget] : showBulkDeleteModal ? selectedTables : [];
    if (targetsToDelete.length === 0) return;

    const bulkReason = `Moved ${targetsToDelete.length} table${targetsToDelete.length !== 1 ? "s" : ""} to trash`;
    const singleReason = (t: DataTableListItem) => `Moved "${t.title}" to trash`;

    setDeleting(true);
    try {
      for (const target of targetsToDelete) {
        const res = await fetch(`/api/data/tables/${target.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: deleteTarget ? singleReason(target) : bulkReason }),
        });

        if (res.ok) {
          setTables((current) => current.filter((t) => t.id !== target.id));
        }
      }

      setDeleteTarget(null);
      setShowBulkDeleteModal(false);
      setSelected(new Set());
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = (table: DataTableListItem) =>
    userRole === "ADMIN" || table.author.id === userId;

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
    setShowBulkDeleteModal(false);
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
      setShowBulkDeleteModal(false);
    } else {
      const newSelected = new Set(filtered.map((t) => t.id));
      setSelected(newSelected);
      setShowBulkDeleteModal(true);
    }
  };

  const handleCancelSelection = () => {
    setSelected(new Set());
    setShowBulkDeleteModal(false);
    setDeleteTarget(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Data Entry</h1>
            <p className="text-muted">View and manage all data tables</p>
          </div>
          <Link href="/data/new" className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            New Table
          </Link>
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

        {selected.size >= 1 && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-blue-900 dark:text-blue-100">
                {selected.size} item{selected.size !== 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
              <button
                onClick={handleCancelSelection}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {filtered.length ? (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-6 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                      />
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Title</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Category</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Subcategory</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Encoder</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Date</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filtered.map((t) => (
                    <tr 
                      key={t.id} 
                      className={`transition-colors ${
                        selected.has(t.id)
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      }`}
                    >
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                        />
                      </td>
                      <td 
                        className="px-6 py-4 cursor-pointer"
                        onClick={() => !selected.has(t.id) && router.push(`/data/${t.id}`)}
                      >
                        <span className="font-medium text-gray-900 dark:text-gray-100">{t.title}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {t.sector || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600 dark:text-gray-400">{t.subcategory || "—"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600 dark:text-gray-400">{t.author?.name || "Unknown"}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(t.updatedAt)}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => router.push(`/data/${t.id}`)}
                            className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {canDelete(t) && (
                            <button
                              onClick={() => {
                                setDeleteTarget(t);
                              }}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card p-12 text-center text-muted">
            <p className="text-lg">No data tables match your filters</p>
            <Link href="/data/new" className="btn-primary mt-4 inline-block">
              Create Data Table
            </Link>
          </div>
        )}
      </div>

      <ConfirmReasonModal
        open={!!deleteTarget || showBulkDeleteModal}
        title="Move to Trash"
        message={
          deleteTarget
            ? `This will move "${deleteTarget?.title}" to trash for 15 days.`
            : `This will move ${selected.size} table${selected.size > 1 ? "s" : ""} to trash for 15 days.`
        }
        confirmLabel="Move to Trash"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={handleCancelSelection}
      />
    </div>
  );
}