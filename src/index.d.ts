///<reference path="../node_modules/@types/webrtc/index.d.ts"/>

declare module "*firebase-config.json"{
  export const apiKey: string;
  export const databaseURL: string;
}

declare module "*ice-servers.json"{
  const servers: RTCIceServer[];
  export default servers;
}

declare module "*branding.json"{
  export const github: string;
  export const discord: string;
}

interface HTMLElementEventMap extends ElementEventMap{
  "abort": UIEvent;
  "activate": UIEvent;
  "animationiteration": AnimationEvent;
  "beforeactivate": UIEvent;
  "beforecopy": ClipboardEvent;
  "beforecut": ClipboardEvent;
  "beforedeactivate": UIEvent;
  "beforepaste": ClipboardEvent;
  "blur": FocusEvent;
  "canplay": Event;
  "canplaythrough": Event;
  "change": Event;
  "click": MouseEvent;
  "contextmenu": PointerEvent;
  "copy": ClipboardEvent;
  "cuechange": Event;
  "cut": ClipboardEvent;
  "dblclick": MouseEvent;
  "deactivate": UIEvent;
  "drag": DragEvent;
  "dragend": DragEvent;
  "dragenter": DragEvent;
  "dragleave": DragEvent;
  "dragover": DragEvent;
  "dragstart": DragEvent;
  "drop": DragEvent;
  "durationchange": Event;
  "emptied": Event;
  "ended": MediaStreamErrorEvent;
  "error": ErrorEvent;
  "focus": FocusEvent;
  "input": Event;
  "invalid": Event;
  "keydown": KeyboardEvent;
  "keypress": KeyboardEvent;
  "keyup": KeyboardEvent;
  "load": Event;
  "loadeddata": Event;
  "loadedmetadata": Event;
  "loadstart": Event;
  "mousedown": MouseEvent;
  "mouseenter": MouseEvent;
  "mouseleave": MouseEvent;
  "mousemove": MouseEvent;
  "mouseout": MouseEvent;
  "mouseover": MouseEvent;
  "mouseup": MouseEvent;
  "mousewheel": WheelEvent;
  "MSContentZoom": UIEvent;
  "MSManipulationStateChanged": MSManipulationEvent;
  "paste": ClipboardEvent;
  "pause": Event;
  "play": Event;
  "playing": Event;
  "progress": ProgressEvent;
  "ratechange": Event;
  "reset": Event;
  "scroll": UIEvent;
  "seeked": Event;
  "seeking": Event;
  "select": UIEvent;
  "selectstart": Event;
  "stalled": Event;
  "submit": Event;
  "suspend": Event;
  "timeupdate": Event;
  "volumechange": Event;
  "waiting": Event;
}

declare interface DOMEventTarget extends EventTarget{
  addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLEmbedElement, ev: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLEmbedElement, ev: HTMLElementEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}


declare type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;
