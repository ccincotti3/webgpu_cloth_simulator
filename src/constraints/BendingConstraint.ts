import { mat4, vec4 } from "gl-matrix";
import {
  DataArray,
  vecCopy,
  vecDot,
  vecNorm,
  vecScale,
  vecSetCross,
  vecSetDiff,
} from "../math";

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
