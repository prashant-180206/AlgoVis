import { SourceLocation } from "./SourceLocation";

export abstract class AstNode {
  public constructor(public readonly location: SourceLocation) {}
}

export abstract class Statement extends AstNode {}
export abstract class Expression extends AstNode {}

export class Program extends AstNode {
  public constructor(location: SourceLocation, public readonly statements: readonly Statement[]) { super(location); }
}

export class IdentifierExpression extends Expression {
  public constructor(location: SourceLocation, public readonly name: string) { super(location); }
}

export class LiteralExpression extends Expression {
  public constructor(location: SourceLocation, public readonly value: number | string | boolean | null) { super(location); }
}

export class ArrayExpression extends Expression {
  public constructor(location: SourceLocation, public readonly elements: readonly Expression[]) { super(location); }
}

export class BinaryExpression extends Expression {
  public constructor(location: SourceLocation, public readonly left: Expression, public readonly operator: string, public readonly right: Expression) { super(location); }
}

export class CallExpression extends Expression {
  public constructor(location: SourceLocation, public readonly callee: Expression, public readonly argumentsList: readonly Expression[]) { super(location); }
}

export class AssignmentStatement extends Statement {
  public constructor(location: SourceLocation, public readonly target: IdentifierExpression, public readonly value: Expression) { super(location); }
}

export class ExpressionStatement extends Statement {
  public constructor(location: SourceLocation, public readonly expression: Expression) { super(location); }
}

export class BlockStatement extends Statement {
  public constructor(location: SourceLocation, public readonly statements: readonly Statement[]) { super(location); }
}

export class IfStatement extends Statement {
  public constructor(location: SourceLocation, public readonly condition: Expression, public readonly thenBranch: BlockStatement, public readonly elseBranch?: BlockStatement) { super(location); }
}

export class FunctionDeclaration extends Statement {
  public constructor(location: SourceLocation, public readonly name: string, public readonly parameters: readonly string[], public readonly body: BlockStatement) { super(location); }
}

export class ReturnStatement extends Statement {
  public constructor(location: SourceLocation, public readonly value?: Expression) { super(location); }
}
