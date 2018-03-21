import { AsyncStream } from "./AsyncStream";

interface EventStreamerEventMap {
    [eventId: string]: any;
}

const nameTag = Symbol();
type EventStream<EventMap extends EventStreamerEventMap = EventStreamerEventMap> = AsyncStream<EventMap[keyof EventMap]> & {[nameTag]: string};

export class EventStreamer<EventMap extends EventStreamerEventMap = EventStreamerEventMap> {
    private static streamHighSize = 10;
    private streamStore: Map<keyof EventMap, EventStream<EventMap>> = new Map();

    constructor() {}

    private getStream<EventID extends keyof EventMap>(eventId: EventID): EventStream<EventMap> {
        let stream = this.streamStore.get(eventId);

        if (!stream) {
            const newStream = new AsyncStream(true);
            stream = EventStreamer.setStreamName(newStream, eventId);

            this.streamStore.set(eventId, stream);
        }

        return stream;
    }

    private static setStreamName(stream: AsyncStream, name: string): EventStream {
        const tagged: any = stream;
        tagged[nameTag] = name;
        return tagged as EventStream;
    }

    private static getStreamName(stream: EventStream): string {
        return String(stream[nameTag]);
    }

    private cleanUpStream(stream: EventStream<EventMap>) {
        if (stream.consumerCount <= 0) {
            stream.terminate();
            this.streamStore.delete(EventStreamer.getStreamName(stream));
        }
    }

    public async *takeEvery<EventID extends keyof EventMap>(eventId: EventID): AsyncIterableIterator<EventMap[EventID]> {
        const stream = this.getStream(eventId);
        yield* stream;
        this.cleanUpStream(stream);
    }

    public async *takeN<EventID extends keyof EventMap>(eventId: EventID, n: number): AsyncIterableIterator<EventMap[EventID]> {
        if (n <= 0) {
            return;
        }

        const stream = this.getStream(eventId);

        let i = 0;
        for await(const item of stream) {
            yield item;
            if (++i >= n) {
                break;
            }
        }

        this.cleanUpStream(stream);
    }

    public async takeOne<EventID extends keyof EventMap>(eventId: EventID): Promise<EventMap[EventID]> {
        const stream = this.getStream(eventId);
        const value = (await stream[Symbol.asyncIterator]().next()).value;
        this.cleanUpStream(stream);
        return value;
    }

    public emit<EventID extends keyof EventMap>(eventId: EventID, payload: EventMap[EventID]) {
        const stream = this.getStream(eventId);

        if (stream.size >= EventStreamer.streamHighSize) {
            console.warn(`Stream of "${eventId}" is backing up. ${stream.size} items in backlog.`);
        }

        stream.add(payload);
    }

    public terminate() {
        for (const stream of this.streamStore.values()) {
            stream.terminate();
        }
    }
}