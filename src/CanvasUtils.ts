import { Bind } from "./Decorators";

class CanvasUtils{
  private osc: HTMLCanvasElement; // offscreen canvas
  private octx: CanvasRenderingContext2D;

  constructor() {
    this.osc = document.createElement("canvas");
    const ctx = this.osc.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }
    this.octx = ctx;
  }

  private clear() {
    this.octx.clearRect(0, 0, this.osc.width, this.osc.height);
  }

  @Bind
  public drawAsImage(canvasWidth: number, canvasHeight: number, callback: (ctx: CanvasRenderingContext2D) => void): Promise<HTMLImageElement> {
    this.clear();
    this.osc.width = canvasWidth;
    this.osc.height = canvasHeight;

    callback(this.octx);
    
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        resolve(img);
      };
      img.onerror = reject;

      img.src = this.osc.toDataURL();
    });
  }
}

const instance = new CanvasUtils();

export const drawAsImage = instance.drawAsImage;
