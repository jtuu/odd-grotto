import { types, getParent, getEnv } from "mobx-state-tree";
import { ControllerType, Controller } from "./Controller";
import { IGrid } from "./Grid";

export const Entity = types
  .model("Entity", {
    id: types.number,
    name: types.string,
    x: types.number,
    y: types.number,
    controllerType: types.union(
      types.literal(ControllerType.Keyboard),
      types.literal(ControllerType.AI),
      types.literal(ControllerType.Network)
    ),
    tracked: false,
    baseColor: types.optional(types.string, "black"),
    energy: 0,
    speed: 10,
    hitpoints: 10,
    strength: 2,
    inherentlyAttackable: true
  })
  .views(self => ({
    get createController(): (controllerType: ControllerType, entity: any) => Controller {
      return getEnv(self).createController;
    },
    get getTime(): () => number {
      return getEnv(self).getTime;
    }
  }))
  .views(self => ({
    get grid(): IGrid {
      return getParent(self, 3).grid;
    },
    get dead(): boolean {
      return self.hitpoints <= 0;
    }
  }))
  .views(self => ({
    get alive(): boolean {
      return !self.dead;
    },
    get color(): string {
      if (self.dead) {
        return "red";
      }
      return self.baseColor;
    }
  }))
  .views(self => ({
    get attackable(): boolean {
      return self.inherentlyAttackable && self.alive;
    }
  }))
  .actions(self => ({
    moveTo(x: number, y: number): boolean {
      if (self.grid.withinBounds(x, y) && !self.grid.get(x, y).isBlocked) {
        self.x = x;
        self.y = y;
        return true;
      }
      return false;
    },
    takeDamage(amount: number) {
      self.hitpoints -= amount;
    },
    gainEnergy() {
      self.energy += self.speed;
    },
    deductEnergy(amount: number) {
      self.energy -= amount;
    }
  }))
  .actions(self => ({
    moveBy(dx: number, dy: number): boolean {
      return self.moveTo(self.x + dx, self.y + dy);
    },
    attackTowards(dx: number, dy: number) {
      const x = self.x + dx;
      const y = self.y + dy;
      if (self.grid.withinBounds(x, y)) {
        const target = self.grid.get(x, y).contents[0];
        if (target && target.attackable) {
          target.takeDamage(self.strength);
          return true;
        }
      }
      return false;
    }
  }))
  .actions(self => {
    let controller: Controller;

    return {
      act() {
        if (!controller) {
          controller = self.createController(self.controllerType, self);
        }
        return controller.act();
      }
    };
  });

type IEntityType = typeof Entity.Type;
export interface IEntity extends IEntityType{}
