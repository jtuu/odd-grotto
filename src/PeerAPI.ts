import { WebRTCMultiConnector, RTCDataChannelData } from "./WebRTCMultiConnector";
import { Bind } from "./Decorators";
import { EventStreamer } from "./EventStreamer";
import { ChatMessage } from "./ChatBox";
import { Action } from "./Action";
import { SignedData, isSignedData } from "./Utils";
import { IEntity } from "./Entity";

export enum PeerAPITopic {
  Ping = "Ping",
  Pong = "Pong",
  ChatMessage = "ChatMessage",
  Action = "Action",
  GameStatePart = "GameStatePart",
  JoinGame = "JoinGame"
}

interface PingPongMessage {
  id: number;
}

export interface ActionMessage {
  entityId: number;
  time: number;
  action: Action<any>;
}

interface PeerAPITopicMap {
  [PeerAPITopic.Ping]: PingPongMessage;
  [PeerAPITopic.Pong]: PingPongMessage;
  [PeerAPITopic.ChatMessage]: ChatMessage;
  [PeerAPITopic.Action]: ActionMessage;
  [PeerAPITopic.GameStatePart]: OddGrottoData;
  [PeerAPITopic.JoinGame]: IEntity;
}

type KeyOfPeerAPITopicMap = keyof PeerAPITopicMap;

export interface PeerAPIMessage<T extends KeyOfPeerAPITopicMap> {
  topic: T;
  payload: PeerAPITopicMap[T];
}

// these have to identical but unfortunately
// you can only use a literal in generics
const oddGrottoSignature = new Uint8Array([202, 174, 31, 109]);
type OddGrottoData = Uint8Array & SignedData<[202, 174, 31, 109]>;

export const oddGrottoDataKindIndex = oddGrottoSignature.length;
export enum OddGrottoDataKind {
  GameStatePart,
  GameStatePartEnd
}

export const oddGrottoDataHeaderSize = oddGrottoSignature.length + 1;

export class PeerAPI extends EventStreamer<PeerAPITopicMap> {
  constructor(private connector: WebRTCMultiConnector) {
    super();
    this.connector.onMessage(this.handleMessage);
    this.pong();
  }

  private static createMessage<T extends KeyOfPeerAPITopicMap>(topic: T, payload: PeerAPITopicMap[T]): PeerAPIMessage<T> {
    return {topic, payload};
  }

  private static isWellFormedMessage(msg: any): msg is PeerAPIMessage<any> {
    return msg &&
      typeof msg === "object" &&
      Boolean(Reflect.getOwnPropertyDescriptor(PeerAPITopic, msg.topic));
  }

  private static isOddGrottoData(data: Uint8Array): data is OddGrottoData {
    return isSignedData(data, oddGrottoSignature);
  }

  private static signAsOddGrottoData(data: Uint8Array, kind: OddGrottoDataKind): OddGrottoData {
    const signed = new Uint8Array(oddGrottoDataHeaderSize + data.length);
  
    signed.set(oddGrottoSignature, 0);
    signed[oddGrottoDataKindIndex] = kind;
    signed.set(data, oddGrottoDataHeaderSize);

    if (PeerAPI.isOddGrottoData(signed)) {
      return signed;
    }

    throw new Error("Failed to sign data correctly");
  }

  private static parseMessage(msg: RTCDataChannelData): PeerAPIMessage<any> {
    if (typeof msg === "string") {
      const parsed: any = JSON.parse(msg);

      if (PeerAPI.isWellFormedMessage(parsed)) {
        return parsed;
      }

      throw new Error(`Malformed JSON message: "${msg}"`);
    } else if (msg instanceof ArrayBuffer) {
      const view = new Uint8Array(msg);
      if (PeerAPI.isOddGrottoData(view)) {
        switch (view[oddGrottoDataKindIndex]) {
          case OddGrottoDataKind.GameStatePart:
          case OddGrottoDataKind.GameStatePartEnd:
            return PeerAPI.createMessage(PeerAPITopic.GameStatePart, view);
        }
      }

      throw new Error(`Malformed bytedata message: ${msg}`);
    }

    throw new Error(`Message was unexpected type "${typeof msg}": ${msg}`);
  }

  @Bind
  private handleMessage(_msg: RTCDataChannelData) {
    let msg: PeerAPIMessage<any>;
    try {
      msg = PeerAPI.parseMessage(_msg);
    } catch (err) {
      console.error(`Failed to parse PeerAPIMessage: ${err}`);
      return;
    }

    this.emit(msg.topic, msg.payload);
  }

  public async ping(): Promise<number> {
    const timeSent = Date.now();
    const id = Math.random();
    const numConn = this.connector.connectionCount;
    let durSum = 0;

    if (numConn < 1) {
      return 0;
    }

    const pongs = this.takeN(PeerAPITopic.Pong, numConn);
    this.connector.broadcast(PeerAPI.createMessage(PeerAPITopic.Ping, {id}));

    for await(const pong of pongs) {
      if (pong.id === id) {
        durSum += Date.now() - timeSent;
      }
    }

    const avg = durSum / numConn;
    return avg;
  }

  private async pong() {
    for await(const ping of this.takeEvery(PeerAPITopic.Ping)) {
      this.connector.broadcast(PeerAPI.createMessage(PeerAPITopic.Pong, {id: ping.id}));
    }
  }

  public chatMessage(msg: ChatMessage) {
    this.connector.broadcast(PeerAPI.createMessage(PeerAPITopic.ChatMessage, msg));
  }

  public action(entityId: number, time: number, action: Action<any>) {
    this.connector.broadcast(PeerAPI.createMessage(PeerAPITopic.Action, {entityId, time, action}));
  }

  public gameState(target: string, data: Uint8Array, end: boolean = false) {
    const dataKind = end ? OddGrottoDataKind.GameStatePartEnd : OddGrottoDataKind.GameStatePart;
    this.connector.send(target, PeerAPI.signAsOddGrottoData(data, dataKind).buffer);
  }

  public joinGame(entity: IEntity) {
    this.connector.broadcast(PeerAPI.createMessage(PeerAPITopic.JoinGame, entity));
  }

  public dispose() {
    this.terminate();
    this.connector.dispose();
  }
}