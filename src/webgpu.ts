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
        const canvas = document.getElementById(canvasId)
        if(!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new Error(`WebGPU cannot be initialized - Element with id ${canvasId} is not a Canvas Element`)
        }
        const context = canvas.getContext('webgpu');
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

        // ~~ CONFIGURE THE SWAP CHAIN ~~
        const devicePixelRatio = window.devicePixelRatio || 1;
        const presentationSize = [
          canvas.clientWidth * devicePixelRatio,
          canvas.clientHeight * devicePixelRatio,
        ];
        const presentationFormat = context.getPreferredFormat(adapter);

        context.configure({
          device,
          format: presentationFormat,
          size: presentationSize,
        });

        return new WebGPU(context, device)
    }

    registerShader() {

    }
}