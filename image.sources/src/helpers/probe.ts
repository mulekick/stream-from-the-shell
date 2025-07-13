/**
 * helpers for media files probes.
 * @module
 */

/* eslint-disable no-restricted-syntax */

// import primitives
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {opendir} from "node:fs/promises";

// import modules
import config from "../config.ts";

// import types
import type {PromiseWithChild} from "node:child_process";
import type {ProbeType, ProbeResult, StreamingSlot} from "../interfaces.ts";

// destructure config values
const {SOURCE_PROBE_COMMAND, SLOTS_DEFAULT, SLOTS_DIRECTORY, SLOTS_PREFIX, SLOTS_EXTENSION} = config;

/**
 * async: returns a promisified ffprobe subprocess
 */
const probe = (file: string): PromiseWithChild<{stdout: string; stderr: string}> => promisify(execFile)(SOURCE_PROBE_COMMAND, [ file ], {encoding: `utf8`});

/**
 * async: returns a promisified array of streaming slots
 * each slot contains probe result for the relevant media file
 */
const probeSlots = async(type: ProbeType, defaultSlot: StreamingSlot | null, transcodedSource: string | null): Promise<Array<StreamingSlot>> => {

    // promises array
    const probes = [] as Array<PromiseWithChild<{stdout: string; stderr: string}>>;

    // probe default slot
    if (type === `default_slot`) {

        // push promisified probe
        probes.push(probe(SLOTS_DEFAULT));

    // probe transcoded source
    } else if (type === `incoming_video`) {

        // throw if path is invalid (promise will reject in caller and process will exit)
        if (typeof transcodedSource !== `string` || transcodedSource.length === 0)
            throw new Error(`transcoded source path is invalid`);

        // push promisified probe
        probes.push(probe(transcodedSource));

    // probe streaming slots
    } else if (type === `streaming_slots`) {

        // throw if default slot probe is invalid (promise will reject in caller and process will exit)
        if (!defaultSlot || defaultSlot.filename !== SLOTS_DEFAULT)
            throw new Error(`default slot probe is invalid`);

        // retrieve iterator
        const files = await opendir(SLOTS_DIRECTORY);

        // loop on slots
        for await (const file of files) {
            // check file format
            if (file.name.endsWith(SLOTS_EXTENSION))
                // push promisified probe
                probes.push(probe(`${ SLOTS_DIRECTORY }/${ file.name }`));
        }

    }

    // wait for the probes to finish
    const slots = (await Promise.all(probes))
        // parse
        .map(x => JSON.parse(x.stdout) as ProbeResult)
        // .sort((a, b) => (b.format.filename > a.format.filename ? -1 : b.format.filename < a.format.filename ? 1 : 0))
        .sort((a, b) => {
            // isolate slot index in the file name (slots file name must always be prefix + index + extension or everything falls apart)
            const [ c, d ] = [ a.format.filename, b.format.filename ].map(x => Number(x.substring(0, x.indexOf(SLOTS_EXTENSION)).substring(x.lastIndexOf(SLOTS_PREFIX) + SLOTS_PREFIX.length)));
            // sort by slot index so the file names are aligned with the slots probes array indexes
            return d > c ? -1 : d < c ? 1 : 0;
        })
        // format
        .map((x, i) => {
            // expand duration to milliseconds and round to the nearest one
            const duration = Math.round(Number(x.format.duration) * 1e3);
            // compute default slot indicator (default slot can't be null at this stage)
            const isDefault = type === `incoming_video` ? false : (type === `default_slot` && !defaultSlot) || (defaultSlot as StreamingSlot).size === x.format.size;

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
            } as StreamingSlot;
        });

    // return
    return slots;
};

export default probeSlots;