import "./Room.css";
import * as firebase from "firebase";
import * as React from "react";
import { firebaseService } from "./FirebaseService";
import { Bind } from "./Decorators";
import { RouteComponentProps } from "react-router";
import { WebRTCMultiConnector, ConnectionStatus, lowestCommonMessageByteLimit } from "./WebRTCMultiConnector";
import { FirebaseWebRTCSignaler } from "./FirebaseWebRTCSignaler";
import { ChatBox, ChatMessage } from "./ChatBox";
import { Loader } from "./Loader";
import { UserList, User } from "./UserList";
import { Game, GameState } from "./Game";
import { PeerAPI, PeerAPITopic, OddGrottoDataKind, oddGrottoDataKindIndex, oddGrottoDataHeaderSize } from "./PeerAPI";
import { deflate, Inflate } from "pako";

export type RoomMode = "play" | "watch";

interface RoomRouteParams{
  id: string;
  name: string;
  mode: RoomMode;
}

interface RoomProps extends RouteComponentProps<RoomRouteParams>{
  username: string;
}

interface RoomState{
  users: User[];
  chatMessages: ChatMessage[];
  loaded: boolean;
  ping: number;
}

export class Room extends React.Component<RoomProps, RoomState>{
  private initialUsersReceived = false;
  private ref!: firebase.database.Reference;
  private usersRef!: firebase.database.Reference;
  private ownUserRef!: firebase.database.Reference;
  private userId: string = "";
  private chatMessageCounter = 0;
  private static readonly chatCommandPrefix = "/";
  private connector!: WebRTCMultiConnector;
  private peers!: PeerAPI;
  private gamePromise!: {
    promise?: Promise<Game>;
    resolve?(game: Game): void;
  };

  public state: RoomState = {
    users: [],
    chatMessages: [],
    loaded: false,
    ping: 0
  };

  constructor(props: RoomProps) {
    super(props);

    const gamePromise: typeof Room.prototype.gamePromise = {};
    gamePromise.promise = new Promise((resolve : (game: Game) => void) => {
      gamePromise.resolve = resolve;
      this.gamePromise = gamePromise;
    });
  }

  private get id() {
    return this.props.match.params.id;
  }

  private get name() {
    return decodeURIComponent(this.props.match.params.name);
  }

  private get mode() {
    return this.props.match.params.mode;
  }

  private get userCount() {
    return this.state.users.length;
  }

  private get isAlone() {
    return this.userCount < 2;
  }

  private get isMaster() {
    return this.state.users[0] && this.state.users[0].id === this.userId;
  }

  private get shouldCreateNewGame() {
    return this.isAlone && this.isMaster;
  }

  @Bind
  private onInitialUserList(usersSnap: firebase.database.DataSnapshot) {
    let i = 0;
    const users: User[] = [];
    usersSnap.forEach(user => {
      users[i++] = {
        id: String(user.key),
        name: String(user.child("name").val()),
        connectionStatus: ConnectionStatus.Disconnected
      };
      return false;
    });
    this.setState({users});

    this.initialUsersReceived = true;
  }

  private connectEveryone() {
    for (const user of this.state.users) {
      if (user.id !== this.userId) {
        this.connector.connect(user.id);
      }
    }
  }

  @Bind
  private onUserJoined(user: firebase.database.DataSnapshot | null) {
    if (this.initialUsersReceived && user) {
      const id = String(user.key);

      this.setState({
        users: this.state.users.concat({
          id,
          name: String(user.child("name").val()),
          connectionStatus: ConnectionStatus.Disconnected
        })
      });

      if (!this.isAlone) {
        this.ref.onDisconnect().cancel();

        if (this.isMaster) {
          this.sendGameState(id);
        }
      }
    }
  }

  @Bind
  private onUserParted(user: firebase.database.DataSnapshot | null) {
    if (user) {
      this.setState({
        users: this.state.users.filter(u => u.id !== user.key)
      });

      if (this.isAlone) {
        this.ref.onDisconnect().remove();
      }
    }
  }

  @Bind
  private handleUserConnectionStatusChange(connectionId: string, newStatus: ConnectionStatus) {
    this.setState({users: this.state.users.map(u => {
      if (u.id === connectionId) {
        u.connectionStatus = newStatus;
      }
      return u;
    })});
  }

  private async handleChatMessages() {
    for await(const {payload} of this.peers.messages(PeerAPITopic.ChatMessage)) {
      this.putChatMessage(payload);
    }
  }

  public initPresence(): Promise<any> {
    this.usersRef = this.ref.child("users");
    this.usersRef.on("child_added", this.onUserJoined);
    this.usersRef.on("child_removed", this.onUserParted);
    const gotUserList = this.usersRef.once("value", this.onInitialUserList);

    this.ownUserRef = this.usersRef.push();
    this.userId = String(this.ownUserRef.key);
    this.ownUserRef.onDisconnect().remove();

    const ownNameSet = this.ownUserRef.child("name").set(this.props.username);

    return Promise.all([gotUserList, ownNameSet]);
  }

