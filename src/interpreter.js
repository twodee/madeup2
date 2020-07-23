import {
  lex
} from './lexer.js';

import { 
  parse,
} from './parser.js';

import {
  MessagedException,
} from './common.js';

import {
  Environment,
} from './environment.js';

const seedrandom = require('seedrandom');

// --------------------------------------------------------------------------- 

export class Random {
  constructor() {
    this.engine = seedrandom();
  }

  seed(value) {
    this.engine = seedrandom(value);
  }

  random01() {
    return this.engine.quick();
  }
}

// --------------------------------------------------------------------------- 

export class Polyline {
  constructor() {
    this.vertices = [];
  }

  add(vertex) {
    this.vertices.push(vertex);
  }

  toPod() {
    return this.vertices.map(vertex => vertex.position.data);
  }
}

// --------------------------------------------------------------------------- 

export class InterpreterEnvironment extends Environment {
  initialize(log) {
    super.initialize(null);

    this.shapes = [];
    this.prng = new Random();
    this.log = log;
    this.root = this;
    this.polylines = [new Polyline()];
    this.meshes = [];

    this.bindGlobalFunctions();
  }

  seal() {
    const polyline = this.polylines[this.polylines.length - 1];
    this.polylines.push(new Polyline());
    return polyline;
  }

  visit(vertex) {
    this.polylines[this.polylines.length - 1].add(vertex);
  }

  addMesh(mesh) {
    this.meshes.push(mesh);
  }

  static create(source, log, renderMode) {
    const env = new InterpreterEnvironment();
    env.initialize(log);
    env.source = source;
    env.renderMode = renderMode;
    return env;
  }

  toPod() {
    const pod = super.toPod();
    Object.assign(pod, {
      polylines: this.polylines.map(polyline => polyline.toPod()),
      renderMode: this.renderMode,
      meshes: this.meshes,
    });
    return pod;
  }
}

// --------------------------------------------------------------------------- 

export function interpret(source, log, renderMode) {
  try {
    let tokens = lex(source);
    let ast = parse(tokens);
    const env = InterpreterEnvironment.create(source, log, renderMode);
    ast.evaluate(env);
    return env;
  } catch (e) {
    if (e instanceof MessagedException) {
      log(e.userMessage);
    } else {
      console.error(e);
      log(e);
    }
    return null;
  }
}

// --------------------------------------------------------------------------- 

