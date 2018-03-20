import * as React from "react";
import { Bind } from "./Decorators";
import "Loader.css";

interface LoaderProps {
  loaded: boolean;
  onceLoaded: (() => React.ReactNode);
}

interface LoaderState {
  playing: boolean;
  stopping: boolean;
}

export class Loader extends React.Component<LoaderProps, LoaderState> {
  private swirlPartCount = 10;
  private swirlCount = 4;
  private totalPartCount = this.swirlPartCount * this.swirlCount;
  private partCounter = 0;
  private stoppedParts: HTMLDivElement[] = [];

  public state = {
    playing: true,
    stopping: false
  };
  private loaderElement: HTMLDivElement | undefined;

  constructor(props: LoaderProps) {
    super(props);
  }

  private swirl(flip: boolean, flop: boolean, stagger: boolean): React.ReactNode {
    const parts: React.ReactNode[] = [];
    const partClass = "loaderpart playing";
    for (let i = 0; i < this.swirlPartCount; i++) {
      parts[i] = (<div key={`part-${this.partCounter++}`} className={partClass}></div>);
    }

    let swirlClass = "swirl";

    let flippage = "";
    if (flip) {
      flippage += "flip";
    }
    if (flop) {
      flippage += "flop";
    }

    if (flippage) {
      swirlClass += " " + flippage;
    }

    if (stagger) {
      swirlClass += " stagger";
    }

    return (
      <div className={swirlClass}>
        {parts}
      </div>
    );
  }

  @Bind
  private onSwirlPartAnimationIteration(e: AnimationEvent) {
    const part = e.target as HTMLDivElement;
    if (part.classList.contains("loaderpart")) {
      part.classList.remove("playing");
      // remove this handler once all parts have been stopped
      const len = this.stoppedParts.push(part);
      if (len >= this.totalPartCount) {
        if (this.loaderElement) {
          this.loaderElement.removeEventListener(
            "animationiteration",
            this.onSwirlPartAnimationIteration
          );
        }
        this.setState({stopping: false, playing: false});
        this.forceUpdate();
      }
    }
  }

  private stop() {
    this.setState({stopping: true});
    if (this.loaderElement) {
      this.loaderElement.addEventListener(
        "animationiteration",
        this.onSwirlPartAnimationIteration
      );
    }
  }

  private resume() {
    this.setState({playing: true, stopping: false});
    if (this.loaderElement) {
      this.loaderElement.removeEventListener(
        "animationiteration",
        this.onSwirlPartAnimationIteration
      );
    }

    let el: HTMLDivElement | undefined;
    while ((el = this.stoppedParts.pop()) !== undefined) {
      el.classList.add("playing");
    }
  }

  public componentWillReceiveProps(props: LoaderProps) {
    // parent tells us to stop, we are still playing and stopping has not yet started
    if (props.loaded && this.state.playing && !this.state.stopping) {
      this.stop();
    }
    // parent says we should be loading but we are stopped/stopping
    else if (!props.loaded && (!this.state.playing || this.state.stopping)) {
      this.resume();
    }
  }

  public shouldComponentUpdate() {
    // never re-render if we are still playing
    return !this.state.playing;
  }

  public render() {
    if (this.props.loaded && !this.state.playing) {
      return this.props.onceLoaded();
    }

    return (
      <div className="loader" ref={(el) => {
        if (el) { this.loaderElement = el; }
      }}>
        {this.swirl(false, false, false)}
        {this.swirl(true, true, false)}
        {this.swirl(true, false, true)}
        {this.swirl(false, true, true)}
      </div>
    );
  }
}
