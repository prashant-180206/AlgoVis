import { useState } from "react";
import { AlertTriangle, Braces, Terminal } from "lucide-react";
import type { RuntimeSnapshot } from "../core";
import { cn } from "../lib/utils";
import { ExecutionFeed } from "./ExecutionFeed";
import { RuntimeInspector } from "./RuntimeInspector";
import { Badge } from "./ui/badge";

type PanelTab = "runtime" | "output" | "problems";

interface BottomPanelProps {
  snapshot?: RuntimeSnapshot;
  previousSnapshot?: RuntimeSnapshot;
  error?: string;
  status: string;
  stepIndex: number;
  stepCount: number;
}

export function BottomPanel({
  snapshot,
  previousSnapshot,
  error,
  status,
  stepIndex,
  stepCount,
}: BottomPanelProps) {
  const [tab, setTab] = useState<PanelTab>("runtime");
  const eventCount = snapshot?.events.length ?? 0;

  const tabs: { id: PanelTab; label: string; count?: number }[] = [
    { id: "runtime", label: "Runtime", count: snapshot?.frames.length },
    { id: "output", label: "Console & trace", count: eventCount },
    { id: "problems", label: "Problems", count: error ? 1 : undefined },
  ];

  return (
    <section className="flex h-full min-h-0 flex-col border-t border-white/8 bg-[#0e110e]">
      <div className="flex h-8 shrink-0 items-stretch border-b border-white/8">
        <div className="flex items-stretch">
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                className={cn(
                  "relative flex items-center gap-1.5 border-r border-white/6 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600 transition-colors hover:text-zinc-300",
                  active && "bg-[#151a15] text-lime-300",
                )}
                key={item.id}
                onClick={() => setTab(item.id)}
                type="button"
              >
                {item.id === "runtime" ? (
                  <Braces className="h-3.5 w-3.5" />
                ) : item.id === "output" ? (
                  <Terminal className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}
                <div className="text-[10px]">{item.label}</div>
                
                {item.count ? (
                  <span className="rounded bg-white/6 px-1 font-mono text-[9px] text-zinc-500">
                    {item.count}
                  </span>
                ) : null}
                {active ? (
                  <span className="absolute inset-x-0 top-0 h-px bg-lime-300" />
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 font-mono text-[9px] uppercase tracking-wider text-zinc-600">
          <Badge className="border-lime-300/15 text-lime-300/80">{status}</Badge>
          <span>
            STEP {stepCount === 0 ? 0 : stepIndex} / {Math.max(0, stepCount - 1)}
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2.5">
        {tab === "runtime" ? (
          <RuntimeInspector
            snapshot={snapshot}
            previousSnapshot={previousSnapshot}
          />
        ) : tab === "output" ? (
          <ExecutionFeed snapshot={snapshot} />
        ) : (
          <div className="space-y-3 p-1">
            {error ? (
              <div className="rounded border border-red-400/20 bg-red-400/5 p-3">
                <p className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-red-300">
                  <AlertTriangle className="h-3.5 w-3.5" /> Interpreter problem
                </p>
                <pre className="whitespace-pre-wrap font-mono text-[11px] leading-5 text-red-200/80">
                  {error}
                </pre>
              </div>
            ) : (
              <div className="rounded border border-white/8 bg-[#121612] p-4">
                <p className="text-xs text-zinc-400">
                  No problems detected. The current file parses successfully.
                </p>
              </div>
            )}
            <div className="rounded border border-white/6 bg-[#101410] p-3 text-[11px] leading-5 text-zinc-600">
              AlgoVis evaluates JavaScript-like source in its own interpreter. It
              supports imports, classes, destructuring declarations, and nested
              runtime environments. Host JavaScript is never executed.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
