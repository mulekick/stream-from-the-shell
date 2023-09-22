// reduceRight ARRAY INDEXS ARE REVERSED - START FROM array.length - 1

const
    // passing slots as reference and mutating it on purpose ...
    // TODO upgrade this mess to a clean cut ES6 class later
    computeTimestamps = slots => slots
        .slice()
        .reduce((r, x, i) => {
            // add starting timestamp to slot
            slots.splice(i, 1, {...slots[i], timestamp: r});
            // return duration up to this point
            return r + x.duration;
        }, 0),
    // extract ffmpeg timer
    decodeTimer = stderr => stderr
        .split(`:`)
        .reduceRight((r, x, i) => {
            let
                // do not mutate arguments
                up = 0;
            // indexes are reversed ...
            if (i === 2) {
                const
                    // process seconds and milliseconds
                    [ s, ms ] = x.split(`.`).map(y => Number(y));
                // update accumulator
                up += s * 1e3 + ms * 1e1;
            } else {
                // update accumulator (indexes are resversed still)
                up += Number(x) * (60 ** (2 - i)) * 1e3;
            }

            // return
            return r + up;
        }, 0);

export {computeTimestamps, decodeTimer};