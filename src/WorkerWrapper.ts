import { EventStreamer } from "./EventStreamer";
import { Bind } from "./Decorators";

interface WorkerMessage {
    topic: string;
    payload: any;
}

interface WorkerWrapperGlobalScopeEventMap {
    "message": MessageEvent;
}

export interface WorkerWrapperGlobalScope {
    postMessage(message: any, transfer?: any[]): void;
    addEventListener<K extends keyof WorkerWrapperGlobalScopeEventMap>(type: K, listener: (ev: WorkerWrapperGlobalScopeEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<K extends keyof WorkerWrapperGlobalScopeEventMap>(type: K, listener: (ev: WorkerWrapperGlobalScopeEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
    terminate?(): void;
}

export class WorkerWrapper<TopicMap, SourceType extends WorkerWrapperGlobalScope = WorkerWrapperGlobalScope> extends EventStreamer<TopicMap> {
    constructor(private src: SourceType) {
        super();
        src.addEventListener("message", this.handleMessage);
    }

    private static isWellFormedMessage(msg: any): msg is WorkerMessage {
        const hasProp = Object.prototype.hasOwnProperty;
        return hasProp.call(msg, "topic") && hasProp.call(msg, "payload");
    }

    @Bind
    private handleMessage(e: MessageEvent) {
        const msg = e.data;

        if (WorkerWrapper.isWellFormedMessage(msg)) {
            this.emit(msg.topic as any, msg.payload);
        }
    }

    public postMessage<Topic extends keyof TopicMap>(topic: Topic, payload: TopicMap[Topic], ...transferables: Transferable[]) {
        this.src.postMessage({topic, payload}, transferables);
    }

    public transfer<Topic extends keyof TopicMap>(topic: Topic, payload: TopicMap[Topic] & Transferable) {
        this.src.postMessage({topic, payload}, [payload]);
    }

    public terminate() {
        super.terminate();
        this.src.removeEventListener("message", this.handleMessage);
        if (this.src.terminate) {
            this.src.terminate();
        }
    }
}
