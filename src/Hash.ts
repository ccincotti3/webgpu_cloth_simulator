import { vecDistSquared } from "./math";

/**
 * Hash table for self collisions of the Cloth object
 *
 * https://github.com/matthias-research/pages/blob/master/tenMinutePhysics/11-hashing.pdf
 * https://www.carmencincotti.com
 */
export class Hash {
  private spacing: number;
  private maxNumObjects: number;
  private tableSize: number;
  private cellCount: Int32Array;
  private particleMap: Int32Array;
  private queryIds: Int32Array;
  private querySize: number;
  firstAdjId: Int32Array;
  adjIds: Int32Array;

  constructor(spacing: number, maxNumObjects: number) {
    this.spacing = spacing;
    this.tableSize = 5 * maxNumObjects;

    // Here, cellCount means where to start looking in particleMap
    // Add +1 for guard (see in code)
    this.cellCount = new Int32Array(this.tableSize + 1);

    // Here, particleMap are the indices of the particles in entire particle list
    this.particleMap = new Int32Array(maxNumObjects); // Particle lookup array
    this.queryIds = new Int32Array(maxNumObjects);
    this.querySize = 0;

    this.maxNumObjects = maxNumObjects;

    // Keep track of where to first index into adjIds
    // so firstAdjId[id] = idx for adjIds
    this.firstAdjId = new Int32Array(maxNumObjects + 1);

    // All particle ids adjacent to a particular id packed into a dense array.
    // Use firstAdjId[id] to access.
    this.adjIds = new Int32Array(10 * maxNumObjects);
  }

  getAdjacentParticles(id: number) {
    const start = this.firstAdjId[id];
    const end = this.firstAdjId[id + 1];

    return this.adjIds.slice(start, end);
  }

  hashCoords(xi: number, yi: number, zi: number) {
    const h = (xi * 92837111) ^ (yi * 689287499) ^ (zi * 283923481); // fantasy function
    return Math.abs(h) % this.tableSize;
  }

  intCoord(coord: number) {
    return Math.floor(coord / this.spacing);
  }

  hashPos(pos: Float32Array, nr: number) {
    return this.hashCoords(
      this.intCoord(pos[3 * nr]),
      this.intCoord(pos[3 * nr + 1]),
      this.intCoord(pos[3 * nr + 2])
    );
  }

  /**
   * Create the spatial hash table data structure - based off of
   * https://github.com/matthias-research/pages/blob/master/tenMinutePhysics/11-hashing.pdf
   *
   * Theory:
   * https://www.carmencincotti.com/2022-10-31/spatial-hash-maps-part-one/
   *
   * Scroll down to Creating the Data Structure Slide
   */
  create(pos: Float32Array) {
    const numObjects = Math.min(pos.length / 3, this.particleMap.length);

    // Init arrays with 0. Our job is to fill these in.
    this.cellCount.fill(0);
    this.particleMap.fill(0);

    // Step 1: Count
    // Hash and iterate integer at index in arraycellCount
    for (let i = 0; i < numObjects; i++) {
      const h = this.hashPos(pos, i);
      this.cellCount[h]++;
    }

    // Step 2: Partial sums
    // Mutate cellCount array to contain partial sum of all elements before current index
    let start = 0;
    for (let i = 0; i < this.tableSize; i++) {
      start += this.cellCount[i];
      this.cellCount[i] = start;
    }
    this.cellCount[this.tableSize] = start; // guard by adding an additional element at the end

    // Step 3: Fill in objects ids
    // Now finally fill in the particle array, particleMap
    for (let i = 0; i < numObjects; i++) {
      const h = this.hashPos(pos, i);
      this.cellCount[h]--;
      this.particleMap[this.cellCount[h]] = i;
    }
  }

  /**
   * Query for items in hash table
   * After execution, check results in:
   *    - queryIds - particle ids found in query
   *    - querySize - number of particles found
   *
   * Theory:
   * https://www.carmencincotti.com/2022-11-07/spatial-hash-maps-part-two/
   */
  query(pos: Float32Array, nr: number, maxDist: number) {
    const x0 = this.intCoord(pos[3 * nr] - maxDist);
    const y0 = this.intCoord(pos[3 * nr + 1] - maxDist);
    const z0 = this.intCoord(pos[3 * nr + 2] - maxDist);

    const x1 = this.intCoord(pos[3 * nr] + maxDist);
    const y1 = this.intCoord(pos[3 * nr + 1] + maxDist);
    const z1 = this.intCoord(pos[3 * nr + 2] + maxDist);

    this.querySize = 0;

    for (let xi = x0; xi <= x1; xi++) {
      for (let yi = y0; yi <= y1; yi++) {
        for (let zi = z0; zi <= z1; zi++) {
          const h = this.hashCoords(xi, yi, zi);

          // Looking for a difference between two, like in slides
          const start = this.cellCount[h];
          const end = this.cellCount[h + 1];

          // If there is a difference, this cell has particles !
          // Save to queryIds
          for (let i = start; i < end; i++) {
            this.queryIds[this.querySize] = this.particleMap[i];
            this.querySize++;
          }
        }
      }
    }
  }

  /**
   * queryAll is responsible for looping through all particles, calling query() for each, and storing/updating
   * the adjacent particles lists.
   *
   * Theory:
   * https://www.carmencincotti.com/2022-11-07/spatial-hash-maps-part-two/
   */
  queryAll(pos: Float32Array, maxDist: number) {
    // Keep track of all adjacent id's by indexing into
    // this.adjIds
    let idx = 0;

    // We only need this number to compare with dist2
    // We do not use square root to save ourselves
    // from the expensive calculation.
    const maxDist2 = maxDist * maxDist;

    for (let i = 0; i < this.maxNumObjects; i++) {
      const id0 = i;
      this.firstAdjId[id0] = idx;

      // Query for all particles within maxDist from this particle
      this.query(pos, id0, maxDist);

      // If particles found in query, register them in adjIds
      for (let j = 0; j < this.querySize; j++) {
        const id1 = this.queryIds[j];

        // Skip if id1 > id0, to ensure we only execute the following code once
        // Skip if id1 == id0 since a particle can't be adjacent to itself
        if (id1 >= id0) continue;

        // Calculate distance-squared between two particles
        // We do not use square root to save ourselves
        // from the expensive calculation. We just want
        // to compare with maxDist2
        const dist2 = vecDistSquared(pos, id0, pos, id1);

        if (dist2 > maxDist2) continue;

        // Because each particle can have n adjacencies,
        // we need to make sure we are ready to grow the array at a moments notice
        // Since we're saving all adjacencies in a single dense array
        if (idx >= this.adjIds.length) {
          const newIds = new Int32Array(2 * idx); // dynamic array
          newIds.set(this.adjIds);
          this.adjIds = newIds;
        }
        this.adjIds[idx++] = id1;
      }
    }

    // Manually set the last extra space with current idx
    this.firstAdjId[this.maxNumObjects] = idx;
  }
}
