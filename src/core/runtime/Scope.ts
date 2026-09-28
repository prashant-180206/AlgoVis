import { RuntimeValue } from "./Values";

export class Scope {
  private readonly bindings = new Map<string, RuntimeValue>();

  public constructor(public readonly parent?: Scope) {}

  public define(name: string, value: RuntimeValue): void { this.bindings.set(name, value); }

  public assign(name: string, value: RuntimeValue): void {
    if (this.bindings.has(name)) { this.bindings.set(name, value); return; }
    if (this.parent) { this.parent.assign(name, value); return; }
    throw new Error(`Cannot assign to undefined variable '${name}'.`);
  }

  public defineOrAssign(name: string, value: RuntimeValue): void {
    if (this.has(name)) this.assign(name, value);
    else this.define(name, value);
  }

  public get(name: string): RuntimeValue {
    const value = this.bindings.get(name);
    if (value !== undefined) return value;
    if (this.parent) return this.parent.get(name);
    throw new Error(`Undefined variable '${name}'.`);
  }

  public has(name: string): boolean { return this.bindings.has(name) || (this.parent?.has(name) ?? false); }

  public entries(): readonly [string, RuntimeValue][] { return [...this.bindings.entries()]; }
}
