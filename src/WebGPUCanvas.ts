import GPUBufferFactory from "./GPUBufferFactory";
import { VertexBuffers, RawShaderData, Shader, Mesh } from "./types";

type PresentationSize = [number, number];

/**
 * A WebGPU Canvas class that provides helpers to the underlying WebGPU API.
 */
export default class WebGPUCanvas {
  private context: GPUCanvasContext;
  private bufferFactory: GPUBufferFactory;
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
    this.bufferFactory = new GPUBufferFactory(this.device);
  }
  static async init(canvasId: string): Promise<WebGPUCanvas> {
    if (!navigator.gpu) {
      throw new Error("WebGPU cannot be initialized - navigator.gpu not found");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("WebGPU cannot be initialized - Adapter not found");
    }

    const device = await adapter.requestDevice();

    device.lost.then((e) => {
      throw new Error(
        `WebGPU cannot be initialized - Device has been lost - ${e.message}`
      );
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

    return new WebGPUCanvas(
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

  createMeshBuffers(mesh: Mesh): VertexBuffers {
    return this.bufferFactory.createMeshBuffers(mesh);
  }

  updateUniform(buffer: GPUBuffer, data: Float32Array, offset: number) {
    this.device.queue.writeBuffer(
      buffer,
      offset,
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
          clearValue: { r: 0.5294, g: 0.8039, b: 0.9725, a: 1.0 },
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

    // ~~ Define render loop ~~
    const frame = () => {
      renderPassDescriptor.colorAttachments[0].view = this.context
        .getCurrentTexture()
        .createView();
      renderPassDescriptor.depthStencilAttachment.view =
        depthTexture.createView();
      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      drawCb(passEncoder);
      passEncoder.end();
      this.device.queue.submit([commandEncoder.finish()]);
      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  }
}
