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
    # duplicate / drop frames in all output video streams to achieve the desired frame rate 

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
    # normalize codecs (h264 + AAC) + set audio and video bitrate

    # ==== OUTPUT ====
    # set video output framerate (output option - duplicate or drop frames right before encoding - VITAL)
    # set audio channels (required by the flv muxer for it does not default to the number of audio channels in the input ...)
    # set pixel format
    # set maximum GOP size (number of frames between keyframes) required for twitch source stability
    # set minimum GOP size (80 / 20 = 1 keyframe every 4 seconds)
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
        -vsync cfr \
        -err_detect +explode+aggressive \
        -fflags +discardcorrupt+genpts+igndts \
        -strict +very+strict \
        -i "$path/$file.$ext" \
        -filter_complex \
        '[0:a:0] loudnorm, aresample=44100 [audio];
         [0:v:0] scale=640:480 [scaled]' \
        -map '[scaled]' -map '[audio]' \
        -enc_time_base:v:0 1:20 \
        -enc_time_base:a:0 1:44100 \
        -c:a:0 aac \
        -b:a:0 128k \
        -c:v:0 libx264 \
        -b:v:0 750k \
        -r:v:0 20 \
        -pix_fmt:v:0 yuv420p \
        -g 80 \
        -keyint_min 80 \
        -ac 2 \
        -fflags +shortest \
        -max_interleave_delta 2500000 \
        -strict +very+strict \
        -f flv \
        "$inputs/$file.$format"

    # file is ready for concat ...
    echo "$path/$file.$ext processed, adding to the available sources as $inputs/$file.$format"

# feed input file to the while loop
done