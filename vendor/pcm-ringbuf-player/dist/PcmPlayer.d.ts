export declare class PcmPlayer {
    private workletName;
    private context;
    private gainNode;
    private channels;
    private worklet;
    private buffers;
    private sab;
    private rb;
    constructor(sampleRate: number, channels: number);
    private feedWorklet;
    getRawBuffer(): SharedArrayBuffer;
    feed(source: Int16Array): void;
    volume(volume: number, duration?: number): void;
    start(): Promise<void>;
    stop(): Promise<void>;
}
