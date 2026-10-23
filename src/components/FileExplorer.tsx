import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  FileCode2,
  FileJson,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { cn } from "../lib/utils";
import type { WorkspaceNode } from "../workspace";
import { Button } from "./ui/button";

interface FileExplorerProps {
  tree?: WorkspaceNode;
  workspaceName?: string;
  activePath?: string;
  dirtyPaths: ReadonlySet<string>;
  loading: boolean;
  onOpenFile: (path: string) => void;
  onRefresh: () => void;
  onCreateFile: (path: string) => Promise<void>;
  onCreateFolder: (path: string) => Promise<void>;
  onOpenFolder: () => void;
  onRenameFile: (oldPath: string, newPath: string) => Promise<void>;
  onDeleteFile: (path: string) => Promise<void>;
}

function fileIcon(name: string) {
  if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(name))
    return <FileCode2 className="h-3.5 w-3.5 shrink-0 text-amber-300" />;
  if (/\.json$/.test(name))
    return <FileJson className="h-3.5 w-3.5 shrink-0 text-yellow-200" />;
  if (/\.(md|txt|css|html)$/.test(name))
    return <FileText className="h-3.5 w-3.5 shrink-0 text-sky-300" />;
  return <File className="h-3.5 w-3.5 shrink-0 text-zinc-500" />;
}

interface TreeRowProps {
  node: WorkspaceNode;
  depth: number;
  activePath?: string;
  dirtyPaths: ReadonlySet<string>;
  collapsed: ReadonlySet<string>;
  onToggle: (path: string) => void;
  onOpenFile: (path: string) => void;
  onRename: (node: WorkspaceNode) => void;
  onDelete: (node: WorkspaceNode) => void;
}

function TreeRow({
  node,
  depth,
  activePath,
  dirtyPaths,
  collapsed,
  onToggle,
  onOpenFile,
  onRename,
  onDelete,
}: TreeRowProps) {
  const isDirectory = node.kind === "directory";
  const isCollapsed = collapsed.has(node.path);
  const isActive = !isDirectory && activePath === node.path;
  const isDirty = dirtyPaths.has(node.path);

  return (
    <div>
      <div
        className={cn(
          "group relative flex h-7 w-full items-center gap-1.5 border-l-2 border-transparent pr-2 text-left text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200",
          isActive &&
            "border-lime-300 bg-lime-300/9 text-zinc-100 hover:bg-lime-300/12",
        )}
        style={{ paddingLeft: `${6 + depth * 12}px` }}
      >
        <button
          className="flex h-7 min-w-0 flex-1 items-center gap-1.5"
          onClick={() =>
            isDirectory ? onToggle(node.path) : onOpenFile(node.path)
          }
          title={node.path || node.name}
          type="button"
        >
          {isDirectory ? (
            isCollapsed ? (
              <ChevronRight className="h-3 w-3 shrink-0 text-zinc-600" />
            ) : (
              <ChevronDown className="h-3 w-3 shrink-0 text-zinc-600" />
            )
          ) : (
            <span className="w-3 shrink-0" />
          )}
          {isDirectory ? (
            isCollapsed ? (
              <Folder className="h-3.5 w-3.5 shrink-0 text-lime-300/80" />
            ) : (
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-lime-300/80" />
            )
          ) : (
            fileIcon(node.name)
          )}
          <span className="truncate">{node.name}</span>
          {isDirty ? (
            <i className="ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-lime-300" />
          ) : null}
        </button>
        <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
          <button
            className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
            onClick={(event) => {
              event.stopPropagation();
              onRename(node);
            }}
            aria-label={`Rename ${node.name}`}
            title={`Rename ${node.name}`}
            type="button"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            className="rounded p-1 text-zinc-500 hover:bg-red-400/10 hover:text-red-300"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(node);
            }}
            aria-label={`Delete ${node.name}`}
            title={`Delete ${node.name}`}
            type="button"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </span>
      </div>
      {isDirectory && !isCollapsed
        ? node.children?.map((child) => (
            <TreeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              dirtyPaths={dirtyPaths}
              collapsed={collapsed}
              onToggle={onToggle}
              onOpenFile={onOpenFile}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))
        : null}
    </div>
  );
}

/** Splits a workspace path into its parent directory and final segment. */
function splitPath(path: string): { parent: string; name: string } {
  const segments = path.split("/").filter(Boolean);
  const name = segments.pop() ?? "";
  return { parent: segments.join("/"), name };
}

