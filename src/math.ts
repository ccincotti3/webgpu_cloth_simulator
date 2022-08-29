// ----- math on vector arrays -------------------------------------------------------------

export type DataArray = Float32Array | Int32Array | number[];

export function vecSetZero(a: DataArray | Array<number>, anr: number) {
  anr *= 3;
  a[anr++] = 0.0;
  a[anr++] = 0.0;
  a[anr] = 0.0;
}

export function vecScale(a: DataArray, anr: number, scale = 1.0) {
  anr *= 3;
  a[anr++] *= scale;
  a[anr++] *= scale;
  a[anr] *= scale;
}

export function vecCopy(a: DataArray, anr: number, b: DataArray, bnr: number) {
  anr *= 3;
  bnr *= 3;
  a[anr++] = b[bnr++];
  a[anr++] = b[bnr++];
  a[anr] = b[bnr];
}

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

export function vecSetDiff(
  dst: DataArray | Float32Array,
  dnr: number,
  a: Float32Array,
  anr: number,
  b: Float32Array,
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

export function vecLengthSquared(a: DataArray, anr: number): number {
  anr *= 3;
  let a0 = a[anr],
    a1 = a[anr + 1],
    a2 = a[anr + 2];
  return a0 * a0 + a1 * a1 + a2 * a2;
}

export function vecDistSquared(
  a: Float32Array,
  anr: number,
  b: Float32Array,
  bnr: number
) {
  anr *= 3;
  bnr *= 3;
  let a0 = a[anr] - b[bnr],
    a1 = a[anr + 1] - b[bnr + 1],
    a2 = a[anr + 2] - b[bnr + 2];
  return a0 * a0 + a1 * a1 + a2 * a2;
}

export function vecDot(a: DataArray, anr: number, b: DataArray, bnr: number) {
  anr *= 3;
  bnr *= 3;
  return a[anr] * b[bnr] + a[anr + 1] * b[bnr + 1] + a[anr + 2] * b[bnr + 2];
}

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

export const vecNorm = (a: DataArray) => {
  return Math.sqrt(a.reduce((prev, curr) => prev + curr ** 2, 0));
};

export function vecScalarWiseMultiply(a, anr, b, bnr) {
  anr *= 3;
  bnr *= 3;
  const out = [];
  out[0] = a[anr++] * b[bnr++];
  out[1] = a[anr++] * b[bnr++];
  out[2] = a[anr] * b[bnr];

  return out;
}
