import { RenderPassAPI, GPUCanvas, VertexBuffers } from "../types";

export default class Program {
  protected pipeline: GPURenderPipeline;
  protected vertexBuffers: VertexBuffers;
  protected gl: GPUCanvas
  constructor(
    gpuCanvas: GPUCanvas,
    pipeline: GPURenderPipeline,
    vertexBuffers: VertexBuffers
  ) {
    this.pipeline = pipeline;
    this.vertexBuffers = vertexBuffers;
    this.gl = gpuCanvas
  }

  preRender(...args: any[]): Program {
    return this;
  }
  render(renderPassAPI: RenderPassAPI, ...args: any[]): void {
    renderPassAPI.setPipeline(this.pipeline);
  }
}
