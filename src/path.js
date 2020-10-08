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
    this.isClosed = Path.isSame(this.vertices[0], this.vertices[this.vertices.length - 1]);
    if (this.isClosed) {
      this.vertices.splice(this.vertices.length - 1, 1);
    }
  }

  equals(that, epsilon = 1e-6) {
    return this.vertices.every((thisVertex, i) => Path.isSame(thisVertex, that.vertices[i], epsilon));
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

  static isSame(a, b, epsilon = 1e-6) {
    return a.position.distance(b.position) < epsilon &&
           a.color.distance(b.color) < epsilon &&
           MathUtilities.isClose(a.radius, b.radius, epsilon);
  }
}

// --------------------------------------------------------------------------- 

