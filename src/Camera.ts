import { mat4, quat, vec3 } from "gl-matrix";
import Transformation from "./Transformation";
import { ProjectionMatrix, TransformationMatrix, ViewMatrix } from "./types";

export default class Camera extends Transformation {
  readonly projectionMatrix: ProjectionMatrix;
  constructor(fov: number, aspectRatio: number, near: number, far: number) {
    super();

    // Assume perspective always
    this.projectionMatrix = mat4.create();
    mat4.perspective(this.projectionMatrix, fov, aspectRatio, near, far);
  }

  get viewMatrix(): ViewMatrix {
    const intermediaryMatrix = mat4.create();
    const intermediaryQuaternion = quat.create();

    // Inverse the rotation
    const rotationComponent = mat4.getRotation(
      intermediaryQuaternion,
      this.modelMatrix
    );
    mat4.fromQuat(intermediaryMatrix, rotationComponent);
    mat4.transpose(intermediaryMatrix, intermediaryMatrix);

    // Inverse the translation component
    const translationComponent = vec3.create();
    mat4.getTranslation(translationComponent, this.modelMatrix);
    vec3.negate(translationComponent, translationComponent);
    mat4.translate(
      intermediaryMatrix,
      intermediaryMatrix,
      translationComponent
    );

    return intermediaryMatrix;
  }

  get projectionViewMatrix(): TransformationMatrix {
    const projectionViewMatrix = mat4.create();
    mat4.multiply(projectionViewMatrix, this.projectionMatrix, this.viewMatrix);

    return projectionViewMatrix;
  }
}
