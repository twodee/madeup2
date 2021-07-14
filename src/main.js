import ace from 'ace-builds/src-min-noconflict/ace';
import 'ace-builds/src-min-noconflict/theme-twilight';
import './mode-madeup.js';

import {
  MessagedException,
  RenderMode,
  removeChildren,
} from './common.js';

// import {
  // RenderEnvironment,
// } from './render.js';

import {SourceLocation} from './token.js';
import {interpret} from './interpreter.js';
import {Messager} from './messager.js';
import Interpreter from './interpreter.worker.js';
import {VertexAttributes} from './twodeejs/vertex-attributes.js';
import {ShaderProgram} from './twodeejs/shader-program.js';
import {VertexArray} from './twodeejs/vertex-array.js';
import {Matrix4} from './twodeejs/matrix.js';
import {Trackball} from './twodeejs/trackball.js';
import {Vector2, Vector3, Vector4} from './twodeejs/vector.js';
import {Trimesh} from './twodeejs/trimesh.js';
import {Prefab} from './twodeejs/prefab.js';
import {Camera} from './twodeejs/camera.js';
import {MathUtilities} from './twodeejs/math-utilities.js';
import {Path} from './path.js';

// --------------------------------------------------------------------------- 
// OPTIONS

const hasWorker = false;
let isWireframe = false;

// --------------------------------------------------------------------------- 
// GLOBALS

let editor;
let Range;
let left;
let messagerContainer;
let pathifyButton;
let solidifyButton;
let fitButton;
let saveButton;
let exportObjButton;
let stopButton;
let interpreterWorker;
// let evaluateSpinner;
let canvas;
let centerTransform;
let meshes;

let paths;

let meshObjects;
let pathObjects;
let nodeObject;

let nodeProgram;
let pathProgram;
let solidMeshProgram;
let wireMeshProgram;

let docMap;

let eyeToClip;
let modelToEye;
let zoom;
let trackball;
let aspectRatio;

let scene;
let isSaved = true;
let interpretTimeout;
let isMouseDown;
let contentBounds;
let near = 0.01;

let cursorObject;
let panslation;
let mouseDownAt;
let camera;

// --------------------------------------------------------------------------- 

function highlight(lineStart, lineEnd, columnStart, columnEnd) {
  const range = new Range(lineStart, columnStart, lineEnd, columnEnd + 1);
  editor.getSelection().setSelectionRange(range);
  editor.revealRange(range);
  editor.focus();
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

function downloadBlob(name, blob) {
  let link = document.createElement('a');
  link.download = name;
  link.href = URL.createObjectURL(blob);
  // Firefox needs the element to be live for some reason.
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    document.body.removeChild(link);
  });
}

// --------------------------------------------------------------------------- 

function stopInterpreting() {
  if (interpreterWorker) {
    interpreterWorker.terminate();
    interpreterWorker = undefined;
  }
  stopButton.classList.add('hidden');
}

// --------------------------------------------------------------------------- 

function registerDocMap(pod) {
  docMap = pod.map(call => ({
    where: SourceLocation.reify(call.where),
    documentation: call.documentation,
    providedParameters: call.providedParameters,
  }));
}

// --------------------------------------------------------------------------- 

