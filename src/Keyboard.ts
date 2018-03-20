import { Bind } from "./Decorators";
import { AsyncStream } from "./AsyncStream";

export class Keyboard {
  public readonly keyPresses: AsyncStream<KeyboardEvent> = new AsyncStream(false);

  constructor(private source: DOMEventTarget = window) {
    this.source.addEventListener("keyup", this.onKeyUp);
  }

  @Bind
  private onKeyUp(e: KeyboardEvent) {
    this.keyPresses.add(e);
  }

  public dispose() {
    this.source.removeEventListener("keyup", this.onKeyUp);
  }
}
