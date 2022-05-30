import Model from "./Model";
import ObjLoader from "./ObjLoader";
import Canvas from "./Canvas";
import Camera from "./Camera";
import DefaultProgram from "./programs/DefaultProgram";
import DebuggerProgram from "./programs/DebuggerProgram";
import Transformation from "./Transformation";

const OBJECT_URL: string = "objs/bunny.obj";

(async () => {
  try {
    const objLoader = new ObjLoader();
    const [objFile, gpuCanvas] = await Promise.all([
      objLoader.load(OBJECT_URL),
      Canvas.init("canvas-container"),
    ]);

    // Create model data
    const data = objLoader.parse(objFile);
    const model = new Model(data);

    const modelTransformation = new Transformation();
    modelTransformation.scale = [10, 10, 10];

    const lightModel = new Transformation();
    lightModel.translation = [0, 0.0, -1];

    const perspectiveCamera = new Camera(
      (2 * Math.PI) / 5,
      gpuCanvas.aspectRatio,
      0.1,
      100
    );

    perspectiveCamera.translation = [0, 0.0, 2];

    // Create Buffers and Bind Groups
    const meshBuffers = gpuCanvas.createModelBuffers(model);

    const program = DefaultProgram.init(gpuCanvas);
    program.registerModelMatrices(1);

    const debuggerProgram = DebuggerProgram.init(gpuCanvas);
    debuggerProgram.registerModelMatrices(1);

    // Start loop
    gpuCanvas.draw((renderPassAPI) => {
      const now = Date.now() / 10000;
      lightModel.rotationXYZ = [0, (1 + Math.cos(now)) * 3.14, 0];
      console.log(lightModel.position);

      program
        .activate(renderPassAPI)
        .updateCameraUniforms(perspectiveCamera)
        .updateModelUniforms(
          modelTransformation.modelMatrix,
          modelTransformation.normalMatrix,
          0
        )
        .updateLightModelPositionUniform(lightModel.position)
        .render(renderPassAPI, meshBuffers);

      debuggerProgram
        .activate(renderPassAPI)
        .updateCameraUniforms(perspectiveCamera)
        .updateModelUniforms(lightModel.modelMatrix, lightModel.normalMatrix, 0)
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
