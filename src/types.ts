import { mat4, vec3, vec4 } from "gl-matrix";

import type Camera from "./Camera";
import type GPUCanvas from "./Canvas";

export { Camera, GPUCanvas };

type Length = number;

export interface Mesh {
  position: Float32Array;
  uvs: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
}

export interface MeshGPUBuffer {
  data: GPUBuffer;
  length: Length;
}

export interface VertexBuffers {
  position: MeshGPUBuffer;
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
export type NormalMatrix = mat4;
export type ViewMatrix = mat4;
export type ProjectionMatrix = mat4;
export type LightModelPosition = vec3;

export interface RawShaderData {
  code: string;
  primitive: GPUPrimitiveState;
  vertex: Omit<GPUVertexState, "module">;
  fragment: Omit<GPUFragmentState, "module" | "targets">;
}

export interface Shader {
  vertex: GPUVertexState;
  fragment: GPUFragmentState;
}

export type RenderPassAPI = GPURenderPassEncoder;
export type Pipeline = GPURenderPipeline;
