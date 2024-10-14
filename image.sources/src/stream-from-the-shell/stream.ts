/* eslint-disable node/no-process-env */

// import primitives
import process from "node:process";
import console from "node:console";
import {Buffer} from "node:buffer";
import {ChildProcess, spawn} from "node:child_process";
import {copyFile, rm} from "node:fs/promises";

// import modules
import chokidar from "chokidar";
import logUpdate from "log-update";
import AsciiTable from "ascii-table";
import chalk from "chalk";
import config from "./config.ts";
import ProgramState from "./helpers/state.ts";
import probeSlots from "./helpers/probe.ts";
import {computeTimestamps, decodeTimer} from "./helpers/utils.ts";

// import interfaces
import {StreamingSlot} from "../interfaces.ts";

const

    // destructure config values
    {STREAM_START_COMMAND, QUEUE_DIRECTORY, SLOTS_PREFIX, SLOTS_EXTENSION, SLOTS_DEFAULT, SLOTS_LIST_NAME, SLOTS_LIST_LENGTH, SLOTS_DIRECTORY, SLOTS_RESET_TIMEOUT, QUEUE_FILE_STABILITY_THRESHOLD, TWITCH_ENDPOINT} = config,

    // chokidar file watcher options
    FSWATCHER_OPTIONS: Record<string, unknown> = {
        // keep the process running as long as the watcher is running
        persistent: true,
        // do not notify for the initial files
        ignoreInitial: true,
        // wait for the copy to complete before emitting the event
        awaitWriteFinish: {
            // emit change event after file size remains constant for x milliseconds
            stabilityThreshold: QUEUE_FILE_STABILITY_THRESHOLD,
            // file size polling interval
            pollInterval: 1e2
        }
    },

    // reset to default slot when encoding for current slot is done
    slotResetCallback = async(slots: Array<StreamingSlot>, defaultSlot: StreamingSlot, slotIndexToReset: number): Promise<void> => {
        // replace file
        await copyFile(defaultSlot.filename, slots[slotIndexToReset].filename);
        // mark the slot as available again
        delete slots[slotIndexToReset].pendingReset;
    },

    // subprocess exit callback
    onSpawnedProcessExit = (fileWatcher: chokidar.FSWatcher, code: number | null, signal: NodeJS.Signals | null): void => {
        // log ffmpeg exit condition
        console.log(code ? `ffmpeg exited with code ${ String(code) }` : signal ? `ffmpeg exited after receiving ${ signal }` : `something went really wrong monkaS`);
        // use an immediate to enqueue reset callback
        setImmediate((): void => {
            // stop chokidar
            void (async() => {
                console.log(`stopping file watcher ...`);
                await fileWatcher.close();
            })();
        });

        // gracefully exit process at this stage ...
    },

    // parameter are mutated on purpose here ...
    onSpawnedProcessMessage = (slots: Array<StreamingSlot>, defaultSlot: StreamingSlot, d: Buffer | string): void => {
        const
            // decode
            msg: string = d.toString(`utf8`),
            // search pattern
            pos: number = msg.indexOf(`time=`),
            // isolate time
            t: string | null = pos >= 0 ? msg.substring(pos + 5, msg.indexOf(` `, pos + 5)) : null;

        // discard irrelevant messages (explicit comparison bc boolean vs undefined situation ...)
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-boolean-literal-compare
        if (t === null || ProgramState.instance.processStdErrMsgs === false)
            return;

        const
            // read ffmpeg stderr timer
            ffmpegTimer = decodeTimer(t),
            // compute additional encoded time
            justTranscoded = ffmpegTimer - ProgramState.instance.transcodedTime;

        // update ffmpeg local timer
        ProgramState.instance.transcodedTime = ffmpegTimer;

        // identify current streaming time
        ProgramState.instance.elapsedTime = Math.max((ProgramState.instance.elapsedTime + justTranscoded) % ProgramState.instance.totalLoopTime, justTranscoded);

        // process stops when it happens iirc
        if (justTranscoded < 0)
            throw new RangeError(`last transcoded time less than zero ${ String(justTranscoded) } ms ...\nmessage: ${ msg }\nffmpeg timer: ${ String(ffmpegTimer) }\nlocal timer: ${ String(ProgramState.instance.transcodedTime) }`);

        const
            // identify the slot being transcoded
            nslot = slots.findIndex(x => x.timestamp > ProgramState.instance.elapsedTime),
            // create new objects so as not to mutate the slots array
            tempSlot = nslot === -1 ? {...slots[slots.length - 1]} : {...slots[nslot - 1]};

        // detect encoding slot change
        if (!ProgramState.instance.currentSlot.isDefault && ProgramState.instance.currentSlot.index !== tempSlot.index) {

            // extract transcoded slot properties
            const {filename, index, duration} = ProgramState.instance.currentSlot;

            // replace transcoded slot by default slot
            slots.splice(ProgramState.instance.currentSlot.index, 1, {
                // spread default slot probe
                ...defaultSlot,
                // preserve slot filename
                filename,
                // and index
                index,
                // and mark the file for reset
                pendingReset: true
            });

            // set the timeout for resetting the file - concat demuxer clock can lag up to
            // 1 second behind mpegts muxer clock, which can cause premature replacing of files
            setTimeout((): void => {
                slotResetCallback(slots, defaultSlot, index)
                    .catch((err: unknown) => {
                        // log to stderr
                        console.error(err instanceof Error ? err.message : `unknown error`);
                        // exit with error
                        process.exit(1);
                    });
            }, SLOTS_RESET_TIMEOUT);

            // recompute slots timestamps
            computeTimestamps(slots);

            // update total stream loop time
            ProgramState.instance.totalLoopTime += defaultSlot.duration - duration;

            // decrease elapsedTime by the duration of the media just discarded
            // only if the removed slot is before the currently encoding slot ...
            if (tempSlot.index > index)
                ProgramState.instance.elapsedTime += defaultSlot.duration - duration;
        }

        // format log
        const table = new AsciiTable(`live streaming (${ String(ProgramState.instance.elapsedTime / 1e3) }/${ String(ProgramState.instance.totalLoopTime / 1e3) } s)`, {})
            .setHeading(`slot`, `start time`, `program`, `duration`, `current`)
            // populate
            .addRowMatrix(slots.map(x => [
                // index
                x.index + 1,
                // timestamp
                `${ String(Math.floor(x.timestamp / 1e3)) } s`,
                // status
                (x.pendingReset ? `<pending reset ...>` : x.isDefault ? `<available>` : x.source).split(`/`).pop(),
                // duration
                `${ String(Math.floor(Math.round(x.duration / 1e3) / 60)) } mn ${ String(Math.round(x.duration / 1e3) % 60) } s`,
                // play indicator
                x.index === ProgramState.instance.currentSlot.index ? `<--` : ``
            ]));

        // write to stdout
        logUpdate(`${ chalk.black.bold.bgCyan(table.toString()) }\nTotal streaming time: ${ t }`);

        // update the slot being transcoded
        ProgramState.instance.currentSlot = tempSlot;
    },

    // add file to the transcoding queue on copy ...
    onFileAddedToStreamQueue = async(slots: Array<StreamingSlot>, defaultSlot: StreamingSlot, path: string): Promise<void> => {
        // check file format
        if (path.endsWith(SLOTS_EXTENSION)) {

            // probe transcoded file
            const [ transcodedProbe ] = await probeSlots(`incoming_video`, null, path);

            // retrieve first available slot ...
            let availableSlot = null;

            // seek next available slot from currently transcoding index (exclude slots pending for reset)
            availableSlot = slots.slice(ProgramState.instance.currentSlot.index + 1).find(x => x.isDefault && typeof x.pendingReset === `undefined`);

            // if none is available, resume seeking from the start of the array (exclude slots pending for reset)
            availableSlot = typeof availableSlot === `undefined` ? slots.find(x => x.isDefault && typeof x.pendingReset === `undefined`) : availableSlot;

            // no slots available Sadge
            if (typeof availableSlot === `undefined`) {

                // console.log(`no slots available, discarding new video ...`);

            } else {

                // extract selected slot properties
                const {filename, index} = availableSlot;

                // log
                // console.log(`pushing new video ${ filename } in slot ${ index }...`);

                // pause processing of stderr messages while file copy is in progress ...
                ProgramState.instance.processStdErrMsgs = false;

                // replace selected slot file by transcoded probe file
                await copyFile(transcodedProbe.filename, filename);

                // resume stderr messages processing (no race condition here ...)
                // eslint-disable-next-line require-atomic-updates
                ProgramState.instance.processStdErrMsgs = true;

                // copy transcoded probe to selected slot
                slots.splice(index, 1, {...transcodedProbe, filename, index});

                // recompute slots timestamps
                computeTimestamps(slots);

                // update total stream time
                ProgramState.instance.totalLoopTime += transcodedProbe.duration - defaultSlot.duration;

                // increase elapsedTime by the duration of the media just added
                // only if it is added before the slot currently being transcoded ...
                if (availableSlot.index < ProgramState.instance.currentSlot.index)
                    ProgramState.instance.elapsedTime += transcodedProbe.duration - defaultSlot.duration;

                // remove the source file
                await rm(transcodedProbe.filename, {force: true});
            }
        }
    },

    // start processing transcoding queue
    stream = async(): Promise<ChildProcess> => {

        try {

                // ---------------------------------------------------
                // ----------- INITIALIZE STREAMING SLOTS ------------
                // ---- slots number must be sync with slots list ----
                // ---------------------------------------------------

            console.log(`initializing streaming slots ...`);

            // eslint-disable-next-line newline-per-chained-call
            await Promise.all(new Array(SLOTS_LIST_LENGTH).fill(null).map((_, i) => copyFile(SLOTS_DEFAULT, `${ SLOTS_DIRECTORY }/${ SLOTS_PREFIX }${ String(i) }${ SLOTS_EXTENSION }`)));

            console.log(`streaming slots initialization complete.`);

            const

                // retrieve default slot probe
                [ defaultSlot ] = await probeSlots(`default_slot`, null, null),

                // retrieve slot probes
                slots = await probeSlots(`streaming_slots`, defaultSlot, null);

                // ---------------------------------------------------
                // ---------------- CREATE SINGLETON -----------------
                // ---- use singleton instead of global variables ----
                // ---------------------------------------------------

            // compute total time in seconds (slice to avoid mutating slots array)
            ProgramState.instance.totalLoopTime = computeTimestamps(slots);

            // init current slot (slot currently being transcoded) monkaS destructuring pattern
            [ ProgramState.instance.currentSlot ] = slots;

            // total transcoded time
            ProgramState.instance.transcodedTime = 0;

            // elapsed time in the current stream loop
            ProgramState.instance.elapsedTime = 0;

            const

                // ---------------------------------------------------
                // --------------- CREATE FILE WATCHER ---------------
                // ---- monitor stream queue for new video sources ---
                // ---------------------------------------------------

                watchr: chokidar.FSWatcher = chokidar.watch(QUEUE_DIRECTORY, FSWATCHER_OPTIONS),

                // ---------------------------------------------------
                // --------------- SPAWN FFMPEG PROCESS --------------
                // ------- initialize first mile srt live stream -----
                // ---------------------------------------------------

                streamGenerator: ChildProcess = spawn(STREAM_START_COMMAND, [ SLOTS_DIRECTORY, SLOTS_LIST_NAME, TWITCH_ENDPOINT ], {
                    // default subprocess env
                    env: process.env,
                    // pipe stderr to spawned subprocess
                    stdio: [ `ignore`, `ignore`, `pipe` ],
                    // terminate on current process exit
                    detached: false
                });

            // typescript (stdout ignored)
            if (typeof streamGenerator === `undefined` || !streamGenerator.stderr)
                throw new Error(`failed to spawn ffmpeg process.`);

            // ---------------------------------------------------
            // ------------- ADD FFMPEG EVENT HANDLERS -----------
            // ------- monitor, format and log ffmpeg output -----
            // ---------------------------------------------------

            // ffmpeg handles freeing of the already transcoded slots
            streamGenerator.stderr.on(`data`, onSpawnedProcessMessage.bind(null, slots, defaultSlot));

            // the 'close' event is never received by the main process when running inside a container
            // as a result, QUEUE_DIRECTORY contents is not auto erased once the ffmpeg process ends
            streamGenerator.on(`exit`, onSpawnedProcessExit.bind(null, watchr));

            // ---------------------------------------------------
            // ----------- ADD FILE WATCHER EVENT HANDLERS -------
            // -- inject incoming video sources into the stream --
            // ---------------------------------------------------

            // add event listeners
            watchr.on(`add`, (path: string): void => {
                onFileAddedToStreamQueue(slots, defaultSlot, path)
                    .catch((err: unknown) => {
                        // log to stderr
                        console.error(err instanceof Error ? err.message : `unknown error`);
                        // exit with error
                        process.exit(1);
                    });
            });

            // return
            return streamGenerator;

        } catch (err: unknown) {
            // pass rejected promise to calling function
            throw new Error(err instanceof Error ? err.message : `unknown error`);
        }
    };

export default stream;