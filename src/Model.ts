import Transformable from "./Transformable";
import { Mesh } from "./types";

export default class Model extends Transformable {
    mesh: Mesh
    constructor(mesh: Mesh) {
        super()
        this.mesh = mesh
    }
}