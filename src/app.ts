import ClothSimulator from "./ClothSimulator";
import Model from "./Model";
import ObjLoader from "./ObjLoader";
import Canvas from "./Canvas";
import Camera from "./Camera";
import { mat4, vec3 } from "gl-matrix";
import { createDefaultPipeline } from "./Pipeline";

const OBJECT_URL: string = "objs/bunny.obj";

(async () => {
  try {
    const objLoader = new ObjLoader();
    const [objFile, gpuCanvas] = await Promise.all([
      objLoader.load(OBJECT_URL),
      Canvas.init("canvas-container"),
    ]);

    const renderPipeline = createDefaultPipeline(
      gpuCanvas.device,
      gpuCanvas.presentationFormat
    );

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

    renderPipeline.registerModel(model);
    renderPipeline.registerUniformBuffer(
      16 * Float32Array.BYTES_PER_ELEMENT,
      0
    );

    // Start loop
    gpuCanvas.draw((drawHelper) => {
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
      renderPipeline.updateUniform(
        renderPipeline.uniforms[0].buffer,
        modelViewProjectionMatrix as Float32Array
      );
      renderPipeline.draw(drawHelper);
    });
  } catch (e) {
    const errorContainerEl = document.getElementById("error-text");
    if (errorContainerEl) {
      errorContainerEl.innerHTML = e as string;
    }
    throw e;
  }
})();
