// import { 
  // Builtins,
// } from './builtins.js';

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

  bindGlobalFunctions(globals) {
    Object.assign(this.functions, globals);
  }
}

// --------------------------------------------------------------------------- 

