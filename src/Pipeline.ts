import defaultShader, { FRAGMENT_ENTRY_POINT, VERTEX_ENTRY_POINT } from "./shaders/defaultShader"

interface ShaderDescription {
    code: string,
    vertexEntryPoint: string,
    fragmentEntryPoint: string,
    attributes: GPUVertexAttribute[],
    arrayStride: number,
}

class RenderPipeline {
    private device: GPUDevice
    pipeline: GPURenderPipeline
    constructor(
        device: GPUDevice,
        presentationFormat: GPUTextureFormat,
        shaderDescription: ShaderDescription
    ) {
        this.device = device
        const shaderModule = this.device.createShaderModule({
            code: shaderDescription.code
        })

        const vertexBufferDescriptors: GPUVertexBufferLayout[] = [
            {
                attributes: shaderDescription.attributes,
                arrayStride: shaderDescription.arrayStride,
                stepMode: "vertex",
            },
        ];

        this.pipeline = this.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: shaderModule,
                entryPoint: shaderDescription.vertexEntryPoint,
                buffers: vertexBufferDescriptors,
            },
            fragment: {
                module: shaderModule,
                entryPoint: shaderDescription.fragmentEntryPoint,
                targets: [
                    {
                        format: presentationFormat,
                    },
                ],
            },
            primitive: {
                topology: "triangle-list",
            },
        });
    }
}

export const createDefaultPipeline = (device: GPUDevice, presentationFormat: GPUTextureFormat) => new RenderPipeline(
    device,
    presentationFormat,
    {
        arrayStride: 12,
        code: defaultShader,
        fragmentEntryPoint: FRAGMENT_ENTRY_POINT,
        vertexEntryPoint: VERTEX_ENTRY_POINT,
        attributes: [
            {
                format: "float32x3",
                offset: 0,
                shaderLocation: 0
            },
        ]
    },
)