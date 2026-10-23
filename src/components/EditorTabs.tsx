import { FileCode2, Save, X } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

interface EditorTabsProps {
  paths: readonly string[];
  activePath?: string;
  dirtyPaths: ReadonlySet<string>;
  canSave: boolean;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
  onSave: () => void;
}

function fileName(path: string): string {
  const segments = path.split("/");
  return segments[segments.length - 1] || path;
}

export function EditorTabs({
  paths,
  activePath,
  dirtyPaths,
  canSave,
  onSelect,
  onClose,
  onSave,
}: EditorTabsProps) {
  return (
    <div className="flex h-9 shrink-0 items-stretch border-b border-white/8 bg-[#0e110e]">
      <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
        {paths.map((path) => {
          const active = path === activePath;
          const dirty = dirtyPaths.has(path);
          return (
            <button
              className={cn(
                "group relative flex min-w-32 max-w-56 items-center gap-2 border-r border-white/6 px-3 text-left text-[11px] text-zinc-500 transition-colors hover:bg-white/4 hover:text-zinc-200",
                active &&
                  "bg-[#151a15] text-zinc-200 after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-lime-300",
              )}
              key={path}
              onClick={() => onSelect(path)}
              title={path}
              type="button"
            >
              <FileCode2 className="h-3.5 w-3.5 shrink-0  text-amber-300/80" />
              <span className="min-w-0 flex-1 text-[12px] truncate">{fileName(path)}</span>
              {dirty ? (
                <i className="h-1.5 w-1.5 shrink-0 rounded-full bg-lime-300" />
              ) : null}
              <span
                className={cn(
                  "grid h-4 w-4 shrink-0 place-items-center rounded text-zinc-600 hover:bg-white/10 hover:text-zinc-200",
                  !dirty && !active && "opacity-0 group-hover:opacity-100",
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  onClose(path);
                }}
                role="button"
                aria-label={`Close ${fileName(path)}`}
                tabIndex={-1}
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex shrink-0 items-center gap-1 border-l border-white/6 px-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onSave}
          disabled={!canSave}
          aria-label="Save file"
          title="Save file (Ctrl+S)"
        >
          <Save className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
