import ClothSimulator from "./ClothSimulator";
import Model from "./Model";
import ObjLoader from "./ObjLoader";
import Canvas from "./Canvas";
import Camera from "./Camera";
import { mat4, vec3 } from "gl-matrix";
import defaultShader from "./shaders/defaultShader";
import { DrawPass } from "./DrawPass";

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

    // Create Pipeline
    const shader = gpuCanvas.createShader(defaultShader);
    const pipeline = gpuCanvas.createRenderPipeline(shader);

    // Init Camera
    const perspectiveCamera = new Camera(
      (2 * Math.PI) / 5,
      gpuCanvas.aspectRatio,
      0.1,
      100
    );

    // Create Buffers and Bind Groups
    const meshBuffers = gpuCanvas.createModelBuffers(model);
    const uniformBuffer = gpuCanvas.createUniformBuffer(
      16 * Float32Array.BYTES_PER_ELEMENT
    );

    const uniformBindGroup = gpuCanvas.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
          },
        },
      ],
    });

    // Register Buffers
    const drawPass = new DrawPass();
    drawPass.registerModel(meshBuffers);
    drawPass.registerUniformBindGroup({
      binding: 0,
      bindGroup: uniformBindGroup,
    });

    // Configure Scene
    model.scale = vec3.fromValues(10, 10, 1);
    model.translation = vec3.fromValues(0, 0, 0);
    perspectiveCamera.translation = vec3.fromValues(0, 0.1, 3);

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
      gpuCanvas.updateUniform(
        uniformBuffer,
        modelViewProjectionMatrix as Float32Array
      );
      drawPass.draw(pipeline, drawHelper);
    });
  } catch (e) {
    const errorContainerEl = document.getElementById("error-text");
    if (errorContainerEl) {
      errorContainerEl.innerHTML = e as string;
    }
    throw e;
  }
})();
