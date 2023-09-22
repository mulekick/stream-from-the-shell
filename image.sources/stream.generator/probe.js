/* eslint-disable no-restricted-syntax */

// import primitives
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {opendir} from "node:fs/promises";

// import modules
import config from "./config.js";

const
    // destructure config values
    {SOURCE_PROBE_COMMAND, SLOTS_DEFAULT, SLOTS_DIRECTORY, SLOTS_PREFIX, SLOTS_EXTENSION} = config,
    // probe command wrapped in a promise ...
    probe = file => promisify(execFile)(SOURCE_PROBE_COMMAND, [ file ], {encoding: `utf8`}),
    // all async functions return promises ...
    probeSlots = async(type, defaultSlot, transcodedSource) => {
        const
            // promises array
            probes = [];

        // probe default slot
        if (type === `default_slot`) {

            // push promisified probe
            probes.push(probe(SLOTS_DEFAULT));

        // probe transcoded source
        } else if (type === `incoming_video`) {

            // push promisified probe
            probes.push(probe(transcodedSource));

        // probe streaming slots
        } else if (type === `streaming_slots`) {

            // throw if default slot probe is invalid
            if (!defaultSlot || defaultSlot.filename !== SLOTS_DEFAULT)
                throw new Error(`default slot probe is invalid`);

            const
                // retrieve iterator
                files = await opendir(SLOTS_DIRECTORY);

            // loop on slots
            for await (const file of files) {
                // check file format
                if (file.name.endsWith(SLOTS_EXTENSION))
                    // push promisified probe
                    probes.push(probe(`${ SLOTS_DIRECTORY }/${ file.name }`));
            }

        }

        const
            // wait for the probes to finish
            slots = (await Promise.all(probes))
                // parse
                .map(x => JSON.parse(x.stdout))
                // .sort((a, b) => (b.format.filename > a.format.filename ? -1 : b.format.filename < a.format.filename ? 1 : 0))
                .sort((a, b) => {
                    const
                        // isolate slot index in the file name (slots file name must always be prefix + index + extension or everything falls apart)
                        [ c, d ] = [ a.format.filename, b.format.filename ]
                            .map(x => Number(x.substring(0, x.indexOf(SLOTS_EXTENSION)).substring(x.lastIndexOf(SLOTS_PREFIX) + SLOTS_PREFIX.length)));
                    // sort by slot index so the file names are aligned with the slots probes array indexes
                    return d > c ? -1 : d < c ? 1 : 0;
                })
                // format
                .map((x, i) => {
                    const
                        // expand duration to milliseconds and round to the nearest one
                        duration = Math.round(Number(x.format.duration) * 1e3),
                        // compute default slot indicator
                        isDefault = type === `incoming_video` ? false : (type === `default_slot` && !defaultSlot) || defaultSlot.size === x.format.size;

                    return {
                        // ES2018 object spread
                        ...x.format,
                        // overwrite duration
                        duration,
                        // add default indicator
                        isDefault,
                        // persist slot index
                        index: i,
                        // persist original file name
                        source: x.format.filename
                    };
                });
        // return
        return slots;
    };

export default probeSlots;