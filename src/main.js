import ace from 'ace-builds/src-min-noconflict/ace';
import 'ace-builds/src-min-noconflict/theme-twilight';
import './mode-madeup.js';

import {
  MessagedException,
} from './common.js';

// import {
  // RenderEnvironment,
// } from './render.js';

import {
  interpret,
} from './interpreter.js';

import {
  Messager
} from './messager.js';

import Interpreter from './interpreter.worker.js';
import {VertexAttributes} from './twodeejs/vertex_attributes.js';
import {ShaderProgram} from './twodeejs/shader.js';
import {VertexArray} from './twodeejs/vertex_array.js';
import {Matrix4} from './twodeejs/matrix.js';
import {Trackball} from './twodeejs/trackball.js';
import {Vector3} from './twodeejs/vector.js';
import {Trimesh} from './twodeejs/trimesh.js';
import {Prefab} from './twodeejs/prefab.js';

// --------------------------------------------------------------------------- 

let editor;
let Range;
let left;
let messagerContainer;
let evaluateButton;
let exportButton;
let fitButton;
let stopButton;
let saveButton;
let interpreterWorker;
let evaluateSpinner;
let canvas;

let polylines;

let meshObjects;
let nodeObject;
let pathObjects;

let nodeProgram;
let pathProgram;

let projection;
let modelview;
let zoom;
let trackball;
let aspectRatio;

let scene;
let isSaved = true;

// --------------------------------------------------------------------------- 

function highlight(lineStart, lineEnd, columnStart, columnEnd) {
  editor.getSelection().setSelectionRange(new Range(lineStart, columnStart, lineEnd, columnEnd + 1));
  editor.centerSelection();
}

// --------------------------------------------------------------------------- 

function startSpinning(spinner, button) {
  button.disabled = true;
  spinner.style.display = 'block';
}

// --------------------------------------------------------------------------- 

function stopSpinning(spinner, button) {
  button.disabled = false;
  spinner.style.display = 'none';
}

// --------------------------------------------------------------------------- 

// function downloadBlob(name, blob) {
  // let link = document.createElement('a');
  // link.download = name;
  // link.href = URL.createObjectURL(blob);
  // Firefox needs the element to be live for some reason.
  // document.body.appendChild(link);
  // link.click();
  // setTimeout(() => {
    // URL.revokeObjectURL(link.href);
    // document.body.removeChild(link);
  // });
// }

// --------------------------------------------------------------------------- 

function stopInterpreting() {
  if (interpreterWorker) {
    interpreterWorker.terminate();
    interpreterWorker = undefined;
  }
  stopButton.classList.add('hidden');
  stopSpinning(evaluateSpinner, evaluateButton);
}

// --------------------------------------------------------------------------- 

function postInterpret(pod) {
  for (let object of pathObjects) {
    object.vertexArray.destroy();
    object.vertexAttributes.destroy();
  }

  polylines = pod.polylines;
  pathObjects = pod.polylines.filter(polyline => polyline.length > 0).map(polyline => generatePathObject(polyline));

  render();

  // const oldScene = scene;
  // if (oldScene) {
    // oldScene.stop();
  // }
  // scene = RenderEnvironment.reify(document.getElementById('svg'), pod);

  // let hasTweak;

  // scene.startTweak = where => {
    // highlight(where.lineStart, where.lineEnd, where.columnStart, where.columnEnd);
    // hasTweak = false;
    // document.documentElement.classList.remove('grab');
    // document.documentElement.classList.add('grabbing');
  // };

  // scene.tweak = newText => {
    // Ace doesn't have a way to do atomic group of changes, which is what I want
    // for handler events. We work around this by undoing before each tweak.
    // if (hasTweak) {
      // editor.undo();
      // hasTweak = false;
    // }

    // let range = editor.getSelectionRange();
    // let doc = editor.getSession().getDocument();

    // let oldText = doc.getTextRange(range);
    // if (oldText != newText) {
      // doc.replace(range, newText);
      // hasTweak = true;
    // }

    // range.setEnd(range.end.row, range.start.column + newText.length);
    // editor.getSelection().setSelectionRange(range);

    // let t = scene.tickToTime(parseInt(scrubber.value));
    // scene.scrub(t);
  // };

  // scene.stopTweak = () => {
    // hasTweak = false;
    // startInterpreting();
    // document.documentElement.classList.remove('grabbing');
  // };

  // try {
    // scene.clear();
    // scene.start();

    // let t = scene.getTime(parseInt(scrubber.value));
    // if (t < scene.tmin) {
      // scrubTo(0);
    // } else if (t > scene.tmax) {
      // scrubTo((scene.tmax - scene.tmin) * scene.resolution);
    // } else {
      // scrubTo(parseInt(scrubber.value));
    // }

    // if (oldScene) {
      // if (oldScene.selectedShape) {
        // scene.reselect(oldScene.selectedShape);
      // }
      // scene.rebound(oldScene.bounds);
    // }
  // } catch (e) {
    // if (e instanceof MessagedException) {
      // Messager.log(e.userMessage);

      // The scene must be wiped. Otherwise the bounds tracked between runs get
      // messed up.
      // scene = null;

      // throw e;
    // } else {
      // console.trace(e);
      // Messager.log(e.message);
      // scene = null;
    // }
  // }
}

