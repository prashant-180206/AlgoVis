import { SourceLocation, SourcePosition } from "./SourceLocation";
import { Token, TokenType } from "./Token";

export class LexerError extends Error {
  public constructor(message: string, public readonly location: SourceLocation) {
    super(message);
    this.name = "LexerError";
  }
}

const keywords: Readonly<Record<string, TokenType>> = {
  if: TokenType.If,
  else: TokenType.Else,
  for: TokenType.For,
  while: TokenType.While,
  in: TokenType.In,
  def: TokenType.Def,
  return: TokenType.Return,
  break: TokenType.Break,
  continue: TokenType.Continue,
  true: TokenType.True,
  false: TokenType.False,
  null: TokenType.Null,
};

export class Lexer {
  private readonly tokens: Token[] = [];
  private readonly indentationStack = [0];
  private line = 1;
  private column = 1;
  private offset = 0;

  public constructor(private readonly source: string) {}

  public tokenize(): readonly Token[] {
    let lineStart = true;
    let index = 0;

    while (index < this.source.length) {
      if (lineStart) {
        index = this.readIndentation(index);
        lineStart = false;
        if (index >= this.source.length) break;
      }

      const character = this.source[index];
      if (character === "\n") {
        this.addToken(TokenType.Newline, "\n", index, index + 1);
        this.advance(character);
        index += 1;
        lineStart = true;
        continue;
      }
      if (character === " " || character === "\t" || character === "\r") {
        this.advance(character);
        index += 1;
        continue;
      }
      if (character === "#") {
        while (index < this.source.length && this.source[index] !== "\n") {
          this.advance(this.source[index]);
          index += 1;
        }
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

      const twoCharacterType = this.twoCharacterToken(character, this.source[index + 1]);
      if (twoCharacterType) {
        this.addToken(twoCharacterType, character + this.source[index + 1], index, index + 2);
        this.advance(character);
        this.advance(this.source[index + 1]);
        index += 2;
        continue;
      }

      const type = this.singleCharacterToken(character);
      if (!type) throw this.error(`Unexpected character '${character}'.`, index, index + 1);
      this.addToken(type, character, index, index + 1);
      this.advance(character);
      index += 1;
    }

    while (this.indentationStack.length > 1) {
      this.indentationStack.pop();
      this.tokens.push(new Token(TokenType.Dedent, "", SourceLocation.point(this.line, this.column, this.offset)));
    }
    this.tokens.push(new Token(TokenType.Eof, "", SourceLocation.point(this.line, this.column, this.offset)));
    return this.tokens;
  }

  private readIndentation(index: number): number {
    const start = index;
    let width = 0;
    while (index < this.source.length && (this.source[index] === " " || this.source[index] === "\t")) {
      width += this.source[index] === "\t" ? 4 : 1;
      this.advance(this.source[index]);
      index += 1;
    }
    if (index >= this.source.length || this.source[index] === "\n" || this.source[index] === "#") return index;

    const current = this.indentationStack[this.indentationStack.length - 1];
    if (width > current) {
      this.indentationStack.push(width);
      this.tokens.push(new Token(TokenType.Indent, this.source.slice(start, index), this.location(start, index)));
    } else if (width < current) {
      while (this.indentationStack.length > 1 && width < this.indentationStack[this.indentationStack.length - 1]) {
        this.indentationStack.pop();
        this.tokens.push(new Token(TokenType.Dedent, "", this.location(start, index)));
      }
      if (width !== this.indentationStack[this.indentationStack.length - 1]) {
        throw this.error("Indentation does not match an outer block.", start, index);
      }
    }
    return index;
  }

  private readNumber(index: number): number {
    const start = index;
    while (index < this.source.length && this.isDigit(this.source[index])) index += 1;
    if (this.source[index] === "." && this.isDigit(this.source[index + 1])) {
      index += 1;
      while (index < this.source.length && this.isDigit(this.source[index])) index += 1;
    }
    const lexeme = this.source.slice(start, index);
    this.addToken(TokenType.Number, lexeme, start, index, Number(lexeme));
    this.consumeText(start, index);
    return index;
  }

  private readIdentifier(index: number): number {
    const start = index;
    while (index < this.source.length && this.isIdentifierPart(this.source[index])) index += 1;
    const lexeme = this.source.slice(start, index);
    const type = keywords[lexeme] ?? TokenType.Identifier;
    const literal = type === TokenType.True ? true : type === TokenType.False ? false : type === TokenType.Null ? null : undefined;
    this.addToken(type, lexeme, start, index, literal);
    this.consumeText(start, index);
    return index;
  }

  private readString(index: number, quote: string): number {
    const start = index;
    index += 1;
    while (index < this.source.length && this.source[index] !== quote && this.source[index] !== "\n") index += 1;
    if (this.source[index] !== quote) throw this.error("Unterminated string.", start, index);
    const lexeme = this.source.slice(start, index + 1);
    this.addToken(TokenType.String, lexeme, start, index + 1, lexeme.slice(1, -1));
    this.consumeText(start, index + 1);
    return index + 1;
  }

  private addToken(type: TokenType, lexeme: string, start: number, end: number, literal?: number | string | boolean | null): void {
    this.tokens.push(new Token(type, lexeme, this.location(start, end), literal));
  }

  private location(start: number, end: number): SourceLocation {
    return new SourceLocation(new SourcePosition(this.line, this.column - (end - start), start), new SourcePosition(this.line, this.column, end));
  }

  private consumeText(start: number, end: number): void {
    for (let index = start; index < end; index += 1) this.advance(this.source[index]);
  }

  private advance(character: string): void {
    this.offset += 1;
    if (character === "\n") { this.line += 1; this.column = 1; } else this.column += 1;
  }

  private error(message: string, start: number, end: number): LexerError { return new LexerError(message, this.location(start, end)); }
  private isDigit(character: string | undefined): boolean { return character !== undefined && /\d/.test(character); }
  private isIdentifierStart(character: string | undefined): boolean { return character !== undefined && /[A-Za-z_]/.test(character); }
  private isIdentifierPart(character: string | undefined): boolean { return this.isIdentifierStart(character) || this.isDigit(character); }

  private singleCharacterToken(character: string): TokenType | undefined {
    return ({ "+": TokenType.Plus, "-": TokenType.Minus, "*": TokenType.Star, "/": TokenType.Slash, "=": TokenType.Equal, ">": TokenType.Greater, "<": TokenType.Less, "(": TokenType.LeftParen, ")": TokenType.RightParen, "[": TokenType.LeftBracket, "]": TokenType.RightBracket, ",": TokenType.Comma, ":": TokenType.Colon })[character];
  }

  private twoCharacterToken(first: string, second: string | undefined): TokenType | undefined {
    return ({ "==": TokenType.EqualEqual, "!=": TokenType.BangEqual, ">=": TokenType.GreaterEqual, "<=": TokenType.LessEqual })[first + second];
  }
}
