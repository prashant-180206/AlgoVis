import { RuntimeValue } from "./Values";
import { TypeReference } from "../language/Ast";

export class Scope {
  private static nextId = 0;
  public readonly id = `env-${++Scope.nextId}`;
  private readonly bindings = new Map<string, RuntimeValue>();
  private readonly declaredTypes = new Map<string, TypeReference>();

  public constructor(public readonly parent?: Scope) {}

  public define(
    name: string,
    value: RuntimeValue,
    declaredType?: TypeReference,
  ): void {
    this.bindings.set(name, value);
    if (declaredType) this.declaredTypes.set(name, declaredType);
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

  public entries(): readonly [string, RuntimeValue][] {
    return [...this.bindings.entries()];
  }

  public clear(): void {
    this.bindings.clear();
    this.declaredTypes.clear();
  }
  public get parentScope(): Scope | undefined {
    return this.parent;
  }
}