// --------------------------------------------------------------------------- 

function startInterpreting() {
  stopInterpreting();

  startSpinning(evaluateSpinner, evaluateButton);
  stopButton.classList.remove('hidden');

  Messager.clear();

  interpreterWorker = new Interpreter();
  interpreterWorker.addEventListener('message', event => {
    if (event.data.type === 'output') {
      Messager.log(event.data.payload);
    } else if (event.data.type === 'environment') {
      stopInterpreting();
      postInterpret(event.data.payload);
    } else if (event.data.type === 'error') {
      stopInterpreting();
    }
  });

  const hasWorker = false;
  if (hasWorker) {
    interpreterWorker.postMessage({
      command: 'interpret',
      source: editor.getValue(),
    });
  } else {
    const scene = interpret(editor.getValue(), Messager.log);
    stopInterpreting();
    if (scene) {
      const mesh = scene.meshes;

      const vertexAttributes = new VertexAttributes();
      vertexAttributes.addAttribute('vposition', mesh.vertexCount, 4, mesh.getFlatPositions());
      vertexAttributes.addIndices(mesh.getFlatFaces());

      const vertexArray = new VertexArray(nodeProgram, vertexAttributes);

      meshObjects = [
        {
          vertexAttributes,
          vertexArray,
        },
      ];

      postInterpret(scene.toPod());
    }
  }
}

// --------------------------------------------------------------------------- 

function onSourceChanged() {
  // If the source was changed through the text editor, but not through the
  // canvas, the marks are no longer valid.
  // if (scene) {
    // scene.stale();
  // }
  // clearSelection();
  isSaved = false;
  syncTitle();
}

// --------------------------------------------------------------------------- 

function syncTitle() {
  document.title = 'Madeup' + (isSaved ? '' : '*');
}

// --------------------------------------------------------------------------- 

// Keep scrolling from bubbling up to parent when embedded.
// Doesn't work with Ace editor.
// document.body.addEventListener('wheel', function (e) {
  // e.stopPropagation();
  // e.preventDefault();
// });

// --------------------------------------------------------------------------- 

function initialize() {
  pathObjects = [];
  polylines = [];
  meshObjects = [];

  initializeDOM();
  initializeGL();
  resizeWindow();
}

// --------------------------------------------------------------------------- 

