export interface ModuleSource {
  /** Normalized absolute module URL. */
  readonly id: string;
  readonly source: string;
}

/**
 * A source-only module registry.
 *
 * AlgoVis never executes imported JavaScript on the host. The host application
 * fetches module text, stores it here, and the interpreter parses and executes
 * that text with its own runtime. Keeping the registry synchronous means module
 * evaluation can happen inside normal interpreter steps.
 */
export class ModuleRegistry {
  private readonly sources = new Map<string, string>();

  public constructor(public readonly baseUrl: string) {}

  /** Adds or replaces a module by URL (absolute or relative to `baseUrl`). */
  public setSource(id: string, source: string): string {
    const normalized = this.resolveId(id);
    this.sources.set(normalized, source);
    return normalized;
  }

  /** Registers a module under an already-normalized URL. */
  public setResolvedSource(id: string, source: string): void {
    this.sources.set(id, source);
  }

  public hasSource(id: string): boolean {
    return this.sources.has(this.resolveId(id));
  }

  public get size(): number {
    return this.sources.size;
  }

  public resolve(specifier: string, parentId?: string): ModuleSource | undefined {
    const id = this.resolveId(specifier, parentId);
    const source = this.sources.get(id);
    return source === undefined ? undefined : { id, source };
  }

  public resolveId(specifier: string, parentId?: string): string {
    try {
      return new URL(specifier, parentId ?? this.baseUrl).href;
    } catch {
      return specifier;
    }
  }
}
