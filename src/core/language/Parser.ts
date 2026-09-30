import {
  ArrayExpression,
  AssignmentStatement,
  BinaryExpression,
  BlockStatement,
  BreakStatement,
  CallExpression,
  ContinueStatement,
  Expression,
  ExpressionStatement,
  ForStatement,
  FunctionDeclaration,
  IdentifierExpression,
  IfStatement,
  IndexExpression,
  LiteralExpression,
  MemberExpression,
  NewExpression,
  ObjectExpression,
  Program,
  ReturnStatement,
  Statement,
  ThisExpression,
  UnaryExpression,
  VariableDeclarationStatement,
  WhileStatement,
  ClassDeclaration,
} from "./Ast";
import { SourceLocation } from "./SourceLocation";
import { Token, TokenType } from "./Token";

export class ParserError extends Error {
  public constructor(
    message: string,
    public readonly location: SourceLocation,
  ) {
    super(message);
    this.name = "ParserError";
  }
}

export class Parser {
  private cursor = 0;
  public constructor(private readonly tokens: readonly Token[]) {}
  public parse(): Program {
    const statements: Statement[] = [];
    this.skipSeparators();
    while (!this.check(TokenType.Eof)) {
      statements.push(this.statement());
      this.skipSeparators();
    }
    return new Program(
      statements[0]?.location ?? this.peek().location,
      statements,
    );
  }

  private statement(): Statement {
    if (this.match(TokenType.LeftBrace)) return this.block(this.previous());
    if (this.match(TokenType.Let, TokenType.Const, TokenType.Var))
      return this.variableDeclaration(this.previous());
    if (this.match(TokenType.Function))
      return this.functionDeclaration(this.previous());
    if (this.match(TokenType.Class))
      return this.classDeclaration(this.previous());
    if (this.match(TokenType.If)) return this.ifStatement(this.previous());
    if (this.match(TokenType.While))
      return this.whileStatement(this.previous());
    if (this.match(TokenType.For)) return this.forStatement(this.previous());
    if (this.match(TokenType.Return))
      return this.returnStatement(this.previous());
    if (this.match(TokenType.Break)) {
      const statement = new BreakStatement(this.previous().location);
      this.consumeOptionalSemicolon();
      return statement;
    }
    if (this.match(TokenType.Continue)) {
      const statement = new ContinueStatement(this.previous().location);
      this.consumeOptionalSemicolon();
      return statement;
    }
    const expression = this.expression();
    if (
      this.match(
        TokenType.Equal,
        TokenType.PlusEqual,
        TokenType.MinusEqual,
        TokenType.StarEqual,
        TokenType.SlashEqual,
      )
    ) {
      const operator = this.previous();
      const value = this.expression();
      this.consumeOptionalSemicolon();
      return new AssignmentStatement(
        this.join(expression.location, value.location),
        expression,
        value,
        operator.lexeme,
      );
    }
    this.consumeOptionalSemicolon();
    return new ExpressionStatement(expression.location, expression);
  }

