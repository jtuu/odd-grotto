import { types } from "mobx-state-tree";
import { IEntity, Entity } from "./Entity";

export const EntityStore = types
  .model("EntityStore", {
    idCounter: 0,
    currentEntityId: types.maybe(types.number),
    list: types.array(Entity)
  })
  .volatile(self => ({
    *iterate() {
      let i = self.list.findIndex(e => e.id === self.currentEntityId);
      while (true) {
        yield self.list[i];
        i = i < self.list.length - 1 ? i + 1 : 0;
      }
    }
  }))
  .actions(self => ({
    afterCreate() {
      let biggestId = 0;
      for (const entity of self.list) {
        biggestId = Math.max(biggestId, entity.id);
      }
      self.idCounter = biggestId + 1;
    },
    create(config: Partial<IEntity>): IEntity {
      if (typeof config.id !== "number") {
        config.id = ++self.idCounter;
      }

      if (self.currentEntityId === null) {
        self.currentEntityId = config.id;
      }

      const entity = Entity.create(config);
      self.list.push(entity);
      return entity;
    }
  }));

type IEntityStoreType = typeof EntityStore.Type;
export interface IEntityStore extends IEntityStoreType {}