function initializeDOM() {
  editor = ace.edit('editor');
  editor.setTheme('ace/theme/twilight');
  editor.setOptions({
    fontSize: source0 ? '10pt' : '14pt',
    tabSize: 2,
    useSoftTabs: true
  });

  Range = ace.require('ace/range').Range;

  left = document.getElementById('left');
  messagerContainer = document.getElementById('messager-container');
  evaluateButton = document.getElementById('evaluate-button');
  exportButton = document.getElementById('export-button');
  fitButton = document.getElementById('fit-button');
  stopButton = document.getElementById('stop-button');
  saveButton = document.getElementById('save-button');
  evaluateSpinner = document.getElementById('evaluate-spinner');
  new Messager(document.getElementById('messager'), document, highlight);

  // if (localStorage.getItem('src') !== null) {
    // editor.setValue(localStorage.getItem('src'), 1);
  // }
  editor.getSession().on('change', onSourceChanged);
  editor.getSession().setMode("ace/mode/madeup");
  editor.getSession().selection.on('changeCursor', () => {
    // if (scene) {
      // const cursor = editor.getCursorPosition();
      // scene.castCursor(cursor.column, cursor.row);
    // }
  });

  saveButton.addEventListener('click', () => {
    localStorage.setItem('src', editor.getValue());
    isSaved = true;
    syncTitle();
  });

  fitButton.addEventListener('click', () => {
    if (scene) scene.fit();
  });

  stopButton.addEventListener('click', e => {
    stopInterpreting();
  });

  evaluateButton.addEventListener('click', () => {
    startInterpreting();
  });

  if (source0) {
    left.style.width = '300px';
    messagerContainer.style.height = '50px';
    editor.resize();
  }

  if (source0) {
    editor.setValue(source0, 1);
    if (runZeroMode) {
      startInterpreting();
      if (runZeroMode == 'loop') {
        play(true);
      }
    }
  }

  const generateHeightResizer = resizer => {
    const onMouseMove = e => {
      const parentPanel = resizer.parentNode;
      const bounds = resizer.parentNode.getBoundingClientRect();
      const relativeY = e.clientY - bounds.y;
      parentPanel.children[0].style['height'] = `${relativeY - 4}px`;
      parentPanel.children[2].style['height'] = `${bounds.height - (relativeY + 4)}px`;
      editor.resize();
      e.preventDefault();
    };

    const onMouseDown = e => {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', onMouseMove);
      });
      e.preventDefault();
    };

    return onMouseDown;
  }

  const generateWidthResizer = resizer => {
    const onMouseMove = e => {
      const parentPanel = resizer.parentNode;
      const bounds = resizer.parentNode.getBoundingClientRect();
      const relativeX = e.clientX - bounds.x;
      parentPanel.children[0].style['width'] = `${relativeX - 4}px`;
      parentPanel.children[2].style['width'] = `${bounds.height - (relativeX + 4)}px`;
      editor.resize();

      localStorage.setItem('left-width', parentPanel.children[0].style.width);

      e.preventDefault();
    };

    const onMouseDown = e => {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', onMouseMove);
      });
      e.preventDefault();
    };

    return onMouseDown;
  }

  const editorMessagerResizer = document.getElementById('editor-messager-resizer');
  editorMessagerResizer.addEventListener('mousedown', generateHeightResizer(editorMessagerResizer)); 

  const leftRightResizer = document.getElementById('left-right-resizer');
  leftRightResizer.addEventListener('mousedown', generateWidthResizer(leftRightResizer)); 

  // Restore editor width from last time, unless we're embedded.
  const leftWidth0 = localStorage.getItem('left-width');
  if (leftWidth0 && !isEmbedded) {
    left.style['width'] = leftWidth0;
  }

  canvas = document.getElementById('canvas');
  window.gl = canvas.getContext('webgl2');

  // Register callbacks.
  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('mouseup', mouseUp);
  canvas.addEventListener('wheel', mouseWheel, {passive: true});

  // This goes on the window rather than the canvas so that drags can keep
  // going even when the mouse goes off the canvas.
  window.addEventListener('mousemove', mouseMove);

  window.addEventListener('resize', resizeWindow, false);
}

// --------------------------------------------------------------------------- 

function initializeGL() {
  trackball = new Trackball();

  gl.cullFace(gl.BACK);
  gl.enable(gl.CULL_FACE);

  initializeNodeProgram();
  initializePathProgram();

  // Make sphere for path nodes.
  const mesh = Prefab.sphere(0.03, new Vector3(0, 0, 0), 20, 10); 

  const vertexAttributes = new VertexAttributes();
  vertexAttributes.addAttribute('vposition', mesh.vertexCount, 4, mesh.getFlatPositions());
  vertexAttributes.addIndices(mesh.getFlatFaces());

  const vertexArray = new VertexArray(nodeProgram, vertexAttributes);

  nodeObject = {
    vertexAttributes,
    vertexArray,
  };
  console.log("nodeObject:", nodeObject);

  reset();
}

// --------------------------------------------------------------------------- 