  private variableDeclaration(
    keyword: Token,
    consumeSemicolon = true,
  ): Statement {
    const name = this.consume(
      TokenType.Identifier,
      "Expected a variable name.",
    );
    const initializer = this.match(TokenType.Equal)
      ? this.expression()
      : undefined;
    if (consumeSemicolon) this.consumeOptionalSemicolon();
    return new VariableDeclarationStatement(
      this.join(keyword.location, initializer?.location ?? name.location),
      keyword.lexeme as "let" | "const" | "var",
      name.lexeme,
      initializer,
    );
  }
  private functionDeclaration(keyword: Token): Statement {
    const name = this.consume(
      TokenType.Identifier,
      "Expected a function name.",
    );
    this.consume(TokenType.LeftParen, "Expected '(' after function name.");
    const parameters: string[] = [];
    while (!this.check(TokenType.RightParen)) {
      parameters.push(
        this.consume(TokenType.Identifier, "Expected a parameter name.").lexeme,
      );
      if (!this.match(TokenType.Comma)) break;
    }
    this.consume(TokenType.RightParen, "Expected ')' after parameters.");
    this.consume(TokenType.LeftBrace, "Expected '{' before function body.");
    const body = this.block(this.previous());
    return new FunctionDeclaration(
      this.join(keyword.location, body.location),
      name.lexeme,
      parameters,
      body,
    );
  }
  private classDeclaration(keyword: Token): Statement {
    const name = this.consume(TokenType.Identifier, "Expected a class name.");
    this.consume(TokenType.LeftBrace, "Expected '{' before class body.");
    const methods: FunctionDeclaration[] = [];
    this.skipSeparators();
    while (!this.check(TokenType.RightBrace) && !this.check(TokenType.Eof)) {
      const methodName = this.consume(
        TokenType.Identifier,
        `Expected a method name in class body, received '${this.peek().lexeme}' (${this.peek().type}).`,
      );
      this.consume(TokenType.LeftParen, "Expected '(' after method name.");
      const parameters: string[] = [];
      while (!this.check(TokenType.RightParen)) {
        parameters.push(
          this.consume(TokenType.Identifier, "Expected a parameter name.")
            .lexeme,
        );
        if (!this.match(TokenType.Comma)) break;
      }
      this.consume(
        TokenType.RightParen,
        "Expected ')' after method parameters.",
      );
      this.consume(TokenType.LeftBrace, "Expected '{' before method body.");
      const body = this.block(this.previous());
      methods.push(
        new FunctionDeclaration(
          this.join(methodName.location, body.location),
          methodName.lexeme,
          parameters,
          body,
        ),
      );
      this.skipSeparators();
    }
    const end = this.consume(
      TokenType.RightBrace,
      "Expected '}' after class body.",
    );
    return new ClassDeclaration(
      this.join(keyword.location, end.location),
      name.lexeme,
      methods,
    );
  }
  private ifStatement(keyword: Token): Statement {
    this.consume(TokenType.LeftParen, "Expected '(' after 'if'.");
    const condition = this.expression();
    this.consume(TokenType.RightParen, "Expected ')' after condition.");
    const thenBranch = this.statement();
    const elseBranch = this.match(TokenType.Else)
      ? this.statement()
      : undefined;
    return new IfStatement(
      this.join(keyword.location, (elseBranch ?? thenBranch).location),
      condition,
      thenBranch,
      elseBranch,
    );
  }
  private whileStatement(keyword: Token): Statement {
    this.consume(TokenType.LeftParen, "Expected '(' after 'while'.");
    const condition = this.expression();
    this.consume(TokenType.RightParen, "Expected ')' after condition.");
    const body = this.statement();
    return new WhileStatement(
      this.join(keyword.location, body.location),
      condition,
      body,
    );
  }
  private forStatement(keyword: Token): Statement {
    this.consume(TokenType.LeftParen, "Expected '(' after 'for'.");
    let initializer: Statement | Expression | undefined;
    if (!this.check(TokenType.Semicolon))
      initializer = this.match(TokenType.Let, TokenType.Const, TokenType.Var)
        ? this.variableDeclaration(this.previous(), false)
        : this.expression();
    this.consume(TokenType.Semicolon, "Expected ';' after for initializer.");
    const condition = this.check(TokenType.Semicolon)
      ? undefined
      : this.expression();
    this.consume(TokenType.Semicolon, "Expected ';' after for condition.");
    const increment = this.check(TokenType.RightParen)
      ? undefined
      : this.expression();
    this.consume(TokenType.RightParen, "Expected ')' after for clauses.");
    const body = this.statement();
    return new ForStatement(
      this.join(keyword.location, body.location),
      initializer,
      condition,
      increment,
      body,
    );
  }
  private returnStatement(keyword: Token): Statement {
    const value =
      this.check(TokenType.Semicolon) ||
      this.check(TokenType.Newline) ||
      this.check(TokenType.RightBrace)
        ? undefined
        : this.expression();
    this.consumeOptionalSemicolon();
    return new ReturnStatement(
      this.join(keyword.location, value?.location ?? keyword.location),
      value,
    );
  }
  private block(start: Token): BlockStatement {
    const statements: Statement[] = [];
    this.skipSeparators();
    while (!this.check(TokenType.RightBrace) && !this.check(TokenType.Eof)) {
      statements.push(this.statement());
      this.skipSeparators();
    }
    const end = this.consume(TokenType.RightBrace, "Expected '}' after block.");
    return new BlockStatement(
      this.join(start.location, end.location),
      statements,
    );
  }

