import { WebRTCSignaler, SignalCallback, NegotiationMessageType, NegotiationMessage } from "./WebRTCSignaler";
import { database } from "firebase";
import { Bind } from "./Decorators";
import { TimeoutError } from "./Utils";

interface NegotiationMessageSnapshot extends database.DataSnapshot {
  val(): NegotiationMessage;
}

interface NegotiationMessageReference extends database.Reference {
  set(value: NegotiationMessage, onComplete?: (e: Error) => any): Promise<void>;
}

type NegotiationMessageHandler = [string | null, string | null, SignalCallback];

export class FirebaseWebRTCSignaler extends WebRTCSignaler {
  private signalingRef: database.Reference;
  private initialMessagesReceived = false;
  private timeout = 20 * 1000;
  private messageHandlers = {
    [NegotiationMessageType.Offer]: new Set<NegotiationMessageHandler>(),
    [NegotiationMessageType.Answer]: new Set<NegotiationMessageHandler>(),
    [NegotiationMessageType.IceCandidate]: new Set<NegotiationMessageHandler>()
  };

  constructor(
    private rootRef: database.Reference
  ) {
    super();
    this.signalingRef = this.rootRef.child("signaling");

    this.signalingRef.on("child_added", this.onNegotiationMessageAdded);
    this.signalingRef.once("value", () => this.initialMessagesReceived = true);
  }

  @Bind
  private onNegotiationMessageAdded(snap: NegotiationMessageSnapshot | null) {
    if (!this.initialMessagesReceived || !snap) { return; }

    const msg = snap.val();
    switch (msg.type) {
      case NegotiationMessageType.Offer:
      case NegotiationMessageType.Answer:
      case NegotiationMessageType.IceCandidate:
        for (const [localId, remoteId, callback] of this.messageHandlers[msg.type]) {
          const localMatch = localId !== null ? localId === msg.target : true;
          const remoteMatch = remoteId !== null ? remoteId === msg.sender : true;
          if (localMatch && remoteMatch) {
            callback(msg);
          }
        }
        break;
      default:
        // don't throw because the messages could easily be faked
        console.warn(`Unknown NegotiationMessageType(${msg.type}) received`);
        break;
    }

    setTimeout(() => snap.ref.remove(), this.timeout);
  }

  public sendOffer(sender: string, target: string, description: RTCSessionDescription): Promise<RTCSessionDescription> {
    return new Promise((resolve, reject) => {
      const offerRef = this.signalingRef.push() as NegotiationMessageReference;
      offerRef.onDisconnect().remove();

      const cleanup = () => {
        this.unregisterType(NegotiationMessageType.Answer, sender, target);
      };

      this.register(NegotiationMessageType.Answer, sender, target, (msg: NegotiationMessage) => {
        cleanup();
        resolve(msg.payload as RTCSessionDescription);
      });

      setTimeout(() => {
        cleanup();
        reject(new TimeoutError("Answer took too long"));
      }, this.timeout);

      offerRef.set({
        type: NegotiationMessageType.Offer,
        sender,
        target,
        payload: description.toJSON()
      });
    });
  }

  public sendAnswer(sender: string, target: string, description: RTCSessionDescription) {
    const answerRef = this.signalingRef.push() as NegotiationMessageReference;
    answerRef.onDisconnect().remove();

    answerRef.set({
      type: NegotiationMessageType.Answer,
      sender,
      target,
      payload: description.toJSON()
    });
  }

  public sendIceCandidate(sender: string, target: string, candidate: RTCIceCandidate) {
    const candidateRef = this.signalingRef.push() as NegotiationMessageReference;
    candidateRef.onDisconnect().remove();

    candidateRef.set({
      type: NegotiationMessageType.IceCandidate,
      sender,
      target,
      payload: candidate.toJSON()
    });
  }

  public onOffer(offerTarget: string | null, offerSender: string | null, cb: SignalCallback) {
    this.register(NegotiationMessageType.Offer, offerTarget, offerSender, cb);
  }

  public onIceCandidate(candidateTarget: string, candidateSender: string, cb: SignalCallback) {
    this.register(NegotiationMessageType.IceCandidate, candidateTarget, candidateSender, cb);
  }

  private register(type: NegotiationMessageType, localId: string | null, remoteId: string | null, callback: SignalCallback) {
    this.messageHandlers[type].add([localId, remoteId, callback]);
  }

  private unregisterType(type: NegotiationMessageType, localId?: string, remoteId?: string) {
    const checkLocal = localId !== null;
    const checkRemote = remoteId !== null;
    for (const handler of this.messageHandlers[type]) {
      const localMatch = checkLocal ? handler[0] === localId : true;
      const remoteMatch = checkRemote ? handler[1] === remoteId : true;
      if (localMatch && remoteMatch) {
        this.messageHandlers[type].delete(handler);
      }
    }
  }

  public unregister(localId: string, remoteId?: string) {
    this.unregisterType(NegotiationMessageType.Offer, localId, remoteId);
    this.unregisterType(NegotiationMessageType.Answer, localId, remoteId);
    this.unregisterType(NegotiationMessageType.IceCandidate, localId, remoteId);
  }

  public dispose() {
    this.signalingRef.off("child_added", this.onNegotiationMessageAdded);
  }
}
