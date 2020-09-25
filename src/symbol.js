import {
  ExpressionBoolean,
  ExpressionInteger,
  ExpressionReal,
  ExpressionString,
  ExpressionVector,
} from './ast.js';

export const Symbol = Object.freeze({
  ':clockwise': new ExpressionInteger(0),
  ':counterclockwise': new ExpressionInteger(1),

  // Vectors
  ':zero': new ExpressionVector([new ExpressionReal(0), new ExpressionReal(0), new ExpressionReal(0)]),
  ':up': new ExpressionVector([new ExpressionReal(0), new ExpressionReal(1), new ExpressionReal(0)]),
  ':down': new ExpressionVector([new ExpressionReal(0), new ExpressionReal(-1), new ExpressionReal(0)]),
  ':right': new ExpressionVector([new ExpressionReal(1), new ExpressionReal(0), new ExpressionReal(0)]),
  ':left': new ExpressionVector([new ExpressionReal(-1), new ExpressionReal(0), new ExpressionReal(0)]),
  ':forward': new ExpressionVector([new ExpressionReal(0), new ExpressionReal(0), new ExpressionReal(-1)]),
  ':backward': new ExpressionVector([new ExpressionReal(0), new ExpressionReal(0), new ExpressionReal(1)]),

  // Interpolants
  ':linear': new ExpressionString('interpolateLinear'),
  ':nearest': new ExpressionString('interpolateNearest'),
  // ':ease': new ExpressionString('ease'),
  ':sineInOut': new ExpressionString('interpolateSineInOut'),
  ':backInOut': new ExpressionString('interpolateBackInOut'),
  ':quadraticInOut': new ExpressionString('interpolateQuadraticInOut'),
  ':cubicInOut': new ExpressionString('interpolateCubicInOut'),
  ':quarticInOut': new ExpressionString('interpolateQuarticInOut'),
  ':quinticInOut': new ExpressionString('interpolateQuinticInOut'),

  // Colors
  ':black': new ExpressionVector([new ExpressionReal(0), new ExpressionReal(0), new ExpressionReal(0)]),
  ':red': new ExpressionVector([new ExpressionReal(1), new ExpressionReal(0), new ExpressionReal(0)]),
  ':green': new ExpressionVector([new ExpressionReal(0), new ExpressionReal(1), new ExpressionReal(0)]),
  ':blue': new ExpressionVector([new ExpressionReal(0), new ExpressionReal(0), new ExpressionReal(1)]),
  ':white': new ExpressionVector([new ExpressionReal(1), new ExpressionReal(1), new ExpressionReal(1)]),
  ':yellow': new ExpressionVector([new ExpressionReal(1), new ExpressionReal(1), new ExpressionReal(0)]),
  ':orange': new ExpressionVector([new ExpressionReal(1), new ExpressionReal(0.5), new ExpressionReal(0)]),
  ':cyan': new ExpressionVector([new ExpressionReal(0), new ExpressionReal(1), new ExpressionReal(1)]),
  ':magenta': new ExpressionVector([new ExpressionReal(1), new ExpressionReal(0), new ExpressionReal(1)]),
  ':cornflower': new ExpressionVector([new ExpressionReal(0.392), new ExpressionReal(0.584), new ExpressionReal(0.929)]),
  ':crimson': new ExpressionVector([new ExpressionReal(0.863), new ExpressionReal(0.078), new ExpressionReal(0.235)]),

  // Polygon
  ':open': new ExpressionInteger(0),
  ':closed': new ExpressionInteger(1),

  ':none': new ExpressionInteger(-1),
});
