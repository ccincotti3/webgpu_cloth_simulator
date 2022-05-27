import { mat4 } from "gl-matrix";

type Length = number;

export interface Mesh {
  vertices: Float32Array;
  uvs: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
}

export interface MeshGPUBuffer {
  data: GPUBuffer;
  length: Length;
}

export interface MeshGPUBuffers {
  vertices: MeshGPUBuffer;
  uvs: MeshGPUBuffer;
  normals: MeshGPUBuffer;
  indices: MeshGPUBuffer;
}

export interface UniformGPUBindGroup {
  bindGroup: GPUBindGroup;
  binding: number;
}

export type TransformationMatrix = mat4;
export type ModelMatrix = mat4;
export type ViewMatrix = mat4;
export type ProjectionMatrix = mat4;

export interface RawShaderData {
  code: string;
  vertex: Omit<GPUVertexState, "module">;
  fragment: Omit<GPUFragmentState, "module" | "targets">;
}

export interface Shader {
  vertex: GPUVertexState;
  fragment: GPUFragmentState;
}