export function FileExplorer({
  tree,
  workspaceName,
  activePath,
  dirtyPaths,
  loading,
  onOpenFile,
  onRefresh,
  onCreateFile,
  onCreateFolder,
  onOpenFolder,
  onRenameFile,
  onDeleteFile,
}: FileExplorerProps) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [creating, setCreating] = useState<"file" | "folder" | undefined>();
  const [newEntryName, setNewEntryName] = useState("");
  const [creatingEntry, setCreatingEntry] = useState(false);

  function toggle(path: string): void {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function submitNewEntry(): Promise<void> {
    const path = newEntryName.trim().replace(/^[/\\]+/, "").replace(/[/\\]+$/, "");
    if (!path || creatingEntry) return;
    setCreatingEntry(true);
    try {
      if (creating === "folder") await onCreateFolder(path);
      else await onCreateFile(path);
      if (creating === "folder") {
        setCollapsed((current) => {
          const parent = splitPath(path).parent;
          if (!parent || current.has(parent)) return current;
          const next = new Set(current);
          next.delete(parent);
          return next;
        });
      }
      setNewEntryName("");
      setCreating(undefined);
    } finally {
      setCreatingEntry(false);
    }
  }

  function renameNode(node: WorkspaceNode): void {
    const { parent } = splitPath(node.path);
    const nextName = window.prompt(`Rename '${node.name}'`, node.name)?.trim();
    if (!nextName || nextName === node.name) return;
    if (/[\\/]$/.test(nextName) || nextName.includes("\0")) return;
    const newPath = parent ? `${parent}/${nextName}` : nextName;
    void onRenameFile(node.path, newPath);
  }

  function deleteNode(node: WorkspaceNode): void {
    if (
      !window.confirm(
        `Delete '${node.name}'${node.kind === "directory" ? " and everything inside it" : ""}? This cannot be undone.`,
      )
    )
      return;
    void onDeleteFile(node.path);
  }

  return (
    <aside className="flex h-full w-full min-w-0 flex-col border-r border-white/8 bg-[#101310]">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/8 px-3">
        <span className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Explorer
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setCreating((value) => (value === "file" ? undefined : "file"));
            setNewEntryName("");
          }}
          disabled={!tree}
          aria-label="New file"
          title="New file"
        >
          <FilePlus2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setCreating((value) => (value === "folder" ? undefined : "folder"));
            setNewEntryName("");
          }}
          disabled={!tree}
          aria-label="New folder"
          title="New folder"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onRefresh}
          disabled={!tree || loading}
          aria-label="Refresh files"
          title="Refresh files"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", loading && "animate-spin")}
          />
        </Button>
      </div>

      <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-white/6 px-3">
        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-lime-300/70" />
        <span
          className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400"
          title={workspaceName}
        >
          {workspaceName ?? "No folder opened"}
        </span>
      </div>

      {creating ? (
        <div className="border-b border-white/6 p-2">
          <input
            autoFocus
            className="h-7 w-full rounded border border-lime-300/30 bg-[#171b18] px-2 font-mono text-[11px] text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-lime-300/60"
            placeholder={creating === "folder" ? "path/to/folder" : "path/to/file.js"}
            value={newEntryName}
            onChange={(event) => setNewEntryName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submitNewEntry();
              if (event.key === "Escape") {
                setCreating(undefined);
                setNewEntryName("");
              }
            }}
            disabled={creatingEntry}
          />
          <span className="mt-1 block px-1 text-[9px] uppercase tracking-wider text-zinc-600">
            creating {creating} · Enter to confirm, Esc to cancel
          </span>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto py-1">
        {tree ? (
          tree.children?.length ? (
            tree.children.map((node) => (
              <TreeRow
                key={node.path}
                node={node}
                depth={0}
                activePath={activePath}
                dirtyPaths={dirtyPaths}
                collapsed={collapsed}
                onToggle={toggle}
                onOpenFile={onOpenFile}
                onRename={renameNode}
                onDelete={deleteNode}
              />
            ))
          ) : (
            <p className="px-3 py-6 text-center text-[11px] leading-5 text-zinc-700">
              This folder is empty.
            </p>
          )
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <Folder className="h-6 w-6 text-zinc-700" />
            <p className="text-[11px] leading-5 text-zinc-600">
              Open a folder to browse and edit files from your machine.
            </p>
            <Button size="sm" onClick={onOpenFolder}>
              <FolderOpen className="h-3.5 w-3.5" />
              Open folder
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
