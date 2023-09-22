/* eslint-disable no-restricted-syntax */

// import primitives
import {opendir, copyFile, rm} from "node:fs/promises";

// import modules
import config from "./config.js";

const
    // destructure config values
    {QUEUE_DIRECTORY} = config,
    // all async functions return promises ...
    streamReset = async(slots, defaultSlot) => {

        const
            // init promises array
            resetters = [],
            // retrieve iterator
            files = await opendir(QUEUE_DIRECTORY);

        // remove any still queued video
        for await (const file of files)
            // push promisified file removal
            resetters.push(rm(`${ QUEUE_DIRECTORY }/${ file.name }`, {force: true}));

        // reset stream slots with default slot
        slots.forEach(x => { resetters.push(copyFile(defaultSlot.filename, x.filename)); });

        // replace all slots (ffmpeg is not running at this point ...)
        await Promise.all(resetters);

    };

export default streamReset;