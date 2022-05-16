import ClothSimulator from "./ClothSimulator"
import ObjLoader from "./ObjLoader"

const OBJECT_URL: string = "objs/bunny.obj";

(async () => {
    try {
        const objLoader = new ObjLoader()
        const [objFile, cs] = await Promise.all([
            objLoader.load(OBJECT_URL),
            ClothSimulator.init("canvas-container")
        ])
        const data = objLoader.parse(objFile)
        console.log("HEY", data)
    } catch (e) {
        const errorContainerEl = document.getElementById("error-text")
        if (errorContainerEl) {
            errorContainerEl.innerHTML = e as string
        }
        throw (e)
    }
})()