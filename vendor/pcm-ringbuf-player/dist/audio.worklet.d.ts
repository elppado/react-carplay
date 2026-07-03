declare const RENDER_QUANTUM_FRAMES = 128;
declare const RING_POINTERS_SIZE = 8;
/**
 * A Reader class used by this worklet to read from a Adapted from a SharedArrayBuffer written to by ringbuf.js on the main thread, Adapted from https://github.com/padenot/ringbuf.js
 * MPL-2.0 License (see RingBuffer_LICENSE.txt)
 *
 * @author padenot
 */
declare class RingBuffReader {
    private storage;
    private writePointer;
    private readPointer;
    constructor(buffer: SharedArrayBuffer);
    readTo(array: Int16Array): number;
    getReadInfo(): {
        readPos: number;
        writePos: number;
        available: number;
    };
    private copy;
}
declare class PCMWorkletProcessor extends AudioWorkletProcessor {
    private underflowing;
    private reader;
    private readerOutput;
    private channels;
    constructor(options: {
        processorOptions: {
            sab: SharedArrayBuffer;
            channels: number;
        };
    });
    toFloat32(value: number): number;
    process(_: Float32Array[][], outputs: Float32Array[][]): boolean;
}
