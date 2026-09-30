import { SourceLocation, SourcePosition } from "./SourceLocation";
import { Token, TokenType } from "./Token";

export class LexerError extends Error {
  public constructor(
    message: string,
    public readonly location: SourceLocation,
  ) {
    super(message);
    this.name = "LexerError";
  }
}

const keywords: Readonly<Record<string, TokenType>> = {
  let: TokenType.Let,
  const: TokenType.Const,
  var: TokenType.Var,
  if: TokenType.If,
  else: TokenType.Else,
  for: TokenType.For,
  while: TokenType.While,
  in: TokenType.In,
  function: TokenType.Function,
  class: TokenType.Class,
  return: TokenType.Return,
  break: TokenType.Break,
  continue: TokenType.Continue,
  new: TokenType.New,
  this: TokenType.This,
  true: TokenType.True,
  false: TokenType.False,
  null: TokenType.Null,
  undefined: TokenType.Undefined,
};

export class Lexer {
  private readonly tokens: Token[] = [];
  private line = 1;
  private column = 1;
  private offset = 0;
  public constructor(private readonly source: string) {}

  public tokenize(): readonly Token[] {
    let index = 0;
    while (index < this.source.length) {
      const character = this.source[index];
      if (character === "\n") {
        this.addToken(TokenType.Newline, character, index, index + 1);
        this.advance(character);
        index += 1;
        continue;
      }
      if (/\s/.test(character)) {
        this.advance(character);
        index += 1;
        continue;
      }
      if (character === "/" && this.source[index + 1] === "/") {
        index = this.readLineComment(index);
        continue;
      }
      if (character === "/" && this.source[index + 1] === "*") {
        index = this.readBlockComment(index);
        continue;
      }
      if (this.isDigit(character)) {
        index = this.readNumber(index);
        continue;
      }
      if (this.isIdentifierStart(character)) {
        index = this.readIdentifier(index);
        continue;
      }
      if (character === '"' || character === "'") {
        index = this.readString(index, character);
        continue;
      }
      const operator = this.operatorAt(index);
      if (!operator)
        throw this.error(
          `Unexpected character '${character}'.`,
          index,
          index + 1,
        );
      this.addToken(
        operator.type,
        operator.lexeme,
        index,
        index + operator.lexeme.length,
      );
      this.consumeText(index, index + operator.lexeme.length);
      index += operator.lexeme.length;
    }
    this.tokens.push(
      new Token(
        TokenType.Eof,
        "",
        SourceLocation.point(this.line, this.column, this.offset),
      ),
    );
    return this.tokens;
  }

  private readNumber(index: number): number {
    const start = index;
    while (this.isDigit(this.source[index])) index += 1;
    if (this.source[index] === "." && this.isDigit(this.source[index + 1])) {
      index += 1;
      while (this.isDigit(this.source[index])) index += 1;
    }
    const lexeme = this.source.slice(start, index);
    this.addToken(TokenType.Number, lexeme, start, index, Number(lexeme));
    this.consumeText(start, index);
    return index;
  }
  private readIdentifier(index: number): number {
    const start = index;
    while (this.isIdentifierPart(this.source[index])) index += 1;
    const lexeme = this.source.slice(start, index);
    const type = Object.prototype.hasOwnProperty.call(keywords, lexeme)
      ? keywords[lexeme]
      : TokenType.Identifier;
    const literal =
      type === TokenType.True ? true : type === TokenType.False ? false : null;
    this.addToken(
      type,
      lexeme,
      start,
      index,
      type === TokenType.True ||
        type === TokenType.False ||
        type === TokenType.Null
        ? literal
        : undefined,
    );
    this.consumeText(start, index);
    return index;
  }
  private readString(index: number, quote: string): number {
    const start = index;
    index += 1;
    let value = "";
    while (
      index < this.source.length &&
      this.source[index] !== quote &&
      this.source[index] !== "\n"
    ) {
      if (this.source[index] === "\\" && index + 1 < this.source.length) {
        const escaped = this.source[index + 1];
        value += { n: "\n", r: "\r", t: "\t" }[escaped] ?? escaped;
        index += 2;
      } else {
        value += this.source[index];
        index += 1;
      }
    }
    if (this.source[index] !== quote)
      throw this.error("Unterminated string.", start, index);
    index += 1;
    this.addToken(
      TokenType.String,
      this.source.slice(start, index),
      start,
      index,
      value,
    );
    this.consumeText(start, index);
    return index;
  }
  private readLineComment(index: number): number {
    while (index < this.source.length && this.source[index] !== "\n") {
      this.advance(this.source[index]);
      index += 1;
    }
    return index;
  }
  private readBlockComment(index: number): number {
    const start = index;
    index += 2;
    while (
      index < this.source.length &&
      !(this.source[index] === "*" && this.source[index + 1] === "/")
    )
      index += 1;
    if (index >= this.source.length)
      throw this.error("Unterminated comment.", start, index);
    index += 2;
    this.consumeText(start, index);
    return index;
  }

