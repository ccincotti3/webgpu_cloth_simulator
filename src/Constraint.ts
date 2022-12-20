/**
 * XPBD Constraints
 */

import { mat4 } from "gl-matrix";
import {
  DataArray,
  multiply4dColumnVectorByTranspose,
  vecAdd,
  vecCopy,
  vecDistSquared,
  vecDot,
  vecLengthSquared,
  vecNorm,
  vecScale,
  vecSetCross,
  vecSetDiff,
  vecSetZero,
} from "./math";

/**
 * Constraint parent class in which all constraints
 * dervive from
 */
export abstract class Constraint {
  protected positions: Float32Array;
  protected invMass: Float32Array;
  protected indices: Uint16Array;
  protected neighbors: Float32Array;
  protected grads: Float32Array;
  protected compliance: number;

  constructor(
    positions: Float32Array,
    invMass: Float32Array,
    indices: Uint16Array,
    neighbors: Float32Array,
    compliance: number
  ) {
    this.positions = positions;
    this.invMass = invMass;
    this.indices = indices;
    this.neighbors = neighbors;
    this.compliance = compliance;
    this.grads = new Float32Array(12);
  }

  /**
   * Updates positions during an animation step
   */
  abstract solve(dt: number): void;
}

export class ConstraintFactory {
  private positions: Float32Array;
  private invMass: Float32Array;
  private indices: Uint16Array;
  private neighbors: Float32Array;
  constructor(
    positions: Float32Array,
    invMass: Float32Array,
    indices: Uint16Array,
    neighbors: Float32Array
  ) {
    this.positions = positions;
    this.invMass = invMass;
    this.indices = indices;
    this.neighbors = neighbors;
  }

  createDistanceConstraint(compliance: number) {
    return new DistanceConstraint(
      this.positions,
      this.invMass,
      this.indices,
      this.neighbors,
      compliance
    );
  }

  createPerformantBendingConstraint(compliance: number) {
    return new PerformantBendingConstraint(
      this.positions,
      this.invMass,
      this.indices,
      this.neighbors,
      compliance
    );
  }

  createIsometricBendingConstraint(compliance: number) {
    return new IsometricBendingConstraint(
      this.positions,
      this.invMass,
      this.indices,
      this.neighbors,
      compliance
    );
  }
}

/**
 * Distance constraint as defined in http://mmacklin.com/2017-EG-CourseNotes.pdf
 */
export class DistanceConstraint extends Constraint {
  edgeIds: Uint16Array;
  edgeLengths: Float32Array;

  constructor(
    positions: Float32Array,
    invMass: Float32Array,
    indices: Uint16Array,
    neighbors: Float32Array,
    compliance: number
  ) {
    super(positions, invMass, indices, neighbors, compliance);

    this.edgeIds = this.getEdgeIds();
    this.edgeLengths = new Float32Array(this.edgeIds.length / 2);
    this.initializeEdgeLengths();
  }

