import { types, getParent } from "mobx-state-tree";
import { IEntity } from "./Entity";

export const Tile = types
  .model("Tile", {
    x: types.number,
    y: types.number,
    seen: true
  })
  .views(self => ({
    get allEntities(): IEntity[] {
      return getParent(self, 3).entities.list;
    }
  }))
  .views(self => ({
    get contents(): IEntity[] {
      return self.allEntities.filter(e => e.x === self.x && e.y === self.y);
    }
  }))
  .views(self => ({
    get isBlocked(): boolean {
      return self.contents.length > 0;
    }
  }));

type ITileType = typeof Tile.Type;
export interface ITile extends ITileType {}
