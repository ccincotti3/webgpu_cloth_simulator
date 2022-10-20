import ClothSelfCollision, { Collision } from "./Collison";
import { Constraint, ConstraintFactory } from "./Constraint";
import { Hash } from "./Hash";
import {
  vecAdd,
  vecCopy,
  vecLengthSquared,
  vecScale,
  vecSetCross,
  vecSetDiff,
  vecSetZero,
} from "./math";
import { Mesh } from "./types";

/**
 * Abstract class that all meshes should inherit from to use XPBD physics
 */
export default abstract class PhysicsObject {
  numParticles: number;
  positions: Float32Array;
  prevPositions: Float32Array;
  vels: Float32Array;
  invMass: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
  neighbors: Float32Array;
  constraints: Constraint[];
  constraintFactory: ConstraintFactory;
  collisions: Collision[];

  constructor(mesh: Mesh) {
    this.numParticles = mesh.positions.length / 3;
    this.positions = new Float32Array(mesh.positions);
    this.normals = new Float32Array(mesh.normals);
    this.prevPositions = new Float32Array(mesh.positions);
    this.vels = new Float32Array(3 * this.numParticles);
    this.invMass = new Float32Array(this.numParticles);
    this.indices = new Uint16Array(mesh.indices);
    this.constraints = [];
    this.collisions = [];

    this.invMass = this.initInvMass();
    this.neighbors = this.findTriNeighbors();

    this.constraintFactory = new ConstraintFactory(
      this.positions,
      this.invMass,
      this.indices,
      this.neighbors
    );
  }

  solve(dt: number) {
    // for (let i = 0; i < this.numParticles; i++) {
    //   // Floor collision ( we currently don't have a need for it)
    //   let y = this.positions[3 * i + 1];
    //   const height = -1.3
    //   if (y < height) {
    //     vecCopy(this.positions, i, this.prevPositions, i);
    //     this.positions[3 * i + 1] = height;
    //   }
    // }
    for (const constraint of this.constraints) {
      constraint.solve(dt);
    }

    for (const collision of this.collisions) {
      collision.solve(dt)
    }
  }

  preSolve(dt: number, gravity: Float32Array) {
    for (let i = 0; i < this.numParticles; i++) {
      if (this.invMass[i] == 0.0) continue;
      vecAdd(this.vels, i, gravity, 0, dt);
      const v = Math.sqrt(vecLengthSquared(this.vels,i));
      const maxV = 0.2 * (0.01 / dt);
      if (v > maxV) {
        vecScale(this.vels,i, maxV / v);
      }
      vecCopy(this.prevPositions, i, this.positions, i);
      vecAdd(this.positions, i, this.vels, i, dt);

    }
  }
  postSolve(dt: number) {
    for (let i = 0; i < this.numParticles; i++) {
      if (this.invMass[i] == 0.0) continue;
      vecSetDiff(
        this.vels,
        i,
        this.positions,
        i,
        this.prevPositions,
        i,
        1.0 / dt
      );
    }
  }
  updateVertexNormals() {
    for (let i = 0; i < this.numParticles; i++) {
      vecSetZero(this.normals, i);
    }
    for (let i = 0; i < this.numParticles; i++) {
      const id0 = this.indices[3 * i];
      const id1 = this.indices[3 * i + 1];
      const id2 = this.indices[3 * i + 2];

      const e0 = [0, 0, 0];
      const e1 = [0, 0, 0];
      const c = [0, 0, 0];

      // Find Area of Triangle
      // Calculate edge vectors from id0
      vecSetDiff(e0, 0, this.positions, id1, this.positions, id0);
      vecSetDiff(e1, 0, this.positions, id2, this.positions, id0);

      // Area of triangle 1/2 |AB x AC|
      vecSetCross(c, 0, e0, 0, e1, 0);

      vecAdd(this.normals, id0, c, 0, 0.333);
      vecAdd(this.normals, id1, c, 0, 0.333);
      vecAdd(this.normals, id2, c, 0, 0.333);
    }
  }

  private initInvMass(): Float32Array {
    const invMass = new Float32Array(this.numParticles);
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

      // Add since vertices may be shared
      invMass[id0] += pInvMass;
      invMass[id1] += pInvMass;
      invMass[id2] += pInvMass;
    }

    return invMass;
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

export class ClothPhysicsObject extends PhysicsObject {
  thickness: number
  hash: Hash
  constructor(mesh: Mesh, thickness: number) {
    super(mesh);
    this.thickness = thickness

    const spacing = thickness
    this.hash = new Hash(spacing, this.numParticles);
  }

  preIntegration(dt: number) {
    this.hash.create(this.positions)
    this.hash.queryAll(this.positions, (1/60) * 0.2 * this.thickness / dt )
  }
  /**
   * Adds a DistanceConstraint to the Cloth physics object
   * @param compliance
   */
  public registerDistanceConstraint(compliance: number) {
    this.constraints.push(
      this.constraintFactory.createDistanceConstraint(compliance)
    );
  }

  /**
   * Adds a PerformantBendingConstraint to the Cloth physics object
   * @param compliance
   */
  public registerPerformantBendingConstraint(compliance: number) {
    this.constraints.push(
      this.constraintFactory.createPerformantBendingConstraint(compliance)
    );
  }

  /**
   * Adds an IsometricBendingConstraint to the Cloth physics object
   * @param compliance
   */
  public registerIsometricBendingConstraint(compliance: number) {
    this.constraints.push(
      this.constraintFactory.createIsometricBendingConstraint(compliance)
    );
  }

  /**
   * Adds a Self Collision constraint to the Cloth physics object
   */
  public registerSelfCollision() {
    this.collisions.push(
      new ClothSelfCollision(
        this.positions,
        this.prevPositions,
        this.invMass,
        this.thickness,
        this.hash
      )
    );
  }
}
