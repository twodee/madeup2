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

import {Vector3} from './twodeejs/vector.js';
import {Matrix4} from './twodeejs/matrix.js';
import {Trimesh} from './twodeejs/trimesh.js';
import {Plane} from './twodeejs/plane.js';
import {Prefab} from './twodeejs/prefab.js';
import {MathUtilities} from './twodeejs/mathutilities.js';

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
}

// --------------------------------------------------------------------------- 

export class ExpressionData extends Expression {
  static precedence = Precedence.Atom;

  constructor(value, where, unevaluated, prevalues) {
    super(where, unevaluated);
    this.value = value;
    this.prevalues = prevalues;
  }

  bind(env, id) {
    env.bind(id, this);
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
      size: new FunctionDefinition('size', [], new ExpressionStringSize(this)),
    };
  }

  hasFunction(id) {
    return this.functions.hasOwnProperty(id);
  }

  getFunction(id) {
    return this.functions[id];
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

export class ExpressionStringSize extends Expression {
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
    env.functions[this.name] = new FunctionDefinition(this.name, this.formals, this.body);
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
      throw new LocatedException(this.nameToken.where, `I'm sorry, but I've never heard of this "${this.nameToken.source}" before.`);
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
      throw new LocatedException(this.where, `I've not heard of any function named <span class="messager-code">${this.nameToken.source}</span>.`);
    }
    return f;
  }

  evaluate(env) {
    let f = this.lookup(env);

    let unknownParameters = [];

    let callEnvironment = Environment.create(env);
    for (let [identifier, actualExpression] of Object.entries(this.actuals)) {
      if (!f.formals.find(formal => formal.name === identifier)) {
        unknownParameters.push(identifier);
      } else {
        let value;
        if (actualExpression) {
          value = actualExpression.evaluate(env);
        } else {
          value = env.variables[identifier];
        }
        callEnvironment.bind(identifier, value);
      }
    }

    if (unknownParameters.length > 0) {
      throw new LocatedException(this.where, `I didn't expect function <span class="messager-code">${this.nameToken.source}</span> to be provided a parameter named <span class="messager-code">${unknownParameters[0]}</span>. I'm not sure what to do with that parameter.\n\nPerhaps the documentation might help.`, f.toCallRecord(callEnvironment));
    }

    // Look for any missing formals. Supply implicit or default if possible.
    for (let formal of f.formals) {
      if (!callEnvironment.ownsVariable(formal.name)) {
        if (env.ownsVariable(formal.name)) {
          callEnvironment.bind(formal.name, env.variables[formal.name]);
        } else if (formal.defaultThunk) {
          const value = formal.defaultThunk.evaluate(env);
          callEnvironment.bind(formal.name, value);
        } else {
          throw new LocatedException(this.where, `I expected function <span class="messager-code">${this.nameToken.source}</span> to be provided a parameter named <span class="messager-code">${formal.name}</span>.\n\nPerhaps the documentation might help.`, f.toCallRecord(callEnvironment));
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
      throw new LocatedException(this.where, `I've not heard of any method named "${this.nameToken.source}".`);
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
      new ExpressionAssignment(this.i, new ExpressionInteger(i), true).evaluate(env);
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

export class ExpressionVectorAdd extends Expression {
  static precedence = Precedence.Property;

  constructor(instance, unevaluated) {
    super(undefined, unevaluated);
    this.instance = instance;
  }

  evaluate(env, callExpression) {
    let item = env.get('item');
    return this.instance.insert(item);
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
    let degrees = env.get('degrees');
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
    let pivot = env.get('pivot');
    let degrees = env.get('degrees');
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
    let message = env.get('message').toPretty();
    env.root.log(message);
    return null;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionDebug extends ExpressionFunction {
  evaluate(env, callExpression) {
    const where = callExpression.actuals[0].where;

    const lines = env.root.source.split('\n');
    const pieces = [];
    for (let i = where.lineStart; i <= where.lineEnd; ++i) {
      const startIndex = i === where.lineStart ? where.columnStart : 0;
      const endIndex = i === where.lineEnd ? where.columnEnd + 1 : lines[i].length;
      pieces.push(lines[i].substring(startIndex, endIndex));
    }

    let message = `${pieces.join("\n")}: ${env.get('expression').toPretty()}`;
    env.root.log(message);

    return null;
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionSeed extends ExpressionFunction {
  evaluate(env, callExpression) {
    let seed = env.get('value').value;
    env.root.prng.seed(seed);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionRandom extends ExpressionFunction {
  evaluate(env, callExpression) {
    let min = env.get('min').value;
    let max = env.get('max').value;

    let x;
    if (env.get('min') instanceof ExpressionInteger && env.get('max') instanceof ExpressionInteger) {
      let random = env.root.prng.random01();
      let x = Math.floor(random * (max - min) + min);
      return new ExpressionInteger(x);
    } else {
      let random = env.root.prng.random01();
      let x = random * (max - min) + min;
      return new ExpressionReal(x);
    }
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionSine extends ExpressionFunction {
  evaluate(env, callExpression) {
    let degrees = env.get('degrees').value;
    let x = Math.sin(degrees * Math.PI / 180);
    return new ExpressionReal(x);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionCosine extends ExpressionFunction {
  evaluate(env, callExpression) {
    let degrees = env.get('degrees').value;
    let x = Math.cos(degrees * Math.PI / 180);
    return new ExpressionReal(x);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionTangent extends ExpressionFunction {
  evaluate(env, callExpression) {
    let degrees = env.get('degrees').value;
    let x = Math.tan(degrees * Math.PI / 180);
    return new ExpressionReal(x);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionArcCosine extends ExpressionFunction {
  evaluate(env, callExpression) {
    let ratio = env.get('ratio').value;
    let angle = Math.acos(ratio) * 180 / Math.PI;
    return new ExpressionReal(angle);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionArcSine extends ExpressionFunction {
  evaluate(env, callExpression) {
    let ratio = env.get('ratio').value;
    let angle = Math.asin(ratio) * 180 / Math.PI;
    return new ExpressionReal(angle);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionHypotenuse extends ExpressionFunction {
  evaluate(env, callExpression) {
    let a = env.get('a').value;
    let b = env.get('b').value;
    let hypotenuse = Math.sqrt(a * a + b * b);
    return new ExpressionReal(hypotenuse);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionArcTangent extends ExpressionFunction {
  evaluate(env, callExpression) {
    let ratio = env.get('ratio').value;
    let angle = Math.atan(ratio) * 180 / Math.PI;
    return new ExpressionReal(angle);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionArcTangent2 extends ExpressionFunction {
  evaluate(env, callExpression) {
    let a = env.get('a').value;
    let b = env.get('b').value;
    let angle = Math.atan2(a, b) * 180 / Math.PI;
    return new ExpressionReal(angle);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionSquareRoot extends ExpressionFunction {
  evaluate(env, callExpression) {
    let x = env.get('x').value;
    let root = Math.sqrt(x);
    return new ExpressionReal(root);
  }
}

// --------------------------------------------------------------------------- 

// The casting function.
export class ExpressionInt extends ExpressionFunction {
  evaluate(env, callExpression) {
    let f = env.get('x').value;
    let i = Math.trunc(f);
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
      normalize: new FunctionDefinition('normalize', [], new ExpressionVectorNormalize(this)),
      size: new FunctionDefinition('size', [], new ExpressionVectorSize(this)),
      magnitude: new FunctionDefinition('magnitude', [], new ExpressionVectorMagnitude(this)),
      toCartesian: new FunctionDefinition('toCartesian', [], new ExpressionVectorToCartesian(this)),
      add: new FunctionDefinition('add', [new FormalParameter('item')], new ExpressionVectorAdd(this)),
      rotateAround: new FunctionDefinition('rotateAround', [new FormalParameter('pivot'), new FormalParameter('degrees')], new ExpressionVectorRotateAround(this)),
      rotate: new FunctionDefinition('rotate', [new FormalParameter('degrees')], new ExpressionVectorRotate(this)),
      rotate90: new FunctionDefinition('rotate90', [], new ExpressionVectorRotate90(this)),
    };
  }

  hasFunction(id) {
    return this.functions.hasOwnProperty(id);
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

  insert(item) {
    this.value.push(item);
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

  getFunction(id) {
    return this.functions[id];
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
      console.trace('asdf');
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

    env.root.currentPolyline.turtle.relocate(new Vector3(x, y, z));
    env.root.visit({
      radius,
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

    const radians = MathUtilities.toRadians(degrees);
    const x = distance * Math.cos(radians) + origin.get(0).value;
    const y = distance * Math.sin(radians) + origin.get(1).value;
    const z = origin.get(2).value;

    env.root.currentPolyline.turtle.relocate(new Vector3(x, y, z));
    env.root.visit({
      radius,
    });
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionMove extends ExpressionFunction {
  evaluate(env) {
    const distance = env.variables.distance.value;
    const radius = env.variables.radius.value;

    env.root.currentPolyline.turtle.advance(distance);
    env.root.visit({
      radius,
    });
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionYaw extends ExpressionFunction {
  evaluate(env) {
    const degrees = env.variables.degrees.value;
    env.root.currentPolyline.turtle.yaw(degrees);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionPitch extends ExpressionFunction {
  evaluate(env) {
    const degrees = env.variables.degrees.value;
    env.root.currentPolyline.turtle.pitch(degrees);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionRoll extends ExpressionFunction {
  evaluate(env) {
    const degrees = env.variables.degrees.value;
    env.root.currentPolyline.turtle.roll(degrees);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionHome extends ExpressionFunction {
  evaluate(env) {
    const polyline = env.root.currentPolyline;

    if (!polyline || polyline.vertices.length === 0) {
      throw new LocatedException(this.where, "I expected home to be called on a non-empty path.");
    }

    const vertex = polyline.vertices[0];
    env.root.currentPolyline.turtle.relocate(vertex.position);
    env.root.visit({
      radius: vertex.radius,
    });
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionDowel extends ExpressionFunction {
  evaluate(env) {
    const nsides = env.variables.nsides.value;
    const twist = env.variables.twist.value;
    const round = env.variables.round.value;

    const polyline = env.root.seal();
    const positions = [];
    const faces = [];
    const vertices = polyline.vertices;

    if (vertices.length < 2) {
      throw new MessagedException("I expected this dowel to have at least two vertices.");
    }

    const arePositionsCoincident = (a, b) => a.position.distance(b.position) < 0.00001;

    // The dowel path is closed only if the first and last vertex have an
    // identical position and radius.
    let isClosed =
      arePositionsCoincident(vertices[0], vertices[vertices.length - 1]) &&
      MathUtilities.isClose(vertices[0].radius, vertices[vertices.length - 1].radius, 0.00001);

    // To generate the first ring of vertices, we need to push perpendicularly
    // out from the first shaft. The direction of that first shaft might not be
    // determined by the next vertex. Find the first vertex forward that is
    // away from vertex 0.
    let nonIncidentIndex = 1;
    while (nonIncidentIndex < vertices.length && arePositionsCoincident(vertices[0], vertices[nonIncidentIndex])) {
      nonIncidentIndex += 1;
    }

    if (nonIncidentIndex === vertices.length) {
      throw new MessagedException("I expected this dowel to travel, but it doesn't.");
    }

    // Seed first ring.
    let forward = vertices[nonIncidentIndex].position.subtract(vertices[0].position).normalize();
    let forward0 = forward;
    const normal = forward.perpendicular();
    let offset = normal.scalarMultiply(vertices[0].radius).toVector4(0);
    offset = Matrix4.rotate(forward, twist).multiplyVector(offset);

    const rotater = Matrix4.rotate(forward, 360 / nsides);

    for (let i = 0; i < nsides; ++i) {
      positions.push(vertices[0].position.add(offset));
      offset = rotater.multiplyVector(offset);
    }

    const issueFace = (base, i) => {
      faces.push([base + i, base + (i + 1) % nsides, base + (i + 1) % nsides + nsides]);
      faces.push([base + i % nsides, base + (i + 1) % nsides + nsides, base + i + nsides]);
    };

    const intersectPlaneAndRescale = (plane, forward, fromCenter, radius) => {
      const base = positions.length - nsides;
      const toCenter = plane.intersectRay(fromCenter, forward);

      for (let i = 0; i < nsides; ++i) {
        const from = positions[positions.length - nsides];
        const to = plane.intersectRay(from, forward);
        const offset = to.subtract(toCenter).normalize();
        positions.push(toCenter.add(offset.scalarMultiply(radius)));
        issueFace(base, i);
      }
    }

    const intersectPlane = (plane, forward) => {
      const base = positions.length - nsides;

      for (let i = 0; i < nsides; ++i) {
        const from = positions[positions.length - nsides];
        const to = plane.intersectRay(from, forward);
        positions.push(to);
        issueFace(base, i);
      }
    }

    if (isClosed) {
      nonIncidentIndex = vertices.length - 1;
      while (nonIncidentIndex >= 0 && arePositionsCoincident(vertices[0], vertices[nonIncidentIndex])) {
        nonIncidentIndex -= 1;
      }

      let backward = vertices[nonIncidentIndex].position.subtract(vertices[0].position).normalize();

      const degrees = Math.acos(forward.dot(backward.inverse())) * 180 / Math.PI;

      if (degrees <= round) {
        const tangent = forward.add(backward.inverse()).normalize();
        const plane = new Plane(vertices[0].position, tangent);

        for (let i = 0; i < nsides; ++i) {
          positions[i] = plane.intersectRay(positions[i], forward);
        }
      } else {
        const pivot = forward.add(backward).normalize().scalarMultiply(vertices[0].radius * Math.sqrt(2)).add(vertices[0].position);
        const plane = new Plane(pivot, forward);
        const axis = forward.cross(backward).normalize();

        const backRotater = Matrix4.rotateAround(axis, -degrees, pivot);
        for (let i = 0; i < nsides; ++i) {
          const unrotatedPosition = plane.intersectRay(positions[i], forward);
          positions[i] = backRotater.multiplyVector(unrotatedPosition.toVector4(1)).toVector3();
        }

        const nsteps = Math.ceil(degrees / round);
        const deltaDegrees = degrees / nsteps;

        const rotater = Matrix4.rotateAround(axis, deltaDegrees, pivot);
        for (let stepIndex = 0; stepIndex < nsteps; ++stepIndex) {
          const base = positions.length - nsides;
          for (let stopIndex = 0; stopIndex < nsides; ++stopIndex) {
            const from = positions[positions.length - nsides];
            const to = rotater.multiplyVector(positions[positions.length - nsides].toVector4(1)).toVector3();
            positions.push(to);
            issueFace(base, stopIndex);
          }
        }
      }
    }

    // Walk through segments. Each segment runs from the previous vertex to the
    // current vertex.
    let markIndex = 0;
    for (let i = 1; i < vertices.length; ++i) {
      const radius = vertices[i].radius;
      const distance = vertices[i].position.distance(vertices[i - 1].position);

      // If this segment has no length, we take the last ring and repeat it,
      // but scaled according to this vertex's radius.
      if (Math.abs(distance) < 0.00001) {
        const base = positions.length - nsides;
        for (let j = 0; j < nsides; ++j) {
          const from = positions[positions.length - nsides];
          const to = from.subtract(vertices[markIndex].position).normalize().scalarMultiply(radius).add(vertices[markIndex].position);
          positions.push(to);
          issueFace(base, j);
        }
      }

      // If this is the last vertex of a closed dowel, we connect the positions
      // of the previous vertex to the first ring.
      else if (i === vertices.length - 1 && isClosed) {
        const base = positions.length - nsides;
        for (let j = 0; j < nsides; ++j) {
          faces.push([base + j, (j + 1) % nsides, j % nsides]);
          faces.push([base + j, base + (j + 1) % nsides, (j + 1) % nsides]);
        }
      }

      // If this is the last vertex of an unclosed dowel, we run the dowel
      // along the segment direction, with the stopping plane aligned with the
      // starting plane.
      else if (i === vertices.length - 1 && !isClosed) {
        const plane = new Plane(vertices[i].position, forward);
        intersectPlane(plane, forward);
      }

      else {
        // We have seen a segment that 
        markIndex = i;

        const nextDistance = vertices[i + 1].position.distance(vertices[i].position);
        if (nextDistance < 0.00001) {
          const plane = new Plane(vertices[i].position, forward);
          intersectPlane(plane, forward);
        } else {
          const nextForward = vertices[i + 1].position.subtract(vertices[i].position).normalize();
          const degrees = Math.acos(forward.dot(nextForward)) * 180 / Math.PI;

          if (degrees <= round) {
            const tangent = forward.add(nextForward).normalize();
            const plane = new Plane(vertices[i].position, tangent);
            intersectPlane(plane, forward);
          } else {
            const pivot = forward.negate().add(nextForward).normalize().scalarMultiply(radius * Math.sqrt(2)).add(vertices[i].position);
            const plane = new Plane(pivot, forward);
            intersectPlaneAndRescale(plane, forward, vertices[i - 1].position, vertices[i].radius);

            const axis = forward.cross(nextForward).normalize();
            const nsteps = Math.ceil(degrees / round);
            const deltaDegrees = degrees / nsteps;

            for (let stepIndex = 0; stepIndex < nsteps; ++stepIndex) {
              const base = positions.length - nsides;
              const rotater = Matrix4.rotateAround(axis, deltaDegrees, pivot);
              for (let stopIndex = 0; stopIndex < nsides; ++stopIndex) {
                const from = positions[positions.length - nsides];
                const to = rotater.multiplyVector(positions[positions.length - nsides].toVector4(1)).toVector3();
                positions.push(to);
                issueFace(base, stopIndex);
              }
            }
          }

          forward = nextForward;
        }
      }
    }

    // Fill end caps.
    if (!isClosed) {
      positions.push(vertices[0].position);
      positions.push(vertices[vertices.length - 1].position);

      for (let i = 0; i < nsides; ++i) {
        faces.push([positions.length - 2, (i + 1) % nsides, i]);
        faces.push([positions.length - 1, positions.length - 2 - nsides + i, positions.length - 2 - nsides + (i + 1) % nsides]);
      }
    }

    const mesh = new Trimesh(positions, faces);
    env.root.addMesh(mesh);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionRevolve extends ExpressionFunction {
  evaluate(env) {
    const nsides = env.variables.nsides.value;
    const degrees = env.variables.degrees.value;
    const axis = env.variables.axis;
    const pivot = env.variables.pivot;

    if (degrees < -360 || degrees > 360) {
      throw new LocatedException(env.variables.degrees.unevaluated.where, 'I expected the number of degrees given to <span class="messager-code">revolve</span> to be in the interval [-360, 360].');
    }

    const polyline = env.root.seal();
    const positions = [];
    const faces = [];

    if (polyline.vertices.length < 2) {
      throw new MessagedException("I expected this revolve to have at least two vertices.");
    }

    const degreesDelta = degrees / nsides;
    const isRotationClosed = Math.abs(Math.abs(degrees) - 360) < 0.00001;

    const axis3 = new Vector3(axis.value[0].value, axis.value[1].value, axis.value[2].value);
    const pivot3 = new Vector3(pivot.value[0].value, pivot.value[1].value, pivot.value[2].value);
    const rotater = Matrix4.rotateAround(axis3, degreesDelta, pivot3);

    const nstops = isRotationClosed ? nsides : nsides + 1;

    for (let i = 0; i < polyline.vertices.length; ++i) {
      let position = polyline.vertices[i].position;
      for (let stopIndex = 0; stopIndex < nstops; ++stopIndex) {
        positions.push(position);
        position = rotater.multiplyVector(position.toVector4(1)).toVector3();
      }
    }

    for (let i = 0; i < polyline.vertices.length - 1; ++i) {
      const base = i * nstops;
      for (let stopIndex = 0; stopIndex < nsides; ++stopIndex) {
        faces.push([base + stopIndex, base + (stopIndex + 1) % nstops, base + stopIndex + nstops]);
        faces.push([base + (stopIndex + 1) % nstops, base + (stopIndex + 1) % nstops + nstops, base + stopIndex + nstops]);
      }
    }

    const mesh = new Trimesh(positions, faces);
    env.root.addMesh(mesh);
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionCubes extends ExpressionFunction {
  evaluate(env) {
    const polyline = env.root.seal();

    for (let vertex of polyline.vertices) {
      const mesh = Prefab.cube(vertex.radius * 2, vertex.position);
      env.root.addMesh(mesh);
    }
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionSpheres extends ExpressionFunction {
  evaluate(env) {
    const polyline = env.root.seal();
    const nsides = env.variables.nsides.value;

    for (let vertex of polyline.vertices) {
      const mesh = Prefab.sphere(vertex.radius, vertex.position, nsides, Math.ceil(nsides / 2));
      env.root.addMesh(mesh);
    }
  }
}

// --------------------------------------------------------------------------- 

export class ExpressionExtrude extends ExpressionFunction {
  evaluate(env) {
    const axis = env.variables.axis;
    const distance = env.variables.distance.value;
    const polyline = env.root.seal();

    if (polyline.vertices.length < 3) {
      throw new MessagedException("I expected this extrude to have at least three vertices.");
    }

    let isClosed = polyline.vertices[0].position.distance(polyline.vertices[polyline.vertices.length - 1].position) < 0.00001;

    const nstops = isClosed ? polyline.vertices.length - 1 : polyline.vertices.length;
    const positions = [];
    const faces = [];

    const axis3 = new Vector3(axis.value[0].value, axis.value[1].value, axis.value[2].value);
    const offset = axis3.normalize().scalarMultiply(distance);

    positions.push(...polyline.vertices.slice(0, nstops).map(vertex => vertex.position));
    positions.push(...positions.map(position => position.add(offset)));
    // for (let vertex of polyline.vertices) {
      // positions.push(vertex.position.add(offset));
    // }

    for (let i = 0; i < nstops; ++i) {
      faces.push([i, (i + 1) % nstops, i + nstops]);
      faces.push([(i + 1) % nstops, (i + 1) % nstops + nstops, i + nstops]);
    }

    // positions.forEach(p => console.log(p.toString()));
    // faces.forEach(f => console.log(f.toString()));

    const mesh = new Trimesh(positions, faces);
    env.root.addMesh(mesh);
  }
}

// --------------------------------------------------------------------------- 

