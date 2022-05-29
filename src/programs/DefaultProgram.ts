import { mat4, vec3 } from "gl-matrix";
import Model from "../Model";
import {
  Pipeline,
  RenderPassAPI,
  Camera,
  GPUCanvas,
  VertexBuffers,
} from "../types";
import Program from "./Program";
import defaultShaderData from "./shaders/defaultShader";

export default class DefaultProgram extends Program {
  private modelViewProjectionMatrixBuffer: GPUBuffer;
  private uniformBindGroup: GPUBindGroup;
  private constructor(
    gpuCanvas: GPUCanvas,
    pipeline: Pipeline,
    vertexBuffers: VertexBuffers
  ) {
    super(gpuCanvas, pipeline, vertexBuffers);
    this.modelViewProjectionMatrixBuffer = this.gl.createUniformBuffer(
      16 * Float32Array.BYTES_PER_ELEMENT
    );

    this.uniformBindGroup = this.gl.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.modelViewProjectionMatrixBuffer,
          },
        },
      ],
    });
  }

  static init(gpuCanvas: GPUCanvas, vertexBuffers: VertexBuffers) {
    const shader = gpuCanvas.createShader(defaultShaderData);
    const pipeline = gpuCanvas.createRenderPipeline(shader);
    return new DefaultProgram(gpuCanvas, pipeline, vertexBuffers);
  }

  preRender(
    perspectiveCamera: Camera,
    model: Model
  ): Program {
    const now = Date.now() / 1000;
    perspectiveCamera.rotationXYZ = vec3.fromValues(
      0,
      (1 + Math.cos(now)) * 3.14,
      0
    );
    const modelViewProjectionMatrix = mat4.create();

    mat4.multiply(
      modelViewProjectionMatrix,
      model.modelMatrix,
      perspectiveCamera.projectionViewMatrix
    );

    this.gl.updateUniform(
      this.modelViewProjectionMatrixBuffer,
      modelViewProjectionMatrix as Float32Array
    );

    return this;
  }

  render(renderPassAPI: RenderPassAPI, vertexData: VertexBuffers): void {
    super.render(renderPassAPI);
    renderPassAPI.setBindGroup(0, this.uniformBindGroup);
    renderPassAPI.setVertexBuffer(0, vertexData.vertices.data);
    renderPassAPI.setVertexBuffer(1, vertexData.normals.data);
    renderPassAPI.setIndexBuffer(vertexData.indices.data, "uint16");
    renderPassAPI.drawIndexed(vertexData.indices.length);
  }
}
