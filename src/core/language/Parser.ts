import {
  ArrayBindingPattern,
  ArrayExpression,
  AssignmentStatement,
  BinaryExpression,
  BindingPattern,
  BlockStatement,
  BreakStatement,
  CallExpression,
  ClassDeclaration,
  ContinueStatement,
  Expression,
  ExpressionStatement,
  ForStatement,
  FunctionDeclaration,
  IdentifierExpression,
  IdentifierPattern,
  IfStatement,
  ImportDeclaration,
  ImportSpecifier,
  IndexExpression,
  LiteralExpression,
  MemberExpression,
  NewExpression,
  ObjectBindingPattern,
  ObjectExpression,
  ObjectPatternProperty,
  Program,
  ReturnStatement,
  Statement,
  ThisExpression,
  UnaryExpression,
  VariableDeclarationStatement,
  WhileStatement,
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
      if (this.match(TokenType.Import)) {
        statements.push(this.importDeclaration(this.previous()));
      } else if (this.match(TokenType.Export)) {
        statements.push(this.exportDeclaration(this.previous()));
      } else {
        statements.push(this.statement());
      }
      this.skipSeparators();
    }
    return new Program(
      statements[0]?.location ?? this.peek().location,
      statements,
    );
  }

  private importDeclaration(keyword: Token): ImportDeclaration {
    this.skipNewlines();
    if (this.match(TokenType.String)) {
      const source = this.previous();
      this.consumeOptionalSemicolon();
      return new ImportDeclaration(
        this.join(keyword.location, source.location),
        source.literal as string,
      );
    }

    const specifiers: ImportSpecifier[] = [];
    let namespace: string | undefined;
    if (this.match(TokenType.Star)) {
      this.skipNewlines();
      this.consume(TokenType.As, "Expected 'as' after '*' in import.");
      this.skipNewlines();
      namespace = this.consume(
        TokenType.Identifier,
        "Expected a namespace name after 'as'.",
      ).lexeme;
    } else {
      this.consume(
        TokenType.LeftBrace,
        "Expected '{', '*', or a module path after 'import'.",
      );
      this.skipNewlines();
      while (!this.check(TokenType.RightBrace)) {
        const imported = this.consume(
          TokenType.Identifier,
          "Expected an imported name.",
        ).lexeme;
        let local = imported;
        this.skipNewlines();
        if (this.match(TokenType.As)) {
          this.skipNewlines();
          local = this.consume(
            TokenType.Identifier,
            "Expected a local name after 'as'.",
          ).lexeme;
        }
        specifiers.push({ imported, local });
        this.skipNewlines();
        if (!this.match(TokenType.Comma)) break;
        this.skipNewlines();
      }
      this.consume(TokenType.RightBrace, "Expected '}' after import list.");
    }

    this.skipNewlines();
    this.consume(TokenType.From, "Expected 'from' after import list.");
    this.skipNewlines();
    const source = this.consume(
      TokenType.String,
      "Expected a module path string.",
    );
    this.consumeOptionalSemicolon();
    return new ImportDeclaration(
      this.join(keyword.location, source.location),
      source.literal as string,
      specifiers,
      namespace,
    );
  }

  private exportDeclaration(keyword: Token): Statement {
    if (this.match(TokenType.Class))
      return this.classDeclaration(this.previous());
    if (this.match(TokenType.Function))
      return this.functionDeclaration(this.previous());
    if (this.match(TokenType.Let, TokenType.Const, TokenType.Var))
      return this.variableDeclaration(this.previous());
    throw new ParserError(
      "Expected a class, function, or variable declaration after 'export'.",
      keyword.location,
    );
  }

  private statement(): Statement {
    if (this.check(TokenType.Import) || this.check(TokenType.Export))
      throw new ParserError(
        "Import and export declarations are only allowed at the top level.",
        this.peek().location,
      );
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

  private bindingPattern(): BindingPattern {
    this.skipNewlines();
    if (this.match(TokenType.Identifier)) {
      const identifier = this.previous();
      return new IdentifierPattern(identifier.location, identifier.lexeme);
    }
    if (this.match(TokenType.LeftBrace)) {
      return this.objectBindingPattern(this.previous());
    }
    if (this.match(TokenType.LeftBracket)) {
      return this.arrayBindingPattern(this.previous());
    }
    throw new ParserError(
      "Expected a binding name or destructuring pattern.",
      this.peek().location,
    );
  }
  private objectBindingPattern(start: Token): ObjectBindingPattern {
    const properties: ObjectPatternProperty[] = [];
    this.skipNewlines();
    while (!this.check(TokenType.RightBrace)) {
      const key = this.advance();
      if (
        key.type !== TokenType.Identifier &&
        key.type !== TokenType.String &&
        key.type !== TokenType.Number
      )
        throw new ParserError(
          "Expected a property name in the object pattern.",
          key.location,
        );
      const keyName = key.lexeme.replace(/^['"]|['"]$/g, "");
      let value: BindingPattern;
      if (this.match(TokenType.Colon)) {
        value = this.bindingPattern();
      } else {
        if (key.type !== TokenType.Identifier)
          throw new ParserError(
            "Object shorthand bindings must use identifiers.",
            key.location,
          );
        value = new IdentifierPattern(key.location, key.lexeme);
      }
      properties.push(
        new ObjectPatternProperty(
          this.join(key.location, value.location),
          keyName,
          value,
        ),
      );
      this.skipNewlines();
      if (!this.match(TokenType.Comma)) break;
      this.skipNewlines();
    }
    const end = this.consume(
      TokenType.RightBrace,
      "Expected '}' after object pattern.",
    );
    return new ObjectBindingPattern(
      this.join(start.location, end.location),
      properties,
    );
  }
  private arrayBindingPattern(start: Token): ArrayBindingPattern {
    const elements: (BindingPattern | undefined)[] = [];
    this.skipNewlines();
    while (!this.check(TokenType.RightBracket)) {
      if (this.match(TokenType.Comma)) {
        elements.push(undefined);
        this.skipNewlines();
        continue;
      }
      elements.push(this.bindingPattern());
      this.skipNewlines();
      if (!this.match(TokenType.Comma)) break;
      this.skipNewlines();
    }
    const end = this.consume(
      TokenType.RightBracket,
      "Expected ']' after array pattern.",
    );
    return new ArrayBindingPattern(
      this.join(start.location, end.location),
      elements,
    );
  }
  private variableDeclaration(
    keyword: Token,
    consumeSemicolon = true,
  ): Statement {
    const pattern = this.bindingPattern();
    const initializer = this.match(TokenType.Equal)
      ? this.expression()
      : undefined;
    if (consumeSemicolon) this.consumeOptionalSemicolon();
    return new VariableDeclarationStatement(
      this.join(keyword.location, initializer?.location ?? pattern.location),
      keyword.lexeme as "let" | "const" | "var",
      pattern,
      initializer,
    );
  }
  private functionDeclaration(keyword: Token): Statement {
    const name = this.consume(
      TokenType.Identifier,
      "Expected a function name.",
    );
    this.consume(TokenType.LeftParen, "Expected '(' after function name.");
    const parameters: BindingPattern[] = [];
    this.skipNewlines();
    while (!this.check(TokenType.RightParen)) {
      parameters.push(this.bindingPattern());
      this.skipNewlines();
      if (!this.match(TokenType.Comma)) break;
      this.skipNewlines();
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
      const parameters: BindingPattern[] = [];
      this.skipNewlines();
      while (!this.check(TokenType.RightParen)) {
        parameters.push(this.bindingPattern());
        this.skipNewlines();
        if (!this.match(TokenType.Comma)) break;
        this.skipNewlines();
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
    this.skipNewlines();
    while (!this.check(TokenType.RightBracket)) {
      elements.push(this.expression());
      this.skipNewlines();
      if (!this.match(TokenType.Comma)) break;
      this.skipNewlines();
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
    this.skipNewlines();
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
      let value: Expression;
      if (this.match(TokenType.Colon)) {
        value = this.expression();
      } else {
        if (key.type !== TokenType.Identifier)
          throw new ParserError(
            "Object shorthand properties must use identifiers.",
            key.location,
          );
        value = new IdentifierExpression(key.location, key.lexeme);
      }
      properties.push({
        key: key.lexeme.replace(/^['"]|['"]$/g, ""),
        value,
      });
      this.skipNewlines();
      if (!this.match(TokenType.Comma)) break;
      this.skipNewlines();
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
  private skipNewlines(): void {
    while (this.match(TokenType.Newline)) {}
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
