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

    table: new FunctionDefinition('table', 'Generate a solid object by connecting a sequence of cross sections together.', [
      new FormalParameter('rows', 'An array of paths. Each path is a cross section of the solid and is connected to its neighboring paths. Unlike <var>loft</var>, each path has the same number of vertices.'),
      nameParameter,
    ], new ExpressionTable()),

    mold: new FunctionDefinition('mold', 'Bundle the current path into a reusable form.', [], new ExpressionMold()),

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

    polygon: new FunctionDefinition('polygon', 'Create a flat object by filling in the current path.', [
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

    polarto: new FunctionDefinition('polarto', 'Move to the position using 2D polar coordinates.', [
      new FormalParameter('distance', 'The distance of the point from its origin.'),
      new FormalParameter('degrees', 'The number of degrees the point is from the positive x-axis.'),
      new FormalParameter('origin', 'The center of the circle in which the polar coordinates apply.', new ExpressionVector([
        new ExpressionReal(0),
        new ExpressionReal(0),
        new ExpressionReal(0),
      ])),
      radiusParameter,
      colorParameter,
    ], new ExpressionPolarto()),

    moveto: new FunctionDefinition('moveto', 'Move to a 3D position.', [
      new FormalParameter('x', 'The x-coordinate of the position.'),
      new FormalParameter('y', 'The y-coordinate of the position.'),
      new FormalParameter('z', 'The z-coordinate of the position.', new ExpressionReal(0)),
      radiusParameter,
      colorParameter,
    ], new ExpressionMoveto()),

    // TODO assert that there is a starting position
    home: new FunctionDefinition('home', 'Close this path by returning to its starting position.', [], new ExpressionHome()),

    print: new FunctionDefinition('print', 'Display a message in the console.', [
      new FormalParameter('message', 'The message to display.')
    ], new ExpressionPrint()),

    debug: new FunctionDefinition('debug', 'Display some code in the console along with the value it yields when executed.', [
      new FormalParameter('code', 'The expression to display and evaluate.')
    ], new ExpressionDebug()),

    random: new FunctionDefinition('random', 'Generate a random number in a given range. If <var>min</var> and <var>max</var> are both integers, a random integer is generated. Otherwise, a random real is generated.', [
      new FormalParameter('min', 'The least possible value.', new ExpressionInteger(0)),
      new FormalParameter('max', 'The greatest possible value.'),
    ], new ExpressionRandom()),

    seed: new FunctionDefinition('seed', 'Prime the random number generator with a seed value. Normally, each run of a program will produce a different sequence of numbers from <var>random</var>. To produce a repeatable sequence, seed the random number generator with a constant value.', [
      new FormalParameter('value', 'The seed value. This value can be an integer, a real, or a string.')
    ], new ExpressionSeed()),

    sin: new FunctionDefinition('sin', 'Calculate the ratio between the lengths of the opposite side and the hypotenuse of a right triangle.', [
      new FormalParameter('degrees', 'The measure of the angle facing the opposite side.')
    ], new ExpressionSine()),

    cos: new FunctionDefinition('cos', 'Calculate the ratio between the lengths of the adjacent side and the hypotenuse of a right triangle.', [
      new FormalParameter('degrees', 'The measure of the angle between the two sides.')
    ], new ExpressionCosine()),

    tan: new FunctionDefinition('tan', 'Calculate the ratio between the lengths of the opposite and adjacent sides of a right triangle.', [
      new FormalParameter('degrees', 'The measure of the angle between the two sides.')
    ], new ExpressionTangent()),

    asin: new FunctionDefinition('asin', 'Calculate the angle of a right triangle given the ratio between its opposite side and its hypotenuse.', [
      new FormalParameter('ratio', 'The ratio between the two sides of the triangle.')
    ], new ExpressionArcSine()),

    acos: new FunctionDefinition('acos', 'Calculate the angle of a right triangle given the ratio between its adjacent side and its hypotenuse.', [
      new FormalParameter('ratio', 'The ratio between the two sides of the triangle.')
    ], new ExpressionArcCosine()),

    atan: new FunctionDefinition('atan', 'Calculate the angle of a right triangle given the ratio between its opposite side and its adjacent side.', [
      new FormalParameter('ratio', 'The ratio between the two sides of the triangle.')
    ], new ExpressionArcTangent()),

    atan2: new FunctionDefinition('atan2', 'Calculate the angle of a right triangle given the ratio between its opposite side and its adjacent side.', [
      new FormalParameter('a', 'The length of the opposite side.'),
      new FormalParameter('b', 'The length of the adjacent side.'),
    ], new ExpressionArcTangent2()),

    hypotenuse: new FunctionDefinition('hypotenuse', 'Calculate the hypotenuse of a right triangle given the length of its other two sides.', [
      new FormalParameter('a', 'The length of one side of the triangle.'),
      new FormalParameter('b', 'The length of the other side of the triangle.')
    ], new ExpressionHypotenuse()),

    sqrt: new FunctionDefinition('sqrt', 'Calculate the square root.', [
      new FormalParameter('x', 'The number whose square root is calculated.')
    ], new ExpressionSquareRoot()),

    int: new FunctionDefinition('int', 'Convert a real number to an integer by chopping off any fraction.', [
      new FormalParameter('x', 'The number to convert.')
    ], new ExpressionInt()),
  };
})();

// --------------------------------------------------------------------------- 

