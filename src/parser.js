import {
  TokenType,
  SourceLocation,
} from './token.js';

import {
  LocatedException,
  MessagedException,
} from './common.js';

import {
  Symbol,
} from './symbol.js';

import {
  ExpressionAdd,
  ExpressionAssignment,
  ExpressionBlock,
  ExpressionBoolean,
  ExpressionCharacter,
  ExpressionDivide,
  ExpressionFor,
  ExpressionForOf,
  ExpressionFunctionCall,
  ExpressionFunctionDefinition,
  ExpressionMore,
  ExpressionMoreEqual,
  ExpressionIdentifier,
  ExpressionIf,
  ExpressionInteger,
  ExpressionLess,
  ExpressionLessEqual,
  ExpressionMemberFunctionCall,
  ExpressionMemberIdentifier,
  ExpressionMultiply,
  ExpressionNegative,
  ExpressionNotSame,
  ExpressionPower,
  ExpressionReal,
  ExpressionRemainder,
  ExpressionRepeat,
  ExpressionRepeatAround,
  ExpressionSame,
  ExpressionString,
  ExpressionSubscript,
  ExpressionSubtract,
  ExpressionVector,
} from './ast.js';

import {
  Builtins
} from './builtins.js';

export function parse(tokens) {

  let i = 0;
  let indents = [-1];
  let functions = [];
  functions.push(Builtins);

  function has(type, offset = 0) {
    let index = i + offset;
    if (index < 0 || index >= tokens.length) {
      return false;
    } else {
      return tokens[index].type == type;
    }
  }

  function consume() {
    i += 1;
    return tokens[i - 1];
  }

  function program() {
    if (has(TokenType.Indentation) && tokens[i].source.length != 0) {
      throw new LocatedException(tokens[i].where, 'I expected no indentation at the top-level of the program.');
    }

    let b;
    if (has(TokenType.EOF)) {
      let eofToken = consume();
      b = new ExpressionBlock([], eofToken.where);
    } else {
      b = block();
      if (!has(TokenType.EOF)) {
        throw new LocatedException(b.where, 'I expected the program to end after this, but it didn\'t.');
      }
    }

    return b;
  }

  function block() {
    if (!has(TokenType.Indentation)) {
      throw new LocatedException(tokens[i].where, 'I expected the code to be indented here, but it wasn\'t.');
    }

    let indentation = tokens[i];

    if (indentation.source.length <= indents[indents.length - 1]) {
      if (has(TokenType.Linebreak, 1) || has(TokenType.EOF, 1)) {
        throw new LocatedException(indentation.where, 'I encountered an empty block, but those are forbidden.');
      } else {
        throw new LocatedException(indentation.where, 'I expected the indentation to increase upon entering a block.');
      }
    }
    indents.push(indentation.source.length);

    let statements = [];
    while (has(TokenType.Indentation) && tokens[i].source.length == indentation.source.length) {
      consume(); // eat indentation
      if (has(TokenType.Linebreak)) {
        consume();
      } else if (!has(TokenType.EOF)) {
        let s = statement();
        statements.push(s);
      }
    }

    if (tokens[i].source.length > indentation.source.length) {
      throw new LocatedException(tokens[i].where, `I expected consistent indentation within this block (which is indented with ${indentation.source.length} character${indentation.source.length == 1 ? '' : 's'}), but this indentation jumps around.`);
    }

    indents.pop();

    let sourceStart = indentation.where;
    let sourceEnd = sourceStart;
    if (statements.length > 0) {
      sourceStart = statements[0].where;
      sourceEnd = statements[statements.length - 1].where;
    }

    return new ExpressionBlock(statements, SourceLocation.span(sourceStart, sourceEnd));
  }

  function statement() {
    let e = expression();
    if (has(TokenType.Linebreak)) {
      consume();
      return e;
    } else if (has(TokenType.EOF) || has(TokenType.Indentation)) { // Check for indentation because some expressions end in blocks, which have eaten their linebreak already
      return e;
    } else if (!has(TokenType.EOF)) {
      throw new LocatedException(tokens[i].where, `I expected a line break or the end the program, but I found ${tokens[i].source}.`);
    }
  }

  function expression() {
    return expressionAssignment();
  }

  function expressionAssignment() {
    let lhs = expressionEquality(); 
    if (has(TokenType.Assign)) {
      consume();
      let rhs = expressionAssignment();
      lhs = new ExpressionAssignment(lhs, rhs, SourceLocation.span(lhs.where, rhs.where));
    }
    return lhs;
  }

  function expressionEquality() {
    let a = expressionRelational();
    while (has(TokenType.Same) || has(TokenType.NotSame)) {
      let operator = consume();
      let b = expressionRelational();
      if (operator.type == TokenType.Same) {
        a = new ExpressionSame(a, b, SourceLocation.span(a.where, b.where));
      } else {
        a = new ExpressionNotSame(a, b, SourceLocation.span(a.where, b.where));
      }
    }
    return a;
  }

  function expressionRelational() {
    let a = expressionAdditive();
    while (has(TokenType.Less) || has(TokenType.More)) {
      let operator = consume();
      let b = expressionAdditive();
      if (operator.type == TokenType.Less) {
        a = new ExpressionLess(a, b, SourceLocation.span(a.where, b.where));
      } else {
        a = new ExpressionMore(a, b, SourceLocation.span(a.where, b.where));
      }
    }
    return a;
  }

  function expressionAdditive() {
    let a = expressionMultiplicative();
    while (has(TokenType.Plus) || has(TokenType.Minus)) {
      let operator = consume();
      let b = expressionMultiplicative();
      if (operator.type == TokenType.Plus) {
        a = new ExpressionAdd(a, b, SourceLocation.span(a.where, b.where));
      } else {
        a = new ExpressionSubtract(a, b, SourceLocation.span(a.where, b.where));
      }
    }
    return a;
  }

  function expressionMultiplicative() {
    let a = expressionUnary();
    while (has(TokenType.Asterisk) || has(TokenType.ForwardSlash) || has(TokenType.Percent)) {
      let operator = consume();
      let b = expressionUnary();
      if (operator.type == TokenType.Asterisk) {
        a = new ExpressionMultiply(a, b, SourceLocation.span(a.where, b.where));
      } else if (operator.type == TokenType.ForwardSlash) {
        a = new ExpressionDivide(a, b, SourceLocation.span(a.where, b.where));
      } else {
        a = new ExpressionRemainder(a, b, SourceLocation.span(a.where, b.where));
      }
    }
    return a;
  }

  function expressionUnary() {
    let a;
    if (has(TokenType.Minus)) {
      consume(); // eat operator
      a = expressionUnary();
      a = new ExpressionNegative(a, a.where);
    } else {
      a = expressionPower();
    }
    return a;
  }

  function expressionPower() {
    let a = expressionMember();
    while (has(TokenType.Circumflex)) {
      let operator = consume();
      let b = expressionMember();
      a = new ExpressionPower(a, b, SourceLocation.span(a.where, b.where));
    }
    return a;
  }

  function expressionMember() {
    let base = atom();

    while (has(TokenType.Dot) || has(TokenType.Distribute) || has(TokenType.LeftSquareBracket)) {
      if (has(TokenType.Dot)) {
        let dotToken = consume(); // eat .

        if (!has(TokenType.Identifier)) {
          throw new LocatedException(dotToken.where, `expected ID`);
        }

        if (has(TokenType.LeftParenthesis, 1)) {
          let {nameToken, actuals, sourceEnd} = parseCall(base.where);
          base = new ExpressionMemberFunctionCall(base, nameToken, actuals, SourceLocation.span(base.where, sourceEnd));
        } else {
          let nameToken = consume();
          base = new ExpressionMemberIdentifier(base, nameToken, SourceLocation.span(base.where, nameToken.where));
        }
      } else {
        consume(); // eat [
        let index = expression();
        if (!has(TokenType.RightSquareBracket)) {
          throw new LocatedException(index.where, `I expected a ] after this subscript.`);
        }
        let rightBracketToken = consume(); // eat ]
        base = new ExpressionSubscript(base, index, SourceLocation.span(base.where, rightBracketToken.where));
      }
    }

    return base;
  }

  function isFirstOfExpression(offset = 0) {
    return has(TokenType.Integer, offset) ||
           has(TokenType.Real, offset) ||
           has(TokenType.Minus, offset) ||
           has(TokenType.Boolean, offset) ||
           has(TokenType.Symbol, offset) ||
           has(TokenType.String, offset) ||
           has(TokenType.Identifier, offset) ||
           has(TokenType.LeftSquareBracket, offset) ||
           has(TokenType.LeftParenthesis, offset) ||
           has(TokenType.Repeat, offset) ||
           has(TokenType.For, offset) ||
           has(TokenType.If, offset);
  }

  function atom() {
    if (has(TokenType.Integer)) {
      let token = consume();
      return new ExpressionInteger(Number(token.source), token.where);
    } else if (has(TokenType.LeftParenthesis)) {
      let leftToken = consume();
      let a = expression();
      if (has(TokenType.RightParenthesis)) {
        consume();
        return a;
      } else {
        throw new LocatedException(SourceLocation.span(leftToken.where, a.where), 'I expected a right parenthesis after this expression.');
      }
    } else if (has(TokenType.Symbol)) {
      let token = consume();
      if (Symbol.hasOwnProperty(token.source)) {
        let e = Symbol[token.source].clone();
        e.where = token.where;
        return e;
      } else {
        throw new LocatedException(token.where, `I don't recognize the symbol <var>${token.source}</var>.`);
      }
    } else if (has(TokenType.String)) {
      let token = consume();
      return new ExpressionString(token.source, token.where);
    } else if (has(TokenType.Character)) {
      let token = consume();
      return new ExpressionCharacter(token.source, token.where);
    } else if (has(TokenType.Real)) {
      let token = consume();
      return new ExpressionReal(Number(token.source), token.where);
    } else if (has(TokenType.Boolean)) {
      let token = consume();
      return new ExpressionBoolean(token.source == 'true', token.where);
    } else if (has(TokenType.To)) {
      let sourceStart = tokens[i].where;
      consume(); // eat if

      if (!has(TokenType.Identifier)) {
        throw new LocatedException(tokens[i].where, 'I expected a function name after to.');
      }
      let idToken = tokens[i];
      consume();

      if (!has(TokenType.LeftParenthesis)) {
        throw new LocatedException(tokens[i].where, 'I expected a left parenthesis after a function\'s name.');
      }
      consume();

      // Parse formals.
      let formals = [];
      if (has(TokenType.Identifier)) {
        formals.push(tokens[i].source);
        consume();
        // TODO check for default value

        while (has(TokenType.Comma)) {
          consume(); // eat comma
          if (has(TokenType.Identifier)) {
            formals.push(tokens[i].source);
            consume();
            // TODO check for default value
          } else {
            throw new LocatedException(tokens[i].where, 'I expected a parameter name after a comma in the parameter list.');
          }
        }
      }

      if (!has(TokenType.RightParenthesis)) {
        throw new LocatedException(tokens[i].where, 'I expected a right parenthesis after a function\'s parameter list.');
      }
      consume();

      let body;
      if (has(TokenType.Assign)) {
        consume();
        body = statement();
      } else {
        if (!has(TokenType.Linebreak)) {
          throw new LocatedException(tokens[i].where, 'I expected a linebreak after a function header.');
        }
        consume();
        body = block();
      }

      return new ExpressionFunctionDefinition(idToken.source, formals, body, SourceLocation.span(sourceStart, body.where));

    } else if (has(TokenType.If)) {
      let sourceStart = tokens[i].where;
      let sourceEnd = sourceStart;
      consume(); // eat if

      let conditions = [];
      let thenBlocks = [];
      let elseBlock = null;
      let isOneLiner;

      if (isFirstOfExpression()) {
        let condition = expression();

        let thenBlock;
        if (has(TokenType.Linebreak)) {
          consume(); // eat linebreak
          thenBlock = block();
          isOneLiner = false;
        } else if (has(TokenType.Then)) {
          consume(); // eat then
          thenBlock = expression();
          isOneLiner = true;
        } else {
          throw new LocatedException(sourceStart, 'I expected either a linebreak or then after the condition.');
        }

        conditions.push(condition);
        thenBlocks.push(thenBlock);
        sourceEnd = thenBlock.where;
      } else {
        throw new LocatedException(sourceStart, 'I expected a condition for this if.');
      }

      while ((isOneLiner && has(TokenType.ElseIf)) ||
             (!isOneLiner && has(TokenType.Indentation) && indents[indents.length - 1] == tokens[i].source.length && has(TokenType.ElseIf, 1))) {
        if (!isOneLiner) {
          consume(); // eat indent
        }
        let elseIfToken = tokens[i];
        consume(); // eat else if

        if (!isFirstOfExpression()) {
          throw new LocatedException(elseIfToken.where, 'I expected a condition after this else-if.');
        }

        let condition = expression();

        let thenBlock;
        if (has(TokenType.Linebreak)) {
          consume(); // eat linebreak
          thenBlock = block();
          isOneLiner = false;
        } else if (has(TokenType.Then)) {
          consume(); // eat then
          thenBlock = expression();
          isOneLiner = true;
        } else {
          throw new LocatedException(sourceStart, 'I expected either a linebreak or then after the condition.');
        }

        conditions.push(condition);
        thenBlocks.push(thenBlock);
        sourceEnd = thenBlock.where;
      }

      if (conditions.length == 0) {
        throw new LocatedException(sourceStart, 'I expected this if statement to have at least one condition.');
      }
      
      if ((isOneLiner && has(TokenType.Else)) ||
          (!isOneLiner && has(TokenType.Indentation) && indents[indents.length - 1] == tokens[i].source.length && has(TokenType.Else, 1))) {
        if (!isOneLiner) {
          consume(); // eat indentation
        }
        let elseToken = consume(); // eat else

        if (has(TokenType.Linebreak)) {
          consume(); // eat linebreak
          elseBlock = block();
          isOneLiner = false;
        } else {
          elseBlock = expression();
          isOneLiner = true;
        }

        sourceEnd = elseBlock.where;
      }

      return new ExpressionIf(conditions, thenBlocks, elseBlock, SourceLocation.span(sourceStart, sourceEnd));
    } else if (has(TokenType.For)) {
      let sourceStart = tokens[i].where;
      consume();
      if (isFirstOfExpression()) {
        let j = expression();

        // for i in 0..10
        // for i to 10
        // for i through 10

        let start;
        let stop;
        let by;
        
        if (has(TokenType.In) || has(TokenType.To) || has(TokenType.Through)) {
          if (has(TokenType.In)) {
            consume(); // eat in
            start = expression();
            if (has(TokenType.Range)) {
              consume(); // eat ..
              stop = expression();
              stop = new ExpressionAdd(new ExpressionInteger(1), stop);
            } else {
              throw new LocatedException(SourceLocation.span(sourceStart, start.where), 'I expected the range operator .. in a for-in loop.');
            }
          } else if (has(TokenType.To)) {
            consume(); // eat to
            start = new ExpressionInteger(0);
            stop = expression();
          } else {
            consume(); // eat through
            start = new ExpressionInteger(0);
            stop = expression();
            stop = new ExpressionAdd(new ExpressionInteger(1), stop);
          }

          if (has(TokenType.By)) {
            consume(); // eat by
            by = expression();
          } else {
            by = new ExpressionInteger(1);
          }

          if (!has(TokenType.Linebreak)) {
            throw new LocatedException(SourceLocation.span(sourceStart, stop.where), 'I expected a linebreak after this loop\'s range.');
          }
          consume(); // eat linebreak
          let body = block();

          return new ExpressionFor(j, start, stop, by, body, SourceLocation.span(sourceStart, body.where));
        } else if (has(TokenType.Of)) {
          consume(); // eat of
          const vector = expression();
          if (!has(TokenType.Linebreak)) {
            throw new LocatedException(SourceLocation.span(sourceStart, vector.where), "I expected a linebreak after this for-of loop's list.");
          }
          consume(); // eat linebreak
          let body = block();
          return new ExpressionForOf(j, vector, body, SourceLocation.span(sourceStart, body.where));
        } else {
          throw new LocatedException(sourceStart, 'I expected one of to, through, or in to specify the for loop\'s range.');
        }
      }
    } else if (has(TokenType.LeftSquareBracket)) {
      let sourceStart = tokens[i].where;
      const leftToken = consume(); // eat [
      let elements = [];

      // Allow linebreak followed by indentation.
      let hasLinebreaks = false;
      if (has(TokenType.Linebreak)) {
        consume();
        if (has(TokenType.Indentation)) {
          if (indents[indents.length - 1] < tokens[i].source.length) {
            indents.push(tokens[i].source.length);
            hasLinebreaks = true;
            consume();
          } else {
            throw new LocatedException(tokens[i].where, 'I expected the vector\'s elements to be indented one level.');
          }
        } else {
          throw new LocatedException(leftToken.where, 'I expected the vector\'s elements to be indented one level.');
        }
      }

      while (!has(TokenType.RightSquareBracket)) {
        let e;
        if (has(TokenType.Tilde)) {
          let tildeToken = consume();
          if (elements.length == 0) {
            throw new LocatedException(tildeToken.where, 'I found ~ at index 0 of this vector. Operator ~ repeats the previous element and can only appear after index 0.');
          }
          e = elements[elements.length - 1];
        } else {
          e = expression();
        }
        elements.push(e);
        if (!has(TokenType.RightSquareBracket)) {
          if (has(TokenType.Comma)) {
            consume(); // eat ,

            if (has(TokenType.Linebreak)) {
              if (hasLinebreaks) {
                consume(); // eat break
                if (has(TokenType.Indentation)) {
                  if (indents[indents.length - 1] === tokens[i].source.length) {
                    consume();
                  } else {
                    throw new LocatedException(tokens[i].where, 'I expected all of the vector\'s elements to have the same level of indentation. But this element has a different indentation.');
                  }
                }
              } else {
                throw new LocatedException(tokens[i].where, 'I expected no linebreaks in this vector because there was no linebreak after the opening [.');
              }
            }
          } else if (has(TokenType.Linebreak)) {
            if (hasLinebreaks) {
              consume();
              if (has(TokenType.Indentation) && has(TokenType.RightSquareBracket, 1)) {
                indents.pop();
                if (indents[indents.length - 1] === tokens[i].source.length) {
                  consume();
                } else {
                  consume();
                  throw new LocatedException(tokens[i].where, 'I expected the vector\'s closing line to have the same indentation as its opening line.');
                }
              } else {
                throw new LocatedException(tokens[i].where, 'I expected the vector to be closed with ].');
              }
            } else {
              throw new LocatedException(tokens[i].where, 'I expected no linebreaks in this vector because there was no linebreak after the opening [.');
            }
          } else {
            throw new LocatedException(tokens[i].where, 'I expected a comma between vector elements.');
          }
        }
      }
      let sourceEnd = tokens[i].where;
      consume(); // eat ]
      return new ExpressionVector(elements, SourceLocation.span(sourceStart, sourceEnd));
    } else if (has(TokenType.Identifier) && has(TokenType.LeftParenthesis, 1)) {
      let sourceStart = tokens[i].where;
      let {nameToken, actuals, sourceEnd} = parseCall(sourceStart);
      return new ExpressionFunctionCall(nameToken, actuals, SourceLocation.span(sourceStart, sourceEnd));
    } else if (has(TokenType.Repeat)) {
      let sourceStart = tokens[i].where;
      consume(); // eat repeat
      let count = expression();
      if (!has(TokenType.Linebreak)) {
        throw new LocatedException(SourceLocation.span(sourceStart, count.where), 'I expected a linebreak after this repeat\'s count.');
      }
      consume(); // eat linebreak
      let body = block();
      if (has(TokenType.Indentation) && indents[indents.length - 1] == tokens[i].source.length && has(TokenType.Around, 1)) {
        consume(); // eat indent
        consume(); // eat around
        consume(); // eat linebreak
        let around = block();
        return new ExpressionRepeatAround(count, body, around, SourceLocation.span(sourceStart, around.where));
      } else {
        return new ExpressionRepeat(count, body, SourceLocation.span(sourceStart, body.where));
      }
    } else if (has(TokenType.Identifier)) {
      let where = tokens[i].where;
      let id = consume();
      return new ExpressionIdentifier(id, where);
    } else {
      if (!has(TokenType.Linebreak)) {
        throw new LocatedException(tokens[i].where, `I don't know what "${tokens[i].source}" means here.`);
      }
    }
  }

  function parseCall(sourceStart) {
    let nameToken = consume();
    const leftToken = consume(); // eat (

    // Allow linebreak followed by indentation.
    let hasLinebreaks = false;
    if (has(TokenType.Linebreak)) {
      consume(); // eat \n
      if (has(TokenType.Indentation)) {
        if (indents[indents.length - 1] < tokens[i].source.length) {
          indents.push(tokens[i].source.length);
          hasLinebreaks = true;
          consume();
        } else {
          throw new LocatedException(tokens[i].where, 'I expected the parameters to be indented one level.');
        }
      } else {
        throw new LocatedException(leftToken.where, 'I expected the parameters to be indented one level.');
      }
    }

    const actuals = {};
    while (!has(TokenType.RightParenthesis)) {
      if (has(TokenType.LeftSquareBracket)) {
        const leftBracketToken = consume();

        const identifiers = [];
        while (!has(TokenType.RightSquareBracket)) {
          if (!has(TokenType.Identifier)) {
            throw new LocatedException(tokens[i].where, 'I expected an identifier.');
          }

          // Grab identifier.
          identifiers.push(consume());

          if (has(TokenType.Comma)) {
            consume();
          } else if (!has(TokenType.RightSquareBracket) && !has(TokenType.Identifier)) {
            throw new LocatedException(tokens[i].where, `I didn't expect ${token[i].source}.`);
          }
        }

        consume(); // eat ]

        if (!has(TokenType.Assign)) {
          throw new LocatedException(tokens[i].where, 'I expected =.');
        }

        consume(); // eat =
        const e = expression();

        for (let [i, identifier] of identifiers.entries()) {
          actuals[identifier.source] = new ExpressionSubscript(e, new ExpressionInteger(i), SourceLocation.span(leftBracketToken, e));
          // TODO where object
        }
      } else if (has(TokenType.Identifier)) {
        const identifier = consume();
        
        if (has(TokenType.Assign)) {
          consume(); // eat =
          const e = expression();
          actuals[identifier.source] = {
            expression: e,
            where: SourceLocation.span(identifier.where, e.where),
          };
        } else {
          actuals[identifier.source] = {
            expression: undefined,
            where: identifier.where,
          };
        }
      } else {
        throw new LocatedException(tokens[i].where, 'I expected the parameters to be named.');
      }


      if (!has(TokenType.RightParenthesis)) {
        if (has(TokenType.Comma)) {
          consume(); // eat ,

          if (has(TokenType.Linebreak)) {
            if (hasLinebreaks) {
              consume(); // eat break
              if (has(TokenType.Indentation)) {
                if (indents[indents.length - 1] === tokens[i].source.length) {
                  consume();
                } else {
                  throw new LocatedException(tokens[i].where, 'I expected all of the parameters to have the same level of indentation. But this element has a different indentation.');
                }
              }
            } else {
              throw new LocatedException(tokens[i].where, 'I expected no linebreaks in this call because there was no linebreak after the opening (.');
            }
          }
        } else if (has(TokenType.Linebreak)) {
          if (hasLinebreaks) {
            consume();
            if (has(TokenType.Indentation) && has(TokenType.RightParenthesis, 1)) {
              indents.pop();
              if (indents[indents.length - 1] === tokens[i].source.length) {
                consume();
              } else {
                consume();
                throw new LocatedException(tokens[i].where, 'I expected the call\'s closing line to have the same indentation as its opening line.');
              }
            } else {
              throw new LocatedException(tokens[i].where, 'I expected the call to be closed with ).');
            }
          } else {
            throw new LocatedException(tokens[i].where, 'I expected no linebreaks in this call because there was no linebreak after the opening (.');
          }
        } else {
          throw new LocatedException(tokens[i].where, 'I expected a comma between parameters.');
        }
      }
    }

    let sourceEnd = tokens[i].where;
    if (has(TokenType.RightParenthesis)) {
      consume();
    } else {
      throw new LocatedException(SourceLocation.span(sourceStart, sourceEnd), `I expected a right parenthesis to close the function call, but I encountered "${tokens[i].source}" (${tokens[i].type}) instead.`);
    }

    return {nameToken, actuals, sourceEnd};
  }

  let ast = program();

  return ast;
}
