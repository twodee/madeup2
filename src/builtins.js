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
    cubes: new FunctionDefinition('cubes', 'TODO', [], new ExpressionCubes()),
    cube: new FunctionDefinition('cube', 'TODO', [], new ExpressionCubes()),
    spheres: new FunctionDefinition('spheres', sphereDocs.main, [
      new FormalParameter('nsides', sphereDocs.nsides, new ExpressionInteger(4)),
    ], new ExpressionSpheres()),
    sphere: new FunctionDefinition('sphere', sphereDocs.main, [
      new FormalParameter('nsides', sphereDocs.nsides, new ExpressionInteger(4)),
    ], new ExpressionSpheres()),
    dowel: new FunctionDefinition('dowel', 'TODO', [
      new FormalParameter('nsides', 'The number of the sides. For example, 4 yields a square dowel.', new ExpressionInteger(4)),
      new FormalParameter('twist', 'The rotation of the dowel around its axis. In degrees.', new ExpressionReal(0)),
      new FormalParameter('round', 'The maximum angle of the bends in the dowel. Bends greater than this value will be rounded.', new ExpressionReal(360)),
    ], new ExpressionDowel()),
    revolve: new FunctionDefinition('revolve', 'TODO', [
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
    extrude: new FunctionDefinition('extrude', 'TODO', [
      new FormalParameter('axis'),
      new FormalParameter('distance'),
    ], new ExpressionExtrude()),

    mesh: new FunctionDefinition('mesh', 'TODO', [
      new FormalParameter('vertices'),
      new FormalParameter('faces'),
    ], new ExpressionMesh()),

    polygon: new FunctionDefinition('polygon', 'TODO', [
      new FormalParameter('flip', 'Whether or not to flip the polygon over by reversing the order of its vertices.', new ExpressionBoolean(false)),
    ], new ExpressionPolygon()),

    move: new FunctionDefinition('move', 'Move forward or backward in the current direction.', [
      new FormalParameter('distance', 'The distance to move. A positive distance moves forward; a negative distance moves backward.'),
      new FormalParameter('radius', 'The radius of position, which is only meaningful if the path is solidified into a dowel.', new ExpressionReal(0.5)),
    ], new ExpressionMove()),

    stay: new FunctionDefinition('stay', "Issue a new vertex in the path at the current location. The vertex's other properties, like its radius, may differ.", [
      new FormalParameter('radius', 'The radius of position, which is only meaningful if the path is solidified into a dowel.', new ExpressionReal(0.5)),
    ], new ExpressionStay()),

    yaw: new FunctionDefinition('yaw', "Turn left or right about the cursor's local up axis. A vertex is not added to the current path.", [
      new FormalParameter('degrees', 'The number of degrees to turn.'),
    ], new ExpressionYaw()),

    pitch: new FunctionDefinition('pitch', "Turn up or down about the cursor's local right axis. A vertex is not added to the current path.", [
      new FormalParameter('degrees', 'The number of degrees to turn.'),
    ], new ExpressionPitch()),

    roll: new FunctionDefinition('roll', "Turn about the cursor's local forward axis. A vertex is not added to the current path.", [
      new FormalParameter('degrees', 'The number of degrees to turn.'),
    ], new ExpressionRoll()),

    polarto: new FunctionDefinition('polarto', 'TODO', [
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
    home: new FunctionDefinition('home', 'TODO', [], new ExpressionHome()),
    print: new FunctionDefinition('print', 'TODO', [
      new FormalParameter('message')
    ], new ExpressionPrint()),
    debug: new FunctionDefinition('debug', 'TODO', [
      new FormalParameter('expression')
    ], new ExpressionDebug()),
    random: new FunctionDefinition('random', 'TODO', [
      new FormalParameter('min'),
      new FormalParameter('max'),
    ], new ExpressionRandom()),
    seed: new FunctionDefinition('seed', 'TODO', [
      new FormalParameter('value')
    ], new ExpressionSeed()),
    sin: new FunctionDefinition('sin', 'TODO', [
      new FormalParameter('degrees')
    ], new ExpressionSine()),
    cos: new FunctionDefinition('cos', 'TODO', [
      new FormalParameter('degrees')
    ], new ExpressionCosine()),
    tan: new FunctionDefinition('tan', 'TODO', [
      new FormalParameter('degrees')
    ], new ExpressionTangent()),
    asin: new FunctionDefinition('asin', 'TODO', [
      new FormalParameter('ratio')
    ], new ExpressionArcSine()),
    hypotenuse: new FunctionDefinition('hypotenuse', 'TODO', [
      new FormalParameter('a'),
      new FormalParameter('b')
    ], new ExpressionHypotenuse()),
    acos: new FunctionDefinition('acos', 'TODO', [
      new FormalParameter('ratio')
    ], new ExpressionArcCosine()),
    atan: new FunctionDefinition('atan', 'TODO', [
      new FormalParameter('ratio')
    ], new ExpressionArcTangent()),
    atan2: new FunctionDefinition('atan2', 'TODO', [
      new FormalParameter('a'),
      new FormalParameter('b'),
    ], new ExpressionArcTangent2()),
    sqrt: new FunctionDefinition('sqrt', 'TODO', [
      new FormalParameter('x')
    ], new ExpressionSquareRoot()),
    int: new FunctionDefinition('int', 'TODO', [
      new FormalParameter('x')
    ], new ExpressionInt()),
  };
})();

// --------------------------------------------------------------------------- 

