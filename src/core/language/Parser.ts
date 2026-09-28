import {
  ArrayExpression,
  AssignmentStatement,
  BinaryExpression,
  CallExpression,
  Expression,
  ExpressionStatement,
  IdentifierExpression,
  IndexExpression,
  LiteralExpression,
  Program,
  Statement,
} from "./Ast";
import { SourceLocation } from "./SourceLocation";
import { Token, TokenType } from "./Token";

export class ParserError extends Error {
  public constructor(message: string, public readonly location: SourceLocation) {
    super(message);
    this.name = "ParserError";
  }
}

export class Parser {
  private cursor = 0;

  public constructor(private readonly tokens: readonly Token[]) {}

  public parse(): Program {
    const statements: Statement[] = [];
    while (!this.check(TokenType.Eof)) {
      if (this.match(TokenType.Newline)) continue;
      statements.push(this.statement());
      this.match(TokenType.Newline);
    }
    const location = statements[0]?.location ?? this.peek().location;
    return new Program(location, statements);
  }

  private statement(): Statement {
    const expression = this.expression();
    if (expression instanceof IdentifierExpression && this.match(TokenType.Equal)) {
      return new AssignmentStatement(expression.location, expression, this.expression());
    }
    return new ExpressionStatement(expression.location, expression);
  }

  private expression(): Expression {
    return this.binaryExpression(0);
  }

  private binaryExpression(minPrecedence: number): Expression {
    let left = this.primary();
    while (this.precedence(this.peek().type) > minPrecedence) {
      const operator = this.advance();
      const right = this.binaryExpression(this.precedence(operator.type));
      left = new BinaryExpression(this.join(left.location, right.location), left, operator.lexeme, right);
    }
    return left;
  }

  private primary(): Expression {
    const token = this.advance();
    let expression: Expression;
    if (token.type === TokenType.Number || token.type === TokenType.String || token.type === TokenType.True || token.type === TokenType.False || token.type === TokenType.Null) {
      expression = new LiteralExpression(token.location, token.literal ?? null);
    } else if (token.type === TokenType.Identifier) {
      expression = new IdentifierExpression(token.location, token.lexeme);
    } else if (token.type === TokenType.LeftBracket) {
      expression = this.arrayLiteral(token);
    } else if (token.type === TokenType.LeftParen) {
      expression = this.expression();
      this.consume(TokenType.RightParen, "Expected ')' after expression.");
    } else {
      throw new ParserError(`Expected an expression, received '${token.lexeme}'.`, token.location);
    }
    return this.postfix(expression);
  }

  private postfix(expression: Expression): Expression {
    while (true) {
      if (this.match(TokenType.LeftParen)) {
        const argumentsList: Expression[] = [];
        while (!this.check(TokenType.RightParen) && !this.check(TokenType.Eof)) {
          argumentsList.push(this.expression());
          if (!this.match(TokenType.Comma)) break;
        }
        const closing = this.consume(TokenType.RightParen, "Expected ')' after arguments.");
        expression = new CallExpression(this.join(expression.location, closing.location), expression, argumentsList);
      } else if (this.match(TokenType.LeftBracket)) {
        const index = this.expression();
        const closing = this.consume(TokenType.RightBracket, "Expected ']' after index.");
        expression = new IndexExpression(this.join(expression.location, closing.location), expression, index);
      } else {
        return expression;
      }
    }
  }

  private arrayLiteral(start: Token): Expression {
    const elements: Expression[] = [];
    while (!this.check(TokenType.RightBracket) && !this.check(TokenType.Eof)) {
      elements.push(this.expression());
      if (!this.match(TokenType.Comma)) break;
    }
    const end = this.consume(TokenType.RightBracket, "Expected ']' after array literal.");
    return new ArrayExpression(this.join(start.location, end.location), elements);
  }

  private precedence(type: TokenType): number {
    if (type === TokenType.EqualEqual || type === TokenType.BangEqual || type === TokenType.Greater || type === TokenType.GreaterEqual || type === TokenType.Less || type === TokenType.LessEqual) return 1;
    if (type === TokenType.Plus || type === TokenType.Minus) return 2;
    if (type === TokenType.Star || type === TokenType.Slash) return 3;
    return 0;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new ParserError(message, this.peek().location);
  }

  private match(type: TokenType): boolean { if (!this.check(type)) return false; this.advance(); return true; }
  private check(type: TokenType): boolean { return this.peek().type === type; }
  private advance(): Token { const token = this.peek(); if (!this.check(TokenType.Eof)) this.cursor += 1; return token; }
  private peek(): Token { return this.tokens[Math.min(this.cursor, this.tokens.length - 1)]; }
  private join(start: SourceLocation, end: SourceLocation): SourceLocation { return new SourceLocation(start.start, end.end); }
}
