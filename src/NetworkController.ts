import { Controller } from "./Controller";
import { IEntity } from "./Entity";
import { PeerAPI, PeerAPITopic, PeerAPIMessage } from "./PeerAPI";

export class NetworkController extends Controller {
  private messages: AsyncIterableIterator<PeerAPIMessage<PeerAPITopic.Action>>;

  constructor(entity: IEntity, private peers: PeerAPI) {
    super(entity);
    this.messages = this.peers.messages(PeerAPITopic.Action);
  }

  public async act(): Promise<void> {
    let msg: PeerAPIMessage<PeerAPITopic.Action>;
    while (true) {
      msg = (await this.messages.next()).value;

      if (msg.payload.entityId === this.entity.id) {
        if (this.entity.getTime() !== msg.payload.time) {
          throw new Error("GameState out of sync");
        }
        if (this.doAction(msg.payload.action)) {
          return;
        }
      }
    }
  }
}
