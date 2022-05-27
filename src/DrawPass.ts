import { MeshGPUBuffers, UniformGPUBindGroup } from "./types";

export class DrawPass {
  vertexBuffers: MeshGPUBuffers[];
  uniforms: UniformGPUBindGroup[];
  constructor() {
    this.vertexBuffers = [];
    this.uniforms = [];
  }

  registerModel(gpuBuffers: MeshGPUBuffers) {
    this.vertexBuffers.push(gpuBuffers);
  }

  registerUniformBindGroup(uniformBindGroup: UniformGPUBindGroup) {
    this.uniforms.push(uniformBindGroup);
  }

  draw(pipeline: GPURenderPipeline, drawer: GPURenderPassEncoder) {
    drawer.setPipeline(pipeline);

    for (const uniformBindGroup of this.uniforms) {
      drawer.setBindGroup(uniformBindGroup.binding, uniformBindGroup.bindGroup);
    }

    for (const buffers of this.vertexBuffers) {
      drawer.setVertexBuffer(0, buffers.vertices.data);
      drawer.setVertexBuffer(1, buffers.normals.data);
      drawer.setIndexBuffer(buffers.indices.data, "uint16");
      drawer.drawIndexed(buffers.indices.length);
    }
  }
}
