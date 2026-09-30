import { SourceLocation } from "../language/SourceLocation";

export enum ExecutionEventType {
  ProgramStarted = "PROGRAM_STARTED",
  Statement = "STATEMENT",
  Read = "READ",
  Write = "WRITE",
  Compare = "COMPARE",
  Call = "CALL",
  Method = "METHOD",
  Return = "RETURN",
  Error = "ERROR",
  ProgramFinished = "PROGRAM_FINISHED",
}

export interface ExecutionEvent {
  readonly type: ExecutionEventType;
  readonly location?: SourceLocation;
  readonly payload?: Readonly<Record<string, unknown>>;
}

export class ExecutionTrace {
  private readonly events: ExecutionEvent[] = [];

  public record(event: ExecutionEvent): void {
    this.events.push(event);
  }
  public all(): readonly ExecutionEvent[] {
    return [...this.events];
  }
  public clear(): void {
    this.events.length = 0;
  }
}
