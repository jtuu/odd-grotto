import { Controller } from "./Controller";
import { IEntity } from "./Entity";
import { Rng } from "./Random";
import { directions, moveAction } from "./Action";

export class AIController extends Controller{
  private static readonly directionVectors = Object.values(directions);

  constructor(entity: IEntity, protected rng: Rng) {
    super(entity);
  }

  public async act(): Promise<void> {
    for (let i = 0; i < 100; i++) {
      const dir = this.rng.pick(AIController.directionVectors);
      const action = moveAction(dir);
      if (this.doAction(action)) {
        return;
      }
    }
    throw new Error("AI stuck");
  }
}
