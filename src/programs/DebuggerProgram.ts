import { Pipeline, RenderPassAPI, GPUCanvas, VertexBuffers } from "../types";
import Program from "./Program";
import debuggerShaderData from "./shaders/debuggerShader";

export default class DebuggerProgram extends Program {
  private constructor(gpuCanvas: GPUCanvas, pipeline: Pipeline) {
    super(gpuCanvas, pipeline);
  }

  static init(gpuCanvas: GPUCanvas) {
    const shader = gpuCanvas.createShader(debuggerShaderData);
    const pipeline = gpuCanvas.createRenderPipeline(shader);
    return new DebuggerProgram(gpuCanvas, pipeline);
  }

  render(renderPassAPI: RenderPassAPI, vertexData: VertexBuffers): Program {
    super.render(renderPassAPI);
    renderPassAPI.setVertexBuffer(0, vertexData.position.data);
    renderPassAPI.draw(3);

    return this;
  }
}
