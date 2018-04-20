import { WorkerWrapper, WorkerWrapperGlobalScope } from "./WorkerWrapper";
import { DecompressorWorkerTopic, DecompressorWorkerTopicMap, ZlibConstants } from "./Compression";
import { Inflate } from "pako";
const { Z_FINISH, Z_FULL_FLUSH } = ZlibConstants.Flush;

declare const self: WorkerWrapperGlobalScope;
const host = new WorkerWrapper<DecompressorWorkerTopicMap>(self);

async function run() {
    const decompressor = new Inflate();
    for await(const {buffer, end} of host.takeEvery(DecompressorWorkerTopic.Decompress)) {
        const flush = end ? Z_FINISH : Z_FULL_FLUSH;
        decompressor.push(buffer, flush);
        if (end) {
            break;
        }
    }
    
    if (decompressor.err) {
        throw new Error(decompressor.msg);
    }

    const result = decompressor.result;
    if (!(result instanceof Uint8Array)) {
        throw new Error("Expected decompression result to be Uint8Array");
    }

    const buf = result.buffer;
    if (!(buf instanceof ArrayBuffer)) {
        throw new Error("Decompression results underlying buffer must be a regular ArrayBuffer");
    }

    host.transfer(DecompressorWorkerTopic.DecompressionResult, buf);
}

run();
