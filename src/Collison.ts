import { Hash } from "./Hash";
import {
  vecAdd,
  vecDistSquared,
  vecLengthSquared,
  vecScale,
  vecSetDiff,
  vecSetSum,
} from "./math";

export abstract class Collision {
  protected positions: Float32Array;
  protected prevPositions: Float32Array;
  protected invMass: Float32Array;
  protected vecs: Float32Array;
  protected numParticles: number;

  constructor(
    positions: Float32Array,
    prevPositions: Float32Array,
    invMass: Float32Array
  ) {
    this.positions = positions;
    this.prevPositions = prevPositions;
    this.invMass = invMass;
    this.vecs = new Float32Array(12);
    this.numParticles = positions.length / 3;
  }

  /**
   * Updates positions during an animation step
   */
  abstract solve(dt: number): void;
}
/**
 * Collision constraints specfic to cloth
 */

export default class ClothSelfCollision extends Collision {
  private thickness: number;
  private restPositions: Float32Array;
  private hash: Hash;
  constructor(
    positions: Float32Array,
    prevPositions: Float32Array,
    invMass: Float32Array,
    thickness: number,
    hash: Hash
  ) {
    super(positions, prevPositions, invMass);
    this.thickness = thickness;
    this.restPositions = new Float32Array(positions);
    this.hash = hash;
  }
  solve(dt: number) {
    // Square to compare with dist2
    // We can do this to save a sqrt operation
    const thickness2 = this.thickness * this.thickness;

    for (let id0 = 0; id0 < this.numParticles; id0++) {
      if (this.invMass[id0] == 0.0) continue;
      const adjacentParticles = this.hash.getAdjacentParticles(id0);

      for (const id1 of adjacentParticles) {
        if (this.invMass[id1] == 0.0) continue;

        // Determine if the distance between the two particles is smaller than
        // the thickness... which would signify that the particles are overlapping
        // each other.
        vecSetDiff(this.vecs, 0, this.positions, id1, this.positions, id0);
        const dist2 = vecLengthSquared(this.vecs, 0);
        if (dist2 > thickness2 || dist2 === 0.0) continue;

        // If the particles have smaller rest distances than
        // the thickness, use that to make the position correction.
        const restDist2 = vecDistSquared(
          this.restPositions,
          id0,
          this.restPositions,
          id1
        );

        let minDist = this.thickness;
        if (dist2 > restDist2) continue;
        if (restDist2 < thickness2) minDist = Math.sqrt(restDist2);

        // Position correction
        // Now finally do the sqrt op
        const dist = Math.sqrt(dist2);
        const correctionDist = minDist - dist;
        if (correctionDist > 0.0) {
          vecScale(this.vecs, 0, correctionDist / dist);
          vecAdd(this.positions, id0, this.vecs, 0, -0.5);
          vecAdd(this.positions, id1, this.vecs, 0, 0.5);

          // Friction Handling
          const dampingCoefficient = -1;

          if (dampingCoefficient > 0) {
            // velocities
            vecSetDiff(
              this.vecs,
              0,
              this.positions,
              id0,
              this.prevPositions,
              id0
            );
            vecSetDiff(
              this.vecs,
              1,
              this.positions,
              id1,
              this.prevPositions,
              id1
            );

            // average velocity
            vecSetSum(this.vecs, 2, this.vecs, 0, this.vecs, 1, 0.5);

            // velocity corrections by modifying them.
            vecSetDiff(this.vecs, 0, this.vecs, 2, this.vecs, 0);
            vecSetDiff(this.vecs, 1, this.vecs, 2, this.vecs, 1);

            // add corrections
            vecAdd(this.positions, id0, this.vecs, 0, dampingCoefficient);
            vecAdd(this.positions, id1, this.vecs, 1, dampingCoefficient);
          }
        }
      }
    }
  }
}
