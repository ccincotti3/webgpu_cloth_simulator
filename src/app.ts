import ObjLoader from "./ObjLoader";
import WebGPUCanvas from "./WebGPUCanvas";
import Camera from "./PerspectiveCamera";
import DefaultProgram from "./programs/DefaultProgram";
import Transformation from "./Transformation";
import Cloth from "./Cloth";

// For the simulation to work with collisions,
// it is wise to use equal spacing between all the particles.
// This is possible to do in Blender even if the cloth as a whole is a rectangle.
const OBJECT_URL: string = "cloth_30_45_l.obj";
const VERTEX_SPACING = 0.05;

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
    modelTransformation.rotationXYZ = [0, 1, 0];

    // Create Buffers and Bind Groups
    const meshBuffers = gpuCanvas.createMeshBuffers(mesh);

    // Initialize WebGPU program
    const program = DefaultProgram.init(gpuCanvas);
    program.registerModelMatrices(1);

    // Initalize Scene objects
    const lightModel = new Transformation();
    lightModel.translation = [5.0, 0.0, 0.0];
    lightModel.rotationXYZ = [0, 0, 0];

    const perspectiveCamera = new Camera(
      (2 * Math.PI) / 5,
      gpuCanvas.aspectRatio,
      0.1,
      100
    );

    perspectiveCamera.translation = [0, 0.0, 2.1];

    // Create Physics Object

    // thickness and spacing in hash table needed adjusting.
    const thickness = VERTEX_SPACING;
    const cloth = new Cloth(mesh, thickness);

    // Initialize physics parameters
    const dt = 1.0 / 60.0;
    const steps = 10;
    const sdt = dt / steps;
    const gravity = new Float32Array([-1.1, -9.8, 2.5]);

    cloth.registerDistanceConstraint(0.0);
    cloth.registerPerformantBendingConstraint(1.0);
    cloth.registerSelfCollision();
    // cloth.registerIsometricBendingConstraint(10.0)

    // Start animation loop
    gpuCanvas.draw((renderPassAPI) => {
      gravity[2] = Math.cos(Date.now() / 2000) * 15.5;
      cloth.preIntegration(sdt);
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