function postInterpret(pod) {
  console.log("pod:", pod);

  for (let object of pathObjects) {
    object.vertexArray.destroy();
    object.vertexAttributes.destroy();
  }

  for (let meshObject of meshObjects) {
    meshObject.vertexAttributes.destroy();
    meshObject.vertexArray.destroy();
  }

  pathObjects = [];
  meshObjects = [];
  const needsFit = !contentBounds;

  if (pod.renderMode === RenderMode.Pathify) {
    paths = pod.paths.map(pod => Path.fromPod(pod));
    pathObjects = paths.filter(path => path.vertices.length > 0).map(path => generatePathObject(path));

    const positions = paths.flatMap(path => path.vertices);

    if (positions.length > 0) {
      contentBounds = {
        minimum: new Vector3(...positions[0]),
        maximum: new Vector3(...positions[0]),
      };
    } else {
      contentBounds = {
        minimum: new Vector3(0, 0, 0),
        maximum: new Vector3(0, 0, 0),
      };
    }

    for (let position of positions) {
      for (let d = 0; d < 3; ++d) {
        if (position[d] < contentBounds.minimum.data[d]) {
          contentBounds.minimum.data[d] = position[d];
        }
        if (position[d] > contentBounds.maximum.data[d]) {
          contentBounds.maximum.data[d] = position[d];
        }
      }
    }
  } else if (pod.renderMode === RenderMode.Solidify) {
    meshes = pod.meshes.map(pod => ({name: pod.name, mesh: Trimesh.fromPod(pod.mesh)}));
    for (let {mesh} of meshes) {
      mesh.separateFaces();

      const vertexAttributes = new VertexAttributes();
      vertexAttributes.addAttribute('vposition', mesh.vertexCount, 4, mesh.getFlatPositions());
      vertexAttributes.addAttribute('vnormal', mesh.vertexCount, 4, mesh.getFlatNormals());
      vertexAttributes.addAttribute('vcolor', mesh.vertexCount, 4, mesh.getFlatColors());
      vertexAttributes.addIndices(mesh.getFlatFaces());

      if (isWireframe) {
        const barycentricCoordinates = new Array(mesh.vertexCount * 3);
        for (let i = 0; i < mesh.vertexCount * 3; ) {
          barycentricCoordinates[i + 0] = 1;
          barycentricCoordinates[i + 1] = 0;
          barycentricCoordinates[i + 2] = 0;
          i += 3;

          barycentricCoordinates[i + 0] = 0;
          barycentricCoordinates[i + 1] = 1;
          barycentricCoordinates[i + 2] = 0;
          i += 3;

          barycentricCoordinates[i + 0] = 0;
          barycentricCoordinates[i + 1] = 0;
          barycentricCoordinates[i + 2] = 1;
          i += 3;
        }
        vertexAttributes.addAttribute('vbarycentric', mesh.vertexCount, 3, barycentricCoordinates);
      }

      const vertexArray = new VertexArray(isWireframe ? wireMeshProgram : solidMeshProgram, vertexAttributes);

      meshObjects.push({
        vertexAttributes,
        vertexArray,
      });
    }

    if (meshes.length > 0) {
      contentBounds = {
        minimum: meshes[0].mesh.bounds.minimum.clone(),
        maximum: meshes[0].mesh.bounds.maximum.clone(),
      };
    } else {
      contentBounds = {
        minimum: new Vector3(0, 0, 0),
        maximum: new Vector3(0, 0, 0),
      };
    }

    for (let {mesh} of meshes) {
      mesh.separateFaces();

      for (let d = 0; d < 3; ++d) {
        if (mesh.bounds.minimum.data[d] < contentBounds.minimum.data[d]) {
          contentBounds.minimum.data[d] = mesh.bounds.minimum.data[d];
        }
        if (mesh.bounds.maximum.data[d] > contentBounds.maximum.data[d]) {
          contentBounds.maximum.data[d] = mesh.bounds.maximum.data[d];
        }
      }
    }
  }

  if (needsFit) {
    fit();
  }

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

function startInterpreting(renderMode, isErrorDelayed) {
  meshes.splice(0, meshes.length);

  stopInterpreting();
  stopButton.classList.remove('hidden');

  Messager.clear();

  interpreterWorker = new Interpreter();
  interpreterWorker.addEventListener('message', event => {
    if (event.data.type === 'output') {
      Messager.log(event.data.payload);
    } else if (event.data.type === 'output-delayed') {
      Messager.logDelay(event.data.payload);
    } else if (event.data.type === 'clear-error') {
      Messager.clearError();
    } else if (event.data.type === 'show-call-docs') {
      showCallDocs(event.data.payload);
    } else if (event.data.type === 'register-doc-map') {
      registerDocMap(event.data.payload);
    } else if (event.data.type === 'environment') {
      stopInterpreting();
      postInterpret(event.data.payload);
    } else if (event.data.type === 'error') {
      stopInterpreting();
    }
  });

  if (hasWorker) {
    interpreterWorker.postMessage({
      command: 'interpret',
      source: editor.getValue(),
      renderMode,
      isErrorDelayed,
    });
  } else {
    const scene = interpret(editor.getValue(), Messager.log, isErrorDelayed ? Messager.logDelay : Messager.log, Messager.clearError, showCallDocs, registerDocMap, renderMode);
    stopInterpreting();
    if (scene) {
      postInterpret(scene.toPod());
    }
  }
}

// --------------------------------------------------------------------------- 

function onChangeCursor() {
  const cursor = editor.getCursorPosition();

  if (docMap && docMap.length > 0) {

    // We want to find the latest call that contains the cursor. Function calls
    // can be nested as parameters. The outermost call will appear in the list
    // before the nested calls, so let's start from the end and work backward.

    // Breeze backward through all the strict successors.
    let i = docMap.length - 1;
    while (i >= 0 && docMap[i].where.succeeds(cursor.column, cursor.row)) {
      i -= 1;
    }

    // We've either gone off the beginning of the list, or we've hit the
    // innermost call.
    if (i >= 0 && docMap[i].where.contains(cursor.column, cursor.row)) {
      showCallDocs(docMap[i]);
    }
  }
}

// --------------------------------------------------------------------------- 

function showCallDocs(callRecord) {
  const docsDiv = document.createElement('div');
  docsDiv.classList.add('function-docs');

  const nameDiv = document.createElement('h2');
  nameDiv.classList.add('function-docs-heading', 'monospace');
  nameDiv.appendChild(document.createTextNode(callRecord.documentation.name));
  docsDiv.appendChild(nameDiv);

  const descriptionDiv = document.createElement('div');
  descriptionDiv.classList.add('function-docs-description');
  descriptionDiv.innerHTML = callRecord.documentation.description;
  // descriptionDiv.appendChild(document.createTextNode(callRecord.documentation.description));
  docsDiv.appendChild(descriptionDiv);

  const parametersTitleDiv = document.createElement('h3');
  parametersTitleDiv.classList.add('function-docs-heading');
  parametersTitleDiv.appendChild(document.createTextNode('Parameters'));
  docsDiv.appendChild(parametersTitleDiv);

  if (callRecord.documentation.parameters.length === 0) {
    docsDiv.appendChild(document.createTextNode('None.'))
  } else {
    const grid = document.createElement('div');
    grid.classList.add('function-docs-parameter-grid');

    for (let [i, parameter] of callRecord.documentation.parameters.entries()) {
      // const parameterDiv = document.createElement('div');
      // parameterDiv.classList.add('function-docs-parameter');

      const div = document.createElement('div');
      const inputElement = document.createElement('input');
      inputElement.classList.add('function-docs-parameter-status');
      inputElement.onclick = () => false;
      inputElement.setAttribute('type', 'checkbox');
      if (callRecord.providedParameters.includes(parameter.name)) {
        inputElement.setAttribute('checked', 'checked');
      } else if (parameter.defaultExpression) {
        inputElement.indeterminate = true;
      }
      div.appendChild(inputElement);
      grid.appendChild(div);

      const nameElement = document.createElement('div');
      nameElement.classList.add('monospace', 'function-docs-parameter-name');
      nameElement.appendChild(document.createTextNode(`${parameter.name}`));
      grid.appendChild(nameElement);

      const descriptionElement = document.createElement('div');
      descriptionElement.classList.add('function-docs-parameter-description');

      if (parameter.description) {
        const descriptionSpan = document.createElement('span');
        descriptionSpan.innerHTML = parameter.description;
        descriptionElement.appendChild(descriptionSpan);
      }

      if (parameter.defaultExpression) {
        const defaultSpan = document.createElement('span');  
        defaultSpan.classList.add('function-docs-parameter-default');
        defaultSpan.appendChild(document.createTextNode(' Default: '));
        const expressionSpan = document.createElement('span');
        expressionSpan.classList.add('monospace');
        expressionSpan.appendChild(document.createTextNode(parameter.defaultExpression));
        defaultSpan.appendChild(expressionSpan);
        descriptionElement.appendChild(defaultSpan);
      }

      grid.appendChild(descriptionElement);

      if (i < callRecord.documentation.parameters.length - 1) {
        const separator = document.createElement('div');
        separator.classList.add('function-docs-separator');
        grid.appendChild(separator);
      }
    }

    docsDiv.appendChild(grid);
  }

  const returnTitleDiv = document.createElement('h3');
  returnTitleDiv.classList.add('function-docs-heading');
  returnTitleDiv.appendChild(document.createTextNode('Returns'));
  docsDiv.appendChild(returnTitleDiv);

  if (callRecord.documentation.returns) {
    docsDiv.appendChild(document.createTextNode(callRecord.documentation.returns))
  } else {
    docsDiv.appendChild(document.createTextNode('None.'))
  }

  const docsRoot = document.getElementById('docs-root');
  removeChildren(docsRoot);
  docsRoot.appendChild(docsDiv);
}

// --------------------------------------------------------------------------- 

function onSourceChanged() {
  isSaved = false;
  syncTitle();
  clearTimeout(interpretTimeout);
  interpretTimeout = setTimeout(() => startInterpreting(RenderMode.Pathify, true), 1000);
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
  paths = [];
  meshObjects = [];
  meshes = [];
  isMouseDown = false;
  // contentBounds = {
    // minimum: new Vector3(0, 0, 0),
    // maximum: new Vector3(0, 0, 0),
  // };
  camera = Camera.lookAt(new Vector3(0, 0, 0), new Vector3(0, 0, -1), new Vector3(0, 1, 0));
  centerTransform = Matrix4.identity();
  panslation = new Vector2(0, 0);

  initializeDOM();
  initializeGL();
  resizeWindow();

  if (runZeroMode) {
    startInterpreting(RenderMode.Solidify, false);
  }
}

// --------------------------------------------------------------------------- 

function save() {
  if (!isEmbedded) {
    localStorage.setItem('src', editor.getValue());
    isSaved = true;
    syncTitle();
  }
}

// --------------------------------------------------------------------------- 

function initializeDOM() {
  editor = ace.edit('editor');
  editor.setTheme('ace/theme/twilight');
  editor.setOptions({
    fontSize: source0 ? '14pt' : '14pt',
    tabSize: 2,
    useSoftTabs: true
  });

  Range = ace.require('ace/range').Range;

  left = document.getElementById('left');
  messagerContainer = document.getElementById('messager-container');
  pathifyButton = document.getElementById('pathify-button');
  solidifyButton = document.getElementById('solidify-button');
  fitButton = document.getElementById('fit-button');
  saveButton = document.getElementById('save-button');
  stopButton = document.getElementById('stop-button');
  // evaluateSpinner = document.getElementById('evaluate-spinner');
  exportObjButton = document.getElementById('export-obj-button');

  new Messager(document.getElementById('messager'), document, highlight);

  // Set the source code before the listener is attached.
  if (source0) {
    editor.setValue(source0, 1);
  } else if (!isEmbedded && localStorage.getItem('src') !== null) {
    editor.setValue(localStorage.getItem('src'), 1);
  }

  editor.getSession().on('change', onSourceChanged);
  editor.getSession().setMode("ace/mode/madeup");
  editor.getSession().selection.on('changeCursor', onChangeCursor);

  saveButton.addEventListener('click', save);

  fitButton.addEventListener('click', () => {
    fit();
    render();
  });

  stopButton.addEventListener('click', e => {
    stopInterpreting();
  });

  pathifyButton.addEventListener('click', () => {
    startInterpreting(RenderMode.Pathify, false);
  });

  solidifyButton.addEventListener('click', () => {
    startInterpreting(RenderMode.Solidify, false);
  });

  exportObjButton.addEventListener('click', exportObj);

  if (source0) {
    left.style.width = '300px';
    messagerContainer.style.height = '50px';
    editor.resize();
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
  };

  const generateLeftResizer = (resizer, i) => {
    const onMouseMove = e => {
      const parentPanel = resizer.parentNode;
      const bounds = parentPanel.children[i - 1].getBoundingClientRect();
      const newWidth = e.clientX - 4 - bounds.x;

      parentPanel.children[i - 1].style['width'] = `${newWidth}px`;

      editor.resize();
      if (!isEmbedded) {
        localStorage.setItem('left-width', parentPanel.children[i - 1].style.width);
      }
      resizeWindow();

      e.preventDefault();
    };

    const onMouseDown = e => {
      const parentPanel = resizer.parentNode;
      const style = window.getComputedStyle(parentPanel.children[4]);
      const originalMinWidth = style['min-width'];
      parentPanel.children[4].style['min-width'] = style['width'];

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', () => {
        parentPanel.children[4].style['min-width'] = originalMinWidth;
        document.removeEventListener('mousemove', onMouseMove);
      });
      e.preventDefault();
    };

    return onMouseDown;
  };

  const generateRightResizer = (resizer, i) => {
    const onMouseMove = e => {
      const parentPanel = resizer.parentNode;
      const bounds = parentPanel.children[i + 1].getBoundingClientRect();

      if (!isEmbedded) {
        localStorage.setItem('right-width', parentPanel.children[i + 1].style.width);
      }
      resizeWindow();
  
      const newWidth = bounds.right - e.clientX + 4;
      parentPanel.children[i + 1].style['width'] = `${newWidth}px`;

      resizeWindow();
      e.preventDefault();
    };

    const onMouseDown = e => {
      const parentPanel = resizer.parentNode;
      const style = window.getComputedStyle(parentPanel.children[0]);
      const originalMinWidth = style['min-width'];
      parentPanel.children[0].style['min-width'] = style['width'];

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', () => {
        parentPanel.children[0].style['min-width'] = originalMinWidth;
        document.removeEventListener('mousemove', onMouseMove);
      });
      e.preventDefault();
    };

    return onMouseDown;
  };

  const editorMessagerResizer = document.getElementById('editor-messager-resizer');
  editorMessagerResizer.addEventListener('mousedown', generateHeightResizer(editorMessagerResizer)); 

  const settingsDocsResizer = document.getElementById('settings-docs-resizer');
  settingsDocsResizer.addEventListener('mousedown', generateHeightResizer(settingsDocsResizer)); 

  const leftMiddleResizer = document.getElementById('left-middle-resizer');
  leftMiddleResizer.addEventListener('mousedown', generateLeftResizer(leftMiddleResizer, 1)); 

  const middleRightResizer = document.getElementById('middle-right-resizer');
  middleRightResizer.addEventListener('mousedown', generateRightResizer(middleRightResizer, 3));

  const openPanelButton = document.getElementById('open-panel-button');
  const closePanelButton = document.getElementById('close-panel-button');
  const panel = document.getElementById('right');

  const targetMillis = 300;

  openPanelButton.addEventListener('click', () => {
    if (!isEmbedded) {
      localStorage.setItem('is-panel-open', true);
    }
    openPanelButton.style.display = 'none';

    panel.style.display = 'flex';
    const bounds = panel.getBoundingClientRect(); 

    const startValue = bounds.right;
    const endValue = bounds.x;
    const startMillis = new Date().getTime();

    panel.style.position = 'absolute';
    panel.style.top = '0';
    panel.style.bottom = '0';

    const animation = () => {
      const currentMillis = new Date().getTime();
      const elapsedMillis = currentMillis - startMillis;

      if (elapsedMillis <= targetMillis) {
        const proportion = elapsedMillis / targetMillis;
        const value = startValue + (endValue - startValue) * proportion;
        panel.style.left = `${value}px`;
        requestAnimationFrame(animation);
      } else {
        panel.style.left = `${endValue}px`;
        panel.style.position = 'static';
        middleRightResizer.style.display = 'block';
        closePanelButton.style.display = 'block';
      }

      resizeWindow();
    };

    animation();
  });

  closePanelButton.addEventListener('click', () => {
    if (!isEmbedded) {
      localStorage.setItem('is-panel-open', false);
    }
    closePanelButton.style.display = 'none';
    middleRightResizer.style.display = 'none';

    const bounds = panel.getBoundingClientRect(); 

    const startValue = bounds.left;
    const endValue = bounds.right;
    const startMillis = new Date().getTime();

    panel.style.position = 'absolute';
    panel.style.top = '0';
    panel.style.bottom = '0';

    const animation = () => {
      const currentMillis = new Date().getTime();
      const elapsedMillis = currentMillis - startMillis;

      if (elapsedMillis <= targetMillis) {
        const proportion = elapsedMillis / targetMillis;
        const value = startValue + (endValue - startValue) * proportion;
        panel.style.left = `${value}px`;
        requestAnimationFrame(animation);
      } else {
        panel.style.position = 'static';
        panel.style.display = 'none';
        openPanelButton.style.display = 'block';
      }

      resizeWindow();
    };

    animation();
  });

  canvas = document.getElementById('canvas');
  window.gl = canvas.getContext('webgl2');

  // Restore persisted configuration.
  if (!isEmbedded) {
    const leftWidth0 = localStorage.getItem('left-width');
    if (leftWidth0) {
      left.style['width'] = leftWidth0;
    }

    const isPanelOpen = localStorage.getItem('is-panel-open') === 'true';
    if (isPanelOpen) {
      right.style.display = 'flex';
      middleRightResizer.style.display = 'block';
      closePanelButton.style.display = 'block';
      openPanelButton.style.display = 'none';
    }

    const rightWidth0 = localStorage.getItem('right-width');
    if (rightWidth0) {
      right.style['width'] = rightWidth0;
    }
  }

  // Register callbacks.
  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('mouseup', mouseUp);
  canvas.addEventListener('wheel', mouseWheel, {passive: false});

  right.addEventListener('wheel', event => {
    console.log("hi");
    // event.preventDefault();
  }, {passive: true});

  const docsRoot = document.getElementById('docs-root');
  docsRoot.addEventListener('wheel', event => {
    console.log("boo");
    // event.preventDefault();
  }, {passive: true});

  // document.addEventListener('wheel', event => {
    // console.log("prevent default");
    // event.preventDefault();
  // }, {passive: false});

  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      save();
      event.preventDefault();
      return false;
    } else {
      return true;
    }
  });

  // This goes on the window rather than the canvas so that drags can keep
  // going even when the mouse goes off the canvas.
  window.addEventListener('mousemove', mouseMove);

  window.addEventListener('resize', resizeWindow, false);
}

