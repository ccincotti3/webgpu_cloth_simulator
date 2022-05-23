import Model from "./Model";

export default class ClothSimulator {
  private collisionModels: Model[];
  constructor() {
    this.collisionModels = [];
  }
  addCollisionModel(model: Model) {
    this.collisionModels.push(model);
  }
  addClothModel(model: Model) {}
  update() {}
}
