import {
  lex
} from './lexer.js';

import { 
  parse,
} from './parser.js';

import {
  MessagedException,
} from './common.js';

import {Environment} from './environment.js';
import {Camera} from './twodeejs/camera.js';
import {Vector3} from './twodeejs/vector.js';
import {Polyline} from './polyline.js';
import {Builtins} from './builtins.js';

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

export class InterpreterEnvironment extends Environment {
  initialize(log) {
    super.initialize(null);

    this.shapes = [];
    this.prng = new Random();
    this.log = log;
    this.root = this;
    this.polylines = [new Polyline()];
    this.meshes = [];
    this.calls = [];

    this.bindGlobalFunctions(Builtins);
  }

  addCall(where, documentation, providedParameters) {
    this.calls.push({where, documentation, providedParameters});
  }

  // get currentCall() {
    // return this.calls[this.calls.length - 1];
  // }

  seal() {
    const polyline = this.polylines[this.polylines.length - 1];
    this.polylines.push(new Polyline());
    return polyline;
  }

  get currentPolyline() {
    return this.polylines[this.polylines.length - 1];
  }

  visit(configuration) {
    const polyline = this.currentPolyline;
    polyline.add({
      ...configuration,
      position: polyline.turtle.from,
    });
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
      meshes: this.meshes.map(mesh => mesh.toPod()),
      calls: this.calls,
    });
    return pod;
  }
}

// --------------------------------------------------------------------------- 

export function interpret(source, log, logError, clearError, showCallDocs, registerDocMap, renderMode) {
  const env = InterpreterEnvironment.create(source, log, renderMode);

  try {
    let tokens = lex(source);
    let ast = parse(tokens);
    try {
      ast.evaluate(env);
    } finally {
      registerDocMap(env.calls);
    }
    clearError();
    return env;
  } catch (e) {
    if (e.callRecord) {
      showCallDocs(e.callRecord);
    }

    if (e instanceof MessagedException) {
      logError(e.userMessage);
    } else {
      logError(e);
    }

    console.error(e);

    return null;
  }
}

// --------------------------------------------------------------------------- 

