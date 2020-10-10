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
  ExpressionMold,
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
  ExpressionRotate,
  ExpressionSeed,
  ExpressionSine,
  ExpressionSpheres,
  ExpressionSquareRoot,
  ExpressionStay,
  ExpressionString,
  ExpressionSubtract,
  ExpressionTable,
  ExpressionTangent,
  ExpressionUnit,
  ExpressionVector,
  ExpressionYaw,
} from './ast.js';

// --------------------------------------------------------------------------- 

export const Builtins = (function() {
  const shared = {
    cubeDescription: 'Generate a cube at each visited location.',
    sphereDescription: 'Generate a sphere at each visited location.',
    sphereNsides: 'The number of lines of longitude on the sphere.',
    nameDescription: 'The name of the object, which is used only to identify it in the exported file.',
    radiusDescription: 'The radius of the vertex, which is only meaningful if the path is solidified into a dowel, cubes, or spheres.',
  };

  const radiusParameter = new FormalParameter('radius', shared.radiusDescription, new ExpressionReal(0.5));
  const nameParameter = new FormalParameter('name', shared.nameDescription, new ExpressionUnit());
  const colorParameter = new FormalParameter('color', 'The color of the vertex.', new ExpressionVector([
    new ExpressionReal(1),
    new ExpressionReal(0.5),
    new ExpressionReal(0),
  ]));

  return {
    cubes: new FunctionDefinition('cubes', shared.cubeDescription, [nameParameter], new ExpressionCubes()),
    cube: new FunctionDefinition('cube', shared.cubeDescription, [nameParameter], new ExpressionCubes()),

    spheres: new FunctionDefinition('spheres', shared.sphereDescription, [
      new FormalParameter('nsides', shared.sphereNsides, new ExpressionInteger(4)),
      nameParameter,
    ], new ExpressionSpheres()),

    sphere: new FunctionDefinition('sphere', shared.sphereDescription, [
      new FormalParameter('nsides', shared.sphereNsides, new ExpressionInteger(4)),
      nameParameter,
    ], new ExpressionSpheres()),

    dowel: new FunctionDefinition('dowel', 'Thicken the path into a solid dowel whose cross section is a regular polygon.', [
      new FormalParameter('nsides', 'The number of the sides. For example, 4 yields a square dowel.', new ExpressionInteger(4)),
      new FormalParameter('twist', 'The rotation of the dowel around its axis. In degrees.', new ExpressionReal(0)),
      new FormalParameter('sharpness', 'The maximum angle of the bends in the dowel. Bends greater than this value will be rounded.', new ExpressionReal(360)),
      nameParameter,
    ], new ExpressionDowel()),

    table: new FunctionDefinition('table', 'Thicken the path into a solid dowel whose cross section is a regular polygon.', [
      new FormalParameter('rows', 'The number of the sides. For example, 4 yields a square dowel.'),
      nameParameter,
    ], new ExpressionTable()),

    mold: new FunctionDefinition('mold', 'Extract the current path into a reusable form.', [], new ExpressionMold()),

    rotate: new FunctionDefinition('rotate', 'Rotate the given path.', [
      new FormalParameter('path', 'The path to rotate.'),
      new FormalParameter('degrees', 'The number of degrees to rotate the path.'),
      new FormalParameter('axis', 'The axis about which to rotate the path.'),
      new FormalParameter('origin', 'A point lying on the axis of rotation.', new ExpressionVector([
        new ExpressionReal(0),
        new ExpressionReal(0),
        new ExpressionReal(0),
      ])),
    ], new ExpressionRotate()),

    revolve: new FunctionDefinition('revolve', 'Revolve the path around an axis to produce a solid.', [
      new FormalParameter('degrees', 'The number of degrees to revolve the path.'),
      new FormalParameter('nsides', 'The number of sides on the revolved surface. A higher number produces a smoother surface.', new ExpressionInteger(4)),
      new FormalParameter('axis', 'The axis about which to revolve.', new ExpressionVector([
        new ExpressionReal(0),
        new ExpressionReal(1),
        new ExpressionReal(0),
      ])),
      new FormalParameter('origin', 'A point lying on the axis of revolution.', new ExpressionVector([
        new ExpressionReal(0),
        new ExpressionReal(0),
        new ExpressionReal(0),
      ])),
      nameParameter,
    ], new ExpressionRevolve()),

    extrude: new FunctionDefinition('extrude', 'Create a solid object whose cross section is the current path.', [
      new FormalParameter('axis', 'The direction in which the cross section is extended.'),
      new FormalParameter('distance', 'The distance to extend along the axis.'),
      nameParameter,
    ], new ExpressionExtrude()),

    mesh: new FunctionDefinition('mesh', 'Create a solid object from a list of vertices and faces.', [
      new FormalParameter('positions', "A list of the vertices' 3D positions."),
      new FormalParameter('colors', "A list of the individual vertices' RGB colors.", new ExpressionUnit()),
      new FormalParameter('faces'),
      nameParameter,
    ], new ExpressionMesh()),

    polygon: new FunctionDefinition('polygon', 'TODO', [
      new FormalParameter('flip', 'Whether or not to flip the polygon over by reversing the order of its vertices.', new ExpressionBoolean(false)),
      nameParameter,
    ], new ExpressionPolygon()),

    move: new FunctionDefinition('move', 'Move forward or backward in the current direction.', [
      new FormalParameter('distance', 'The distance to move. A positive distance moves forward; a negative distance moves backward.'),
      radiusParameter,
      colorParameter,
    ], new ExpressionMove()),

    stay: new FunctionDefinition('stay', "Issue a new vertex in the path at the current location. The vertex's other properties, like its radius, may differ.", [
      radiusParameter,
      colorParameter,
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
      radiusParameter,
      colorParameter,
    ], new ExpressionPolarto()),

    moveto: new FunctionDefinition('moveto', 'Move to a 3D position of your choosing.', [
      new FormalParameter('x', 'The x-coordinate of the position.'),
      new FormalParameter('y', 'The y-coordinate of the position.'),
      new FormalParameter('z', 'The z-coordinate of the position.', new ExpressionReal(0)),
      radiusParameter,
      colorParameter,
    ], new ExpressionMoveto()),

    // TODO assert that there is a starting position
    home: new FunctionDefinition('home', 'Close this path by returning to its starting position.', [], new ExpressionHome()),

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

