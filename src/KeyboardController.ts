import { Action, directions, moveAction } from "./Action";
import { Controller } from "./Controller";
import { Keyboard } from "./Keyboard";
import { IEntity } from "./Entity";
import { PeerAPI } from "./PeerAPI";

export class KeyboardController extends Controller{
  private static readonly controls: Map<string, Action<any>> = new Map([
    ["7", moveAction(directions.NW)],
    ["8", moveAction(directions.N)],
    ["9", moveAction(directions.NE)],
    ["4", moveAction(directions.W)],
    ["6", moveAction(directions.E)],
    ["1", moveAction(directions.SW)],
    ["2", moveAction(directions.S)],
    ["3", moveAction(directions.SE)],

    ["w", moveAction(directions.N)],
    ["a", moveAction(directions.W)],
    ["s", moveAction(directions.S)],
    ["d", moveAction(directions.E)]
  ]);

  constructor(
    entity: IEntity,
    private keyboard: Keyboard,
    private peers: PeerAPI
  ) {
    super(entity);
  }

  private static keyPressToAction(e: KeyboardEvent): Action<any> | undefined {
    return KeyboardController.controls.get(e.key);
  }
  
  public async act(): Promise<void> {
    let brokeGracefully = false;

    for await(const keyPress of this.keyboard.keyPresses) {
      const action = KeyboardController.keyPressToAction(keyPress);
      
      if (action && this.doAction(action)) {
        this.peers.action(this.entity.id, this.entity.getTime(), action);
        brokeGracefully = true;
        break; // changing this to `return` will cause firefox 59.0 to segfault
      }
    }

    if (!brokeGracefully) {
      throw new Error("Keyboard stopped abruptly");
    }
  }
}
