type PeerIdentifier = string;

export enum NegotiationMessageType{
  Offer,
  Answer,
  IceCandidate
}

export interface NegotiationMessage{
  type: NegotiationMessageType;
  sender: string;
  target: string;
  payload: RTCSessionDescription | RTCIceCandidate;
}

export type SignalCallback = (msg: NegotiationMessage) => void;

export abstract class WebRTCSignaler{
  public abstract sendOffer(localId: PeerIdentifier, remoteId: PeerIdentifier, description: RTCSessionDescription | null): Promise<RTCSessionDescription>;
  public abstract sendAnswer(localId: PeerIdentifier, remoteId: PeerIdentifier, description: RTCSessionDescription): void;
  public abstract sendIceCandidate(localId: PeerIdentifier, remoteId: PeerIdentifier, candidate: RTCIceCandidate): void;

  public abstract onOffer(localId: PeerIdentifier | null, remoteId: PeerIdentifier | null, callback: SignalCallback): void;
  public abstract onIceCandidate(localId: PeerIdentifier, remoteId: PeerIdentifier, callback: SignalCallback): void;

  public abstract unregister(localId: PeerIdentifier, remoteId?: PeerIdentifier): void;

  public abstract dispose(): void;
}
