type EventIdentifier = any;
type EventHandler = Function;

export class EventEmitter {
    private handlerStore: Map<EventIdentifier, Set<EventHandler>> = new Map();

    constructor() {}

    public addEventListener(eventId: EventIdentifier, handler: EventHandler) {
        let handlers = this.handlerStore.get(eventId);

        if (!handlers) {
            handlers = new Set();
            this.handlerStore.set(eventId, handlers);
        }

        handlers.add(handler);
    }

    public removeEventListener(eventId: EventIdentifier, handler: EventHandler) {
        const handlers = this.handlerStore.get(eventId);

        if (handlers) {
            handlers.delete(handler);
            if (handlers.size <= 0) {
                this.handlerStore.delete(eventId);
            }
        }
    }

    public on = this.addEventListener.bind(this);

    public once(eventId: EventIdentifier, handler: EventHandler) {
        let handlers = this.handlerStore.get(eventId);

        if (!handlers) {
            handlers = new Set();
            this.handlerStore.set(eventId, handlers);
        }

        const wrap = () => {
            handler();
            handlers!.delete(wrap);
        };

        handlers.add(wrap);
    }

    public emit(eventId: EventIdentifier, payload: any) {
        const handlers = this.handlerStore.get(eventId);

        if (handlers) {
            for (const handler of handlers) {
                handler(payload);
            }
        }
    }
}