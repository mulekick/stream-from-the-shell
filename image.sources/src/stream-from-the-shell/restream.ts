/* eslint-disable no-undef, node/no-process-env */

// import primitives
import process from "node:process";
import console from "node:console";
import {ChildProcess, spawn} from "node:child_process";

// import modules
import config from "./config.ts";

const

    // destructure config values
    {RESTREAM_START_COMMAND, TWITCH_ENDPOINT} = config,

    // subprocess exit callback
    onSpawnedProcessExit = (code:number | null, signal:NodeJS.Signals | null):void => {
        // log ffmpeg exit condition
        console.log(code ? `ffmpeg exited with code ${ code }` : signal ? `ffmpeg exited after receiving ${ signal }` : `something went really wrong monkaS`);
        // gracefully exit process at this stage ...
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSpawnedProcessMessage = (d:any):void => {
        // decode
        const msg:string = d.toString(`utf8`);
        // log to stdout
        console.log(msg);
    },

    restream = (playlist:string):Promise<ChildProcess> => {

        try {

            const

                // ---------------------------------------------------
                // --------------- SPAWN FFMPEG PROCESS --------------
                // ------- initialize first mile srt live stream -----
                // ---------------------------------------------------

                restreamer:ChildProcess = spawn(RESTREAM_START_COMMAND, [ playlist, TWITCH_ENDPOINT ], {
                    // default subprocess env
                    env: process.env,
                    // pipe stderr to spawned subprocess
                    stdio: [ `ignore`, `ignore`, `pipe` ],
                    // terminate on current process exit
                    detached: false
                });

            // typescript (stdout ignored)
            if (restreamer === null || restreamer.stderr === null)
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

        } catch (err:unknown) {
            // pass rejected promise to calling function
            return Promise.reject(err instanceof Error ? err.message : `unknown error`);
        }
    };

export default restream;