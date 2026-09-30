import { type HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border border-white/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500",
        className,
      )}
      {...props}
    />
  );
}
