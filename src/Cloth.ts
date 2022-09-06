import {
  DistanceConstraint,
  IsometricBendingConstraint,
  PerformantBendingConstraint,
} from "./Constraints";
import PhysicsObject from "./PhysicsObject";
import { Mesh } from "./types";

/**
 * Cloth that hangs (like from a clothesline)
 * Uses position based dynamics constraints
 *
 * It is the user's responsibility to register constraints within the app.
 */
export default class Cloth extends PhysicsObject {
  constructor(mesh: Mesh) {
    super(mesh);
    this.init();
  }

  /**
   * Adds a DistanceConstraint to the Cloth physics object
   * @param compliance
   */
  public registerDistanceConstraint(compliance: number) {
    this.constraints.push(
      new DistanceConstraint(
        this.positions,
        this.invMass,
        this.indices,
        this.neighbors,
        compliance
      )
    );
  }

  /**
   * Adds a PerformantBendingConstraint to the Cloth physics object
   * @param compliance
   */
  public registerPerformantBendingConstraint(compliance: number) {
    this.constraints.push(
      new PerformantBendingConstraint(
        this.positions,
        this.invMass,
        this.indices,
        this.neighbors,
        compliance
      )
    );
  }

  /**
   * Adds an IsometricBendingConstraint to the Cloth physics object
   * @param compliance
   */
  public registerIsometricBendingConstraint(compliance: number) {
    this.constraints.push(
      new IsometricBendingConstraint(
        this.positions,
        this.invMass,
        this.indices,
        this.neighbors,
        compliance
      )
    );
  }

  private init() {
    // Set top of cloth to have a mass of 0 to hold still
    // in order to get hanging from clothesline visual
    {
      // Variables to store top row
      let minX = Number.MAX_VALUE;
      let maxX = -Number.MAX_VALUE;
      let maxY = -Number.MAX_VALUE;

      for (let i = 0; i < this.numParticles; i++) {
        minX = Math.min(minX, this.positions[3 * i]);
        maxX = Math.max(maxX, this.positions[3 * i]);
        maxY = Math.max(maxY, this.positions[3 * i + 1]);
      }

      // Thickness of the edge to zero out(?)
      const eps = 0.000001;

      for (let i = 0; i < this.numParticles; i++) {
        const x = this.positions[3 * i];
        const y = this.positions[3 * i + 1];
        if (y > maxY - eps && (x < minX + eps || x > maxX - eps))
          // if (y > maxY - eps)
          this.invMass[i] = 0.0;
      }
    }
  }
}
