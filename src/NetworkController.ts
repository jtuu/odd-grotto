import { Controller } from "./Controller";
import { IEntity } from "./Entity";
import { PeerAPI, PeerAPITopic, ActionMessage } from "./PeerAPI";

export class NetworkController extends Controller {
  private messages: AsyncIterableIterator<ActionMessage>;

  constructor(entity: IEntity, private peers: PeerAPI) {
    super(entity);
    this.messages = this.peers.takeEvery(PeerAPITopic.Action);
  }

  public async act(): Promise<void> {
    let msg: ActionMessage;
    while (true) {
      msg = (await this.messages.next()).value;

      if (msg.entityId === this.entity.id) {
        if (this.entity.getTime() !== msg.time) {
          throw new Error("GameState out of sync");
        }
        if (this.doAction(msg.action)) {
          return;
        }
      }
    }
  }
}
