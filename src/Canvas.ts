import { mat4 } from "gl-matrix";
import { createDefaultPipeline } from "./Pipeline";
import { TransformationMatrix } from "./types";

/**
 * Canvas class that maintains all WebGPU code.
 */
export default class GPUCanvas {
    private context: GPUCanvasContext
    private presentationFormat: GPUTextureFormat
    readonly device: GPUDevice
    width: number;
    height: number;
    private constructor(context: GPUCanvasContext, device: GPUDevice, presentationFormat: GPUTextureFormat, width: number, height: number) {
        this.context = context
        this.device = device
        this.presentationFormat = presentationFormat
        this.width = width
        this.height = height
    }
    static async init(canvasId: string): Promise<GPUCanvas> {
        if (!navigator.gpu) {
            throw new Error("WebGPU cannot be initialized - navigator.gpu not found")
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("WebGPU cannot be initialized - Adapter not found")
        }

        const device = await adapter.requestDevice();

        device.lost.then(() => {
            throw new Error("WebGPU cannot be initialized - Device has been lost")
        });

        const canvas = document.getElementById(canvasId)
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new Error(`WebGPU cannot be initialized - Element with id ${canvasId} is not a Canvas Element`)
        }
        const context = canvas.getContext('webgpu');
        if (!context) {
            throw new Error(`WebGPU cannot be initialized - Element with id ${canvasId} does not support WebGPU, does your browser support it?`)
        }

        // ~~ CONFIGURE THE SWAP CHAIN ~~
        const devicePixelRatio = window.devicePixelRatio || 1;
        const presentationSize = [
            canvas.clientWidth * devicePixelRatio,
            canvas.clientHeight * devicePixelRatio,
        ];
        const presentationFormat = navigator.gpu.getPreferredCanvasFormat()

        context.configure({
            device,
            format: presentationFormat,
            size: presentationSize,
        });

        return new GPUCanvas(context, device, presentationFormat, canvas.width, canvas.height)
    }

    draw(drawCb: (setCameraMatrixFn: (mat: Float32Array) => void, drawFunctions: GPURenderPassEncoder) => void/*vertices: Float32Array*/) {
        const renderPipeline = createDefaultPipeline(this.device, this.presentationFormat)

        // ~~ CREATE UNIFORMS FOR TRANSFORMATION MATRIX ~~
        const uniformBufferSize = 4 * 16; // 4x4 matrix
        const uniformBuffer = this.device.createBuffer({
            size: uniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const uniformBindGroup = this.device.createBindGroup({
            layout: renderPipeline.pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: uniformBuffer,
                    },
                },
            ],
        });
        const setCameraMatrix = (mat: Float32Array) => {
            this.device.queue.writeBuffer(
                uniformBuffer,
                0,
                mat.buffer,
                mat.byteOffset,
                mat.byteLength
            );
        }

        // set reasonable default

        setCameraMatrix(mat4.create() as Float32Array)

        // ~~ Define render loop ~~
        const frame = () => {
            const commandEncoder = this.device.createCommandEncoder();

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
            };

            const passEncoder =
                commandEncoder.beginRenderPass(renderPassDescriptor);

            passEncoder.setPipeline(renderPipeline.pipeline);
            passEncoder.setBindGroup(0, uniformBindGroup)

            drawCb(
                setCameraMatrix,
                passEncoder
            )

            passEncoder.end();

            this.device.queue.submit([commandEncoder.finish()]);
            requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    }
}