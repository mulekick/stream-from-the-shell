#!/bin/bash

# video input directory
inputs="./video.sources"
# source videos list file 
sources=".video.sources.list"
# output container format
format="flv"

# remove comments and wipe $IFS (internal field separator)
# at each read so that shell expansion does not occur ...
grep -v '^ *#' < "$inputs/$sources" | while IFS= read -r line; do

    # sed the file name out of the concat demuxer syntax (DO NOT ESCAPE SINGLE QUOTES, REGEX NOT HAVING IT)
    path=$(echo "$line" | sed -E "s/^.*'(.+)\/(.+)\.(.+)'.*$/\1/")
    file=$(echo "$line" | sed -E "s/^.*'(.+)\/(.+)\.(.+)'.*$/\2/")
    ext=$(echo "$line" | sed -E "s/^.*'(.+)\/(.+)\.(.+)'.*$/\3/")

    # perform transcoding so that streams use the same codecs
    echo "processing: $path/$file.$ext ..."

    # ==== GENERAL ====
    # overwrite outputs
    # exit on error, hide banner, log level, disable interactive mode

    # ==== INPUT ====
    # error detection level + fail when input contains errors
    # flags : discard corrupt packets, normalize pts and dts
    # strictly follow the standards (input)
    # use filtergraph to normalize loudness and set audio stream sample rate (VITAL)
    # use filtergraph to normalize video stream resolution (VITAL)
    # map filtergraph outputs
    # input from file ...

    # ==== CODECS ====
    # map filtered streams to output
    # set video encoder time base (1 / frame rate)
    # set audio encoder time base (1 / sample rate)

    # ==== OUTPUT ====
    # use fast encoding preset
    # set pixel format
    # set maximum GOP size (number of frames between keyframes) required for twitch.tv source stability
    # set minimum GOP size (120 / 30 = 1 keyframe every 4 seconds)
    # set video output framerate (output option - duplicate or drop frames right before encoding - VITAL)
    # set audio channels (required by the flv muxer for it does not default to the number of audio channels in the input ...)
    # set codec and bitrate for audio and video streams
    # set max bitrate and control buffer size for video stream
    # duplicate / drop frames in all output video streams to achieve the desired frame rate
    # encode up to shortest stream (NOT WORKING)
    # max buffering duration for stream interleaving (in microseconds)
    # strictly follow the standards (output)
    # use flv muxer - required for rtmp streaming
    # output to file ...
    ffmpeg -y \
        -xerror \
        -hide_banner \
        -loglevel info \
        -nostdin \
        -err_detect +explode+aggressive \
        -fflags +discardcorrupt+genpts+igndts \
        -strict +very+strict \
        -i "$path/$file.$ext" \
        -filter_complex \
        '[0:a:0] loudnorm, aresample=44100 [audio];
         [0:v:0] scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2,setdar=dar=16/9,setsar=sar=1 [scaled]' \
        -map '[scaled]' -map '[audio]' \
        -enc_time_base:v:0 1:25 \
        -enc_time_base:a:0 1:44100 \
        -preset:v:0 fast \
        -pix_fmt:v:0 yuv420p \
        -g:v:0 100 \
        -keyint_min:v:0 100 \
        -r:v:0 25 \
        -ac:a:0 2 \
        -c:a:0 aac \
        -b:a:0 320k \
        -c:v:0 libx264 \
        -b:v:0 1750k \
        -maxrate:v:0 1750k \
        -bufsize:v:0 1000k \
        -fps_mode:v:0 cfr \
        -fflags +shortest \
        -max_interleave_delta 2500000 \
        -strict +very+strict \
        -f flv \
        "$inputs/$file.$format"

    # file is ready for concat ...
    echo "$path/$file.$ext processed, adding to the available sources as $inputs/$file.$format"

# feed input file to the while loop
done