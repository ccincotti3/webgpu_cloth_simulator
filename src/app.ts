import Model from "./Model";
import ObjLoader from "./ObjLoader";
import Canvas from "./Canvas";
import Camera from "./Camera";
import DefaultProgram from "./programs/DefaultProgram";
import DebuggerProgram from "./programs/DebuggerProgram";
import Transformation from "./Transformation";
import Cloth from "./Cloth";

// const OBJECT_URL: string = "objs/cloth20x20.obj";
// const OBJECT_URL: string = "objs/cloth_60_60.obj";
const OBJECT_URL: string = "objs/cloth_40_40_l.obj";
// const OBJECT_URL: string = "objs/bunny.obj";
// const OBJECT_URL: string = "objs/cube.obj";

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
    modelTransformation.scale = [1.0, 1.0, 1.0];
    // modelTransformation.rotationXYZ = [0,  1, 1];

    const lightModel = new Transformation();
    lightModel.translation = [5.0, 0.0, 0.0];
    lightModel.rotationXYZ = [0, -3.14 / 2, 0];

    const perspectiveCamera = new Camera(
      (2 * Math.PI) / 5,
      gpuCanvas.aspectRatio,
      0.1,
      100
    );

    perspectiveCamera.translation = [0, 0.0, 3.0];

    // Create Buffers and Bind Groups
    const meshBuffers = gpuCanvas.createModelBuffers(model);
    const cloth = new Cloth(data);

    const program = DefaultProgram.init(gpuCanvas);
    program.registerModelMatrices(1);

    const debuggerProgram = DebuggerProgram.init(gpuCanvas);
    debuggerProgram.registerModelMatrices(1);

    // PHYSICS
    const dt = 1.0 / 60.0;
    const steps = 15;
    const sdt = dt / steps;
    const gravity = new Float32Array([-3, -9.8, -4]);

    // Start loop
    gpuCanvas.draw((renderPassAPI) => {
      for (let i = 0; i < steps; i++) {
        cloth.preSolve(sdt, gravity);
        cloth.solve(sdt);
        cloth.postSolve(sdt);
      }

      cloth.updateVertexNormals();

      gpuCanvas.device.queue.writeBuffer(
        meshBuffers.position.data,
        0,
        cloth.pos,
        0,
        meshBuffers.position.length
      );
      gpuCanvas.device.queue.writeBuffer(
        meshBuffers.normals.data,
        0,
        cloth.normals,
        0,
        meshBuffers.normals.length
      );
      program
        .activate(renderPassAPI)
        .updateCameraUniforms(perspectiveCamera)
        .updateModelUniforms(
          modelTransformation.modelMatrix,
          modelTransformation.getNormalMatrix(perspectiveCamera.viewMatrix),
          0
        )
        .updateLightModelPositionUniform(lightModel.position)
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
