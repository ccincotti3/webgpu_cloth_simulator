import { mat4 } from "gl-matrix";
import { createDefaultPipeline } from "./Pipeline";
import { TransformationMatrix } from "./types";

type PresentationSize = [number, number];

/**
 * Canvas class that maintains all WebGPU code.
 */
export default class GPUCanvas {
  private context: GPUCanvasContext;
  private presentationSize: PresentationSize;
  readonly device: GPUDevice;
  presentationFormat: GPUTextureFormat;
  width: number;
  height: number;
  private constructor(
    context: GPUCanvasContext,
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    presentationSize: PresentationSize,
    width: number,
    height: number
  ) {
    this.context = context;
    this.device = device;
    this.presentationFormat = presentationFormat;
    this.presentationSize = presentationSize;
    this.width = width;
    this.height = height;
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

    // ~~ CONFIGURE THE SWAP CHAIN ~~
    const devicePixelRatio = window.devicePixelRatio || 1;
    const presentationSize: PresentationSize = [
      canvas.clientWidth * devicePixelRatio,
      canvas.clientHeight * devicePixelRatio,
    ];
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
      device,
      format: presentationFormat,
      size: presentationSize,
    });

    return new GPUCanvas(
      context,
      device,
      presentationFormat,
      presentationSize,
      canvas.width,
      canvas.height
    );
  }

  draw(
    drawCb: (
      drawFunctions: GPURenderPassEncoder
    ) => void /*vertices: Float32Array*/
  ) {
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
