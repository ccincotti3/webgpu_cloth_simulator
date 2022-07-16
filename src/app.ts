import Model from "./Model";
import ObjLoader from "./ObjLoader";
import Canvas from "./Canvas";
import Camera from "./Camera";
import DefaultProgram from "./programs/DefaultProgram";
import DebuggerProgram from "./programs/DebuggerProgram";
import Transformation from "./Transformation";
import { Mesh } from "./types";
import Cloth from "./Cloth";

// const OBJECT_URL: string = "objs/cloth_500.obj";
// const OBJECT_URL: string = "objs/cloth20x20.obj";
const OBJECT_URL: string = "objs/cloth_100.obj";
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
    modelTransformation.scale = [0.5, 0.5, 0.5];
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

    const debuggerMesh = {
      positions: new Float32Array([
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

    const cloth = new Cloth(data)

    const program = DefaultProgram.init(gpuCanvas);
    program.registerModelMatrices(1);

    const debuggerProgram = DebuggerProgram.init(gpuCanvas);
    debuggerProgram.registerModelMatrices(1);

    // PHYSICS
    const dt = 1.0 / 60.0

    // Start loop
    gpuCanvas.draw((renderPassAPI) => {
      const now = Date.now() / 3000;
      const gravity = [-0.5 * Math.cos(now), -1, 0.1]
      // modelTransformation.rotationXYZ = [0, (1 + Math.cos(now)) * 3.14,  0];

      cloth.preSolve(dt, gravity)
      cloth.solve(dt)
      cloth.postSolve(dt)

      gpuCanvas.device.queue.writeBuffer(meshBuffers.position.data, 0, cloth.pos, 0, meshBuffers.position.length);
      gpuCanvas.device.queue.writeBuffer(meshBuffers.normals.data, 0, cloth.normals, 0, meshBuffers.normals.length);
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
