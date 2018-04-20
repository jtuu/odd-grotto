import { WorkerWrapper, WorkerWrapperGlobalScope } from "./WorkerWrapper";
import { CompressorWorkerTopic, CompressorWorkerTopicMap } from "./Compression";
import { deflate } from "pako";

declare const self: WorkerWrapperGlobalScope;
const host = new WorkerWrapper<CompressorWorkerTopicMap>(self);

async function run() {
    const data = await host.takeOne(CompressorWorkerTopic.Compress);
    const result = deflate(new Uint8Array(data));

    const buf = result.buffer;
    if (!(buf instanceof ArrayBuffer)) {
        throw new Error("Decompression results underlying buffer must be a regular ArrayBuffer");
    }

    host.transfer(CompressorWorkerTopic.CompressionResult, buf);
}

run();
