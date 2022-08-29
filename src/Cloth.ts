import { initBendingConstraint } from "./constraints/BendingConstraint";
import {
  vecAdd,
  vecCopy,
  vecDistSquared,
  vecDot,
  vecLengthSquared,
  vecScale,
  vecSetCross,
  vecSetDiff,
  vecSetZero,
} from "./math";
import { Mesh } from "./types";

export default class Cloth {
  // Particles
  numParticles: number;
  pos: Float32Array;
  prevPos: Float32Array;
  restPos: Float32Array;
  vel: Float32Array;
  invMass: Float32Array;

  // Stretching and bending constraints
  stretchingIds: Int32Array;
  bendingIds: Int32Array;
  stretchingLengths: Float32Array;
  bendingLengths: Float32Array;
  grads: Float32Array;
  faces: Float32Array;
  normals: Float32Array;
  Q: Float32Array;
  stretchingCompliance: number;
  bendingCompliance: number;
  constructor(mesh: Mesh) {
    // Particles
    this.numParticles = mesh.positions.length / 3;
    this.pos = new Float32Array(mesh.positions);
    this.normals = new Float32Array(mesh.normals);
    this.prevPos = new Float32Array(mesh.positions);
    this.restPos = new Float32Array(mesh.positions);
    this.vel = new Float32Array(3 * this.numParticles);
    this.invMass = new Float32Array(this.numParticles);
    this.faces = new Float32Array(mesh.indices);

    // Stretching and bending constraints
    const neighbors = this.findTriNeighbors(mesh.indices);
    const edgeIds = this.getEdgeIds(mesh.indices, neighbors);
    const triPairIds = this.getTriPairIds(mesh.indices, neighbors);

    this.stretchingIds = new Int32Array(edgeIds);
    this.bendingIds = new Int32Array(triPairIds);
    this.stretchingLengths = new Float32Array(this.stretchingIds.length / 2);
    this.bendingLengths = new Float32Array(this.bendingIds.length / 4);
    this.Q = new Float32Array((16 * this.bendingIds.length) / 4);

    this.stretchingCompliance = 0.0;
    this.bendingCompliance = 100.0;

    this.grads = new Float32Array(4 * 3);
    this.initPhysics(mesh.indices);
  }

  // Get TriPairIds for bending constraints
  private getTriPairIds(
    faceIndices: Uint16Array,
    neighborList: Float32Array
  ): number[] {
    const numTris = faceIndices.length / 3; // Every 3 vertices is a triangle
    const triPairIds = [];
    for (let i = 0; i < numTris; i++) {
      for (let j = 0; j < 3; j++) {
        // This is one edge of a triangle id0 ------- id1
        const id0 = faceIndices[3 * i + j];
        const id1 = faceIndices[3 * i + ((j + 1) % 3)];

        // Check to see if there is a neighbor triangle
        // See findTriNeighbors for details
        const n = neighborList[3 * i + j];

        // Tri pair - two adjacent triangles
        // We want all four indices
        if (n >= 0) {
          // Need to find opposite ids that are on opposite sides of shared edge

          // Neighbor triangle (using n, since that's the neighbor)
          const ni = Math.floor(n / 3); // triangle
          const nj = n % 3; // LOCAL edge

          // We know that the third vertice in current triangle is one of them
          // Get it's global edge number
          const id2 = faceIndices[3 * i + ((j + 2) % 3)];

          // Now get the other triangle pair's global edge number
          const id3 = faceIndices[3 * ni + ((nj + 2) % 3)];
          triPairIds.push(id0);
          triPairIds.push(id1);
          triPairIds.push(id2);
          triPairIds.push(id3);
        }
      }
    }
    return triPairIds;
  }

  // Get getEdgeIds for dsitance contraints
  private getEdgeIds(
    faceIndices: Uint16Array,
    neighborList: Float32Array
  ): number[] {
    const edgeIds = [];
    const numTris = faceIndices.length / 3;
    for (let i = 0; i < numTris; i++) {
      for (let j = 0; j < 3; j++) {
        // This is one edge of a triangle id0 ------- id1
        const id0 = faceIndices[3 * i + j];
        const id1 = faceIndices[3 * i + ((j + 1) % 3)];

        // add each edge only once
        const n = neighborList[3 * i + j];
        if (n < 0 || id0 < id1) {
          edgeIds.push(id0);
          edgeIds.push(id1);
        }
      }
    }
    return edgeIds;
  }

