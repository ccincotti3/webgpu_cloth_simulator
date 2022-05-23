type GPUBufferLength = number;

export default class BufferFactory {
  private device: GPUDevice;
  constructor(device: GPUDevice) {
    this.device = device;
  }

  create(
    arr: Uint16Array | Float32Array | Int32Array,
    usage: GPUBufferUsageFlags
  ): [GPUBuffer, GPUBufferLength] {
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
    return [buffer, arr.length];
  }
}
