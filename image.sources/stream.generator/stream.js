// import primitives
import process from "node:process";
import console from "node:console";
import {spawn} from "node:child_process";
import {copyFile, rm} from "node:fs/promises";

// import modules
import chokidar from "chokidar";
import logUpdate from "log-update";
import AsciiTable from "ascii-table";
import chalk from "chalk";
import config from "./config.js";
import probeSlots from "./probe.js";
import streamReset from "./reset.js";
import {computeTimestamps, decodeTimer} from "./utils.js";

// eslint-disable-next-line max-lines-per-function
(async() => {

    try {

        const
            // destructure config values
            {STREAM_START_COMMAND, QUEUE_DIRECTORY, SLOTS_EXTENSION, SLOTS_DIRECTORY, SLOTS_LIST_NAME, SLOTS_RESET_TIMEOUT, QUEUE_FILE_STABILITY_THRESHOLD, TWITCH_ENDPOINT, TWITCH_STREAM_KEY} = config,
            // retrieve default slot probe
            [ defaultSlot ] = await probeSlots(`default_slot`, null, null),
            // retrieve slot probes
            slots = await probeSlots(`streaming_slots`, defaultSlot, null);

        let
            // compute total time in seconds (slice to avoid mutating slots array)
            totalLoopTime = computeTimestamps(slots),
            // init current slot (slot currently being transcoded)
            [ currentSlot ] = slots,
            // total transcoded time
            transcodedTime = 0,
            // elapsed time in the current stream loop
            elapsedTime = 0;

        const

            // ---------------------------------------------------
            // --------------- CREATE FILE WATCHER ---------------
            // ---- monitor stream queue for new video sources ---
            // ---------------------------------------------------

            watchr = chokidar.watch(QUEUE_DIRECTORY, {
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
            }),

            // ---------------------------------------------------
            // --------------- SPAWN FFMPEG PROCESS --------------
            // ------ initialize first mile rtmp live stream -----
            // ---------------------------------------------------

            stream = spawn(STREAM_START_COMMAND, [ SLOTS_DIRECTORY, SLOTS_LIST_NAME, TWITCH_ENDPOINT, TWITCH_STREAM_KEY ], {
                // default subprocess env
                // eslint-disable-next-line node/no-process-env
                env: process.env,
                // pipe stderr to spawned subprocess
                stdio: [ `ignore`, `ignore`, `pipe` ],
                // terminate on current process exit
                detached: false
            });

            // ---------------------------------------------------
            // ------------- ADD FFMPEG EVENT HANDLERS -----------
            // ------- monitor, format and log ffmpeg output -----
            // ---------------------------------------------------

        stream
            // the 'close' event is never received by the main process
            // when running inside a container - as a result, QUEUE_DIRECTORY
            // contents is not auto erased once the ffmpeg process ends
            .on(`close`, (c, s) => {
                // log ffmpeg exit condition
                console.log(c ? `ffmpeg exited with code ${ c }` : s ? `ffmpeg exited after receiving ${ s }` : `something went really wrong monkaS`);
                // use an immediate to enqueue reset callback
                setImmediate(async() => {
                    // stop chokidar
                    console.log(`stopping file watcher ...`);
                    await watchr.close();
                    // perform file system cleanup
                    console.log(`resetting file system ...`);
                    await streamReset(slots, defaultSlot);
                    // gracefully exit process at this stage ...
                });
            })
            // ffmpeg handles freeing of the already transcoded slots
            .stderr.on(`data`, d => {
                const
                    // decode
                    msg = d.toString(`utf8`),
                    // search pattern
                    pos = msg.indexOf(`time=`),
                    // isolate time
                    t = pos >= 0 ? msg.substring(pos + 5, msg.indexOf(` `, pos + 5)) : null;

                // discard irrelevant messages
                if (t === null)
                    return;

                const
                    // read ffmpeg stderr timer
                    ffmpegTimer = decodeTimer(t),
                    // compute additional encoded time
                    justTranscoded = ffmpegTimer - transcodedTime;

                // update ffmpeg local timer
                transcodedTime = ffmpegTimer;

                // identify current streaming time
                elapsedTime = Math.max((elapsedTime + justTranscoded) % totalLoopTime, justTranscoded);

                if (justTranscoded < 0)
                    throw new RangeError(`last transcoded time less than zero ${ String(justTranscoded) } ms ...\nmessage: ${ msg }\nffmpeg timer: ${ String(ffmpegTimer) }\nlocal timer: ${ transcodedTime }`);

                const
                    // identify the slot being transcoded
                    nslot = slots.findIndex(x => x.timestamp > elapsedTime),
                    // create new objects so as not to mutate the slots array
                    tempSlot = nslot === -1 ? {...slots[slots.length - 1]} : {...slots[nslot - 1]};

                // detect encoding slot change
                if (currentSlot && !currentSlot.isDefault && currentSlot.index !== tempSlot.index) {

                    const
                        // extract transcoded slot properties
                        {filename, index, duration} = currentSlot;

                    // replace transcoded slot by default slot
                    slots.splice(currentSlot.index, 1, {
                        // spread default slot probe
                        ...defaultSlot,
                        // preserve slot filename
                        filename,
                        // and index
                        index,
                        // and mark the file for reset
                        pendingReset: true
                    });

                    // eslint-disable-next-line prefer-arrow-callback
                    setTimeout(async function() {
                        // replace file
                        await copyFile(defaultSlot.filename, slots[this.index].filename);
                        // mark the slot as available again
                        delete slots[this.index].pendingReset;
                    // set the timeout for resetting the file - concat demuxer clock can lag up to
                    // 1 second behind flv muxer clock, which can cause premature replacing of files
                    }.bind({index}), SLOTS_RESET_TIMEOUT);

                    // recompute slots timestamps
                    computeTimestamps(slots);

                    // update total stream loop time
                    totalLoopTime += defaultSlot.duration - duration;

                    // decrease elapsedTime by the duration of the media just discarded
                    // only if the removed slot is before the currently encoding slot ...
                    if (tempSlot.index > index)
                        elapsedTime += defaultSlot.duration - duration;
                }

                const
                    // format log
                    table = new AsciiTable(`live streaming (${ elapsedTime / 1e3 }/${ totalLoopTime / 1e3 } s)`)
                        .setHeading(`slot`, `start time`, `program`, `duration`, `current`)
                        // populate
                        .addRowMatrix(slots.map(x => [
                            // index
                            x.index + 1,
                            // timestamp
                            `${ Math.floor(x.timestamp / 1e3) } s`,
                            // status
                            (x.pendingReset ? `<pending reset ...>` : x.isDefault ? `<available>` : x.source).split(`/`).pop(),
                            // duration
                            `${ Math.floor(Math.round(x.duration / 1e3) / 60) } mn ${ Math.round(x.duration / 1e3) % 60 } s`,
                            // play indicator
                            x.index === currentSlot.index ? `<--` : ``
                        ]));

                // write to stdout
                logUpdate(`${ chalk.black.bold.bgCyan(table.toString()) }\nTotal streaming time: ${ t }`);

                // update the slot being transcoded
                currentSlot = tempSlot;

            });


            // ---------------------------------------------------
            // ----------- ADD FILE WATCHER EVENT HANDLERS -------
            // -- inject incoming video sources into the stream --
            // ---------------------------------------------------

        watchr
            // add event listeners
            // .on(`ready`, () => console.log(`begin watching directory ${ QUEUE_DIRECTORY }`))
            .on(`add`, async path => {
                // check file format
                if (path.endsWith(SLOTS_EXTENSION)) {
                    const
                        // probe transcoded file
                        [ transcodedProbe ] = await probeSlots(`incoming_video`, null, path);

                    let
                        // retrieve first available slot ...
                        availableSlot = null;

                    // seek next available slot from currently transcoding index (exclude slots pending for reset)
                    availableSlot = slots.slice(currentSlot.index + 1).find(x => x.isDefault === true && typeof x.pendingReset === `undefined`);

                    // if none is available, resume seeking from the start of the array (exclude slots pending for reset)
                    availableSlot = typeof availableSlot === `undefined` ? slots.find(x => x.isDefault === true && typeof x.pendingReset === `undefined`) : availableSlot;

                    // no slots available Sadge
                    if (typeof availableSlot === `undefined`) {

                        // console.log(`no slots available, discarding new video ...`);

                    } else {

                        const
                            // extract selected slot properties
                            {filename, index} = availableSlot;

                        // log
                        // console.log(`pushing new video ${ filename } in slot ${ index }...`);

                        // replace selected slot file by transcoded probe file
                        await copyFile(transcodedProbe.filename, filename);

                        // copy transcoded probe to selected slot
                        slots.splice(index, 1, {...transcodedProbe, filename, index});

                        // recompute slots timestamps
                        computeTimestamps(slots);

                        // update total stream time
                        totalLoopTime += transcodedProbe.duration - defaultSlot.duration;

                        // increase elapsedTime by the duration of the media just added
                        // only if it is added before the slot currently being transcoded ...
                        if (availableSlot.index < currentSlot.index)
                            elapsedTime += transcodedProbe.duration - defaultSlot.duration;

                        // remove the source file
                        await rm(transcodedProbe.filename, {force: true});

                    }
                }
            });

            // ---------------------------------------------------
            // ----------- ADD MAIN PROCESS EVENT HANDLERS -------
            // ---- send termination signal to ffmpeg and exit ---
            // ---------------------------------------------------

        process
            // stop streaming with Ctrl+C (SIGINT signal)
            .on(`SIGINT`, () => {
                console.debug(`process received SIGINT, stopping stream ...`);
                // stop processing ffmpeg output ...
                stream.stderr.removeAllListeners(`data`);
                // send termination signal to ffmpeg
                stream.kill(`SIGTERM`);
            })
            // log exit
            .on(`exit`, c => {
                console.log(`process exiting with code: ${ c }`);
            });

    } catch (err) {
        // log to stderr
        console.error(err.message);
    }
})();