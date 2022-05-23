import ClothSimulator from "./ClothSimulator";
import Model from "./Model";
import ObjLoader from "./ObjLoader";
import Canvas from "./Canvas";
import Camera from "./Camera";
import { mat4, vec3 } from "gl-matrix";
import BufferFactory from "./BufferFactory";

const OBJECT_URL: string = "objs/bunny.obj";

(async () => {
  try {
    const objLoader = new ObjLoader();
    const [objFile, gpuCanvas] = await Promise.all([
      objLoader.load(OBJECT_URL),
      Canvas.init("canvas-container"),
    ]);

    const bufferFactory = new BufferFactory(gpuCanvas.device);

    // Load cloth simulator
    const cs = new ClothSimulator();
    // cs.addCollisionModel(bunnyModel)

    // Init Camera
    const aspectRatio = gpuCanvas.width / gpuCanvas.height;
    const perspectiveCamera = new Camera(
      (2 * Math.PI) / 5,
      aspectRatio,
      0.1,
      100
    );
    perspectiveCamera.translation = vec3.fromValues(0, 0, 3);

    // Create models
    const data = objLoader.parse(objFile);
    const model = new Model(data);
    model.scale = vec3.fromValues(10, 10, 1);
    model.translation = vec3.fromValues(0, 0, 0);

    const gpuBuffers = bufferFactory.createMeshBuffers(model.mesh);

    // Start loop
    gpuCanvas.draw((setModelViewMatrix, drawHelper) => {
      const now = Date.now() / 1000;
      perspectiveCamera.rotationXYZ = vec3.fromValues(
        0,
        (1 + Math.cos(now)) * 3.14,
        0
      );
      const modelViewProjectionMatrix = mat4.create();

      mat4.multiply(
        modelViewProjectionMatrix,
        model.modelMatrix,
        perspectiveCamera.projectionViewMatrix
      );
      setModelViewMatrix(modelViewProjectionMatrix as Float32Array);

      drawHelper.setVertexBuffer(0, gpuBuffers.vertices.data);
      drawHelper.setVertexBuffer(1, gpuBuffers.normals.data);
      drawHelper.setIndexBuffer(gpuBuffers.indices.data, "uint16");
      drawHelper.drawIndexed(gpuBuffers.indices.length);
    });
  } catch (e) {
    const errorContainerEl = document.getElementById("error-text");
    if (errorContainerEl) {
      errorContainerEl.innerHTML = e as string;
    }
    throw e;
  }
})();
