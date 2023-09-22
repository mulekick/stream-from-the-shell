#!/bin/bash

# use the concat demuxer on the transcoded videos
# loop over a predefined list of slots
# replace / reset slots on the fly ...

# slots directory
slotsdir="$1"
# slots list file
slotslist="$2"
# twitch ingestion endpoint
endpoint="$3"
# twitch stream key
streamkey="$4"

# ==== GENERAL ====
# overwrite outputs
# exit on error, hide banner, disable interactive mode
# read source in real time (for streaming)
# directly pass timestamps from the demuxer to the muxer for all output video streams

# ==== INPUT ====
# use concat demuxer, allow unsafe file names, loop forever, reduce buffering
# error detection level + fail when input contains errors
# demuxer flags : discard corrupt packets
# strictly follow the standards (input)
# disable automatic conversions on packet data
# use the input decoder time base when stream copying
# do not process input time stamps and pass them to the muxer as-is
# shift input timestamps so they start at 0
# input from file ...

# ==== CODECS ====
# codecs : copy stream data without reencoding

ffmpeg -y \
  -xerror \
  -hide_banner \
  -nostdin \
  -re \
  -vsync passthrough \
  -f concat \
  -safe 0 \
  -stream_loop -1 \
  -avioflags +direct \
  -err_detect +explode+careful \
  -fflags +discardcorrupt \
  -strict +very+strict \
  -auto_convert 0 \
  -copytb 0 \
  -copyts \
  -start_at_zero \
  -i "$slotsdir/$slotslist" \
  -c:a:0 copy \
  -c:v:0 copy \
  -f flv \
  "rtmp://$endpoint/app/$streamkey"

# success
exit 0