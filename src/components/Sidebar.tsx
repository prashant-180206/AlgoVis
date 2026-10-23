import { Boxes, Files, FolderOpen, Terminal } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

interface ActivityBarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  visCollapsed: boolean;
  onToggleVisualization: () => void;
  bottomOpen: boolean;
  onToggleBottomPanel: () => void;
  onOpenFolder: () => void;
}

export function ActivityBar({
  sidebarOpen,
  onToggleSidebar,
  visCollapsed,
  onToggleVisualization,
  bottomOpen,
  onToggleBottomPanel,
  onOpenFolder,
}: ActivityBarProps) {
  return (
    <nav className="flex w-10 shrink-0 flex-col items-center gap-1 border-r border-white/8 bg-[#0c0f0c] py-2">
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", sidebarOpen && "bg-lime-300/10 text-lime-300")}
        onClick={onToggleSidebar}
        aria-label="Toggle file explorer"
        title="File explorer"
      >
        <Files className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onOpenFolder}
        aria-label="Open folder"
        title="Open folder"
      >
        <FolderOpen className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", !visCollapsed && "bg-lime-300/10 text-lime-300")}
        onClick={onToggleVisualization}
        aria-label="Toggle visualization"
        title={visCollapsed ? "Show visualization" : "Hide visualization"}
      >
        <Boxes className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", bottomOpen && "bg-lime-300/10 text-lime-300")}
        onClick={onToggleBottomPanel}
        aria-label="Toggle bottom panel"
        title="Runtime, output, and problems"
      >
        <Terminal className="h-4 w-4" />
      </Button>
    </nav>
  );
}
