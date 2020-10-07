// --------------------------------------------------------------------------- 

export let TokenType = Object.freeze({
  Assign: 'Assign',
  Around: 'Around',
  Asterisk: 'Asterisk',
  Boolean: 'Boolean',
  By: 'By',
  Character: 'Character',
  Circle: 'Circle',
  Circumflex: 'Circumflex',
  Comma: 'Comma',
  Dot: 'Dot',
  EOF: 'EOF',
  Else: 'Else',
  ElseIf: 'ElseIf',
  ForwardSlash: 'ForwardSlash',
  Identifier: 'Identifier',
  If: 'If',
  Of: 'Of',
  In: 'In',
  Indentation: 'Indentation',
  Integer: 'Integer',
  LeftCurlyBrace: 'LeftCurlyBrace',
  LeftParenthesis: 'LeftParenthesis',
  LeftSquareBracket: 'LeftSquareBracket',
  Less: 'Less',
  LessEqual: 'LessEqual',
  Linebreak: 'Linebreak',
  Minus: 'Minus',
  More: 'More',
  MoreEqual: 'MoreEqual',
  NotSame: 'NotSame',
  Percent: 'Percent',
  Plus: 'Plus',
  Range: 'Range',
  Real: 'Real',
  Repeat: 'Repeat',
  RightArrow: 'RightArrow',
  RightCurlyBrace: 'RightCurlyBrace',
  RightParenthesis: 'RightParenthesis',
  RightSquareBracket: 'RightSquareBracket',
  Same: 'Same',
  String: 'String',
  Symbol: 'Symbol',
  Then: 'Then',
  Through: 'Through',
  Tilde: 'Tilde',
  To: 'To',
});

// --------------------------------------------------------------------------- 

export class SourceLocation {
  constructor(lineStart, lineEnd, columnStart, columnEnd) {
    this.lineStart = lineStart;
    this.lineEnd = lineEnd;
    this.columnStart = columnStart;
    this.columnEnd = columnEnd;
  }

  contains(column, row) {
    return !this.precedes(column, row) && !this.succeeds(column, row);
  }

  precedes(column, row) {
    return this.lineEnd < row || (this.lineEnd === row && this.columnEnd < column);
  }

  succeeds(column, row) {
    return this.lineStart > row || (this.lineStart === row && this.columnStart > column);
  }

  clone() {
    return new SourceLocation(this.lineStart, this.lineEnd, this.columnStart, this.columnEnd);
  }

  debugPrefix() {
    return this.lineStart + ':' +
           this.lineEnd + ':' +
           this.columnStart + ':' +
           this.columnEnd + ':';
  }

  static span(a, b) {
    return new SourceLocation(a.lineStart, b.lineEnd, a.columnStart, b.columnEnd);
  }

  static reify(pod) {
    if (pod) {
      return new SourceLocation(pod.lineStart, pod.lineEnd, pod.columnStart, pod.columnEnd);
    } else {
      return undefined;
    }
  }
}

// --------------------------------------------------------------------------- 

export class Token {
  constructor(type, source, where) {
    this.type = type;
    this.source = source;
    this.where = where;
  }

  static reify(pod) {
    return new Token(pod.type, pod.source, SourceLocation.reify(pod.where));
  }
}

// --------------------------------------------------------------------------- 

