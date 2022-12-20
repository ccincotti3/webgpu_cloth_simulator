/**
 * Math utility classes for DataArrays
 */

export type DataArray = Float32Array | Int32Array | number[];

/**
 * Zero out 3-element vector within a DataArray
 */
export function vecSetZero(a: DataArray | Array<number>, anr: number) {
  anr *= 3;
  a[anr++] = 0.0;
  a[anr++] = 0.0;
  a[anr] = 0.0;
}

/**
 * Scale a 3-element vector within a DataArray
 */
export function vecScale(a: DataArray, anr: number, scale = 1.0) {
  anr *= 3;
  a[anr++] *= scale;
  a[anr++] *= scale;
  a[anr] *= scale;
}

/**
 * Copy a 3-element vector within a DataArray
 */
export function vecCopy(a: DataArray, anr: number, b: DataArray, bnr: number) {
  anr *= 3;
  bnr *= 3;
  a[anr++] = b[bnr++];
  a[anr++] = b[bnr++];
  a[anr] = b[bnr];
}

/**
 * Add two 3-element vectors and mutate the first vector argument
 */
export function vecAdd(
  a: DataArray,
  anr: number,
  b: DataArray,
  bnr: number,
  scale = 1.0
) {
  anr *= 3;
  bnr *= 3;
  a[anr++] += b[bnr++] * scale;
  a[anr++] += b[bnr++] * scale;
  a[anr] += b[bnr] * scale;
}

/**
 * Subtract two 3-element vectors
 */
export function vecSetDiff(
  dst: DataArray,
  dnr: number,
  a: DataArray,
  anr: number,
  b: DataArray,
  bnr: number,
  scale = 1.0
) {
  dnr *= 3;
  anr *= 3;
  bnr *= 3;
  dst[dnr++] = (a[anr++] - b[bnr++]) * scale;
  dst[dnr++] = (a[anr++] - b[bnr++]) * scale;
  dst[dnr] = (a[anr] - b[bnr]) * scale;
}

/**
 * Find the length of a 3-element vector within a DataArray
 */
export function vecLengthSquared(a: DataArray, anr: number): number {
  anr *= 3;
  let a0 = a[anr],
    a1 = a[anr + 1],
    a2 = a[anr + 2];
  return a0 * a0 + a1 * a1 + a2 * a2;
}

/**
 * Find the distance between two 3-element vectors within a DataArray
 * https://en.wikipedia.org/wiki/Euclidean_distance
 */
export function vecDistSquared(
  a: DataArray,
  anr: number,
  b: DataArray,
  bnr: number
) {
  anr *= 3;
  bnr *= 3;
  let a0 = a[anr] - b[bnr],
    a1 = a[anr + 1] - b[bnr + 1],
    a2 = a[anr + 2] - b[bnr + 2];
  return a0 * a0 + a1 * a1 + a2 * a2;
}

/**
 * Find the dot product of two 3-element vectors
 */
export function vecDot(a: DataArray, anr: number, b: DataArray, bnr: number) {
  anr *= 3;
  bnr *= 3;
  return a[anr] * b[bnr] + a[anr + 1] * b[bnr + 1] + a[anr + 2] * b[bnr + 2];
}

/**
 * Find the cross product of two 3-element vectors
 */
export function vecSetCross(
  a: DataArray,
  anr: number,
  b: DataArray,
  bnr: number,
  c: DataArray,
  cnr: number
) {
  anr *= 3;
  bnr *= 3;
  cnr *= 3;
  a[anr++] = b[bnr + 1] * c[cnr + 2] - b[bnr + 2] * c[cnr + 1];
  a[anr++] = b[bnr + 2] * c[cnr + 0] - b[bnr + 0] * c[cnr + 2];
  a[anr] = b[bnr + 0] * c[cnr + 1] - b[bnr + 1] * c[cnr + 0];
}

/**
 * Find the L2 norm of two vectors
 */
export const vecNorm = (a: DataArray): number => {
  return Math.sqrt(
    (a as any[]).reduce((prev: number, curr: number) => prev + curr ** 2, 0)
  );
};

/**
 * Multiply a 4d column vector by its transpose
 */
export function multiply4dColumnVectorByTranspose(a: DataArray): number[][] {
  const out: number[][] = [[], [], [], []];

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      out[i][j] = a[i] * a[j];
    }
  }

  return out;
}

export function vecSetSum(
  dst: DataArray,
  dnr: number,
  a: DataArray,
  anr: number,
  b: DataArray,
  bnr: number,
  scale = 1.0
) {
  dnr *= 3;
  anr *= 3;
  bnr *= 3;
  dst[dnr++] = (a[anr++] + b[bnr++]) * scale;
  dst[dnr++] = (a[anr++] + b[bnr++]) * scale;
  dst[dnr] = (a[anr] + b[bnr]) * scale;
}
