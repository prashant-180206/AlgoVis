export class SourcePosition {
  public constructor(
    public readonly line: number,
    public readonly column: number,
    public readonly offset: number,
  ) {}
}

export class SourceLocation {
  public constructor(
    public readonly start: SourcePosition,
    public readonly end: SourcePosition,
  ) {}

  public static point(line: number, column: number, offset: number): SourceLocation {
    const position = new SourcePosition(line, column, offset);
    return new SourceLocation(position, position);
  }
}
