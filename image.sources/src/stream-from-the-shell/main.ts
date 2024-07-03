// import primitives
import process from "node:process";
import console from "node:console";
import {ChildProcess} from "node:child_process";
import internal from "node:stream";
import {once} from "node:events";

// import modules
import stream from "./stream.ts";
import restream from "./restream.ts";

(async() => {

    try {

        // read optional params ...
        const params:Array<string> = process.argv.slice(2);

        // ...
        let spawnedProcess:ChildProcess | null = null;

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

        await once(process, `SIGINT`);

        console.debug(`process received SIGINT, stopping stream ...`);

        // stop processing ffmpeg output ...
        (spawnedProcess.stderr as internal.Readable).removeAllListeners(`data`);

        // send termination signal to ffmpeg
        spawnedProcess.kill(`SIGTERM`);

        // wait until spawned subprocess closes ...
        await once(spawnedProcess, `close`);

        // log main process exit condition
        await once(process, `exit`);

        console.log(`main process exited with code ${ process.exitCode }`);

    } catch (err:unknown) {
        // log to stderr
        console.error(err instanceof Error ? err.message : `unknown error`);
        // exit with error
        process.exit(1);
    }

})();