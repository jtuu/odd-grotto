import { WebRTCSignaler, NegotiationMessage } from "./WebRTCSignaler";
import { Bind } from "./Decorators";
import iceServers from "./ice-servers.json";
import { clamp, TimeoutError } from "./Utils";

export type RTCDataChannelData = string | Blob | ArrayBuffer | ArrayBufferView;

export enum ConnectionStatus{
  Failed,
  Unknown,
  Disconnected,
  Connecting,
  Connected,

  NumStatus
}

const connectionConfig: RTCPeerConnectionConfig = {iceServers};

interface ConnectionEventHandlerStore{
  connection: Set<(id: string) => void>;
  statusChange: Set<(id: string, status: ConnectionStatus) => void>;
  message: Set<(msg: RTCDataChannelData) => void>;
}

export const lowestCommonMessageByteLimit = 16384;

class WebRTCConnection{
  private _status: ConnectionStatus = ConnectionStatus.Disconnected;

  constructor(
    public remoteId: string,
    public connection: RTCPeerConnection,
    public channel: RTCDataChannel,
    private handlerStore: ConnectionEventHandlerStore
  ) {
    this.channel.onmessage = this.handleMessage;

    // force one status change in case something changed before
    // the event handlers were attached
    this.statusChange();
    // attach statusChange handlers
    this.channel.onopen =
    this.channel.onclose =
    this.connection.onsignalingstatechange =
    this.connection.oniceconnectionstatechange =
    this.connection.onicegatheringstatechange =
    this.connection.onconnectionstatechange =
    this.statusChange;
  }

  private dataChannelReadyStateToConnectionStatus(): ConnectionStatus {
    switch (this.channel.readyState){
      case "connecting":
        return ConnectionStatus.Connecting;
      case "open":
        return ConnectionStatus.Connected;
      case "closing":
      case "closed":
        return ConnectionStatus.Failed;
      default:
        return ConnectionStatus.Unknown;
    }
  }

  private peerConnectionSignalingStateToConnectionStatus(): ConnectionStatus {
    switch (this.connection.signalingState){
      case "have-local-offer":
      case "have-remote-offer":
      case "have-local-pranswer":
      case "have-remote-pranswer":
        return ConnectionStatus.Connecting;
      case "stable":
        return ConnectionStatus.Connected;
      case "closed":
        return ConnectionStatus.Failed;
      default:
        return ConnectionStatus.Unknown;
    }
  }

  private iceConnectionStateToConnectionStatus(): ConnectionStatus {
    switch (this.connection.iceConnectionState){
      case "new":
      case "checking":
      case "disconnected":
        return ConnectionStatus.Connecting;
      case "connected":
      case "completed":
        return ConnectionStatus.Connected;
      case "failed":
      case "closed":
        return ConnectionStatus.Failed;
      default:
        return ConnectionStatus.Unknown;
    }
  }

  private iceGatheringStateToConnectionStatus(): ConnectionStatus {
    switch (this.connection.iceGatheringState){
      case "new":
      case "gathering":
        return ConnectionStatus.Connecting;
      case "complete":
        return ConnectionStatus.Connected;
      default:
        return ConnectionStatus.Unknown;
    }
  }

  // peerConnectionStateToConnectionStatus not used
  // because of bad browser support (march 2018)
  // @ts-ignore
  private peerConnectionStateToConnectionStatus(): ConnectionStatus {
    switch (this.connection.connectionState){
      case "new":
      case "connecting":
        return ConnectionStatus.Connecting;
      case "connected":
        return ConnectionStatus.Connected;
      case "disconnected":
      case "failed":
      case "closed":
        return ConnectionStatus.Failed;
      default:
        return ConnectionStatus.Unknown;
    }
  }

  private *statuses() {
    yield this.dataChannelReadyStateToConnectionStatus();
    yield this.peerConnectionSignalingStateToConnectionStatus();
    yield this.iceConnectionStateToConnectionStatus();
    yield this.iceGatheringStateToConnectionStatus();
  }

  private aggregateConnectionStatus(): ConnectionStatus {
    let sum = 0;
    let i = 0;
    for (const status of this.statuses()) {
      switch (status){
        case ConnectionStatus.Failed:
          return ConnectionStatus.Failed;
        case ConnectionStatus.Connecting:
        case ConnectionStatus.Connected:
          sum += status;
          i++;
          break;
      }
    }
    const avg = sum / i;
    return clamp(Math.floor(avg), 0, ConnectionStatus.NumStatus - 1);
  }

  public get status() {
    return this._status;
  }

  @Bind
  private statusChange() {
    const newStatus = this.aggregateConnectionStatus();
    if (newStatus !== this.status) {
      this._status = newStatus;
      this.emitStatusChange();
    }
  }

  private emitStatusChange() {
    for (const handler of this.handlerStore.statusChange) {
      handler(this.remoteId, this.status);
    }
  }

  @Bind
  private handleMessage(e: Event) {
    const {data} = <MessageEvent> e;
    for (const handler of this.handlerStore.message) {
      handler(data);
    }
  }

  public awaitReady(): Promise<any> {
    return new Promise(resolve => {
      if (this.channel.readyState === "open") {
        resolve();
      }else {
        const onOpen = () => {
          this.channel.removeEventListener("open", onOpen);
          resolve();
        };
        this.channel.addEventListener("open", onOpen);
      }
    });
  }

  public send(data: RTCDataChannelData) {
    this.awaitReady()
      .then(() => {
        this.channel.send(data);
      });
  }

