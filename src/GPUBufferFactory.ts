import { Mesh, MeshGPUBuffer, VertexBuffers } from "./types";

/**
 * Utility class to create GPU buffers
 */
export default class GPUBufferFactory {
  private device: GPUDevice;
  constructor(device: GPUDevice) {
    this.device = device;
  }

  createMeshBuffer(
    arr: Uint16Array | Float32Array,
    usage: GPUBufferUsageFlags
  ): MeshGPUBuffer {
    const buffer = this.device.createBuffer({
      size: arr.byteLength,
      usage: usage | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    switch (true) {
      case arr instanceof Uint16Array: {
        const writeArray = new Uint16Array(buffer.getMappedRange());
        writeArray.set(arr);
        break;
      }
      case arr instanceof Float32Array: {
        const writeArray = new Float32Array(buffer.getMappedRange());
        writeArray.set(arr);
        break;
      }
    }

    buffer.unmap();
    return {
      data: buffer,
      length: arr.length,
    };
  }

  createMeshBuffers(mesh: Mesh): VertexBuffers {
    const { indices, positions, normals, uvs } = mesh;

    const positionBuffer = this.createMeshBuffer(
      positions,
      GPUBufferUsage.VERTEX
    );
    const indexBuffer = this.createMeshBuffer(indices, GPUBufferUsage.INDEX);
    const normalBuffer = this.createMeshBuffer(normals, GPUBufferUsage.VERTEX);
    const uvBuffer = this.createMeshBuffer(uvs, GPUBufferUsage.VERTEX);

    return {
      indices: indexBuffer,
      normals: normalBuffer,
      position: positionBuffer,
      uvs: uvBuffer,
    };
  }

  createUniformBuffer(size: number) {
    return this.device.createBuffer({
      size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }
}