  private operatorAt(
    index: number,
  ): { type: TokenType; lexeme: string } | undefined {
    const triple = (
      {
        "===": TokenType.StrictEqual,
        "!==": TokenType.StrictBangEqual,
      } as Readonly<Record<string, TokenType>>
    )[this.source.slice(index, index + 3)];
    if (triple)
      return { type: triple, lexeme: this.source.slice(index, index + 3) };
    const pair = this.source.slice(index, index + 2);
    const doubles: Readonly<Record<string, TokenType>> = {
      "==": TokenType.EqualEqual,
      "!=": TokenType.BangEqual,
      ">=": TokenType.GreaterEqual,
      "<=": TokenType.LessEqual,
      "&&": TokenType.And,
      "||": TokenType.Or,
      "++": TokenType.PlusPlus,
      "--": TokenType.MinusMinus,
      "+=": TokenType.PlusEqual,
      "-=": TokenType.MinusEqual,
      "*=": TokenType.StarEqual,
      "/=": TokenType.SlashEqual,
    };
    if (doubles[pair]) return { type: doubles[pair], lexeme: pair };
    const singles: Readonly<Record<string, TokenType>> = {
      "+": TokenType.Plus,
      "-": TokenType.Minus,
      "*": TokenType.Star,
      "/": TokenType.Slash,
      "%": TokenType.Percent,
      "=": TokenType.Equal,
      ">": TokenType.Greater,
      "<": TokenType.Less,
      "!": TokenType.Bang,
      "(": TokenType.LeftParen,
      ")": TokenType.RightParen,
      "[": TokenType.LeftBracket,
      "]": TokenType.RightBracket,
      "{": TokenType.LeftBrace,
      "}": TokenType.RightBrace,
      ",": TokenType.Comma,
      ":": TokenType.Colon,
      ".": TokenType.Dot,
      ";": TokenType.Semicolon,
    };
    return singles[this.source[index]]
      ? { type: singles[this.source[index]], lexeme: this.source[index] }
      : undefined;
  }
  private addToken(
    type: TokenType,
    lexeme: string,
    start: number,
    end: number,
    literal?: number | string | boolean | null,
  ): void {
    this.tokens.push(
      new Token(type, lexeme, this.location(start, end), literal),
    );
  }
  private location(start: number, end: number): SourceLocation {
    return new SourceLocation(
      new SourcePosition(this.line, this.column - (end - start), start),
      new SourcePosition(this.line, this.column, end),
    );
  }
  private consumeText(start: number, end: number): void {
    for (let index = start; index < end; index += 1)
      this.advance(this.source[index]);
  }
  private advance(character: string): void {
    this.offset += 1;
    if (character === "\n") {
      this.line += 1;
      this.column = 1;
    } else this.column += 1;
  }
  private error(message: string, start: number, end: number): LexerError {
    return new LexerError(message, this.location(start, end));
  }
  private isDigit(character: string | undefined): boolean {
    return character !== undefined && /\d/.test(character);
  }
  private isIdentifierStart(character: string | undefined): boolean {
    return character !== undefined && /[A-Za-z_$]/.test(character);
  }
  private isIdentifierPart(character: string | undefined): boolean {
    return this.isIdentifierStart(character) || this.isDigit(character);
  }
}
