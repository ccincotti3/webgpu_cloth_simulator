import { mat4 } from "gl-matrix";

export interface Mesh {
  vertices: Float32Array;
  uvs: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
}

export type TransformationMatrix = mat4;
export type ModelMatrix = mat4;
export type ViewMatrix = mat4;
export type ProjectionMatrix = mat4;
