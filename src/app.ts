import ClothSimulator from "./ClothSimulator"
import Model from "./Model";
import ObjLoader from "./ObjLoader"
import Canvas from "./Canvas"
import Camera from "./Camera";
import { vec3 } from "gl-matrix";
import BufferFactory from "./BufferFactory";

const OBJECT_URL: string = "objs/bunny.obj";

(async () => {
    try {
        const objLoader = new ObjLoader()
        const [objFile, gpuCanvas] = await Promise.all([
            objLoader.load(OBJECT_URL),
            Canvas.init("canvas-container")
        ])

        const bufferFactory = new BufferFactory(gpuCanvas.device)

        // Load cloth simulator
        const cs = new ClothSimulator()
        // cs.addCollisionModel(bunnyModel)

        // Init Camera
        const aspectRatio = gpuCanvas.width / gpuCanvas.height
        const perspectiveCamera = new Camera((2 * Math.PI) / 5, aspectRatio, 1, 100.)
        perspectiveCamera.translation = vec3.fromValues(0, 0, 5);

        // Create models
        const data = objLoader.parse(objFile)
        const model = new Model(data)
        const { indices, vertices } = model.mesh

        const [vertexBuffer] = bufferFactory.create(vertices, GPUBufferUsage.VERTEX)
        const [indexBuffer, indexBufferLength] = bufferFactory.create(indices, GPUBufferUsage.INDEX);

        // Start loop
        gpuCanvas.draw((setCameraMatrix, drawHelper) => {
            const now = Date.now() / 1000;
            perspectiveCamera.rotationXYZ = vec3.fromValues(0, 0, (1+Math.cos(now)) * 3.14)
            setCameraMatrix(
                perspectiveCamera.projectionViewMatrix as Float32Array
            )

            drawHelper.setVertexBuffer(0, vertexBuffer)
            drawHelper.setIndexBuffer(indexBuffer, "uint16")
            drawHelper.drawIndexed(indexBufferLength)
        })

    } catch (e) {
        const errorContainerEl = document.getElementById("error-text")
        if (errorContainerEl) {
            errorContainerEl.innerHTML = e as string
        }
        throw (e)
    }
})()