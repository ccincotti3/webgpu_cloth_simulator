import { Mesh, MeshGPUBuffer, MeshGPUBuffers } from "./types";

export default class BufferFactory {
  private device: GPUDevice;
  constructor(device: GPUDevice) {
    this.device = device;
  }

  create(
    arr: Uint16Array | Float32Array | Int32Array,
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
      case arr instanceof Int32Array: {
        const writeArray = new Int32Array(buffer.getMappedRange());
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

  createMeshBuffers(mesh: Mesh): MeshGPUBuffers {
    const { indices, vertices, normals, uvs } = mesh;

    const vertexBuffer = this.create(vertices, GPUBufferUsage.VERTEX);
    const indexBuffer = this.create(indices, GPUBufferUsage.INDEX);

    const normalBuffer = this.create(normals, GPUBufferUsage.VERTEX);

    const uvBuffer = this.create(uvs, GPUBufferUsage.VERTEX);

    return {
      indices: indexBuffer,
      normals: normalBuffer,
      vertices: vertexBuffer,
      uvs: uvBuffer,
    };
  }
}
