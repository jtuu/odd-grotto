import { types } from "mobx-state-tree";
import { Tile, ITile } from "./Tile";

export const Grid = types
  .model("Grid", {
    width: types.number,
    height: types.number,
    tiles: types.array(Tile)
  })
  .views((self) => ({
    get size(): number {
      return self.width * self.height;
    },
    get(x: number, y: number): ITile {
      const found = self.tiles.find(t => t.x === x && t.y === y);
      if (!found) {
        throw new Error(`No Tile exists at (${x},${y})`);
      }
      return found;
    },
    withinBounds(x: number, y: number): boolean {
      return x >= 0 && x < self.width && y >= 0 && y < self.height;
    }
  }))
  .actions(self => ({
    afterCreate() {
      const tiles: ITile[] = Array(self.size);
      for (let y = 0, i = 0; y < self.height; y++) {
        for (let x = 0; x < self.width; x++, i++) {
          tiles[i] = Tile.create({ x, y });
        }
      }
      self.tiles.push(...tiles);
    }
  }));

type IGridType = typeof Grid.Type;
export interface IGrid extends IGridType{}
