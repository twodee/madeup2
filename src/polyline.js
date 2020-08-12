import {Camera} from './twodeejs/camera.js';
import {Vector3} from './twodeejs/vector.js';

// --------------------------------------------------------------------------- 

export class Polyline {
  constructor() {
    this.vertices = [];
    this.turtle = new Camera(new Vector3(0, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1));
  }

  add(vertex) {
    this.vertices.push(vertex);
  }

  toPod() {
    return {
      vertices: this.vertices.map(vertex => vertex.position.data),
      turtle: this.turtle.toPod(),
    }
  }

  static fromPod(pod) {
    const polyline = new Polyline();
    polyline.vertices = pod.vertices;
    polyline.turtle = Camera.fromPod(pod.turtle);
    return polyline;
  }
}

// --------------------------------------------------------------------------- 

