import { SourceLocation } from "./SourceLocation";

export abstract class AstNode {
  public constructor(public readonly location: SourceLocation) {}
}
export abstract class Statement extends AstNode {}
export abstract class Expression extends AstNode {}

export class TypeReference extends AstNode {
  public constructor(
    location: SourceLocation,
    public readonly name: string,
    public readonly typeArguments: readonly TypeReference[] = [],
  ) {
    super(location);
  }
  public toString(): string {
    return this.typeArguments.length === 0
      ? this.name
      : `${this.name}<${this.typeArguments.join(", ")}>`;
  }
}
export class Program extends AstNode {
  public constructor(
    location: SourceLocation,
    public readonly statements: readonly Statement[],
  ) {
    super(location);
  }
}
export class IdentifierExpression extends Expression {
  public constructor(
    location: SourceLocation,
    public readonly name: string,
  ) {
    super(location);
  }
}
export class ThisExpression extends Expression {
  public constructor(location: SourceLocation) {
    super(location);
  }
}
export class NewExpression extends Expression {
  public constructor(
    location: SourceLocation,
    public readonly callee: Expression,
    public readonly argumentsList: readonly Expression[],
  ) {
    super(location);
  }
}
export class LiteralExpression extends Expression {
  public constructor(
    location: SourceLocation,
    public readonly value: number | string | boolean | null | undefined,
  ) {
    super(location);
  }
}
export class ArrayExpression extends Expression {
  public constructor(
    location: SourceLocation,
    public readonly elements: readonly Expression[],
  ) {
    super(location);
  }
}
export interface ObjectProperty {
  readonly key: string;
  readonly value: Expression;
}
export class ObjectExpression extends Expression {
  public constructor(
    location: SourceLocation,
    public readonly properties: readonly ObjectProperty[],
  ) {
    super(location);
  }
}
export class UnaryExpression extends Expression {
  public constructor(
    location: SourceLocation,
    public readonly operator: string,
    public readonly operand: Expression,
    public readonly prefix = true,
  ) {
    super(location);
  }
}
export class BinaryExpression extends Expression {
  public constructor(
    location: SourceLocation,
    public readonly left: Expression,
    public readonly operator: string,
    public readonly right: Expression,
  ) {
    super(location);
  }
}
export class CallExpression extends Expression {
  public constructor(
    location: SourceLocation,
    public readonly callee: Expression,
    public readonly argumentsList: readonly Expression[],
  ) {
    super(location);
  }
}
export class IndexExpression extends Expression {
  public constructor(
    location: SourceLocation,
    public readonly object: Expression,
    public readonly index: Expression,
  ) {
    super(location);
  }
}
export class MemberExpression extends Expression {
  public constructor(
    location: SourceLocation,
    public readonly object: Expression,
    public readonly member: string,
  ) {
    super(location);
  }
}

export class BlockStatement extends Statement {
  public constructor(
    location: SourceLocation,
    public readonly statements: readonly Statement[],
  ) {
    super(location);
  }
}
export class AssignmentStatement extends Statement {
  public constructor(
    location: SourceLocation,
    public readonly target: Expression,
    public readonly value: Expression,
    public readonly operator = "=",
  ) {
    super(location);
  }
}
export class VariableDeclarationStatement extends Statement {
  public constructor(
    location: SourceLocation,
    public readonly kind: "let" | "const" | "var",
    public readonly name: string,
    public readonly initializer?: Expression,
  ) {
    super(location);
  }
}
export class ExpressionStatement extends Statement {
  public constructor(
    location: SourceLocation,
    public readonly expression: Expression,
  ) {
    super(location);
  }
}
export class IfStatement extends Statement {
  public constructor(
    location: SourceLocation,
    public readonly condition: Expression,
    public readonly thenBranch: Statement,
    public readonly elseBranch?: Statement,
  ) {
    super(location);
  }
}
export class WhileStatement extends Statement {
  public constructor(
    location: SourceLocation,
    public readonly condition: Expression,
    public readonly body: Statement,
  ) {
    super(location);
  }
}
export class ForStatement extends Statement {
  public constructor(
    location: SourceLocation,
    public readonly initializer: Statement | Expression | undefined,
    public readonly condition: Expression | undefined,
    public readonly increment: Expression | undefined,
    public readonly body: Statement,
  ) {
    super(location);
  }
}
export class FunctionDeclaration extends Statement {
  public constructor(
    location: SourceLocation,
    public readonly name: string,
    public readonly parameters: readonly string[],
    public readonly body: BlockStatement,
  ) {
    super(location);
  }
}
export class ClassDeclaration extends Statement {
  public constructor(
    location: SourceLocation,
    public readonly name: string,
    public readonly methods: readonly FunctionDeclaration[],
  ) {
    super(location);
  }
}
export class ReturnStatement extends Statement {
  public constructor(
    location: SourceLocation,
    public readonly value?: Expression,
  ) {
    super(location);
  }
}
export class BreakStatement extends Statement {
  public constructor(location: SourceLocation) {
    super(location);
  }
}
export class ContinueStatement extends Statement {
  public constructor(location: SourceLocation) {
    super(location);
  }
}
