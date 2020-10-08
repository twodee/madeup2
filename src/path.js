import {Camera} from './twodeejs/camera.js';
import {Vector3} from './twodeejs/vector.js';
import {MathUtilities} from './twodeejs/mathutilities.js';

// --------------------------------------------------------------------------- 

export class Path {
  constructor() {
    this.vertices = [];
    this.turtle = new Camera(new Vector3(0, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1));
    this.isClosed = false;
  }

  add(vertex) {
    this.vertices.push(vertex);
  }

  seal(epsilon = 1e-6) {
    const a = this.vertices[0];
    const b = this.vertices[this.vertices.length - 1];

    this.isClosed =
      a.position.distance(b.position) < epsilon &&
      a.color.distance(b.color) < epsilon &&
      MathUtilities.isClose(a.radius, b.radius, epsilon);

    if (this.isClosed) {
      this.vertices.splice(this.vertices.length - 1, 1);
    }
  }

  toPod() {
    return {
      vertices: this.vertices.map(vertex => vertex.position.data),
      turtle: this.turtle.toPod(),
      isClosed: this.isClosed,
    }
  }

  static fromPod(pod) {
    const path = new Path();
    path.vertices = pod.vertices;
    path.turtle = Camera.fromPod(pod.turtle);
    path.isClosed = pod.isClosed;
    return path;
  }
}

// --------------------------------------------------------------------------- 

