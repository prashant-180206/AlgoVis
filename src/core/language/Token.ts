import { SourceLocation } from "./SourceLocation";

export enum TokenType {
  Identifier = "Identifier",
  Number = "Number",
  String = "String",
  True = "True",
  False = "False",
  Null = "Null",
  If = "If",
  Else = "Else",
  For = "For",
  While = "While",
  In = "In",
  Def = "Def",
  Return = "Return",
  Break = "Break",
  Continue = "Continue",
  Newline = "Newline",
  Indent = "Indent",
  Dedent = "Dedent",
  Eof = "Eof",
  Plus = "Plus",
  Minus = "Minus",
  Star = "Star",
  Slash = "Slash",
  Equal = "Equal",
  EqualEqual = "EqualEqual",
  BangEqual = "BangEqual",
  Greater = "Greater",
  GreaterEqual = "GreaterEqual",
  Less = "Less",
  LessEqual = "LessEqual",
  LeftParen = "LeftParen",
  RightParen = "RightParen",
  LeftBracket = "LeftBracket",
  RightBracket = "RightBracket",
  Comma = "Comma",
  Colon = "Colon",
}

export class Token {
  public constructor(
    public readonly type: TokenType,
    public readonly lexeme: string,
    public readonly location: SourceLocation,
    public readonly literal?: number | string | boolean | null,
  ) {}
}
