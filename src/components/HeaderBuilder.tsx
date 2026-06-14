"use client";

import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { HeaderNode, createHeaderNode } from "@/lib/table-headers";

interface HeaderBuilderProps {
  label: string;
  headers: HeaderNode[];
  onChange: (headers: HeaderNode[]) => void;
}

function updateNode(nodes: HeaderNode[], id: string, updater: (n: HeaderNode) => HeaderNode): HeaderNode[] {
  return nodes.map((n) => {
    if (n.id === id) return updater(n);
    if (n.children) return { ...n, children: updateNode(n.children, id, updater) };
    return n;
  });
}

function removeNode(nodes: HeaderNode[], id: string): HeaderNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => (n.children ? { ...n, children: removeNode(n.children, id) } : n));
}

function findParentAndAddSister(nodes: HeaderNode[], childId: string, newNode: HeaderNode): HeaderNode[] | null {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].children) {
      const childIndex = nodes[i].children!.findIndex((c) => c.id === childId);
      if (childIndex !== -1) {
        const updated = [...nodes];
        updated[i] = {
          ...updated[i],
          children: [...updated[i].children!, newNode],
        };
        return updated;
      }
      const result = findParentAndAddSister(nodes[i].children!, childId, newNode);
      if (result) {
        const updated = [...nodes];
        updated[i] = { ...updated[i], children: result };
        return updated;
      }
    }
  }
  return null;
}

function HeaderNodeEditor({
  node,
  depth,
  onUpdate,
  onRemove,
  onAddChild,
  onAddSister,
}: {
  node: HeaderNode;
  depth: number;
  onUpdate: (id: string, label: string) => void;
  onRemove: (id: string) => void;
  onAddChild: (id: string) => void;
  onAddSister: (id: string) => void;
}) {
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center" style={{ marginLeft: depth * 16 }}>
        {hasChildren ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
        <input
          className="input flex-1"
          placeholder="Header label"
          value={node.label}
          onChange={(e) => onUpdate(node.id, e.target.value)}
        />
        <button type="button" onClick={() => onAddChild(node.id)} className="btn-secondary text-xs px-2 py-1" title="Add sub-header">
          <Plus className="w-3 h-3" />
        </button>
        {depth > 0 && (
          <button type="button" onClick={() => onAddSister(node.id)} className="btn-secondary text-xs px-2 py-1" title="Add sister header">
            <Plus className="w-3 h-3" />
          </button>
        )}
        <button type="button" onClick={() => onRemove(node.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {node.children?.map((child) => (
        <HeaderNodeEditor
          key={child.id}
          node={child}
          depth={depth + 1}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onAddChild={onAddChild}
          onAddSister={onAddSister}
        />
      ))}
    </div>
  );
}

export function HeaderBuilder({ label, headers, onChange }: HeaderBuilderProps) {
  const addRoot = () => onChange([...headers, createHeaderNode("")]);

  const updateLabel = (id: string, labelVal: string) => {
    onChange(updateNode(headers, id, (n) => ({ ...n, label: labelVal })));
  };

  const remove = (id: string) => onChange(removeNode(headers, id));

  const addChild = (parentId: string) => {
    onChange(
      updateNode(headers, parentId, (n) => ({
        ...n,
        children: [...(n.children || []), createHeaderNode("")],
      }))
    );
  };

  const addSister = (nodeId: string) => {
    const result = findParentAndAddSister(headers, nodeId, createHeaderNode(""));
    if (result) {
      onChange(result);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">{label}</h3>
        <button type="button" onClick={addRoot} className="btn-secondary text-sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Header
        </button>
      </div>
      {headers.length === 0 ? (
        <p className="text-sm text-muted">No headers yet. Add at least one.</p>
      ) : (
        headers.map((node) => (
          <HeaderNodeEditor
            key={node.id}
            node={node}
            depth={0}
            onUpdate={updateLabel}
            onRemove={remove}
            onAddChild={addChild}
            onAddSister={addSister}
          />
        ))
      )}
    </div>
  );
}