// --------------------------------------------------------------------------- 

function exportObj() {
  const obj = Trimesh.mergeToObj(meshes);
  let blob = new Blob([obj], {type: 'text/plain;charset=utf-8'});
  downloadBlob('download.obj', blob);
}

// --------------------------------------------------------------------------- 

function initializeGL() {
  trackball = new Trackball();

  // gl.cullFace(gl.BACK);
  // gl.enable(gl.CULL_FACE);

  initializeNodeProgram();
  initializePathProgram();
  initializeSolidMeshProgram();
  initializeWireMeshProgram();
  initializePathifyNodeObject();
  initializeCursor();

  reset();
}

// --------------------------------------------------------------------------- 

function initializeCursor() {
  const halfWidth = 0.5;
  const length = 1;
  const peakLength = 0.3;
  const peakHeight = 0.2;

  const positions = [
    new Vector3(-halfWidth, 0, 0),
    new Vector3(halfWidth, 0, 0),
    new Vector3(0, peakHeight, -peakLength),
    new Vector3(0, 0, -length),
  ].map(p => p.scalarMultiply(0.1));

  const faces = [
    [0, 1, 2],
    [1, 3, 2],
    [0, 2, 3],
    [0, 3, 1],
  ];

  const mesh = new Trimesh(positions, faces);
  mesh.color(new Vector3(1, 0.5, 0));
  mesh.separateFaces();

  const vertexAttributes = new VertexAttributes();
  vertexAttributes.addAttribute('vposition', mesh.vertexCount, 4, mesh.getFlatPositions());
  vertexAttributes.addAttribute('vnormal', mesh.vertexCount, 4, mesh.getFlatNormals());
  vertexAttributes.addAttribute('vcolor', mesh.vertexCount, 4, mesh.getFlatColors());
  vertexAttributes.addIndices(mesh.getFlatFaces());

  const vertexArray = new VertexArray(solidMeshProgram, vertexAttributes);

  cursorObject = {
    vertexAttributes,
    vertexArray,
  };
}

