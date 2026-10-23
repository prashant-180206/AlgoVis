import { RuntimeValue } from "./Values";
import { TypeReference } from "../language/Ast";

export class Scope {
  private static nextId = 0;
  public readonly id = `env-${++Scope.nextId}`;
  private readonly bindings = new Map<string, RuntimeValue>();
  private readonly declaredTypes = new Map<string, TypeReference>();
  private readonly builtins = new Set<string>();

  public constructor(public readonly parent?: Scope) {}

  public define(
    name: string,
    value: RuntimeValue,
    declaredType?: TypeReference,
  ): void {
    this.bindings.set(name, value);
    this.builtins.delete(name);
    if (declaredType) this.declaredTypes.set(name, declaredType);
  }

  /** Defines a host-provided binding that the inspector can hide. */
  public defineBuiltin(name: string, value: RuntimeValue): void {
    this.bindings.set(name, value);
    this.declaredTypes.delete(name);
    this.builtins.add(name);
  }

  public isBuiltin(name: string): boolean {
    return this.builtins.has(name);
  }

  public assign(name: string, value: RuntimeValue): void {
    if (this.bindings.has(name)) {
      this.bindings.set(name, value);
      return;
    }
    if (this.parent) {
      this.parent.assign(name, value);
      return;
    }
    throw new Error(`Cannot assign to undefined variable '${name}'.`);
  }

  public defineOrAssign(name: string, value: RuntimeValue): void {
    if (this.has(name)) this.assign(name, value);
    else this.define(name, value);
  }

  public declaredType(name: string): TypeReference | undefined {
    return this.declaredTypes.get(name) ?? this.parent?.declaredType(name);
  }

  public get(name: string): RuntimeValue {
    if (this.bindings.has(name)) return this.bindings.get(name)!;
    if (this.parent) return this.parent.get(name);
    throw new Error(`Undefined variable '${name}'.`);
  }

  public has(name: string): boolean {
    return this.bindings.has(name) || (this.parent?.has(name) ?? false);
  }

  /** Checks only the bindings declared directly in this scope. */
  public hasOwn(name: string): boolean {
    return this.bindings.has(name);
  }

  /** Reads a binding declared directly in this scope. */
  public getOwn(name: string): RuntimeValue | undefined {
    return this.bindings.get(name);
  }

  public entries(): readonly [string, RuntimeValue][] {
    return [...this.bindings.entries()];
  }

  public clear(): void {
    this.bindings.clear();
    this.declaredTypes.clear();
    this.builtins.clear();
  }
  public get parentScope(): Scope | undefined {
    return this.parent;
  }
}