  private expression(): Expression {
    return this.assignmentExpression();
  }
  private assignmentExpression(): Expression {
    let expression = this.binaryExpression(0);
    if (
      this.match(
        TokenType.Equal,
        TokenType.PlusEqual,
        TokenType.MinusEqual,
        TokenType.StarEqual,
        TokenType.SlashEqual,
      )
    ) {
      const operator = this.previous();
      const value = this.assignmentExpression();
      return new BinaryExpression(
        this.join(expression.location, value.location),
        expression,
        operator.lexeme,
        value,
      );
    }
    return expression;
  }
  private binaryExpression(minPrecedence: number): Expression {
    let left = this.unary();
    while (this.precedence(this.peek().type) > minPrecedence) {
      const operator = this.advance();
      const right = this.binaryExpression(this.precedence(operator.type));
      left = new BinaryExpression(
        this.join(left.location, right.location),
        left,
        operator.lexeme,
        right,
      );
    }
    return left;
  }
  private unary(): Expression {
    if (
      this.match(
        TokenType.Bang,
        TokenType.Minus,
        TokenType.Plus,
        TokenType.PlusPlus,
        TokenType.MinusMinus,
      )
    ) {
      const operator = this.previous();
      const operand = this.unary();
      return new UnaryExpression(
        this.join(operator.location, operand.location),
        operator.lexeme,
        operand,
      );
    }
    let expression = this.primary();
    if (this.match(TokenType.PlusPlus, TokenType.MinusMinus)) {
      const operator = this.previous();
      expression = new UnaryExpression(
        this.join(expression.location, operator.location),
        operator.lexeme,
        expression,
        false,
      );
    }
    return expression;
  }
  private primary(): Expression {
    const token = this.advance();
    let expression: Expression;
    if (token.type === TokenType.New) {
      const callee = this.primary();
      if (!(callee instanceof CallExpression))
        throw new ParserError(
          "Expected a constructor call after 'new'.",
          token.location,
        );
      expression = new NewExpression(
        this.join(token.location, callee.location),
        callee.callee,
        callee.argumentsList,
      );
    } else if (
      token.type === TokenType.Number ||
      token.type === TokenType.String ||
      token.type === TokenType.True ||
      token.type === TokenType.False ||
      token.type === TokenType.Null ||
      token.type === TokenType.Undefined
    )
      expression = new LiteralExpression(
        token.location,
        token.type === TokenType.Undefined
          ? undefined
          : (token.literal ?? null),
      );
    else if (token.type === TokenType.Identifier)
      expression = new IdentifierExpression(token.location, token.lexeme);
    else if (token.type === TokenType.This)
      expression = new ThisExpression(token.location);
    else if (token.type === TokenType.LeftBracket)
      expression = this.arrayLiteral(token);
    else if (token.type === TokenType.LeftBrace)
      expression = this.objectLiteral(token);
    else if (token.type === TokenType.LeftParen) {
      expression = this.expression();
      this.consume(TokenType.RightParen, "Expected ')' after expression.");
    } else
      throw new ParserError(
        `Expected an expression, received '${token.lexeme}'.`,
        token.location,
      );
    return this.postfix(expression);
  }
  private postfix(expression: Expression): Expression {
    while (true) {
      if (this.match(TokenType.LeftParen)) {
        const args: Expression[] = [];
        while (!this.check(TokenType.RightParen)) {
          args.push(this.expression());
          if (!this.match(TokenType.Comma)) break;
        }
        const end = this.consume(
          TokenType.RightParen,
          "Expected ')' after arguments.",
        );
        expression = new CallExpression(
          this.join(expression.location, end.location),
          expression,
          args,
        );
      } else if (this.match(TokenType.LeftBracket)) {
        const index = this.expression();
        const end = this.consume(
          TokenType.RightBracket,
          "Expected ']' after index.",
        );
        expression = new IndexExpression(
          this.join(expression.location, end.location),
          expression,
          index,
        );
      } else if (this.match(TokenType.Dot)) {
        const member = this.consume(
          TokenType.Identifier,
          "Expected a member name after '.'.",
        );
        expression = new MemberExpression(
          this.join(expression.location, member.location),
          expression,
          member.lexeme,
        );
      } else return expression;
    }
  }
  private arrayLiteral(start: Token): Expression {
    const elements: Expression[] = [];
    while (!this.check(TokenType.RightBracket)) {
      elements.push(this.expression());
      if (!this.match(TokenType.Comma)) break;
    }
    const end = this.consume(
      TokenType.RightBracket,
      "Expected ']' after array literal.",
    );
    return new ArrayExpression(
      this.join(start.location, end.location),
      elements,
    );
  }
  private objectLiteral(start: Token): Expression {
    const properties: { key: string; value: Expression }[] = [];
    while (!this.check(TokenType.RightBrace)) {
      const key = this.advance();
      if (
        key.type !== TokenType.Identifier &&
        key.type !== TokenType.String &&
        key.type !== TokenType.Number
      )
        throw new ParserError(
          "Expected an object property name.",
          key.location,
        );
      this.consume(TokenType.Colon, "Expected ':' after property name.");
      properties.push({
        key: key.lexeme.replace(/^['"]|['"]$/g, ""),
        value: this.expression(),
      });
      if (!this.match(TokenType.Comma)) break;
    }
    const end = this.consume(
      TokenType.RightBrace,
      "Expected '}' after object literal.",
    );
    return new ObjectExpression(
      this.join(start.location, end.location),
      properties,
    );
  }
  private precedence(type: TokenType): number {
    if (type === TokenType.Or) return 1;
    if (type === TokenType.And) return 2;
    if (
      type === TokenType.EqualEqual ||
      type === TokenType.StrictEqual ||
      type === TokenType.BangEqual ||
      type === TokenType.StrictBangEqual
    )
      return 3;
    if (
      type === TokenType.Greater ||
      type === TokenType.GreaterEqual ||
      type === TokenType.Less ||
      type === TokenType.LessEqual ||
      type === TokenType.In
    )
      return 4;
    if (type === TokenType.Plus || type === TokenType.Minus) return 5;
    if (
      type === TokenType.Star ||
      type === TokenType.Slash ||
      type === TokenType.Percent
    )
      return 6;
    return 0;
  }
  private skipSeparators(): void {
    while (this.match(TokenType.Newline, TokenType.Semicolon)) {}
  }
  private consumeOptionalSemicolon(): void {
    this.match(TokenType.Semicolon);
  }
  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new ParserError(message, this.peek().location);
  }
  private match(...types: TokenType[]): boolean {
    if (!types.includes(this.peek().type)) return false;
    this.advance();
    return true;
  }
  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }
  private advance(): Token {
    const token = this.peek();
    if (!this.check(TokenType.Eof)) this.cursor += 1;
    return token;
  }
  private previous(): Token {
    return this.tokens[Math.max(0, this.cursor - 1)];
  }
  private peek(): Token {
    return this.tokens[Math.min(this.cursor, this.tokens.length - 1)];
  }
  private join(start: SourceLocation, end: SourceLocation): SourceLocation {
    return new SourceLocation(start.start, end.end);
  }
}