// ---------------------------------------------------------------------------

function initializePathifyNodeObject() {
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
}

// --------------------------------------------------------------------------- 

function generateNodeObject(path) {
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
  for (let vertex of path) {
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
  object.vertexAttributes.addAttribute('vposition', path.length * 4, 3, positions);
  object.vertexAttributes.addAttribute('corner', path.length * 4, 2, corners);
  object.vertexAttributes.addIndices(indices);

  object.vertexArray = new VertexArray(nodeProgram, object.vertexAttributes);

  return object;
}

// --------------------------------------------------------------------------- 

function generatePathObject(path) {
  const vpositions = [];
  const as = [];
  const bs = [];
  const directions = [];
  const vertices = path.vertices;

  const nvertices = path.isClosed ? path.vertices.length : path.vertices.length - 1;
  for (let i = 0; i < nvertices; ++i) {
    // Triangle A

    // Vertex 0
    vpositions.push(...vertices[i]);
    as.push(...vertices[i]);
    bs.push(...vertices[(i + 1) % vertices.length]);
    directions.push(1);

    // Vertex 1
    vpositions.push(...vertices[i]);
    as.push(...vertices[i]);
    bs.push(...vertices[(i + 1) % vertices.length]);
    directions.push(-1);

    // Vertex 2
    vpositions.push(...vertices[(i + 1) % vertices.length]);
    as.push(...vertices[i]);
    bs.push(...vertices[(i + 1) % vertices.length]);
    directions.push(1);

    // Triangle B

    // Vertex 0
    vpositions.push(...vertices[i]);
    as.push(...vertices[i]);
    bs.push(...vertices[(i + 1) % vertices.length]);
    directions.push(-1);

    // Vertex 2
    vpositions.push(...vertices[(i + 1) % vertices.length]);
    as.push(...vertices[i]);
    bs.push(...vertices[(i + 1) % vertices.length]);
    directions.push(-1);

    // Vertex 3
    vpositions.push(...vertices[(i + 1) % vertices.length]);
    as.push(...vertices[i]);
    bs.push(...vertices[(i + 1) % vertices.length]);
    directions.push(1);
  }

  const object = {};

  object.vertexAttributes = new VertexAttributes();
  object.vertexAttributes.addAttribute('vposition', nvertices * 6, 3, vpositions);
  object.vertexAttributes.addAttribute('a', nvertices * 6, 3, as);
  object.vertexAttributes.addAttribute('b', nvertices * 6, 3, bs);
  object.vertexAttributes.addAttribute('direction', nvertices * 6, 1, directions);

  object.vertexArray = new VertexArray(pathProgram, object.vertexAttributes);

  return object;
}

// --------------------------------------------------------------------------- 

function initializeNodeProgram() {
  if (nodeProgram) {
    nodeProgram.destroy();
  }

  const vertexSource = `
uniform mat4 eyeToClip;
uniform mat4 modelToEye;

in vec3 vposition;

void main() {
  gl_Position = eyeToClip * modelToEye * vec4(vposition, 1.0);
}
  `;

  const fragmentSource = `
out vec4 fragmentColor;

void main() {
  fragmentColor = vec4(0.0, 0.0, 0.0, 1.0);
}
  `;

  nodeProgram = new ShaderProgram(vertexSource, fragmentSource);
}

// --------------------------------------------------------------------------- 

function initializeSolidMeshProgram() {
  if (solidMeshProgram) {
    solidMeshProgram.destroy();
  }

  const vertexSource = `
uniform mat4 eyeToClip;
uniform mat4 modelToEye;

in vec3 vposition;
in vec3 vnormal;
in vec3 vcolor;

out vec3 positionEye;
out vec3 normalEye;
out vec3 albedo;

void main() {
  vec4 positionEye4 = modelToEye * vec4(vposition, 1.0);
  gl_Position = eyeToClip * positionEye4;

  normalEye = normalize((modelToEye * vec4(vnormal, 0.0)).xyz);
  positionEye = positionEye4.xyz;
  albedo = vcolor;
}
  `;

  const fragmentSource = `
precision mediump float;

const vec3 lightPositionEye = vec3(1.0, 1.0, 1.0);
// const vec3 albedo = vec3(0.478, 0.478, 0.478);
// const vec3 albedo = vec3(1, 0.5, 0);
const vec3 flippedAlbedo = vec3(0.0, 0.5, 1.0);

in vec3 positionEye;
in vec3 normalEye;
in vec3 albedo;

out vec4 fragmentColor;

void main() {
  vec3 normal = normalize(normalEye);
  vec3 lightDirection = normalize(lightPositionEye - positionEye);
  // float litness = max(0.0, dot(normal, lightDirection));
  float d = dot(normal, lightDirection);
  float litness = abs(d);
  vec3 diffuse = litness * (d > 0.0 ? albedo : flippedAlbedo);

  fragmentColor = vec4(diffuse, 1.0);
}
  `;

  solidMeshProgram = new ShaderProgram(vertexSource, fragmentSource);
}

// --------------------------------------------------------------------------- 

function initializeWireMeshProgram() {
  if (wireMeshProgram) {
    wireMeshProgram.destroy();
  }

  const vertexSource = `
uniform mat4 eyeToClip;
uniform mat4 modelToEye;

in vec3 vposition;
in vec3 vnormal;
in vec3 vcolor;
in vec3 vbarycentric;

out vec3 positionEye;
out vec3 normalEye;
out vec3 fbarycentric;
out vec3 albedo;

void main() {
  vec4 positionEye4 = modelToEye * vec4(vposition, 1.0);
  gl_Position = eyeToClip * positionEye4;

  normalEye = normalize((modelToEye * vec4(vnormal, 0.0)).xyz);
  positionEye = positionEye4.xyz;
  fbarycentric = vbarycentric;
  albedo = vcolor;
}
  `;

  const fragmentSource = `
precision mediump float;

const vec3 lightPositionEye = vec3(1.0, 1.0, 1.0);
// const vec3 albedo = vec3(1.0, 0.5, 0.0);

in vec3 positionEye;
in vec3 normalEye;
in vec3 fbarycentric;
in vec3 albedo;

out vec4 fragmentColor;

float edgeFactor() {
  vec3 d = fwidth(fbarycentric) * 50.0;
  vec3 a3 = smoothstep(vec3(0.0), d * 1.5, fbarycentric);
  return min(min(a3.x, a3.y), a3.z);
}

void main() {
  // fragmentColor = vec4(fwidth(fbarycentric) * 100.0, 1.0);
  // return;

  // if (any(lessThan(fbarycentric, vec3(0.02)))) {
  if (edgeFactor() < 0.02) {
    vec3 normal = normalize(normalEye);
    vec3 lightDirection = normalize(lightPositionEye - positionEye);
    float litness = max(0.0, dot(normal, lightDirection));
    vec3 diffuse = litness * albedo;

    fragmentColor = vec4(diffuse, 1.0);
  } else {
    discard;
  }
}
  `;

  wireMeshProgram = new ShaderProgram(vertexSource, fragmentSource);
}

// --------------------------------------------------------------------------- 

function initializePathProgram() {
  if (pathProgram) {
    pathProgram.destroy();
  }

  const vertexSource = `
uniform mat4 eyeToClip;
uniform mat4 modelToEye;
uniform float halfThickness;
uniform float aspectRatio;

in vec3 vposition;
in vec3 a;
in vec3 b;
in float direction;

void main() {
  mat4 objectToClip = eyeToClip * modelToEye;

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

  const fragmentSource = `
precision mediump float;

out vec4 fragmentColor;

void main() {
  fragmentColor = vec4(1.0, 0.5, 0.0, 1.0);
}
  `;

  pathProgram = new ShaderProgram(vertexSource, fragmentSource);
}

// --------------------------------------------------------------------------- 

function fit() {
  reset();
  const centroid = contentBounds.minimum.add(contentBounds.maximum).scalarMultiply(0.5);
  centerTransform = Matrix4.translate(-centroid.x, -centroid.y, -centroid.z);

  const radius = contentBounds.maximum.subtract(contentBounds.minimum).maximumComponent * 0.5 * Math.sqrt(3);
  zoom = (near + radius) / Math.tan(MathUtilities.toRadians(45 * 0.5));
  panslation = new Vector2(0, 0);
}

// --------------------------------------------------------------------------- 

function render() {
  // gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.enable(gl.DEPTH_TEST);

  const worldToEye = camera.matrix.multiplyMatrix(
    Matrix4.translate(panslation.x, panslation.y, 0)
      .multiplyMatrix(Matrix4.translate(0, 0, -zoom)
      .multiplyMatrix(trackball.rotation)
      .multiplyMatrix(centerTransform))
  );

  if (pathObjects.length > 0) {
    // Polyline paths.
    pathProgram.bind();
    pathProgram.setUniformMatrix4('eyeToClip', eyeToClip);
    pathProgram.setUniformMatrix4('modelToEye', worldToEye);
    pathProgram.setUniform1f('halfThickness', 0.005);
    pathProgram.setUniform1f('aspectRatio', aspectRatio);
    for (let object of pathObjects) {
      if (object.vertexAttributes.vertexCount > 0) {
        object.vertexArray.bind();
        object.vertexArray.drawSequence(gl.TRIANGLES);
        object.vertexArray.unbind();
      }
    }
    pathProgram.unbind();

    // Polyline nodes.
    nodeProgram.bind();
    nodeProgram.setUniformMatrix4('eyeToClip', eyeToClip);
    nodeObject.vertexArray.bind();
    for (let path of paths) {
      for (let vertex of path.vertices) {
        nodeProgram.setUniformMatrix4('modelToEye', worldToEye.multiplyMatrix(Matrix4.translate(vertex[0], vertex[1], vertex[2])));
        nodeObject.vertexArray.drawIndexed(gl.TRIANGLES);
      }
    }
    nodeObject.vertexArray.unbind();
    nodeProgram.unbind();

    solidMeshProgram.bind();
    solidMeshProgram.setUniformMatrix4('eyeToClip', eyeToClip);
    for (let path of paths) {
      if (path.vertices.length > 0) {
        solidMeshProgram.setUniformMatrix4('modelToEye', worldToEye.multiplyMatrix(path.turtle.matrix.inverse()));
        cursorObject.vertexArray.bind();
        cursorObject.vertexArray.drawIndexed(gl.TRIANGLES);
        cursorObject.vertexArray.unbind();
      }
    }
    solidMeshProgram.unbind();
  }

  // Solids.
  if (meshObjects.length > 0) {
    if (isWireframe) {
      wireMeshProgram.bind();
      wireMeshProgram.setUniformMatrix4('eyeToClip', eyeToClip);
      wireMeshProgram.setUniformMatrix4('modelToEye', worldToEye);
      for (let meshObject of meshObjects) {
        meshObject.vertexArray.bind();
        meshObject.vertexArray.drawIndexed(gl.TRIANGLES);
        meshObject.vertexArray.unbind();
      }
      wireMeshProgram.unbind();
    } else {
      solidMeshProgram.bind();
      solidMeshProgram.setUniformMatrix4('eyeToClip', eyeToClip);
      solidMeshProgram.setUniformMatrix4('modelToEye', worldToEye);
      for (let meshObject of meshObjects) {
        meshObject.vertexArray.bind();
        meshObject.vertexArray.drawIndexed(gl.TRIANGLES);
        meshObject.vertexArray.unbind();
      }
      solidMeshProgram.unbind();
    }
  }
}

// --------------------------------------------------------------------------- 

function resizeWindow() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  console.log("canvas.width:", canvas.width);
  console.log("canvas.height:", canvas.height);
  trackball.setViewport(canvas.width, canvas.height);
  updateProjection();
  render();
}

// --------------------------------------------------------------------------- 

function updateProjection() {
  aspectRatio = canvas.width / canvas.height;

  // If more width than height, expand width.
  // if (aspectRatio >= 1) {
    // eyeToClip = Matrix4.ortho(-aspectRatio, aspectRatio, -1, 1);
  // } else {
    // eyeToClip = Matrix4.ortho(-1, 1, -1 / aspectRatio, 1 / aspectRatio);
  // }

  eyeToClip = Matrix4.fovPerspective(45, aspectRatio, 0.01, 1000);

  // eyeToClip = Matrix4.fovPerspective(45, 1, near, 10);

  const x = 0.0041421356237309505;
  const clip = eyeToClip.multiplyVector(new Vector4(x, x, -near, 1));
  const ndc = clip.scalarDivide(clip.w);
}

// --------------------------------------------------------------------------- 

function mouseDown(e) {
  const bounds = e.target.getBoundingClientRect();
  mouseDownAt = new Vector2(e.clientX, canvas.height - 1 - e.clientY);
  trackball.start(new Vector2(mouseDownAt.x - bounds.left, mouseDownAt.y));
  isMouseDown = true;
}

// --------------------------------------------------------------------------- 

function mouseMove(e) {
  if (isMouseDown) {
    const mouseAt = new Vector2(e.clientX, canvas.height - 1 - e.clientY);

    if (e.buttons & (1 << 0)) {
      const bounds = canvas.getBoundingClientRect();
      trackball.drag(new Vector2(mouseAt.x - bounds.left, mouseAt.y), 3);
    } else if (e.buttons & (1 << 2)) {
      panslation = panslation.add(mouseAt.subtract(mouseDownAt).scalarMultiply(0.001));
    }

    render();
  }
}

// --------------------------------------------------------------------------- 

function mouseUp(e) {
  isMouseDown = false;
}

// --------------------------------------------------------------------------- 

function mouseWheel(e) {
  e.preventDefault();
  zoom -= e.wheelDelta * 0.005;
  if (zoom <= 0) {
    zoom = 0.01;
  }
  render();
}

// --------------------------------------------------------------------------- 

function reset() {
}

// --------------------------------------------------------------------------- 

initialize();

// --------------------------------------------------------------------------- 

