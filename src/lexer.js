import {LocatedException} from './common.js';

import {
  TokenType,
  Token,
  SourceLocation
} from './token.js';

export function lex(source) {
  
  let iStartIndex = 0;
  let iEndIndex = -1;
  let iStartColumn = 0;
  let iEndColumn = -1;
  let iStartLine = 0;
  let iEndLine = 0;

  let i = 0;
  let tokens = [];
  let tokenSoFar = '';

  function consume() {
    iEndIndex += 1;
    iEndColumn += 1;
    if (source[i] === '\n') {
      iEndLine += 1;
      iEndColumn = -1;
    }
    tokenSoFar += source[i];
    i += 1;
  }

  function has(pattern, offset) {
    let index = i;
    if (offset) {
      index = i + offset;
    }

    if (index < 0 || index >= source.length) {
      return false;
    } else if (pattern instanceof RegExp) {
      return source.charAt(index).match(pattern);
    } else {
      return source.charAt(index) === pattern;
    }
  }

  function resetToken() {
    iStartIndex = iEndIndex + 1;
    iStartColumn = iEndColumn + 1;
    iStartLine = iEndLine;
    tokenSoFar = '';
  }

  function emit(type) {
    tokens.push(new Token(type, tokenSoFar, new SourceLocation(iStartLine, iEndLine, iStartColumn, iEndColumn, iStartIndex, iEndIndex)));
    resetToken();
  }

  function dash() {
    consume();

    if (has(/\d/)) {
      digits();
    } else if (has('>')) {
      consume();
      emit(TokenType.RightArrow);
    } else if (has('.')) {
      decimal();
    } else {
      emit(TokenType.Minus);
    }
  }

  function character() {
    consume();
    consume();
    if (!has("'")) {
      throw new LocatedException(new SourceLocation(iStartLine, iEndLine, iStartColumn, iEndColumn, iStartIndex, iEndIndex), `I see a character literal, but it isn't closed with '.`);
    }
    consume();
    tokenSoFar = tokenSoFar.substr(1, tokenSoFar.length - 2); // chop off '
    emit(TokenType.Character);
  }

  function string() {
    consume();
    // TODO newline?
    while (!has('"') && i < source.length) {
      consume();
    }

    if (!has('"')) {
      throw new LocatedException(new SourceLocation(iStartLine, iEndLine, iStartColumn, iEndColumn, iStartIndex, iEndIndex), `I see a string literal, but it isn't closed with ".`);
    }

    consume();
    tokenSoFar = tokenSoFar.substr(1, tokenSoFar.length - 2); // chop off "
    emit(TokenType.String);
  }

  function symbol() {
    consume(); // eat symbol lead
    while (has(/[-a-zA-Z0-9_]/)) {
      consume();
    }
    emit(TokenType.Symbol);
  }

  function identifier() {
    consume(); // eat identifier lead
    while (has(/[a-zA-Z0-9_]/)) {
      consume();
    }

    if (tokenSoFar === 'repeat') {
      emit(TokenType.Repeat);
    } else if (tokenSoFar === 'true') {
      emit(TokenType.Boolean);
    } else if (tokenSoFar === 'false') {
      emit(TokenType.Boolean);
    } else if (tokenSoFar === 'with') {
      emit(TokenType.With);
    } else if (tokenSoFar === 'for') {
      emit(TokenType.For);
    } else if (tokenSoFar === 'in') {
      emit(TokenType.In);
    } else if (tokenSoFar === 'around') {
      emit(TokenType.Around);
    } else if (tokenSoFar === 'of') {
      emit(TokenType.Of);
    } else if (tokenSoFar === 'if') {
      if (tokens.length > 0 && tokens[tokens.length - 1].type === TokenType.Else) {
        let elseToken = tokens.pop();
        iStartLine = elseToken.where.lineStart;
        iStartColumn = elseToken.where.columnStart;
        tokenSoFar = 'else if';
        emit(TokenType.ElseIf);
      } else {
        emit(TokenType.If);
      }
    } else if (tokenSoFar === 'else') {
      emit(TokenType.Else);
    } else if (tokenSoFar === 'to') {
      emit(TokenType.To);
    } else if (tokenSoFar === 'in') {
      emit(TokenType.In);
    } else if (tokenSoFar === 'then') {
      emit(TokenType.Then);
    } else if (tokenSoFar === 'through') {
      emit(TokenType.Through);
    } else if (tokenSoFar === 'by') {
      emit(TokenType.By);
    } else {
      emit(TokenType.Identifier);
    }
  }

  function digits() {
    while (has(/\d/)) {
      consume();
    }

    if (has('.') && !has('.', 1)) {
      decimal();
    } else {
      if (has('e') && has(/\d/, 1)) {
        eSuffix();
      }
      emit(TokenType.Integer);
    }
  }

  function eSuffix() {
    consume();
    while (has(/\d/)) {
      consume();
    }
  }

  function decimal() {
    consume(); // eat .
    while (has(/\d/)) {
      consume();
    }

    // Handle e123.
    if (has('e') && has(/\d/, 1)) {
      eSuffix();
    }

    emit(TokenType.Real);
  }

  function dot() {
    if (has(/\d/, 1)) {
      decimal();
    } else {
      consume();
      if (has(/\./)) {
        consume();
        emit(TokenType.Range);
      } else {
        emit(TokenType.Dot);
      }
    }
  }

  function indentation() {
    while (has(/[ \t]/)) {
      consume();
    }

    if (has('/') && has('/', 1)) {
      consume();
      consume();
      wholeLineComment();
    } else {
      emit(TokenType.Indentation);
    }
  }

  function equals() {
    consume();
    if (has('=')) {
      consume();
      emit(TokenType.Same);
    } else {
      emit(TokenType.Assign);
    }
  }

  function bang() {
    consume();
    if (has('=')) {
      consume();
      emit(TokenType.Same);
    }
  }

  function less() {
    consume();
    if (has('=')) {
      consume();
      emit(TokenType.LessEqual);
    } else {
      emit(TokenType.Less);
    }
  }

  function more() {
    consume();
    if (has('=')) {
      consume();
      emit(TokenType.MoreEqual);
    } else {
      emit(TokenType.More);
    }
  }

  function inlineComment() {
    // eat till end of line
    while (i < source.length && !has('\n')) {
      consume();
    }
    resetToken();
  }

  function wholeLineComment() {
    // eat through end of line
    while (i < source.length && !has('\n')) {
      consume();
    }
    consume();
    resetToken();
    indentation();
  }

  indentation();
  while (i < source.length) {
    if (has(/\d/)) {
      digits();
    } else if (has(/[a-zA-Z_]/)) {
      identifier();
    } else if (has(':')) {
      symbol();
    } else if (has('"')) {
      string();
    } else if (has('\'')) {
      character();
    } else if (has('.')) {
      dot();
    } else if (has('-')) {
      dash();
    } else if (has('=')) {
      equals();
    } else if (has('<')) {
      less();
    } else if (has('>')) {
      more();
    } else if (has('!')) {
      bang();
    } else if (has('~')) {
      consume();
      emit(TokenType.Tilde);
    } else if (has(',')) {
      consume();
      emit(TokenType.Comma);
    } else if (has('(')) {
      consume();
      emit(TokenType.LeftParenthesis);
    } else if (has(')')) {
      consume();
      emit(TokenType.RightParenthesis);
    } else if (has('{')) {
      consume();
      emit(TokenType.LeftCurlyBrace);
    } else if (has('}')) {
      consume();
      emit(TokenType.RightCurlyBrace);
    } else if (has('[')) {
      consume();
      emit(TokenType.LeftSquareBracket);
    } else if (has(']')) {
      consume();
      emit(TokenType.RightSquareBracket);
    } else if (has('+')) {
      consume();
      emit(TokenType.Plus);
    } else if (has('^')) {
      consume();
      emit(TokenType.Circumflex);
    } else if (has('*')) {
      consume();
      emit(TokenType.Asterisk);
    } else if (has('%')) {
      consume();
      emit(TokenType.Percent);
    } else if (has('/')) {
      consume();
      if (has('/')) {
        consume();
        inlineComment();
      } else {
        emit(TokenType.ForwardSlash);
      }
    } else if (has('\n')) {
      consume();
      emit(TokenType.Linebreak);
      indentation();
    } else if (has(' ')) {
      while (has(' ')) {
        consume();
      }
      resetToken();
    } else {
      consume();
      throw new LocatedException(new SourceLocation(iStartLine, iEndLine, iStartColumn, iEndColumn, iStartIndex, iEndIndex), `I encountered "${tokenSoFar}", and I don't know what it means.`);
    }
  }

  emit(TokenType.EOF);

  return tokens;
}
