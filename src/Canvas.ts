import BufferFactory from "./BufferFactory";
import Model from "./Model";
import { MeshGPUBuffers, RawShaderData, Shader } from "./types";

type PresentationSize = [number, number];

/**
 * Canvas class that maintains all WebGPU code.
 */
export default class GPUCanvas {
  private context: GPUCanvasContext;
  private bufferFactory: BufferFactory;
  readonly device: GPUDevice;
  presentationFormat: GPUTextureFormat;
  width: number;
  height: number;
  private constructor(
    context: GPUCanvasContext,
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    width: number,
    height: number
  ) {
    this.context = context;
    this.device = device;
    this.presentationFormat = presentationFormat;
    this.width = width;
    this.height = height;
    this.bufferFactory = new BufferFactory(this.device);
  }
  static async init(canvasId: string): Promise<GPUCanvas> {
    if (!navigator.gpu) {
      throw new Error("WebGPU cannot be initialized - navigator.gpu not found");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("WebGPU cannot be initialized - Adapter not found");
    }

    const device = await adapter.requestDevice();

    device.lost.then(() => {
      throw new Error("WebGPU cannot be initialized - Device has been lost");
    });

    const canvas = document.getElementById(canvasId);
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error(
        `WebGPU cannot be initialized - Element with id ${canvasId} is not a Canvas Element`
      );
    }
    const context = canvas.getContext("webgpu");
    if (!context) {
      throw new Error(
        `WebGPU cannot be initialized - Element with id ${canvasId} does not support WebGPU, does your browser support it?`
      );
    }

    const devicePixelRatio = window.devicePixelRatio || 1;

    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;

    // ~~ CONFIGURE THE SWAP CHAIN ~~
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
      device,
      format: presentationFormat,
    });

    return new GPUCanvas(
      context,
      device,
      presentationFormat,
      canvas.width,
      canvas.height
    );
  }

  get presentationSize(): PresentationSize {
    return [this.width, this.height];
  }

  get aspectRatio(): number {
    return this.width / this.height;
  }

  createRenderPipeline(shader: Shader) {
    return this.device.createRenderPipeline({
      layout: "auto",
      primitive: {
        topology: "triangle-list",
        cullMode: "back",
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth24plus",
      },
      ...shader,
    });
  }

  createUniformBuffer(size: number): GPUBuffer {
    return this.bufferFactory.createUniformBuffer(size);
  }

  createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup {
    return this.device.createBindGroup(descriptor);
  }

  createModelBuffers(model: Model): MeshGPUBuffers {
    return this.bufferFactory.createMeshBuffers(model.mesh);
  }

  updateUniform(buffer: GPUBuffer, data: Float32Array) {
    this.device.queue.writeBuffer(
      buffer,
      0,
      data.buffer,
      data.byteOffset,
      data.byteLength
    );
  }

  createShader(rawShaderData: RawShaderData): Shader {
    const shaderModule = this.device.createShaderModule({
      code: rawShaderData.code,
    });
    return {
      vertex: {
        module: shaderModule,
        ...rawShaderData.vertex,
      },
      fragment: {
        module: shaderModule,
        targets: [
          {
            format: this.presentationFormat,
          },
        ],
        ...rawShaderData.fragment,
      },
    };
  }

  draw(drawCb: (drawHelper: GPURenderPassEncoder) => void) {
    // ~~ Define render loop ~~
    const frame = () => {
      const commandEncoder = this.device.createCommandEncoder();

      const depthTexture = this.device.createTexture({
        size: this.presentationSize,
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });

      // ~~ CREATE RENDER PASS DESCRIPTOR ~~
      const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
          {
            view: this.context.getCurrentTexture().createView(),
            clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
        depthStencilAttachment: {
          view: depthTexture.createView(),

          depthClearValue: 1.0,
          depthLoadOp: "clear",
          depthStoreOp: "store",
        },
      };

      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      drawCb(passEncoder);
      passEncoder.end();

      this.device.queue.submit([commandEncoder.finish()]);
      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  }
}