  solve(dt: number) {
    const alpha = this.compliance / dt / dt;
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
      const s = (-C / (w + alpha)) * normalizingFactor;
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

/**
 * Bending contraint class in which all bending constraints
 * are derived from
 */
abstract class BendingConstraint extends Constraint {
  bendingIds: Int32Array;
  constructor(
    positions: Float32Array,
    invMass: Float32Array,
    indices: Uint16Array,
    neighbors: Float32Array,
    compliance: number
  ) {
    super(positions, invMass, indices, neighbors, compliance);
    this.bendingIds = new Int32Array(this.getTriPairIds());
  }

  // Find four points that make up two adjacent triangles
  //     id2
  //    /   \
  //   /     \
  // id0 --- id1
  //   \     /
  //    \   /
  //     id3
  private getTriPairIds(): number[] {
    const numTris = this.indices.length / 3; // Every 3 vertices is a triangle
    const triPairIds = [];
    for (let i = 0; i < numTris; i++) {
      // triangles
      for (let j = 0; j < 3; j++) {
        // edges

        // This is one edge of a triangle id0 ------- id1
        const id0 = this.indices[3 * i + j];
        const id1 = this.indices[3 * i + ((j + 1) % 3)];

        // Check to see if there is a neighbor triangle
        // See findTriNeighbors for details
        const n = this.neighbors[3 * i + j];

        // Neighbor found!
        if (n >= 0) {
          // Need to find opposite particle ids that are on opposite sides of shared edge

          // Find the last vertice in this triangle
          // this is the vertice of the triangle not on the shared edge.
          const id2 = this.indices[3 * i + ((j + 2) % 3)];

          // Neighbor triangle (using n, since that's the shared edge of the neighbor triangle)
          const ni = Math.floor(n / 3); // The neighbot triangle
          const nj = n % 3; // LOCAL edge, of the neighbor triangle. (so either 0, 1, 2)

          // Similar to above, find the non-shared vertice
          const id3 = this.indices[3 * ni + ((nj + 2) % 3)];

          triPairIds.push(id0);
          triPairIds.push(id1);
          triPairIds.push(id2);
          triPairIds.push(id3);
        }
      }
    }
    return triPairIds;
  }
}

/**
 * Performant bending constraint as defined in
 * https://matthias-research.github.io/pages/tenMinutePhysics/14-cloth.pdf
 */
export class PerformantBendingConstraint extends BendingConstraint {
  bendingLengths: Float32Array;
  constructor(
    positions: Float32Array,
    invMass: Float32Array,
    indices: Uint16Array,
    neighbors: Float32Array,
    compliance: number
  ) {
    super(positions, invMass, indices, neighbors, compliance);

    this.bendingLengths = new Float32Array(this.bendingIds.length / 4);
    this.initBendingLengths();
  }
  // Solve bending constraint (which is really just a distance constraint)
  // between two unshared vertices in configuration of two adjacent triangles.
  // So in this diagram, it would be vertices id2 and id3.
  //     id2
  //    /   \
  //   /     \
  // id0 --- id1
  //   \     /
  //    \   /
  //     id3
  solve(dt: number) {
    const alpha = this.compliance / dt / dt;

    for (let i = 0; i < this.bendingLengths.length; i++) {
      const id2 = this.bendingIds[4 * i + 2];
      const id3 = this.bendingIds[4 * i + 3];

      const w0 = this.invMass[id2];
      const w1 = this.invMass[id3];

      const w = w0 + w1;
      if (w == 0.0) continue;

      vecSetDiff(this.grads, 0, this.positions, id2, this.positions, id3);
      const len = Math.sqrt(vecLengthSquared(this.grads, 0));

      if (len == 0.0) continue;
      vecScale(this.grads, 0, 1.0 / len);
      const restLen = this.bendingLengths[i];
      const C = len - restLen;

      const s = -C / (w + alpha);

      vecAdd(this.positions, id2, this.grads, 0, s * w0);
      vecAdd(this.positions, id3, this.grads, 0, -s * w1);
    }
  }
  private initBendingLengths() {
    // Calculate and initialize rest lengths of bending constraints
    for (let i = 0; i < this.bendingLengths.length; i++) {
      // we know id2 and id3 in bendingIds are the vertices that we want
      // to add distance constraints
      // see getTriPairIds for details
      const id0 = this.bendingIds[4 * i + 2];
      const id1 = this.bendingIds[4 * i + 3];
      this.bendingLengths[i] = Math.sqrt(
        vecDistSquared(this.positions, id0, this.positions, id1)
      );
    }
  }
}

/**
 * Isometric bending constraint as defined in http://mmacklin.com/2017-EG-CourseNotes.pdf
 */
export class IsometricBendingConstraint extends BendingConstraint {
  Q: Float32Array;
  constructor(
    positions: Float32Array,
    invMass: Float32Array,
    indices: Uint16Array,
    neighbors: Float32Array,
    compliance: number
  ) {
    super(positions, invMass, indices, neighbors, compliance);
    this.Q = new Float32Array((16 * this.bendingIds.length) / 4);
    this.initQ();
  }

  solve(dt: number) {
    const alpha = this.compliance / dt / dt;
    const memo = new Float32Array(16);
    for (let i = 0; i < this.bendingIds.length / 4; i++) {
      let idx = i * 4;
      const ids = [
        this.bendingIds[idx++],
        this.bendingIds[idx++],
        this.bendingIds[idx++],
        this.bendingIds[idx],
      ];

      const qIdx = i * 16;

      memo[0] = vecDot(this.positions, ids[0], this.positions, ids[0]);
      memo[1] = vecDot(this.positions, ids[0], this.positions, ids[1]);
      memo[2] = vecDot(this.positions, ids[0], this.positions, ids[2]);
      memo[3] = vecDot(this.positions, ids[0], this.positions, ids[3]);

      memo[4] = memo[1];
      memo[5] = vecDot(this.positions, ids[1], this.positions, ids[1]);
      memo[6] = vecDot(this.positions, ids[1], this.positions, ids[2]);
      memo[7] = vecDot(this.positions, ids[1], this.positions, ids[3]);

      memo[8] = memo[2];
      memo[9] = memo[6];
      memo[10] = vecDot(this.positions, ids[2], this.positions, ids[2]);
      memo[11] = vecDot(this.positions, ids[2], this.positions, ids[3]);

      memo[12] = memo[3];
      memo[13] = memo[7];
      memo[14] = memo[11];
      memo[15] = vecDot(this.positions, ids[3], this.positions, ids[3]);

      let C = 0;
      {
        for (let j = 0; j < 16; j++) {
          const Q = this.Q[qIdx + j];
          if (Q === 0.0) continue;
          C += Q * memo[j];
        }
      }

      // If zero, let's move on.
      if (C === 0.0) continue;

      // Calculate grad
      {
        for (let j = 0; j < 4; j++) {
          vecSetZero(this.grads, j);
        }
        for (let j = 0; j < 16; j++) {
          const Q = this.Q[qIdx + j];
          if (Q === 0.0) continue;
          vecAdd(this.grads, (j / 4) << 0, this.positions, ids[j % 4], Q);
        }
      }

      let sum = 0;
      for (let j = 0; j < 4; j++) {
        if (this.invMass[ids[j]] === 0.0) continue;
        sum += this.invMass[ids[j]] * vecDot(this.grads, j, this.grads, j);
      }

      const deltaLagrangianMultiplier = -(0.5 * C) / (sum + alpha);
      for (let j = 0; j < 4; j++) {
        if (this.invMass[ids[j]] === 0.0) continue;
        vecAdd(
          this.positions,
          ids[j],
          this.grads,
          j,
          this.invMass[ids[j]] * deltaLagrangianMultiplier
        );
      }
    }
  }

  private initQ() {
    for (let i = 0; i < this.bendingIds.length / 4; i++) {
      const ids = [
        this.bendingIds[4 * i],
        this.bendingIds[4 * i + 1],
        this.bendingIds[4 * i + 2],
        this.bendingIds[4 * i + 3],
      ];

      const particles = ids.map((id) => {
        const copy = new Float32Array(4);
        vecCopy(copy, 0, this.positions, id);

        return copy;
      });

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

      const K = new Float32Array([
        cot01 + cot04,
        cot02 + cot03,
        -cot01 - cot02,
        -cot03 - cot04,
      ]);

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
      let j = 0;
      const qPart = i * 16;
      while (j < 16) {
        this.Q[qPart + j] = Q[j];
        j++;
      }
    }
  }
}
