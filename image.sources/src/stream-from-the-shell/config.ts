/* eslint-disable node/no-process-env */

// import primitives
import process from "node:process";

// import modules
import {DefaultConfig} from "../interfaces.ts";

const

    // base directory
    baseDir = process.cwd(),

    // init config and options
    config: DefaultConfig = {
        // stream queue
        QUEUE_DIRECTORY: `${ baseDir }/${ process.env.NODE_ENV === `production` ? `` : `..` }/stream.queue`,
        QUEUE_FILE_STABILITY_THRESHOLD: 2.5e3,
        // sources probe
        SOURCE_PROBE_COMMAND: `${ baseDir }/scripts/probe.slot.sh`,
        // stream slots
        SLOTS_PREFIX: `slot`,
        SLOTS_EXTENSION: `.flv`,
        SLOTS_DEFAULT: `${ baseDir }/default.slot.flv`,
        SLOTS_LIST_NAME: `.slots.list`,
        SLOTS_LIST_LENGTH: 40,
        SLOTS_DIRECTORY: `${ baseDir }/stream.slots`,
        SLOTS_RESET_TIMEOUT: 5e3,
        // stream initialization command
        STREAM_START_COMMAND: `${ baseDir }/scripts/stream.start.sh`,
        RESTREAM_START_COMMAND: `${ baseDir }/scripts/restream.playlist.sh`,
        // ingestion endpoint and passphrase
        TWITCH_ENDPOINT: process.env.TWITCH_ENDPOINT || ``
    };

export default config;