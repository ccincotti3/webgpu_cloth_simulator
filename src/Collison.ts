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
  private hash: Hash
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
    this.hash = hash
  }
  solve(dt: number) {
    const thickness2 = this.thickness * this.thickness;
    for (var i = 0; i < this.numParticles; i++) {
      if (this.invMass[i] == 0.0) continue;
      var id0 = i;
      var first = this.hash.firstAdjId[i];
      var last = this.hash.firstAdjId[i + 1];

      for (var j = first; j < last; j++) {
        var id1 = this.hash.adjIds[j];
        if (this.invMass[id1] == 0.0) continue;

        vecSetDiff(this.vecs, 0, this.positions, id1, this.positions, id0);

        var dist2 = vecLengthSquared(this.vecs, 0);
        if (dist2 > thickness2 || dist2 == 0.0) continue;
        var restDist2 = vecDistSquared(
          this.restPositions,
          id0,
          this.restPositions,
          id1
        );

        var minDist = this.thickness;
        if (dist2 > restDist2) continue;
        if (restDist2 < thickness2) minDist = Math.sqrt(restDist2);

        // position correction
        var dist = Math.sqrt(dist2);
        vecScale(this.vecs, 0, (minDist - dist) / dist);
        vecAdd(this.positions, id0, this.vecs, 0, -.5);
        vecAdd(this.positions, id1, this.vecs, 0, .5);

        // velocities
        vecSetDiff(this.vecs, 0, this.positions, id0, this.prevPositions, id0);
        vecSetDiff(this.vecs, 1, this.positions, id1, this.prevPositions, id1);

        // average velocity
        vecSetSum(this.vecs, 2, this.vecs, 0, this.vecs, 1, 0.5);

        // velocity corrections
        vecSetDiff(this.vecs, 0, this.vecs, 2, this.vecs, 0);
        vecSetDiff(this.vecs, 1, this.vecs, 2, this.vecs, 1);

        // add corrections
        var friction = 0.0;
        vecAdd(this.positions, id0, this.vecs, 0, friction);
        vecAdd(this.positions, id1, this.vecs, 1, friction);
      }
    }
  }
}
