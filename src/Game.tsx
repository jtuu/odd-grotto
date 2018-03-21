import "./Game.css";
import * as React from "react";
import { types, getSnapshot, destroy } from "mobx-state-tree";
import { IEntity } from "./Entity";
import { Grid } from "./Grid";
import { Bind, Debounce } from "./Decorators";
import { EntityStore, IEntityStore } from "./EntityStore";
import { drawAsImage } from "./CanvasUtils";
import { ControllerType, Controller } from "./Controller";
import { KeyboardController } from "./KeyboardController";
import { AIController } from "./AIController";
import { NetworkController } from "./NetworkController";
import { maxEnergy } from "./Action";
import { Rng, RngState } from "./Random";
import { PeerAPI, PeerAPITopic } from "./PeerAPI";
import { Keyboard } from "./Keyboard";
import { RoomMode } from "./Room";

const tilePxSize = 10;
const pxAlign = 0.5;

const GameStore = types
  .model("Game", {
    time: 0,
    grid: Grid,
    entities: EntityStore
  })
  .views(self => ({
    get trackedEntity(): IEntity {
      const found = self.entities.list.find(e => e.tracked);
      if (!found) {
        throw new Error("No trackable Entity found");
      }
      return found;
    }
  }))
  .actions(self => ({
    advanceTime() {
      self.time++;
    }
  }));

type IGameType = typeof GameStore.Type;
interface IGame extends IGameType {}

type IGameSnapshotType = typeof GameStore.SnapshotType;
interface IGameSnapshot extends IGameSnapshotType {}

export interface GameState {
  rng: RngState;
  game: IGameSnapshot;
}

interface GameProps {
  username: string;
  peers: PeerAPI;
  mode: RoomMode;
  autoStart: boolean;
}

export class Game extends React.PureComponent<GameProps> {
  private static readonly storeDefaults: IGameSnapshot = {
    grid: {
      width: 100,
      height: 100,
      tiles: []
    },
    entities: {
      list: [
        {
          name: "Enemy1",
          id: 0,
          controllerType: ControllerType.AI,
          x: 1,
          y: 1,
          speed: 10
        }
      ]
    }
  };

  private keyboard!: Keyboard;
  public readonly rng = new Rng();
  private store!: IGame;

  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private currentFill!: CanvasPattern | CanvasGradient | string;
  private cachedGrid: HTMLImageElement | undefined;

  private running = false;

  constructor(props: GameProps) {
    super(props);
  }

  private setCanvasSize() {
    // TODO: make this work correctly
    this.canvas.width = this.canvas.parentElement!.offsetWidth - 10;
    this.canvas.height = this.canvas.parentElement!.offsetHeight - 10;
  }

  @Bind
  @Debounce(100)
  private onResize() {
    this.setCanvasSize();
    this.draw();
  }

  public get peers() {
    return this.props.peers;
  }

  private async loop() {
    for (const entity of this.store.entities.iterate()) {
      if (entity.alive) {
        if (entity.energy >= maxEnergy) {
          await entity.act();
          this.store.advanceTime();
          await this.draw();
        }
        entity.gainEnergy();
      }
    }
  }

  private static localizeState(state: GameState, playing: boolean) {
    const entityStore: IEntityStore | undefined = state.game.entities;

    if (entityStore && entityStore.list) {
      for (const entity of entityStore.list) {
        if (entity.controllerType === ControllerType.Keyboard) {
          entity.controllerType = ControllerType.Network;
        }
        if (playing) {
          entity.tracked = false;
        }
      }
    }
  }

  private initStore(config: IGameSnapshot = Game.storeDefaults) {
    this.store = GameStore.create(config, {
      createController: this.createController,
      getTime: this.getTime
    });
  }

  // tslint:disable-next-line
  private watch() {
  }
  
  private play() {
    for (const tile of this.store.grid.tiles) {
      if (!tile.isBlocked) {
        const player = this.store.entities.create({
          name: this.props.username,
          x: tile.x,
          y: tile.y,
          controllerType: ControllerType.Keyboard,
          tracked: true,
          baseColor: "blue"
        });
        this.peers.joinGame(player);
        break;
      }
    }
  }