  public close() {
    this.channel.close();
    this.connection.close();
  }

  public dispose() {
    delete this.channel.onopen;
    delete this.channel.onclose;
    delete this.connection.onsignalingstatechange;
    delete this.connection.oniceconnectionstatechange;
    delete this.connection.onicegatheringstatechange;
    delete this.connection.onconnectionstatechange;

    this.close();
    this.channel.removeEventListener("message", this.handleMessage);
  }
}

export class WebRTCMultiConnector{
  private connectionStore: Map<string, WebRTCConnection> = new Map();
  private handlerStore: ConnectionEventHandlerStore = {
    connection: new Set(),
    statusChange: new Set(),
    message: new Set()
  };

  constructor(private signaler: WebRTCSignaler, private identifier: string) {
    this.signaler.onOffer(this.identifier, null, this.handleOffer);
  }

  public get connectionCount(): number {
    return this.connectionStore.size;
  }

  private addConnection(remoteId: string, connection: RTCPeerConnection, channel: RTCDataChannel) {
    channel.binaryType = "arraybuffer";
    
    const wrap = new WebRTCConnection(remoteId, connection, channel, this.handlerStore);
    this.connectionStore.set(remoteId, wrap);

    for (const handler of this.handlerStore.connection) {
      handler(remoteId);
    }
  }

  @Bind
  private handleOffer(offer: NegotiationMessage) {
    const conn = new RTCPeerConnection(connectionConfig);

    const getChannel = new Promise<RTCDataChannel>(resolve => {
      conn.ondatachannel = (e: RTCDataChannelEvent) => {
        delete conn.ondatachannel;
        resolve(e.channel);
      };
    });

    this.setupIce(conn, offer.sender);

    conn.setRemoteDescription(offer.payload as RTCSessionDescription)
      .then(() => conn.createAnswer())
      .then(answer => conn.setLocalDescription(answer))
      .then(() => {
        if (conn.localDescription) {
          this.signaler.sendAnswer(this.identifier, offer.sender, conn.localDescription);
        }
      })
      .then(() => getChannel)
      .then(chan => {
        this.addConnection(offer.sender, conn, chan);
      });
  }

  private setupIce(conn: RTCPeerConnection, target: string) {
    // send local candidates
    conn.onicecandidate = ({candidate}) => {
      if (candidate) {
        this.signaler.sendIceCandidate(this.identifier, target, candidate);
      }
    };
    // receive remote candidates
    this.signaler.onIceCandidate(this.identifier, target, (msg: NegotiationMessage) => {
      conn.addIceCandidate(msg.payload as RTCIceCandidate);
    });
  }

  public connect(target: string) {
    const conn = new RTCPeerConnection(connectionConfig);
    const chan = conn.createDataChannel(`${this.identifier}-${target}`, {
      ordered: true
    });

    this.setupIce(conn, target);

    conn.createOffer()
      .then(offer => conn.setLocalDescription(offer))
      .then(() => this.signaler.sendOffer(this.identifier, target, conn.localDescription))
      .then(answer => conn.setRemoteDescription(answer))
      .then(() => {
        this.addConnection(target, conn, chan);
      });
  }

  private static coerceData(data: RTCDataChannelData | any): RTCDataChannelData {
    if (!(typeof data === "string" || data instanceof Blob || data instanceof ArrayBuffer || ArrayBuffer.isView(data))) {
      data = JSON.stringify(data);
    }
    if (data.length > lowestCommonMessageByteLimit || data.byteLength > lowestCommonMessageByteLimit) {
      console.warn("Data is larger than the lowest common size supported by RTCDataChannel. This might cause the data to get fragmented on the receiving end.", data);
    }
    return data;
  }

  public send(target: string, _data: any) {
    const data = WebRTCMultiConnector.coerceData(_data);
    const conn = this.connectionStore.get(target);
    if (conn) {
      conn.send(data);
    }else {
      console.warn(`Attempted to send data to unknown target "${target}"`);
    }
  }

  public broadcast(_data: any) {
    const data = WebRTCMultiConnector.coerceData(_data);
    for (const conn of this.connectionStore.values()) {
      conn.send(data);
    }
  }

  public onConnection(callback: (id: string) => void) {
    this.handlerStore.connection.add(callback);
  }

  public onMessage(callback: (msg: RTCDataChannelData) => void) {
    this.handlerStore.message.add(callback);
  }

  public onConnectionStatusChange(callback: (connectionId: string, newStatus: ConnectionStatus) => void) {
    this.handlerStore.statusChange.add(callback);
    // emit current status to new handler
    for (const conn of this.connectionStore.values()) {
      callback(conn.remoteId, conn.status);
    }
  }

  public unregisterListener(callback: any) {
    this.handlerStore.connection.delete(callback);
    this.handlerStore.message.delete(callback);
    this.handlerStore.statusChange.delete(callback);
  }

  public awaitConnect(target: string, timeout = 10 * 1000): Promise<void> {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.unregisterListener(onConnection);
      };

      const onConnection = (newId: string) => {
        if (newId === target) {
          cleanup();
          resolve();
        }
      };

      this.onConnection(onConnection);

      setTimeout(() => {
        cleanup();
        reject(new TimeoutError(`Target "${target}" did not connect in time`));
      }, timeout);
    });
  }

  public dispose() {
    for (const conn of this.connectionStore.values()) {
      conn.dispose();
    }
    this.signaler.dispose();
  }
}
