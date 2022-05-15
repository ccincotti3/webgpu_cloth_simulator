/**
 * WebGPU class that maintains all WebGPU code.
 */
export default class WebGPU {
    context: GPUCanvasContext
    device: GPUDevice
    private constructor(context: GPUCanvasContext, device: GPUDevice) {
        this.context = context
        this.device = device
    }
    static async init(canvasId: string): Promise<WebGPU> {
        const maybeCanvas = document.getElementById(canvasId) as HTMLCanvasElement
        const context = maybeCanvas.getContext('webgpu');
        if (!context) {
            throw new Error(`WebGPU cannot be initialized - Element with id ${canvasId} does not support WebGPU, does your browser support it?`)
        }

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

        return new WebGPU(context, device)
    }
}