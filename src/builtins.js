import { 
  FormalParameter,
  FunctionDefinition,
} from './common.js';

import { 
  ExpressionArcCosine,
  ExpressionArcSine,
  ExpressionArcTangent,
  ExpressionArcTangent2,
  ExpressionBoolean,
  ExpressionCubes,
  ExpressionCircle,
  ExpressionCosine,
  ExpressionCutout,
  ExpressionDebug,
  ExpressionExtrude,
  ExpressionHome,
  ExpressionHypotenuse,
  ExpressionInt,
  ExpressionInteger,
  ExpressionDowel,
  ExpressionMesh,
  ExpressionMoveto,
  ExpressionMove,
  ExpressionMultiply,
  ExpressionPitch,
  ExpressionPolarto,
  ExpressionPolygon,
  ExpressionPrint,
  ExpressionRandom,
  ExpressionReal,
  ExpressionRevolve,
  ExpressionRoll,
  ExpressionSeed,
  ExpressionSine,
  ExpressionSpheres,
  ExpressionSquareRoot,
  ExpressionStay,
  ExpressionString,
  ExpressionSubtract,
  ExpressionTangent,
  ExpressionUnit,
  ExpressionVector,
  ExpressionYaw,
} from './ast.js';

// --------------------------------------------------------------------------- 

export const Builtins = (function() {
  const sphereDocs = {
    main: 'Generate a sphere at each visited location.',
    nsides: 'The number of lines of longitude on the sphere.',
  };

  return {
    cubes: new FunctionDefinition('cubes', '', [], new ExpressionCubes()),
    cube: new FunctionDefinition('cube', '', [], new ExpressionCubes()),
    spheres: new FunctionDefinition('spheres', sphereDocs.main, [
      new FormalParameter('nsides', sphereDocs.nsides, new ExpressionInteger(4)),
    ], new ExpressionSpheres()),
    sphere: new FunctionDefinition('sphere', sphereDocs.main, [
      new FormalParameter('nsides', sphereDocs.nsides, new ExpressionInteger(4)),
    ], new ExpressionSpheres()),
    dowel: new FunctionDefinition('dowel', '', [
      new FormalParameter('nsides', 'The number of the sides. For example, 4 yields a square dowel.', new ExpressionInteger(4)),
      new FormalParameter('twist', 'The rotation of the dowel around its axis. In degrees.', new ExpressionReal(0)),
      new FormalParameter('round', 'The maximum angle of the bends in the dowel. Bends greater than this value will be rounded.', new ExpressionReal(360)),
    ], new ExpressionDowel()),
    revolve: new FunctionDefinition('revolve', '', [
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
    extrude: new FunctionDefinition('extrude', '', [
      new FormalParameter('axis'),
      new FormalParameter('distance'),
    ], new ExpressionExtrude()),

    mesh: new FunctionDefinition('mesh', '', [
      new FormalParameter('vertices'),
      new FormalParameter('faces'),
    ], new ExpressionMesh()),

    polygon: new FunctionDefinition('polygon', '', [
      new FormalParameter('flip', 'Whether or not to flip the polygon over by reversing the order of its vertices.', new ExpressionBoolean(false)),
    ], new ExpressionPolygon()),

    move: new FunctionDefinition('move', '', [
      new FormalParameter('distance'),
      new FormalParameter('radius', undefined, new ExpressionReal(0.5)),
    ], new ExpressionMove()),
    stay: new FunctionDefinition('stay', '', [
      new FormalParameter('radius', undefined, new ExpressionReal(0.5)),
    ], new ExpressionStay()),

    yaw: new FunctionDefinition('yaw', '', [
      new FormalParameter('degrees'),
    ], new ExpressionYaw()),
    pitch: new FunctionDefinition('pitch', '', [
      new FormalParameter('degrees'),
    ], new ExpressionPitch()),
    roll: new FunctionDefinition('roll', '', [
      new FormalParameter('degrees'),
    ], new ExpressionRoll()),
    polarto: new FunctionDefinition('polarto', '', [
      new FormalParameter('distance'),
      new FormalParameter('degrees'),
      new FormalParameter('origin', undefined, new ExpressionVector([
        new ExpressionReal(0),
        new ExpressionReal(0),
        new ExpressionReal(0),
      ])),
      new FormalParameter('radius', new ExpressionReal(0.5)),
    ], new ExpressionPolarto()),
    moveto: new FunctionDefinition('moveto', 'Move to a 3D position of your choosing.', [
      new FormalParameter('x', 'The x-coordinate of the position.'),
      new FormalParameter('y', 'The y-coordinate of the position.'),
      new FormalParameter('z', 'The z-coordinate of the position.', new ExpressionReal(0)),
      new FormalParameter('radius', 'The radius of the position, which is only meaningful if the path is solidified into a dowel.', new ExpressionReal(0.5)),
    ], new ExpressionMoveto()),
    home: new FunctionDefinition('home', '', [], new ExpressionHome()),
    print: new FunctionDefinition('print', '', [
      new FormalParameter('message')
    ], new ExpressionPrint()),
    debug: new FunctionDefinition('debug', '', [
      new FormalParameter('expression')
    ], new ExpressionDebug()),
    random: new FunctionDefinition('random', '', [
      new FormalParameter('min'),
      new FormalParameter('max'),
    ], new ExpressionRandom()),
    seed: new FunctionDefinition('seed', '', [
      new FormalParameter('value')
    ], new ExpressionSeed()),
    sin: new FunctionDefinition('sin', '', [
      new FormalParameter('degrees')
    ], new ExpressionSine()),
    cos: new FunctionDefinition('cos', '', [
      new FormalParameter('degrees')
    ], new ExpressionCosine()),
    tan: new FunctionDefinition('tan', '', [
      new FormalParameter('degrees')
    ], new ExpressionTangent()),
    asin: new FunctionDefinition('asin', '', [
      new FormalParameter('ratio')
    ], new ExpressionArcSine()),
    hypotenuse: new FunctionDefinition('hypotenuse', '', [
      new FormalParameter('a'),
      new FormalParameter('b')
    ], new ExpressionHypotenuse()),
    acos: new FunctionDefinition('acos', '', [
      new FormalParameter('ratio')
    ], new ExpressionArcCosine()),
    atan: new FunctionDefinition('atan', '', [
      new FormalParameter('ratio')
    ], new ExpressionArcTangent()),
    atan2: new FunctionDefinition('atan2', '', [
      new FormalParameter('a'),
      new FormalParameter('b'),
    ], new ExpressionArcTangent2()),
    sqrt: new FunctionDefinition('sqrt', '', [
      new FormalParameter('x')
    ], new ExpressionSquareRoot()),
    int: new FunctionDefinition('int', '', [
      new FormalParameter('x')
    ], new ExpressionInt()),
  };
})();

// --------------------------------------------------------------------------- 

