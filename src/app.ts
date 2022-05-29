import Model from "./Model";
import ObjLoader from "./ObjLoader";
import Canvas from "./Canvas";
import Camera from "./Camera";
import { vec3 } from "gl-matrix";
import defaultShader from "./programs/shaders/defaultShader";
import DefaultProgram from "./programs/DefaultProgram";

const OBJECT_URL: string = "objs/bunny.obj";

(async () => {
  try {
    const objLoader = new ObjLoader();
    const [objFile, gpuCanvas] = await Promise.all([
      objLoader.load(OBJECT_URL),
      Canvas.init("canvas-container"),
    ]);

    // Create models
    const data = objLoader.parse(objFile);
    const model = new Model(data);
    model.scale = vec3.fromValues(10, 10, 1);
    model.translation = vec3.fromValues(0, 0, 0);

    const perspectiveCamera = new Camera(
      (2 * Math.PI) / 5,
      gpuCanvas.aspectRatio,
      0.1,
      100
    );

    perspectiveCamera.translation = vec3.fromValues(0, 0.1, 3);

    // Create Buffers and Bind Groups
    const meshBuffers = gpuCanvas.createModelBuffers(model);
    const program = DefaultProgram.init(gpuCanvas, meshBuffers);

    // Start loop
    gpuCanvas.draw((renderPassAPI) => {
      program
        .preRender(perspectiveCamera, model)
        .render(renderPassAPI, meshBuffers);
    });
  } catch (e) {
    const errorContainerEl = document.getElementById("error-text");
    if (errorContainerEl) {
      errorContainerEl.innerHTML = e as string;
    }
    throw e;
  }
})();
