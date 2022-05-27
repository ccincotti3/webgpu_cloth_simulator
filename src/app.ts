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

    // Create Pipeline
    const shader = gpuCanvas.createShader(defaultShader);
    const pipeline = gpuCanvas.createRenderPipeline(shader);

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

    // Create Buffers and Bind Groups
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

    const meshBuffers = gpuCanvas.createModelBuffers(model);

    // Register Buffers with Pipeline
    const drawPass = new DrawPass();
    drawPass.registerModel(meshBuffers);
    drawPass.registerUniformBindGroup({
      binding: 0,
      bindGroup: uniformBindGroup,
    });

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
