import { Box, Braces, Layers3, Terminal } from "lucide-react";
import { displayValue, type RuntimeSnapshot } from "../core";
import { Card, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";

interface RuntimeInspectorProps {
  snapshot?: RuntimeSnapshot;
}

export function RuntimeInspector({ snapshot }: RuntimeInspectorProps) {
  const activeEnvironments =
    snapshot?.environments.filter((environment) => environment.active) ?? [];
  const frames = snapshot?.frames ?? [];
  const returnedFrames = snapshot?.frameHistory ?? [];
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,.7fr)]">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Braces className="h-4 w-4 text-lime-300" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
              Runtime state
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">
            {activeEnvironments.length} active scopes
          </span>
        </CardHeader>
        <div className="flex items-start justify-between gap-5 border-b border-white/8 px-5 py-4">
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-lime-300/80">
              Live environment graph
            </p>
            <h2 className="text-lg font-medium tracking-tight text-white">
              Bindings & objects
            </h2>
            <p className="mt-1 max-w-lg text-xs leading-5 text-zinc-600">
              Inspect values as the interpreter moves through each meaningful
              state.
            </p>
          </div>
          <div className="hidden shrink-0 gap-5 sm:flex">
            {[
              [snapshot?.events.length ?? 0, "events"],
              [snapshot?.frames.length ?? 0, "frames"],
              [snapshot?.stepIndex ?? 0, "step"],
            ].map(([value, label]) => (
              <div key={label} className="text-right">
                <strong className="block font-mono text-lg font-normal text-zinc-200">
                  {value}
                </strong>
                <span className="text-[10px] uppercase tracking-wider text-zinc-600">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="max-h-90 space-y-2 overflow-auto p-3">
          {activeEnvironments.map((environment) => (
            <section
              className="rounded-md border border-white/8 bg-[#121612]"
              key={environment.id}
            >
              <div className="flex items-center gap-2 border-b border-white/[0.07] px-3 py-2">
                <Badge
                  className={
                    environment.kind === "function"
                      ? "border-sky-300/20 text-sky-300"
                      : "border-lime-300/20 text-lime-300"
                  }
                >
                  {environment.kind}
                </Badge>
                <strong className="text-xs font-medium text-zinc-300">
                  {environment.kind === "global"
                    ? "Global environment"
                    : `${environment.kind} environment`}
                </strong>
                <code className="ml-auto font-mono text-[10px] text-zinc-700">
                  {environment.id}
                </code>
              </div>
              {environment.variables.length === 0 ? (
                <div className="px-3 py-3 text-xs text-zinc-700">
                  No bindings yet
                </div>
              ) : (
                <div>
                  {environment.variables.map((variable) => (
                    <div
                      className="grid grid-cols-[minmax(60px,.7fr)_minmax(90px,1fr)_minmax(60px,.7fr)] gap-2 border-b border-white/5 px-3 py-2 last:border-0"
                      key={`${environment.id}-${variable.name}`}
                    >
                      <span className="truncate font-mono text-xs text-zinc-300">
                        {variable.name}
                      </span>
                      <span className="truncate font-mono text-xs text-lime-200/80">
                        {displayValue(variable.value)}
                      </span>
                      <span className="truncate text-right font-mono text-[10px] text-zinc-600">
                        {variable.declaredType ?? variable.runtimeType}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
          {activeEnvironments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Layers3 className="mb-2 h-5 w-5 text-zinc-700" />
              <span className="text-xs text-zinc-600">
                Run or step the program to inspect runtime state.
              </span>
            </div>
          ) : null}
        </div>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-lime-300" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
              Call stack
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">
            {frames.length} frames
          </span>
        </CardHeader>
        <div className="space-y-2 p-3">
          {frames
            .slice()
            .reverse()
            .map((frame, index) => (
              <section
                className={`rounded-md border p-3 ${index === 0 ? "border-lime-300/30 bg-lime-300/4" : "border-white/8 bg-[#121612]"}`}
                key={frame.id}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-lime-300/70">
                    {index === 0 ? "Current" : `Call ${index}`}
                  </span>
                  <code className="font-mono text-[10px] text-zinc-700">
                    {frame.environmentId}
                  </code>
                </div>
                <strong className="mt-1 block font-mono text-sm text-zinc-200">
                  {frame.functionName}()
                </strong>
                {frame.variables.map((variable) => (
                  <div
                    className="mt-2 flex justify-between gap-3 border-t border-white/6 pt-2 text-xs"
                    key={`${frame.id}-${variable.name}`}
                  >
                    <span className="font-mono text-zinc-500">
                      {variable.name}
                    </span>
                    <b className="truncate font-mono font-normal text-lime-200/70">
                      {displayValue(variable.value)}
                    </b>
                  </div>
                ))}
              </section>
            ))}
          {frames.length === 0 && returnedFrames.length === 0 ? (
            <div className="py-12 text-center">
              <Box className="mx-auto mb-2 h-5 w-5 text-zinc-700" />
              <p className="text-xs text-zinc-600">No active function frames</p>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
