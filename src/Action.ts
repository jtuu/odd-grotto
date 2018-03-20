type TVec2 = [number, number];

function Vec2(x: number, y: number): TVec2 {
  return [x, y];
}

export const directions = {
  NW: Vec2(-1, -1),
  N: Vec2(0, -1),
  NE: Vec2(1, -1),
  W: Vec2(-1, 0),
  E: Vec2(1, 0),
  SW: Vec2(-1, 1),
  S: Vec2(0, 1),
  SE: Vec2(1, 1)
};

export enum ActionType {
  Move,
  Attack
}

export interface Action<P extends {}> {
  type: ActionType;
  payload: P;
}

export function action<P>(type: ActionType, payload: P): Action<P> {
  return {type, payload};
}

export type MoveAction = Action<{direction: TVec2}>;

export function moveAction(direction: TVec2): MoveAction {
  return action(ActionType.Move, {direction});
}

export const maxEnergy = 100;

export function getEnergyCost(actionType: ActionType): number {
  switch (actionType) {
    case ActionType.Move:
      return 100;
    case ActionType.Attack:
      return 120;
  }

  throw new TypeError(`Unknown ActionType: "${actionType}"`);
}
