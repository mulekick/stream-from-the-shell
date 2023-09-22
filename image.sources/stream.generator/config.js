/* eslint-disable node/no-process-env */

// import primitives
import process from "node:process";

const
    // base directory
    baseDir = process.cwd(),
    // init config and options
    config = {
        // stream queue
        QUEUE_DIRECTORY: `${ baseDir }/${ process.env.NODE_ENV === `production` ? `` : `../` }/stream.queue`,
        QUEUE_FILE_STABILITY_THRESHOLD: 2e3,
        // sources probe
        SOURCE_PROBE_COMMAND: `${ baseDir }/scripts/probe.slot.sh`,
        // stream slots
        SLOTS_DEFAULT: `${ baseDir }/default.slot.flv`,
        SLOTS_PREFIX: `slot`,
        SLOTS_EXTENSION: `.flv`,
        SLOTS_RESET_TIMEOUT: 2.5e3,
        SLOTS_DIRECTORY: `${ baseDir }/stream.slots`,
        SLOTS_LIST_NAME: `.slots.list`,
        // stream initialization command
        STREAM_START_COMMAND: `${ baseDir }/scripts/stream.start.sh`,
        // ingestion endpoint and passphrase
        TWITCH_ENDPOINT: process.env.TWITCH_ENDPOINT,
        TWITCH_STREAM_KEY: process.env.TWITCH_STREAM_KEY
    };

export default config;