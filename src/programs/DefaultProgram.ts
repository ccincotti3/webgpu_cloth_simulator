import { VEC3_SIZE } from "./constants";
import {
  Pipeline,
  RenderPassAPI,
  GPUCanvas,
  VertexBuffers,
  LightModelPosition,
} from "../types";
import Program from "./Program";
import defaultShaderData from "./shaders/defaultShader";

export default class DefaultProgram extends Program {
  private lightModelBuffer: GPUBuffer;
  private lightModelBindGroup: GPUBindGroup;
  private constructor(gpuCanvas: GPUCanvas, pipeline: Pipeline) {
    super(gpuCanvas, pipeline);
    this.lightModelBuffer = this.gl.createUniformBuffer(VEC3_SIZE);
    this.lightModelBindGroup = this.gl.createBindGroup({
      layout: pipeline.getBindGroupLayout(2),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.lightModelBuffer,
          },
        },
      ],
    });
  }

  static init(gpuCanvas: GPUCanvas) {
    const shader = gpuCanvas.createShader(defaultShaderData);
    const pipeline = gpuCanvas.createRenderPipeline(shader);
    return new DefaultProgram(gpuCanvas, pipeline);
  }

  updateLightModelPositionUniform(
    lightModelPosition: LightModelPosition
  ): DefaultProgram {
    this.gl.updateUniform(
      this.lightModelBuffer,
      lightModelPosition as Float32Array,
      0
    );
    return this;
  }

  render(
    renderPassAPI: RenderPassAPI,
    vertexData: VertexBuffers
  ): DefaultProgram {
    super.render(renderPassAPI);
    renderPassAPI.setBindGroup(2, this.lightModelBindGroup);
    renderPassAPI.setVertexBuffer(0, vertexData.position.data);
    renderPassAPI.setVertexBuffer(1, vertexData.normals.data);
    renderPassAPI.setIndexBuffer(vertexData.indices.data, "uint16");
    renderPassAPI.drawIndexed(vertexData.indices.length);
    return this;
  }
}