  private initPhysics(faceIndices: Uint16Array) {
    this.invMass.fill(0.0);

    const numTris = faceIndices.length / 3;
    const e0 = [0.0, 0.0, 0.0]; // edge 0 vector
    const e1 = [0.0, 0.0, 0.0]; // edge 1 vector

    const c = [0.0, 0.0, 0.0]; // cross vector of e0 x e1

    for (let i = 0; i < numTris; i++) {
      const id0 = faceIndices[3 * i];
      const id1 = faceIndices[3 * i + 1];
      const id2 = faceIndices[3 * i + 2];

      // Find Area of Triangle
      // Calculate edge vectors from id0
      vecSetDiff(e0, 0, this.pos, id1, this.pos, id0);
      vecSetDiff(e1, 0, this.pos, id2, this.pos, id0);

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

    // Calculate and initialize rest lengths of distance constraints
    for (let i = 0; i < this.stretchingLengths.length; i++) {
      const id0 = this.stretchingIds[2 * i];
      const id1 = this.stretchingIds[2 * i + 1];
      this.stretchingLengths[i] = Math.sqrt(
        vecDistSquared(this.pos, id0, this.pos, id1)
      );
    }

    // Calculate and initialize rest lengths of bending constraints
    for (let i = 0; i < this.bendingLengths.length; i++) {
      // we know id2 and id3 in bendingIds are the vertices that we want
      // to add distance constraints
      // see getTriPairIds for details
      const id0 = this.bendingIds[4 * i + 2];
      const id1 = this.bendingIds[4 * i + 3];
      this.bendingLengths[i] = Math.sqrt(
        vecDistSquared(this.pos, id0, this.pos, id1)
      );
    }

    for (let i = 0; i < this.bendingLengths.length; i++) {
      const ids = [
        this.bendingIds[4 * i],
        this.bendingIds[4 * i + 1],
        this.bendingIds[4 * i + 2],
        this.bendingIds[4 * i + 3],
      ];

      const particles = ids.map((id) => {
        const copy = new Float32Array(4);
        vecCopy(copy, 0, this.pos, id);

        return copy;
      });

      const Q = initBendingConstraint(particles);
      let j = 0;
      const qPart = i * 16;
      while (j < 16) {
        this.Q[qPart + j] = Q[j];
        j++;
      }
    }

    // Set top of cloth to have a mass of 0 to hold still

    // Variables to store top row
    let minX = Number.MAX_VALUE;
    let maxX = -Number.MAX_VALUE;
    let maxY = -Number.MAX_VALUE;

    for (let i = 0; i < this.numParticles; i++) {
      minX = Math.min(minX, this.pos[3 * i]);
      maxX = Math.max(maxX, this.pos[3 * i]);
      maxY = Math.max(maxY, this.pos[3 * i + 1]);
    }

    // Thickness of the edge to zero out(?)
    const eps = 0.000001;

    for (let i = 0; i < this.numParticles; i++) {
      const x = this.pos[3 * i];
      const y = this.pos[3 * i + 1];
      if (y > maxY - eps && (x < minX + eps || x > maxX - eps))
        // if (y > maxY - eps)
        this.invMass[i] = 0.0;
    }
  }

  private findTriNeighbors(indices: Uint16Array): Float32Array {
    // create common edges
    const edges = [];
    const numTris = indices.length / 3;

    for (let i = 0; i < numTris; i++) {
      for (let j = 0; j < 3; j++) {
        const id0 = indices[3 * i + j];
        const id1 = indices[3 * i + ((j + 1) % 3)];
        edges.push({
          id0: Math.min(id0, id1),
          id1: Math.max(id0, id1),
          edgeNr: 3 * i + j,
        });
      }
    }

    // sort so common edges are next to each other

    edges.sort((a, b) =>
      a.id0 < b.id0 || (a.id0 == b.id0 && a.id1 < b.id1) ? -1 : 1
    );

    // find matchign edges

    const neighbors = new Float32Array(3 * numTris);
    neighbors.fill(-1); // open edge

    let i = 0;
    while (i < edges.length) {
      const e0 = edges[i];
      const e1 = edges[i + 1];
      if (e0.id0 === e1.id0 && e0.id1 === e1.id1) {
        neighbors[e0.edgeNr] = e1.edgeNr;
        neighbors[e1.edgeNr] = e0.edgeNr;
      }
      i += 2;
    }

    return neighbors;
  }

  preSolve(dt: number, gravity) {
    for (let i = 0; i < this.numParticles; i++) {
      if (this.invMass[i] == 0.0) continue;
      vecAdd(this.vel, i, gravity, 0, dt);
      vecCopy(this.prevPos, i, this.pos, i);
      vecAdd(this.pos, i, this.vel, i, dt);
      // let y = this.pos[3 * i + 1];
      // if (y < -0.5) {
      //   vecCopy(this.pos, i, this.prevPos, i);
      //   this.pos[3 * i + 1] = -0.5;
      // }
    }
  }

  solve(dt: number) {
    this.solveStretching(this.stretchingCompliance, dt);
    // this.solveBendingTwo(this.bendingCompliance, dt);
    this.solveBending(this.bendingCompliance, dt);
  }

  postSolve(dt: number) {
    for (let i = 0; i < this.numParticles; i++) {
      if (this.invMass[i] == 0.0) continue;
      vecSetDiff(this.vel, i, this.pos, i, this.prevPos, i, 1.0 / dt);
    }
  }

  updateVertexNormals() {
    for (let i = 0; i < this.numParticles; i++) {
      vecSetZero(this.normals, i);
    }
    for (let i = 0; i < this.numParticles; i++) {
      const id0 = this.faces[3 * i];
      const id1 = this.faces[3 * i + 1];
      const id2 = this.faces[3 * i + 2];

      const e0 = [0, 0, 0];
      const e1 = [0, 0, 0];
      const c = [0, 0, 0];

      // Find Area of Triangle
      // Calculate edge vectors from id0
      vecSetDiff(e0, 0, this.pos, id1, this.pos, id0);
      vecSetDiff(e1, 0, this.pos, id2, this.pos, id0);

      // Area of triangle 1/2 |AB x AC|
      vecSetCross(c, 0, e0, 0, e1, 0);

      vecAdd(this.normals, id0, c, 0, 0.333);
      vecAdd(this.normals, id1, c, 0, 0.333);
      vecAdd(this.normals, id2, c, 0, 0.333);
    }
  }

  solveStretching(compliance, dt) {
    const alpha = compliance / dt / dt;

    for (let i = 0; i < this.stretchingLengths.length; i++) {
      const id0 = this.stretchingIds[2 * i];
      const id1 = this.stretchingIds[2 * i + 1];
      const w0 = this.invMass[id0];
      const w1 = this.invMass[id1];
      const w = w0 + w1;
      if (w == 0.0) continue;

      vecSetDiff(this.grads, 0, this.pos, id0, this.pos, id1);
      const len = Math.sqrt(vecLengthSquared(this.grads, 0));
      if (len == 0.0) continue;
      const restLen = this.stretchingLengths[i];
      const C = len - restLen;
      const normalizingFactor = 1.0 / len;
      const s = (-C / (w + alpha)) * normalizingFactor;
      vecAdd(this.pos, id0, this.grads, 0, s * w0);
      vecAdd(this.pos, id1, this.grads, 0, -s * w1);
    }
  }

  solveBending(compliance, dt) {
    const alpha = compliance / dt / dt;

    for (let i = 0; i < this.bendingLengths.length; i++) {
      const id0 = this.bendingIds[4 * i + 2];
      const id1 = this.bendingIds[4 * i + 3];
      const w0 = this.invMass[id0];
      const w1 = this.invMass[id1];
      const w = w0 + w1;
      if (w == 0.0) continue;

      vecSetDiff(this.grads, 0, this.pos, id0, this.pos, id1);
      const len = Math.sqrt(vecLengthSquared(this.grads, 0));
      if (len == 0.0) continue;
      const restLen = this.bendingLengths[i];
      const C = len - restLen;
      const normalizingFactor = 1.0 / len;
      const s = (-C / (w + alpha)) * normalizingFactor;
      vecAdd(this.pos, id0, this.grads, 0, s * w0);
      vecAdd(this.pos, id1, this.grads, 0, -s * w1);
    }
  }

  solveBendingTwo(compliance, dt) {
    const alpha = compliance / dt / dt;
    const memo = new Float32Array(16);
    for (let i = 0; i < this.bendingLengths.length; i++) {
      let idx = i * 4;
      const ids = [
        this.bendingIds[idx++],
        this.bendingIds[idx++],
        this.bendingIds[idx++],
        this.bendingIds[idx],
      ];

      const qIdx = i * 16;

      memo[0] = vecDot(this.pos, ids[0], this.pos, ids[0]);
      memo[1] = vecDot(this.pos, ids[0], this.pos, ids[1]);
      memo[2] = vecDot(this.pos, ids[0], this.pos, ids[2]);
      memo[3] = vecDot(this.pos, ids[0], this.pos, ids[3]);

      memo[4] = memo[1];
      memo[5] = vecDot(this.pos, ids[1], this.pos, ids[1]);
      memo[6] = vecDot(this.pos, ids[1], this.pos, ids[2]);
      memo[7] = vecDot(this.pos, ids[1], this.pos, ids[3]);

      memo[8] = memo[2];
      memo[9] = memo[6];
      memo[10] = vecDot(this.pos, ids[2], this.pos, ids[2]);
      memo[11] = vecDot(this.pos, ids[2], this.pos, ids[3]);

      memo[12] = memo[3];
      memo[13] = memo[7];
      memo[14] = memo[11];
      memo[15] = vecDot(this.pos, ids[3], this.pos, ids[3]);

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
          vecAdd(this.grads, (j / 4) << 0, this.pos, ids[j % 4], Q);
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
          this.pos,
          ids[j],
          this.grads,
          j,
          this.invMass[ids[j]] * deltaLagrangianMultiplier
        );
      }
    }
  }
}
