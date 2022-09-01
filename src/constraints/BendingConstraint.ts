import { mat4, vec4 } from "gl-matrix";
import {
  DataArray,
  vecAdd,
  vecCopy,
  vecDistSquared,
  vecDot,
  vecLengthSquared,
  vecNorm,
  vecScale,
  vecSetCross,
  vecSetDiff,
} from "../math";

export class ConstraintAPI {
  protected positions: Float32Array;
  protected invMass: Float32Array;
  protected indices: Uint16Array;
  protected neighbors: Float32Array;
  protected numParticles: number;
  protected dt: number;

  constructor(
    positions: Float32Array,
    indices: Uint16Array,
    invMass: Float32Array,
    dt: number
  ) {
    this.positions = positions;
    this.indices = indices;
    this.dt = dt;

    this.numParticles = positions.length / 3;
    this.invMass = invMass;

    this.neighbors = this.findTriNeighbors();
    // this.initializeInvMass();
  }

  public createDistanceConstraint(compliance: number) {
    return new DistanceConstraint(
      this.positions,
      this.invMass,
      this.indices,
      this.neighbors,
      compliance,
      this.dt
    );
  }

  private initializeInvMass() {
    this.invMass.fill(0.0);

    const numTris = this.indices.length / 3;
    const e0 = [0.0, 0.0, 0.0]; // edge 0 vector
    const e1 = [0.0, 0.0, 0.0]; // edge 1 vector
    const c = [0.0, 0.0, 0.0]; // cross vector of e0 x e1

    for (let i = 0; i < numTris; i++) {
      const id0 = this.indices[3 * i];
      const id1 = this.indices[3 * i + 1];
      const id2 = this.indices[3 * i + 2];

      // Find Area of Triangle
      // Calculate edge vectors from id0
      vecSetDiff(e0, 0, this.positions, id1, this.positions, id0);
      vecSetDiff(e1, 0, this.positions, id2, this.positions, id0);

      // Area of triangle 1/2 |AB x AC|
      vecSetCross(c, 0, e0, 0, e1, 0);
      const A = 0.5 * Math.sqrt(vecLengthSquared(c, 0)); // magnitude of cross vector

      // Divide mass among 3 points in triangle
      const pInvMass = A > 0.0 ? 1.0 / A / 3.0 : 0.0;

      // Add since vertices may be shared (?)
      this.invMass[id0] += pInvMass;
      this.invMass[id1] += pInvMass;
      this.invMass[id2] += pInvMass;
    }
  }

  private findTriNeighbors(): Float32Array {
    const edges = [];
    const numTris = this.indices.length / 3;

    for (let i = 0; i < numTris; i++) {
      for (let j = 0; j < 3; j++) {
        const id0 = this.indices[3 * i + j];
        const id1 = this.indices[3 * i + ((j + 1) % 3)];
        edges.push({
          id0: Math.min(id0, id1), // particle 1
          id1: Math.max(id0, id1), // particle 2
          edgeNr: 3 * i + j, // global edge number
        });
      }
    }
    // sort so common edges are next to each other
    edges.sort((a, b) =>
      a.id0 < b.id0 || (a.id0 == b.id0 && a.id1 < b.id1) ? -1 : 1
    );

    // find matching edges
    const neighbors = new Float32Array(3 * numTris);
    neighbors.fill(-1); // -1 means open edge, as in no neighbors

    let i = 0;
    while (i < edges.length) {
      const e0 = edges[i];
      const e1 = edges[i + 1];

      // If the particles share the same edge, update the neighbors list
      // with their neighbors corresponding global edge number
      if (e0.id0 === e1.id0 && e0.id1 === e1.id1) {
        neighbors[e0.edgeNr] = e1.edgeNr;
        neighbors[e1.edgeNr] = e0.edgeNr;
      }
      i += 2;
    }

    return neighbors;
  }
}

export abstract class Constraint {
  protected positions: Float32Array;
  protected invMass: Float32Array;
  protected indices: Uint16Array;
  protected neighbors: Float32Array;
  protected alpha: number;
  protected grads: Float32Array;

  constructor(
    positions: Float32Array,
    invMass: Float32Array,
    indices: Uint16Array,
    neighbors: Float32Array,
    compliance: number,
    dt: number
  ) {
    this.positions = positions;
    this.invMass = invMass;
    this.indices = indices;
    this.neighbors = neighbors;
    this.alpha = compliance / dt / dt;
    this.grads = new Float32Array(12);
  }

  abstract solve(): void;
}

export class DistanceConstraint extends Constraint {
  edgeIds: Uint16Array;
  edgeLengths: Float32Array;

  constructor(
    positions: Float32Array,
    invMass: Float32Array,
    indices: Uint16Array,
    neighbors: Float32Array,
    compliance: number,
    dt: number
  ) {
    super(
      positions,
      invMass,
      indices,
      neighbors,
      compliance,
      dt
    );

    this.edgeIds = this.getEdgeIds();

    this.edgeLengths = new Float32Array(this.edgeIds.length / 2);
    this.initializeEdgeLengths();
  }

