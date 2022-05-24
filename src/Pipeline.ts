import BufferFactory from "./BufferFactory";
import Model from "./Model";
import defaultShader, {
  FRAGMENT_ENTRY_POINT,
  VERTEX_ENTRY_POINT,
} from "./shaders/defaultShader";
import { MeshGPUBuffers, UniformGPUBindGroup } from "./types";

interface UniformLayout {
  size: number; // Integer
  bindingLocation: number;
}

interface ShaderDescription {
  code: string;
  fragmentEntryPoint: string;
  vertexEntryPoint: string;
  vertexBufferLayout: GPUVertexBufferLayout[];
}

class RenderPipeline {
  private device: GPUDevice;
  private bufferFactory: BufferFactory;
  pipeline: GPURenderPipeline;
  buffersToRender: MeshGPUBuffers[];
  uniforms: UniformGPUBindGroup[];
  constructor(
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    shaderDescription: ShaderDescription
  ) {
    this.device = device;
    this.buffersToRender = [];
    this.uniforms = [];
    this.bufferFactory = new BufferFactory(this.device);

    const shaderModule = this.device.createShaderModule({
      code: shaderDescription.code,
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: shaderModule,
        entryPoint: shaderDescription.vertexEntryPoint,
        buffers: shaderDescription.vertexBufferLayout,
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

  registerModel(model: Model) {
    const gpuBuffers = this.bufferFactory.createMeshBuffers(model.mesh);
    this.buffersToRender.push(gpuBuffers);
  }

  registerUniformBuffer(size: number, binding: number) {
    const uniformBuffer = this.bufferFactory.createUniformBuffer(size);

    const uniformBindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding,
          resource: {
            buffer: uniformBuffer,
          },
        },
      ],
    });

    this.uniforms.push({
      bindGroup: uniformBindGroup,
      binding,
      buffer: uniformBuffer,
    });
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

  draw(drawHelper: GPURenderPassEncoder) {
    drawHelper.setPipeline(this.pipeline);

    for (const uniformBindGroup of this.uniforms) {
      drawHelper.setBindGroup(
        uniformBindGroup.binding,
        uniformBindGroup.bindGroup
      );
    }

    for (const buffers of this.buffersToRender) {
      drawHelper.setVertexBuffer(0, buffers.vertices.data);
      drawHelper.setVertexBuffer(1, buffers.normals.data);
      drawHelper.setIndexBuffer(buffers.indices.data, "uint16");
      drawHelper.drawIndexed(buffers.indices.length);
    }
  }
}

export const createDefaultPipeline = (
  device: GPUDevice,
  presentationFormat: GPUTextureFormat
) => {
  const stepMode = "vertex";
  return new RenderPipeline(device, presentationFormat, {
    code: defaultShader,
    fragmentEntryPoint: FRAGMENT_ENTRY_POINT,
    vertexEntryPoint: VERTEX_ENTRY_POINT,
    vertexBufferLayout: [
      {
        arrayStride: Float32Array.BYTES_PER_ELEMENT * 3,
        attributes: [
          {
            format: "float32x3",
            offset: 0,
            shaderLocation: 0,
          },
        ],
        stepMode,
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
        stepMode,
      },
    ],
  });
};
