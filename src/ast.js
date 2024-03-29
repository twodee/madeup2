// https://github.com/danro/jquery-easing/blob/master/jquery.easing.js

import {
  FunctionDefinition,
  FormalParameter,
  MessagedException,
  LocatedException,
  Precedence,
} from './common.js';

import {
  Token,
  SourceLocation,
} from './token.js';

import {Path} from './path.js';
import {Polyline} from './twodeejs/polyline.js';
import {Vector3} from './twodeejs/vector.js';
import {Matrix4} from './twodeejs/matrix.js';
import {Trimesh} from './twodeejs/trimesh.js';
import {Plane} from './twodeejs/plane.js';
import {Prefab} from './twodeejs/prefab.js';
import {MathUtilities} from './twodeejs/math-utilities.js';

import {
  Environment,
} from './environment.js';

// --------------------------------------------------------------------------- 
// PRIMITIVES
// --------------------------------------------------------------------------- 

export class Expression {
  constructor(where, unevaluated) {
    this.where = where;
    this.unevaluated = unevaluated ? unevaluated : this;
  }

  get precedence() {
    return this.constructor.precedence;
  }

  toPod() {
    const pod = {
      type: this.constructor.name,
      where: this.where,
    };

    if (this.unevaluated && this.unevaluated !== this) {
      pod.unevaluated = this.unevaluated.toPod();
    }

    if (this.prevalues) {
      pod.prevalues = this.prevalues.map(prevalue => prevalue.toPod());
    }

    return pod;
  }

