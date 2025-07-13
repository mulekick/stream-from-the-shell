/**
 * `--restream` command management.
 * @module
 * @remarks
 * - the main export returns a promisified ffmpeg subprocess.
 * - the design is fully asynchronous and event-driven.
 */

/* eslint-disable n/no-process-env */

// import primitives
import process from "node:process";
import console from "node:console";
import {spawn} from "node:child_process";

// import modules
import config from "./config.ts";

// import types
import type {Buffer} from "node:buffer";
import type {ChildProcess} from "node:child_process";

// destructure config values
const {RESTREAM_START_COMMAND, TWITCH_ENDPOINT} = config;

/**
 * sync: callback for ffmpeg subprocess exit
 */
const onSpawnedProcessExit = (code: number | null, signal: NodeJS.Signals | null): void => {
    // log ffmpeg exit condition
    console.log(code ? `ffmpeg exited with code ${ String(code) }` : signal ? `ffmpeg exited after receiving ${ signal }` : `something went really wrong monkaS`);
    // gracefully exit process at this stage ...
};

/**
 * sync: callback for ffmpeg subpocess stderr events
 */
const onSpawnedProcessMessage = (d: Buffer | string): void => {
    // decode
    const msg: string = d.toString(`utf8`);
    // log to stdout
    console.log(msg);
};

/**
 * async: create promisifed ffmpeg subprocess
 * start restreaming playlist immediately
 */
const restream = (playlist: string): Promise<ChildProcess> => {

    // ---------------------------------------------------
    // --------------- SPAWN FFMPEG PROCESS --------------
    // ------- initialize first mile srt live stream -----
    // ---------------------------------------------------

    const restreamer: ChildProcess = spawn(RESTREAM_START_COMMAND, [ playlist, TWITCH_ENDPOINT ], {
        // default subprocess env
        env: process.env,
        // pipe stderr to spawned subprocess
        stdio: [ `ignore`, `ignore`, `pipe` ],
        // terminate on current process exit
        detached: false
    });

    // typescript (stdout ignored)
    if (typeof restreamer === `undefined` || !restreamer.stderr)
        throw new Error(`failed to spawn ffmpeg process.`);

        // ---------------------------------------------------
        // ------------- ADD FFMPEG EVENT HANDLERS -----------
        // ------- monitor, format and log ffmpeg output -----
        // ---------------------------------------------------

    // the 'close' event is never received by the main process when running inside a container
    restreamer.on(`exit`, onSpawnedProcessExit);

    // process ffmpeg messages ...
    restreamer.stderr.on(`data`, onSpawnedProcessMessage);

    // return
    return Promise.resolve(restreamer);
};

export default restream;