  public componentDidMount() {
    document.title = this.name;
    this.ref = firebaseService.database.ref(`rooms/${this.id}`);
    
    this.initPresence().then(() => {
      if (this.isAlone) {
        this.ref.onDisconnect().remove();
      }

      this.connector = new WebRTCMultiConnector(new FirebaseWebRTCSignaler(this.ref), this.userId);
      this.connector.onConnectionStatusChange(this.handleUserConnectionStatusChange);
      this.peers = new PeerAPI(this.connector);
      
      this.handleChatMessages();

      if (!this.shouldCreateNewGame) {
        this.fetchGameState().then(state => {
            this.setState({loaded: true});
            this.getGame().then(game => {
              game.start(state);
            });
          });
      } else {
        this.setState({loaded: true});
      }

      this.connectEveryone();
    });
  }

  public componentWillUnmount() {
    this.usersRef.off("child_added", this.onUserJoined);
    this.usersRef.off("child_removed", this.onUserParted);
    this.ownUserRef.remove();
    this.peers.dispose();

    if (this.isAlone) {
      this.ref.remove();
    }
  }

  private createChatMessage(sender: string, text: string): ChatMessage {
    return {
      id: `${this.userId}-${this.chatMessageCounter++}`,
      date: new Date(),
      sender,
      text
    };
  }

  private putChatMessage(msg: ChatMessage) {
    this.setState({chatMessages: this.state.chatMessages.concat(msg)});
  }

  private async handleChatCommand(command: string) {
    switch (command.toLowerCase()){
      case "ping":
        const ping = await this.peers.ping();
        this.putChatMessage(this.createChatMessage("SYSTEM", `Ping ${ping}ms`));
        break;
      case "whoami":
        const text = `You are ${this.props.username}. You are${this.isMaster ? " " : " not"} the master.`;
        this.putChatMessage(this.createChatMessage("SYSTEM", text));
        break;
      default:
        this.putChatMessage(this.createChatMessage("SYSTEM", `"${command}" is not a valid command`));
        break;
    }
  }

  @Bind
  private handleChatMessageSend(text: string) {
    if (text.startsWith(Room.chatCommandPrefix)) {
      return this.handleChatCommand(text.slice(1));
    }

    const msg = this.createChatMessage(this.props.username, text);
    this.peers.chatMessage(msg);
    this.putChatMessage(msg);
  }

  private async getGameState(): Promise<GameState> {
    return (await this.getGame()).getState();
  }

  private async fetchGameState(): Promise<GameState> {
    const decompressor = new Inflate({to: "string"});

    for await(const msg of this.peers.messages(PeerAPITopic.GameStatePart)) {
      const data = msg.payload.part;
      const end = data[oddGrottoDataKindIndex] === OddGrottoDataKind.GameStatePartEnd;
      
      decompressor.push(data.subarray(oddGrottoDataHeaderSize), end);

      if (end) {
        break;
      }
    }

    if (decompressor.err) {
      throw new Error(decompressor.msg);
    }

    if (typeof decompressor.result !== "string") {
      throw new Error(`Expected result of decompression to be a string but got ${typeof decompressor.result}`);
    }

    return JSON.parse(decompressor.result);
  }

  private getGame(): Promise<Game> {
    return this.gamePromise.promise!;
  }

  private async sendGameState(target: string) {
    await this.connector.awaitConnect(target);

    const compressed = deflate(JSON.stringify(await this.getGameState()));
    const chunkSize = lowestCommonMessageByteLimit - oddGrottoDataHeaderSize;

    let i = 0;
    for (; i < compressed.length - chunkSize; i += chunkSize) {
      this.peers.gameState(target, compressed.subarray(i, i + chunkSize));
    }

    this.peers.gameState(target, compressed.subarray(i, i + chunkSize), true);
  }

  @Bind
  private renderRoom(): React.ReactNode {
    return (
      <div className="room">
        <Game
          ref={game => {
            if (game) {
              this.gamePromise.resolve!(game);
            }
          }}
          username={this.props.username}
          peers={this.peers}
          mode={this.mode}
          autoStart={this.shouldCreateNewGame}
        />
        <div className="chat" style={{fontSize: "0.7rem"}}>
          <UserList ownId={this.userId} users={this.state.users} />
          <ChatBox
              onMessageSend={this.handleChatMessageSend}
              messages={this.state.chatMessages} />
        </div>
      </div>
    );
  }

  public render() {
    return (
      <Loader loaded={this.state.loaded} onceLoaded={this.renderRoom}/>
    );
  }
}
