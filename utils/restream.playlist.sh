#!/bin/bash

# origin stream master playlist url
streamlocation="$1"
# twitch ingestion endpoint
endpoint="$(cat .twitch.endpoint)"
# twitch stream key
streamkey="$(cat .twitch.streamkey)"

# ==== GENERAL ====
# overwrite outputs
# exit on error, hide banner, disable interactive mode
# read source in real time (for streaming)
# directly pass timestamps from the demuxer to the muxer for all output video streams

# ==== CODECS ====
# codecs : copy stream data without reencoding

# ==== OUTPUT ====
# use flv muxer for rtmp compatibility

if [[ -z "$streamlocation" ]]; then
  # failure
  echo "please provide a stream source to forward to the SRT server"
  exit 1
fi

ffmpeg -y \
  -xerror \
  -hide_banner \
  -nostdin \
  -re \
  -vsync passthrough \
  -i "$streamlocation" \
  -map 0:a:0 \
  -map 0:v:0 \
  -c:a:0 copy \
  -c:v:0 copy \
  -f flv \
  "rtmp://$endpoint/app/$streamkey"

# success
exit 0