import { Action, ActionType, getEnergyCost, MoveAction } from "./Action";
import { IEntity } from "./Entity";

export enum ControllerType {
  Keyboard,
  AI,
  Network
}

export abstract class Controller {
  constructor(protected entity: IEntity) {}

  protected doMoveAction(action: MoveAction): boolean {
    const [dx, dy] = action.payload.direction;
    const moved = this.entity.moveBy(dx, dy);
    if (moved) {
      this.entity.deductEnergy(getEnergyCost(action.type));
    }
    return moved;
  }

  protected doAttackAction(action: MoveAction): boolean {
    const [dx, dy] = action.payload.direction;
    const attacked = this.entity.attackTowards(dx, dy);
    if (attacked) {
      this.entity.deductEnergy(getEnergyCost(ActionType.Attack));
    }
    return attacked;
  }

  protected doAction(action: Action<any>): boolean {
    switch (action.type) {
      case ActionType.Move:
        return this.doMoveAction(action) || this.doAttackAction(action);
    }

    return false;
  }

  public abstract async act(): Promise<void>;
}
