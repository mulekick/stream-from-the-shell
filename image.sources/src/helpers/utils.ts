/**
 * miscellaneous helpers.
 * @module
 */

/* eslint-disable security/detect-object-injection */

// import types
import type {StreamingSlot} from "../interfaces.ts";

/**
 * sync: recompute timestamps for all streaming slots
 * slots are passed as reference and mutated on purpose
 */
export const computeTimestamps = (slots: Array<StreamingSlot>): number => slots
    .slice()
    .reduce((r, x, i) => {
        // add starting timestamp to slot
        slots.splice(i, 1, {...slots[i], timestamp: r});
        // return duration up to this point
        return r + x.duration;
    }, 0);

/**
 * sync: extract ffmpeg timer
 * reduceRight ARRAY INDEXS ARE REVERSED - START FROM array.length - 1
 */
export const decodeTimer = (stderr: string): number => stderr
    .split(`:`)
    .reduceRight((r, x, i) => {
        // do not mutate arguments
        let up = 0;
        // indexes are reversed ...
        if (i === 2) {
            // process seconds and milliseconds
            const [ s, ms ] = x.split(`.`).map(y => Number(y));
            // update accumulator
            up += s * 1e3 + ms * 1e1;
        } else {
            // update accumulator (indexes are reversed still)
            up += Number(x) * (60 ** (2 - i)) * 1e3;
        }
        // return
        return r + up;
    }, 0);