function generateNodeObject(polyline) {
  const positions = [];
  const corners = [];
  const indices = [];

  const offsets = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];

  let i = 0;
  for (let vertex of polyline) {
    for (let i = 0; i < 4; ++i) {
      positions.push(vertex[0]);
      positions.push(vertex[1]);
      positions.push(vertex[2]);
      corners.push(...offsets[i]);
    }
    indices.push(i, i + 1, i + 3);
    indices.push(i, i + 3, i + 2);
    i += 4;
  }

  const object = {};

  object.vertexAttributes = new VertexAttributes();
  object.vertexAttributes.addAttribute('vposition', polyline.length * 4, 3, positions);
  object.vertexAttributes.addAttribute('corner', polyline.length * 4, 2, corners);
  object.vertexAttributes.addIndices(indices);

  object.vertexArray = new VertexArray(nodeProgram, object.vertexAttributes);

  return object;
}

// --------------------------------------------------------------------------- 

function generatePathObject(polyline) {
  const vpositions = [];
  const as = [];
  const bs = [];
  const directions = [];

  for (let i = 0; i < polyline.length - 1; ++i) {
    // Triangle A

    // Vertex 0
    vpositions.push(...polyline[i]);
    as.push(...polyline[i]);
    bs.push(...polyline[i + 1]);
    directions.push(1);

    // Vertex 1
    vpositions.push(...polyline[i]);
    as.push(...polyline[i]);
    bs.push(...polyline[i + 1]);
    directions.push(-1);

    // Vertex 2
    vpositions.push(...polyline[i + 1]);
    as.push(...polyline[i]);
    bs.push(...polyline[i + 1]);
    directions.push(1);

    // Triangle B

    // Vertex 0
    vpositions.push(...polyline[i]);
    as.push(...polyline[i]);
    bs.push(...polyline[i + 1]);
    directions.push(-1);

    // Vertex 2
    vpositions.push(...polyline[i + 1]);
    as.push(...polyline[i]);
    bs.push(...polyline[i + 1]);
    directions.push(-1);

    // Vertex 3
    vpositions.push(...polyline[i + 1]);
    as.push(...polyline[i]);
    bs.push(...polyline[i + 1]);
    directions.push(1);
  }

  const object = {};

  object.vertexAttributes = new VertexAttributes();
  object.vertexAttributes.addAttribute('vposition', (polyline.length - 1) * 6, 3, vpositions);
  object.vertexAttributes.addAttribute('a', (polyline.length - 1) * 6, 3, as);
  object.vertexAttributes.addAttribute('b', (polyline.length - 1) * 6, 3, bs);
  object.vertexAttributes.addAttribute('direction', (polyline.length - 1) * 6, 1, directions);

  object.vertexArray = new VertexArray(pathProgram, object.vertexAttributes);

  return object;
}

// --------------------------------------------------------------------------- 

function initializeNodeProgram() {
  if (nodeProgram) {
    nodeProgram.destroy();
  }

  const vertexSource = `#version 300 es
uniform mat4 projection;
uniform mat4 modelview;

in vec3 vposition;
// in vec2 corner;

// out vec3 fcolor;
// out vec2 ftexcoords;

void main() {
  // gl_Position = projection * (modelview * vec4(vposition, 1.0) + vec4(corner, 0.0, 0.0) * 0.1);
  gl_Position = projection * modelview * vec4(vposition, 1.0);

  // ftexcoords = corner;
  // fcolor = vec3(0.0, 0.0, 0.0);
}
  `;

  const fragmentSource = `#version 300 es
precision mediump float;

in vec3 fcolor;
in vec2 ftexcoords;

out vec4 fragmentColor;

void main() {
  // if (length(ftexcoords) > 0.3) {
    // discard;
  // }
  // fragmentColor = vec4(fcolor, 1.0);
  fragmentColor = vec4(0.0, 0.0, 0.0, 1.0);
}
  `;

  nodeProgram = new ShaderProgram(vertexSource, fragmentSource);
}

// --------------------------------------------------------------------------- 