  public async start(state?: GameState) {
    if (this.running) {
      console.warn("`start` called but game is already running");
      return;
    }
    
    if (state) {
      Game.localizeState(state, this.props.mode === "play");
      this.rng.setState(state.rng);
      this.initStore(state.game);
    } else {
      this.initStore();
    }

    switch (this.props.mode) {
      case "play":
        this.play();
        break;
      case "watch":
        this.watch();
        break;
      default:
        throw new Error(`Invalid RoomMode "${this.props.mode}"`);
    }

    this.draw();

    this.running = true;
    this.loop();
  }

  public stop() {
    this.running = false;
  }

  public getState(): GameState {
    return {
      rng: this.rng.getState(),
      game: getSnapshot(this.store)
    };
  }

  @Bind
  public createController(type: ControllerType, entity: any): Controller {
    switch (type) {
      case ControllerType.Keyboard:
        return new KeyboardController(entity, this.keyboard, this.peers);
      case ControllerType.AI:
        return new AIController(entity, this.rng);
      case ControllerType.Network:
        return new NetworkController(entity, this.peers);
    }

    throw new TypeError(`Unknown ControllerType: "${type}"`);
  }

  private clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  @Bind
  public getTime(): number {
    return this.store.time;
  }

  @Bind
  private forceDrawGrid(ctx: CanvasRenderingContext2D) {
    const {grid: {width, height}} = this.store;

    const bottom = height * tilePxSize;
    const right = width * tilePxSize;
    for (let i = 0; i <= width; i++) {
      const x = i * tilePxSize + pxAlign;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, bottom);
    }
    for (let i = 0; i <= height; i++) {
      const y = i * tilePxSize + pxAlign;
      ctx.moveTo(0, y);
      ctx.lineTo(right, y);
    }
    ctx.stroke();
  }

  private drawGrid() {
    if (this.cachedGrid) {
      this.ctx.drawImage(this.cachedGrid, 0, 0);
    } else {
      const gridW = this.store.grid.width * tilePxSize + 1;
      const gridH = this.store.grid.height * tilePxSize + 1;
      drawAsImage(gridW, gridH, this.forceDrawGrid).then(img => {
        this.cachedGrid = img;

        this.draw();
      });
    }
  }

  private drawSync() {
    this.clearCanvas();

    const cx = this.store.trackedEntity.x * tilePxSize;
    const cy = this.store.trackedEntity.y * tilePxSize;
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2 - cx, this.canvas.height / 2 - cy);

    this.drawGrid();

    for (const entity of this.store.entities.list) {
      if (entity.color !== this.currentFill) {
        this.ctx.fillStyle = entity.color;
        this.currentFill = entity.color;
      }
      this.ctx.fillRect(
        entity.x * tilePxSize + pxAlign,
        entity.y * tilePxSize + pxAlign,
        tilePxSize,
        tilePxSize
      );
    }

    this.ctx.restore();
  }

  private draw(): Promise<void > {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        this.drawSync();
        resolve();
      });
    });
  }

  private async handleJoins() {
    for await(const joinedEntity of this.peers.takeEvery(PeerAPITopic.JoinGame)) {
      joinedEntity.tracked = false;
      if (joinedEntity.controllerType === ControllerType.Keyboard) {
        joinedEntity.controllerType = ControllerType.Network;
      }
      this.store.entities.create(joinedEntity);
      this.draw();
    }
  }

  public componentDidMount() {
    this.handleJoins();

    this.setCanvasSize();

    if (this.props.autoStart) {
      this.start();
    }
    window.addEventListener("resize", this.onResize);
  }

  public componentWillUnmount() {
    window.removeEventListener("resize", this.onResize);
    this.stop();
    if (this.store) {
      destroy(this.store);
    }
  }

  private onCanvasElement(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }
    this.ctx = ctx;
    this.currentFill = this.ctx.fillStyle;

    this.keyboard = new Keyboard(this.canvas);
  }

  public render() {
    return (<canvas className="game" tabIndex={1} ref={el => {
      if (el) {
        this.onCanvasElement(el);
      }
    }}></canvas>);
  }
}
