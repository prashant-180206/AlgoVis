import { SourceLocation } from "../language/SourceLocation";

export type RuntimePrimitive = number | string | boolean | null;
export type RuntimeValue = PrimitiveValue | ArrayValue | FunctionValue;

export class PrimitiveValue {
  public constructor(public readonly value: RuntimePrimitive) {}
}

export class ArrayValue {
  public readonly kind = "array" as const;
  public constructor(public readonly id: string, public readonly values: RuntimeValue[], public readonly activeIndices: Set<number> = new Set()) {}

  public copy(): ArrayValue { return new ArrayValue(this.id, [...this.values], new Set(this.activeIndices)); }

  public read(index: number): RuntimeValue {
    this.assertIndex(index);
    return this.values[index];
  }

  public write(index: number, value: RuntimeValue): void {
    this.assertIndex(index);
    this.values[index] = value;
  }

  public activate(...indices: number[]): void { indices.forEach((index) => this.assertIndex(index)); indices.forEach((index) => this.activeIndices.add(index)); }
  public clearActive(): void { this.activeIndices.clear(); }
  public get length(): number { return this.values.length; }

  private assertIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.values.length) throw new Error(`Array index ${index} is out of bounds.`);
  }
}

export class FunctionValue {
  public readonly kind = "function" as const;
  public constructor(
    public readonly name: string,
    public readonly parameters: readonly string[],
    public readonly declarationLocation: SourceLocation,
    public readonly call: (...argumentsList: RuntimeValue[]) => RuntimeValue,
  ) {}
}

export function displayValue(value: RuntimeValue): string {
  if (value instanceof ArrayValue) return `[${value.values.map(displayValue).join(", ")}]`;
  if (value instanceof FunctionValue) return `<function ${value.name}>`;
  return value.value === null ? "null" : String(value.value);
}
