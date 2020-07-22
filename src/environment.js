import { 
  FunctionDefinition,
  LocatedException,
  mop,
} from './common.js';

import { 
  ExpressionArcCosine,
  ExpressionArcSine,
  ExpressionArcTangent,
  ExpressionArcTangent2,
  ExpressionCircle,
  ExpressionCosine,
  ExpressionCutout,
  ExpressionDebug,
  ExpressionHypotenuse,
  ExpressionInt,
  ExpressionInteger,
  ExpressionDowel,
  ExpressionMoveto,
  ExpressionMultiply,
  ExpressionPrint,
  ExpressionRandom,
  ExpressionReal,
  ExpressionSeed,
  ExpressionSine,
  ExpressionSquareRoot,
  ExpressionString,
  ExpressionSubtract,
  ExpressionTangent,
  ExpressionVector,
} from './ast.js';

// --------------------------------------------------------------------------- 

export class Environment {
  static type = 'environment';

  initialize(parentEnvironment) {
    this.functions = {};
    this.variables = {};
    this.parentEnvironment = parentEnvironment;

    // Let's make the root easy to access.
    if (parentEnvironment) {
      this.root = parentEnvironment.root;
    }
  }

  static create(parentEnvironment) {
    const env = new Environment();
    env.initialize(parentEnvironment);
    return env;
  }

  embody(parentEnvironment, pod) {
    this.parentEnvironment = parentEnvironment;
    if (parentEnvironment) {
      this.root = parentEnvironment.root;
    }
  }

  static reify(parentEnvironment, pod) {
    const env = new Environment();
    env.embody(parentEnvironment, pod);
    return env;
  }

  toPod() {
    return {};
  }

  bind(id, value) {
    this.variables[id] = value;
  }

  bindFunction(id, method) {
    this.functions[id] = method;
  }

  hasFunction(id) {
    return this.functions.hasOwnProperty(id) || (this.parentEnvironment && this.parentEnvironment.hasFunction(id));
  }

  getFunction(id) {
    let f = this.functions[id];
    if (!f && this.parentEnvironment) {
      f = this.parentEnvironment.getFunction(id);
    }
    return f;
  }

  // Determine if this environment directly owns a property.
  ownsVariable(id) {
    return this.variables.hasOwnProperty(id);
  }

  // Determine if this environment owns or inherits a property.
  hasVariable(id) {
    let env = this;
    while (env) {
      if (env.ownsVariable(id)) {
        return true;
      }
      env = env.parentEnvironment;
    }
    return false;
  }

  bindGlobalFunctions() {
    Object.assign(this.functions, {
      dowel: new FunctionDefinition('dowel', [], new ExpressionDowel()),
      moveto: new FunctionDefinition('moveto', ['x', 'y', 'z'], new ExpressionMoveto()),
      print: new FunctionDefinition('print', ['message'], new ExpressionPrint()),
      debug: new FunctionDefinition('debug', ['expression'], new ExpressionDebug()),
      random: new FunctionDefinition('random', ['min', 'max'], new ExpressionRandom()),
      seed: new FunctionDefinition('seed', ['value'], new ExpressionSeed()),
      sin: new FunctionDefinition('sin', ['degrees'], new ExpressionSine()),
      cos: new FunctionDefinition('cos', ['degrees'], new ExpressionCosine()),
      tan: new FunctionDefinition('tan', ['degrees'], new ExpressionTangent()),
      asin: new FunctionDefinition('asin', ['ratio'], new ExpressionArcSine()),
      hypotenuse: new FunctionDefinition('hypotenuse', ['a', 'b'], new ExpressionHypotenuse()),
      acos: new FunctionDefinition('acos', ['ratio'], new ExpressionArcCosine()),
      atan: new FunctionDefinition('atan', ['ratio'], new ExpressionArcTangent()),
      atan2: new FunctionDefinition('atan2', ['a', 'b'], new ExpressionArcTangent2()),
      sqrt: new FunctionDefinition('sqrt', ['x'], new ExpressionSquareRoot()),
      int: new FunctionDefinition('int', ['x'], new ExpressionInt()),
    });
  }
}

// --------------------------------------------------------------------------- 

