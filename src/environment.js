import { 
  FormalParameter,
  FunctionDefinition,
  LocatedException,
  mop,
} from './common.js';

import { 
  ExpressionArcCosine,
  ExpressionArcSine,
  ExpressionArcTangent,
  ExpressionArcTangent2,
  ExpressionBoxes,
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
  ExpressionRevolve,
  ExpressionSeed,
  ExpressionSine,
  ExpressionSpheres,
  ExpressionSquareRoot,
  ExpressionString,
  ExpressionSubtract,
  ExpressionTangent,
  ExpressionUnit,
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
      boxes: new FunctionDefinition('boxes', [], new ExpressionBoxes()),
      box: new FunctionDefinition('box', [], new ExpressionBoxes()),
      spheres: new FunctionDefinition('spheres', [
        new FormalParameter('nsides', new ExpressionInteger(4)),
      ], new ExpressionSpheres()),
      sphere: new FunctionDefinition('sphere', [
        new FormalParameter('nsides', new ExpressionInteger(4)),
      ], new ExpressionSpheres()),
      dowel: new FunctionDefinition('dowel', [
        new FormalParameter('nsides', new ExpressionInteger(4)),
        new FormalParameter('twist', new ExpressionReal(0)),
        new FormalParameter('round', new ExpressionReal(360)),
      ], new ExpressionDowel()),
      revolve: new FunctionDefinition('revolve', [
        new FormalParameter('degrees'),
        new FormalParameter('nsides', new ExpressionInteger(4)),
        new FormalParameter('axis', new ExpressionVector([
          new ExpressionReal(0),
          new ExpressionReal(1),
          new ExpressionReal(0),
        ])),
        new FormalParameter('pivot', new ExpressionVector([
          new ExpressionReal(0),
          new ExpressionReal(0),
          new ExpressionReal(0),
        ])),
      ], new ExpressionRevolve()),
      moveto: new FunctionDefinition('moveto', [
        new FormalParameter('x'),
        new FormalParameter('y'),
        new FormalParameter('z', new ExpressionReal(0)),
        new FormalParameter('radius', new ExpressionReal(0.5)),
      ], new ExpressionMoveto()),
      print: new FunctionDefinition('print', [new FormalParameter('message')], new ExpressionPrint()),
      debug: new FunctionDefinition('debug', [new FormalParameter('expression')], new ExpressionDebug()),
      random: new FunctionDefinition('random', [
        new FormalParameter('min'),
        new FormalParameter('max'),
      ], new ExpressionRandom()),
      seed: new FunctionDefinition('seed', [new FormalParameter('value')], new ExpressionSeed()),
      sin: new FunctionDefinition('sin', [new FormalParameter('degrees')], new ExpressionSine()),
      cos: new FunctionDefinition('cos', [new FormalParameter('degrees')], new ExpressionCosine()),
      tan: new FunctionDefinition('tan', [new FormalParameter('degrees')], new ExpressionTangent()),
      asin: new FunctionDefinition('asin', [new FormalParameter('ratio')], new ExpressionArcSine()),
      hypotenuse: new FunctionDefinition('hypotenuse', [new FormalParameter('a'), new FormalParameter('b')], new ExpressionHypotenuse()),
      acos: new FunctionDefinition('acos', [new FormalParameter('ratio')], new ExpressionArcCosine()),
      atan: new FunctionDefinition('atan', [new FormalParameter('ratio')], new ExpressionArcTangent()),
      atan2: new FunctionDefinition('atan2', [
        new FormalParameter('a'),
        new FormalParameter('b'),
      ], new ExpressionArcTangent2()),
      sqrt: new FunctionDefinition('sqrt', [new FormalParameter('x')], new ExpressionSquareRoot()),
      int: new FunctionDefinition('int', [new FormalParameter('x')], new ExpressionInt()),
    });
  }
}

// --------------------------------------------------------------------------- 

