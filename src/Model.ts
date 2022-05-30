import { Mesh } from "./types";

export default class Model {
  readonly mesh: Mesh;
  constructor(mesh: Mesh) {
    this.mesh = mesh;
  }
}
