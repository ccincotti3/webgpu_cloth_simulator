import Transformable from "./Transformable";
import { Mesh } from "./types";

export default class Model extends Transformable {
  readonly mesh: Mesh;
  constructor(mesh: Mesh) {
    super();
    this.mesh = mesh;
  }
}
