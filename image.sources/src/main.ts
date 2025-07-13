/**
 * Main process file.
 * @module
 * @remarks
 * - command `--stream` will loop over available streaming slots.
 * - command `--restream` will rebroadcast an existing HLS playlist.
 * - process and subprocess will exit once a given signal is received.
 */

// import primitives
import process from "node:process";
import console from "node:console";
import {once} from "node:events";

// import modules
import config from "./config.ts";
import stream from "./stream.ts";
import restream from "./restream.ts";

// import types
import type internal from "node:stream";
import type {ChildProcess} from "node:child_process";

// destructure config values
const {EXIT_SIGNAL} = config;

/**
 * main function
 */
void (async() => {

    try {

        // read optional params ...
        const params: Array<string> = process.argv.slice(2);

        // ...
        let spawnedProcess: ChildProcess | null = null;

        // no streaming mode specified
        if (params.length === 0) {

            // throw
            throw new Error(`no streaming mode was specified.`);

        // default mode relying on CMD directive
        } else if (params[0] === `--stream`) {

            // start auto-generated stream
            spawnedProcess = await stream();

        // alternative mode relying on ENTRYPOINT directive
        } else if (params[0] === `--restream`) {

            // check playlist format
            if (typeof params[1] === `string` && params[1].length > 0)
                // start restreaming existing playlist
                spawnedProcess = await restream(params[1]);
            else
                // throw
                throw new Error(`please provide master playlist location`);

        } else {

            // throw
            throw new Error(`invalid streaming mode.`);

        }

        // ---------------------------------------------------
        // ----------- ADD MAIN PROCESS EVENT HANDLERS -------
        // ---- send termination signal to ffmpeg and exit ---
        // ---------------------------------------------------

        await once(process, EXIT_SIGNAL);

        console.debug(`process received ${ EXIT_SIGNAL }, stopping stream ...`);

        // stop processing ffmpeg output ...
        (spawnedProcess.stderr as internal.Readable).removeAllListeners(`data`);

        // send termination signal to ffmpeg
        spawnedProcess.kill(`SIGTERM`);

        // wait until spawned subprocess closes ...
        await once(spawnedProcess, `close`);

        // log main process exit condition
        await once(process, `exit`);

        console.log(`main process exited with code ${ String(process.exitCode) }`);

    } catch (err: unknown) {
        // log to stderr
        console.error(err instanceof Error ? err.message : `unknown error`);
        // exit with error
        process.exit(1);
    }

})();