import { WorkerWrapper } from "./WorkerWrapper";

export namespace ZlibConstants {
    export enum Flush {
        Z_NO_FLUSH = 0,
        Z_PARTIAL_FLUSH = 1,
        Z_SYNC_FLUSH = 2,
        Z_FULL_FLUSH = 3,
        Z_FINISH = 4,
        Z_BLOCK = 5,
        Z_TREES = 6
    }
    
    export enum Return {
        Z_OK = 0,
        Z_STREAM_END = 1,
        Z_NEED_DICT = 2,
        Z_ERRNO = -1,
        Z_STREAM_ERROR = -2,
        Z_DATA_ERROR = -3,
        Z_MEM_ERROR = -4,
        Z_BUF_ERROR = -5,
        Z_VERSION_ERROR = -6
    }
    
    export enum Level {
        Z_NO_COMPRESSION = 0,
        Z_BEST_SPEED = 1,
        Z_BEST_COMPRESSION = 9,
        Z_DEFAULT_COMPRESSION = -1
    }

    export enum Strategy {
        Z_FILTERED = 1,
        Z_HUFFMAN_ONLY = 2,
        Z_RLE = 3,
        Z_FIXED = 4,
        Z_DEFAULT_STRATEGY = 0
    }

    export enum DataType {
        Z_BINARY = 0,
        Z_TEXT = 1,
        Z_ASCII = Z_TEXT,
        Z_UNKNOWN = 2
    }

    export enum Method {
        Z_DEFLATED = 8
    }
}

export enum CompressorWorkerTopic {
    Compress = "Compress",
    CompressionResult = "CompressionResult"
}

export enum DecompressorWorkerTopic {
    Decompress = "Decompress",
    DecompressionResult = "DecompressionResult"
}

export interface CompressorWorkerTopicMap {
    [CompressorWorkerTopic.Compress]: ArrayBuffer;
    [CompressorWorkerTopic.CompressionResult]: ArrayBuffer;
}

export interface DecompressorWorkerTopicMap {
    [DecompressorWorkerTopic.Decompress]: {
        buffer: ArrayBuffer;
        end: boolean;
    };
    [DecompressorWorkerTopic.DecompressionResult]: ArrayBuffer;
}

export class Decompressor {
    private worker = new WorkerWrapper<DecompressorWorkerTopicMap, Worker>(new Worker("/DecompressorWorker.js"));
    public result: Uint8Array | string | undefined;
    private prevChunk: ArrayBuffer | undefined;

    constructor() {}

    public addChunk(data: Uint8Array) {
        const buf = data.buffer;
        if (buf instanceof ArrayBuffer) {
            if (this.prevChunk) {
                this.worker.postMessage(DecompressorWorkerTopic.Decompress, {buffer: this.prevChunk, end: false}, this.prevChunk);
            }
            this.prevChunk = buf;
        } else {
            throw new Error("Chunks underlying buffer must be a regular ArrayBuffer");
        }
    }

    public async getResult(): Promise<Uint8Array>;
    public async getResult(asString: false): Promise<Uint8Array>; // tslint:disable-line
    public async getResult(asString: true): Promise<string>;
    public async getResult(asString: boolean): Promise<Uint8Array | string>;
    public async getResult(asString = false): Promise<Uint8Array | string> {
        if (this.result) {
            return this.result;
        }

        if (!this.prevChunk) {
            throw new Error("Failed to end compressor: Last chunk missing");
        }

        this.worker.postMessage(DecompressorWorkerTopic.Decompress, {buffer: this.prevChunk, end: true}, this.prevChunk);

        let result: Uint8Array | string = new Uint8Array(await this.worker.takeOne(DecompressorWorkerTopic.DecompressionResult));
        this.worker.terminate();
        if (asString) {
            const textDecoder = new TextDecoder();
            result = textDecoder.decode(result);
        }
        this.result = result;
        return result;
    }
}

export async function compress(data: Uint8Array | string): Promise<Uint8Array> {
    if (typeof data === "string") {
        const textEncoder = new TextEncoder();
        data = textEncoder.encode(data);
    }
    
    const buf = data.buffer;
    if (buf instanceof ArrayBuffer) {
        const worker = new WorkerWrapper<CompressorWorkerTopicMap>(new Worker("/CompressorWorker.js"));
        worker.transfer(CompressorWorkerTopic.Compress, buf);
        const result = new Uint8Array(await worker.takeOne(CompressorWorkerTopic.CompressionResult));
        worker.terminate();
        return result;
    } else {
        throw new Error("Chunks underlying buffer must be a regular ArrayBuffer");
    }
}
