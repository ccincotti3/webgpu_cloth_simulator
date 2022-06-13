import Model from "./Model";
import ObjLoader from "./ObjLoader";
import Canvas from "./Canvas";
import Camera from "./Camera";
import DefaultProgram from "./programs/DefaultProgram";
import DebuggerProgram from "./programs/DebuggerProgram";
import Transformation from "./Transformation";
import { Mesh } from "./types";

// const OBJECT_URL: string = "objs/cloth20x20.obj";
// const OBJECT_URL: string = "objs/bunny.obj";
const OBJECT_URL: string = "objs/cube.obj";

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
    modelTransformation.scale = [1, 1, 1];
    modelTransformation.rotationXYZ = [0, -3.14 / 4, 0];

    const lightModel = new Transformation();
    lightModel.translation = [5.0, 0.0, 0.0];

    const perspectiveCamera = new Camera(
      (2 * Math.PI) / 5,
      gpuCanvas.aspectRatio,
      0.1,
      100
    );

    perspectiveCamera.translation = [0, 0.0, 3.0];

    // Create Buffers and Bind Groups
    const meshBuffers = gpuCanvas.createModelBuffers(model);

    const debuggerMesh = {
      position: new Float32Array([
        -0.1, 0, 0,
        0.1, 0, 0,
        0, 0.1, 0,
      ]),
      normals: new Float32Array([]),
      uvs: new Float32Array([]),
      indices: new Uint16Array([])
    } as Mesh

    const debuggerModel = new Model(debuggerMesh)
    const debuggerMeshBuffers = gpuCanvas.createModelBuffers(debuggerModel)

    const program = DefaultProgram.init(gpuCanvas);
    program.registerModelMatrices(1);

    const debuggerProgram = DebuggerProgram.init(gpuCanvas);
    debuggerProgram.registerModelMatrices(1);

    // Start loop
    gpuCanvas.draw((renderPassAPI) => {
      const now = Date.now() / 3000;
      // lightModel.rotationXYZ = [0, (1 - Math.cos(now)) * 3.14, 0];
      // modelTransformation.rotationXYZ = [0, (1 + Math.cos(now)) * 3.14, 0];

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

      debuggerProgram
        .activate(renderPassAPI)
        .updateCameraUniforms(perspectiveCamera)
        .updateModelUniforms(lightModel.modelMatrix, lightModel.getNormalMatrix(perspectiveCamera.viewMatrix), 0)
        .render(renderPassAPI, debuggerMeshBuffers);
    });
  } catch (e) {
    const errorContainerEl = document.getElementById("error-text");
    if (errorContainerEl) {
      errorContainerEl.innerHTML = e as string;
    }
    throw e;
  }
})();
