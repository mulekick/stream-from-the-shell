/**
 * Project types definitions.
 * @module
 * @remarks
 * - no parsing since this project does not rely on user input.
 * - as a result, types are static and not extrapolated from parsers.
 */

/**
 * main config signature
 * @useDeclaredType
 */
export interface DefaultConfig {
    // stream queue
    QUEUE_DIRECTORY: string;
    QUEUE_FILE_STABILITY_THRESHOLD: number;
    // sources probe
    SOURCE_PROBE_COMMAND: string;
    // stream slots
    SLOTS_PREFIX: string;
    SLOTS_EXTENSION: string;
    SLOTS_DEFAULT: string;
    SLOTS_LIST_NAME: string;
    SLOTS_LIST_LENGTH: number;
    SLOTS_DIRECTORY: string;
    SLOTS_RESET_TIMEOUT: number;
    // stream initialization command
    STREAM_START_COMMAND: string;
    RESTREAM_START_COMMAND: string;
    // ingestion endpoint
    TWITCH_ENDPOINT: string;
    // process exit signal
    EXIT_SIGNAL: `SIGTERM` | `SIGINT`;
}

/**
 * media file probes types
 * @useDeclaredType
 */
export type ProbeType = `default_slot` | `streaming_slots` | `incoming_video`;

/**
 * media file probe signature
 * @useDeclaredType
 */
export interface ProbeResult {
    format: {
        filename: string;
    } & Record<string, unknown>;
}

/**
 * streaming slot signature
 * @useDeclaredType
 */
export interface StreamingSlot {
    filename: string;
    size: number;
    duration: number;
    isDefault: boolean;
    index: number;
    source: string;
    timestamp: number;
    pendingReset?: boolean;
}

/**
 * program state signature
 * @useDeclaredType
 */
export interface StateSignature {
    // slot currently being transcoded
    currentSlot: StreamingSlot;
    // current total loop time in seconds
    totalLoopTime: number;
    // current transcoded time
    transcodedTime: number;
    // elapsed time in the current loop
    elapsedTime: number;
    // stderr messages processing flag ...
    processStdErrMsgs: boolean;
}