  solve() {
    for (let i = 0; i < this.edgeLengths.length; i++) {
      const id0 = this.edgeIds[2 * i];
      const id1 = this.edgeIds[2 * i + 1];
      const w0 = this.invMass[id0];
      const w1 = this.invMass[id1];
      const w = w0 + w1;
      if (w == 0.0) continue;

      vecSetDiff(this.grads, 0, this.positions, id0, this.positions, id1);
      const len = Math.sqrt(vecLengthSquared(this.grads, 0));
      if (len == 0.0) continue;
      const restLen = this.edgeLengths[i];
      const C = len - restLen;
      const normalizingFactor = 1.0 / len;
      const s = (-C / (w + this.alpha)) * normalizingFactor;
      vecAdd(this.positions, id0, this.grads, 0, s * w0);
      vecAdd(this.positions, id1, this.grads, 0, -s * w1);
    }
  }

  // Calculate and initialize rest lengths of distance constraints
  private initializeEdgeLengths() {
    for (let i = 0; i < this.edgeLengths.length; i++) {
      const id0 = this.edgeIds[2 * i];
      const id1 = this.edgeIds[2 * i + 1];
      this.edgeLengths[i] = Math.sqrt(
        vecDistSquared(this.positions, id0, this.positions, id1)
      );
    }
  }

  // Get edge ids for distance contraints
  private getEdgeIds(): Uint16Array {
    const edgeIds = [];
    const numTris = this.indices.length / 3;
    for (let i = 0; i < numTris; i++) {
      for (let j = 0; j < 3; j++) {
        // This is one edge of a triangle id0 ------- id1
        const id0 = this.indices[3 * i + j];
        const id1 = this.indices[3 * i + ((j + 1) % 3)];

        // add each edge only once
        const n = this.neighbors[3 * i + j];
        if (n < 0 || id0 < id1) {
          edgeIds.push(id0);
          edgeIds.push(id1);
        }
      }
    }
    return new Uint16Array(edgeIds);
  }
}

export const initBendingConstraint = (
  particles: Float32Array[]
): [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
] => {
  const cotTheta = (a: DataArray, b: DataArray) => {
    const cosTheta = vecDot(a, 0, b, 0);
    const cross = new Float32Array(3);

    vecSetCross(cross, 0, a, 0, b, 0);
    const sinTheta = vecNorm(cross);
    return cosTheta / sinTheta;
  };

  const [p0, p1, p2, p3] = particles;

  const e0 = new Float32Array(3),
    e1 = new Float32Array(3),
    e2 = new Float32Array(3),
    e3 = new Float32Array(3),
    e4 = new Float32Array(3),
    ne1 = new Float32Array(3),
    ne2 = new Float32Array(3),
    e01Cross = new Float32Array(3),
    e03Cross = new Float32Array(3);

  vecSetDiff(e0, 0, p1, 0, p0, 0);
  vecSetDiff(e1, 0, p2, 0, p1, 0);
  vecSetDiff(e2, 0, p0, 0, p2, 0);
  vecSetDiff(e3, 0, p3, 0, p0, 0);
  vecSetDiff(e4, 0, p1, 0, p3, 0);

  vecCopy(ne1, 0, e1, 0);
  vecCopy(ne2, 0, e2, 0);
  vecScale(ne1, 0, -1);
  vecScale(ne2, 0, -1);

  vecSetCross(e01Cross, 0, e0, 0, e1, 0);
  vecSetCross(e03Cross, 0, e0, 0, e3, 0);

  const cot01 = cotTheta(e0, ne1);
  const cot02 = cotTheta(e0, ne2);
  const cot03 = cotTheta(e0, e3);
  const cot04 = cotTheta(e0, e4);

  //TODO
  const K = vec4.fromValues(
    cot01 + cot04,
    cot02 + cot03,
    -cot01 - cot02,
    -cot03 - cot04
  );

  const multiply4dColumnVectorByTranspose = (a: vec4) => {
    const out: number[][] = [[], [], [], []];

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        out[i][j] = a[i] * a[j];
      }
    }

    return out;
  };

  const Km: number[][] = multiply4dColumnVectorByTranspose(K);

  const Q = mat4.fromValues(
    Km[0][0],
    Km[0][1],
    Km[0][2],
    Km[0][3],
    Km[1][0],
    Km[1][1],
    Km[1][2],
    Km[1][3],
    Km[2][0],
    Km[2][1],
    Km[2][2],
    Km[2][3],
    Km[3][0],
    Km[3][1],
    Km[3][2],
    Km[3][3]
  );

  const A0 = 0.5 * vecNorm(e01Cross);
  const A1 = 0.5 * vecNorm(e03Cross);

  mat4.multiplyScalar(Q, Q, 3.0 / (A0 + A1));

  return Q as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
  ];
};
