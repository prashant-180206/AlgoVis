import { useEffect, useRef } from "react";
import { ListTree, Terminal } from "lucide-react";
import {
  ExecutionEventType,
  type ExecutionEvent,
  type RuntimeSnapshot,
} from "../core";
import { Card, CardHeader } from "./ui/card";

interface ExecutionFeedProps {
  snapshot?: RuntimeSnapshot;
}

function formatPayloadValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return "…";
}

function describeEvent(event: ExecutionEvent): string {
  const payload = event.payload ?? {};
  switch (event.type) {
    case ExecutionEventType.Write:
      if (typeof payload.output === "string")
        return `console.log ${formatPayloadValue(payload.output)}`;
      return `write ${String(payload.name ?? "value")}`;
    case ExecutionEventType.Read:
      return `read ${String(payload.name ?? "value")}`;
    case ExecutionEventType.Compare:
      return `${formatPayloadValue(payload.left)} ${String(payload.operator ?? "")} ${formatPayloadValue(payload.right)}`;
    case ExecutionEventType.Call:
      return `call ${String(payload.name ?? "function")}`;
    case ExecutionEventType.Return:
      return `return from ${String(payload.name ?? "function")}`;
    case ExecutionEventType.Statement:
      return "execute statement";
    case ExecutionEventType.Error:
      return String(payload.message ?? "runtime error");
    case ExecutionEventType.ProgramFinished:
      return "program finished";
    default:
      return event.type.toLowerCase().replace(/_/g, " ");
  }
}

function eventTone(type: ExecutionEventType): {
  text: string;
  dot: string;
} {
  switch (type) {
    case ExecutionEventType.Write:
      return { text: "text-lime-300", dot: "bg-lime-300" };
    case ExecutionEventType.Read:
      return { text: "text-sky-300", dot: "bg-sky-300" };
    case ExecutionEventType.Compare:
      return { text: "text-amber-300", dot: "bg-amber-300" };
    case ExecutionEventType.Call:
    case ExecutionEventType.Return:
      return { text: "text-violet-300", dot: "bg-violet-300" };
    case ExecutionEventType.Error:
      return { text: "text-red-300", dot: "bg-red-300" };
    case ExecutionEventType.ProgramFinished:
      return { text: "text-lime-200", dot: "bg-lime-200" };
    default:
      return { text: "text-zinc-500", dot: "bg-zinc-600" };
  }
}

export function ExecutionFeed({ snapshot }: ExecutionFeedProps) {
  const outputRef = useRef<HTMLDivElement>(null);
  const events = snapshot?.events ?? [];
  const output = events.filter(
    (event) =>
      event.type === ExecutionEventType.Write &&
      typeof event.payload?.output === "string",
  );
  const recentEvents = events.slice(-24);

  useEffect(() => {
    const element = outputRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [output.length]);

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-lime-300" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
              Console output
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">
            {output.length} {output.length === 1 ? "line" : "lines"}
          </span>
        </CardHeader>
        <div
          ref={outputRef}
          className="max-h-46 min-h-24 space-y-1 overflow-auto bg-[#111411] p-3 font-mono text-[11px]"
        >
          {output.length === 0 ? (
            <p className="py-6 text-center text-zinc-700">
              console.log output will appear here
            </p>
          ) : (
            output.map((event, index) => (
              <div
                className="flex gap-3 rounded px-2 py-1 odd:bg-white/2"
                key={`${event.location?.start.offset ?? index}-${index}`}
              >
                <span className="w-10 shrink-0 text-right text-zinc-700">
                  {event.location ? `L${event.location.start.line}` : "—"}
                </span>
                <span className="whitespace-pre-wrap wrap-break-word text-lime-200/90">
                  {String(event.payload?.output ?? "")}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ListTree className="h-4 w-4 text-lime-300" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
              Execution trace
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">
            last {recentEvents.length} of {events.length} events
          </span>
        </CardHeader>
        <div className="max-h-46 min-h-24 space-y-0.5 overflow-auto p-2 font-mono text-[10px]">
          {recentEvents.length === 0 ? (
            <p className="py-6 text-center text-zinc-700">
              No events recorded yet
            </p>
          ) : (
            recentEvents.map((event, index) => {
              const isLast = index === recentEvents.length - 1;
              const tone = eventTone(event.type);
              return (
                <div
                  className={`flex items-center gap-2 rounded px-2 py-1 ${
                    isLast ? "bg-white/4" : ""
                  }`}
                  key={`${event.type}-${event.location?.start.offset ?? "x"}-${index}`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`}
                  />
                  <span className={`w-24 shrink-0 truncate uppercase ${tone.text}`}>
                    {event.type}
                  </span>
                  <span className="truncate text-zinc-500">
                    {describeEvent(event)}
                  </span>
                  <span className="ml-auto shrink-0 text-zinc-700">
                    {event.location ? `L${event.location.start.line}` : "—"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
