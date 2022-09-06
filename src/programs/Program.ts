import Camera from "../PerspectiveCamera";
import { MAT4_SIZE, VEC3_SIZE } from "./constants";
import { GPUCanvas, ModelMatrix, NormalMatrix, RenderPassAPI } from "../types";

export default class Program {
  protected modelMatrixBuffer: GPUBuffer;
  protected normalMatrixBuffer: GPUBuffer;
  protected viewMatrixBuffer: GPUBuffer;
  protected projectionMatrixBuffer: GPUBuffer;
  protected cameraPositionBuffer: GPUBuffer;
  protected cameraUniformBindGroup: GPUBindGroup;
  protected modelBindGroups: GPUBindGroup[];
  protected pipeline: GPURenderPipeline;
  protected gl: GPUCanvas;
  modelBindIndex: number;
  constructor(gpuCanvas: GPUCanvas, pipeline: GPURenderPipeline) {
    this.pipeline = pipeline;
    this.gl = gpuCanvas;
    this.modelBindIndex = 0;

    this.viewMatrixBuffer = this.gl.createUniformBuffer(MAT4_SIZE);
    this.projectionMatrixBuffer = this.gl.createUniformBuffer(MAT4_SIZE);
    this.modelMatrixBuffer = this.gl.createUniformBuffer(MAT4_SIZE);
    this.normalMatrixBuffer = this.gl.createUniformBuffer(MAT4_SIZE);
    this.cameraPositionBuffer = this.gl.createUniformBuffer(VEC3_SIZE);

    this.cameraUniformBindGroup = this.gl.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.viewMatrixBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: this.projectionMatrixBuffer,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: this.cameraPositionBuffer,
          },
        },
      ],
    });

    this.modelBindGroups = [];
  }

  registerModelMatrices(numberOfModels: number): number[] {
    const offsetPerModel = 256;
    const totalOffset = offsetPerModel * (numberOfModels - 1);
    const matrixSize = 16 * Float32Array.BYTES_PER_ELEMENT;

    this.modelMatrixBuffer = this.gl.createUniformBuffer(
      matrixSize + totalOffset
    );

    this.normalMatrixBuffer = this.gl.createUniformBuffer(
      matrixSize + totalOffset
    );

    const indices = [];

    for (let i = 0; i < numberOfModels; i++) {
      const bindGroup = this.gl.createBindGroup({
        layout: this.pipeline.getBindGroupLayout(1),
        entries: [
          {
            binding: 0,
            resource: {
              buffer: this.modelMatrixBuffer,
              offset: i * offsetPerModel,
              size: matrixSize,
            },
          },
          {
            binding: 1,
            resource: {
              buffer: this.normalMatrixBuffer,
              offset: i * offsetPerModel,
              size: matrixSize,
            },
          },
        ],
      });
      this.modelBindGroups.push(bindGroup);
      indices.push(i);
    }

    return indices;
  }

  updateCameraUniforms(camera: Camera): this {
    this.gl.updateUniform(
      this.projectionMatrixBuffer,
      camera.projectionMatrix as Float32Array,
      0
    );

    this.gl.updateUniform(
      this.viewMatrixBuffer,
      camera.viewMatrix as Float32Array,
      0
    );

    this.gl.updateUniform(
      this.cameraPositionBuffer,
      camera.translation as Float32Array,
      0
    );

    return this;
  }

  updateModelUniforms(
    modelMatrix: ModelMatrix,
    normalMatrix: NormalMatrix,
    modelBindIndex: number
  ): this {
    this.modelBindIndex = modelBindIndex;

    this.gl.updateUniform(
      this.modelMatrixBuffer,
      modelMatrix as Float32Array,
      256 * modelBindIndex
    );

    this.gl.updateUniform(
      this.normalMatrixBuffer,
      normalMatrix as Float32Array,
      256 * modelBindIndex
    );

    return this;
  }
  activate(renderPassAPI: RenderPassAPI): this {
    renderPassAPI.setPipeline(this.pipeline);
    return this;
  }
  render(renderPassAPI: RenderPassAPI, ...args: any[]): Program {
    renderPassAPI.setBindGroup(0, this.cameraUniformBindGroup);
    renderPassAPI.setBindGroup(1, this.modelBindGroups[this.modelBindIndex]);
    return this;
  }
}