  static reify(env, pod, omniReify) {
    let unevaluated;
    if (pod.unevaluated) {
      unevaluated = omniReify(env, pod.unevaluated);
    }

    let prevalues;
    if (pod.prevalues) {
      prevalues = pod.prevalues.map(prevalue => omniReify(env, prevalue));
    }

    if (pod.type === 'ExpressionReal') {
      return new ExpressionReal(pod.value, SourceLocation.reify(pod.where), unevaluated, prevalues);
    } else if (pod.type === 'ExpressionBoolean') {
      return new ExpressionBoolean(pod.value, SourceLocation.reify(pod.where), unevaluated, prevalues);
    } else if (pod.type === 'ExpressionInteger') {
      return new ExpressionInteger(pod.value, SourceLocation.reify(pod.where), unevaluated, prevalues);
    } else if (pod.type === 'ExpressionString') {
      return new ExpressionString(pod.value, SourceLocation.reify(pod.where), unevaluated, prevalues);
    } else if (pod.type === 'ExpressionVector') {
      return new ExpressionVector(pod.value.map(element => omniReify(env, element)), SourceLocation.reify(pod.where), unevaluated, prevalues);
    } else if (pod.type === 'ExpressionAdd') {
      return new ExpressionAdd(omniReify(env, pod.l), omniReify(env, pod.r), SourceLocation.reify(pod.where), unevaluated, prevalues);
    } else if (pod.type === 'ExpressionMultiply') {
      return new ExpressionMultiply(omniReify(env, pod.l), omniReify(env, pod.r), SourceLocation.reify(pod.where), unevaluated, prevalues);
    } else if (pod.type === 'ExpressionPower') {
      return new ExpressionPower(omniReify(env, pod.l), omniReify(env, pod.r), SourceLocation.reify(pod.where), unevaluated, prevalues);
    } else if (pod.type === 'ExpressionDivide') {
      return new ExpressionDivide(omniReify(env, pod.l), omniReify(env, pod.r), SourceLocation.reify(pod.where), unevaluated, prevalues);
    } else if (pod.type === 'ExpressionSubtract') {
      return new ExpressionSubtract(omniReify(env, pod.l), omniReify(env, pod.r), SourceLocation.reify(pod.where), unevaluated, prevalues);
    } else if (pod.type === 'ExpressionRemainder') {
      return new ExpressionRemainder(omniReify(env, pod.l), omniReify(env, pod.r), SourceLocation.reify(pod.where), unevaluated, prevalues);
    } else if (pod.type === 'ExpressionIdentifier') {
      return new ExpressionIdentifier(Token.reify(pod.nameToken), SourceLocation.reify(pod.where), unevaluated);
    } else if (pod.type === 'ExpressionMemberIdentifier') {
      return new ExpressionMemberIdentifier(omniReify(pod.base), Token.reify(pod.nameToken), SourceLocation.reify(pod.where), unevaluated);
    } else if (pod.type === 'ExpressionFunctionCall') {
      return new ExpressionFunctionCall(Token.reify(pod.nameToken), pod.actuals.map(actual => omniReify(env, actual)), SourceLocation.reify(pod.where), unevaluated);
    } else if (pod.type === 'ExpressionNegative') {
      return new ExpressionNegative(omniReify(env, pod.operand), SourceLocation.reify(pod.where), unevaluated, prevalues);
    } else {
      throw new MessagedException(`I don't know ${pod.type}!`);
    }
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionUnit extends Expression {
  evaluate(env) {
    return this;
  }

  toPretty() {
    return ':none';
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionData extends Expression {
  static precedence = Precedence.Atom;

  constructor(value, where, unevaluated, prevalues) {
    super(where, unevaluated);
    this.value = value;
    this.prevalues = prevalues;
    this.functions = [];
  }

  bind(env, id) {
    env.bind(id, this);
  }

  hasFunction(id) {
    return this.functions.hasOwnProperty(id);
  }

  getFunction(id) {
    return this.functions[id];
  }

  get type() {
    return this.constructor.type;
  }

  get article() {
    return this.constructor.article;
  }

  toPod() {
    const pod = super.toPod();
    pod.value = this.value;
    return pod;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionBoolean extends ExpressionData {
  static type = 'boolean';
  static article = 'a';

  constructor(value, where, unevaluated, prevalues) {
    super(value, where, unevaluated, prevalues);
  }

  clone() {
    return new ExpressionBoolean(this.value, this.where ? this.where.clone() : undefined, this.unevaluated, this.prevalues);
  }

  evaluate(env) {
    return this;
  }
   
  toPretty() {
    return '' + this.value;
  }

  interpolateLinear(other, proportion) {
    return this.interpolateNearest(other, proportion);
  }

  interpolateNearest(other, proportion) {
    return new ExpressionBoolean(proportion <= 0.5 ? this.value : other.value);
  }

  interpolateSineInOut(other, proportion) {
    return this.interpolateNearest(other, proportion);
  }

  interpolateBackInOut(other, proportion) {
    return this.interpolateNearest(other, proportion);
  }

  interpolateQuadraticInOut(other, proportion) {
    return this.interpolateNearest(other, proportion);
  }

  interpolateCubicInOut(other, proportion) {
    return this.interpolateNearest(other, proportion);
  }

  interpolateQuarticInOut(other, proportion) {
    return this.interpolateNearest(other, proportion);
  }

  interpolateQuinticInOut(other, proportion) {
    return this.interpolateNearest(other, proportion);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionInteger extends ExpressionData {
  static type = 'integer';
  static article = 'an';

  constructor(value, where, unevaluated, prevalues) {
    super(value, where, unevaluated, prevalues);
  }

  clone() {
    return new ExpressionInteger(this.value, this.where ? this.where.clone() : undefined, this.unevaluated, this.prevalues);
  }

  evaluate(env) {
    return this;
  }

  toPretty() {
    return '' + this.value;
  }

  get(i) {
    return new ExpressionInteger(this.value >> i & 1);
  }

  add(other) {
    if (other instanceof ExpressionInteger) {
      return new ExpressionInteger(this.value + other.value);
    } else if (other instanceof ExpressionReal) {
      return new ExpressionReal(this.value + other.value);
    } else if (other instanceof ExpressionString) {
      return new ExpressionString(this.toPretty() + other.toPretty());
    } else {
      throw new MessagedException('Add failed');
    }
  }

  subtract(other) {
    if (other instanceof ExpressionInteger) {
      return new ExpressionInteger(this.value - other.value);
    } else if (other instanceof ExpressionReal) {
      return new ExpressionReal(this.value - other.value);
    } else {
      throw new MessagedException('Subtract failed');
    }
  }

  multiply(other) {
    if (other instanceof ExpressionInteger) {
      return new ExpressionInteger(this.value * other.value);
    } else if (other instanceof ExpressionReal) {
      return new ExpressionReal(this.value * other.value);
    } else {
      throw 'bad ****';
    }
  }

  divide(other) {
    if (other instanceof ExpressionInteger) {
      return new ExpressionInteger(Math.trunc(this.value / other.value));
    } else if (other instanceof ExpressionReal) {
      return new ExpressionReal(this.value / other.value);
    } else {
      throw new MessagedException('Divide failed');
    }
  }

  remainder(other) {
    if (other instanceof ExpressionInteger) {
      return new ExpressionInteger(this.value % other.value);
    } else if (other instanceof ExpressionReal) {
      return new ExpressionReal(this.value % other.value);
    } else {
      throw new MessagedException('Remainder failed');
    }
  }

  negative() {
    return new ExpressionInteger(-this.value);
  }

  power(other) {
    if (other instanceof ExpressionInteger) {
      return new ExpressionInteger(Math.pow(this.value, other.value));
    } else if (other instanceof ExpressionReal) {
      return new ExpressionReal(Math.pow(this.value, other.value));
    } else {
      throw new MessagedException('I can only compute powers for integers and reals.');
    }
  }

  isLess(other) {
    if (other instanceof ExpressionInteger || other instanceof ExpressionReal) {
      return new ExpressionBoolean(this.value < other.value);
    } else {
      throw new MessagedException('I can only compare integers to other numbers.');
    }
  }

  isMore(other) {
    if (other instanceof ExpressionInteger || other instanceof ExpressionReal) {
      return new ExpressionBoolean(this.value > other.value);
    } else {
      throw new MessagedException('I can only compare integers to other numbers.');
    }
  }

  isSame(other) {
    if (other instanceof ExpressionInteger || other instanceof ExpressionReal) {
      return new ExpressionBoolean(this.value == other.value);
    } else {
      throw new MessagedException('I can only compare integers to other numbers.');
    }
  }

  interpolateLinear(other, proportion) {
    return new ExpressionReal(this.value + proportion * (other.value - this.value));
  }

  interpolateNearest(other, proportion) {
    return new ExpressionReal(proportion <= 0.5 ? this.value : other.value);
  }

  interpolateSineInOut(other, proportion) {
    let diff = other.value - this.value;
    return new ExpressionReal(this.value + diff * 0.5 * (1 - Math.cos(Math.PI * proportion)));
  }

  interpolateBackInOut(other, proportion) {
    return new ExpressionReal(interpolateBackInOut(this.value, other.value, proportion));
  }

  interpolateQuadraticInOut(other, proportion) {
    return new ExpressionReal(interpolateQuadraticInOut(this.value, other.value, proportion));
  }

  interpolateCubicInOut(other, proportion) {
    return new ExpressionReal(interpolateCubicInOut(this.value, other.value, proportion));
  }

  interpolateQuarticInOut(other, proportion) {
    return new ExpressionReal(interpolateQuarticInOut(this.value, other.value, proportion));
  }

  interpolateQuinticInOut(other, proportion) {
    return new ExpressionReal(interpolateQuinticInOut(this.value, other.value, proportion));
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionCharacter extends ExpressionData {
  static type = 'character';
  static article = 'a';

  constructor(value, where, unevaluated, prevalues) {
    super(value, where, unevaluated, prevalues);
  }

  clone() {
    return new ExpressionCharacter(this.value, this.where ? this.where.clone() : undefined, this.unevaluated, this.prevalues);
  }

  evaluate(env) {
    return this;
  }

  toPretty() {
    return this.value;
  }

  add(other) {
    return new ExpressionString(this.toPretty() + other.toPretty());
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionString extends ExpressionData {
  static type = 'string';
  static article = 'a';

  constructor(value, where, unevaluated, prevalues) {
    super(value, where, unevaluated, prevalues);
    this.functions = {
      length: new FunctionDefinition('length', 'Returns the number of characters in this string.', [], new ExpressionStringLength(this)),
    };
  }

  clone() {
    return new ExpressionString(this.value, this.where ? this.where.clone() : undefined, this.unevaluated, this.prevalues);
  }

  evaluate(env) {
    return this;
  }

  toPretty() {
    return this.value;
  }

  set(i, value) {
    // assert value is character
    this.value = this.value.substr(0, i) + value + this.value.substr(i + 1);
  }

  get(i) {
    if (i < 0 || i >= this.value.length) {
      throw new MessagedException(`I can't get character ${i} of this string because ${i} is not a legal index in a string of length ${this.value.length}.`)
    } else {
      return new ExpressionCharacter(this.value.charAt(i));
    }
  }

  add(other) {
    return new ExpressionString(this.value + other.toPretty());
  }

  interpolateLinear(other, proportion) {
    return this.interpolateNearest(other, proportion);
  }

  interpolateNearest(other, proportion) {
    return new ExpressionString(proportion <= 0.5 ? this.value : other.value);
  }

  interpolateSineInOut(other, proportion) {
    return this.interpolateNearest(other, proportion);
  }

  interpolateBackInOut(other, proportion) {
    return this.interpolateNearest(other, proportion);
  }

  interpolateQuadraticInOut(other, proportion) {
    return this.interpolateNearest(other, proportion);
  }

  interpolateCubicInOut(other, proportion) {
    return this.interpolateNearest(other, proportion);
  }

  interpolateQuarticInOut(other, proportion) {
    return this.interpolateNearest(other, proportion);
  }

  interpolateQuinticInOut(other, proportion) {
    return this.interpolateNearest(other, proportion);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionStringLength extends Expression {
  static precedence = Precedence.Property;

  constructor(instance, unevaluated) {
    super(undefined, unevaluated);
    this.instance = instance;
  }

  evaluate(env, callExpression) {
    return new ExpressionInteger(this.instance.value.length);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionReal extends ExpressionData {
  static type = 'real';
  static article = 'a';

  constructor(value, where, unevaluated, prevalues) {
    super(value, where, unevaluated, prevalues);
  }

  evaluate(env) {
    return this;
  }

  clone() {
    return new ExpressionReal(this.value, this.where ? this.where.clone() : undefined, this.unevaluated, this.prevalues);
  }

  toPretty() {
    return '' + this.value;
  }

  add(other) {
    if (other instanceof ExpressionInteger || other instanceof ExpressionReal) {
      return new ExpressionReal(this.value + other.value);
    } else {
      throw 'bad real add';
    }
  }

  subtract(other) {
    if (other instanceof ExpressionInteger || other instanceof ExpressionReal) {
      return new ExpressionReal(this.value - other.value);
    } else {
      throw 'bad real subtract';
    }
  }

  multiply(other) {
    if (other instanceof ExpressionInteger || other instanceof ExpressionReal) {
      return new ExpressionReal(this.value * other.value);
    } else {
      throw 'BAD *';
    }
  }

  divide(other) {
    if (other instanceof ExpressionInteger || other instanceof ExpressionReal) {
      return new ExpressionReal(this.value / other.value);
    } else {
      throw new MessagedException('I can only divide integers and reals.');
    }
  }

  negative() {
    return new ExpressionReal(-this.value);
  }

  isLess(other) {
    if (other instanceof ExpressionInteger || other instanceof ExpressionReal) {
      return new ExpressionBoolean(this.value < other.value);
    } else {
      throw new MessagedException('I can only compare integers to other numbers.');
    }
  }

  isMore(other) {
    if (other instanceof ExpressionInteger || other instanceof ExpressionReal) {
      return new ExpressionBoolean(this.value > other.value);
    } else {
      throw new MessagedException('I can only compare reals to other numbers.');
    }
  }

  isSame(other) {
    if (other instanceof ExpressionInteger || other instanceof ExpressionReal) {
      return new ExpressionBoolean(this.value == other.value);
    } else {
      throw new MessagedException('I can only compare reals to other numbers.');
    }
  }

  power(other) {
    if (other instanceof ExpressionInteger || other instanceof ExpressionReal) {
      return new ExpressionReal(Math.pow(this.value, other.value));
    } else {
      throw new MessagedException('I can only compute reals for integers and reals.');
    }
  }

  interpolateLinear(other, proportion) {
    return new ExpressionReal(this.value + proportion * (other.value - this.value));
  }

  interpolateNearest(other, proportion) {
    return new ExpressionReal(proportion <= 0.5 ? this.value : other.value);
  }

  interpolateSineInOut(other, proportion) {
    let diff = other.value - this.value;
    return new ExpressionReal(this.value + diff * 0.5 * (1 - Math.cos(Math.PI * proportion)));
  }

  interpolateBackInOut(other, proportion) {
    return new ExpressionReal(interpolateBackInOut(this.value, other.value, proportion));
  }

  interpolateQuadraticInOut(other, proportion) {
    return new ExpressionReal(interpolateQuadraticInOut(this.value, other.value, proportion));
  }

  interpolateCubicInOut(other, proportion) {
    return new ExpressionReal(interpolateCubicInOut(this.value, other.value, proportion));
  }

  interpolateQuarticInOut(other, proportion) {
    return new ExpressionReal(interpolateQuarticInOut(this.value, other.value, proportion));
  }

  interpolateQuinticInOut(other, proportion) {
    return new ExpressionReal(interpolateQuinticInOut(this.value, other.value, proportion));
  }
}

// --------------------------------------------------------------------------- 
// ARITHMETIC
// --------------------------------------------------------------------------- 

export class ExpressionBinaryOperator extends Expression {
  constructor(l, r, operator, where, unevaluated) {
    super(where, unevaluated);
    this.l = l;
    this.r = r;
    this.operator = operator;
  }

  toPretty() {
    const prettyA = this.l.precedence < this.precedence ? `(${this.l.toPretty()})` : `${this.l.toPretty()}`;
    const prettyB = this.r.precedence <= this.precedence ? `(${this.r.toPretty()})` : `${this.r.toPretty()}`;
    return `${prettyA} ${this.operator} ${prettyB}`;
  }

  toPod() {
    const pod = super.toPod();
    pod.l = this.l.toPod();
    pod.r = this.r.toPod();
    return pod;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionSame extends ExpressionBinaryOperator {
  static precedence = Precedence.Equality;

  constructor(l, r, where, unevaluated) {
    super(l, r, '==', where, unevaluated);
  }

  evaluate(env) {
    let evaluatedL = this.l.evaluate(env);
    let evaluatedR = this.r.evaluate(env);
    return evaluatedL.isSame(evaluatedR);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionNotSame extends ExpressionBinaryOperator {
  static precedence = Precedence.Equality;

  constructor(l, r, where, unevaluated) {
    super(l, r, '!=', where, unevaluated);
  }

  evaluate(env) {
    let evaluatedL = this.l.evaluate(env);
    let evaluatedR = this.r.evaluate(env);
    return !evaluatedL.isSame(evaluatedR);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionLess extends ExpressionBinaryOperator {
  static precedence = Precedence.Relational;

  constructor(l, r, where, unevaluated) {
    super(l, r, '<', where, unevaluated);
  }

  evaluate(env) {
    let evaluatedL = this.l.evaluate(env);
    let evaluatedR = this.r.evaluate(env);
    return evaluatedL.isLess(evaluatedR);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionLessEqual extends ExpressionBinaryOperator {
  static precedence = Precedence.Relational;

  constructor(l, r, where, unevaluated) {
    super(l, r, '<=', where, unevaluated);
  }

  evaluate(env) {
    let evaluatedL = this.l.evaluate(env);
    let evaluatedR = this.r.evaluate(env);
    return evaluatedL.isLess(evaluatedR) || evaluatedL.isSame(evaluatedR);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionMore extends ExpressionBinaryOperator {
  static precedence = Precedence.Relational;

  constructor(l, r, where, unevaluated) {
    super(l, r, '>', where, unevaluated);
  }

  evaluate(env) {
    let evaluatedL = this.l.evaluate(env);
    let evaluatedR = this.r.evaluate(env);
    return evaluatedL.isMore(evaluatedR);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionMoreEqual extends ExpressionBinaryOperator {
  static precedence = Precedence.Relational;

  constructor(l, r, where, unevaluated) {
    super(l, r, '>=', where, unevaluated);
  }

  evaluate(env) {
    let evaluatedL = this.l.evaluate(env);
    let evaluatedR = this.r.evaluate(env);
    return evaluatedL.isMore(evaluatedR) || evaluatedL.isSame(evaluatedR);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionAdd extends ExpressionBinaryOperator {
  static precedence = Precedence.Additive;

  constructor(l, r, where, unevaluated) {
    super(l, r, '+', where, unevaluated);
  }

  evaluate(env) {
    let evaluatedL = this.l.evaluate(env);
    let evaluatedR = this.r.evaluate(env);

    let sum = evaluatedL.add(evaluatedR);
    sum.unevaluated = this;

    return sum;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionSubtract extends ExpressionBinaryOperator {
  static precedence = Precedence.Additive;

  constructor(l, r, where, unevaluated) {
    super(l, r, '-', where, unevaluated);
  }

  evaluate(env) {
    let evaluatedL = this.l.evaluate(env);
    let evaluatedR = this.r.evaluate(env);

    let difference = evaluatedL.subtract(evaluatedR);
    difference.unevaluated = this;

    return difference;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionMultiply extends ExpressionBinaryOperator {
  static precedence = Precedence.Multiplicative;

  constructor(l, r, where, unevaluated) {
    super(l, r, '*', where, unevaluated);
  }

  evaluate(env) {
    let evaluatedL = this.l.evaluate(env);
    let evaluatedR = this.r.evaluate(env);

    let product = evaluatedL.multiply(evaluatedR);
    product.unevaluated = this;

    return product;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionDivide extends ExpressionBinaryOperator {
  static precedence = Precedence.Multiplicative;

  constructor(l, r, where, unevaluated) {
    super(l, r, '/', where, unevaluated);
  }

  evaluate(env) {
    let evaluatedL = this.l.evaluate(env);
    let evaluatedR = this.r.evaluate(env);

    let quotient = evaluatedL.divide(evaluatedR);
    quotient.prevalues = [evaluatedL, evaluatedR];
    quotient.unevaluated = this;

    return quotient;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionRemainder extends ExpressionBinaryOperator {
  static precedence = Precedence.Multiplicative;

  constructor(l, r, where, unevaluated) {
    super(l, r, '%', where, unevaluated);
  }

  evaluate(env) {
    let evaluatedL = this.l.evaluate(env);
    let evaluatedR = this.r.evaluate(env);

    let remainder = evaluatedL.remainder(evaluatedR);
    remainder.prevalues = [evaluatedL, evaluatedR];
    remainder.unevaluated = this;

    return remainder;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionPower extends ExpressionBinaryOperator {
  static precedence = Precedence.Power;

  constructor(l, r, where, unevaluated) {
    super(l, r, '^', where, unevaluated);
  }

  evaluate(env) {
    let evaluatedL = this.l.evaluate(env);
    let evaluatedR = this.r.evaluate(env);

    let power = evaluatedL.power(evaluatedR);
    power.prevalues = [evaluatedL, evaluatedR];
    power.unevaluated = this;

    return power;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionNegative extends Expression {
  static precedence = Precedence.Unary;

  constructor(operand, where, unevaluated) {
    super(where, unevaluated);
    this.operand = operand;
  }

  evaluate(env) {
    let evaluatedL = this.operand.evaluate(env);

    let negation = evaluatedL.negative();
    negation.prevalues = [evaluatedL];
    negation.unevaluated = this;

    return negation;
  }

  toPod() {
    const pod = super.toPod();
    pod.operand = this.operand.toPod();
    return pod;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionFunctionDefinition extends Expression {
  static precedence = Precedence.Atom;

  constructor(name, formals, body, where, unevaluated) {
    super(where, unevaluated);
    this.name = name;
    this.formals = formals;
    this.body = body;
  }

  evaluate(env) {
    env.functions[this.name] = new FunctionDefinition(this.name, '', this.formals, this.body);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionIdentifier extends Expression {
  static precedence = Precedence.Atom;

  constructor(nameToken, where, unevaluated) {
    super(where, unevaluated);
    this.nameToken = nameToken;
  }

  evaluate(env) {
    let value = env.variables[this.nameToken.source];
    if (value) {
      return value;
    } else {
      throw new LocatedException(this.nameToken.where, `I'm sorry, but I've never heard of <var>${this.nameToken.source}</var> before.`);
    }
  }

  assign(env, rhs, whereAssigned) {
    const value = rhs.evaluate(env);

    // Favor mapping this chunk of the source code to the value rather
    // than the environment.
    if (value.hasOwnProperty('sourceSpans')) {
      value.sourceSpans.push(whereAssigned);
    } else if (env.hasOwnProperty('sourceSpans')) {
      env.sourceSpans.push(whereAssigned);
    }

    env.bind(this.nameToken.source, value, rhs);

    return value;
  }

  toPretty() {
    return this.nameToken.source;
  }

  toPod() {
    const pod = super.toPod();
    pod.nameToken = this.nameToken;
    return pod;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionMemberIdentifier extends ExpressionIdentifier {
  static precedence = Precedence.Property;

  constructor(base, nameToken, where, unevaluated) {
    super(nameToken, where, unevaluated);
    this.base = base;
  }

  evaluate(env) {
    let baseValue = this.base.evaluate(env);
    let value = baseValue.get(this.nameToken.source);
    if (value) {
      return value;
    } else {
      throw new LocatedException(this.nameToken.where, `I'm sorry, but I've never heard of this "${this.nameToken.source}" before.`);
    }
  }

  assign(env, rhs, whereAssigned) {
    const baseValue = this.base.evaluate(env); 
    const rhsValue = rhs.evaluate(env);

    if (baseValue.hasOwnProperty('sourceSpans')) {
      baseValue.sourceSpans.push(whereAssigned);
    }

    baseValue.bind(this.nameToken.source, rhsValue, rhs);

    return rhsValue;
  }

  toPretty() {
    return `.${this.nameToken.source}`;
  }

  toPod() {
    const pod = super.toPod();
    pod.base = this.base.toPod();
    return pod;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionDistributedIdentifier extends ExpressionIdentifier {
  static precedence = Precedence.Property;

  constructor(base, nameToken, where, unevaluated) {
    super(nameToken, where, unevaluated);
    this.base = base;
  }

  evaluate(env) {
    let baseValue = this.base.evaluate(env); 
    // assert vector

    let elements = baseValue.map(element => element.get(this.nameToken.source));

    return new ExpressionVector(elements);
  }

  assign(env, rhs) {
    let baseValue = this.base.evaluate(env); 
    // assert vector

    let rhsValue = rhs.evaluate(env);

    baseValue.forEach(element => {
      element.bind(this.nameToken.source, rhsValue, rhs);
    });

    return rhsValue;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionFunctionCall extends Expression {
  static precedence = Precedence.Call;

  constructor(nameToken, actuals, where, unevaluated) {
    super(where, unevaluated);
    this.nameToken = nameToken;
    this.actuals = actuals;
  }

  lookup(env) {
    let f = env.getFunction(this.nameToken.source);
    if (!f) {
      throw new LocatedException(this.where, `I've not heard of any function named <var>${this.nameToken.source}</var>.`);
    }
    return f;
  }

  evaluate(env) {
    let f = this.lookup(env);

    const providedParameters = [];
    env.root.addCall(this.where, f.documentation, providedParameters);

    let unknownParameters = [];

    let callEnvironment = Environment.create(env);
    for (let [identifier, actual] of Object.entries(this.actuals)) {
      if (!f.formals.find(formal => formal.name === identifier)) {
        unknownParameters.push({identifier: identifier, isAutoscopic: !actual.expression});
      } else {
        providedParameters.push(identifier);
        let value;
        if (actual.expression) {
          value = actual.expression.evaluate(env);
        } else {
          if (!env.ownsVariable(identifier)) {
            throw new LocatedException(actual.where, `I expected <var>${identifier}</var> to be defined. But it's not.\n\nPerhaps the documentation might help.`, {documentation: f.documentation, providedParameters});
          }
          value = env.variables[identifier];
        }
        callEnvironment.bind(identifier, value);
      }
    }

    if (unknownParameters.length > 0) {
      throw new LocatedException(this.where, `I didn't expect function <var>${this.nameToken.source}</var> to be provided a parameter named <var>${unknownParameters[0].identifier}</var>. ${unknownParameters[0].isAutoscopic && f.formals.length > 0 ? "Perhaps you need to explicitly name it?" : "I'm not sure what to do with that parameter."}\n\nCheck the documentation panel for a description of the parameters.`, {documentation: f.documentation, providedParameters});
    }

    // Look for any missing formals. Supply implicit or default if possible.
    for (let formal of f.formals) {
      if (!callEnvironment.ownsVariable(formal.name)) {
        if (env.ownsVariable(formal.name)) {
          providedParameters.push(formal.name);
          callEnvironment.bind(formal.name, env.variables[formal.name]);
        } else if (formal.defaultThunk) {
          const value = formal.defaultThunk.evaluate(env);
          callEnvironment.bind(formal.name, value);
        } else {
          throw new LocatedException(this.where, `I expected function <var>${this.nameToken.source}</var> to be provided a parameter named <var>${formal.name}</var>.\n\nPerhaps the documentation might help.`, {documentation: f.documentation, providedParameters});
        }
      }
    }

    try {
      let returnValue = f.body.evaluate(callEnvironment, this);
      return returnValue;
    } catch (e) {
      if (e instanceof LocatedException) {
        throw e;
      } else if (e instanceof MessagedException) {
        throw new LocatedException(this.where, e.message);
      } else {
        throw e;
      }
    }
  }

  toPod() {
    const pod = super.toPod();
    pod.nameToken = this.nameToken;
    pod.actuals = this.actuals.map(actual => actual.toPod());
    return pod;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionMemberFunctionCall extends ExpressionFunctionCall {
  constructor(host, nameToken, actuals, where, unevaluated) {
    super(nameToken, actuals, where, unevaluated);
    this.host = host;
  }

  lookup(env) {
    let hostValue = this.host.evaluate(env);

    if (!hostValue.hasFunction(this.nameToken.source)) {
      throw new LocatedException(this.where, `I've not heard of any method named <var>${this.nameToken.source}</var>.`);
    }

    return hostValue.getFunction(this.nameToken.source);
  }
}

// ---------------------------------------------------------------------------

export class ExpressionBlock extends Expression {
  static precedence = Precedence.Atom;

  constructor(statements, where, unevaluated) {
    super(where, unevaluated);
    this.statements = statements;
  }

  evaluate(env, a, toTime) {
    let result = null; // TODO Unit
    for (let statement of this.statements) {
      result = statement.evaluate(env, a, toTime);
    }
    return result;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionAssignment extends Expression {
  static precedence = Precedence.Assignment;

  constructor(l, r, where, unevaluated) {
    super(where, unevaluated);
    this.l = l;
    this.r = r;
  }

  evaluate(env) {
    if ('assign' in this.l) {
      return this.l.assign(env, this.r, this.where);
    } else {
      throw 'unassignable';
    }
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionIf extends Expression {
  static precedence = Precedence.Atom;

  constructor(conditions, thenBlocks, elseBlock, where, unevaluated) {
    super(where, unevaluated);
    this.conditions = conditions;
    this.thenBlocks = thenBlocks;
    this.elseBlock = elseBlock;
  }

  evaluate(env) {
    for (let [i, condition] of this.conditions.entries()) {
      let conditionValue = condition.evaluate(env).value;
      // TODO assert boolean
      if (conditionValue) {
        return this.thenBlocks[i].evaluate(env);
      }
    }

    if (this.elseBlock) {
      return this.elseBlock.evaluate(env);
    } else {
      return null; // TODO unit
    }
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionFor extends Expression {
  static precedence = Precedence.Atom;

  constructor(i, start, stop, by, body, where, unevaluated) {
    super(where, unevaluated);
    this.i = i;
    this.start = start;
    this.stop = stop;
    this.by = by;
    this.body = body;
  }

  evaluate(env) {
    let start = this.start.evaluate(env).value;
    let stop = this.stop.evaluate(env).value;
    let by = this.by.evaluate(env).value;

    for (let i = start; i < stop; i += by) {
      new ExpressionAssignment(this.i, new ExpressionInteger(i)).evaluate(env);
      this.body.evaluate(env);
    }

    // TODO return?
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionForOf extends Expression {
  static precedence = Precedence.Atom;

  constructor(iterator, vector, body, where, unevaluated) {
    super(where, unevaluated);
    this.iterator = iterator;
    this.vector = vector;
    this.body = body;
  }

  evaluate(env) {
    let values = this.vector.evaluate(env).value;

    for (let i = 0; i < values.length; ++i) {
      new ExpressionAssignment(this.iterator, values[i]).evaluate(env);
      this.body.evaluate(env);
    }

    // TODO return?
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionSubscript extends Expression {
  static precedence = Precedence.Property;

  constructor(base, index, where, unevaluated) {
    super(where, unevaluated);
    this.base = base;
    this.index = index;
  }

  evaluate(env) {
    let baseValue = this.base.evaluate(env); 
    if (!(baseValue instanceof ExpressionVector) && !(baseValue instanceof ExpressionString) && !(baseValue instanceof ExpressionInteger)) {
      throw new LocatedException(this.base.where, `I'm sorry, but I can only apply [] to vectors, strings, and integers. This expression has type ${baseValue.type}.`);
    }

    let indexValue = this.index.evaluate(env); 
    if (!(indexValue instanceof ExpressionInteger)) {
      throw new LocatedException(this.index.where, `I'm sorry, but the index must be an integer.`);
    }

    try {
      let element = baseValue.get(indexValue.value);
      return element;
    } catch (e) {
      throw new LocatedException(this.index.where, e.message);
    }
  }

  assign(env, rhs) {
    let baseValue = this.base.evaluate(env); 
    if (!(baseValue instanceof ExpressionVector) && !(baseValue instanceof ExpressionString)) {
      throw new LocatedException(this.base.where, `I'm sorry, but I can only apply [] to vectors and strings. This expression has type ${baseValue.type}.`);
    }

    let indexValue = this.index.evaluate(env); 
    if (!(indexValue instanceof ExpressionInteger)) {
      throw new LocatedException(this.index.where, `I'm sorry, but the index must be an integer.`);
    }

    let rhsValue = rhs.evaluate(env); 
    baseValue.set(indexValue.value, rhsValue);
    return rhsValue;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionVectorPush extends Expression {
  static precedence = Precedence.Property;

  constructor(instance, unevaluated) {
    super(undefined, unevaluated);
    this.instance = instance;
  }

  evaluate(env, callExpression) {
    let item = env.variables.item;
    return this.instance.push(item);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionVectorPop extends Expression {
  static precedence = Precedence.Property;

  constructor(instance, unevaluated) {
    super(undefined, unevaluated);
    this.instance = instance;
  }

  evaluate(env, callExpression) {
    let item = this.instance.pop();
    return item;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionVectorSize extends Expression {
  static precedence = Precedence.Property;

  constructor(instance, unevaluated) {
    super(undefined, unevaluated);
    this.instance = instance;
  }

  evaluate(env, callExpression) {
    return new ExpressionInteger(this.instance.value.length);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionVectorToCartesian extends Expression {
  static precedence = Precedence.Property;

  constructor(instance, unevaluated) {
    super(undefined, unevaluated);
    this.instance = instance;
  }

  evaluate(env, callExpression) {
    return this.instance.toCartesian();
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionVectorMagnitude extends Expression {
  static precedence = Precedence.Property;

  constructor(instance, unevaluated) {
    super(undefined, unevaluated);
    this.instance = instance;
  }

  evaluate(env, callExpression) {
    return new ExpressionReal(this.instance.magnitude);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionVectorNormalize extends Expression {
  static precedence = Precedence.Property;

  constructor(instance, unevaluated) {
    super(undefined, unevaluated);
    this.instance = instance;
  }

  evaluate(env, callExpression) {
    return this.instance.normalize();
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionVectorRotate extends Expression {
  static precedence = Precedence.Property;

  constructor(instance, unevaluated) {
    super(undefined, unevaluated);
    this.instance = instance;
  }

  evaluate(env, callExpression) {
    let degrees = env.variables.degrees;
    return this.instance.rotate(degrees);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionVectorRotateAround extends Expression {
  static precedence = Precedence.Property;

  constructor(instance, unevaluated) {
    super(undefined, unevaluated);
    this.instance = instance;
  }

  evaluate(env, callExpression) {
    let pivot = env.variables.pivot;
    let degrees = env.variables.degrees;
    return this.instance.rotateAround(pivot, degrees);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionVectorRotate90 extends Expression {
  static precedence = Precedence.Property;

  constructor(instance, unevaluated) {
    super(undefined, unevaluated);
    this.instance = instance;
  }

  evaluate(env, callExpression) {
    return this.instance.rotate90();
  }
}

// --------------------------------------------------------------------------- 

export class StatementFrom extends Expression {
  static precedence = Precedence.Atom;

  constructor(fromTimeExpression, block, where, unevaluated) {
    super(where, unevaluated);
    this.fromTimeExpression = fromTimeExpression;
    this.block = block;
  }

  evaluate(env) {
    let realFromTime = this.fromTimeExpression.evaluate(env);
    this.block.evaluate(env, realFromTime, null);
    // TODO return?
  }
}

// --------------------------------------------------------------------------- 

export class StatementTo extends Expression {
  static precedence = Precedence.Atom;

  constructor(toTimeExpression, block, where, unevaluated) {
    super(where, unevaluated);
    this.toTimeExpression = toTimeExpression;
    this.block = block;
  }

  evaluate(env) {
    let realToTime = this.toTimeExpression.evaluate(env);
    this.block.evaluate(env, null, realToTime);
  }
}

// --------------------------------------------------------------------------- 

export class StatementBetween extends Expression {
  static precedence = Precedence.Atom;

  constructor(fromTimeExpression, toTimeExpression, block, where, unevaluated) {
    super(where, unevaluated);
    this.fromTimeExpression = fromTimeExpression;
    this.toTimeExpression = toTimeExpression;
    this.block = block;
  }

  evaluate(env) {
    let realFromTime = this.fromTimeExpression.evaluate(env);
    let realToTime = this.toTimeExpression.evaluate(env);
    this.block.evaluate(env, realFromTime, realToTime);
  }
}

// --------------------------------------------------------------------------- 

export class StatementThrough extends Expression {
  static precedence = Precedence.Atom;

  constructor(throughTimeExpression, block, where, unevaluated) {
    super(where, unevaluated);
    this.throughTimeExpression = throughTimeExpression;
    this.block = block;
  }

  evaluate(env) {
    let throughTime = this.throughTimeExpression.evaluate(env);
    this.block.evaluate(env, null, throughTime);
    this.block.evaluate(env, throughTime, null);
  }
}

// --------------------------------------------------------------------------- 

export class StatementToStasis extends Expression {
  static precedence = Precedence.Atom;

  constructor(startTimeExpression, endTimeExpression, block, where, unevaluated) {
    super(where, unevaluated);
    this.startTimeExpression = startTimeExpression;
    this.endTimeExpression = endTimeExpression;
    this.block = block;
  }

  evaluate(env) {
    let startTime = this.startTimeExpression.evaluate(env);
    let endTime = this.endTimeExpression.evaluate(env);
    this.block.evaluate(env, null, startTime);
    this.block.evaluate(env, startTime, endTime);
  }
}

// --------------------------------------------------------------------------- 

export class StatementFromStasis extends Expression {
  static precedence = Precedence.Atom;

  constructor(startTimeExpression, endTimeExpression, block, where, unevaluated) {
    super(where, unevaluated);
    this.startTimeExpression = startTimeExpression;
    this.endTimeExpression = endTimeExpression;
    this.block = block;
  }

  evaluate(env) {
    let startTime = this.startTimeExpression.evaluate(env);
    let endTime = this.endTimeExpression.evaluate(env);
    this.block.evaluate(env, startTime, endTime);
    this.block.evaluate(env, endTime, null);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionRepeat extends Expression {
  static precedence = Precedence.Atom;

  constructor(count, body, where, unevaluated) {
    super(where, unevaluated);
    this.count = count;
    this.body = body;
  }

  evaluate(env) {
    let count = this.count.evaluate(env).value;
    let last = null;
    for (let i = 0; i < count; ++i) {
      last = this.body.evaluate(env);
    }
    return last;
  }
}

// --------------------------------------------------------------------------- 

// TODO: better names
export class ExpressionRepeatAround extends Expression {
  static precedence = Precedence.Atom;

  constructor(count, body, around, where, unevaluated) {
    super(where, unevaluated);
    this.count = count;
    this.body = body;
    this.around = around;
  }

  evaluate(env) {
    let count = this.count.evaluate(env).value;
    let last = null;
    for (let i = 0; i < count; ++i) {
      last = this.body.evaluate(env);
      if (i < count - 1) {
        this.around.evaluate(env);
      }
    }
    return last;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionFunction extends Expression {
  static precedence = Precedence.Call;
}

// --------------------------------------------------------------------------- 

export class ExpressionPrint extends ExpressionFunction {
  evaluate(env, callExpression) {
    let message = env.variables.message.toPretty();
    env.root.log(message);
    return null;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionDebug extends ExpressionFunction {
  evaluate(env, callExpression) {
    console.log("callExpression.actuals:", callExpression.actuals);
    const where = callExpression.actuals.code.expression.where;

    const lines = env.root.source.split('\n');
    const pieces = [];
    for (let i = where.lineStart; i <= where.lineEnd; ++i) {
      const startIndex = i === where.lineStart ? where.columnStart : 0;
      const endIndex = i === where.lineEnd ? where.columnEnd + 1 : lines[i].length;
      pieces.push(lines[i].substring(startIndex, endIndex));
    }

    let message = `${pieces.join("\n")}: ${env.variables.code.toPretty()}`;
    env.root.log(message);

    return null;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionSeed extends ExpressionFunction {
  evaluate(env, callExpression) {
    let seed = env.variables.value.value;
    env.root.prng.seed(seed);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionRandom extends ExpressionFunction {
  evaluate(env, callExpression) {
    let min = env.variables.min;
    let max = env.variables.max;

    let x;
    if (min instanceof ExpressionInteger && max instanceof ExpressionInteger) {
      let random = env.root.prng.random01();
      let x = Math.floor(random * (max.value - min.value) + min.value);
      return new ExpressionInteger(x);
    } else {
      let random = env.root.prng.random01();
      let x = random * (max.value - min.value) + min.value;
      return new ExpressionReal(x);
    }
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionSine extends ExpressionFunction {
  evaluate(env, callExpression) {
    let degrees = env.variables.degrees.value;
    let x = Math.sin(degrees * Math.PI / 180);
    return new ExpressionReal(x);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionCosine extends ExpressionFunction {
  evaluate(env, callExpression) {
    let degrees = env.variables.degrees.value;
    let x = Math.cos(degrees * Math.PI / 180);
    return new ExpressionReal(x);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionTangent extends ExpressionFunction {
  evaluate(env, callExpression) {
    let degrees = env.variables.degrees.value;
    let x = Math.tan(degrees * Math.PI / 180);
    return new ExpressionReal(x);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionArcCosine extends ExpressionFunction {
  evaluate(env, callExpression) {
    let ratio = env.variables.ratio.value;
    let angle = Math.acos(ratio) * 180 / Math.PI;
    return new ExpressionReal(angle);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionArcSine extends ExpressionFunction {
  evaluate(env, callExpression) {
    let ratio = env.variables.ratio.value;
    let angle = Math.asin(ratio) * 180 / Math.PI;
    return new ExpressionReal(angle);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionHypotenuse extends ExpressionFunction {
  evaluate(env, callExpression) {
    let a = env.variables.a.value;
    let b = env.variables.b.value;
    let hypotenuse = Math.sqrt(a * a + b * b);
    return new ExpressionReal(hypotenuse);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionArcTangent extends ExpressionFunction {
  evaluate(env, callExpression) {
    let ratio = env.variables.ratio.value;
    let angle = Math.atan(ratio) * 180 / Math.PI;
    return new ExpressionReal(angle);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionArcTangent2 extends ExpressionFunction {
  evaluate(env, callExpression) {
    let a = env.variables.a.value;
    let b = env.variables.b.value;
    let angle = Math.atan2(a, b) * 180 / Math.PI;
    return new ExpressionReal(angle);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionSquareRoot extends ExpressionFunction {
  evaluate(env, callExpression) {
    let x = env.variables.x.value;
    let root = Math.sqrt(x);
    return new ExpressionReal(root);
  }
}

// --------------------------------------------------------------------------- 

// The casting function.
export class ExpressionInt extends ExpressionFunction {
  evaluate(env, callExpression) {
    let f = env.variables.x.value;
    console.log("f:", f);
    let i = Math.trunc(f);
    console.log("i:", i);
    return new ExpressionInteger(i);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionGroup extends ExpressionFunction {
  evaluate(env, callExpression) {
    return Group.create(env, callExpression.where);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionTip extends ExpressionFunction {
  evaluate(env, callExpression) {
    return Tip.create(env, callExpression.where);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionMask extends ExpressionFunction {
  evaluate(env, callExpression) {
    return Mask.create(env, callExpression.where);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionCutout extends ExpressionFunction {
  evaluate(env, callExpression) {
    return Cutout.create(env, callExpression.where);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionVector extends ExpressionData {
  constructor(elements, where, unevaluated, prevalues) {
    super(elements, where, unevaluated, prevalues);

    this.functions = {
      normalize: new FunctionDefinition('normalize', '', [], new ExpressionVectorNormalize(this)),
      size: new FunctionDefinition('size', '', [], new ExpressionVectorSize(this)),
      magnitude: new FunctionDefinition('magnitude', '', [], new ExpressionVectorMagnitude(this)),
      toCartesian: new FunctionDefinition('toCartesian', '', [], new ExpressionVectorToCartesian(this)),
      rotateAround: new FunctionDefinition('rotateAround', '', [new FormalParameter('pivot'), new FormalParameter('degrees')], new ExpressionVectorRotateAround(this)),
      rotate: new FunctionDefinition('rotate', '', [new FormalParameter('degrees')], new ExpressionVectorRotate(this)),
      rotate90: new FunctionDefinition('rotate90', '', [], new ExpressionVectorRotate90(this)),
      push: new FunctionDefinition('push', 'Add an element to the end of this vector.', [
        new FormalParameter('item', 'The element to add.'),
      ], new ExpressionVectorPush(this)),
      pop: new FunctionDefinition('pop', 'Remove the last element from this vector.', [], new ExpressionVectorPop(this)),
    };
  }

  assign(index, rhs) {
    if (index instanceof ExpressionIdentifier) {
      let id = index.token.source;
      if (id == 'x' || id == 'r') {
        this.value[0] = rhs;
      } else if (id == 'y' || id == 'g') {
        this.value[1] = rhs;
      } else if (id == 'z' || id == 'b') {
        this.value[2] = rhs;
      }
    } else if (index instanceof ExpressionInteger) {
      this.value[index.value] = rhs;
    }
    return rhs;
  }

  clone() {
    return new ExpressionVector(this.value.map(e => e.clone()), this.where == null ? null : this.where.clone(), this.unevaluated, this.prevalues);
  }

  evaluate(env) {
    let values = this.value.map(element => {
      return element.evaluate(env);
    });
    // TODO migrate nullable
    return new ExpressionVector(values, this.where?.clone());
  }

  push(item) {
    this.value.push(item);
  }

  pop() {
    return this.value.pop();
  }

  map(transform) {
    return this.value.map(transform);
  }

  bind(id, value) {
    if (id == 'x' || id == 'r') {
      this.value[0] = value;
    } else if (id == 'y' || id == 'g') {
      this.value[1] = value;
    } else if (id == 'z' || id == 'b') {
      this.value[2] = value;
    }
  }

  forEach(each) {
    this.value.forEach(each);
  }

  set(i, value) {
    this.value[i] = value;
  }

  get(i) {
    if (i == 'x' || i == 'r') {
      return this.value[0];
    } else if (i == 'y' || i == 'g') {
      return this.value[1];
    } else if (i == 'z' || i == 'b') {
      return this.value[2];
    } else if (i instanceof ExpressionFunctionCall && this.functions.hasOwnProperty(i.name)) {
      return this.functions[i.name];
    } else if (typeof i == 'number') {
      if (i < 0 || i >= this.value.length) {
        throw new MessagedException(`I can't get element ${i} of this vector because ${i} is not a legal index in a vector of length ${this.value.length}.`)
      } else {
        return this.value[i];
      }
    } else if (i instanceof ExpressionInteger) {
      return this.value[i.value];
    } else {
      throw new MessagedException('uh oh');
      return super.get(i);
    }
  }

  toColor(env) {
    let r = Math.floor(this.value[0].value * 255);
    let g = Math.floor(this.value[1].value * 255);
    let b = Math.floor(this.value[2].value * 255);
    return 'rgb(' + r + ', ' + g + ', ' + b + ')';
  }

  toHexColor(env) {
    let r = Math.floor(this.value[0].value * 255).toString(16);
    let g = Math.floor(this.value[1].value * 255).toString(16);
    let b = Math.floor(this.value[2].value * 255).toString(16);
    if (r.length == 1) {
      r = '0' + r;
    }
    if (g.length == 1) {
      g = '0' + g;
    }
    if (b.length == 1) {
      b = '0' + b;
    }
    return `#${r}${g}${b}`;
  }

  toPretty(env) {
    return '[' + this.value.map(element => element.toPretty()).join(', ') + ']';
  }

  toSpacedString(env) {
    return this.value.map(element => element.toPretty()).join(' ');
  }

  interpolateLinear(other, proportion) {
    return new ExpressionVector(this.value.map((element, i) => element.interpolateLinear(other.get(i), proportion)));
  }

  interpolateNearest(other, proportion) {
    return new ExpressionVector(this.value.map((element, i) => element.interpolateNearest(other.get(i), proportion)));
  }

  interpolateSineInOut(other, proportion) {
    return new ExpressionVector(this.value.map((element, i) => element.interpolateSineInOut(other.get(i), proportion)));
  }

  interpolateBackInOut(other, proportion) {
    return new ExpressionVector(this.value.map((element, i) => element.interpolateBackInOut(other.get(i), proportion)));
  }

  interpolateQuadraticInOut(other, proportion) {
    return new ExpressionVector(this.value.map((element, i) => element.interpolateQuadraticInOut(other.get(i), proportion)));
  }

  interpolateCubicInOut(other, proportion) {
    return new ExpressionVector(this.value.map((element, i) => element.interpolateCubicInOut(other.get(i), proportion)));
  }

  interpolateQuarticInOut(other, proportion) {
    return new ExpressionVector(this.value.map((element, i) => element.interpolateQuarticInOut(other.get(i), proportion)));
  }

  interpolateQuinticInOut(other, proportion) {
    return new ExpressionVector(this.value.map((element, i) => element.interpolateQuinticInOut(other.get(i), proportion)));
  }

  get magnitude() {
    let sum = 0;
    for (let i = 0; i < this.value.length; ++i) {
      sum += this.get(i).value * this.get(i).value;
    }
    return Math.sqrt(sum);
  }

  normalize() {
    let magnitude = this.magnitude;
    let newElements = this.value.map(element => new ExpressionReal(element.value / magnitude));
    return new ExpressionVector(newElements);
  }

  lengthen(length) {
    return this.normalize().multiply(length);
  }

  distance(that) {
    return new ExpressionReal(that.subtract(this).magnitude);
  }

  midpoint(that) {
    let newElements = this.value.map((element, i) => new ExpressionReal((element.value + that.value[i].value) / 2));
    return new ExpressionVector(newElements);
  }

  rotate90() {
    let newElements = [this.value[1], this.value[0].negative()];
    return new ExpressionVector(newElements);
  }

  rotate(degrees) {
    let radians = degrees * Math.PI / 180;
    let newVector = new ExpressionVector([
      new ExpressionReal(this.get(0).value * Math.cos(radians) - this.get(1).value * Math.sin(radians)),
      new ExpressionReal(this.get(0).value * Math.sin(radians) + this.get(1).value * Math.cos(radians)),
    ]);
    return newVector;
  }

  rotateAround(pivot, degrees) {
    let radians = degrees.value * Math.PI / 180;
    let diff = this.subtract(pivot);
    let newVector = new ExpressionVector([
      new ExpressionReal(diff.get(0).value * Math.cos(radians) - diff.get(1).value * Math.sin(radians)),
      new ExpressionReal(diff.get(0).value * Math.sin(radians) + diff.get(1).value * Math.cos(radians)),
    ]);
    return newVector.add(pivot);
  }

  toCartesian() {
    if (this.value.length != 2) {
      throw new MessagedException("only toCartesian() for 2D");
    }

    let radius = this.get(0).value;
    let degrees = this.get(1).value;
    let radians = degrees * Math.PI / 180;
    let xy = [
      new ExpressionReal(radius * Math.cos(radians)),
      new ExpressionReal(radius * Math.sin(radians))
    ];

    return new ExpressionVector(xy);
  }

  multiply(other) {
    if (other instanceof ExpressionVector) {
      let result = [];
      for (let i = 0; i < this.value.length; ++i) {
        result.push(this.get(i).multiply(other.get(i)));
      }
      return new ExpressionVector(result);
    } else if (other instanceof ExpressionInteger || other instanceof ExpressionReal) {
      let result = [];
      for (let i = 0; i < this.value.length; ++i) {
        result.push(this.get(i).multiply(other));
      }
      return new ExpressionVector(result);
    } else {
      throw 'bad vector multiply';
    }
  }

  divide(other) {
    if (other instanceof ExpressionVector) {
      let result = [];
      for (let i = 0; i < this.value.length; ++i) {
        result.push(this.get(i).divide(other.get(i)));
      }
      return new ExpressionVector(result);
    } else if (other instanceof ExpressionInteger || other instanceof ExpressionReal) {
      let result = [];
      for (let i = 0; i < this.value.length; ++i) {
        result.push(this.get(i).divide(other));
      }
      return new ExpressionVector(result);
    } else {
      throw 'bad vector divide';
    }
  }

  add(other) {
    if (other instanceof ExpressionVector) {
      let result = [];
      for (let i = 0; i < this.value.length; ++i) {
        result.push(this.get(i).add(other.get(i)));
      }
      return new ExpressionVector(result);
    } else if (other instanceof ExpressionInteger || other instanceof ExpressionReal) {
      let result = [];
      for (let i = 0; i < this.value.length; ++i) {
        result.push(this.get(i).add(other));
      }
      return new ExpressionVector(result);
    } else if (other instanceof ExpressionString) {
      return new ExpressionString(this.toPretty() + other.toString());
    } else {
      throw 'bad vector add';
    }
  }

  subtract(other) {
    if (other instanceof ExpressionVector) {
      let result = [];
      for (let i = 0; i < this.value.length; ++i) {
        result.push(this.get(i).subtract(other.get(i)));
      }
      return new ExpressionVector(result);
    } else if (other instanceof ExpressionInteger || other instanceof ExpressionReal) {
      let result = [];
      for (let i = 0; i < this.value.length; ++i) {
        result.push(this.get(i).subtract(other));
      }
      return new ExpressionVector(result);
    } else {
      throw 'bad vector subtract';
    }
  }

  negative() {
    let result = [];
    for (let i = 0; i < this.value.length; ++i) {
      result.push(this.get(i).negative());
    }
    return new ExpressionVector(result);
  }

  dot(that) {
    // TODO ensure same cardinality
    let sum = 0;
    for (let i = 0; i < this.value.length; ++i) {
      sum += this.get(i).multiply(that.get(i)).value;
    }
    return sum;
  }

  distanceToLine(point, axis) {
    let diff = this.subtract(point);
    const hypotenuse = diff.magnitude;
    diff = diff.normalize();
    let radians = Math.acos(axis.dot(diff));
    return hypotenuse * Math.sin(radians);
  }

  mirror(point, axis) {
    let normal = axis.normalize();
    let diff = point.subtract(this); // ORDER?
    let length = diff.dot(normal);
    normal = normal.multiply(new ExpressionReal(length * 2));
    normal = normal.subtract(diff);
    let reflection = point.subtract(normal);
    return reflection;
  }

  toPod() {
    const pod = super.toPod();
    pod.value = this.value.map(element => element.toPod());
    return pod;
  }

  resolveReferences(shapes) {
    for (let i = 0; i < this.value.length; ++i) {
      const element = this.value[i];
      if (element.hasOwnProperty('type') && element.type === 'reference') {
        this.value[i] = shapes.find(shape => shape.id === element.id);
      } else if (element instanceof ExpressionVector) {
        element.resolveReferences(shapes);
      }
    }
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionMirror extends ExpressionFunction {
  constructor(instance, unevaluated) {
    super(null, unevaluated);
    this.instance = instance;
  }

  evaluate(env, callExpression) {
    return Mirror.create(this.instance, callExpression.where);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionMoveto extends ExpressionFunction {
  evaluate(env) {
    const x = env.variables.x.value;
    const y = env.variables.y.value;
    const z = env.variables.z.value;
    const radius = env.variables.radius.value;
    const color = env.variables.color;
    const color3 = new Vector3(color.get(0).value, color.get(1).value, color.get(2).value);

    env.root.currentPath.turtle.relocate(new Vector3(x, y, z));
    env.root.visit({
      radius,
      color: color3,
    });
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionPolarto extends ExpressionFunction {
  evaluate(env) {
    const radius = env.variables.radius.value;
    const distance = env.variables.distance.value;
    const degrees = env.variables.degrees.value;
    const origin = env.variables.origin;
    const color = env.variables.color;
    const color3 = new Vector3(color.get(0).value, color.get(1).value, color.get(2).value);

    const radians = MathUtilities.toRadians(degrees);
    const x = distance * Math.cos(radians) + origin.get(0).value;
    const y = distance * Math.sin(radians) + origin.get(1).value;
    const z = origin.get(2).value;

    env.root.currentPath.turtle.relocate(new Vector3(x, y, z));
    env.root.visit({
      radius,
      color: color3,
    });
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionMove extends ExpressionFunction {
  evaluate(env) {
    const distance = env.variables.distance.value;
    const radius = env.variables.radius.value;
    const color = env.variables.color;
    const color3 = new Vector3(color.get(0).value, color.get(1).value, color.get(2).value);

    env.root.currentPath.turtle.advance(distance);
    env.root.visit({
      radius,
      color: color3,
    });
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionStay extends ExpressionFunction {
  evaluate(env) {
    const radius = env.variables.radius.value;
    const color = env.variables.color;
    const color3 = new Vector3(color.get(0).value, color.get(1).value, color.get(2).value);
    env.root.visit({
      radius,
      color: color3,
    });
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionYaw extends ExpressionFunction {
  evaluate(env) {
    const degrees = env.variables.degrees.value;
    env.root.currentPath.turtle.yaw(degrees);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionPitch extends ExpressionFunction {
  evaluate(env) {
    const degrees = env.variables.degrees.value;
    env.root.currentPath.turtle.pitch(degrees);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionRoll extends ExpressionFunction {
  evaluate(env) {
    const degrees = env.variables.degrees.value;
    env.root.currentPath.turtle.roll(degrees);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionHome extends ExpressionFunction {
  evaluate(env) {
    const path = env.root.currentPath;

    if (!path || path.vertices.length === 0) {
      throw new MessagedException("I expected home to be called on a non-empty path.");
    }

    const vertex = path.vertices[0];
    env.root.currentPath.turtle.relocate(vertex.position);
    env.root.visit({
      radius: vertex.radius,
      color: vertex.color,
    });
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionDowel extends ExpressionFunction {
  evaluate(env) {
    const nsides = env.variables.nsides.value;
    const twist = env.variables.twist.value;
    const sharpness = env.variables.sharpness.value;
    const name = env.variables.name.value;

    const path = env.root.seal();
    const positions = [];
    const colors = [];
    const faces = [];
    const vertices = [...path.vertices];

    // Helpers.
    const arePositionsCoincident = (a, b) => a.position.distance(b.position) < 1e-6;

    const issueFace = (base, i) => {
      faces.push([base + i, base + (i + 1) % nsides, base + (i + 1) % nsides + nsides]);
      faces.push([base + i % nsides, base + (i + 1) % nsides + nsides, base + i + nsides]);
    };

    const intersectPlaneAndRescale = (plane, forward, fromCenter, variables, base, color) => {
      const toCenter = plane.intersectRay(fromCenter, forward);
      const vertexZeroIndex = positions.length - nsides;
      for (let i = 0; i < nsides; ++i) {
        const from = positions[base + i];
        const to = plane.intersectRay(from, forward);
        const offset = to.subtract(toCenter).normalize();
        positions.push(toCenter.add(offset.scalarMultiply(variables.radius)));
        colors.push(variables.color);
        issueFace(vertexZeroIndex, i);
      }
    }

    if (vertices.length < 2) {
      throw new MessagedException("I expected this dowel to have at least two vertices.");
    }

    // Bundle all the coincident stops together to make traversal simpler. Each
    // stop will be physically separate from its predecessor and successor. Any
    // stays will be represented in the array of variables.
    const stops = [{
      position: vertices[0].position,
      variables: [{
        radius: vertices[0].radius,
        color: vertices[0].color,
      }],
    }];

    for (let i = 1; i < vertices.length; ++i) {
      const variables = {
        radius: vertices[i].radius,
        color: vertices[i].color,
      };

      if (arePositionsCoincident(vertices[i], stops[stops.length - 1])) {
        stops[stops.length - 1].variables.push(variables);
      } else {
        stops.push({
          position: vertices[i].position,
          variables: [variables],
        });
      }
    }

    if (vertices.length < 2) {
      throw new MessagedException("I expected this dowel to have at least two vertices.");
    }

    // Migrate any coincident stays at the end of the dowel to the beginning.
    if (path.isClosed && stops.length > 1 && arePositionsCoincident(stops[0], stops[stops.length - 1])) {
      const {variables} = stops.pop();
      stops[0].variables = [...variables, ...stops[0].variables];
    }

    // Seed first rings.
    let forward = stops[1].position.subtract(stops[0].position).normalize();
    const rotater = Matrix4.rotate(forward, 360 / nsides);
    const right = forward.perpendicular();

    for (let variables of stops[0].variables) {
      let offset = right.scalarMultiply(variables.radius).toVector4(0);
      offset = Matrix4.rotate(forward, twist).multiplyVector(offset);
      for (let i = 0; i < nsides; ++i) {
        positions.push(stops[0].position.add(offset));
        colors.push(variables.color);
        offset = rotater.multiplyVector(offset);
      }
    }

    // Issue faces connecting up any concentric rings of this first stop.
    for (let ringIndex = 0; ringIndex < stops[0].variables.length - 1; ++ringIndex) {
      for (let i = 0; i < nsides; ++i) {
        issueFace(ringIndex * nsides, i);
      }
    }

    // If the dowel is a closed circuit, then we need to project the positions
    // back onto a miter plane that bisects the angle between the last and
    // first segments or round off the bend.
    if (path.isClosed) {
      const backward = stops[stops.length - 1].position.subtract(stops[0].position).normalize();
      const radians = Math.acos(forward.dot(backward.inverse()));
      const degrees = MathUtilities.toDegrees(radians);

      if (degrees <= sharpness || stops[0].variables.length > 1) {
        const tangent = forward.add(backward.inverse()).normalize();
        const plane = new Plane(stops[0].position, tangent);

        for (let i = 0; i < positions.length; ++i) {
          positions[i] = plane.intersectRay(positions[i], forward);
        }
      } else {
        const supplementaryRadians = Math.PI - radians;
        const reach = stops[0].variables[0].radius / Math.sin(supplementaryRadians * 0.5);
        const pivot = forward.add(backward).normalize().scalarMultiply(reach).add(stops[0].position);
        const plane = new Plane(pivot, forward);
        const axis = forward.cross(backward).normalize();

        const backRotater = Matrix4.rotateAround(axis, -degrees, pivot);
        for (let i = 0; i < nsides; ++i) {
          const unrotatedPosition = plane.intersectRay(positions[i], forward);
          positions[i] = backRotater.multiplyVector(unrotatedPosition.toVector4(1)).toVector3();
        }

        const nwedges = Math.ceil(degrees / sharpness);
        const deltaDegrees = degrees / nwedges;

        const rotater = Matrix4.rotateAround(axis, deltaDegrees, pivot);
        for (let wedgeIndex = 0; wedgeIndex < nwedges; ++wedgeIndex) {
          const base = positions.length - nsides;
          for (let stopIndex = 0; stopIndex < nsides; ++stopIndex) {
            const from = positions[positions.length - nsides];
            const to = rotater.multiplyVector(positions[positions.length - nsides].toVector4(1)).toVector3();
            positions.push(to);
            colors.push(stops[0].variables[0].color);
            issueFace(base, stopIndex);
          }
        }
      }
    }

    for (let i = 1; i < stops.length; ++i) {
      const to = stops[i].position.subtract(stops[i - 1].position).normalize();
      
      // If this is the last position of a non-circuit, we intersect with a
      // plane perpendicular to the segment.
      if (i === stops.length - 1 && !path.isClosed) {
        const plane = new Plane(stops[i].position, to);
        const base = positions.length - nsides;
        intersectPlaneAndRescale(plane, to, stops[i - 1].position, stops[i].variables[0], base);
        for (let ringIndex = 1; ringIndex < stops[i].variables.length; ++ringIndex) {
          intersectPlaneAndRescale(plane, to, stops[i - 1].position, stops[i].variables[ringIndex], base);
        }
      }

      else {
        const from = stops[(i + 1) % stops.length].position.subtract(stops[i].position).normalize();
        const radians = Math.acos(from.dot(to));
        const degrees = MathUtilities.toDegrees(radians);

        if (degrees <= sharpness || stops[i].variables.length > 1) {
          // Cast rays from the preceding ring into a perpendicular plane.
          const perpendicularPlane = new Plane(stops[i].position, to);
          const vertexZeroIndex = positions.length - nsides;
          for (let variables of stops[i].variables) {
            intersectPlaneAndRescale(perpendicularPlane, to, stops[i - 1].position, variables, vertexZeroIndex);
          }

          const tangent = to.add(from).normalize();
          const miterPlane = new Plane(stops[i].position, tangent);
          for (let i = vertexZeroIndex + nsides; i < positions.length; ++i) {
            positions[i] = miterPlane.intersectRay(positions[i], to);
          }
        }

        // Round out bend in incremental stages.
        else {
          const supplementaryRadians = Math.PI - radians;
          const reach = stops[i].variables[0].radius / Math.sin(supplementaryRadians * 0.5);
          const pivot = to.inverse().add(from).normalize().scalarMultiply(reach).add(stops[i].position);
          const plane = new Plane(pivot, to);
          intersectPlaneAndRescale(plane, to, stops[i - 1].position, stops[i].variables[0], positions.length - nsides);

          const axis = to.cross(from).normalize();
          const nwedges = Math.ceil(degrees / sharpness);
          const deltaDegrees = degrees / nwedges;

          for (let wedgeIndex = 0; wedgeIndex < nwedges; ++wedgeIndex) {
            const base = positions.length - nsides;
            const rotater = Matrix4.rotateAround(axis, deltaDegrees, pivot);
            for (let radialIndex = 0; radialIndex < nsides; ++radialIndex) {
              const from = positions[positions.length - nsides];
              const to = rotater.multiplyVector(positions[positions.length - nsides].toVector4(1)).toVector3();
              positions.push(to);
              colors.push(stops[i].variables[0].color);
              issueFace(base, radialIndex);
            }
          }
        }
      }
    }

    if (path.isClosed) {
      const base = positions.length - nsides;
      for (let i = 0; i < nsides; ++i) {
        faces.push([base + i, base + (i + 1) % nsides, (i + 1) % nsides]);
        faces.push([base + i % nsides, (i + 1) % nsides, i]);
      }
    }

    if (!path.isClosed) {
      positions.push(stops[0].position);
      positions.push(stops[stops.length - 1].position);
      colors.push(stops[0].variables[0].color);
      const lastStop = stops[stops.length - 1];
      const lastVariables = lastStop.variables[lastStop.variables.length - 1];
      colors.push(lastVariables.color);
      for (let i = 0; i < nsides; ++i) {
        faces.push([positions.length - 2, (i + 1) % nsides, i]);
        faces.push([positions.length - 1, positions.length - 2 - nsides + i, positions.length - 2 - nsides + (i + 1) % nsides]);
      }
    }

    const mesh = new Trimesh(positions, faces);
    mesh.setColors(colors);
    env.root.addMesh(name instanceof ExpressionUnit ? undefined : name, mesh);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionRevolve extends ExpressionFunction {
  evaluate(env) {
    const nsides = env.variables.nsides.value;
    const degrees = env.variables.degrees.value;
    const axis = env.variables.axis;
    const origin = env.variables.origin;
    const name = env.variables.name.value;

    if (degrees < -360 || degrees > 360) {
      throw new LocatedException(env.variables.degrees.unevaluated.where, 'I expected the number of degrees given to <var>revolve</var> to be in the interval [-360, 360].');
    }

    const path = env.root.seal();
    const faces = [];

    if (path.vertices.length < 2) {
      throw new MessagedException("I expected this revolve to have at least two vertices.");
    }

    const degreesDelta = degrees / nsides;

    const axis3 = new Vector3(axis.value[0].value, axis.value[1].value, axis.value[2].value).normalize();
    const origin3 = new Vector3(origin.value[0].value, origin.value[1].value, origin.value[2].value);
    const rotater = Matrix4.rotateAround(axis3, degreesDelta, origin3);
    const isRotationClosed = Math.abs(Math.abs(degrees) - 360) < 1e-6;
    const ringCount = isRotationClosed ? nsides : nsides + 1;

    const vertices = [...path.vertices];

    let delta = new Vector3(0, 0, 0);
    for (let i = 0; delta.magnitude < 1e-6 && i < vertices.length; ++i) {
      const rrr = Matrix4.rotate(axis3, degrees < 0 ? -10 : 10, origin3);
      const rotatedPosition = rrr.multiplyVector(vertices[i].position.toVector4(1)).toVector3();
      delta = rotatedPosition.subtract(vertices[i].position);
    }

    const vertexPositions = vertices.map(vertex => vertex.position);
    const isCounterClockwise = Polyline.isCounterClockwise(Polyline.flatten(vertexPositions));
    const normal = Polyline.normal(vertexPositions);
    const normalDotDirection = normal.dot(delta);

    if (normalDotDirection < 0) {
      vertices.reverse();
    }

    const positions = new Array(vertices.length * ringCount);
    const colors = new Array(positions.length);
    for (let i = 0; i < vertices.length; ++i) {
      let {position, color} = vertices[i];
      for (let ringIndex = 0; ringIndex < ringCount; ++ringIndex) {
        positions[ringIndex * vertices.length + i] = position;
        colors[ringIndex * vertices.length + i] = color;
        position = rotater.multiplyVector(position.toVector4(1)).toVector3();
      }
    }

    const vertexCount = path.isClosed ? vertices.length : vertices.length - 1;

    const lastRingIndex = isRotationClosed ? ringCount - 1 : ringCount - 2;
    for (let ringIndex = 0; ringIndex <= lastRingIndex; ++ringIndex) {
      const base = ringIndex * vertices.length;
      for (let i = 0; i < vertexCount; ++i) {
        faces.push([
          base + i,
          base + (i + 1) % vertices.length,
          (base + i + vertices.length) % positions.length,
        ]);
        faces.push([
          base + (i + 1) % vertices.length,
          (base + (i + 1) % vertices.length + vertices.length) % positions.length,
          (base + i + vertices.length) % positions.length,
        ]);
      }
    }

    // Only if the cross section is closed but the revolution is incomplete do
    // we add caps.
    if (!isRotationClosed && path.isClosed) {
      const baseCap = Trimesh.triangulate(positions.slice(0, vertices.length));
      baseCap.reverseWinding();

      const offsetCap = Trimesh.triangulate(positions.slice(positions.length - vertices.length));

      faces.push(...baseCap.faces.map(face => face.map(i => i + positions.length)));
      positions.push(...baseCap.positions);
      colors.push(...vertices.map(vertex => vertex.color));

      faces.push(...offsetCap.faces.map(face => face.map(i => i + positions.length)));
      positions.push(...offsetCap.positions);
      colors.push(...vertices.map(vertex => vertex.color));
    }

    const mesh = new Trimesh(positions, faces);
    mesh.setColors(colors);

    console.log("mesh:", mesh);
    env.root.addMesh(name instanceof ExpressionUnit ? undefined : name, mesh);
    return new ExpressionTrimesh(mesh);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionCubes extends ExpressionFunction {
  evaluate(env) {
    const path = env.root.seal();
    const name = env.variables.name.value;

    for (let [i, vertex] of path.vertices.entries()) {
      const mesh = Prefab.cube(vertex.radius * 2, vertex.position);
      mesh.color(vertex.color);
      const actualName = name instanceof ExpressionUnit ? undefined : (path.vertices.length === 1 ? name : `${name}-${i}`);
      env.root.addMesh(actualName, mesh);
    }
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionSpheres extends ExpressionFunction {
  evaluate(env) {
    const path = env.root.seal();
    const nsides = env.variables.nsides.value;
    const name = env.variables.name.value;

    for (let [i, vertex] of path.vertices.entries()) {
      const mesh = Prefab.sphere(vertex.radius, vertex.position, nsides, Math.ceil(nsides / 2));
      mesh.color(vertex.color);
      const actualName = name instanceof ExpressionUnit ? undefined : (path.vertices.length === 1 ? name : `${name}-${i}`);
      env.root.addMesh(actualName, mesh);
    }
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionExtrude extends ExpressionFunction {
  evaluate(env) {
    const axis = env.variables.axis;
    const distance = env.variables.distance.value;
    const path = env.root.seal();
    const name = env.variables.name.value;

    if (path.vertices.length < 2) {
      throw new MessagedException("I expected this extrude to have at least 2 vertices.");
    }

    let vertices = [...path.vertices];

    const positions = [];
    const colors = [];
    const faces = [];

    const axis3 = new Vector3(axis.value[0].value, axis.value[1].value, axis.value[2].value).normalize();
    const offset = axis3.scalarMultiply(distance);

    positions.push(...vertices.map(vertex => vertex.position));
    colors.push(...vertices.map(vertex => vertex.color));

    const normal = Polyline.normal(positions);
    const normalDotAxis = normal.dot(axis3);
    const isCounterClockwise = Polyline.isCounterClockwise(Polyline.flatten(positions));

    if (normalDotAxis > 0) {
      positions.reverse();
    }

    positions.push(...positions.map(position => position.add(offset)));
    colors.push(...vertices.map(vertex => vertex.color));

    const stopIndex = path.isClosed ? vertices.length : vertices.length - 1;
    for (let i = 0; i < stopIndex; ++i) {
      faces.push([i, i + vertices.length, (i + 1) % vertices.length]);
      faces.push([(i + 1) % vertices.length, i + vertices.length, (i + 1) % vertices.length + vertices.length]);
    }

    // If the cross section is closed, then we add caps.
    if (path.isClosed) {
      const baseCap = Trimesh.triangulate(positions.slice(0, positions.length / 2));
      if ((isCounterClockwise && normalDotAxis > 0) || (!isCounterClockwise && normalDotAxis < 0)) {
        baseCap.reverseWinding();
      }

      const offsetCap = Trimesh.triangulate(positions.slice(positions.length / 2));
      if ((isCounterClockwise && normalDotAxis < 0) || (!isCounterClockwise && normalDotAxis > 0)) {
        offsetCap.reverseWinding();
      }

      faces.push(...baseCap.faces.map(face => face.map(i => i + positions.length)));
      positions.push(...baseCap.positions);
      colors.push(...vertices.map(vertex => vertex.color));

      faces.push(...offsetCap.faces.map(face => face.map(i => i + positions.length)));
      positions.push(...offsetCap.positions);
      colors.push(...vertices.map(vertex => vertex.color));
    }

    const mesh = new Trimesh(positions, faces);
    mesh.setColors(colors);
    env.root.addMesh(name instanceof ExpressionUnit ? undefined : name, mesh);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionPolygon extends ExpressionFunction {
  evaluate(env) {
    const path = env.root.seal();
    const isFlipped = env.variables.flip.value;
    const name = env.variables.name.value;

    let vertices = [...path.vertices];
    if (vertices.length < 3) {
      throw new MessagedException("I expected this polygon to have at least three unique vertices.");
    }

    const positions = vertices.map(vertex => vertex.position);
    const mesh = Trimesh.triangulate(positions);
    mesh.setColors(vertices.map(vertex => vertex.color));

    if (isFlipped) {
      mesh.reverseWinding();
    }

    env.root.addMesh(name instanceof ExpressionUnit ? undefined : name, mesh);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionTrimesh extends ExpressionData {
  static type = 'trimesh';
  static article = 'a';

  constructor(value, where) {
    super(value, where);
    this.functions = {
      scale: new FunctionDefinition('scale', 'Scales this triangular mesh.', [
        new FormalParameter('factors', 'TODO'),
        new FormalParameter('origin', 'TODO'),
      ], new ExpressionTrimeshScale(this)),
    };
  }

  toPretty() {
    return null;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionPath extends ExpressionData {
  static type = 'path';
  static article = 'a';

  constructor(value, where) {
    super(value, where);
  }

  toPretty() {
    return this.value.vertices.map(vertex => {
      return `{position: ${vertex.position.toString()}, radius: ${vertex.radius}, color: ${vertex.color.toString()}}`;
    }).join("\n");
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionMold extends ExpressionFunction {
  evaluate(env) {
    const path = env.root.seal();
    return new ExpressionPath(path);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionRotate extends ExpressionFunction {
  evaluate(env) {
    const path = env.variables.path.value;
    const degrees = env.variables.degrees.value;
    const axis = env.variables.axis;
    const origin = env.variables.origin;
    const axis3 = new Vector3(axis.value[0].value, axis.value[1].value, axis.value[2].value).normalize();
    const origin3 = new Vector3(origin.value[0].value, origin.value[1].value, origin.value[2].value);

    const rotater = Matrix4.rotateAround(axis3, degrees, origin3);

    const newPath = new Path();
    newPath.isClosed = path.isClosed;
    newPath.turtle = path.turtle;

    newPath.vertices = path.vertices.map(vertex => ({
      ...vertex,
      position: rotater.multiplyVector(vertex.position.toVector4(1)).toVector3(),
    }));

    env.root.paths.splice(env.root.paths.length - 1, 0, newPath);

    return new ExpressionPath(newPath);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionTable extends ExpressionFunction {
  evaluate(env) {
    const paths = env.variables.rows.value.map(ep => ep.value);
    const isCircuit = paths.length > 1 && paths[0].equals(paths[paths.length - 1]);

    let stopIndex;
    if (isCircuit) {
      paths.splice(paths.length - 1, 1);
      stopIndex = paths.length;
    } else {
      stopIndex = paths.length - 1;
    }

    const positions = paths.flatMap(path => path.vertices.map(vertex => vertex.position));
    const colors = paths.flatMap(path => path.vertices.map(vertex => vertex.color));

    const faces = [];
    for (let ringIndex = 0; ringIndex < stopIndex; ++ringIndex) {
      const path = paths[ringIndex];
      const base = ringIndex * path.vertices.length;
      const stopIndex = path.isClosed ? path.vertices.length : path.vertices.length - 1;
      for (let i = 0; i < stopIndex; ++i) {
        faces.push([
          base + i,
          (base + i + path.vertices.length) % positions.length,
          (base + (i + 1) % path.vertices.length) % positions.length,
        ]);
        faces.push([
          base + (i + 1) % path.vertices.length,
          (base + i + path.vertices.length) % positions.length,
          (base + path.vertices.length + (i + 1) % path.vertices.length) % positions.length,
        ]);
      }
    }

    const mesh = new Trimesh(positions, faces);
    mesh.setColors(colors);
    env.root.addMesh(name instanceof ExpressionUnit ? undefined : name, mesh);
  }
}


// --------------------------------------------------------------------------- 

export class ExpressionMesh extends ExpressionFunction {
  evaluate(env) {
    // const path = env.root.seal();

    const verticesList = env.variables.vertices.value;
    const facesList = env.variables.faces.value;

    // TODO check types

    const positions = verticesList.map(vertexList => {
      return new Vector3(vertexList.get(0).value, vertexList.get(1).value, vertexList.get(2).value);
    });

    const faces = facesList.map(faceList => {
      return [faceList.get(0).value, faceList.get(1).value, faceList.get(2).value];
    });

    const mesh = new Trimesh(positions, faces);
    env.root.addMesh(name instanceof ExpressionUnit ? undefined : name, mesh);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionTrimeshScale extends ExpressionFunction {
  constructor(instance, unevaluated) {
    super(undefined, unevaluated);
    this.instance = instance;
  }

  evaluate(env) {
    const factors = env.variables.factors;
    const origin = env.variables.origin;
    const factors3 = new Vector3(factors.value[0].value, factors.value[1].value, factors.value[2].value);
    const origin3 = new Vector3(origin.value[0].value, origin.value[1].value, origin.value[2].value);
    const scale = Matrix4.scaleAround(factors3, origin3);

    this.instance.value.transform(scale);
  }
}

// --------------------------------------------------------------------------- 

