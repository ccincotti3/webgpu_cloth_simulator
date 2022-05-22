import { mat4, vec3,  } from "gl-matrix";
import { ModelMatrix } from "./types";

type EulerOrder = "XYZ" | "YXZ" | "ZYX" | "XZY" | "YZX" | "ZXY"

export default class Transformable {
    private _translation: mat4
    private _rotation: mat4
    private _modelMatrix: ModelMatrix

    constructor() {
        this._translation = mat4.create()
        this._rotation = mat4.create()
        this._modelMatrix = mat4.create()
    }

    set translation(pos: vec3) {
        this._translation[12] = pos[0]
        this._translation[13] = pos[1]
        this._translation[14] = pos[2]
        this.refreshModelMatrix()
    }

    // Rotation with Euler Order XYZ
    set rotationXYZ(rot: vec3) {
        const intermediaryMatrix = mat4.create()
        mat4.rotateX(intermediaryMatrix, intermediaryMatrix, rot[0])
        mat4.rotateY(intermediaryMatrix, intermediaryMatrix, rot[1])
        mat4.rotateZ(intermediaryMatrix, intermediaryMatrix, rot[2])
        mat4.copy(this._rotation, intermediaryMatrix)
        this.refreshModelMatrix()
    }

    get modelMatrix(): ModelMatrix {
        return this._modelMatrix
    }

    private refreshModelMatrix() {
        mat4.multiply(this._modelMatrix, this._rotation, this._translation)
    }


}