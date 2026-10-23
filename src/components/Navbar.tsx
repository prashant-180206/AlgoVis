import { FolderOpen, RefreshCw, Save } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

interface NavbarProps {
  workspaceRoot?: string;
  playbackStatus: string;
  hasParseError: boolean;
  isPlaying: boolean;
  hasImports: boolean;
  loadingModules: boolean;
  canSave: boolean;
  workspaceLoading: boolean;
  onReloadModules: () => void;
  onOpenFolder: () => void;
  onSaveFile: () => void;
}

export function Navbar({
  workspaceRoot,
  playbackStatus,
  hasParseError,
  isPlaying,
  hasImports,
  loadingModules,
  canSave,
  workspaceLoading,
  onReloadModules,
  onOpenFolder,
  onSaveFile,
}: NavbarProps) {
  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-white/8 bg-[#0e110e] px-3">
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="grid h-7 w-7 place-items-center rounded bg-lime-300 text-[10px] font-black text-[#10140f] shadow-[0_0_20px_rgba(216,242,122,.15)]">
          AV
        </div>
        <div className="flex items-baseline gap-2">
          <strong className="text-xs font-semibold tracking-tight">
            AlgoVis
          </strong>
          <Badge className="hidden border-lime-300/20 text-lime-300 sm:inline-flex">
            IDE
          </Badge>
        </div>
      </div>

      <div className="hidden min-w-0 items-center gap-2 border-l border-white/8 pl-3 md:flex">
        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
        <span
          className="truncate font-mono text-[10px] text-zinc-500"
          title={workspaceRoot}
        >
          {workspaceRoot ?? "No folder opened"}
        </span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <span className="hidden items-center gap-2 px-2 text-[9px] uppercase tracking-[0.14em] text-zinc-600 sm:flex">
          <i
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              hasParseError
                ? "bg-red-300"
                : isPlaying
                  ? "bg-lime-300 shadow-[0_0_8px_#d8f27a]"
                  : "bg-zinc-600",
            )}
          />
          {playbackStatus}
        </span>
        {hasImports ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onReloadModules}
            disabled={loadingModules}
            aria-label="Reload imported modules"
            title="Reload imported modules"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loadingModules ? "animate-spin" : ""}`}
            />
          </Button>
        ) : null}
        <Button size="sm" onClick={onOpenFolder} disabled={workspaceLoading}>
          <FolderOpen className="h-3.5 w-3.5" />
          Open folder
        </Button>
        <Button size="sm" onClick={onSaveFile} disabled={!canSave} title="Save file (Ctrl+S)">
          <Save className="h-3.5 w-3.5" />
          Save
        </Button>
      </div>
    </header>
  );
}
