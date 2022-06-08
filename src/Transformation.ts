import { mat4, vec3, vec4 } from "gl-matrix";
import { ModelMatrix, ViewMatrix } from "./types";

type EulerOrder = "XYZ" | "YXZ" | "ZYX" | "XZY" | "YZX" | "ZXY";

export default class Transformation {
  private _translation: mat4;
  private _rotation: mat4;
  private _scale: mat4;
  private _modelMatrix: ModelMatrix;

  constructor() {
    this._translation = mat4.create();
    this._rotation = mat4.create();
    this._scale = mat4.create();
    this._modelMatrix = mat4.create();
  }

  get position(): vec3 {
    const outVector = this.translation;
    vec3.transformMat4(outVector, outVector, this.modelMatrix);

    return outVector;
  }

  set translation(pos: vec3) {
    mat4.fromTranslation(this._translation, pos);
    this.refreshModelMatrix();
  }

  get translation(): vec3 {
    return vec3.fromValues(
      this._translation[12],
      this._translation[13],
      this._translation[14]
    );
  }

  set scale(scale: vec3) {
    this._scale[0] = scale[0];
    this._scale[5] = scale[1];
    this._scale[10] = scale[2];
    this.refreshModelMatrix();
  }

  // Rotation with Euler Order XYZ
  set rotationXYZ(rot: vec3) {
    const intermediaryMatrix = mat4.create();
    mat4.rotateX(intermediaryMatrix, intermediaryMatrix, rot[0]);
    mat4.rotateY(intermediaryMatrix, intermediaryMatrix, rot[1]);
    mat4.rotateZ(intermediaryMatrix, intermediaryMatrix, rot[2]);
    mat4.copy(this._rotation, intermediaryMatrix);
    this.refreshModelMatrix();
  }

  get modelMatrix(): ModelMatrix {
    return mat4.clone(this._modelMatrix);
  }

  set modelMatrix(m: ModelMatrix) {
    this._modelMatrix = m;
  }

  getModelViewMatrix(viewMatrix: ViewMatrix): ModelMatrix {
    const modelViewMatrix = this.modelMatrix

    mat4.multiply(modelViewMatrix, viewMatrix, modelViewMatrix)
    return modelViewMatrix
  }

  getNormalMatrix(viewMatrix: ViewMatrix): ModelMatrix {
    const normalMatrix = this.getModelViewMatrix(viewMatrix);

    mat4.invert(normalMatrix, normalMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

    return normalMatrix;
  }

  private refreshModelMatrix() {
    mat4.multiply(this._modelMatrix, this._translation, this._scale);
    mat4.multiply(this._modelMatrix, this._rotation, this._modelMatrix);
  }
}
