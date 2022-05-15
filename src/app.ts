import WebGPU from "./webgpu"

export default class ClothSimulator {
    wgpu: WebGPU
    constructor(wgpu: WebGPU) {
        this.wgpu = wgpu
    }
    static async init(canvasId: string) {
       const wgpu = await WebGPU.init(canvasId)
       return new ClothSimulator(wgpu)
    }
    update(){}
    draw(){}
}

