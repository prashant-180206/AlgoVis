import { Activity, Maximize2, ScanLine } from "lucide-react";
import type { VisualizationState } from "../core";
import { Card, CardHeader } from "./ui/card";
import { Button } from "./ui/button";

interface VisualizationStageProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  visualization: VisualizationState;
}

export function VisualizationStage({ canvasRef, visualization }: VisualizationStageProps) {
  return (
    <Card className="flex min-h-122.5 flex-col lg:min-h-0">
      <CardHeader className="shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-lime-300" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">Live visualization</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-2 text-[10px] uppercase tracking-wider text-zinc-600">Canvas 2D · {visualization.objects.length} objects</span>
          <Button variant="ghost" size="icon" aria-label="Fit visualization" title="Fit visualization"><ScanLine className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" aria-label="Fullscreen visualization" title="Fullscreen visualization"><Maximize2 className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#121612]" style={{ backgroundImage: "linear-gradient(rgba(216,242,122,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(216,242,122,.035) 1px, transparent 1px)", backgroundSize: "28px 28px" }}>
        <canvas className="h-full min-h-100 w-full" ref={canvasRef} width={900} height={420} aria-label="Algorithm visualization canvas" />
        {visualization.objects.length === 0 ? <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center"><div className="grid h-14 w-14 place-items-center rounded-lg border border-dashed border-lime-300/30 text-lime-300"><Activity className="h-6 w-6" /></div><strong className="text-sm font-medium text-zinc-300">Awaiting execution</strong><span className="max-w-57.5 text-xs leading-5 text-zinc-600">Run the algorithm to see its data structures take shape.</span></div> : null}
      </div>
      <div className="flex shrink-0 items-center justify-between border-t border-white/8 px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-zinc-600"><span>Object projection</span><span>STEP {visualization.stepIndex}</span></div>
    </Card>
  );
}