function initializePathProgram() {
  if (pathProgram) {
    pathProgram.destroy();
  }

  const vertexSource = `#version 300 es
uniform mat4 projection;
uniform mat4 modelview;
uniform float halfThickness;
uniform float aspectRatio;

in vec3 vposition;
in vec3 a;
in vec3 b;
in float direction;

void main() {
  mat4 objectToClip = projection * modelview;

  vec4 positionClip = objectToClip * vec4(vposition, 1.0);
  vec4 aClip = objectToClip * vec4(a, 1.0);
  vec4 bClip = objectToClip * vec4(b, 1.0);

  vec2 screenScaler = vec2(aspectRatio, 1.0);

  vec2 positionScreen = positionClip.xy / positionClip.w * screenScaler;
  vec2 aScreen = aClip.xy / aClip.w * screenScaler;
  vec2 bScreen = bClip.xy / bClip.w * screenScaler;

  vec2 ab = normalize(bScreen - aScreen);
  vec2 miter = vec2(-ab.y, ab.x);
  miter.x /= aspectRatio;

  gl_Position = positionClip + vec4(halfThickness * direction * miter * positionClip.w, 0.0, 0.0);
}
  `;

  const fragmentSource = `#version 300 es
precision mediump float;

out vec4 fragmentColor;

void main() {
  fragmentColor = vec4(1.0, 0.5, 0.0, 1.0);
}
  `;

  pathProgram = new ShaderProgram(vertexSource, fragmentSource);
}

// --------------------------------------------------------------------------- 

function render() {
  gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.enable(gl.DEPTH_TEST);

  const center = Matrix4.translate(0, 0, 0);

  // Polyline paths.
  pathProgram.bind();
  pathProgram.setUniformMatrix4('projection', projection);
  pathProgram.setUniformMatrix4('modelview', Matrix4.translate(0, 0, zoom).multiplyMatrix(trackball.rotation).multiplyMatrix(center));
  pathProgram.setUniform1f('halfThickness', 0.005);
  pathProgram.setUniform1f('aspectRatio', aspectRatio);

  for (let object of pathObjects) {
    object.vertexArray.bind();
    object.vertexArray.drawSequence(gl.TRIANGLES);
    object.vertexArray.unbind();
  }

  pathProgram.unbind();

  nodeProgram.bind();
  nodeProgram.setUniformMatrix4('projection', projection);

  // Polyline nodes.
  nodeObject.vertexArray.bind();
  for (let polyline of polylines) {
    for (let vertex of polyline) {
      nodeProgram.setUniformMatrix4('modelview', Matrix4.translate(0, 0, zoom).multiplyMatrix(trackball.rotation).multiplyMatrix(Matrix4.translate(vertex[0], vertex[1], vertex[2])));
      nodeObject.vertexArray.drawIndexed(gl.TRIANGLES);
    }
  }
  nodeObject.vertexArray.unbind();

  nodeProgram.setUniformMatrix4('modelview', Matrix4.translate(0, 0, zoom).multiplyMatrix(trackball.rotation));
  for (let meshObject of meshObjects) {
    meshObject.vertexArray.bind();
    meshObject.vertexArray.drawIndexed(gl.TRIANGLES);
    meshObject.vertexArray.unbind();
  }

  nodeProgram.unbind();
}

// --------------------------------------------------------------------------- 

function resizeWindow() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  trackball.setViewport(canvas.width, canvas.height);
  updateProjection();
  render();
}

// --------------------------------------------------------------------------- 

function updateProjection() {
  aspectRatio = canvas.width / canvas.height;

  // If more width than height, expand width.
  if (aspectRatio >= 1) {
    projection = Matrix4.ortho(-aspectRatio, aspectRatio, -1, 1);
  } else {
    projection = Matrix4.ortho(-1, 1, -1 / aspectRatio, 1 / aspectRatio);
  }

  projection = Matrix4.fovPerspective(45, aspectRatio, 0.01, 1000);
}

// --------------------------------------------------------------------------- 

function mouseDown(e) {
  trackball.start(e.clientX, canvas.height - 1 - e.clientY);
}

// --------------------------------------------------------------------------- 

function mouseMove(e) {
  if (e.buttons === 1) {
    trackball.drag(e.clientX, canvas.height - 1 - e.clientY, 3);
    render();
  }
}

// --------------------------------------------------------------------------- 

function mouseUp(e) {
}

// --------------------------------------------------------------------------- 

function mouseWheel(e) {
  zoom += e.wheelDelta * 0.01;
  if (zoom >= 0) {
    zoom = -0.01;
  }
  render();
}

// --------------------------------------------------------------------------- 

function reset() {
  zoom = -2;
  trackball.reset();
}

// --------------------------------------------------------------------------- 

window.addEventListener('DOMContentLoaded', initialize);

// --------------------------------------------------------------------------- 

