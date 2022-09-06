import ObjLoader from "./ObjLoader";
import WebGPUCanvas from "./WebGPUCanvas";
import Camera from "./PerspectiveCamera";
import DefaultProgram from "./programs/DefaultProgram";
import Transformation from "./Transformation";
import Cloth from "./Cloth";

const OBJECT_URL: string = "cloth_40_40_l.obj";

(async () => {
  try {
    const objLoader = new ObjLoader();
    const [objFile, gpuCanvas] = await Promise.all([
      objLoader.load(OBJECT_URL),
      WebGPUCanvas.init("canvas-container"),
    ]);

    // Create mesh data
    const mesh = objLoader.parse(objFile);

    const modelTransformation = new Transformation();
    modelTransformation.scale = [1.0, 1.0, 1.0];

    // Create Buffers and Bind Groups
    const meshBuffers = gpuCanvas.createMeshBuffers(mesh);

    // Initialize WebGPU program
    const program = DefaultProgram.init(gpuCanvas);
    program.registerModelMatrices(1);

    // Initalize Scene objects
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

    // Create Physics Object
    const cloth = new Cloth(mesh);

    // Initialize physics parameters
    const dt = 1.0 / 60.0;
    const steps = 15;
    const sdt = dt / steps;
    const gravity = new Float32Array([-3, -9.8, -4]);

    cloth.registerDistanceConstraint(0);
    cloth.registerPerformantBendingConstraint(1.0);
    // cloth.registerIsometricBendingConstraint(10.0)

    // Start animation loop
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
        cloth.positions,
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
