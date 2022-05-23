import defaultShader, {
  FRAGMENT_ENTRY_POINT,
  VERTEX_ENTRY_POINT,
} from "./shaders/defaultShader";

interface ShaderDescription {
  code: string;
  fragmentEntryPoint: string;
  vertexEntryPoint: string;
  bufferLayout: GPUVertexBufferLayout[];
}

class RenderPipeline {
  private device: GPUDevice;
  pipeline: GPURenderPipeline;
  constructor(
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    shaderDescription: ShaderDescription
  ) {
    this.device = device;
    const shaderModule = this.device.createShaderModule({
      code: shaderDescription.code,
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: shaderModule,
        entryPoint: shaderDescription.vertexEntryPoint,
        buffers: shaderDescription.bufferLayout,
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
        cullMode: "back",
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth24plus",
      },
    });
  }
}

export const createDefaultPipeline = (
  device: GPUDevice,
  presentationFormat: GPUTextureFormat
) =>
  new RenderPipeline(device, presentationFormat, {
    code: defaultShader,
    fragmentEntryPoint: FRAGMENT_ENTRY_POINT,
    vertexEntryPoint: VERTEX_ENTRY_POINT,
    bufferLayout: [
      {
        arrayStride: Float32Array.BYTES_PER_ELEMENT * 3,
        attributes: [
          {
            format: "float32x3",
            offset: 0,
            shaderLocation: 0,
          },
        ],
        stepMode: "vertex",
      },
      {
        arrayStride: Float32Array.BYTES_PER_ELEMENT * 3,
        attributes: [
          {
            format: "float32x3",
            offset: 0,
            shaderLocation: 1,
          },
        ],
        stepMode: "vertex",
      },
    ],
  });
